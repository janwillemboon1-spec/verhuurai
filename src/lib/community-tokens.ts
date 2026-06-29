declare global {
  var communityTokens: Map<string, { email: string; expires: number }>;
}
if (!global.communityTokens) global.communityTokens = new Map();

const TWEE_UUR = 2 * 60 * 60 * 1000;

export function maakCommunityToken(email: string): string {
  const token = crypto.randomUUID();
  global.communityTokens.set(token, { email: email.toLowerCase(), expires: Date.now() + TWEE_UUR });
  return token;
}

export function verifieerCommunityToken(token: string): string | null {
  const entry = global.communityTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    global.communityTokens.delete(token);
    return null;
  }
  return entry.email;
}
