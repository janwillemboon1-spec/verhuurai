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

// ── HTML-tekst hulpfuncties ───────────────────────────────────────────────────

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function htmlTekst(obj: any): string {
  if (!obj) return "";
  if (typeof obj === "string") return stripHtml(obj);
  if (obj.htmlText) return stripHtml(obj.htmlText);
  if (obj.html?.htmlText) return stripHtml(obj.html.htmlText);
  if (obj.translatedText) return stripHtml(obj.translatedText);
  return "";
}

// ── Sections zoeken en mappen ─────────────────────────────────────────────────

function vindSections(obj: any, diepte = 0): any[] | null {
  if (diepte > 8 || !obj || typeof obj !== "object") return null;
  if (Array.isArray(obj)) {
    if (obj.length > 0 && obj[0]?.sectionComponentType) return obj;
    for (const item of obj) {
      const r = vindSections(item, diepte + 1);
      if (r) return r;
    }
    return null;
  }
  for (const k of Object.keys(obj)) {
    const r = vindSections(obj[k], diepte + 1);
    if (r) return r;
  }
  return null;
}

function bouwSectieMap(sections: any[]): Record<string, any> {
  const map: Record<string, any> = {};
  for (const container of sections) {
    const type = container.sectionComponentType;
    if (type && container.section) {
      map[type] = container.section;
    }
  }
  return map;
}

// ── Veld-extractors ───────────────────────────────────────────────────────────

function extractBeschrijving(s: Record<string, any>): string {
  return htmlTekst(s.DESCRIPTION_DEFAULT?.htmlDescription) || "";
}

function extractDescriptionModalItems(s: Record<string, any>): string[] {
  const items: any[] = s.PDP_DESCRIPTION_MODAL?.items ?? [];
  return items.map((item: any) => {
    const title = item.anchor?.title || item.title || "";
    const tekst = htmlTekst(item.html || item.htmlDescription || item.content || "");
    return tekst ? `${title ? title + "\n" : ""}${tekst}` : "";
  });
}

function extractBuurtEnVervoer(s: Record<string, any>): { buurt: string; vervoer: string } {
  const loc = s.LOCATION_PDP;
  if (!loc) return { buurt: "", vervoer: "" };

  const formatDetails = (details: any[]): string =>
    (details ?? []).map((d: any) => {
      const title = d.title || "";
      const content = htmlTekst(d.content || "");
      const items = (d.items ?? []).map((i: any) => htmlTekst(i.title || i.content || i)).filter(Boolean).join(", ");
      return [title, content, items].filter(Boolean).join(": ");
    }).filter(Boolean).join("\n");

  const alle = formatDetails([...(loc.previewLocationDetails ?? []), ...(loc.seeAllLocationDetails ?? [])]);

  // Vervoer staat typisch in een item met "Getting around" of "Vervoer" als titel
  const vervoerItem = [...(loc.previewLocationDetails ?? []), ...(loc.seeAllLocationDetails ?? [])]
    .find((d: any) => {
      const t = (d.title || "").toLowerCase();
      return t.includes("vervoer") || t.includes("getting around") || t.includes("transit") || t.includes("transport");
    });

  const vervoer = vervoerItem
    ? formatDetails([vervoerItem])
    : "";

  const buurtItems = [...(loc.previewLocationDetails ?? []), ...(loc.seeAllLocationDetails ?? [])]
    .filter((d: any) => {
      const t = (d.title || "").toLowerCase();
      return !t.includes("vervoer") && !t.includes("getting around") && !t.includes("transit");
    });

  return {
    buurt: formatDetails(buurtItems) || alle,
    vervoer,
  };
}

function extractHuisregels(s: Record<string, any>): string {
  const pol = s.POLICIES_DEFAULT;
  if (!pol) return "";
  const regels: string[] = [];

  if (Array.isArray(pol.houseRules)) {
    regels.push(...pol.houseRules.map((r: any) => r.title || "").filter(Boolean));
  }
  if (Array.isArray(pol.houseRulesSections)) {
    for (const sect of pol.houseRulesSections) {
      if (sect.title) regels.push(`\n${sect.title}:`);
      if (Array.isArray(sect.items)) {
        regels.push(...sect.items.map((i: any) => `• ${i.title || ""}`).filter(Boolean));
      }
    }
  }
  return regels.join("\n");
}

