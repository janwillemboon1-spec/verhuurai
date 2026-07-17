// src/app/api/onboarding/auth/[token]/reset-aanvragen/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maakResetToken } from "@/lib/onboarding/auth";
import { stuurWachtwoordResetEmail } from "@/lib/onboarding/email";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id, email, link_token, voornaam")
    .eq("link_token", params.token)
    .single();

  if (!login) {
    // Geef altijd 200 terug om e-mail enumeration te voorkomen
    return NextResponse.json({ ok: true });
  }

  const rt = maakResetToken(params.token);
  const resetUrl = `${BASE_URL}/onboarding/${params.token}/reset?rt=${rt}`;

  try {
    await stuurWachtwoordResetEmail(login.email, resetUrl, login.voornaam);
  } catch (err) {
    console.error("Reset email fout:", err);
    return NextResponse.json({ error: "E-mail kon niet worden verstuurd" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
