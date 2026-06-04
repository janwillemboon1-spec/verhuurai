import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

declare global {
  var rapporten: Map<string, any>;
  var sessies: Map<string, any>;
}

export async function POST(request: Request) {
  try {
    const { sessieId } = await request.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ opgeslagen: false, reden: "niet_ingelogd" });

    const rapport = global.rapporten?.get(sessieId);
    if (!rapport) return NextResponse.json({ opgeslagen: false, reden: "rapport_niet_gevonden" });

    const sessie = global.sessies?.get(sessieId);
    const sessieEmail = sessie?.email?.toLowerCase() ?? "";
    const userEmail = user.email?.toLowerCase() ?? "";

    // Alleen opslaan als emails overeenkomen
    if (sessieEmail && sessieEmail !== userEmail) {
      return NextResponse.json({ opgeslagen: false, reden: "email_mismatch" });
    }

    // Check of rapport al is opgeslagen
    const { data: bestaand } = await supabase
      .from("listing_rapporten")
      .select("id")
      .eq("user_id", user.id)
      .eq("sessie_id", sessieId)
      .maybeSingle();

    if (bestaand) {
      return NextResponse.json({ opgeslagen: true, bestaand: true });
    }

    await supabase.from("listing_rapporten").insert({
      user_id: user.id,
      sessie_id: sessieId,
      rapport_json: rapport,
      host_naam: rapport.hostNaam ?? sessie?.naam ?? null,
    });

    return NextResponse.json({ opgeslagen: true });
  } catch (error) {
    console.error("Rapport opslaan fout:", error);
    return NextResponse.json({ opgeslagen: false, reden: "fout" });
  }
}
