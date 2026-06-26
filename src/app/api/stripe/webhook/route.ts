import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";

declare global {
  var sessies: Map<string, any>;
}
if (!global.sessies) global.sessies = new Map();

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Geen Stripe signature" }, { status: 400 });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err) {
      console.error("Webhook signature verificatie mislukt:", err);
      return NextResponse.json({ error: "Ongeldige signature" }, { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const metadata = session.metadata || {};

      // --- Foto Optimizer ---
      if (metadata.tool === "foto-optimizer") {
        try {
          const admin = createAdminClient();
          await admin
            .from("foto_sessies")
            .update({ status: "betaald" })
            .eq("stripe_session_id", session.id);
        } catch (err) {
          console.error("Foto optimizer webhook fout:", err);
        }
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // --- Listing Optimizer ---
      if (metadata.tool === "listing-optimizer") {
        const sessieId = uuidv4();
        const email = metadata.email || session.customer_email || "";
        const naam = metadata.naam || "";

        global.sessies.set(sessieId, {
          id: sessieId,
          email,
          naam,
          pakket: "listing-optimizer",
          credits: 1,
          gebruiktCredits: 0,
          aangemaakt: new Date().toISOString(),
        });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

        try {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: "boni@verhuurai.nl",
            to: email,
            subject: "Jouw Listing Optimizer sessie is klaar! 🏠",
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
                <h1 style="color: #2b3885;">Hey ${naam}!</h1>
                <p>Betaling ontvangen — jouw Listing Optimizer sessie staat klaar.</p>
                <p style="margin: 24px 0;">
                  <a href="${baseUrl}/analyseer/${sessieId}" style="background: #2b3885; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Start mijn analyse →
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">Of kopieer deze link: ${baseUrl}/analyseer/${sessieId}</p>
                <p style="color: #666; font-size: 12px; margin-top: 32px;">Bewaar deze link — je hebt hem nodig om je analyse te starten.</p>
                <p>Veel succes,<br><strong>Boni van Host Boni</strong></p>
              </div>
            `,
          });
        } catch (emailErr) {
          console.error("LO bevestigingsmail mislukt:", emailErr);
        }

        return NextResponse.json({ received: true }, { status: 200 });
      }

      // --- Host Performance Audit ---
      if (metadata.tool === "hp-audit") {
        try {
          const admin = createAdminClient();
          const { data: abo, error } = await admin
            .from("abonnementen")
            .insert({
              user_id: metadata.user_id,
              airbnb_url: metadata.airbnb_url,
              listing_naam: metadata.listing_naam || null,
              voornaam: metadata.voornaam || null,
              frequentie: "eenmalig",
              billing_interval: "eenmalig",
              taal: metadata.taal || "nl",
              status: "trial",
              stripe_session_id: session.id,
            })
            .select()
            .single();

          if (error) {
            console.error("HP Audit abonnement aanmaken mislukt:", error);
          }
        } catch (err) {
          console.error("HP Audit webhook fout:", err);
        }

        return NextResponse.json({ received: true }, { status: 200 });
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook fout:", error);
    return NextResponse.json({ error: "Webhook verwerking mislukt" }, { status: 500 });
  }
}
