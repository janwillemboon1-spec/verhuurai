import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getListings, PLReservation } from "@/lib/pricelabs";
import { getReserveringenUitCache } from "@/lib/reserveringen-cache";
import { aggregeer, groepeerPerListing, groepeerPerMaand, dagenInPeriode, berekenPrognose } from "@/lib/omzet-aggregatie";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

function addYears(dateStr: string, years: number): string {
  return dateStr.replace(/^(\d{4})/, (y) => String(parseInt(y) + years));
}

function filterPeriode(rows: PLReservation[], start: string, end: string): PLReservation[] {
  return rows.filter((r) => r.check_in >= start && r.check_in <= end);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? new Date().toISOString().slice(0, 8) + "01";
  const end = url.searchParams.get("end") ?? new Date().toISOString().slice(0, 10);

  const today = new Date().toISOString().slice(0, 10);
  const actualEnd = end > today ? today : end;

  // Venster: vroegste van (start -1 jaar, 24 maanden geleden) zodat STLY voor hele periode beschikbaar is
  const stlyStartVanPeriode = addYears(start, -1); // LY-start voor de geselecteerde periode
  const trendStartDate = new Date();
  trendStartDate.setMonth(trendStartDate.getMonth() - 23); // 24 maanden terug als fallback
  trendStartDate.setDate(1);
  const windowStart = stlyStartVanPeriode < trendStartDate.toISOString().slice(0, 10)
    ? stlyStartVanPeriode
    : trendStartDate.toISOString().slice(0, 10);
  // windowEnd = einde van de geselecteerde periode (kan in de toekomst liggen)
  // zodat toekomstige bevestigde boekingen ook meegenomen worden in de trend
  const windowEnd = end;

  // Lees uit Supabase cache — geen PriceLabs calls meer
  const [allData, listings, admin] = await Promise.all([
    getReserveringenUitCache(windowStart, windowEnd),
    getListings(),
    Promise.resolve(createAdminClient()),
  ]);

  const { data: settings } = await admin
    .from("cockpit_listing_settings")
    .select("listing_id, interne_naam");
  const namenMap = new Map((settings ?? []).map((s: { listing_id: number; interne_naam: string | null }) => [
    String(s.listing_id), s.interne_naam ?? "",
  ]));

  const { data: csvRows } = await admin
    .from("cockpit_omzet_csv")
    .select("*")
    .eq("listing_id", "portfolio");
  const csvData: Record<number, Record<string, number>> = { 1: {}, 2: {}, 3: {} };
  for (const row of csvRows ?? []) {
    if (!csvData[row.methode]) csvData[row.methode] = {};
    csvData[row.methode][row.maand] = parseFloat(row.omzet);
  }

  // KPI: gebruik de volledige geselecteerde periode — inclusief toekomstige bevestigde boekingen
  // STLY: dezelfde volledige periode vorig jaar (voor eerlijke absoluutvergelijking)
  const stlyStart = addYears(start, -1);
  const stlyEnd   = addYears(end, -1);
  const reservations     = filterPeriode(allData, start, end);
  const stlyReservations = filterPeriode(allData, stlyStart, stlyEnd);

  const dagen     = dagenInPeriode(start, end);
  const stlyDagen = dagenInPeriode(stlyStart, stlyEnd);
  const perListing = groepeerPerListing(reservations);
  const perListingSTLY = groepeerPerListing(stlyReservations);

  // Portfolio KPIs
  const portfolioMetrics = aggregeer(reservations, dagen * listings.length);
  const portfolioSTLY = aggregeer(stlyReservations, stlyDagen * listings.length);

  // Per-listing breakdown
  const listingBreakdown = listings.map((l) => {
    const rows = perListing[l.id] ?? [];
    const stlyRows = perListingSTLY[l.id] ?? [];
    const metrics = aggregeer(rows, dagen);
    const stlyMetrics = aggregeer(stlyRows, stlyDagen);
    return {
      listing_id: l.id,
      listing_naam: namenMap.get(l.id) || l.name.split("--")[0].trim(),
      ...metrics,
      omzet_ly: stlyMetrics.omzet,
      yoy_pct: stlyMetrics.omzet > 0
        ? ((metrics.omzet - stlyMetrics.omzet) / stlyMetrics.omzet) * 100
        : null,
    };
  }).sort((a, b) => b.omzet - a.omzet);

  // Maandelijkse trend: alle maanden van de geselecteerde periode vs STLY
  const trendMaanden: string[] = [];
  const trendCursor = new Date(start);
  trendCursor.setDate(1);
  const trendEndStr = end.slice(0, 7); // YYYY-MM van einde periode
  while (trendCursor.toISOString().slice(0, 7) <= trendEndStr) {
    trendMaanden.push(trendCursor.toISOString().slice(0, 7));
    trendCursor.setMonth(trendCursor.getMonth() + 1);
  }

  // Huidige data: reserveringen van start t/m einde periode (inclusief toekomstige bevestigde boekingen)
  const trendData = filterPeriode(allData, start, end);
  // STLY: zelfde maanden vorig jaar
  const trendLyStart = addYears(start, -1);
  const trendLyEnd = addYears(end, -1);
  const trendLyData = filterPeriode(allData, trendLyStart, trendLyEnd);
  const maandTrend = groepeerPerMaand(trendData);
  const maandTrendLY = groepeerPerMaand(trendLyData);

  const trend = trendMaanden.map((m) => {
    const lyMaand = addYears(m + "-01", -1).slice(0, 7);
    return {
      maand: m,
      omzet: aggregeer(maandTrend[m] ?? [], 30).omzet,
      omzet_ly: aggregeer(maandTrendLY[lyMaand] ?? [], 30).omzet,
    };
  });

  const prognose = berekenPrognose(reservations, stlyReservations, [], csvData, start, actualEnd);

  return NextResponse.json({
    periode: { start, end: actualEnd, stlyStart, stlyEnd },
    portfolio: {
      ...portfolioMetrics,
      omzet_ly: portfolioSTLY.omzet,
      yoy_pct: portfolioSTLY.omzet > 0
        ? ((portfolioMetrics.omzet - portfolioSTLY.omzet) / portfolioSTLY.omzet) * 100
        : null,
    },
    listings: listingBreakdown,
    trend,
    prognose,
  });
}
