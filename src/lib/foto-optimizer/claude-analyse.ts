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
    max_tokens: 512,
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
- RULES block to append verbatim: "Enhancement philosophy: Achieve 5-star hotel photo quality through perfect brightness, sharpness, white balance, color accuracy, and clarity. Make the room feel bright, airy, and inviting — the way a professional hotel photographer would capture it. NEVER add furniture, objects, or decorations. NEVER change the room layout or composition. NEVER invent views or scenery outside windows. NEVER hide damage, stains, or structural issues. The enhanced photo must represent the exact same space — same furniture, same condition, same room — just captured at its absolute best. Photorealistic result, not CGI."`,
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
      };
    }

    return {
      ruimte: result.ruimte || "overig",
      editPrompt: result.editPrompt || "",
      overgeslagen: false,
    };
  } catch {
    return {
      ruimte: "overig",
      editPrompt: "",
      overgeslagen: true,
      overslaanReden: "Analyse mislukt — foto overgeslagen",
    };
  }
}
