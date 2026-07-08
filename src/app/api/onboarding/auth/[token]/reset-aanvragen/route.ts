import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maakResetToken } from "@/lib/onboarding/auth";
import { stuurWachtwoordResetEmail } from "@/lib/onboarding/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: klant } = await admin
    .from("onboarding_klanten")
    .select("id, naam, email, link_token, voornaam")
    .eq("link_token", params.token)
    .single();

  if (!klant) {
    // Geef altijd 200 terug om e-mail enumeration te voorkomen
    return NextResponse.json({ ok: true });
  }

  const rt = maakResetToken(params.token);
  const resetUrl = `${BASE_URL}/onboarding/${params.token}/reset?rt=${rt}`;

  try {
    await stuurWachtwoordResetEmail(klant.email, klant.naam, resetUrl, klant.voornaam);
  } catch (err) {
    console.error("Reset email fout:", err);
    return NextResponse.json({ error: "E-mail kon niet worden verstuurd" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
