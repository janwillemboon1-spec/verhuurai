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
- For editPrompt: write one clear English instruction. Start with "Enhance this vacation rental photo of a [room type]:". The goal is professional quality through technical improvements only. End with the RULES block.
- RULES block to append verbatim: "Enhancement philosophy: Polish brightness, sharpness, white balance, and clarity only. NEVER add furniture or objects. NEVER change the room layout. NEVER invent views or scenery outside windows. NEVER hide damage, stains, or structural issues. The enhanced photo must represent the exact same space — same furniture, same condition, same room. Photorealistic result."`,
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
