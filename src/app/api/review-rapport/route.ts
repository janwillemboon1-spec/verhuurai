import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReviewRapportPrompt } from "@/lib/review-rapport-prompt";
import { buildReviewRapportEmail } from "@/lib/review-rapport-email";
import { filterReviews, formateerGefilterd } from "@/lib/filter-reviews";
import { NextResponse } from "next/server";

console.log("[HP Audit] route module geladen");

export async function POST(request: Request) {
  console.log("[HP Audit] POST ontvangen");
  try {
    const { abonnementId, stripe_session_id } = await request.json();
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    let abo: any = null;

    if (user) {
      const { data } = await supabase
        .from("abonnementen")
        .select("*")
        .eq("id", abonnementId)
        .eq("user_id", user.id)
        .maybeSingle();
      abo = data;
    }

    // Fallback: verificatie via Stripe session ID (direct na betaling, nog niet ingelogd)
    if (!abo && stripe_session_id) {
      const { data } = await admin
        .from("abonnementen")
        .select("*")
        .eq("id", abonnementId)
        .eq("stripe_session_id", stripe_session_id)
        .maybeSingle();
      abo = data;
    }

    if (!abo) {
      console.error("[HP Audit] Niet geautoriseerd — id:", abonnementId);
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const aboError = null;

    // Voorkom duplicaten: check of er al een rapport is voor deze periode
    const nu = new Date();
    const periodeOmschrijving = abo.frequentie === "weekly"
      ? `Week van ${nu.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}`
      : `${nu.toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}`;

    const { data: bestaandRapport } = await admin
      .from("rapporten")
      .select("id, rapport_json")
      .eq("abonnement_id", abonnementId)
      .eq("periode_omschrijving", periodeOmschrijving)
      .maybeSingle();

    if (bestaandRapport) {
      return NextResponse.json({ ok: true, rapportId: bestaandRapport.id, rapport_json: bestaandRapport.rapport_json, bestaand: true });
    }

    // Reviews scrapen via Apify + filteren
    let recensies = "";
    let nieuwAantalReviews = (abo as any).laatste_review_count || 0;
    let alleReviewsRaw: Array<{ createdAt: string | null; rating: number | null }> = [];
    try {
      const scrapeRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/scrape-reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: (abo as any).airbnb_url }),
      });
      const scrapeData = await scrapeRes.json();
      if (scrapeData.ok && scrapeData.reviewsRaw) {
        // Sla alle reviews op voor Superhost-berekening
        alleReviewsRaw = scrapeData.reviewsRaw.map((r: any) => ({
          createdAt: r.createdAt || null,
          rating: typeof r.rating === "number" ? r.rating : null,
        }));
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

    const prompt = buildReviewRapportPrompt(abo.airbnb_url, abo.frequentie, periodeOmschrijving, (abo as any).taal || "nl");

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

    const rapportJson = { ...rapport, reviewsRaw: alleReviewsRaw, taal: (abo as any).taal || "nl" };

    const { data: nieuwRapport } = await admin
      .from("rapporten")
      .insert({
        abonnement_id: abonnementId,
        user_id: abo.user_id,
        rapport_json: rapportJson,
        periode_omschrijving: periodeOmschrijving,
      })
      .select()
      .single();

    // Email ophalen via user_id
    let emailGebruiker = user?.email || null;
    if (!emailGebruiker && abo.user_id) {
      try {
        const { data: userData } = await admin.auth.admin.getUserById(abo.user_id);
        emailGebruiker = userData?.user?.email || null;
      } catch {}
    }

    if (emailGebruiker && nieuwRapport) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
        const rapportUrl = `${baseUrl}/dashboard/rapporten/${nieuwRapport.id}`;
        const html = buildReviewRapportEmail(
          (abo as any).voornaam || "Host",
          (abo as any).listing_naam || "Jouw woning",
          periodeOmschrijving,
          rapport,
          rapportUrl
        );
        await resend.emails.send({
          from: "Boni van Host Boni <boni@verhuurai.nl>",
          to: emailGebruiker,
          subject: `📊 Jouw review rapport is klaar — ${periodeOmschrijving}`,
          html,
        });
      } catch (emailErr) {
        console.error("Email sturen mislukt (niet fataal):", emailErr);
      }
    }

    // Update review count en rapport datum voor volgende keer
    await admin
      .from("abonnementen")
      .update({
        laatste_review_count: nieuwAantalReviews,
        laatste_rapport_datum: new Date().toISOString(),
      })
      .eq("id", abonnementId);

    return NextResponse.json({ ok: true, rapportId: nieuwRapport?.id, rapport_json: rapportJson });
  } catch (error) {
    console.error("Review rapport fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
