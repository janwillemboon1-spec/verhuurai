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

// ── Apify: volledige listing scrapen ─────────────────────────────────────────

// Converteer airbnb.nl/.be/.de/etc naar airbnb.com (sommige actors vereisen .com)
function naarComUrl(url: string): string {
  return url.replace(/airbnb\.[a-z]{2,3}\//, "airbnb.com/");
}

async function scraapListing(url: string): Promise<Record<string, any> | null> {
  if (!APIFY_TOKEN) {
    console.error("[Pro] Geen APIFY_TOKEN");
    return null;
  }
  const comUrl = naarComUrl(url);
  console.log("[Pro] Listing scrapen:", comUrl);

  // Probeer eerst zonder residential proxy (werkt op alle Apify-plannen)
  const pogingen = [
    { proxyConfiguration: { useApifyProxy: true } },
    { proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } },
    {},
  ];

  for (const proxyBody of pogingen) {
    try {
      const runRes = await fetch(
        `https://api.apify.com/v2/acts/tri_angle~airbnb-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=120`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            startUrls: [{ url: comUrl }],
            maxListings: 1,
            ...proxyBody,
          }),
        }
      );

      if (!runRes.ok) {
        const errText = await runRes.text();
        console.error("[Pro] Actor start mislukt:", runRes.status, errText);
        continue;
      }

      const runData = await runRes.json();
      console.log("[Pro] Run status:", runData.data?.status, "id:", runData.data?.id);

      const datasetId = runData.data?.defaultDatasetId;
      if (!datasetId) {
        console.error("[Pro] Geen datasetId in run response");
        continue;
      }

      const dataRes = await fetch(
        `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=1`
      );
      if (!dataRes.ok) {
        console.error("[Pro] Dataset ophalen mislukt:", dataRes.status);
        continue;
      }

      const items = await dataRes.json();
      console.log("[Pro] Items ontvangen:", items?.length ?? 0, "eerste sleutels:", items?.[0] ? Object.keys(items[0]).slice(0, 10) : "leeg");

      if (items?.[0]) return items[0];
    } catch (err) {
      console.error("[Pro] Poging mislukt:", err);
    }
  }

  return null;
}

// ── Apify: reviews scrapen ────────────────────────────────────────────────────

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
          proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] },
        }),
      }
    );
    if (!runRes.ok) return "";
    const runData = await runRes.json();
    const datasetId = runData.data?.defaultDatasetId;
    if (!datasetId) return "";

    const dataRes = await fetch(
      `https://api.apify.com/v2/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=100`
    );
    if (!dataRes.ok) return "";
    const items = await dataRes.json();
    const reviews = (items?.[0]?.reviews ?? items) as any[];
    if (!reviews?.length) return "";

    return reviews
      .slice(0, 50)
      .map((r: any, i: number) => {
        const naam = r.reviewer?.firstName || r.reviewer?.name || "Gast";
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
  } catch {
    return "";
  }
}

// ── Apify data → AnalyseFormulier ────────────────────────────────────────────

