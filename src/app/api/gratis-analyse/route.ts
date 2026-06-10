import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { buildTitelPrompt } from "@/lib/boni-prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function kapTitelAf(titel: string): string {
  if (titel.length <= 50) return titel;
  const afgekapt = titel.slice(0, 50);
  const lastSpace = afgekapt.lastIndexOf(" ");
  return lastSpace > 30 ? afgekapt.slice(0, lastSpace).trimEnd() : afgekapt.trimEnd();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titel, airbnbUrl, recensies, naam, email, taal } = body;

    if (!titel || typeof titel !== "string") {
      return NextResponse.json({ error: "Titel is verplicht" }, { status: 400 });
    }

    if (titel.trim().length > 100) {
      return NextResponse.json({ error: "Titel mag maximaal 100 tekens bevatten" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: buildTitelPrompt(titel.trim(), airbnbUrl?.trim(), recensies?.trim(), taal || "nl"),
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Onverwacht antwoordtype van Claude");
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed.herschreven_versies)) {
      parsed.herschreven_versies = parsed.herschreven_versies.map((v: { versie: string; tekens: number; uitleg: string }) => {
        const versie = kapTitelAf(v.versie);
        return { ...v, versie, tekens: versie.length };
      });
    }

    // Opslaan in Supabase (fire-and-forget, blokkeer response niet)
    try {
      const admin = createAdminClient();
      await admin.from("gratis_rapporten").insert({
        naam: naam?.trim() || null,
        email: email?.trim() || null,
        airbnb_url: airbnbUrl?.trim() || null,
        titel: titel.trim(),
      });
    } catch (e) {
      console.error("Gratis rapport opslaan mislukt:", e);
    }

    // E-mail met resultaten sturen
    if (email?.trim() && email.includes("@")) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
        const versiesHtml = Array.isArray(parsed.herschreven_versies)
          ? parsed.herschreven_versies.map((v: { versie: string; uitleg: string }, i: number) => `
            <div style="background:#f9fafb;border-left:3px solid #FF6B6B;padding:12px 16px;border-radius:4px;margin-bottom:12px;">
              <p style="margin:0 0 4px;font-weight:bold;color:#1B2B4B;font-size:14px;">${i + 1}. ${v.versie}</p>
              ${v.uitleg ? `<p style="margin:0;font-size:12px;color:#6b7280;">${v.uitleg}</p>` : ""}
            </div>`).join("")
          : "";

        await resend.emails.send({
          from: "Boni van Host Boni <boni@verhuurai.nl>",
          to: email.trim(),
          subject: `Je gratis titelanalyse is klaar! 🏠`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
                <h1 style="color:white;margin:0;font-size:22px;">🏠 Host Boni</h1>
                <p style="color:#a5b4fc;margin:8px 0 0;">Gratis titelanalyse</p>
              </div>
              <p style="color:#374151;">Hey${naam?.trim() ? " " + naam.trim() : ""}! Hier zijn jouw herschreven titels voor <em>${titel.trim()}</em>:</p>
              ${versiesHtml}
              ${parsed.analyse ? `<div style="background:#eef7fe;border-radius:8px;padding:16px;margin-top:16px;"><p style="margin:0;font-size:14px;color:#1B2B4B;">${parsed.analyse}</p></div>` : ""}
              <div style="text-align:center;margin:32px 0;">
                <a href="${baseUrl}/listing-optimizer" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;">
                  Volledige listing analyse →
                </a>
              </div>
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
                Host Boni · <a href="${baseUrl}" style="color:#9ca3af;">hostboni.com</a>
              </p>
            </div>`,
        });
      } catch (e) {
        console.error("Gratis analyse email mislukt:", e);
      }
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gratis analyse fout:", error);
    return NextResponse.json(
      { error: "Boni heeft even een technisch probleem. Probeer het zo nog eens!" },
      { status: 500 }
    );
  }
}
