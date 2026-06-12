import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verwerkMetSharp } from "@/lib/foto-optimizer/sharp-verwerking";
import { bewerkMetOpenAI } from "@/lib/foto-optimizer/openai-bewerking";

export const maxDuration = 600;

const REGELS_BLOK = `Goal: 5-star hotel photo quality — the lighting, sharpness, and polish of Four Seasons or Marriott photography. ALWAYS ALLOWED: (1) Correct camera perspective to natural standing eye-level. (2) Smooth wrinkled pillows, cushions, and bedding to look hotel-crisp. (3) Remove everyday clutter (cups, bags, clothing, cables, shoes). (4) Outdoor and view photos only: replace grey/overcast sky with blue sunny sky. NEVER: add furniture, lamps, or objects not explicitly instructed. Never place anything on the floor. Never move or change existing furniture, rugs, art, or accessories. Never change room layout. Never invent scenery. Never hide structural damage or stains. Photorealistic, not CGI.`;

export async function POST(request: Request) {
  const { sessieId } = await request.json();
  if (!sessieId) return NextResponse.json({ error: "sessieId verplicht" }, { status: 400 });

  const admin = createAdminClient();

  try {
    const { data: bewerkingen } = await admin
      .from("foto_bewerkingen")
      .select("id, volgnummer, origineel_pad, feedback_toelichting, feedback_type")
      .eq("sessie_id", sessieId)
      .not("feedback_toelichting", "is", null)
      .not("is_geregenereerd", "is", true)
      .order("volgnummer", { ascending: true })
      .limit(10);

    if (!bewerkingen || bewerkingen.length === 0) {
      // Toch afsluiten zodat de polling stopt
      await admin.from("foto_sessies").update({ regeneratie_gedaan: true }).eq("id", sessieId);
      return NextResponse.json({ ok: true, bericht: "Niets te regenereren" });
    }

    for (const bewerking of bewerkingen) {
      try {
        // Origineel downloaden
        const { data: blob } = await admin.storage
          .from("foto-originelen")
          .download(bewerking.origineel_pad);
        if (!blob) continue;

        const origineelBuffer = Buffer.from(await blob.arrayBuffer());
        const { buffer: sharpBuffer, isLandscape } = await verwerkMetSharp(origineelBuffer);

        // Prompt met gebruikersinstructie als primaire correctie
        const editPrompt = `Transform this vacation rental photo into a 5-star hotel quality photograph. CRITICAL CORRECTION — the user identified a specific problem with the previous result and provided this instruction: "${bewerking.feedback_toelichting}". Apply this as the primary correction. ${REGELS_BLOK}`;

        const resultBuffer = await bewerkMetOpenAI(sharpBuffer, editPrompt, isLandscape);

        // Opslaan op nieuw pad (cache busting via _r suffix)
        const bewerktPad = `${sessieId}/${String(bewerking.volgnummer).padStart(3, "0")}_bewerkt_r.png`;
        await admin.storage
          .from("foto-bewerkt")
          .upload(bewerktPad, resultBuffer, { contentType: "image/png", upsert: true });

        // DB bijwerken
        await admin
          .from("foto_bewerkingen")
          .update({
            bewerkt_pad: bewerktPad,
            is_geregenereerd: true,
          })
          .eq("id", bewerking.id);

      } catch (err) {
        console.error(`Regeneratie foto ${bewerking.volgnummer} mislukt:`, err);
      }
    }

    // Sessie markeren als geregenereerd
    await admin
      .from("foto_sessies")
      .update({ regeneratie_gedaan: true })
      .eq("id", sessieId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Regenereer-uitvoeren fout:", err);
    return NextResponse.json({ error: "Regeneratie mislukt" }, { status: 500 });
  }
}
