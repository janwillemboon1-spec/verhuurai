import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReservationData, getListings } from "@/lib/pricelabs";
import { aggregeer, groepeerPerListing, groepeerPerMaand, dagenInPeriode, berekenPrognose } from "@/lib/omzet-aggregatie";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

function addYears(dateStr: string, years: number): string {
  return dateStr.replace(/^(\d{4})/, (y) => String(parseInt(y) + years));
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

  // STLY: zelfde periode een jaar eerder
  const stlyStart = addYears(start, -1);
  const stlyEnd = addYears(actualEnd, -1);

  // Altijd laatste 12 maanden voor de trend (onafhankelijk van periode-selector)
  const trendEnd = today;
  const trendStart = new Date();
  trendStart.setMonth(trendStart.getMonth() - 11);
  trendStart.setDate(1);
  const trendStartStr = trendStart.toISOString().slice(0, 10);
  const trendLyStart = addYears(trendStartStr, -1);
  const trendLyEnd = addYears(trendEnd, -1);

  const [reservations, stlyReservations, trendData, trendLyData, listings, admin] = await Promise.all([
    getReservationData(start, actualEnd),
    getReservationData(stlyStart, stlyEnd),
    getReservationData(trendStartStr, trendEnd),
    getReservationData(trendLyStart, trendLyEnd),
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

  const dagen = dagenInPeriode(start, actualEnd);
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

  // Maandelijkse trend: laatste 12 maanden met STLY-uitlijning
  const maandTrend = groepeerPerMaand(trendData);
  const maandTrendLY = groepeerPerMaand(trendLyData);

  // Genereer de 12 maanden
  const trendMaanden: string[] = [];
  const d = new Date(trendStart);
  d.setDate(1);
  while (d.toISOString().slice(0, 10) <= trendEnd) {
    trendMaanden.push(d.toISOString().slice(0, 7)); // YYYY-MM
    d.setMonth(d.getMonth() + 1);
  }

  const trend = trendMaanden.map((m) => {
    const lyMaand = addYears(m + "-01", -1).slice(0, 7); // zelfde maand vorig jaar
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
