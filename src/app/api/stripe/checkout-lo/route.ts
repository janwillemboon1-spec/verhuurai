import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

declare global {
  var sessies: Map<string, any>;
}
if (!global.sessies) global.sessies = new Map();

export async function POST(request: Request) {
  try {
    const { naam, email } = await request.json();

    if (!naam || !email) {
      return NextResponse.json({ error: "naam en email zijn verplicht" }, { status: 400 });
    }

    // SessieId aanmaken vóór Stripe zodat we direct kunnen doorsturen na betaling
    const sessieId = uuidv4();
    global.sessies.set(sessieId, {
      id: sessieId,
      email,
      naam,
      pakket: "listing-optimizer",
      credits: 1,
      gebruiktCredits: 0,
      aangemaakt: new Date().toISOString(),
      betaald: false,
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Host Boni — Listing Optimizer",
              description: "Professionele AI-analyse van jouw Airbnb advertentie",
            },
            unit_amount: 1499,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      success_url: `${baseUrl}/starten/succes?session_id={CHECKOUT_SESSION_ID}&sessie_id=${sessieId}`,
      cancel_url: `${baseUrl}/starten`,
      metadata: {
        tool: "listing-optimizer",
        naam,
        email,
        sessieId,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("LO checkout fout:", error);
    return NextResponse.json({ error: "Stripe sessie aanmaken mislukt" }, { status: 500 });
  }
}
