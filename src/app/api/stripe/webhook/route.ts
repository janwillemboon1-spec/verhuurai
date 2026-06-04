import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { Resend } from "resend";

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

      const sessieId = uuidv4();
      const email = metadata.email || session.customer_email || "";
      const naam = metadata.naam || "";
      const pakketId = metadata.pakketId || "";
      const advertenties = parseInt(metadata.advertenties || "1", 10);

      global.sessies.set(sessieId, {
        id: sessieId,
        email,
        naam,
        pakket: pakketId,
        credits: advertenties,
        gebruiktCredits: 0,
        aangemaakt: new Date().toISOString(),
      });

      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "boni@verhuurai.nl",
          to: email,
          subject: "Welkom bij VerhuurAI — jouw toegang is klaar! 🏠",
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <h1 style="color: #2b3885;">Hey ${naam}!</h1>
              <p>Geweldig dat je aan de slag gaat met VerhuurAI. Jouw betaling is bevestigd en je toegang staat klaar.</p>
              <p><strong>Pakket:</strong> ${pakketId}</p>
              <p><strong>Beschikbare analyses:</strong> ${advertenties}</p>
              <p><strong>Jouw sessie-ID:</strong> <code style="background: #eef7fe; padding: 4px 8px; border-radius: 4px;">${sessieId}</code></p>
              <p style="margin-top: 24px;">Ga naar <a href="${process.env.NEXT_PUBLIC_BASE_URL || "https://verhuurai.nl"}/analyse" style="color: #2b3885;">verhuurai.nl/analyse</a> om je eerste advertentie te analyseren.</p>
              <p>Veel succes,<br><strong>Boni van VerhuurAI</strong></p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Bevestigingsmail sturen mislukt:", emailErr);
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook fout:", error);
    return NextResponse.json({ error: "Webhook verwerking mislukt" }, { status: 500 });
  }
}
