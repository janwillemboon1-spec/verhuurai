import Anthropic from "@anthropic-ai/sdk";
import { buildBoniSystemPrompt } from "@/lib/boni-prompt";
import { AnalyseFormulier } from "@/types/rapport";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

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

    const sessie = global.sessies.get(sessieId);
    const email = sessie?.email || "";
    const naam = formData.hostNaam || sessie?.naam || "";

    global.rapporten.set(sessieId, {
      ...rapport,
      hostNaam: naam,
      datum: new Date().toISOString(),
      email,
    });

    // Altijd opslaan in Supabase (ook zonder account)
    try {
      const admin = createAdminClient();
      await admin.from("listing_rapporten").insert({
        sessie_id: sessieId,
        rapport_json: { ...rapport, hostNaam: naam, datum: new Date().toISOString(), email },
        host_naam: naam,
        email,
        user_id: null,
      });
    } catch (err) {
      console.error("Supabase opslaan mislukt:", err);
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
