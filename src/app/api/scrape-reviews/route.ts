import { NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN;

function extractListingId(url: string): string | null {
  const match = url.match(/\/rooms\/(\d+)/);
  return match ? match[1] : null;
}

function formateerReviews(reviews: Review[]): string {
  if (!reviews || reviews.length === 0) return "";

  return reviews
    .map((r: Review, i: number) => {
      const naam = r.reviewer?.firstName || r.reviewer?.name || r.localizedName || "Gast";
      const datum = r.createdAt
        ? new Date(r.createdAt).toLocaleDateString("nl-NL", { month: "long", year: "numeric" })
        : r.date || "";
      const sterren = r.rating ? "★".repeat(Math.min(Math.round(r.rating), 5)) : "";
      let tekst = `Review ${i + 1} — ${naam}${datum ? ` · ${datum}` : ""}${sterren ? ` · ${sterren}` : ""}\n`;
      tekst += r.comments || r.reviewText || r.text || "(geen tekst)";
      if (r.response) tekst += `\n→ Reactie host: ${r.response}`;
      return tekst;
    })
    .join("\n\n---\n\n");
}

function extraheerKenmerken(reviews: Review[]): string[] {
  const tellers: Record<string, number> = {};
  const zoekWoorden = [
    "schoon", "rustig", "locatie", "centraal", "wifi", "parkeer", "uitzicht",
    "zwembad", "tuin", "terras", "balkon", "ruim", "licht", "keuken",
    "bereikbaar", "station", "centrum", "strand", "bos", "natuur",
    "werkplek", "kindvriendelijk", "clean", "quiet", "location", "central",
    "pool", "garden", "spacious", "kitchen", "beach", "view",
  ];

  for (const r of reviews) {
    const tekst = ((r.comments || "") + " " + (r.reviewText || "") + " " + (r.text || "")).toLowerCase();
    for (const woord of zoekWoorden) {
      if (tekst.includes(woord)) tellers[woord] = (tellers[woord] || 0) + 1;
    }
  }

  return Object.entries(tellers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([woord]) => woord);
}

interface Reviewer {
  firstName?: string;
  name?: string;
  localizedName?: string;
}

interface Review {
  reviewer?: Reviewer;
  createdAt?: string;
  date?: string;
  rating?: number;
  comments?: string;
  reviewText?: string;
  text?: string;
  response?: string;
  localizedName?: string;
}

interface ReviewItem {
  reviews?: Review[];
}

async function scraperViaApify(url: string): Promise<Review[]> {
  if (!APIFY_TOKEN) throw new Error("Geen Apify token");

  // Probeer met proxyConfiguration voor betere resultaten
  const runRes = await fetch(
    `https://api.apify.com/v2/acts/tri_angle~airbnb-reviews-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=90`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url }],
        maxReviews: 50,
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
      }),
    }
  );

  if (!runRes.ok) throw new Error("Scraper kon niet starten");

  const runData = await runRes.json();
  const datasetId = runData.data?.defaultDatasetId;
  if (!datasetId) throw new Error("Geen dataset");

  const dataRes = await fetch(
    `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
  );
  if (!dataRes.ok) throw new Error("Dataset ophalen mislukt");

  const items: ReviewItem[] = await dataRes.json();

  // Sommige actors geven items terug waar reviews genest zijn
  if (items.length > 0 && items[0].reviews) {
    return items[0].reviews;
  }

  // Andere actors geven elke review als los item
  if (items.length > 0 && !items[0].reviews) {
    return items as unknown as Review[];
  }

  return [];
}

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || !url.includes("airbnb")) {
      return NextResponse.json({ error: "Geen geldige Airbnb URL" }, { status: 400 });
    }

    const listingId = extractListingId(url);
    if (!listingId) {
      return NextResponse.json({ error: "Kon geen listing ID vinden in de URL" }, { status: 400 });
    }

    let reviews: Review[] = [];
    let methode = "scraper";

    try {
      reviews = await scraperViaApify(url);
      methode = "apify";
    } catch (err) {
      console.warn("Apify scraper mislukt:", err);
    }

    if (reviews.length === 0) {
      return NextResponse.json({
        ok: false,
        error:
          "Airbnb blokkeert automatisch scrapen zonder betaalde proxies. " +
          "Kopieer je reviews handmatig vanuit je Airbnb-advertentie en plak ze in het tekstveld.",
        suggestie: `Je listing ID is: ${listingId}. Ga naar airbnb.com/rooms/${listingId} en kopieer de reviews.`,
        methode,
      }, { status: 422 });
    }

    const recensiesTekst = formateerReviews(reviews);
    const kenmerken = extraheerKenmerken(reviews);

    return NextResponse.json({
      ok: true,
      recensies: recensiesTekst,
      aantalReviews: reviews.length,
      veelgenoemdeKenmerken: kenmerken,
      methode,
    });
  } catch (error) {
    console.error("Scrape reviews fout:", error);
    return NextResponse.json(
      { error: "Er ging iets mis bij het ophalen van de reviews" },
      { status: 500 }
    );
  }
}
