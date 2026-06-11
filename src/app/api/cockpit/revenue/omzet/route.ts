import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReservationData, getListings, getCalendar } from "@/lib/pricelabs";
import { aggregeer, groepeerPerListing, groepeerPerMaand, dagenInPeriode, berekenPrognose } from "@/lib/omzet-aggregatie";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? new Date().toISOString().slice(0, 8) + "01";
  const end = url.searchParams.get("end") ?? new Date().toISOString().slice(0, 10);

  // Last year same period
  const lyStart = start.replace(/^(\d{4})/, (y) => String(parseInt(y) - 1));
  const lyEnd = end.replace(/^(\d{4})/, (y) => String(parseInt(y) - 1));

  const [reservations, lyReservations, listings, admin] = await Promise.all([
    getReservationData(start, end),
    getReservationData(lyStart, lyEnd),
    getListings(),
    Promise.resolve(createAdminClient()),
  ]);

  // Get interne namen
  const { data: settings } = await admin
    .from("cockpit_listing_settings")
    .select("listing_id, interne_naam");
  const namenMap = new Map((settings ?? []).map((s: { listing_id: number; interne_naam: string | null }) => [
    String(s.listing_id), s.interne_naam ?? "",
  ]));

  // Get CSV overrides
  const { data: csvRows } = await admin
    .from("cockpit_omzet_csv")
    .select("*")
    .eq("listing_id", "portfolio");
  const csvData: Record<number, Record<string, number>> = { 1: {}, 2: {}, 3: {} };
  for (const row of csvRows ?? []) {
    if (!csvData[row.methode]) csvData[row.methode] = {};
    csvData[row.methode][row.maand] = parseFloat(row.omzet);
  }

  const dagen = dagenInPeriode(start, end);
  const perListing = groepeerPerListing(reservations);
  const perListingLY = groepeerPerListing(lyReservations);

  // Portfolio totals
  const portfolioMetrics = aggregeer(reservations, dagen * listings.length);
  const portfolioLY = aggregeer(lyReservations, dagenInPeriode(lyStart, lyEnd) * listings.length);

  // Per-listing breakdown
  const listingBreakdown = listings.map((l) => {
    const rows = perListing[l.id] ?? [];
    const lyRows = perListingLY[l.id] ?? [];
    const metrics = aggregeer(rows, dagen);
    const lyMetrics = aggregeer(lyRows, dagenInPeriode(lyStart, lyEnd));
    return {
      listing_id: l.id,
      listing_naam: namenMap.get(l.id) || l.name.split("--")[0].trim(),
      ...metrics,
      omzet_ly: lyMetrics.omzet,
      yoy_pct: lyMetrics.omzet > 0
        ? ((metrics.omzet - lyMetrics.omzet) / lyMetrics.omzet) * 100
        : null,
    };
  }).sort((a, b) => b.omzet - a.omzet);

  // Monthly trend (current year vs LY)
  const maandelijksTrend = groepeerPerMaand(reservations);
  const maandelijksTrendLY = groepeerPerMaand(lyReservations);
  const maandenSet = new Set([
    ...Object.keys(maandelijksTrend),
    ...Object.keys(maandelijksTrendLY),
  ]);
  const trend = Array.from(maandenSet).sort().map((m) => ({
    maand: m,
    omzet: aggregeer(maandelijksTrend[m] ?? [], 30).omzet,
    omzet_ly: aggregeer(maandelijksTrendLY[m] ?? [], 30).omzet,
  }));

  // Prognose (simplified portfolio level - no future calendar for all listings)
  const prognose = berekenPrognose(reservations, lyReservations, [], csvData, start, end);

  return NextResponse.json({
    periode: { start, end, lyStart, lyEnd },
    portfolio: {
      ...portfolioMetrics,
      omzet_ly: portfolioLY.omzet,
      yoy_pct: portfolioLY.omzet > 0
        ? ((portfolioMetrics.omzet - portfolioLY.omzet) / portfolioLY.omzet) * 100
        : null,
    },
    listings: listingBreakdown,
    trend,
    prognose,
  });
}
