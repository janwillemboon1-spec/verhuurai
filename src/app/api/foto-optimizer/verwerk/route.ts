import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verwerkSessie } from "@/lib/foto-optimizer/foto-verwerker";
import type { FotoVoortgang } from "@/types/foto-optimizer";

declare global {
  var fotoVoortgang: Map<string, FotoVoortgang>;
}
if (!global.fotoVoortgang) global.fotoVoortgang = new Map();

export async function POST(request: Request) {
  try {
    const { sessieId } = await request.json();
    if (!sessieId) {
      return NextResponse.json({ error: "sessieId verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: sessie, error } = await admin
      .from("foto_sessies")
      .select("id, status, aantal_fotos")
      .eq("id", sessieId)
      .single();

    if (error || !sessie) {
      return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
    }

    // Al klaar of al bezig: geen nieuwe verwerking starten
    if (sessie.status === "klaar") {
      return NextResponse.json({ ok: true, klaar: true });
    }
    if (sessie.status === "verwerking") {
      return NextResponse.json({ ok: true, alBezig: true });
    }
    if (sessie.status !== "betaald") {
      return NextResponse.json({ error: "Sessie niet betaald" }, { status: 403 });
    }

    // Status bijwerken naar verwerking
    await admin
      .from("foto_sessies")
      .update({ status: "verwerking" })
      .eq("id", sessieId);

    // In-memory voortgang initialiseren
    global.fotoVoortgang.set(sessieId, {
      sessieId,
      totaal: sessie.aantal_fotos,
      klaar: 0,
      overgeslagen: 0,
      fout: 0,
      huidigeFoto: null,
      status: "verwerking",
    });

    // Verwerking direct in hetzelfde process starten (geen HTTP-call, geen Railway proxy timeout)
    verwerkSessie(sessieId).catch((err) => {
      console.error("[verwerk] Achtergrond verwerking mislukt:", err);
      const huidig = global.fotoVoortgang.get(sessieId);
      if (huidig) global.fotoVoortgang.set(sessieId, { ...huidig, status: "fout" });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verwerk route fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