function extractVoorzieningen(s: Record<string, any>, volledigData: any): string {
  // Zoek recursief naar een array met amenity-objecten (name of title + icon)
  const zoek = (obj: any, diepte = 0): string[] => {
    if (diepte > 8 || !obj || typeof obj !== "object") return [];
    if (Array.isArray(obj)) {
      const namen = obj
        .map((a: any) => (typeof a === "string" ? a : a.name || a.title || a.localizedName || ""))
        .filter((n: string) => n.length > 1 && n.length < 80);
      if (namen.length >= 3) return namen;
      for (const item of obj) {
        const r = zoek(item, diepte + 1);
        if (r.length >= 3) return r;
      }
      return [];
    }
    for (const k of ["amenities", "seeAllAmenitiesGroups", "previewAmenitiesGroups", "amenityGroups", "amenitiesGroups"]) {
      if (obj[k]) {
        const r = zoek(obj[k], diepte + 1);
        if (r.length >= 3) return r;
      }
    }
    for (const k of Object.keys(obj)) {
      const r = zoek(obj[k], diepte + 1);
      if (r.length >= 3) return r;
    }
    return [];
  };

  const uit = s.AMENITIES_DEFAULT ? zoek(s.AMENITIES_DEFAULT) : [];
  if (uit.length >= 3) return Array.from(new Set(uit)).slice(0, 60).join(", ");

  const uitVolledig = zoek(volledigData);
  return Array.from(new Set(uitVolledig)).slice(0, 60).join(", ");
}

function extractAnnulering(s: Record<string, any>): string {
  const cancModal = s.CANCELLATION_POLICY_PICKER_MODAL;
  if (cancModal?.title) return cancModal.title;
  const cancButton = cancModal?.button?.title;
  if (cancButton) return cancButton;
  return "";
}

function extractStadLand(s: Record<string, any>): { stad: string; land: string } {
  const subtitle = s.LOCATION_PDP?.subtitle || ""; // "Vinkeveen, Utrecht, Nederland"
  const delen = subtitle.split(",").map((d: string) => d.trim());
  return {
    stad: delen[0] || "",
    land: delen[delen.length - 1] || "Nederland",
  };
}

// ── Hoofdscraper ──────────────────────────────────────────────────────────────

async function scraapListingHtml(url: string): Promise<Record<string, any> | null> {
  const comUrl = naarComUrl(url);
  console.log("[Pro] Ophalen:", comUrl);

  try {
    const res = await fetch(comUrl, { headers: BROWSER_HEADERS });
    console.log("[Pro] HTTP status:", res.status);
    if (!res.ok) return null;

    const html = await res.text();
    console.log("[Pro] HTML-lengte:", html.length);

    // Zoek script tag met niobeClientData
    const jsonScripts = Array.from(html.matchAll(/<script[^>]*type="application\/json"[^>]*>([\s\S]*?)<\/script>/g));

    for (const scriptMatch of jsonScripts) {
      if (!scriptMatch[1].includes("niobeClientData")) continue;
      try {
        const parsed = JSON.parse(scriptMatch[1]);
        const niobeRaw: any[] = parsed.niobeClientData ?? [];

        // Zoek het StaysPdpSections cache-paar
        for (const paar of niobeRaw) {
          if (!Array.isArray(paar) || paar.length < 2) continue;
          const cacheKey = String(paar[0]);
          if (!cacheKey.startsWith("StaysPdp")) continue;

          const cacheWaarde = paar[1];
          const sections = vindSections(cacheWaarde);
          if (!sections) continue;

          const sectieMap = bouwSectieMap(sections);
          console.log("[Pro] Secties gevonden:", Object.keys(sectieMap).join(", "));

          return { sectieMap, volledigData: cacheWaarde, _bron: "niobe" };
        }
      } catch (e) {
        console.error("[Pro] Parse-fout niobe script:", e);
      }
    }

    console.error("[Pro] Geen niobeClientData met StaysPdpSections gevonden");
    return null;
  } catch (err) {
    console.error("[Pro] Fetch-fout:", err);
    return null;
  }
}

// ── Niobe data → AnalyseFormulier ─────────────────────────────────────────────

function mapNaarFormulier(
  raw: { sectieMap: Record<string, any>; volledigData: any },
  naam: string,
  recensies: string,
  airbnbUrl: string
): AnalyseFormulier {
  const s = raw.sectieMap;

  const { stad, land } = extractStadLand(s);
  const { buurt, vervoer } = extractBuurtEnVervoer(s);
  const huisregels = extractHuisregels(s);
  const beschrijving = extractBeschrijving(s);
  const voorzieningen = extractVoorzieningen(s, raw.volledigData);

  // Titel: listingTitle in de agenda-sectie
  const titel =
    s.STAYS_PDP_AVAILABILITY_CALENDAR_INLINE?.listingTitle ||
    s.AVAILABILITY_CALENDAR_DEFAULT?.listingTitle || "";

  // Beschrijving-modal items: [De ruimte, Toegang, Interactie, Andere info]
  const modalItems = extractDescriptionModalItems(s);
  const accommodatie = modalItems[0] || "";
  const toegang      = modalItems[1] || "";
  const interactie   = modalItems[2] || "";
  const andereInfo   = modalItems[3] || "";

  // Host
  const hostSectie = s.MEET_YOUR_HOST;
  const hostNaamScrape = hostSectie?.cardData?.name || hostSectie?.cardData?.firstName || "";
  const hostAbout = hostSectie?.about || "";
  const hostProfiel = hostAbout
    ? `${hostNaamScrape ? hostNaamScrape + "\n" : ""}${hostAbout}`
    : hostNaamScrape || "";

  // Annuleringsbeleid
  const annuleringsbeleid = extractAnnulering(s);

  // Rating + max gasten
  const rating = s.REVIEWS_DEFAULT?.overallRating;
  const maxGasten = s.BOOK_IT_SIDEBAR?.maxGuestCapacity || s.BOOK_IT_FLOATING_FOOTER?.maxGuestCapacity;

  console.log("[Pro] Mapping klaar — titel:", titel.slice(0, 60));
  console.log("[Pro] Beschrijving:", beschrijving.slice(0, 80));
  console.log("[Pro] Accommodatie:", accommodatie.slice(0, 60));
  console.log("[Pro] Voorzieningen:", voorzieningen.slice(0, 80));

  return {
    hostNaam: naam,
    rapportTaal: "nl",
    woningType: "Woning",
    doelgroep: ["couples", "families"],
    land,
    stad,
    prijsPerNacht: undefined,
    bezettingsgraad: rating ? Math.round(rating * 10) : undefined,
    airbnbUrl,
    titel,
    beschrijving,
    accommodatie,
    toegang,
    interactie,
    andereInfo,
    voorzieningen,
    buurt,
    vervoer,
    recensies,
    hostProfiel,
    huisregels,
    directBoeken: undefined,
    annuleringsbeleid,
    sterkstePunt: maxGasten ? `Max ${maxGasten} gasten` : undefined,
  };
}

