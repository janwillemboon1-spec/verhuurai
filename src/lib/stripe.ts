import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export interface CheckoutData {
  pakketId: string;
  naam: string;
  email: string;
  introPrijs: number;
  normaalPrijs: number;
  advertenties: number;
  pakketNaam: string;
}

export async function maakCheckoutSessie(data: CheckoutData): Promise<string> {
  const introActief = process.env.INTRO_DISCOUNT_ACTIVE === "true";
  const prijs = introActief ? data.introPrijs : data.normaalPrijs;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "ideal"],
    customer_email: data.email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: {
            name: `VerhuurAI — ${data.pakketNaam}`,
            description: `${data.advertenties} advertentie${data.advertenties > 1 ? "s" : ""} analyseren door Boni${introActief ? " (introductieprijs)" : ""}`,
          },
          unit_amount: Math.round(prijs * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `${baseUrl}/starten/succes?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/starten`,
    metadata: {
      pakketId: data.pakketId,
      naam: data.naam,
      email: data.email,
      advertenties: String(data.advertenties),
    },
  });

  return session.url!;
}
