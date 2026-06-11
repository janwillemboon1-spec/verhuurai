import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReservationData, getListings } from "@/lib/pricelabs";
import { NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";
const SYNC_WINDOW_JAREN = 3; // 3 jaar terug + toekomst

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const listings = await getListings();

  const end = new Date();
  end.setFullYear(end.getFullYear() + 1); // t/m volgend jaar
  const start = new Date();
  start.setFullYear(start.getFullYear() - SYNC_WINDOW_JAREN);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const nu = new Date().toISOString();

  let totaal = 0;

  // Serieel per listing om rate limit te vermijden
  for (const listing of listings) {
    try {
      const reservations = await getReservationData(startStr, endStr, listing.id);
      if (reservations.length === 0) continue;

      // Upsert in batches van 100
      const rows = reservations.map(r => ({
        listing_id: listing.id,
        reservation_id: r.reservation_id,
        check_in: r.check_in,
        check_out: r.check_out,
        booking_status: r.booking_status,
        booked_date: r.booked_date ?? null,
        rental_revenue: r.rental_revenue ? parseFloat(r.rental_revenue) : null,
        total_cost: r.total_cost ? parseFloat(r.total_cost) : null,
        no_of_days: r.no_of_days ?? null,
        currency: r.currency ?? null,
        booking_channel: r.booking_channel ?? null,
        cleaning_fees: r.cleaning_fees ?? null,
        listing_naam: r.listing_name ?? listing.name,
      }));

      for (let i = 0; i < rows.length; i += 100) {
        await admin.from("cockpit_reserveringen_cache").upsert(
          rows.slice(i, i + 100),
          { onConflict: "listing_id,reservation_id" }
        );
      }
      totaal += rows.length;
    } catch { continue; }
  }

  // Sla sync-tijdstip op
  await admin.from("cockpit_cache_meta").upsert(
    { sleutel: "reserveringen_sync", waarde: nu, bijgewerkt_op: nu },
    { onConflict: "sleutel" }
  );

  return NextResponse.json({ ok: true, reserveringen: totaal, listing_count: listings.length, sync_op: nu });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("cockpit_cache_meta")
    .select("waarde, bijgewerkt_op")
    .eq("sleutel", "reserveringen_sync")
    .single();

  return NextResponse.json({ sync_op: data?.waarde ?? null });
}
