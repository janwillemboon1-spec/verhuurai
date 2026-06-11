import { createAdminClient } from "./supabase/admin";
import { PLReservation } from "./pricelabs";

const PAGE_SIZE = 1000;

export async function getReserveringenUitCache(
  startDate: string,
  endDate: string,
  listingId?: string
): Promise<PLReservation[]> {
  const admin = createAdminClient();
  const all: PLReservation[] = [];
  let from = 0;

  while (true) {
    let query = admin
      .from("cockpit_reserveringen_cache")
      .select("*")
      .gte("check_in", startDate)
      .lte("check_in", endDate)
      .range(from, from + PAGE_SIZE - 1)
      .order("check_in");

    if (listingId) query = query.eq("listing_id", listingId);

    const { data, error } = await query;
    if (error || !data || data.length === 0) break;

    all.push(...data.map((r) => ({
      listing_id: r.listing_id,
      listing_name: r.listing_naam ?? "",
      reservation_id: r.reservation_id,
      check_in: typeof r.check_in === "string" ? r.check_in.slice(0, 10) : String(r.check_in),
      check_out: typeof r.check_out === "string" ? r.check_out.slice(0, 10) : String(r.check_out),
      booking_status: r.booking_status,
      booked_date: r.booked_date ?? "",
      rental_revenue: r.rental_revenue != null ? String(r.rental_revenue) : "0",
      total_cost: r.total_cost != null ? String(r.total_cost) : "0",
      no_of_days: r.no_of_days ?? 0,
      currency: r.currency ?? "EUR",
      cancelled_on: null,
      booking_channel: r.booking_channel ?? "",
      cleaning_fees: r.cleaning_fees ?? 0,
    })));

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function getCacheSyncTijdstip(): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cockpit_cache_meta")
    .select("waarde")
    .eq("sleutel", "reserveringen_sync")
    .single();
  return data?.waarde ?? null;
}
