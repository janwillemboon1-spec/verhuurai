import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AnalyseResultaat {
  ruimte: string;
  criteria: Record<string, boolean>;
  editPrompt: string;
  overgeslagen: boolean;
  overslaanReden?: string;
}

const STAGING_PER_RUIMTE: Record<string, string> = {
  woonkamer: "a tasteful throw blanket over the sofa, a coffee table book, a small vase with fresh flowers, decorative scatter cushions",
  keuken: "a bowl of fresh fruit on the counter, a wooden cutting board, a coffee machine, fresh herbs in a small pot",
  eetgedeelte: "a simple table runner, place settings with plates and glasses, a small floral centerpiece",
  slaapkamer: "crisp hotel-quality bedding, two decorative throw pillows, a small book and reading lamp on the nightstand, a folded throw blanket at the foot of the bed",
  badkamer: "neatly folded white towels, a scented candle, a small green plant, a elegant soap dispenser",
  buitenruimte: "colorful outdoor cushions on furniture, potted plants or flowers, a lantern or string lights",
  exterieur: "a well-maintained entrance, clear pathway, potted plants near the door",
  overig: "simple tasteful decor elements appropriate for the space",
};

export async function analyseMetClaude(imageBuffer: Buffer): Promise<AnalyseResultaat> {
  const base64 = imageBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
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
            text: `You are a professional real estate photography expert analyzing a vacation rental photo.

Analyze this photo and respond with ONLY valid JSON (no markdown, no code blocks, no explanation):

{
  "ruimte": "woonkamer|keuken|eetgedeelte|slaapkamer|badkamer|buitenruimte|exterieur|overig",
  "overgeslagen": false,
  "overslaanReden": null,
  "criteria": {
    "orientatie": true,
    "hoek": true,
    "compositie": true,
    "kleur": true,
    "rommel": true,
    "belichting": true,
    "rimpels": true,
    "enscenering": true,
    "opschaling": true,
    "lucht": true
  },
  "editPrompt": ""
}

Criteria meanings (true = already good, false = needs improvement):
- orientatie: photo is correctly oriented (not rotated/upside down)
- hoek: camera angle and perspective are good (straight walls, no keystone distortion)
- compositie: composition is well-framed (rule of thirds, good cropping)
- kleur: colors and white balance look natural and correct
- rommel: room is clean and clutter-free
- belichting: lighting is bright, even, and welcoming
- rimpels: no visible wrinkles in bedding/curtains/fabric (set true if not applicable)
- enscenering: room has good staging/styling with tasteful accessories
- opschaling: image is sharp and high-resolution (not blurry or low-res)
- lucht: sky is blue and clear (set true if not an outdoor/exterior photo)

Rules:
- Set "overgeslagen": true ONLY if this cannot be identified as an interior/exterior room photo (e.g. a document, portrait, abstract close-up, or completely unusable photo). Set overslaanReden to a brief Dutch explanation.
- For editPrompt: write a detailed English instruction for an AI image editor. Start with "Professional Airbnb listing photo of a [room type]:". Address ONLY the issues where criteria are false. Be specific about what to fix and what staging items to add. Always end with: "Preserve all existing furniture, architecture, and room layout. Photorealistic result."
- If ALL criteria are already true and room already looks professional, write editPrompt as: "Enhance this professional [room type] photo subtly: slightly increase brightness and warmth, enhance colors minimally. Keep everything exactly as is. Photorealistic result."`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  try {
    // Strip any accidental markdown code fences
    const clean = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    const result = JSON.parse(clean);

    if (result.overgeslagen) {
      return {
        ruimte: "overig",
        criteria: {},
        editPrompt: "",
        overgeslagen: true,
        overslaanReden: result.overslaanReden || "Foto niet herkenbaar als ruimte",
      };
    }

    return {
      ruimte: result.ruimte || "overig",
      criteria: result.criteria || {},
      editPrompt: result.editPrompt || "",
      overgeslagen: false,
    };
  } catch {
    return {
      ruimte: "overig",
      criteria: {},
      editPrompt: "",
      overgeslagen: true,
      overslaanReden: "Analyse mislukt — foto overgeslagen",
    };
  }
}
