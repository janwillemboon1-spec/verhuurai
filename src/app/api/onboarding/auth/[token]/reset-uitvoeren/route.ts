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
  const { data: klant } = await admin
    .from("onboarding_klanten")
    .select("id")
    .eq("link_token", params.token)
    .single();

  if (!klant) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  const wachtwoord_hash = hashWachtwoord(nieuwWachtwoord);
  await admin.from("onboarding_klanten").update({ wachtwoord_hash }).eq("id", klant.id);

  return NextResponse.json({ ok: true });
}
