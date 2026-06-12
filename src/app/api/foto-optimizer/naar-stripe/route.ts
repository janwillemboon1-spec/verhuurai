import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { berekenPrijsInCenten } from "@/lib/foto-optimizer/pricing";
import { stripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const { sessieId } = await request.json();
    if (!sessieId) {
      return NextResponse.json({ error: "sessieId verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: sessie, error } = await admin
      .from("foto_sessies")
      .select("id, naam, email, aantal_fotos, status")
      .eq("id", sessieId)
      .single();

    if (error || !sessie) {
      return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

    // Test-bypass: sla Stripe over en markeer direct als betaald
    if (process.env.FOTO_TEST_MODE === "true") {
      await admin
        .from("foto_sessies")
        .update({ status: "betaald" })
        .eq("id", sessieId);
      return NextResponse.json({
        stripeUrl: `${baseUrl}/foto-optimizer/succes?sessie_id=${sessieId}`,
      });
    }

    const prijsInCenten = berekenPrijsInCenten(sessie.aantal_fotos);
    const n = sessie.aantal_fotos;

    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card", "ideal"],
      customer_email: sessie.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Host Boni — Foto Optimizer (${n} foto${n !== 1 ? "'s" : ""})`,
              description: `Professionele AI-bewerking van ${n} vakantieverhuur foto${n !== 1 ? "'s" : ""}`,
            },
            unit_amount: prijsInCenten,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/foto-optimizer/succes?session_id={CHECKOUT_SESSION_ID}&sessie_id=${sessieId}`,
      cancel_url: `${baseUrl}/foto-optimizer`,
      metadata: {
        tool: "foto-optimizer",
        sessieId,
        naam: sessie.naam,
        email: sessie.email,
      },
    });

    // Stripe session ID opslaan
    await admin
      .from("foto_sessies")
      .update({ stripe_session_id: stripeSession.id })
      .eq("id", sessieId);

    return NextResponse.json({ stripeUrl: stripeSession.url });

  } catch (error) {
    console.error("Naar Stripe fout:", error);
    return NextResponse.json({ error: "Stripe sessie aanmaken mislukt" }, { status: 500 });
  }
}
