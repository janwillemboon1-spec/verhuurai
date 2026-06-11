const BASE = "https://api.pricelabs.co/v1";
const PMS = "hostaway";

function headers() {
  return {
    "X-API-Key": process.env.PRICELABS_API_KEY!,
    "Content-Type": "application/json",
  };
}

export interface PLListing {
  id: string;
  pms: string;
  name: string;
  city_name: string | null;
  no_of_bedrooms: number;
  base: number | null;
  min: number | null;
  max: number | null;
  recommended_base_price: number | null;
  notes: string | null;
  push_enabled: boolean;
  last_refreshed_at: string;
  occupancy_next_7: string;
  occupancy_next_15: string;
  occupancy_next_30: string;
  occupancy_next_60: string;
  occupancy_next_90: string;
  market_occupancy_next_7: string;
  market_occupancy_next_15: string;
  market_occupancy_next_30: string;
  market_occupancy_next_60: string;
  market_occupancy_next_90: string;
  booking_pickup_unique_past_30: number;
  booking_pickup_unique_past_3: number;
}

export interface PLCalendarDay {
  date: string;
  price: number;
  user_price: number;
  uncustomized_price: number;
  min_stay: number;
  booking_status: string;
  demand_color: string;
  demand_desc: string;
}

export interface PLOverride {
  date: string;
  price: string;
  price_type: "percent" | "fixed";
  min_stay: number;
  reason: string;
  created_at?: string;
  updated_at?: string;
}

export async function getListings(): Promise<PLListing[]> {
  const res = await fetch(`${BASE}/listings`, { headers: headers() });
  const data = await res.json();
  return data.listings ?? [];
}

export async function updateListing(
  id: string,
  fields: { base?: number; min?: number; max?: number }
): Promise<boolean> {
  const res = await fetch(`${BASE}/listings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ listings: [{ id, pms: PMS, ...fields }] }),
  });
  return res.ok;
}

export async function getCalendar(
  listingId: string,
  startDate: string,
  endDate: string
): Promise<PLCalendarDay[]> {
  const res = await fetch(`${BASE}/listing_prices`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      listings: [{ id: listingId, pms: PMS, start_date: startDate, end_date: endDate }],
    }),
  });
  const data = await res.json();
  return data?.[0]?.data ?? [];
}

export async function getOverrides(listingId: string): Promise<PLOverride[]> {
  const res = await fetch(`${BASE}/listings/${listingId}/overrides?pms=${PMS}`, {
    headers: headers(),
  });
  const data = await res.json();
  return data.overrides ?? [];
}

export async function upsertOverride(
  listingId: string,
  override: Omit<PLOverride, "created_at" | "updated_at">
): Promise<boolean> {
  const res = await fetch(`${BASE}/listings/${listingId}/overrides?pms=${PMS}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ overrides: [override] }),
  });
  return res.ok;
}

export async function deleteOverride(listingId: string, date: string): Promise<boolean> {
  const res = await fetch(`${BASE}/listings/${listingId}/overrides?pms=${PMS}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ dates: [date] }),
  });
  return res.ok;
}

export async function pushPrices(listingId: string): Promise<boolean> {
  const res = await fetch(`${BASE}/push_prices`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ listing_id: listingId, pms: PMS }),
  });
  const data = await res.json();
  return data.status?.includes("updated") ?? false;
}

export function parseOccupancy(val: string | null | undefined): number {
  if (!val) return 0;
  return parseInt(val.replace("%", "").trim(), 10) || 0;
}

export function pacingDelta(own: number, market: number): number {
  return own - market;
}
