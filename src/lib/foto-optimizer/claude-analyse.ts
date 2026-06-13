import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AnalyseResultaat {
  ruimte: string;
  editPrompt: string;
  overgeslagen: boolean;
  overslaanReden?: string;
  gebruikteUitzondering: string | null;
}

const OPENAI_REGELS = `
ROLE: World-class real estate photographer, image editor and hospitality marketer specialized in luxury vacation rentals, Airbnb Plus, Airbnb Luxe, boutique hotels and premium accommodations.

GOAL: Optimize this photo for maximum appeal to potential guests, more trust and higher booking conversion.

CRITICAL RULES — NEVER VIOLATE:
- Never add furniture, decoration, plants, lighting, artwork, appliances, accessories, architectural elements, windows, doors or views
- Never remove existing objects
- Never move existing objects
- Never change the room layout or architecture
- Never change the actual size of spaces
- Never apply virtual staging
- Never generate elements not present in the original photo
- If an improvement is only possible by violating these rules, do NOT make that improvement
- It is more important to represent the property realistically than to make the photo look better

QUALITY OPTIMIZATION — bring to professional real estate photography level:
- Increase detail rendering
- Improve textures of wood, stone, glass, metal and textile
- Correct white balance
- Improve dynamic range
- Reduce noise
- Remove compression artifacts
- Improve sharpness naturally
- Maintain photorealistic appearance
- Avoid over-processing and HDR exaggeration

LIGHT AND COLORS:
- Use bright, natural light
- Make dark spaces inviting and light
- Maintain natural shadows
- Avoid blown-out highlights
- Correct color casts
- Use fresh, neutral colors
- Avoid oversaturation
- Make whites look clean and bright
- Make wood, stone and fabrics look natural
- Target: fresh, luxurious and well-maintained appearance

PERSPECTIVE AND SPATIALITY:
- Correct lens distortion
- Correct perspective
- Ensure vertical lines are straight
- Ensure walls look natural
- Improve spatial experience without changing dimensions
- Make the space look open and professional
- Maintain realistic proportions

COMPOSITION AND FORMAT:
- Horizontal (landscape) presentation, 3:2 ratio preferred
- Keep the space central in frame
- Avoid aggressive crops
- Show as much of the space as possible
- Maintain natural wide-angle appearance

HOSPITALITY STANDARD — the photo must radiate:
Clean • Luxurious • Professional • Well-maintained • Welcoming • Premium • Trustworthy

Comparable to: Airbnb Plus, Airbnb Luxe, boutique hotels, luxury vacation properties.

AVOID: extra furniture, virtual staging, fake plants, fake lighting, CGI appearance, artificial objects, fantasy elements, doubled objects, changed layout, changed architecture, unrealistic luxury additions, excessive HDR, oversaturation, cartoon effects, AI artifacts, plastic textures, unnatural colors.

QUALITY CHECK before generating — ensure NO to all:
1. Were objects added?
2. Were objects removed?
3. Were objects moved?
4. Was architecture changed?
5. Was layout changed?
6. Were dimensions changed?
7. Is the photo still a realistic representation?

FINAL GOAL: Transform to professional 5-star real estate photography that generates more clicks, more trust and more bookings — while representing the accommodation fully honestly and realistically.
`.trim();

export async function analyseMetClaude(
  imageBuffer: Buffer,
  gebruikteUitzonderingen: Set<string> = new Set()
): Promise<AnalyseResultaat> {
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
            text: `Analyseer deze vakantieverhuur foto en geef een JSON-antwoord terug (GEEN markdown, GEEN code blocks):

{
  "ruimte": "woonkamer|keuken|eetgedeelte|slaapkamer|badkamer|buitenruimte|exterieur|overig",
  "overgeslagen": false,
  "overslaanReden": null,
  "gebruikteUitzondering": null,
  "editPrompt": ""
}

Regels:
- Stel "overgeslagen" in op true ALLEEN als dit geen bruikbare ruimtefoto is (bijv. document, gezicht, volledig wazige foto). Geef overslaanReden in het Nederlands.
- Schrijf in editPrompt een BESCHRIJVENDE Engelstalige prompt (1-2 zinnen) voor een AI diffusion model. Beschrijf hoe de IDEALE versie van deze foto eruitziet. Begin altijd met "Professional luxury real estate photograph of a [room type],". Voeg toe wat specifiek beter kan op DEZE foto: bijv. "bright and airy", "perfect white balance", "crisp sharp details", "warm natural lighting". Gebruik nooit instructiezinnen zoals "fix" of "improve" — alleen beschrijvingen. Geen aanhalingstekens in de tekst gebruiken.`,
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

    // Voeg de standaard fotografieregels programmatisch toe (niet via Claude, om JSON-breken te voorkomen)
    const basePrompt = result.editPrompt || `Optimize this vacation rental photo of a ${result.ruimte || "room"}:`;
    const volledigPrompt = `${basePrompt}\n\n${OPENAI_REGELS}`;

    return {
      ruimte: result.ruimte || "overig",
      editPrompt: volledigPrompt,
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
