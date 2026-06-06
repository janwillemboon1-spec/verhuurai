import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateUser } from "@/lib/supabase/get-or-create-user";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email, code } = await request.json();
  if (!email || !code) return NextResponse.json({ error: "Email en code vereist" }, { status: 400 });

  const admin = createAdminClient();
  const nu = new Date().toISOString();

  // Zoek geldige, ongebruikte code
  const { data: otpRecord } = await admin
    .from("otp_codes")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("code", code.trim())
    .eq("gebruikt", false)
    .gte("verlopen_op", nu)
    .order("aangemaakt_op", { ascending: false })
    .limit(1)
    .single();

  if (!otpRecord) {
    return NextResponse.json({ error: "Ongeldige of verlopen code" }, { status: 401 });
  }

  // Markeer als gebruikt
  await admin.from("otp_codes").update({ gebruikt: true }).eq("id", otpRecord.id);

  // Account aanmaken of vinden
  const { userId } = await getOrCreateUser(email.trim());
  if (!userId) return NextResponse.json({ error: "Account aanmaken mislukt" }, { status: 500 });

  // Genereer inloglink voor de sessie
  const { data: linkData } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim(),
    options: { redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard` },
  });

  return NextResponse.json({
    ok: true,
    userId,
    loginUrl: linkData?.properties?.action_link || null,
  });
}
