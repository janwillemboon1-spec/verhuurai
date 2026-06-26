import { stripe } from "@/lib/stripe";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { airbnb_url, listing_naam, voornaam, email, taal } = await request.json();

    if (!airbnb_url || !email) {
      return NextResponse.json({ error: "airbnb_url en email zijn verplicht" }, { status: 400 });
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
              name: "Host Boni — Host Performance Audit",
              description: "AI-analyse van jouw Airbnb reviews met verbeterpunten",
            },
            unit_amount: 799,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/host-performance/succes?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/host-performance/aanmelden`,
      metadata: {
        tool: "hp-audit",
        email,
        airbnb_url,
        listing_naam: listing_naam || "",
        voornaam: voornaam || "",
        taal: taal || "nl",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("HP checkout fout:", error);
    return NextResponse.json({ error: "Stripe sessie aanmaken mislukt" }, { status: 500 });
  }
}
