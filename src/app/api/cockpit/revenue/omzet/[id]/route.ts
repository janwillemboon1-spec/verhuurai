import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReservationData, getCalendar } from "@/lib/pricelabs";
import { aggregeer, groepeerPerMaand, dagenInPeriode, berekenPrognose } from "@/lib/omzet-aggregatie";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? new Date().toISOString().slice(0, 8) + "01";
  const end = url.searchParams.get("end") ?? new Date().toISOString().slice(0, 10);
  const lyStart = start.replace(/^(\d{4})/, (y) => String(parseInt(y) - 1));
  const lyEnd = end.replace(/^(\d{4})/, (y) => String(parseInt(y) - 1));

  const today = new Date().toISOString().slice(0, 10);
  const futureEnd = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  const [reservations, lyReservations, futureCalendar, admin] = await Promise.all([
    getReservationData(start, end, params.id),
    getReservationData(lyStart, lyEnd, params.id),
    getCalendar(params.id, today, futureEnd),
    Promise.resolve(createAdminClient()),
  ]);

  const { data: csvRows } = await admin
    .from("cockpit_omzet_csv")
    .select("*")
    .eq("listing_id", params.id);
  const csvData: Record<number, Record<string, number>> = { 1: {}, 2: {}, 3: {} };
  for (const row of csvRows ?? []) {
    if (!csvData[row.methode]) csvData[row.methode] = {};
    csvData[row.methode][row.maand] = parseFloat(row.omzet);
  }

  const dagen = dagenInPeriode(start, end);
  const metrics = aggregeer(reservations, dagen);
  const lyMetrics = aggregeer(lyReservations, dagenInPeriode(lyStart, lyEnd));

  const maandelijksTrend = groepeerPerMaand(reservations);
  const maandelijksTrendLY = groepeerPerMaand(lyReservations);
  const maandenSet = new Set([...Object.keys(maandelijksTrend), ...Object.keys(maandelijksTrendLY)]);
  const trend = Array.from(maandenSet).sort().map((m) => ({
    maand: m,
    omzet: aggregeer(maandelijksTrend[m] ?? [], 30).omzet,
    omzet_ly: aggregeer(maandelijksTrendLY[m] ?? [], 30).omzet,
    nachten: aggregeer(maandelijksTrend[m] ?? [], 30).nachten,
    adr: aggregeer(maandelijksTrend[m] ?? [], 30).adr,
  }));

  const prognose = berekenPrognose(reservations, lyReservations, futureCalendar, csvData, today, futureEnd);

  return NextResponse.json({
    listing_id: params.id,
    periode: { start, end, lyStart, lyEnd },
    metrics: {
      ...metrics,
      omzet_ly: lyMetrics.omzet,
      yoy_pct: lyMetrics.omzet > 0 ? ((metrics.omzet - lyMetrics.omzet) / lyMetrics.omzet) * 100 : null,
    },
    trend,
    prognose,
    reservations: reservations.filter((r) => r.booking_status === "booked").map((r) => ({
      check_in: r.check_in,
      check_out: r.check_out,
      nachten: r.no_of_days,
      omzet: parseFloat(r.rental_revenue || "0"),
      kanaal: r.booking_channel,
    })),
  });
}
