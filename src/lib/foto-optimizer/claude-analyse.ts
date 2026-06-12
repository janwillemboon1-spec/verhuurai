import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AnalyseResultaat {
  ruimte: string;
  editPrompt: string;
  overgeslagen: boolean;
  overslaanReden?: string;
  gebruikteUitzondering: string | null; // "A" | "B" | "C" | "D" | "E" | null
}

// gebruikteUitzonderingen: set van letters die al gebruikt zijn in eerder verwerkte foto's
export async function analyseMetClaude(
  imageBuffer: Buffer,
  gebruikteUitzonderingen: Set<string> = new Set()
): Promise<AnalyseResultaat> {
  const base64 = imageBuffer.toString("base64");

  const gebruikteLijst = ["A", "B", "C", "D", "E"]
    .filter(l => gebruikteUitzonderingen.has(l))
    .map(l => `[${l}]`)
    .join(", ");

  const uitzonderingStatus = gebruikteLijst
    ? `ALREADY USED IN THIS SESSION (do NOT apply again): ${gebruikteLijst}.`
    : "None used yet.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
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
            text: `You are analyzing a vacation rental photo.

Respond with ONLY valid JSON (no markdown, no code blocks):

{
  "ruimte": "woonkamer|keuken|eetgedeelte|slaapkamer|badkamer|buitenruimte|exterieur|overig",
  "overgeslagen": false,
  "overslaanReden": null,
  "gebruikteUitzondering": null,
  "editPrompt": ""
}

Rules:
- Set "overgeslagen": true ONLY if this is not a room photo (e.g. a document, close-up of a face, blurry unusable image). Set overslaanReden in Dutch.
- Set "gebruikteUitzondering" to the letter (A/B/C/D/E) of the conditional addition you apply, or null if none.
- For editPrompt: write one clear English instruction. Start with "Transform this vacation rental photo of a [room type] into a 5-star hotel quality photograph:". End with the RULES block below.
- RULES block to append verbatim: "Goal: 5-star hotel photo quality — the lighting, sharpness, and polish of Four Seasons or Marriott photography. ALWAYS ALLOWED: (1) Correct camera perspective to natural standing eye-level. (2) Smooth wrinkled pillows, cushions, and bedding to look hotel-crisp. (3) Remove everyday clutter (cups, bags, clothing, cables, shoes) to make the space look guest-ready. (4) Outdoor and view photos only: replace grey/overcast sky with blue sunny sky. Never alter sky for indoor photos. CONDITIONAL ADDITIONS — each exception may only be used ONCE across the entire photo session. ${uitzonderingStatus} Only apply an exception if its required surface/furniture is already visible in the photo. Items may NEVER be placed on the floor — only on existing furniture or surfaces. [A] Kitchen counter visible AND [A] not yet used → add a wooden cutting board with a fresh tomato on the counter. [B] Pool sun loungers/outdoor lounge chairs visible AND [B] not yet used → add a brightly colored folded towel and/or a book ON those loungers. [C] Bathroom visible AND [C] not yet used → add neatly folded white towels on an existing surface. [D] Coffee table visible in living room AND [D] not yet used → add max 2 items from: small plant, flower, book, coffee mug, or wine glass — what fits the style best. [E] Balcony/terrace/garden with an existing table visible AND [E] not yet used → add one drink (wine glass, cocktail, or cold drink) on that table. Never add a table. ABSOLUTE RULES: Never add furniture, lamps, or any object not listed. Never place anything on the floor. Never move or change existing furniture, rugs, art, or accessories. Never change room layout. Never invent scenery. Never hide structural damage or stains. The result must show the exact same room — perfectly prepared. Photorealistic, not CGI."`,
          },
        ],
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";

  try {
    const clean = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    console.log("Claude response:", clean.slice(0, 200));
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

    return {
      ruimte: result.ruimte || "overig",
      editPrompt: result.editPrompt || "",
      overgeslagen: false,
      gebruikteUitzondering: result.gebruikteUitzondering || null,
    };
  } catch (err) {
    console.error("Claude analyse fout:", err);
    return {
      ruimte: "overig",
      editPrompt: "",
      overgeslagen: true,
      overslaanReden: "Analyse mislukt — foto overgeslagen",
      gebruikteUitzondering: null,
    };
  }
}
