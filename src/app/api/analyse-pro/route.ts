import Anthropic from "@anthropic-ai/sdk";
import { buildBoniSystemPrompt } from "@/lib/boni-prompt";
import { AnalyseFormulier } from "@/types/rapport";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateUser } from "@/lib/supabase/get-or-create-user";
import { Resend } from "resend";
import { NextResponse } from "next/server";

const APIFY_TOKEN = process.env.APIFY_TOKEN;

declare global {
  var sessies: Map<string, any>;
  var rapporten: Map<string, any>;
  var rapportStatus: Map<string, "verwerking" | "klaar" | "fout">;
}
if (!global.sessies) global.sessies = new Map();
if (!global.rapporten) global.rapporten = new Map();
if (!global.rapportStatus) global.rapportStatus = new Map();

function naarComUrl(url: string): string {
  return url.replace(/airbnb\.[a-z]{2,3}\//, "airbnb.com/");
}

// ── Browser-headers voor directe HTML-fetch ───────────────────────────────────

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "nl-NL,nl;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Sec-Ch-Ua": '"Chromium";v="124","Google Chrome";v="124"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Upgrade-Insecure-Requests": "1",
};

// ── JSON-extractors ───────────────────────────────────────────────────────────

// Zoek recursief naar een object dat eruitziet als een Airbnb-listing
function vindListingObject(obj: any, diepte = 0): Record<string, any> | null {
  if (diepte > 10 || !obj || typeof obj !== "object" || Array.isArray(obj)) return null;

  // Dit object ziet eruit als een listing
  if (
    typeof obj.name === "string" && obj.name.length > 3 &&
    (typeof obj.description === "string" || typeof obj.htmlDescription === "object") &&
    (obj.amenities || obj.houseRules || obj.host || obj.personCapacity || obj.roomType)
  ) {
    return obj;
  }

  // Bekende paden eerst (sneller)
  const prioriteit = ["listing", "listingInfo", "pdpData", "homePDP", "roomDetails", "sections"];
  for (const key of prioriteit) {
    if (obj[key]) {
      const r = vindListingObject(obj[key], diepte + 1);
      if (r) return r;
    }
  }

  // Rest van de keys
  for (const key of Object.keys(obj)) {
    if (prioriteit.includes(key)) continue;
    const r = vindListingObject(obj[key], diepte + 1);
    if (r) return r;
  }

  return null;
}

// Extraheer tekst uit Airbnb's htmlDescription object {htmlText: "..."}
function htmlNaarTekst(val: any): string {
  if (!val) return "";
  if (typeof val === "string") return val;
  if (typeof val === "object") {
    return val.htmlText ?? val.translatedText ?? val.description ?? val.value ?? "";
  }
  return "";
}

// Zoek diep in een groot JSON-object naar een string-waarde via meerdere sleutelnames
function diepZoek(obj: any, sleutels: string[], diepte = 0): string {
  if (diepte > 8 || !obj || typeof obj !== "object") return "";
  for (const k of sleutels) {
    if (obj[k]) {
      const v = htmlNaarTekst(obj[k]);
      if (v) return v;
    }
  }
  for (const k of Object.keys(obj)) {
    if (Array.isArray(obj[k])) {
      for (const item of obj[k]) {
        const r = diepZoek(item, sleutels, diepte + 1);
        if (r) return r;
      }
    } else {
      const r = diepZoek(obj[k], sleutels, diepte + 1);
      if (r) return r;
    }
  }
  return "";
}

// Verzamel amenities uit geneste sectie-data
function vindAmenities(obj: any, diepte = 0): string[] {
  if (diepte > 8 || !obj || typeof obj !== "object") return [];
  const resultaten: string[] = [];

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (typeof item === "string") resultaten.push(item);
      else if (item?.name && typeof item.name === "string") resultaten.push(item.name);
      else if (item?.title && typeof item.title === "string") resultaten.push(item.title);
      else resultaten.push(...vindAmenities(item, diepte + 1));
    }
    return resultaten;
  }

  for (const k of ["amenities", "seeAllAmenitiesGroups", "previewAmenitiesGroups", "amenitiesGroups"]) {
    if (obj[k]) return vindAmenities(obj[k], diepte + 1);
  }

  for (const k of Object.keys(obj)) {
    resultaten.push(...vindAmenities(obj[k], diepte + 1));
  }

  return resultaten.filter(Boolean);
}

