import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { airbnb_url, listing_naam, voornaam, taal } = await request.json();

    if (!airbnb_url) {
      return NextResponse.json({ error: "airbnb_url is verplicht" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"],
      customer_email: user.email,
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
        user_id: user.id,
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
