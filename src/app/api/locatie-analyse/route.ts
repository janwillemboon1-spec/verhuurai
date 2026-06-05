import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { locatie, jaar } = await request.json();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: `Je bent een expert in vakantieverhuur en toeristische markten wereldwijd.

Analyseer de verhuurmarkt voor: "${locatie}" voor het jaar ${jaar}.

Geef een gedetailleerde analyse terug als GELDIG JSON (geen markdown):

{
  "locatie": "Officiële naam van de locatie",
  "land": "Land",
  "seizoenen": {
    "1": "laag",
    "2": "laag",
    "3": "tussen",
    "4": "hoog",
    "5": "hoog",
    "6": "hoog",
    "7": "hoog",
    "8": "hoog",
    "9": "tussen",
    "10": "tussen",
    "11": "laag",
    "12": "laag"
  },
  "vakanties": [
    { "naam": "Zomervakantie", "van": "2026-07-18", "tot": "2026-08-30", "type": "vakantie" }
  ],
  "evenementen": [
    { "naam": "Naam evenement", "datum": "2026-04-27", "datumTot": null, "beschrijving": "Korte uitleg waarom dit relevant is voor verhuurders in deze markt", "type": "evenement" }
  ],
  "feestdagen": [
    { "naam": "Naam feestdag", "datum": "2026-12-25", "type": "feestdag" }
  ],
  "marktToelichting": "2-3 zinnen over de verhuurmarkt in deze regio: wanneer is het druk, wat trekt toeristen aan?"
}

REGELS:
- Seizoenen: gebruik alleen "laag", "tussen" of "hoog"
- Vakanties: alleen schoolvakanties of nationale vakantieperiodes die directe impact hebben op bezetting
- Evenementen: ALLEEN evenementen die écht relevant zijn voor toeristen in DEZE specifieke locatie. Geen generieke evenementen.
- Feestdagen: nationale én lokale feestdagen die tot hogere bezetting leiden
- datumTot: null als het een enkelvoudige dag is, anders einddatum van het evenement
- Alle datums in formaat YYYY-MM-DD voor jaar ${jaar}
- Lever minimaal 5 en maximaal 20 evenementen en feestdagen samen`,
    }],
  });

  const raw = (message.content[0] as { text: string }).text
    .replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();

  const data = JSON.parse(raw);
  return NextResponse.json({ ok: true, data });
}
