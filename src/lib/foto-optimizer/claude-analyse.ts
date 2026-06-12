import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AnalyseResultaat {
  ruimte: string;
  editPrompt: string;
  overgeslagen: boolean;
  overslaanReden?: string;
}

export async function analyseMetClaude(imageBuffer: Buffer): Promise<AnalyseResultaat> {
  const base64 = imageBuffer.toString("base64");

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
  "editPrompt": ""
}

Rules:
- Set "overgeslagen": true ONLY if this is not a room photo (e.g. a document, close-up of a face, blurry unusable image). Set overslaanReden in Dutch.
- For editPrompt: write one clear English instruction. Start with "Transform this vacation rental photo of a [room type] into a 5-star hotel quality photograph:". The goal is the lighting, clarity, and professional polish seen in luxury hotel photography (Four Seasons, Marriott, Aman resorts) — achieved through technical improvements only. End with the RULES block.
- RULES block to append verbatim: "Enhancement philosophy: Achieve 5-star hotel photo quality through perfect brightness, sharpness, white balance, color accuracy, and clarity. Make the room feel bright, airy, tidy, and inviting — the way a professional hotel photographer would capture it after a housekeeper has prepared the room. ALLOWED: (1) Always correct the camera perspective to eye level — if the photo was taken from too low or too high, adjust the viewpoint to a natural standing eye-level perspective. This applies to every photo. (2) Smooth out wrinkled pillows, cushions, and bedding to look crisp and hotel-quality. (3) Remove everyday clutter — cups, bags, clothing, cables, shoes, random items left lying around — to make the room look tidy and ready for guests. (4) For outdoor photos (balcony, terrace, garden, pool, exterior) and photos showing a view through a window or from a viewpoint: make the sky blue and sunny — replace grey or overcast skies with clear blue sky and sunshine. This is ONLY allowed for outdoor photos and view photos — NEVER alter lighting or sky for indoor room photos. (5) SPECIFIC ADDITIONS ONLY — these four exceptions are the only things that may be added: [A] On kitchen counters: a wooden cutting board with a fresh tomato on it. [B] On pool sun loungers or outdoor lounge chairs: a brightly colored folded towel and/or a paperback book. [C] In bathrooms: neatly folded white towels. [D] On a coffee table in the living room: maximum 2 decorative items that suit the setting — choose from a small plant or flower, a book, a coffee mug, or a wine glass. Pick what fits the style of the room best, never more than 2 items. [E] On a balcony, terrace, or garden photo: a drink (such as a glass of wine, a cocktail, or a cold drink) may be placed on an existing table that is already visible in the photo. NEVER add a table — the table must already be there. These five exceptions only — nothing else may be added anywhere. NEVER change or move any furniture, rugs, lamps, art, or decorative accessories — all permanent room elements must remain identical. NEVER add anything outside the three exceptions above. NEVER change the room layout or composition. NEVER invent views or scenery outside windows. NEVER hide structural damage, cracks, or stains that are part of the property. The enhanced photo represents the exact same room, just perfectly prepared and photographed. Photorealistic result, not CGI."`,
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
      };
    }

    return {
      ruimte: result.ruimte || "overig",
      editPrompt: result.editPrompt || "",
      overgeslagen: false,
    };
  } catch (err) {
    console.error("Claude analyse fout:", err);
    return {
      ruimte: "overig",
      editPrompt: "",
      overgeslagen: true,
      overslaanReden: "Analyse mislukt — foto overgeslagen",
    };
  }
}
