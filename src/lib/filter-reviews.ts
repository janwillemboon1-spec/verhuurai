interface RawReview {
  createdAt: string | null;
  tekst: string;
  naam: string;
  rating?: number;
  response?: string;
}

interface FilterResultaat {
  gefilterd: RawReview[];
  aantalTotaal: number;
  filterMethode: string;
}

export function filterReviews(
  reviews: RawReview[],
  laatsteReviewCount: number,
  laatsteRapportDatum: string | null
): FilterResultaat {
  const aantalTotaal = reviews.length;

  // Eerste rapport: geen vorige data → alle reviews
  if (!laatsteRapportDatum && !laatsteReviewCount) {
    return { gefilterd: reviews, aantalTotaal, filterMethode: "alle (eerste rapport)" };
  }

  // Methode 1: filter op publicatiedatum (createdAt) als beschikbaar
  if (laatsteRapportDatum) {
    const heeftDatums = reviews.some((r) => r.createdAt && r.createdAt.length > 4);
    if (heeftDatums) {
      const grens = new Date(laatsteRapportDatum);
      const nieuw = reviews.filter((r) => {
        if (!r.createdAt) return false;
        return new Date(r.createdAt) > grens;
      });
      if (nieuw.length > 0) {
        return { gefilterd: nieuw, aantalTotaal, filterMethode: `na ${grens.toLocaleDateString("nl-NL")} (datum)` };
      }
    }
  }

  // Methode 2: count-based (meest betrouwbaar)
  if (laatsteReviewCount > 0 && aantalTotaal > laatsteReviewCount) {
    const aantalNieuw = aantalTotaal - laatsteReviewCount;
    const nieuw = reviews.slice(0, aantalNieuw); // nieuwste staan bovenaan
    return { gefilterd: nieuw, aantalTotaal, filterMethode: `${aantalNieuw} nieuwe (count-based)` };
  }

  // Geen nieuwe reviews gevonden → geef laatste 10 terug als context
  const laatste10 = reviews.slice(0, 10);
  return { gefilterd: laatste10, aantalTotaal, filterMethode: "laatste 10 (geen nieuwe gevonden)" };
}

export function formateerGefilterd(reviews: RawReview[]): string {
  return reviews.map((r, i) => {
    let tekst = `Review ${i + 1} — ${r.naam}`;
    if (r.createdAt) {
      try {
        tekst += ` · ${new Date(r.createdAt).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}`;
      } catch {}
    }
    if (r.rating) tekst += ` · ${"★".repeat(Math.min(Math.round(r.rating), 5))}`;
    tekst += `\n${r.tekst}`;
    if (r.response) tekst += `\n→ Reactie host: ${r.response}`;
    return tekst;
  }).join("\n\n---\n\n");
}