function mapNaarFormulier(
  listing: Record<string, any>,
  naam: string,
  recensies: string
): AnalyseFormulier {
  // Voorzieningen: array van objecten of strings
  const amenitiesRaw: any[] = listing.amenities ?? listing.amenityIds ?? [];
  const voorzieningen = amenitiesRaw
    .map((a: any) => (typeof a === "string" ? a : a.name ?? a.title ?? ""))
    .filter(Boolean)
    .join(", ");

  // Huisregels: kan string of array zijn
  const huisregelsRaw = listing.houseRules ?? listing.house_rules ?? "";
  const huisregels = Array.isArray(huisregelsRaw)
    ? huisregelsRaw.join("\n")
    : String(huisregelsRaw);

  // Annuleringsbeleid
  const annulering =
    listing.cancellationPolicy ??
    listing.cancellation_policy ??
    listing.cancellationPolicies?.[0]?.policyName ??
    "";

  // Prijs
  const prijs =
    listing.price?.rate ??
    listing.pricing?.rate?.amount ??
    listing.priceString ??
    undefined;

  // Host info
  const host = listing.host ?? listing.primaryHost ?? {};
  const hostNaamScrape =
    host.name ?? host.firstName ?? host.hostName ?? "";
  const hostProfiel =
    host.about ?? host.description ?? host.hostAbout ?? "";

  // Stad + land
  const stad =
    listing.city ?? listing.address?.city ?? listing.location?.city ?? "";
  const land =
    listing.country ?? listing.address?.country ?? listing.location?.country ?? "Nederland";

  // Rating/bezetting
  const rating = listing.rating ?? listing.starRating ?? undefined;

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
    beschrijving: listing.description ?? listing.summary ?? "",
    accommodatie:
      listing.space ??
      listing.spaceDescription ??
      listing.space_description ??
      listing.the_space ??
      "",
    toegang:
      listing.access ??
      listing.guestAccess ??
      listing.guest_access ??
      listing.accessibilityFeatures ??
      "",
    interactie:
      listing.interaction ??
      listing.interactionWithGuests ??
      listing.interaction_with_guests ??
      "",
    andereInfo:
      listing.notes ??
      listing.other_notes ??
      listing.otherNotes ??
      listing.additionalHouseRules ??
      "",
    voorzieningen,
    buurt:
      listing.neighborhoodOverview ??
      listing.neighborhood_overview ??
      listing.neighborhoodDescription ??
      "",
    vervoer:
      listing.transit ??
      listing.transitInformation ??
      listing.transit_information ??
      listing.gettingAround ??
      "",
    recensies,
    hostProfiel:
      hostProfiel ||
      (hostNaamScrape ? `Host: ${hostNaamScrape}` : ""),
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

    if (!sessieId) {
      return NextResponse.json({ error: "sessieId is verplicht" }, { status: 400 });
    }

    const sessie = global.sessies.get(sessieId);
    if (!sessie) {
      return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
    }

    const { naam, email, airbnbUrl } = sessie;
    global.rapportStatus.set(sessieId, "verwerking");

    // Scrape listing + reviews parallel
    const [listing, recensies] = await Promise.all([
      scraapListing(airbnbUrl),
      scraapReviews(airbnbUrl),
    ]);

    if (!listing) {
      console.error("[Pro] Listing is null na alle pogingen voor:", airbnbUrl);
      global.rapportStatus.set(sessieId, "fout");
      return NextResponse.json(
        { error: "Airbnb advertentie kon niet worden opgehaald. Probeer de standaard Listing Optimizer.", reden: "listing_null" },
        { status: 422 }
      );
    }
    console.log("[Pro] Listing succesvol opgehaald, velden:", Object.keys(listing).slice(0, 15));

    const formData: AnalyseFormulier = mapNaarFormulier(listing, naam, recensies);

    // Claude analyse — zelfde prompt als bestaande Listing Optimizer
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
          const versie = v.versie.length <= 50
            ? v.versie
            : (() => {
                const afgekapt = v.versie.slice(0, 50);
                const lastSpace = afgekapt.lastIndexOf(" ");
                return lastSpace > 30 ? afgekapt.slice(0, lastSpace).trimEnd() : afgekapt.trimEnd();
              })();
          return { ...v, versie };
        }
      );
    }

    global.rapporten.set(sessieId, {
      ...rapport,
      hostNaam: naam,
      datum: new Date().toISOString(),
      email,
      isPro: true,
    });

    // Opslaan in Supabase + email sturen
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
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;">
              <div style="background:#1B2B4B;padding:24px;border-radius:12px;text-align:center;margin-bottom:24px;">
                <h1 style="color:white;margin:0;font-size:22px;">🏠 VerhuurAI</h1>
                <p style="color:#a5b4fc;margin:8px 0 0;">Listing Optimizer Pro Rapport</p>
              </div>
              <p>Hey ${naam}! Boni heeft jouw advertentie automatisch opgehaald en geanalyseerd. Bekijk je rapport via de knop hieronder.</p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${rapportUrl}" style="background:#FF6B6B;color:white;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:16px;">
                  Bekijk mijn Pro rapport →
                </a>
              </div>
              ${loginUrl ? `
              <div style="background:#f9fafb;border-radius:12px;padding:20px;margin-top:24px;">
                <p style="margin:0 0 8px;font-weight:bold;color:#1B2B4B;">📊 Je dashboard</p>
                <p style="margin:0 0 12px;color:#6b7280;font-size:14px;">Log in op je dashboard om al je rapporten terug te vinden.</p>
                <a href="${loginUrl}" style="background:#1B2B4B;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;">
                  Inloggen op dashboard →
                </a>
              </div>` : ""}
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin-top:24px;">
                VerhuurAI · <a href="${baseUrl}" style="color:#9ca3af;">verhuurai.nl</a>
              </p>
            </div>`,
        });
      }
    } catch (err) {
      console.error("Supabase/email fout (pro):", err);
    }

    global.rapportStatus.set(sessieId, "klaar");
    return NextResponse.json({ ok: true, rapportId: sessieId });
  } catch (error) {
    console.error("Analyse pro fout:", error);
    if (sessieId) global.rapportStatus.set(sessieId, "fout");
    return NextResponse.json(
      { error: "Boni heeft even een technisch probleem. Probeer het zo nog eens!" },
      { status: 500 }
    );
  }
}
