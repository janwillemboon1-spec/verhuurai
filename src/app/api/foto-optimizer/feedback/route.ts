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

    // Auto-train triggeren als er genoeg "Fout van Boni" feedback is
    if (type === "fout_van_boni" && toelichting?.trim()) {
      const { count } = await admin
        .from("foto_bewerkingen")
        .select("id", { count: "exact", head: true })
        .eq("feedback_type", "fout_van_boni")
        .not("feedback_toelichting", "is", null);
      if ((count ?? 0) % 5 === 0 && (count ?? 0) > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
        fetch(`${baseUrl}/api/foto-optimizer/train`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminModus: false }),
        }).catch(err => console.error("Auto-train mislukt:", err));
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback opslaan fout:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
