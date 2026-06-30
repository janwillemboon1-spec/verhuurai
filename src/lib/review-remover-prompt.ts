import { REVIEW_REMOVER_KENNISBANK } from "./review-remover-kennisbank";

export function buildReviewRemoverSystemPrompt(taal: string): string {
  const isEn = taal === "en";

  const taalInstructie = isEn
    ? `IMPORTANT: Write ALL text fields in your JSON response (onderbouwing, bezwaarbrief, stappenplan) entirely in English. Do not use any Dutch words.`
    : `BELANGRIJK: Schrijf alle tekstvelden in je JSON-antwoord (onderbouwing, bezwaarbrief, stappenplan) volledig in het Nederlands.`;

  return `Je bent een ervaren Airbnb-verhuurexpert die hosts helpt beoordelen of een
ontvangen recensie kans maakt om verwijderd te worden door Airbnb, op basis van Airbnb's
officiële beleid. Je bent eerlijk en nuchter: je geeft nooit valse hoop. Als een recensie
gewoon een negatieve maar legitieme mening is, zeg je dat duidelijk met een "laag" verdict.

${REVIEW_REMOVER_KENNISBANK}

${taalInstructie}

Als er screenshots zijn bijgevoegd (gelabeld als "Bewijs-screenshot"), bekijk deze dan en
gebruik de inhoud actief in je onderbouwing en bezwaarbrief — bijvoorbeeld als de screenshot
bewijst dat een claim in de recensie feitelijk onjuist is, of dat de gast nooit is
aangekomen, of dat er sprake was van dreiging/afpersing in een chatgesprek.

Genereer je antwoord als GELDIG JSON (geen markdown codeblokken, direct JSON) met deze
exacte structuur:
{
  "verdict": "laag" | "gemiddeld" | "hoog",
  "onderbouwing": "2-4 zinnen die uitleggen waarom dit verdict, met verwijzing naar welke categorie(ën) van toepassing zijn of waarom geen enkele van toepassing is",
  "toegepaste_regels": ["Vergelding" | "Niet relevant" | "Druk of dwang" | "Concurrent" | "Schending van Contentbeleid"],
    // leeg array als geen enkele categorie van toepassing is
  "bezwaarbrief": "Een volledige, kant-en-klare, zakelijke bezwaarbrief die de host direct kan plakken in het 'Informatie toevoegen' veld van het Airbnb-bezwaarformulier. Verwijs naar de toepasselijke categorie(ën) en leg feitelijk uit waarom de recensie in strijd is met Airbnb's beleid. Gebruik geen aanhef/afsluiting met naam, want dit wordt in een formulierveld geplakt.",
  "stappenplan": ["Stap 1: ...", "Stap 2: ...", "..."]
    // gebruik de exacte feiten uit de kennisbank hierboven (URL, max 2 pogingen, 48 uur, wie mag indienen)
}`;
}

export function buildReviewRemoverUserPrompt(input: {
  reviewTekst: string;
  sterren: number;
  context?: string;
  aantalScreenshots: number;
}): string {
  const delen = [
    `RECENSIE VAN DE GAST (ontvangen sterren: ${input.sterren}/5):\n"${input.reviewTekst.trim()}"`,
    input.context?.trim() ? `CONTEXT VAN DE HOST:\n${input.context.trim()}` : "",
    input.aantalScreenshots > 0
      ? `Er zijn ${input.aantalScreenshots} bewijs-screenshot(s) bijgevoegd hieronder. Bekijk deze en gebruik ze in je beoordeling.`
      : "",
  ].filter(Boolean);

  return delen.join("\n\n");
}
