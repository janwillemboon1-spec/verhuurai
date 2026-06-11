import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReservationData, PLReservation, getListings } from "@/lib/pricelabs";
import { NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

const HORIZONS = [7, 15, 30, 60, 90] as const;

interface BLTResultaat {
  mediaan: number;
  gemiddeld: number;
  n: number;
  p_boven_7: number;
  p_boven_15: number;
  p_boven_30: number;
  p_boven_60: number;
  p_boven_90: number;
  avg_occ: number;
}

function berekenBLT(reservations: PLReservation[], availableDays: number): BLTResultaat {
  const blts: number[] = [];
  let totalBookedNights = 0;

  for (const r of reservations) {
    if (r.booking_status !== "booked") continue;
    if (r.no_of_days) totalBookedNights += r.no_of_days;
    if (!r.booked_date || !r.check_in) continue;
    try {
      const bd = new Date(r.booked_date);
      const ci = new Date(r.check_in);
      const days = Math.round((ci.getTime() - bd.getTime()) / 86400000);
      if (days >= 0 && days <= 730) blts.push(days);
    } catch { continue; }
  }

  if (blts.length === 0) return {
    mediaan: 0, gemiddeld: 0, n: 0,
    p_boven_7: 0, p_boven_15: 0, p_boven_30: 0, p_boven_60: 0, p_boven_90: 0,
    avg_occ: 0,
  };

  const sorted = [...blts].sort((a, b) => a - b);
  const mediaan = sorted[Math.floor(sorted.length / 2)];
  const gemiddeld = Math.round(blts.reduce((s, v) => s + v, 0) / blts.length);
  const avg_occ = Math.min(1, availableDays > 0 ? totalBookedNights / availableDays : 0);

  // P(BLT > T) = fractie boekingen die meer dan T dagen van tevoren worden gemaakt
  const pBoven = Object.fromEntries(
    HORIZONS.map(t => [t, blts.filter(b => b > t).length / blts.length])
  ) as Record<7 | 15 | 30 | 60 | 90, number>;

  return {
    mediaan, gemiddeld, n: blts.length,
    p_boven_7: Math.round(pBoven[7] * 1000) / 1000,
    p_boven_15: Math.round(pBoven[15] * 1000) / 1000,
    p_boven_30: Math.round(pBoven[30] * 1000) / 1000,
    p_boven_60: Math.round(pBoven[60] * 1000) / 1000,
    p_boven_90: Math.round(pBoven[90] * 1000) / 1000,
    avg_occ: Math.round(avg_occ * 1000) / 1000,
  };
}

// GET: haal opgeslagen BLT op uit Supabase
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin.from("cockpit_blt_cache").select("*");

  const result: Record<string, BLTResultaat & { bijgewerkt_op?: string }> = {};
  for (const row of data ?? []) {
    result[row.listing_id] = {
      mediaan: row.blt_mediaan ?? 0,
      gemiddeld: row.blt_gemiddeld ?? 0,
      n: 0,
      p_boven_7: row.p_boven_7 ?? 0,
      p_boven_15: row.p_boven_15 ?? 0,
      p_boven_30: row.p_boven_30 ?? 0,
      p_boven_60: row.p_boven_60 ?? 0,
      p_boven_90: row.p_boven_90 ?? 0,
      avg_occ: row.avg_occ ?? 0,
      bijgewerkt_op: row.bijgewerkt_op,
    };
  }
  return NextResponse.json(result);
}

// POST: herbereken BLT voor alle woningen en sla op
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);
  const nu = new Date().toISOString();

  const listings = await getListings();
  const admin = createAdminClient();
  let count = 0;

  for (const listing of listings) {
    try {
      const reservations = await getReservationData(start, end, listing.id);
      const availableDays = 365; // gebruik 1 jaar als noemer voor avg_occ
      const blt = berekenBLT(reservations, availableDays);

      if (blt.n > 0) {
        await admin.from("cockpit_blt_cache").upsert(
          {
            listing_id: listing.id,
            blt_gemiddeld: blt.gemiddeld,
            blt_mediaan: blt.mediaan,
            p_boven_7: blt.p_boven_7,
            p_boven_15: blt.p_boven_15,
            p_boven_30: blt.p_boven_30,
            p_boven_60: blt.p_boven_60,
            p_boven_90: blt.p_boven_90,
            avg_occ: blt.avg_occ,
            bijgewerkt_op: nu,
          },
          { onConflict: "listing_id" }
        );
        count++;
      }
    } catch { continue; }
  }

  return NextResponse.json({ ok: true, berekend: count });
}
