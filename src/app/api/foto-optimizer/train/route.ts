import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";
import { FOTO_CORRECTIE_PROMPT } from "@/lib/foto-optimizer/claude-analyse";

const ADMIN_EMAIL = "info@bnbassistant.com";
const MIN_FOUTEN = 3;   // minimaal 3 "Fout van Boni" voor training
const MIN_POSITIEF = 5; // minimaal 5 👍 voor training

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const adminModus = body.adminModus === true;

    // Alleen admin of automatisch
    if (adminModus) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || user.email !== ADMIN_EMAIL) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
      }
    }

    const admin = createAdminClient();

    // Huidige actieve prompt ophalen
    const { data: huidigConfig } = await admin
      .from("foto_optimizer_config")
      .select("versie, prompt, aangemaakt_op")
      .eq("actief", true)
      .order("aangemaakt_op", { ascending: false })
      .limit(1)
      .maybeSingle();

    const huidigPrompt = huidigConfig?.prompt || FOTO_CORRECTIE_PROMPT;
    const vorigeVersie = huidigConfig?.versie || 0;

    // Negatieve feedback ophalen (Fout van Boni)
    const { data: foutenData } = await admin
      .from("foto_bewerkingen")
      .select("feedback_toelichting, analyse_json, ruimte")
      .eq("feedback_type", "fout_van_boni")
      .not("feedback_toelichting", "is", null)
      .order("feedback_op", { ascending: false })
      .limit(50);

    // Positieve feedback ophalen
    const { data: positiefData } = await admin
      .from("foto_bewerkingen")
      .select("analyse_json, ruimte")
      .eq("positief_beoordeeld", true)
      .order("id", { ascending: false })
      .limit(50);

    const aantalFouten = foutenData?.length ?? 0;
    const aantalPositief = positiefData?.length ?? 0;

    // Controleer of er genoeg data is
    if (!adminModus && aantalFouten < MIN_FOUTEN && aantalPositief < MIN_POSITIEF) {
      return NextResponse.json({
        ok: false,
        reden: `Onvoldoende data: ${aantalFouten} fouten (min ${MIN_FOUTEN}), ${aantalPositief} positief (min ${MIN_POSITIEF})`,
      });
    }

    // Feedback samenvatten voor Claude
    const foutenTekst = foutenData?.map((f, i) =>
      `${i + 1}. [${f.ruimte || "onbekend"}] "${f.feedback_toelichting}"`
    ).join("\n") || "(geen negatieve feedback)";

    const positiefTekst = positiefData?.map((f, i) => {
      const prompt = (f.analyse_json as any)?.editPrompt?.slice(0, 200) || "";
      return `${i + 1}. [${f.ruimte || "onbekend"}]${prompt ? ` Prompt: "${prompt}..."` : ""}`;
    }).join("\n") || "(geen positieve feedback)";

    // Claude analyseert patronen en genereert verbeterd prompt
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const analysisResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      messages: [{
        role: "user",
        content: `Je bent een AI prompt-optimalisatie expert gespecialiseerd in vastgoedfotografie.

Analyseer de gebruikersfeedback op AI-bewerkte vakantieverhuur foto's en genereer een verbeterd systeem-prompt.

NEGATIEVE FEEDBACK (Fout van Boni — ${aantalFouten} meldingen):
${foutenTekst}

POSITIEVE VOORBEELDEN (👍 goed bewerkt — ${aantalPositief} foto's):
${positiefTekst}

HUIDIG ACTIEF PROMPT:
${huidigPrompt}

Analyseer:
1. Welke patronen zie je in de negatieve feedback? (Wat doet de AI steeds fout?)
2. Wat kenmerkt de positief beoordeelde bewerkingen?
3. Welke concrete wijzigingen moet het prompt krijgen?

Genereer een verbeterd prompt dat de geïdentificeerde problemen oplost zonder de succesvolle aspecten te verliezen.

Antwoord ALLEEN met geldig JSON (geen markdown):
{
  "samenvatting": "2-3 zinnen over wat je hebt geleerd",
  "verbeteringen": ["verbetering 1", "verbetering 2", "verbetering 3"],
  "nieuwPrompt": "het volledige verbeterde prompt in het Engels"
}`,
      }],
    });

    const rawText = analysisResponse.content[0].type === "text"
      ? analysisResponse.content[0].text.trim()
      : "";
    const clean = rawText.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    const analyse = JSON.parse(clean);

    if (!analyse.nieuwPrompt) {
      throw new Error("Claude gaf geen nieuw prompt terug");
    }

    // Vorige versies deactiveren
    await admin.from("foto_optimizer_config").update({ actief: false }).eq("actief", true);

    // Nieuwe versie opslaan en activeren
    const { data: nieuweConfig } = await admin
      .from("foto_optimizer_config")
      .insert({
        versie: vorigeVersie + 1,
        prompt: analyse.nieuwPrompt,
        analyse_samenvatting: analyse.samenvatting,
        verbeteringen: analyse.verbeteringen,
        aangemaakt_door: adminModus ? "handmatig" : "automatisch",
        actief: true,
      })
      .select("id, versie")
      .single();

    // Prompt cache leegmaken zodat volgende verwerking de nieuwe prompt pakt
    const { leegPromptCache } = await import("@/lib/foto-optimizer/claude-analyse");
    leegPromptCache();

    return NextResponse.json({
      ok: true,
      versie: nieuweConfig?.versie,
      samenvatting: analyse.samenvatting,
      verbeteringen: analyse.verbeteringen,
      aantalFouten,
      aantalPositief,
    });
  } catch (err) {
    console.error("Training fout:", err);
    return NextResponse.json({ error: "Training mislukt: " + (err instanceof Error ? err.message : "onbekend") }, { status: 500 });
  }
}
