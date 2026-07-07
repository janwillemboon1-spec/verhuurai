import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWachtwoord, maakCookieWaarde, COOKIE_NAAM, COOKIE_MAX_AGE } from "@/lib/onboarding/auth";

export async function POST(request: NextRequest, { params }: { params: { token: string } }) {
  const body = await request.json();
  const { wachtwoord } = body;
  if (!wachtwoord) return NextResponse.json({ error: "wachtwoord ontbreekt" }, { status: 400 });

  const admin = createAdminClient();
  const { data: klant, error } = await admin
    .from("onboarding_klanten")
    .select("id, wachtwoord_hash, link_token")
    .eq("link_token", params.token)
    .single();

  if (error || !klant) return NextResponse.json({ error: "Ongeldige link" }, { status: 404 });

  const correct = verifyWachtwoord(wachtwoord, klant.wachtwoord_hash);
  if (!correct) return NextResponse.json({ error: "Onjuist wachtwoord" }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAAM, maakCookieWaarde(klant.link_token), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: COOKIE_MAX_AGE,
    path: "/",
  });
  return response;
}
