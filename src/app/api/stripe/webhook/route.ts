import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
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
        const sessieId = metadata.sessieId;
        const email = metadata.email || session.customer_email || "";
        const naam = metadata.naam || "";

        // Sessie als betaald markeren (was al aangemaakt bij checkout)
        if (sessieId && global.sessies.has(sessieId)) {
          const bestaand = global.sessies.get(sessieId);
          global.sessies.set(sessieId, { ...bestaand, betaald: true });
        } else if (sessieId) {
          // Fallback: server herstart gehad tussen checkout en betaling
          global.sessies.set(sessieId, {
            id: sessieId,
            email,
            naam,
            pakket: "listing-optimizer",
            credits: 1,
            gebruiktCredits: 0,
            aangemaakt: new Date().toISOString(),
            betaald: true,
          });
        }

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
                <p>Betaling ontvangen — jouw analyselink staat klaar. Gebruik hem als je de sessie opnieuw wilt starten.</p>
                <p style="margin: 24px 0;">
                  <a href="${baseUrl}/analyseer/${sessieId}" style="background: #2b3885; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">
                    Naar mijn analyse →
                  </a>
                </p>
                <p style="color: #666; font-size: 14px;">Of kopieer deze link: ${baseUrl}/analyseer/${sessieId}</p>
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
          const email = metadata.email || session.customer_email || "";

          // Gebruiker zoeken of aanmaken
          let userId: string | null = null;
          const { data: newUser, error: createError } = await admin.auth.admin.createUser({
            email,
            email_confirm: true,
          });

          if (!createError && newUser?.user) {
            userId = newUser.user.id;
          } else {
            // Gebruiker bestaat al — opzoeken via listUsers
            const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
            const bestaand = users.find((u) => u.email === email);
            if (bestaand) userId = bestaand.id;
          }

          if (!userId) {
            console.error("HP Audit: gebruiker niet gevonden of aangemaakt voor", email);
            return NextResponse.json({ received: true }, { status: 200 });
          }

          // Voorkom dubbel abonnement voor dezelfde Stripe sessie
          const { data: bestaandAbo } = await admin
            .from("abonnementen")
            .select("id")
            .eq("stripe_session_id", session.id)
            .maybeSingle();

          if (!bestaandAbo) {
            const { error: aboError } = await admin
              .from("abonnementen")
              .insert({
                user_id: userId,
                airbnb_url: metadata.airbnb_url,
                listing_naam: metadata.listing_naam || null,
                voornaam: metadata.voornaam || null,
                frequentie: "eenmalig",
                billing_interval: "eenmalig",
                taal: metadata.taal || "nl",
                status: "trial",
                stripe_session_id: session.id,
              });

            if (aboError) console.error("HP Audit abonnement aanmaken mislukt:", aboError);
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