// ── HTML ophalen en parsen ────────────────────────────────────────────────────

async function scraapListingHtml(url: string): Promise<Record<string, any> | null> {
  const comUrl = naarComUrl(url);
  console.log("[Pro HTML] Ophalen:", comUrl);

  try {
    const res = await fetch(comUrl, { headers: BROWSER_HEADERS });
    console.log("[Pro HTML] HTTP status:", res.status);
    if (!res.ok) return null;

    const html = await res.text();
    console.log("[Pro HTML] HTML-lengte:", html.length);

    // Strategie 1: __NEXT_DATA__
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch?.[1]) {
      try {
        const data = JSON.parse(nextDataMatch[1]);
        const listing = vindListingObject(data?.props ?? data);
        if (listing) {
          console.log("[Pro HTML] Listing via __NEXT_DATA__, velden:", Object.keys(listing).slice(0, 12));
          return { ...listing, _bron: "next_data" };
        }
      } catch (e) {
        console.error("[Pro HTML] __NEXT_DATA__ parse-fout:", e);
      }
    }

    // Strategie 2: niobeMinimalClientData (nieuwere Airbnb-pagina's)
    const niobeMatch = html.match(/niobeMinimalClientData\s*=\s*(\[[\s\S]*?\]);/);
    if (niobeMatch?.[1]) {
      try {
        const data = JSON.parse(niobeMatch[1]);
        const listing = vindListingObject(data);
        if (listing) {
          console.log("[Pro HTML] Listing via niobeMinimalClientData, velden:", Object.keys(listing).slice(0, 12));
          return { ...listing, _bron: "niobe" };
        }
      } catch {}
    }

    // Strategie 3: alle application/json script-tags
    const scriptRegex = /<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g;
    let scriptMatch;
    let pogingNr = 0;
    while ((scriptMatch = scriptRegex.exec(html)) !== null && pogingNr < 20) {
      pogingNr++;
      try {
        const data = JSON.parse(scriptMatch[1]);
        const listing = vindListingObject(data);
        if (listing) {
          console.log("[Pro HTML] Listing via JSON script-tag #" + pogingNr + ", velden:", Object.keys(listing).slice(0, 12));
          return { ...listing, _bron: "json_script" };
        }
      } catch {}
    }

    // Strategie 4: OG-metatags als minimale fallback
    const metaData = extractMetaTags(html);
    if (metaData?.name) {
      console.log("[Pro HTML] Alleen OG-metatags gevonden");
      return { ...metaData, _bron: "meta_only" };
    }

    console.error("[Pro HTML] Geen listing-data gevonden in HTML");
    return null;
  } catch (err) {
    console.error("[Pro HTML] Fetch-fout:", err);
    return null;
  }
}

function extractMetaTags(html: string): Record<string, any> | null {
  const get = (property: string) =>
    html.match(new RegExp(`<meta[^>]*property="${property}"[^>]*content="([^"]*)"`))?.[1] ??
    html.match(new RegExp(`<meta[^>]*content="([^"]*)"[^>]*property="${property}"`))?.[1] ?? "";

  const name = get("og:title");
  if (!name) return null;
  return {
    name,
    description: get("og:description"),
  };
}

// ── Apify reviews scrapen (bestaande, ongewijzigd) ────────────────────────────

