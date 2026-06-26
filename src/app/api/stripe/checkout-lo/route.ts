import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { naam, email } = await request.json();

    if (!naam || !email) {
      return NextResponse.json({ error: "naam en email zijn verplicht" }, { status: 400 });
    }

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
      success_url: `${baseUrl}/starten/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/starten`,
      metadata: {
        tool: "listing-optimizer",
        naam,
        email,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("LO checkout fout:", error);
    return NextResponse.json({ error: "Stripe sessie aanmaken mislukt" }, { status: 500 });
  }
}
