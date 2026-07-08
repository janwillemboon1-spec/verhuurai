// src/lib/onboarding/auth.ts
import { createHmac, pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const SECRET = process.env.ONBOARDING_SECRET || "onboarding-dev-secret";

export function hashWachtwoord(wachtwoord: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(wachtwoord, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyWachtwoord(wachtwoord: string, opgeslagenHash: string): boolean {
  const [salt, hash] = opgeslagenHash.split(":");
  if (!salt || !hash) return false;
  const testHash = pbkdf2Sync(wachtwoord, salt, 100000, 64, "sha512").toString("hex");
  return testHash === hash;
}

export function maakCookieWaarde(token: string): string {
  const hmac = createHmac("sha256", SECRET).update(token).digest("hex");
  return `${token}:${hmac}`;
}

export function verifyCookieWaarde(cookieWaarde: string, token: string): boolean {
  const verwacht = maakCookieWaarde(token);
  return cookieWaarde === verwacht;
}

export const COOKIE_NAAM = "onboarding_auth";
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 dagen

const RESET_GELDIG_MS = 60 * 60 * 1000; // 1 uur

export function maakResetToken(linkToken: string): string {
  const timestamp = Date.now().toString();
  const hmac = createHmac("sha256", SECRET)
    .update(`reset:${linkToken}:${timestamp}`)
    .digest("hex");
  return Buffer.from(`${timestamp}:${hmac}`).toString("base64url");
}

export function verifyResetToken(linkToken: string, rt: string): boolean {
  try {
    const decoded = Buffer.from(rt, "base64url").toString();
    const colonIndex = decoded.indexOf(":");
    if (colonIndex === -1) return false;
    const timestamp = decoded.slice(0, colonIndex);
    const hmac = decoded.slice(colonIndex + 1);
    if (!timestamp || !hmac) return false;
    const verwacht = createHmac("sha256", SECRET)
      .update(`reset:${linkToken}:${timestamp}`)
      .digest("hex");
    if (hmac.length !== verwacht.length) return false;
    if (!timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(verwacht, "hex"))) return false;
    if (Date.now() - parseInt(timestamp) > RESET_GELDIG_MS) return false;
    return true;
  } catch {
    return false;
  }
}
