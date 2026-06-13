import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { bewerkMetOpenAI } from "@/lib/foto-optimizer/openai-bewerking";

export const maxDuration = 600;

const REGELS_BLOK = `ROLE: World-class real estate photographer and image editor specialized in luxury vacation rentals and premium accommodations. GOAL: Optimize for maximum guest appeal and booking conversion. CRITICAL RULES — NEVER add furniture, decoration, plants, lighting, artwork, appliances, accessories or any objects. Never remove or move existing objects. Never change room layout, architecture or dimensions. Never apply virtual staging. Represent the property realistically. OPTIMIZE: light quality, white balance, sharpness, contrast, perspective correction, lens distortion, noise reduction, dynamic range, texture detail. TARGET: professional 5-star real estate photography — clean, luxurious, welcoming, photorealistic. Comparable to Airbnb Plus/Luxe and boutique hotel photography. Photorealistic result, not CGI.`;

export async function POST(request: Request) {
  const { sessieId } = await request.json();
  if (!sessieId) return NextResponse.json({ error: "sessieId verplicht" }, { status: 400 });

  const admin = createAdminClient();

  try {
    const { data: bewerkingen } = await admin
      .from("foto_bewerkingen")
      .select("id, volgnummer, origineel_pad, feedback_toelichting, feedback_type, analyse_json")
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
        let sharpBuffer: Buffer = origineelBuffer;
        let isLandscape = true;
        try {
          const { verwerkMetSharp } = await import("@/lib/foto-optimizer/sharp-verwerking");
          const r = await verwerkMetSharp(origineelBuffer);
          sharpBuffer = r.buffer;
          isLandscape = r.isLandscape;
        } catch (sharpErr) {
          console.error("Sharp fout regeneratie, gebruik origineel:", sharpErr);
        }

        // Origineel prompt uit analyse_json ophalen + toelichting toevoegen
        const origineelPrompt = (bewerking.analyse_json as any)?.editPrompt as string | undefined;
        const basisPrompt = origineelPrompt || `Transform this vacation rental photo into a 5-star hotel quality photograph: ${REGELS_BLOK}`;
        const editPrompt = `${basisPrompt} ADDITIONAL CORRECTION FOR THIS SPECIFIC PHOTO: "${bewerking.feedback_toelichting}". Apply this correction specifically for this photo.`;

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
