import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifieerCommunityToken } from "@/lib/community-tokens";

export async function POST(request: Request) {
  try {
    const { token, airbnb_url, listing_naam, voornaam, taal } = await request.json();

    const email = verifieerCommunityToken(token);
    if (!email) {
      return NextResponse.json({ error: "Ongeldige of verlopen toegangstoken" }, { status: 401 });
    }

    if (!airbnb_url || !airbnb_url.includes("airbnb.")) {
      return NextResponse.json({ error: "Geldige Airbnb URL verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Vind of maak Supabase gebruiker
    let userId: string;
    try {
      const { data: nieuw } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
      });
      userId = nieuw.user!.id;
    } catch {
      const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
      const bestaand = users?.users.find((u) => u.email?.toLowerCase() === email);
      if (!bestaand) {
        return NextResponse.json({ error: "Gebruiker aanmaken mislukt" }, { status: 500 });
      }
      userId = bestaand.id;
    }

    // Voorkom duplicaten: check of er al een abonnement is met dit token
    const { data: bestaand } = await admin
      .from("abonnementen")
      .select("id")
      .eq("stripe_session_id", token)
      .maybeSingle();

    if (bestaand) {
      return NextResponse.json({ abonnementId: bestaand.id, token });
    }

    const { data: abo } = await admin
      .from("abonnementen")
      .insert({
        user_id: userId,
        airbnb_url: airbnb_url.trim(),
        listing_naam: listing_naam?.trim() || null,
        voornaam: voornaam?.trim() || null,
        taal: taal || "nl",
        frequentie: "eenmalig",
        status: "active",
        stripe_session_id: token,
      })
      .select()
      .single();

    if (!abo) {
      return NextResponse.json({ error: "Abonnement aanmaken mislukt" }, { status: 500 });
    }

    return NextResponse.json({ abonnementId: abo.id, token });
  } catch (error) {
    console.error("Community start-hp fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
