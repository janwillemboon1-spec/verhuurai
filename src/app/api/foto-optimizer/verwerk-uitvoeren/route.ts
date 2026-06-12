import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { analyseMetClaude } from "@/lib/foto-optimizer/claude-analyse";
import { bewerkMetOpenAI } from "@/lib/foto-optimizer/openai-bewerking";
import type { FotoVoortgang } from "@/types/foto-optimizer";

export const maxDuration = 600; // 10 minuten

declare global {
  var fotoVoortgang: Map<string, FotoVoortgang>;
}
if (!global.fotoVoortgang) global.fotoVoortgang = new Map();

async function verwerkEenFoto(
  sessieId: string,
  bewerking: { id: string; volgnummer: number; origineel_pad: string },
  gebruikteUitzonderingen: Set<string>
): Promise<string | null> { // geeft gebruikte uitzondering terug, of null
  const admin = createAdminClient();

  // Status: verwerking
  await admin
    .from("foto_bewerkingen")
    .update({ status: "verwerking" })
    .eq("id", bewerking.id);

  // Origineel downloaden van Supabase Storage
  const { data: blob, error: downloadError } = await admin.storage
    .from("foto-originelen")
    .download(bewerking.origineel_pad);

  if (downloadError || !blob) {
    throw new Error(`Download mislukt: ${downloadError?.message}`);
  }

  const origineelBuffer = Buffer.from(await blob.arrayBuffer());

  // Stap 1: Sharp basiscorrecties (dynamische import met fallback)
  let sharpBuffer: Buffer = origineelBuffer;
  let isLandscape = true;
  try {
    const { verwerkMetSharp } = await import("@/lib/foto-optimizer/sharp-verwerking");
    const sharpResultaat = await verwerkMetSharp(origineelBuffer);
    sharpBuffer = sharpResultaat.buffer;
    isLandscape = sharpResultaat.isLandscape;
    console.log(`Sharp OK foto ${bewerking.volgnummer}`);
  } catch (sharpErr) {
    console.error(`Sharp fout foto ${bewerking.volgnummer}, gebruik origineel:`, sharpErr);
  }

  // Stap 2: Claude Vision — ruimtedetectie + analyse + editprompt
  const analyse = await analyseMetClaude(sharpBuffer, gebruikteUitzonderingen);

  if (analyse.overgeslagen) {
    await admin
      .from("foto_bewerkingen")
      .update({
        status: "overgeslagen",
        overgeslagen_reden: analyse.overslaanReden,
        ruimte: analyse.ruimte,
        analyse_json: { overgeslagen: true, reden: analyse.overslaanReden },
        klaar_op: new Date().toISOString(),
      })
      .eq("id", bewerking.id);
    return null;
  }

  // Stap 3: OpenAI gpt-image-1 generatieve bewerking
  let resultBuffer: Buffer;
  let openaiGelukt = true;

  try {
    resultBuffer = await bewerkMetOpenAI(sharpBuffer, analyse.editPrompt, isLandscape);
  } catch (openaiErr) {
    console.error(`OpenAI fout foto ${bewerking.volgnummer}:`, openaiErr);
    // Fallback: Sharp-resultaat gebruiken
    resultBuffer = sharpBuffer;
    openaiGelukt = false;
  }

  // Resultaat uploaden naar foto-bewerkt bucket
  const ext = openaiGelukt ? "png" : "jpg";
  const bewerktPad = `${sessieId}/${String(bewerking.volgnummer).padStart(3, "0")}_bewerkt.${ext}`;
  const contentType = openaiGelukt ? "image/png" : "image/jpeg";

  const { error: uploadError } = await admin.storage
    .from("foto-bewerkt")
    .upload(bewerktPad, resultBuffer, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Upload bewerkt mislukt: ${uploadError.message}`);
  }

  // DB updaten
  await admin
    .from("foto_bewerkingen")
    .update({
      status: "klaar",
      ruimte: analyse.ruimte,
      bewerkt_pad: bewerktPad,
      analyse_json: {
        ruimte: analyse.ruimte,
        editPrompt: analyse.editPrompt,
        openaiGelukt,
        gebruikteUitzondering: analyse.gebruikteUitzondering,
      },
      klaar_op: new Date().toISOString(),
    })
    .eq("id", bewerking.id);

  return analyse.gebruikteUitzondering;
}

export async function POST(request: Request) {
  const { sessieId } = await request.json();
  if (!sessieId) {
    return NextResponse.json({ error: "sessieId verplicht" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    // Alle wachtende foto's ophalen
    const { data: bewerkingen, error } = await admin
      .from("foto_bewerkingen")
      .select("id, volgnummer, origineel_pad")
      .eq("sessie_id", sessieId)
      .eq("status", "wachtrij")
      .order("volgnummer", { ascending: true });

    if (error || !bewerkingen) {
      throw new Error("Foto's ophalen mislukt: " + error?.message);
    }

    // Bijhouden welke uitzonderingen al gebruikt zijn (A-E, max 1x per sessie)
    const gebruikteUitzonderingen = new Set<string>();

    // Sequentieel verwerken — nodig voor uitzondering-tracking
    for (const bewerking of bewerkingen) {
      const actueel = global.fotoVoortgang.get(sessieId);
      if (actueel) {
        global.fotoVoortgang.set(sessieId, {
          ...actueel,
          huidigeFoto: bewerking.volgnummer,
        });
      }

      try {
            const gebruikteUitzondering = await verwerkEenFoto(sessieId, bewerking, gebruikteUitzonderingen);
            if (gebruikteUitzondering) gebruikteUitzonderingen.add(gebruikteUitzondering);

            const huidig = global.fotoVoortgang.get(sessieId);
            if (huidig) {
              global.fotoVoortgang.set(sessieId, {
                ...huidig,
                klaar: huidig.klaar + 1,
              });
            }
          } catch (err) {
            console.error(`Foto ${bewerking.volgnummer} mislukt:`, err);

            await admin
              .from("foto_bewerkingen")
              .update({
                status: "fout",
                overgeslagen_reden: err instanceof Error ? err.message : "Onbekende fout",
                klaar_op: new Date().toISOString(),
              })
              .eq("id", bewerking.id);

            const huidig = global.fotoVoortgang.get(sessieId);
            if (huidig) {
              global.fotoVoortgang.set(sessieId, {
                ...huidig,
                fout: huidig.fout + 1,
              });
            }
      }
    }

    // Sessie afronden
    await admin
      .from("foto_sessies")
      .update({ status: "klaar", klaar_op: new Date().toISOString() })
      .eq("id", sessieId);

    const huidig = global.fotoVoortgang.get(sessieId);
    if (huidig) {
      global.fotoVoortgang.set(sessieId, { ...huidig, status: "klaar", huidigeFoto: null });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Verwerk-uitvoeren fout:", error);

    await admin
      .from("foto_sessies")
      .update({ status: "fout" })
      .eq("id", sessieId);

    const huidig = global.fotoVoortgang.get(sessieId);
    if (huidig) {
      global.fotoVoortgang.set(sessieId, { ...huidig, status: "fout" });
    }

    return NextResponse.json({ error: "Verwerking mislukt" }, { status: 500 });
  }
}
