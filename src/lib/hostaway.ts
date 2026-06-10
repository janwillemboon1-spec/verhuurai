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
}

export async function getListings(): Promise<HostawayListing[]> {
  const res = await hostawayFetch("/listings?limit=100");
  const data = await res.json();
  return data.result ?? [];
}

export async function getConversations(listingIds: number[]): Promise<HostawayConversation[]> {
  if (listingIds.length === 0) return [];

  const all: HostawayConversation[] = [];

  for (const listingId of listingIds) {
    const res = await hostawayFetch(
      `/conversations?listingId=${listingId}&isArchived=0&limit=50`
    );
    const data = await res.json();
    if (data.result) all.push(...data.result);
  }

  return all.sort((a, b) =>
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
