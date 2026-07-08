import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { maakResetToken } from "@/lib/onboarding/auth";
import { stuurUitnodigingsEmail } from "@/lib/onboarding/email";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: klant } = await admin
    .from("onboarding_klanten")
    .select("id, naam, email, link_token, voornaam")
    .eq("id", params.id)
    .single();

  if (!klant) {
    return NextResponse.json({ error: "Klant niet gevonden" }, { status: 404 });
  }

  const token = klant.link_token;
  const rt = maakResetToken(token);
  const dashboardUrl = `${BASE_URL}/onboarding/${token}/dashboard`;
  const resetUrl = `${BASE_URL}/onboarding/${token}/reset?rt=${rt}`;

  try {
    await stuurUitnodigingsEmail(klant.email, klant.naam, dashboardUrl, resetUrl, klant.voornaam);
  } catch (err) {
    console.error("Uitnodigingsmail fout:", err);
    return NextResponse.json({ error: "E-mail kon niet worden verstuurd" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
