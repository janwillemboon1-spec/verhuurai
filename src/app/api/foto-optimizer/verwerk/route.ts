import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verwerkSessie } from "@/lib/foto-optimizer/foto-verwerker";

// Lang timeout zodat Railway de verbinding niet vroegtijdig kapt
export const maxDuration = 600;

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

    if (sessie.status === "klaar") {
      return NextResponse.json({ ok: true, klaar: true });
    }
    if (sessie.status === "verwerking") {
      // Al bezig — wacht tot klaar en geef resultaat terug
      await verwerkSessie(sessieId);
      return NextResponse.json({ ok: true, klaar: true });
    }
    if (sessie.status !== "betaald") {
      return NextResponse.json({ error: "Sessie niet betaald" }, { status: 403 });
    }

    await admin
      .from("foto_sessies")
      .update({ status: "verwerking" })
      .eq("id", sessieId);

    // Synchrone verwerking: await zodat Next.js de promise nooit kanceleert
    // Als Railway de HTTP-verbinding kapt na 100s, blijft de Node.js code doorlopen
    // en worden DB-updates alsnog afgemaakt. De client vangt de connection error op
    // en start polling als fallback.
    await verwerkSessie(sessieId);

    return NextResponse.json({ ok: true, klaar: true });
  } catch (error) {
    console.error("[verwerk] Fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
