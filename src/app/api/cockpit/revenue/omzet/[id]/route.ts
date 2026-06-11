import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCalendar, PLReservation } from "@/lib/pricelabs";
import { getReserveringenUitCache } from "@/lib/reserveringen-cache";
import { aggregeer, groepeerPerMaand, dagenInPeriode, berekenPrognose } from "@/lib/omzet-aggregatie";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

function addYears(dateStr: string, years: number): string {
  return dateStr.replace(/^(\d{4})/, (y) => String(parseInt(y) + years));
}

function filterPeriode(rows: PLReservation[], start: string, end: string): PLReservation[] {
  return rows.filter((r) => r.check_in >= start && r.check_in <= end);
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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
  const futureEnd = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  // 24-maands venster voor één API call
  const trendStartDate = new Date();
  trendStartDate.setMonth(trendStartDate.getMonth() - 11);
  trendStartDate.setDate(1);
  const trendStart12 = trendStartDate.toISOString().slice(0, 10);
  const windowStart = addYears(trendStart12, -1);
  const windowEnd = end; // inclusief toekomstige bevestigde boekingen

  const [allData, futureCalendar, admin] = await Promise.all([
    getReserveringenUitCache(windowStart, windowEnd, params.id),
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

  const stlyStart = addYears(start, -1);
  const stlyEnd = addYears(actualEnd, -1);
  const reservations = filterPeriode(allData, start, actualEnd);
  const stlyReservations = filterPeriode(allData, stlyStart, stlyEnd);

  const dagen = dagenInPeriode(start, actualEnd);
  const stlyDagen = dagenInPeriode(stlyStart, stlyEnd);
  const metrics = aggregeer(reservations, dagen);
  const stlyMetrics = aggregeer(stlyReservations, stlyDagen);

  // Trend: laatste 12 maanden
  const trendMaanden: string[] = [];
  const d = new Date(trendStartDate);
  d.setDate(1);
  while (d.toISOString().slice(0, 10) <= today) {
    trendMaanden.push(d.toISOString().slice(0, 7));
    d.setMonth(d.getMonth() + 1);
  }

  const trendData = filterPeriode(allData, trendStart12, today);
  const trendLyData = filterPeriode(allData, addYears(trendStart12, -1), addYears(today, -1));
  const maandTrend = groepeerPerMaand(trendData);
  const maandTrendLY = groepeerPerMaand(trendLyData);

  const trend = trendMaanden.map((m) => {
    const lyMaand = addYears(m + "-01", -1).slice(0, 7);
    const cur = aggregeer(maandTrend[m] ?? [], 30);
    const ly = aggregeer(maandTrendLY[lyMaand] ?? [], 30);
    return { maand: m, omzet: cur.omzet, omzet_ly: ly.omzet, nachten: cur.nachten, adr: cur.adr };
  });

  const prognose = berekenPrognose(reservations, stlyReservations, futureCalendar, csvData, today, futureEnd);

  return NextResponse.json({
    listing_id: params.id,
    periode: { start, end: actualEnd, stlyStart, stlyEnd },
    metrics: {
      ...metrics,
      omzet_ly: stlyMetrics.omzet,
      yoy_pct: stlyMetrics.omzet > 0 ? ((metrics.omzet - stlyMetrics.omzet) / stlyMetrics.omzet) * 100 : null,
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