// ── Apify reviews ─────────────────────────────────────────────────────────────

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
      const reviewNaam = r.reviewer?.firstName || r.reviewer?.name || "Gast";
      const datum = r.createdAt ? new Date(r.createdAt).toLocaleDateString("nl-NL", { month: "long", year: "numeric" }) : r.date || "";
      const sterren = r.rating ? "★".repeat(Math.min(Math.round(r.rating), 5)) : "";
      let tekst = `Review ${i + 1} — ${reviewNaam}${datum ? ` · ${datum}` : ""}${sterren ? ` · ${sterren}` : ""}\n`;
      tekst += r.comments || r.reviewText || r.text || "(geen tekst)";
      if (r.response) tekst += `\n→ Reactie host: ${r.response}`;
      return tekst;
    }).join("\n\n---\n\n");
  } catch {
    return "";
  }
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

    const [rawListing, recensies] = await Promise.all([
      scraapListingHtml(airbnbUrl),
      scraapReviews(airbnbUrl),
    ]);

    if (!rawListing) {
      global.rapportStatus.set(sessieId, "fout");
      return NextResponse.json(
        { error: "Airbnb advertentie kon niet worden opgehaald. Probeer de standaard Listing Optimizer." },
        { status: 422 }
      );
    }

    const formData = mapNaarFormulier(rawListing as any, naam, recensies, airbnbUrl);

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

    if (Array.isArray(rapport?.velden?.titel?.herschrevenVersies)) {
      rapport.velden.titel.herschrevenVersies = rapport.velden.titel.herschrevenVersies.map(
        (v: { versie: string; uitleg: string }) => {
          if (v.versie.length <= 50) return v;
          const afgekapt = v.versie.slice(0, 50);
          const lastSpace = afgekapt.lastIndexOf(" ");
          return { ...v, versie: lastSpace > 30 ? afgekapt.slice(0, lastSpace).trimEnd() : afgekapt.trimEnd() };
        }
      );
    }

    global.rapporten.set(sessieId, { ...rapport, hostNaam: naam, datum: new Date().toISOString(), email, isPro: true });

    try {
      const admin = createAdminClient();
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
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
          from: "Boni van Host Boni <boni@verhuurai.nl>",
          to: email,
          subject: `Je Listing Optimizer Pro rapport is klaar! 🏠`,
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
            <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
              <h1 style="color:white;margin:0;font-size:22px;">🏠 Host Boni</h1>
              <p style="color:#a5b4fc;margin:8px 0 0;">Listing Optimizer Pro Rapport</p>
            </div>
            <p>Hey ${naam}! Boni heeft jouw advertentie automatisch opgehaald en geanalyseerd.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${rapportUrl}" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">Bekijk mijn Pro rapport →</a>
            </div>
            ${loginUrl ? `<div style="background:#f9fafb;border-radius:12px;padding:20px;margin-top:24px;">
              <p style="margin:0 0 8px;font-weight:bold;color:#1B2B4B;">📊 Je dashboard</p>
              <a href="${loginUrl}" style="background:#1B2B4B;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">Inloggen →</a>
            </div>` : ""}
            <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">Host Boni · <a href="${baseUrl}" style="color:#9ca3af;">hostboni.com</a></p>
          </div>`,
        });
      }
    } catch (err) {
      console.error("[Pro] Supabase/email fout:", err);
    }

    global.rapportStatus.set(sessieId, "klaar");
    return NextResponse.json({ ok: true, rapportId: sessieId });
  } catch (error) {
    console.error("[Pro] Fout:", error);
    if (sessieId) global.rapportStatus.set(sessieId, "fout");
    return NextResponse.json({ error: "Boni heeft even een technisch probleem." }, { status: 500 });
  }
}
