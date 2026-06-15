import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { bewerkingId } = await request.json();
    if (!bewerkingId) {
      return NextResponse.json({ error: "bewerkingId verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Huidige staat ophalen en togglen
    const { data: bewerking } = await admin
      .from("foto_bewerkingen")
      .select("positief_beoordeeld")
      .eq("id", bewerkingId)
      .single();

    const nieuweWaarde = !bewerking?.positief_beoordeeld;

    const { error } = await admin
      .from("foto_bewerkingen")
      .update({ positief_beoordeeld: nieuweWaarde })
      .eq("id", bewerkingId);

    if (error) throw error;
    return NextResponse.json({ ok: true, positief: nieuweWaarde });
  } catch (err) {
    console.error("Positieve beoordeling toggle fout:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
