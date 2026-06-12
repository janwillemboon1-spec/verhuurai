import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bewerkMetOpenAI } from "@/lib/foto-optimizer/openai-bewerking";

const ADMIN_EMAIL = "info@bnbassistant.com";

const REGELS_BLOK = `Goal: 5-star hotel photo quality — the lighting, sharpness, and polish of Four Seasons or Marriott photography. ALWAYS ALLOWED: (1) Correct camera perspective to natural standing eye-level. (2) Smooth wrinkled pillows, cushions, and bedding to look hotel-crisp. (3) Remove everyday clutter (cups, bags, clothing, cables, shoes). (4) Outdoor and view photos only: replace grey/overcast sky with blue sunny sky. NEVER: add furniture, lamps, or objects not explicitly instructed. Never place anything on the floor. Never move or change existing furniture, rugs, art, or accessories. Never change room layout. Never invent scenery. Never hide structural damage or stains. Photorealistic, not CGI.`;

export async function POST(request: Request) {
  try {
    const { bewerkingId, instructie, adminModus } = await request.json();
    if (!bewerkingId) {
      return NextResponse.json({ error: "bewerkingId verplicht" }, { status: 400 });
    }

    // Admin-check via sessie cookie
    let isAdmin = false;
    if (adminModus) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      isAdmin = user?.email === ADMIN_EMAIL;
      if (!isAdmin) {
        return NextResponse.json({ error: "Geen toegang" }, { status: 403 });
      }
    }

    const admin = createAdminClient();

    // Bewerking ophalen
    const { data: bewerking, error } = await admin
      .from("foto_bewerkingen")
      .select("id, sessie_id, volgnummer, origineel_pad, analyse_json, gebruiker_herverwerkt_op")
      .eq("id", bewerkingId)
      .single();

    if (error || !bewerking) {
      return NextResponse.json({ error: "Foto niet gevonden" }, { status: 404 });
    }

    // Gebruiker mag slechts 1x herverwerken
    if (!isAdmin && bewerking.gebruiker_herverwerkt_op) {
      return NextResponse.json({ error: "Al herverwerkt" }, { status: 409 });
    }

    // Origineel downloaden
    const { data: blob } = await admin.storage
      .from("foto-originelen")
      .download(bewerking.origineel_pad);

    if (!blob) {
      return NextResponse.json({ error: "Origineel niet gevonden" }, { status: 404 });
    }

    const origineelBuffer = Buffer.from(await blob.arrayBuffer());

    // Sharp (dynamisch, met fallback)
    let sharpBuffer: Buffer = origineelBuffer;
    let isLandscape = true;
    try {
      const { verwerkMetSharp } = await import("@/lib/foto-optimizer/sharp-verwerking");
      const r = await verwerkMetSharp(origineelBuffer);
      sharpBuffer = r.buffer;
      isLandscape = r.isLandscape;
    } catch (sharpErr) {
      console.error("Sharp fout herverwerk, gebruik origineel:", sharpErr);
    }

    // Prompt samenstellen: origineel + eventuele instructie
    const origineelPrompt = (bewerking.analyse_json as any)?.editPrompt as string | undefined;
    const basisPrompt = origineelPrompt || `Transform this vacation rental photo into a 5-star hotel quality photograph: ${REGELS_BLOK}`;
    const editPrompt = instructie?.trim()
      ? `${basisPrompt} SPECIFIC INSTRUCTION: "${instructie.trim()}". Apply this as a priority correction.`
      : basisPrompt;

    // OpenAI bewerking
    const resultBuffer = await bewerkMetOpenAI(sharpBuffer, editPrompt, isLandscape);

    // Nieuw pad (herverwerkt, admin of gebruiker)
    const sessieId = bewerking.sessie_id;
    const suffix = isAdmin ? `_ah${Date.now()}` : "_h";
    const bewerktPad = `${sessieId}/${String(bewerking.volgnummer).padStart(3, "0")}_bewerkt${suffix}.png`;

    await admin.storage
      .from("foto-bewerkt")
      .upload(bewerktPad, resultBuffer, { contentType: "image/png", upsert: true });

    // DB updaten
    const updates: Record<string, any> = { bewerkt_pad: bewerktPad };
    if (!isAdmin) updates.gebruiker_herverwerkt_op = new Date().toISOString();

    await admin
      .from("foto_bewerkingen")
      .update(updates)
      .eq("id", bewerkingId);

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const nieuweUrl = `${base}/storage/v1/object/public/foto-bewerkt/${bewerktPad}`;

    return NextResponse.json({ ok: true, nieuweUrl });
  } catch (err) {
    console.error("Herverwerk fout:", err);
    return NextResponse.json({ error: "Herverwerking mislukt" }, { status: 500 });
  }
}
