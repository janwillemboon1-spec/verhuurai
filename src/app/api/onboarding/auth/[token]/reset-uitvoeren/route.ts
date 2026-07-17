// src/app/api/onboarding/auth/[token]/reset-uitvoeren/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyResetToken, hashWachtwoord } from "@/lib/onboarding/auth";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const { rt, nieuwWachtwoord } = await req.json();

  if (!rt || !nieuwWachtwoord || nieuwWachtwoord.length < 4) {
    return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
  }

  if (!verifyResetToken(params.token, rt)) {
    return NextResponse.json({ error: "Link is verlopen of ongeldig" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id")
    .eq("link_token", params.token)
    .single();

  if (!login) {
    return NextResponse.json({ error: "Login niet gevonden" }, { status: 404 });
  }

  const wachtwoord_hash = hashWachtwoord(nieuwWachtwoord);
  await admin.from("onboarding_logins").update({ wachtwoord_hash }).eq("id", login.id);

  return NextResponse.json({ ok: true });
}
