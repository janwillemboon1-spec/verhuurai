import { createAdminClient } from "@/lib/supabase/admin";
import { buildReviewRapportPrompt } from "@/lib/review-rapport-prompt";
import { buildReviewRapportEmail } from "@/lib/review-rapport-email";
import { filterReviews, formateerGefilterd } from "@/lib/filter-reviews";
import { syncCommunityLeden } from "@/lib/sync-community-leden";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

function volgendeDatum(frequentie: string, dag: string | null): Date {
  const nu = new Date();

  if (frequentie === "weekly") {
    const DAGEN: Record<string, number> = {
      maandag: 1, dinsdag: 2, woensdag: 3, donderdag: 4,
      vrijdag: 5, zaterdag: 6, zondag: 0,
    };
    const doelDag = DAGEN[dag ?? "maandag"] ?? 1;
    const huidigedag = nu.getDay();
    let diff = doelDag - huidigedag;
    if (diff <= 0) diff += 7;
    const volgende = new Date(nu);
    volgende.setDate(nu.getDate() + diff);
    volgende.setHours(8, 0, 0, 0);
    return volgende;
  } else {
    const dagNummer = parseInt(dag ?? "1");
    const volgende = new Date(nu.getFullYear(), nu.getMonth() + 1, dagNummer);
    volgende.setHours(8, 0, 0, 0);
    return volgende;
  }
}

export async function GET(request: Request) {
  // Beveilig de endpoint met CRON_SECRET
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret") ?? request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
  const nu = new Date();

  // Haal alle actieve abonnementen op waarvan het tijd is voor een rapport
  const { data: abonnementen, error } = await supabase
    .from("abonnementen")
    .select("*")
    .eq("status", "active")
    .lte("volgende_rapport_datum", nu.toISOString());

  if (error) {
    console.error("Cron: abonnementen ophalen mislukt:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!abonnementen || abonnementen.length === 0) {
    return NextResponse.json({ verwerkt: 0, bericht: "Geen abonnementen te verwerken" });
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const resultaten: { id: string; status: string }[] = [];

  for (const abo of abonnementen) {
    try {
      const aboData = abo as any;
      // Reviews scrapen + filteren
      let recensies = "";
      let nieuwAantalReviews = aboData.laatste_review_count || 0;
      try {
        const scrapeRes = await fetch(`${baseUrl}/api/scrape-reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: aboData.airbnb_url }),
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeData.ok && scrapeData.reviewsRaw) {
          const { gefilterd, aantalTotaal, filterMethode } = filterReviews(
            scrapeData.reviewsRaw,
            aboData.laatste_review_count || 0,
            aboData.laatste_rapport_datum || null
          );
          console.log(`[Cron filter] ${filterMethode} — ${gefilterd.length} van ${aantalTotaal}`);
          recensies = gefilterd.length > 0 ? formateerGefilterd(gefilterd) : "";
          nieuwAantalReviews = aantalTotaal;
        } else if (scrapeData.ok) {
          recensies = scrapeData.recensies;
        }
      } catch {
        recensies = "";
      }

      const periodeOmschrijving = aboData.frequentie === "weekly"
        ? `Week van ${nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`
        : nu.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

      const prompt = buildReviewRapportPrompt(aboData.airbnb_url, aboData.frequentie, periodeOmschrijving, aboData.taal || "nl");

      const message = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 8000,
        messages: [{
          role: "user",
          content: recensies
            ? `${prompt}\n\nHIER ZIJN DE REVIEWS:\n${recensies}`
            : `${prompt}\n\n(Geen reviews beschikbaar — geef advies over hoe de host meer reviews kan krijgen.)`,
        }],
      });

      const raw = (message.content[0] as { text: string }).text
        .replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
      const rapport = JSON.parse(raw);

      // Rapport opslaan in Supabase
      const { data: nieuwRapport } = await supabase
        .from("rapporten")
        .insert({
          abonnement_id: aboData.id,
          user_id: aboData.user_id,
          rapport_json: { ...rapport, taal: aboData.taal || "nl" },
          periode_omschrijving: periodeOmschrijving,
        })
        .select()
        .single();

      // Email ophalen voor deze gebruiker
      const { data: userData } = await supabase.auth.admin.getUserById(aboData.user_id);
      const email = userData?.user?.email;

      if (email && nieuwRapport) {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const rapportUrl = `${baseUrl}/dashboard/rapporten/${nieuwRapport.id}`;
        const html = buildReviewRapportEmail(
          aboData.listing_naam || "Mijn woning",
          aboData.listing_naam || "Jouw woning",
          periodeOmschrijving,
          rapport,
          rapportUrl
        );

        await resend.emails.send({
          from: "Boni van VerhuurAI <boni@verhuurai.nl>",
          to: email,
          subject: `📊 Jouw review rapport is klaar — ${periodeOmschrijving}`,
          html,
        });

        await supabase
          .from("rapporten")
          .update({ email_verstuurd_op: new Date().toISOString() })
          .eq("id", nieuwRapport.id);
      }

      // Volgende rapport datum bijwerken
      const volgende = volgendeDatum(aboData.frequentie, aboData.rapport_dag);
      await supabase
        .from("abonnementen")
        .update({
          volgende_rapport_datum: volgende.toISOString(),
          laatste_review_count: nieuwAantalReviews,
          laatste_rapport_datum: new Date().toISOString(),
        })
        .eq("id", aboData.id);

      resultaten.push({ id: aboData.id, status: "ok" });
    } catch (err) {
      console.error(`Cron: rapport mislukt voor ${abo.id}:`, err);
      resultaten.push({ id: (abo as any).id, status: "fout" });
    }
  }

  // Dagelijkse sync van community leden uit Mailblue
  let communitySyncResultaat: string;
  try {
    const { gesynchroniseerd } = await syncCommunityLeden();
    communitySyncResultaat = `ok (${gesynchroniseerd} leden)`;
  } catch (err) {
    console.error("Cron: community sync mislukt:", err);
    communitySyncResultaat = "mislukt";
  }

  return NextResponse.json({
    verwerkt: resultaten.length,
    resultaten,
    tijdstip: nu.toISOString(),
    community_sync: communitySyncResultaat,
  });
}
