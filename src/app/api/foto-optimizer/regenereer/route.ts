import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { sessieId } = await request.json();
    if (!sessieId) return NextResponse.json({ error: "sessieId verplicht" }, { status: 400 });

    const admin = createAdminClient();

    const { data: sessie } = await admin
      .from("foto_sessies")
      .select("id, status, regeneratie_gedaan")
      .eq("id", sessieId)
      .single();

    if (!sessie) return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
    if (sessie.regeneratie_gedaan) return NextResponse.json({ error: "Al geregenereerd" }, { status: 409 });

    const { data: kandidaten } = await admin
      .from("foto_bewerkingen")
      .select("id")
      .eq("sessie_id", sessieId)
      .not("feedback_toelichting", "is", null)
      .eq("is_geregenereerd", false)
      .limit(10);

    if (!kandidaten || kandidaten.length === 0) {
      return NextResponse.json({ error: "Geen foto's met toelichting" }, { status: 400 });
    }

    // Achtergrondverwerking starten
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
    fetch(`${baseUrl}/api/foto-optimizer/regenereer-uitvoeren`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessieId }),
    }).catch(err => console.error("Regenereer achtergrond fout:", err));

    return NextResponse.json({ ok: true, aantalFotos: kandidaten.length });
  } catch (err) {
    console.error("Regenereer starten fout:", err);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
