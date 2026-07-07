// src/lib/onboarding/auth.ts
import { createHmac, pbkdf2Sync, randomBytes } from "crypto";

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
