import { createClient } from "@/lib/supabase/server";
import { getReservationData, PLReservation } from "@/lib/pricelabs";
import { NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

function berekenBLT(reservations: PLReservation[]): { gemiddeld: number; mediaan: number; n: number } {
  const blts: number[] = [];
  for (const r of reservations) {
    if (r.booking_status !== "booked" || !r.booked_date || !r.check_in) continue;
    try {
      const bd = new Date(r.booked_date);
      const ci = new Date(r.check_in);
      const days = Math.round((ci.getTime() - bd.getTime()) / 86400000);
      if (days >= 0 && days <= 730) blts.push(days);
    } catch { continue; }
  }
  if (blts.length === 0) return { gemiddeld: 0, mediaan: 0, n: 0 };
  const sorted = [...blts].sort((a, b) => a - b);
  const gemiddeld = Math.round(blts.reduce((s, v) => s + v, 0) / blts.length);
  const mediaan = sorted[Math.floor(sorted.length / 2)];
  return { gemiddeld, mediaan, n: blts.length };
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  // Laatste 24 maanden voor betrouwbare BLT berekening
  const end = new Date().toISOString().slice(0, 10);
  const start = new Date(Date.now() - 730 * 86400000).toISOString().slice(0, 10);

  const reservations = await getReservationData(start, end);

  // Groepeer per listing
  const perListing = new Map<string, PLReservation[]>();
  for (const r of reservations) {
    const curr = perListing.get(r.listing_id) ?? [];
    curr.push(r);
    perListing.set(r.listing_id, curr);
  }

  const result: Record<string, { gemiddeld: number; mediaan: number; n: number }> = {};
  Array.from(perListing.entries()).forEach(([id, rows]) => {
    result[id] = berekenBLT(rows);
  });

  return NextResponse.json(result);
}
