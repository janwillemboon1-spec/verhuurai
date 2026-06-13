import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AnalyseResultaat {
  ruimte: string;
  overgeslagen: boolean;
  overslaanReden?: string;
  gebruikteUitzondering: string | null;
  editPrompt: string; // leeg bij automatische verwerking
}

export async function analyseMetClaude(
  imageBuffer: Buffer,
  _gebruikteUitzonderingen: Set<string> = new Set()
): Promise<AnalyseResultaat> {
  const base64 = imageBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
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
            text: `Identificeer het type ruimte op deze foto. Geef ALLEEN geldig JSON terug (geen markdown):

{
  "ruimte": "woonkamer|keuken|eetgedeelte|slaapkamer|badkamer|buitenruimte|exterieur|overig",
  "overgeslagen": false,
  "overslaanReden": null
}

Stel "overgeslagen" in op true ALLEEN als dit geen bruikbare ruimtefoto is (bijv. document, gezicht, wazige onbruikbare foto). Geef overslaanReden in het Nederlands.`,
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

    return {
      ruimte: result.ruimte || "overig",
      editPrompt: "",
      overgeslagen: false,
      gebruikteUitzondering: null,
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
