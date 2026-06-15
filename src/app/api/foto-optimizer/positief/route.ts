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

    // Auto-train triggeren als er genoeg positieve feedback is (elke 10 likes)
    if (nieuweWaarde) {
      const { count } = await admin
        .from("foto_bewerkingen")
        .select("id", { count: "exact", head: true })
        .eq("positief_beoordeeld", true);
      if ((count ?? 0) % 10 === 0 && (count ?? 0) > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
        fetch(`${baseUrl}/api/foto-optimizer/train`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ adminModus: false }),
        }).catch(err => console.error("Auto-train mislukt:", err));
      }
    }

    return NextResponse.json({ ok: true, positief: nieuweWaarde });
  } catch (err) {
    console.error("Positieve beoordeling toggle fout:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
