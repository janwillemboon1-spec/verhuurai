import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { buildReviewRapportPrompt } from "@/lib/review-rapport-prompt";
import { filterReviews, formateerGefilterd } from "@/lib/filter-reviews";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { abonnementId } = await request.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const { data: abo } = await supabase
      .from("abonnementen")
      .select("*")
      .eq("id", abonnementId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!abo) return NextResponse.json({ error: "Abonnement niet gevonden" }, { status: 404 });

    // Voorkom duplicaten: check of er al een rapport is voor deze periode
    const nu = new Date();
    const periodeOmschrijving = abo.frequentie === "weekly"
      ? `Week van ${nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`
      : `${nu.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}`;

    const { data: bestaandRapport } = await supabase
      .from("rapporten")
      .select("id")
      .eq("abonnement_id", abonnementId)
      .eq("periode_omschrijving", periodeOmschrijving)
      .maybeSingle();

    if (bestaandRapport) {
      return NextResponse.json({ ok: true, rapportId: bestaandRapport.id, bestaand: true });
    }

    // Reviews scrapen via Apify + filteren
    let recensies = "";
    let nieuwAantalReviews = (abo as any).laatste_review_count || 0;
    try {
      const scrapeRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/scrape-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: (abo as any).airbnb_url }),
      });
      const scrapeData = await scrapeRes.json();
      if (scrapeData.ok && scrapeData.reviewsRaw) {
        const { gefilterd, aantalTotaal, filterMethode } = filterReviews(
          scrapeData.reviewsRaw,
          (abo as any).laatste_review_count || 0,
          (abo as any).laatste_rapport_datum || null
        );
        console.log(`[Review filter] ${filterMethode} — ${gefilterd.length} van ${aantalTotaal}`);
        recensies = gefilterd.length > 0 ? formateerGefilterd(gefilterd) : "";
        nieuwAantalReviews = aantalTotaal;
      } else if (scrapeData.ok) {
        recensies = scrapeData.recensies;
      }
    } catch {
      recensies = "(Reviews konden niet automatisch worden opgehaald)";
    }

    const prompt = buildReviewRapportPrompt(abo.airbnb_url, abo.frequentie, periodeOmschrijving);

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      messages: [{
        role: "user",
        content: recensies
          ? `${prompt}\n\nHIER ZIJN DE REVIEWS:\n${recensies}`
          : `${prompt}\n\n(Geen reviews beschikbaar om te analyseren — geef een algemeen rapport met advies over hoe de host reviews kan stimuleren.)`,
      }],
    });

    const raw = (message.content[0] as { text: string }).text
      .replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const rapport = JSON.parse(raw);

    const { data: nieuwRapport } = await supabase
      .from("rapporten")
      .insert({
        abonnement_id: abonnementId,
        user_id: user.id,
        rapport_json: rapport,
        periode_omschrijving: periodeOmschrijving,
      })
      .select()
      .single();

    // Update review count en rapport datum voor volgende keer
    await supabase
      .from("abonnementen")
      .update({
        laatste_review_count: nieuwAantalReviews,
        laatste_rapport_datum: new Date().toISOString(),
      })
      .eq("id", abonnementId);

    return NextResponse.json({ ok: true, rapportId: nieuwRapport?.id });
  } catch (error) {
    console.error("Review rapport fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
