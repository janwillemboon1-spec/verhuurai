const BASE = "https://api.pricelabs.co/v1";
const PMS = "hostaway"; // default fallback only

function headers() {
  return {
    "X-API-Key": process.env.PRICELABS_API_KEY!,
    "Content-Type": "application/json",
  };
}

// Per-request listings cache (geldig voor de duur van één server request)
let listingsCache: PLListing[] | null = null;
let listingsCacheTime = 0;
const CACHE_TTL = 60 * 1000; // 60 seconden

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
  if (listingsCache && Date.now() - listingsCacheTime < CACHE_TTL) return listingsCache;
  const res = await fetch(`${BASE}/listings`, { headers: headers() });
  const data = await res.json();
  listingsCache = data.listings ?? [];
  listingsCacheTime = Date.now();
  return listingsCache!;
}

export async function getListingNaamPL(listingId: string): Promise<string> {
  const res = await fetch(`${BASE}/listings/${listingId}?pms=${PMS}`, { headers: headers() });
  if (!res.ok) return listingId;
  const data = await res.json();
  const naam = data.listing?.name ?? data.name ?? null;
  return naam ? naam.split("--")[0].trim() : listingId;
}

export async function updateListing(
  id: string,
  fields: { base?: number; min?: number; max?: number }
): Promise<boolean> {
  const listings = await getListings();
  const listing = listings.find((l) => l.id === id);
  const pms = listing?.pms ?? PMS;
  const res = await fetch(`${BASE}/listings`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ listings: [{ id, pms, ...fields }] }),
  });
  return res.ok;
}

export async function getCalendar(
  listingId: string,
  startDate: string,
  endDate: string,
  pms?: string
): Promise<PLCalendarDay[]> {
  // If pms not provided, look it up from listings
  let resolvedPms = pms ?? PMS;
  if (!pms) {
    const listings = await getListings();
    const listing = listings.find((l) => l.id === listingId);
    if (listing) resolvedPms = listing.pms;
  }
  const res = await fetch(`${BASE}/listing_prices`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      listings: [{ id: listingId, pms: resolvedPms, start_date: startDate, end_date: endDate }],
    }),
  });
  const data = await res.json();
  return data?.[0]?.data ?? [];
}

async function getPmsForListing(listingId: string): Promise<string> {
  const listings = await getListings();
  return listings.find((l) => l.id === listingId)?.pms ?? PMS;
}

export async function getOverrides(listingId: string): Promise<PLOverride[]> {
  const pms = await getPmsForListing(listingId);
  const res = await fetch(`${BASE}/listings/${listingId}/overrides?pms=${pms}`, {
    headers: headers(),
  });
  const data = await res.json();
  return data.overrides ?? [];
}

export async function upsertOverride(
  listingId: string,
  override: Omit<PLOverride, "created_at" | "updated_at">
): Promise<boolean> {
  const pms = await getPmsForListing(listingId);
  const res = await fetch(`${BASE}/listings/${listingId}/overrides?pms=${pms}`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ overrides: [override] }),
  });
  return res.ok;
}

export async function deleteOverride(listingId: string, date: string): Promise<boolean> {
  const pms = await getPmsForListing(listingId);
  const res = await fetch(`${BASE}/listings/${listingId}/overrides?pms=${pms}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ dates: [date] }),
  });
  return res.ok;
}

export async function pushPrices(listingId: string): Promise<boolean> {
  const listings = await getListings();
  const listing = listings.find((l) => l.id === listingId);
  const pms = listing?.pms ?? PMS;
  const res = await fetch(`${BASE}/push_prices`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ listing_id: listingId, pms }),
  });
  const data = await res.json();
  return data.status?.includes("updated") ?? false;
}

export interface PLReservation {
  listing_id: string;
  listing_name: string;
  reservation_id: string;
  check_in: string;
  check_out: string;
  booking_status: string;
  booked_date: string;
  rental_revenue: string;
  total_cost: string;
  no_of_days: number;
  currency: string;
  cancelled_on: string | null;
  booking_channel: string;
  cleaning_fees: number;
}

async function fetchReservationDataForListing(listing: PLListing, startDate: string, endDate: string): Promise<PLReservation[]> {
  const params = new URLSearchParams({
    pms: listing.pms,
    listing_id: listing.id,
    start_date: startDate,
    end_date: endDate,
    limit: "500",
  });
  const res = await fetch(`${BASE}/reservation_data?${params}`, { headers: headers() });
  if (!res.ok) return [];
  const data = await res.json();
  const rows: PLReservation[] = data.data ?? [];
  // Direct Airbnb-gekoppelde woningen (pms=airbnb) hebben geen booking_channel — zet dit expliciet
  if (listing.pms === "airbnb") {
    return rows.map((r) => ({ ...r, booking_channel: r.booking_channel || "airbnb" }));
  }
  return rows;
}

export async function getReservationData(startDate: string, endDate: string, listingId?: string): Promise<PLReservation[]> {
  const listings = await getListings();

  if (listingId) {
    const listing = listings.find((l) => l.id === listingId);
    if (!listing) return [];
    return fetchReservationDataForListing(listing, startDate, endDate);
  }

  // Alle woningen parallel ophalen — elke woning past in één pagina
  const results = await Promise.all(
    listings.map((l) => fetchReservationDataForListing(l, startDate, endDate))
  );
  return results.flat();
}

export function parseOccupancy(val: string | null | undefined): number {
  if (!val) return 0;
  return parseInt(val.replace("%", "").trim(), 10) || 0;
}

export function pacingDelta(own: number, market: number): number {
  return own - market;
}
