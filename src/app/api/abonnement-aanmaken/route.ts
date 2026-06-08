import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { airbnb_url, naam, voornaam, frequentie, interval } = await request.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    // Voorkom duplicaat abonnement voor dezelfde URL
    const { data: bestaand } = await supabase
      .from("abonnementen")
      .select("id")
      .eq("user_id", user.id)
      .eq("airbnb_url", airbnb_url)
      .maybeSingle();

    if (bestaand) {
      return NextResponse.json({ ok: true, abonnementId: bestaand.id, bestaand: true });
    }

    const { data: abo, error } = await supabase
      .from("abonnementen")
      .insert({
        user_id: user.id,
        airbnb_url,
        listing_naam: naam || null,
        voornaam: voornaam || null,
        frequentie: frequentie || "monthly",
        billing_interval: interval || "month",
        status: "trial",
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, abonnementId: abo.id });
  } catch (error) {
    console.error("Abonnement aanmaken fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
