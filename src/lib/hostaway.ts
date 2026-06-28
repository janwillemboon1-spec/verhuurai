const HOSTAWAY_BASE = "https://api.hostaway.com/v1";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const res = await fetch(`${HOSTAWAY_BASE}/accessTokens`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.HOSTAWAY_ACCOUNT_ID!,
      client_secret: process.env.HOSTAWAY_API_KEY!,
      scope: "general",
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error("Hostaway auth mislukt");

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in - 300) * 1000;
  return cachedToken!;
}

async function hostawayFetch(path: string, options?: RequestInit) {
  const token = await getAccessToken();
  return fetch(`${HOSTAWAY_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options?.headers ?? {}),
    },
  });
}

export interface HostawayListing {
  id: number;
  name: string;
  cityName: string | null;
}

export interface HostawayMessage {
  id: number;
  body: string;
  channelId: number;
  insertionTime?: string;
  userId: number | null;
}

export interface HostawayReservation {
  arrivalDate: string;
  departureDate: string;
  channelName: string;
  listingName: string;
}

export interface HostawayReserveringFee {
  name: string;
  feeType: string;
  amount: number;
  percentage: number | null;
  isIncluded: number;
}

export interface HostawayFinReservering {
  id: number;
  listingMapId: number;
  listingName: string;
  channelName: string;
  arrivalDate: string;
  departureDate: string;
  nights: number;
  numberOfGuests: number;
  status: string;
  totalPrice: number;
  cleaningFee: number;
  taxAmount: number;
  channelCommissionAmount: number | null;
  // Airbnb-specifieke velden
  airbnbListingBasePrice: number | null;
  airbnbExpectedPayoutAmount: number | null;
  airbnbListingHostFee: number | null;
  airbnbOccupancyTaxAmountPaidToHost: number | null;
  reservationFees: HostawayReserveringFee[];
}

const GEANNULEERDE_STATUSSEN = new Set(['cancelled', 'declined', 'expired', 'inquiry']);

function isSchoonmaakFee(naam: string): boolean {
  const l = naam.toLowerCase();
  return l.includes('schoonmaak') || l.includes('cleaning') || l.includes('reinig');
}

function berekenRentFromOTA(r: HostawayFinReservering): number {
  const kanaal = (r.channelName ?? '').toLowerCase();

  // Airbnb levert een kant-en-klaar veld
  if (kanaal.includes('airbnb')) {
    return r.airbnbListingBasePrice ?? 0;
  }

  // Alle andere kanalen: totalPrice - cleaningFee - extra host-fees (belasting, etc.) - kanaalcommissie
  // De reservationFees met feeType 'hotel' zijn kosten voor de host.
  // We trekken schoonmaakkosten NIET af via fees (die zitten al in het top-level cleaningFee veld).
  const extraHostFees = (r.reservationFees ?? [])
    .filter(f => f.feeType === 'hotel' && !isSchoonmaakFee(f.name ?? ''))
    .reduce((sum, f) => sum + (f.amount ?? 0), 0);

  return (r.totalPrice ?? 0)
    - (r.cleaningFee ?? 0)
    - extraHostFees
    - (r.channelCommissionAmount ?? 0);
}

function berekenPayoutOTA(r: HostawayFinReservering): number {
  const kanaal = (r.channelName ?? '').toLowerCase();

  if (kanaal.includes('airbnb')) {
    return r.airbnbExpectedPayoutAmount ?? 0;
  }

  // Voor alle andere kanalen: payout = rent_from_OTA + cleaningFee.
  // De commission zit al verwerkt in berekenRentFromOTA, dus NIET opnieuw aftrekken.
  return berekenRentFromOTA(r) + (r.cleaningFee ?? 0);
}

export function berekenFinancials(r: HostawayFinReservering) {
  return {
    rent_from_ota: Math.max(0, berekenRentFromOTA(r)),
    payout_ota: Math.max(0, berekenPayoutOTA(r)),
  };
}

export async function getFinReserveringen(
  startDatum: string,
  eindDatum: string,
  onProgress?: (bericht: string) => void
): Promise<HostawayFinReservering[]> {
  const LIMIET = 100;
  const alleRes: HostawayFinReservering[] = [];
  let offset = 0;

  while (true) {
    const params = new URLSearchParams({
      limit: String(LIMIET),
      offset: String(offset),
      arrivalStartDate: startDatum,
      arrivalEndDate: eindDatum,
    });

    const res = await hostawayFetch(`/reservations?${params}`);
    const data = await res.json();
    const batch: HostawayFinReservering[] = data.result ?? [];

    if (batch.length === 0) break;

    const geldig = batch.filter(r => !GEANNULEERDE_STATUSSEN.has((r.status ?? '').toLowerCase()));
    alleRes.push(...geldig);

    onProgress?.(`${alleRes.length} reserveringen opgehaald...`);

    if (batch.length < LIMIET) break;
    offset += LIMIET;
  }

  return alleRes;
}

export interface HostawayConversation {
  id: number;
  listingMapId: number;
  reservationId: number;
  recipientName: string;
  recipientEmail: string;
  hasUnreadMessages: number;
  messageSentOn: string;
  messageReceivedOn: string;
  conversationMessages: HostawayMessage[];
  Reservation: HostawayReservation | null;
}

export async function getListings(): Promise<HostawayListing[]> {
  const res = await hostawayFetch("/listings?limit=100");
  const data = await res.json();
  return data.result ?? [];
}

export async function getConversations(listingIds: number[]): Promise<HostawayConversation[]> {
  if (listingIds.length === 0) return [];

  const res = await hostawayFetch("/conversations?isArchived=0&limit=100");
  const data = await res.json();
  const all: HostawayConversation[] = data.result ?? [];

  const allowed = new Set(listingIds);
  return all
    .filter((c) => allowed.has(c.listingMapId))
    .sort((a, b) =>
      new Date(b.messageReceivedOn).getTime() - new Date(a.messageReceivedOn).getTime()
    );
}

export async function getConversation(conversationId: number): Promise<HostawayConversation | null> {
  const res = await hostawayFetch(`/conversations/${conversationId}`);
  const data = await res.json();
  return data.result ?? null;
}

export async function sendMessage(conversationId: number, body: string): Promise<boolean> {
  const res = await hostawayFetch(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ body }),
  });
  const data = await res.json();
  return data.status === "success";
}
