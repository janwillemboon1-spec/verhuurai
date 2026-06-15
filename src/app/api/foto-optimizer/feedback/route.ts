import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { bewerkingId, type, toelichting, verwijder } = await request.json();

    if (!bewerkingId) {
      return NextResponse.json({ error: "bewerkingId verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Feedback verwijderen
    if (verwijder) {
      const { error } = await admin
        .from("foto_bewerkingen")
        .update({ feedback_type: null, feedback_toelichting: null, feedback_op: null })
        .eq("id", bewerkingId);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (!type || !["fout_van_boni", "kwestie_van_smaak"].includes(type)) {
      return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    }

    const { error } = await admin
      .from("foto_bewerkingen")
      .update({
        feedback_type: type,
        feedback_toelichting: toelichting?.trim() || null,
        feedback_op: new Date().toISOString(),
      })
      .eq("id", bewerkingId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback opslaan fout:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
