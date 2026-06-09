import Anthropic from "@anthropic-ai/sdk";
import { buildBoniSystemPrompt } from "@/lib/boni-prompt";
import { AnalyseFormulier } from "@/types/rapport";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateUser } from "@/lib/supabase/get-or-create-user";
import { Resend } from "resend";
import { NextResponse } from "next/server";

function kapTitelAf(titel: string): string {
  if (titel.length <= 50) return titel;
  const afgekapt = titel.slice(0, 50);
  const lastSpace = afgekapt.lastIndexOf(" ");
  return lastSpace > 30 ? afgekapt.slice(0, lastSpace).trimEnd() : afgekapt.trimEnd();
}

declare global {
  var sessies: Map<string, any>;
  var rapporten: Map<string, any>;
  var rapportStatus: Map<string, "verwerking" | "klaar" | "fout">;
}
if (!global.sessies) global.sessies = new Map();
if (!global.rapporten) global.rapporten = new Map();
if (!global.rapportStatus) global.rapportStatus = new Map();

export async function POST(request: Request) {
  let sessieId = "";
  try {
    const body = await request.json();
    const {
      sessieId: sid,
      formData,
      fotos,
    }: {
      sessieId: string;
      formData: AnalyseFormulier;
      fotos?: Array<{ base64: string; mediaType: string; stap?: number }>;
    } = body;

    sessieId = sid;

    if (!sessieId || typeof sessieId !== "string") {
      return NextResponse.json({ error: "sessieId is verplicht" }, { status: 400 });
    }

    if (!formData) {
      return NextResponse.json({ error: "formData is verplicht" }, { status: 400 });
    }

    global.rapportStatus.set(sessieId, "verwerking");

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userTextContent = `
Hier is de volledige Airbnb-advertentie van ${formData.hostNaam} om te analyseren:

**Titel:** ${formData.titel || "(niet ingevuld)"}${formData.titel ? ` [exacte tekenlengte: ${formData.titel.length}]` : ""}

**Beschrijving:** ${formData.beschrijving || "(niet ingevuld)"}

**Accommodatie:** ${formData.accommodatie || "(niet ingevuld)"}

**Toegang:** ${formData.toegang || "(niet ingevuld)"}

**Interactie met gasten:** ${formData.interactie || "(niet ingevuld)"}

**Andere info:** ${formData.andereInfo || "(niet ingevuld)"}

**Voorzieningen:** ${formData.voorzieningen || "(niet ingevuld)"}

**Buurt:** ${formData.buurt || "(niet ingevuld)"}

**Vervoer:** ${formData.vervoer || "(niet ingevuld)"}

**Recensies:** ${formData.recensies || "(niet ingevuld)"}

**Host profiel:** ${formData.hostProfiel || "(niet ingevuld)"}

**Huisregels:** ${formData.huisregels || "(niet ingevuld)"}

**Direct boeken:** ${formData.directBoeken || "(niet ingevuld)"}

**Annuleringsbeleid:** ${formData.annuleringsbeleid || "(niet ingevuld)"}
    `.trim();

    const userContent: Anthropic.MessageParam["content"] = [
      { type: "text", text: userTextContent },
    ];

    if (fotos && fotos.length > 0) {
      const STAP_NAAR_VELD: Record<number, string> = {
        4: "accommodatie",
        5: "toegang voor gasten",
        6: "interactie met gasten",
        7: "andere info",
        8: "voorzieningen",
        9: "buurt",
        10: "vervoer",
        11: "recensies",
        12: "hostprofiel",
        13: "huisregels",
      };

      const fotosToProcess = fotos.slice(0, 20);
      for (let i = 0; i < fotosToProcess.length; i++) {
        const foto = fotosToProcess[i];
        const veldLabel = foto.stap && STAP_NAAR_VELD[foto.stap]
          ? `Screenshot voor veld "${STAP_NAAR_VELD[foto.stap]}"`
          : `Screenshot ${i + 1}`;
        userContent.push({
          type: "text",
          text: veldLabel,
        });
        userContent.push({
          type: "image",
          source: {
            type: "base64",
            media_type: foto.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
            data: foto.base64,
          },
        });
      }
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: buildBoniSystemPrompt(formData),
      messages: [{ role: "user", content: userContent }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Onverwacht antwoordtype van Claude");
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const rapport = JSON.parse(raw);

    if (Array.isArray(rapport?.velden?.titel?.herschrevenVersies)) {
      rapport.velden.titel.herschrevenVersies = rapport.velden.titel.herschrevenVersies.map(
        (v: { versie: string; uitleg: string }) => ({ ...v, versie: kapTitelAf(v.versie) })
      );
    }

    const sessie = global.sessies.get(sessieId);
    const email = sessie?.email || "";
    const naam = formData.hostNaam || sessie?.naam || "";
    const airbnbUrl = formData.airbnbUrl || sessie?.airbnbUrl || null;
    console.log("[Analyse] airbnbUrl uit formData:", formData.airbnbUrl, "| uit sessie:", sessie?.airbnbUrl);

    global.rapporten.set(sessieId, {
      ...rapport,
      hostNaam: naam,
      datum: new Date().toISOString(),
      email,
    });

    // Account aanmaken of vinden + rapport opslaan in Supabase
    try {
      const admin = createAdminClient();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://verhuurai.nl";

      let userId: string | null = null;
      let loginUrl: string | null = null;

      if (email) {
        const result = await getOrCreateUser(email);
        userId = result.userId;
        loginUrl = result.loginUrl;
      }

      const { data: opgeslagenRapport } = await admin.from("listing_rapporten").insert({
        sessie_id: sessieId,
        rapport_json: { ...rapport, hostNaam: naam, datum: new Date().toISOString(), email },
        host_naam: naam,
        accommodatie_naam: formData.accommodatieNaam || null,
        email,
        user_id: userId,
        airbnb_url: airbnbUrl,
      }).select().single();

      // Gecombineerde email: rapport klaar + inloglink
      if (email && opgeslagenRapport) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const rapportUrl = `${baseUrl}/dashboard/listing-rapporten/${opgeslagenRapport.id}`;
        await resend.emails.send({
          from: "Boni van Host Boni <boni@verhuurai.nl>",
          to: email,
          subject: `Je Listing Optimizer rapport is klaar! 🏠`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
                <h1 style="color:white;margin:0;font-size:22px;">🏠 Host Boni</h1>
                <p style="color:#a5b4fc;margin:8px 0 0;">Listing Optimizer Rapport</p>
              </div>
              <p>Hey ${naam}! Je rapport is klaar. Bekijk je analyse en alle herschreven teksten via de knop hieronder.</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${rapportUrl}" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">
                  Bekijk mijn rapport →
                </a>
              </div>
              ${loginUrl ? `
              <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-top:24px;">
                <p style="margin:0 0 8px;font-weight:bold;color:#1B2B4B;">📊 Je dashboard</p>
                <p style="margin:0 0 12px;color:#6b7280;font-size:14px;">We hebben automatisch een dashboard voor je aangemaakt. Log hier in om al je rapporten terug te vinden.</p>
                <a href="${loginUrl}" style="background:#1B2B4B;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
                  Inloggen op dashboard →
                </a>
              </div>` : ""}
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
                Host Boni · <a href="${baseUrl}" style="color:#9ca3af;">verhuurai.nl</a>
              </p>
            </div>`,
        });
      }
    } catch (err) {
      console.error("Supabase/email fout:", err);
    }
    if (sessie) {
      sessie.gebruiktCredits += 1;
      global.sessies.set(sessieId, sessie);
    }

    global.rapportStatus.set(sessieId, "klaar");

    return NextResponse.json({ ok: true, rapportId: sessieId });
  } catch (error) {
    console.error("Analyse fout:", error);
    if (sessieId) {
      global.rapportStatus.set(sessieId, "fout");
    }
    return NextResponse.json(
      { error: "Boni heeft even een technisch probleem. Probeer het zo nog eens!" },
      { status: 500 }
    );
  }
}
