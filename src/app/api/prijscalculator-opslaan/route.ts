import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateUser } from "@/lib/supabase/get-or-create-user";
import { Resend } from "resend";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { voornaam, email, locatie, land, basisprijs, minNachten, jaar, resultaat } = await request.json();
  const admin = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://verhuurai.nl";

  // Account aanmaken of vinden
  let userId: string | null = null;
  let loginUrl: string | null = null;
  if (email) {
    const result = await getOrCreateUser(email);
    userId = result.userId;
    loginUrl = result.loginUrl;
  }

  const { data, error } = await admin
    .from("prijscalculator_rapporten")
    .insert({ voornaam: voornaam || null, email: email || null, locatie, land, basisprijs, min_nachten: minNachten || 1, jaar, resultaat_json: resultaat, user_id: userId })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Email versturen als adres opgegeven
  if (email && email.includes("@")) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://verhuurai.nl";
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "Boni van VerhuurAI <boni@verhuurai.nl>",
        to: email,
        subject: `Jouw prijscalculator rapport — ${locatie}, ${land}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
              <h1 style="color:white;margin:0;font-size:22px;">🏠 VerhuurAI Prijscalculator</h1>
              <p style="color:#a5b4fc;margin:8px 0 0;font-size:14px;">${locatie}, ${land} · Basisprijs €${basisprijs}/nacht</p>
            </div>
            <p style="color:#374151;">Jouw prijsrapport is klaar. Bekijk het volledige overzicht via de knop hieronder.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${baseUrl}/prijscalculator/resultaat/${data.id}"
                 style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">
                Bekijk mijn prijsrapport →
              </a>
            </div>
            ${loginUrl ? `
            <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-top:8px;">
              <p style="margin:0 0 8px;font-weight:bold;color:#1B2B4B;">📊 Je dashboard</p>
              <p style="margin:0 0 12px;color:#6b7280;font-size:14px;">We hebben automatisch een dashboard voor je aangemaakt. Log hier in om al je rapporten terug te vinden.</p>
              <a href="${loginUrl}" style="background:#1B2B4B;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
                Inloggen op dashboard →
              </a>
            </div>` : ""}
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
              Gegenereerd door VerhuurAI · <a href="${baseUrl}" style="color:#9ca3af;">verhuurai.nl</a>
            </p>
          </div>`,
      });
    } catch (e) {
      console.error("Email sturen mislukt:", e);
    }
  }

  return NextResponse.json({ ok: true, id: data.id });
}