async function scraapReviews(url: string): Promise<string> {
  if (!APIFY_TOKEN) return "";
  try {
    const runRes = await fetch(
      `https://api.apify.com/v2/acts/tri_angle~airbnb-reviews-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=90`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startUrls: [{ url }],
          maxReviews: 50,
          proxyConfiguration: { useApifyProxy: true },
        }),
      }
    );
    if (!runRes.ok) return "";
    const runData = await runRes.json();
    const datasetId = runData.data?.defaultDatasetId;
    if (!datasetId) return "";
    const dataRes = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`);
    if (!dataRes.ok) return "";
    const items = await dataRes.json();
    const reviews = (items?.[0]?.reviews ?? items) as any[];
    if (!reviews?.length) return "";
    return reviews.slice(0, 50).map((r: any, i: number) => {
      const naam = r.reviewer?.firstName || r.reviewer?.name || "Gast";
      const datum = r.createdAt ? new Date(r.createdAt).toLocaleDateString("nl-NL", { month: "long", year: "numeric" }) : r.date || "";
      const sterren = r.rating ? "★".repeat(Math.min(Math.round(r.rating), 5)) : "";
      let tekst = `Review ${i + 1} — ${naam}${datum ? ` · ${datum}` : ""}${sterren ? ` · ${sterren}` : ""}\n`;
      tekst += r.comments || r.reviewText || r.text || "(geen tekst)";
      if (r.response) tekst += `\n→ Reactie host: ${r.response}`;
      return tekst;
    }).join("\n\n---\n\n");
  } catch {
    return "";
  }
}

// ── Listing-data → AnalyseFormulier ──────────────────────────────────────────

function mapNaarFormulier(listing: Record<string, any>, naam: string, recensies: string): AnalyseFormulier {
  // Amenities: probeer meerdere bronnen
  const amenitiesRaw: any[] = listing.amenities ?? listing.amenityIds ?? [];
  let voorzieningen = amenitiesRaw
    .map((a: any) => (typeof a === "string" ? a : a.name ?? a.title ?? ""))
    .filter(Boolean)
    .join(", ");

  // Als amenities leeg zijn, zoek diep in het object
  if (!voorzieningen) {
    const gevonden = vindAmenities(listing);
    voorzieningen = [...new Set(gevonden)].slice(0, 50).join(", ");
  }

  // Huisregels
  const huisregelsRaw = listing.houseRules ?? listing.house_rules ?? "";
  const huisregels = Array.isArray(huisregelsRaw)
    ? huisregelsRaw.map((r: any) => (typeof r === "string" ? r : r.title ?? r.body ?? "")).filter(Boolean).join("\n")
    : String(huisregelsRaw);

  // Annuleringsbeleid
  const annulering =
    listing.cancellationPolicy ?? listing.cancellation_policy ??
    listing.cancellationPolicies?.[0]?.policyName ?? "";

  // Prijs
  const prijs = listing.price?.rate ?? listing.pricing?.rate?.amount ?? listing.priceString ?? undefined;

  // Host
  const host = listing.host ?? listing.primaryHost ?? {};
  const hostNaamScrape = host.name ?? host.firstName ?? host.hostName ?? "";
  const hostProfiel = htmlNaarTekst(host.about ?? host.description ?? host.hostAbout ?? "");

  // Stad + land
  const stad = listing.city ?? listing.address?.city ?? listing.location?.city ?? "";
  const land = listing.country ?? listing.address?.country ?? listing.location?.country ?? "Nederland";
  const rating = listing.rating ?? listing.starRating ?? undefined;

  // Velden met diep zoeken als direct niet beschikbaar
  const beschrijving = htmlNaarTekst(listing.description ?? listing.summary ?? "") ||
    diepZoek(listing, ["description", "htmlDescription", "summary", "aboutThisListing"]);

  const accommodatie = htmlNaarTekst(listing.space ?? listing.spaceDescription ?? listing.the_space ?? "") ||
    diepZoek(listing, ["space", "spaceDescription", "the_space", "roomOverview"]);

  const toegang = htmlNaarTekst(listing.access ?? listing.guestAccess ?? listing.guest_access ?? "") ||
    diepZoek(listing, ["access", "guestAccess", "guest_access"]);

  const interactie = htmlNaarTekst(listing.interaction ?? listing.interactionWithGuests ?? "") ||
    diepZoek(listing, ["interaction", "interactionWithGuests", "interaction_with_guests"]);

  const andereInfo = htmlNaarTekst(listing.notes ?? listing.otherNotes ?? listing.other_notes ?? "") ||
    diepZoek(listing, ["notes", "otherNotes", "other_notes", "additionalHouseRules"]);

  const buurt = htmlNaarTekst(listing.neighborhoodOverview ?? listing.neighborhood_overview ?? "") ||
    diepZoek(listing, ["neighborhoodOverview", "neighborhood_overview", "neighborhoodDescription"]);

  const vervoer = htmlNaarTekst(listing.transit ?? listing.transitInformation ?? "") ||
    diepZoek(listing, ["transit", "transitInformation", "transit_information", "gettingAround"]);

  return {
    hostNaam: naam,
    rapportTaal: "nl",
    woningType: listing.roomType ?? listing.room_type ?? listing.propertyType ?? "Woning",
    doelgroep: ["couples", "families"],
    land,
    stad,
    prijsPerNacht: prijs ? Number(prijs) : undefined,
    bezettingsgraad: rating ? Math.round(rating * 10) : undefined,
    airbnbUrl: listing.url ?? listing.listingUrl ?? undefined,
    titel: listing.name ?? listing.title ?? "",
    beschrijving,
    accommodatie,
    toegang,
    interactie,
    andereInfo,
    voorzieningen,
    buurt,
    vervoer,
    recensies,
    hostProfiel: hostProfiel || (hostNaamScrape ? `Host: ${hostNaamScrape}` : ""),
    huisregels,
    directBoeken: undefined,
    annuleringsbeleid: String(annulering),
  };
}

// ── Hoofdroute ────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let sessieId = "";
  try {
    const { sessieId: sid } = await request.json();
    sessieId = sid;

    if (!sessieId) return NextResponse.json({ error: "sessieId is verplicht" }, { status: 400 });

    const sessie = global.sessies.get(sessieId);
    if (!sessie) return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });

    const { naam, email, airbnbUrl } = sessie;
    global.rapportStatus.set(sessieId, "verwerking");

    // HTML-scrape listing + Apify reviews parallel
    const [listing, recensies] = await Promise.all([
      scraapListingHtml(airbnbUrl),
      scraapReviews(airbnbUrl),
    ]);

    if (!listing) {
      console.error("[Pro] Listing null na HTML-scrape voor:", airbnbUrl);
      global.rapportStatus.set(sessieId, "fout");
      return NextResponse.json(
        { error: "Airbnb advertentie kon niet worden opgehaald. Probeer de standaard Listing Optimizer." },
        { status: 422 }
      );
    }

    console.log("[Pro] Listing opgehaald via:", listing._bron, "| titel:", listing.name?.slice(0, 50));

    const formData: AnalyseFormulier = mapNaarFormulier(listing, naam, recensies);

    // Claude analyse
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const userTextContent = `
Hier is de volledige Airbnb-advertentie van ${formData.hostNaam} om te analyseren:

