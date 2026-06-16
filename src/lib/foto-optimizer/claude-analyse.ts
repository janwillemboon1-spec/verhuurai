import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Module-level prompt cache (5 minuten TTL)
let promptCache: { prompt: string; geldigTot: number } | null = null;

export function leegPromptCache() {
  promptCache = null;
}

async function laadActiefPrompt(): Promise<string> {
  if (promptCache && Date.now() < promptCache.geldigTot) {
    return promptCache.prompt;
  }
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("foto_optimizer_config")
      .select("prompt")
      .eq("actief", true)
      .order("aangemaakt_op", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.prompt) {
      promptCache = { prompt: data.prompt, geldigTot: Date.now() + 5 * 60 * 1000 };
      return data.prompt;
    }
  } catch (err) {
    console.error("Prompt laden uit DB mislukt, gebruik standaard:", err);
  }
  return FOTO_CORRECTIE_PROMPT;
}

export interface AnalyseResultaat {
  ruimte: string;
  overgeslagen: boolean;
  overslaanReden?: string;
  gebruikteUitzondering: string | null;
  editPrompt: string; // leeg bij automatische verwerking
}

// Vaste correctieprompt voor gpt-image-1 — wordt programmatisch toegevoegd, nooit via Claude
export const FOTO_CORRECTIE_PROMPT = `REAL ESTATE PHOTO CORRECTION — professional post-processing only, not image generation.

Apply ONLY these technical corrections a professional photographer applies in Lightroom or Capture One:
- Orientation: straighten any tilt or rotation so the horizon is perfectly level
- Angle & perspective: correct keystone distortion so vertical lines are straight and walls do not converge
- Composition: if framing is awkward, apply a subtle crop to improve balance while keeping the room fully visible
- Exposure: correct if too dark or overexposed
- White balance: neutralize color casts (yellow, blue, green tints)
- Clarity and sharpness: slight increase for professional crispness
- Shadows/highlights: recover detail in dark or blown areas
- Noise reduction: reduce grain if visible

CRITICAL — DO NOT change any of these:
- Wall colors and textures (a grey wall stays grey, a white wall stays white)
- Furniture colors, materials, or positions
- Decorative items, artwork, or accessories
- Room layout, dimensions, or architecture
- Color temperature of existing light sources
- Any object: do not add, remove, or move anything

This is a PHOTOGRAPH CORRECTION. The output must look like the same photo taken with professional camera settings and edited by a professional real estate photographer. Same room, same furniture, same colors — just technically superior.`;

export async function analyseMetClaude(
  imageBuffer: Buffer,
  _gebruikteUitzonderingen: Set<string> = new Set()
): Promise<AnalyseResultaat> {
  const base64 = imageBuffer.toString("base64");
  const actiefPrompt = await laadActiefPrompt();

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 300,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64 },
          },
          {
            type: "text",
            text: `Analyseer deze vakantieverhuur foto. Geef ALLEEN geldig JSON terug (geen markdown, geen code blocks):

{
  "ruimte": "woonkamer|keuken|eetgedeelte|slaapkamer|badkamer|buitenruimte|exterieur|overig",
  "overgeslagen": false,
  "overslaanReden": null,
  "technischeObservatie": ""
}

Regels:
- Stel overgeslagen in op true ALLEEN als dit geen bruikbare ruimtefoto is. Geef overslaanReden in het Nederlands.
- Schrijf in technischeObservatie max 1 zin in het Engels over het meest opvallende technische gebrek van DEZE foto: bijv. "slightly underexposed" of "warm color cast" of "good exposure, minor sharpening needed". Geen aanhalingstekens gebruiken.`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  try {
    const clean = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    const result = JSON.parse(clean);

    if (result.overgeslagen) {
      return {
        ruimte: "overig",
        editPrompt: "",
        overgeslagen: true,
        overslaanReden: result.overslaanReden || "Foto niet herkenbaar als ruimte",
        gebruikteUitzondering: null,
      };
    }

    // Bouw editPrompt op: correctieprompt + foto-specifieke observatie
    const observatie = result.technischeObservatie?.trim() || "";
    const editPrompt = observatie
      ? `Correct this real estate photograph of a ${result.ruimte || "room"} — ${observatie}. ${actiefPrompt}`
      : `Correct this real estate photograph of a ${result.ruimte || "room"}. ${actiefPrompt}`;

    return {
      ruimte: result.ruimte || "overig",
      editPrompt,
      overgeslagen: false,
      gebruikteUitzondering: null,
    };
  } catch (err) {
    console.error("Claude analyse fout — standaard prompt gebruiken:", err);
    // Niet overslaan bij analysefout: gebruik standaard correctieprompt zodat de foto toch verwerkt wordt
    return {
      ruimte: "overig",
      editPrompt: `Correct this real estate photograph. ${actiefPrompt}`,
      overgeslagen: false,
      gebruikteUitzondering: null,
    };
  }
}
