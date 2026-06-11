import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReservationData, PLReservation, getListings } from "@/lib/pricelabs";
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

// GET: haal opgeslagen BLT op uit Supabase
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("cockpit_listing_settings")
    .select("listing_id, blt_mediaan, blt_gemiddeld, blt_bijgewerkt_op")
    .not("blt_mediaan", "is", null);

  const result: Record<string, { gemiddeld: number; mediaan: number; bijgewerkt_op: string }> = {};
  for (const row of data ?? []) {
    result[String(row.listing_id)] = {
      gemiddeld: row.blt_gemiddeld ?? 0,
      mediaan: row.blt_mediaan ?? 0,
      bijgewerkt_op: row.blt_bijgewerkt_op ?? "",
    };
  }
  return NextResponse.json(result);
}

// POST: herbereken BLT voor alle woningen en sla op in Supabase
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

  // Serieel per listing om rate limit te vermijden
  for (const listing of listings) {
    try {
      const reservations = await getReservationData(start, end, listing.id);
      const { gemiddeld, mediaan, n } = berekenBLT(reservations);
      if (n > 0) {
        await admin.from("cockpit_listing_settings").upsert(
          {
            listing_id: parseInt(listing.id) || listing.id as unknown as number,
            listing_name: listing.name,
            blt_gemiddeld: gemiddeld,
            blt_mediaan: mediaan,
            blt_bijgewerkt_op: nu,
          },
          { onConflict: "listing_id" }
        );
        count++;
      }
    } catch { continue; }
  }

  return NextResponse.json({ ok: true, berekend: count });
}