**Titel:** ${formData.titel || "(niet ingevuld)"}${formData.titel ? ` [exacte tekenlengte: ${formData.titel.length}]` : ""}

**Beschrijving:** ${formData.beschrijving || "(niet ingevuld)"}

**Accommodatie:** ${formData.accommodatie || "(niet ingevuld)"}

**Toegang:** ${formData.toegang || "(niet ingevuld)"}

**Interactie met gasten:** ${formData.interactie || "(niet ingevuld)"}

**Andere info:** ${formData.andereInfo || "(niet ingevuld)"}

**Voorzieningen:** ${formData.voorzieningen || "(niet ingevuld)"}

**Buurt:** ${formData.buurt || "(niet ingevuld)"}

**Vervoer:** ${formData.vervoer || "(niet ingevuld)"}

**Recensies:** ${formData.recensies || "(niet ingevuld)"}

**Host profiel:** ${formData.hostProfiel || "(niet ingevuld)"}

**Huisregels:** ${formData.huisregels || "(niet ingevuld)"}

**Direct boeken:** (niet ingevuld)

**Annuleringsbeleid:** ${formData.annuleringsbeleid || "(niet ingevuld)"}
    `.trim();

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      system: buildBoniSystemPrompt(formData),
      messages: [{ role: "user", content: userTextContent }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Onverwacht antwoordtype");

    const raw = content.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const rapport = JSON.parse(raw);

    // Titellengte server-side afdwingen
    if (Array.isArray(rapport?.velden?.titel?.herschrevenVersies)) {
      rapport.velden.titel.herschrevenVersies = rapport.velden.titel.herschrevenVersies.map(
        (v: { versie: string; uitleg: string }) => {
          const versie = v.versie.length <= 50 ? v.versie : (() => {
            const afgekapt = v.versie.slice(0, 50);
            const lastSpace = afgekapt.lastIndexOf(" ");
            return lastSpace > 30 ? afgekapt.slice(0, lastSpace).trimEnd() : afgekapt.trimEnd();
          })();
          return { ...v, versie };
        }
      );
    }

    global.rapporten.set(sessieId, { ...rapport, hostNaam: naam, datum: new Date().toISOString(), email, isPro: true });

    // Opslaan + email
    try {
      const admin = createAdminClient();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://verhuurai.nl";
      let userId: string | null = null;
      let loginUrl: string | null = null;
      if (email) {
        const result = await getOrCreateUser(email);
        userId = result.userId;
        loginUrl = result.loginUrl;
      }
      const { data: opgeslagenRapport } = await admin.from("listing_rapporten").insert({
        sessie_id: sessieId,
        rapport_json: { ...rapport, hostNaam: naam, datum: new Date().toISOString(), email, isPro: true },
        host_naam: naam,
        email,
        user_id: userId,
        airbnb_url: airbnbUrl,
        is_pro: true,
      }).select().single();

      if (email && opgeslagenRapport) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const rapportUrl = `${baseUrl}/rapport-pro/${sessieId}`;
        await resend.emails.send({
          from: "Boni van VerhuurAI <boni@verhuurai.nl>",
          to: email,
          subject: `Je Listing Optimizer Pro rapport is klaar! 🏠`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
              <h1 style="color:white;margin:0;font-size:22px;">🏠 VerhuurAI</h1>
              <p style="color:#a5b4fc;margin:8px 0 0;">Listing Optimizer Pro Rapport</p>
            </div>
            <p>Hey ${naam}! Boni heeft jouw advertentie automatisch opgehaald en geanalyseerd. Bekijk je rapport:</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${rapportUrl}" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">Bekijk mijn Pro rapport →</a>
            </div>
            ${loginUrl ? `<div style="background:#f9fafb;border-radius:12px;padding:20px;margin-top:24px;">
              <p style="margin:0 0 8px;font-weight:bold;color:#1B2B4B;">📊 Je dashboard</p>
              <a href="${loginUrl}" style="background:#1B2B4B;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">Inloggen →</a>
            </div>` : ""}
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">VerhuurAI · <a href="${baseUrl}" style="color:#9ca3af;">verhuurai.nl</a></p>
          </div>`,
        });
      }
    } catch (err) {
      console.error("[Pro] Supabase/email fout:", err);
    }

    global.rapportStatus.set(sessieId, "klaar");
    return NextResponse.json({ ok: true, rapportId: sessieId });
  } catch (error) {
    console.error("[Pro] Analyse fout:", error);
    if (sessieId) global.rapportStatus.set(sessieId, "fout");
    return NextResponse.json(
      { error: "Boni heeft even een technisch probleem. Probeer het zo nog eens!" },
      { status: 500 }
    );
  }
}
