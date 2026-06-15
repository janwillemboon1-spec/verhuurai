import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { bewerkMetOpenAI } from "@/lib/foto-optimizer/openai-bewerking";

const ADMIN_EMAIL = "info@bnbassistant.com";

const REGELS_BLOK = `ROLE: World-class real estate photographer and image editor specialized in luxury vacation rentals and premium accommodations. GOAL: Optimize for maximum guest appeal and booking conversion. CRITICAL RULES — NEVER add furniture, decoration, plants, lighting, artwork, appliances, accessories or any objects. Never remove or move existing objects. Never change room layout, architecture or dimensions. Never apply virtual staging. Represent the property realistically. OPTIMIZE: light quality, white balance, sharpness, contrast, perspective correction, lens distortion, noise reduction, dynamic range, texture detail. TARGET: professional 5-star real estate photography — clean, luxurious, welcoming, photorealistic. Comparable to Airbnb Plus/Luxe and boutique hotel photography. Photorealistic result, not CGI.`;

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
      .select("id, sessie_id, volgnummer, origineel_pad, bewerkt_pad, analyse_json, gebruiker_herverwerkt_op")
      .eq("id", bewerkingId)
      .single();

    if (error || !bewerking) {
      return NextResponse.json({ error: "Foto niet gevonden" }, { status: 404 });
    }

    // Gebruiker mag slechts 1x herverwerken
    if (!isAdmin && bewerking.gebruiker_herverwerkt_op) {
      return NextResponse.json({ error: "Al herverwerkt" }, { status: 409 });
    }

    // Download de MEEST RECENTE versie: bewerkt_pad heeft voorrang op origineel
    let blob: Blob | null = null;
    if (bewerking.bewerkt_pad) {
      const { data } = await admin.storage.from("foto-bewerkt").download(bewerking.bewerkt_pad);
      blob = data;
    }
    if (!blob && bewerking.origineel_pad) {
      const { data } = await admin.storage.from("foto-originelen").download(bewerking.origineel_pad);
      blob = data;
    }

    if (!blob) {
      return NextResponse.json({ error: "Foto niet gevonden in storage" }, { status: 404 });
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
    const editPrompt = instructie?.trim()
      ? `Apply ONLY this specific change to this vacation rental photo: "${instructie.trim()}". Do NOT change anything else — keep all furniture, colors, lighting, layout, and architecture exactly as in the original. Photorealistic result. ${REGELS_BLOK}`
      : `Make minimal technical improvements to this vacation rental photo: slightly improve brightness and sharpness if needed. Keep everything else exactly as is. ${REGELS_BLOK}`;

    // OpenAI bewerking
    const resultBuffer = await bewerkMetOpenAI(sharpBuffer, editPrompt, isLandscape);

    // Nieuw pad (herverwerkt, admin of gebruiker)
    const sessieId = bewerking.sessie_id;
    const suffix = isAdmin ? `_ah${Date.now()}` : "_h";
    const bewerktPad = `${sessieId}/${String(bewerking.volgnummer).padStart(3, "0")}_bewerkt${suffix}.png`;

    const { error: uploadError } = await admin.storage
      .from("foto-bewerkt")
      .upload(bewerktPad, resultBuffer, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Upload herverwerk mislukt:", uploadError.message);
      return NextResponse.json({ error: "Upload mislukt: " + uploadError.message }, { status: 500 });
    }

    // DB updaten — alleen na succesvolle upload
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
