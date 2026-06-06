import { createAdminClient } from "@/lib/supabase/admin";
import { Resend } from "resend";
import { NextResponse } from "next/server";

function genereerCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email?.includes("@")) return NextResponse.json({ error: "Ongeldig email" }, { status: 400 });

  const admin = createAdminClient();
  const code = genereerCode();
  const verlopen = new Date(Date.now() + 10 * 60 * 1000); // 10 minuten

  // Sla code op
  const { error } = await admin.from("otp_codes").insert({
    email: email.toLowerCase().trim(),
    code,
    verlopen_op: verlopen.toISOString(),
  });

  if (error) return NextResponse.json({ error: "Kon code niet opslaan" }, { status: 500 });

  // Stuur via Resend
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error: resendError } = await resend.emails.send({
    from: "Boni van VerhuurAI <boni@verhuurai.nl>",
    to: email.trim(),
    subject: "Jouw inlogcode voor VerhuurAI",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <div style="background:#1B2B4B;padding:20px;border-radius:12px;text-align:center;margin-bottom:24px;">
          <h1 style="color:white;margin:0;font-size:20px;">🏠 VerhuurAI</h1>
        </div>
        <h2 style="color:#1B2B4B;">Jouw inlogcode</h2>
        <p style="color:#6b7280;">Voer deze code in op de website om in te loggen:</p>
        <div style="background:#f3f4f6;border-radius:12px;padding:24px;text-align:center;margin:20px 0;">
          <span style="font-size:48px;font-weight:bold;letter-spacing:12px;font-family:monospace;color:#2b3885;">${code}</span>
        </div>
        <p style="color:#9ca3af;font-size:13px;">De code is 10 minuten geldig. Deel hem nooit met anderen.</p>
      </div>`,
  });

  if (resendError) {
    console.error("Resend fout:", resendError);
    return NextResponse.json({ error: "Email sturen mislukt" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
