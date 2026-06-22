import { createAdminClient } from "@/lib/supabase/admin";
import { analyseMetClaude } from "@/lib/foto-optimizer/claude-analyse";

async function verwerkEenFoto(
  sessieId: string,
  bewerking: { id: string; volgnummer: number; origineel_pad: string },
  gebruikteUitzonderingen: Set<string>
): Promise<void> {
  const admin = createAdminClient();

  await admin
    .from("foto_bewerkingen")
    .update({ status: "verwerking" })
    .eq("id", bewerking.id);

  const { data: blob, error: downloadError } = await admin.storage
    .from("foto-originelen")
    .download(bewerking.origineel_pad);

  if (downloadError || !blob) {
    throw new Error(`Download mislukt: ${downloadError?.message}`);
  }

  const origineelBuffer = Buffer.from(await blob.arrayBuffer());

  let sharpBuffer: Buffer = origineelBuffer;
  let isLandscape = true;
  try {
    const { verwerkMetSharp } = await import("@/lib/foto-optimizer/sharp-verwerking");
    const sharpResultaat = await verwerkMetSharp(origineelBuffer);
    sharpBuffer = sharpResultaat.buffer;
    isLandscape = sharpResultaat.isLandscape;
    console.log(`[verwerker] Sharp OK foto ${bewerking.volgnummer}`);
  } catch (sharpErr) {
    console.error(`[verwerker] Sharp fout foto ${bewerking.volgnummer}, gebruik origineel:`, sharpErr);
  }

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
    return;
  }

  let resultBuffer: Buffer;
  let aiGelukt = true;

  try {
    const { bewerkMetOpenAI } = await import("@/lib/foto-optimizer/openai-bewerking");
    resultBuffer = await bewerkMetOpenAI(sharpBuffer, analyse.editPrompt, isLandscape);
  } catch (aiErr) {
    console.error(`[verwerker] gpt-image-1 fout foto ${bewerking.volgnummer}:`, aiErr);
    resultBuffer = sharpBuffer;
    aiGelukt = false;
  }

  const ext = aiGelukt ? "png" : "jpg";
  const bewerktPad = `${sessieId}/${String(bewerking.volgnummer).padStart(3, "0")}_bewerkt.${ext}`;
  const contentType = aiGelukt ? "image/png" : "image/jpeg";

  const { error: uploadError } = await admin.storage
    .from("foto-bewerkt")
    .upload(bewerktPad, resultBuffer, { contentType, upsert: true });

  if (uploadError) {
    throw new Error(`Upload bewerkt mislukt: ${uploadError.message}`);
  }

  console.log(`[verwerker] Upload OK foto ${bewerking.volgnummer}: ${bewerktPad}`);

  const { error: bewerktPadError } = await admin
    .from("foto_bewerkingen")
    .update({ bewerkt_pad: bewerktPad })
    .eq("id", bewerking.id);

  if (bewerktPadError) {
    console.error(`[verwerker] bewerkt_pad update mislukt foto ${bewerking.volgnummer}:`, bewerktPadError.message);
    throw new Error(`bewerkt_pad update mislukt: ${bewerktPadError.message}`);
  }

  const { error: statusError } = await admin
    .from("foto_bewerkingen")
    .update({
      status: "klaar",
      ruimte: analyse.ruimte,
      analyse_json: {
        ruimte: analyse.ruimte,
        editPrompt: analyse.editPrompt,
        aiGelukt,
      },
      klaar_op: new Date().toISOString(),
    })
    .eq("id", bewerking.id);

  if (statusError) {
    console.error(`[verwerker] status update mislukt foto ${bewerking.volgnummer}:`, statusError.message);
  }

  console.log(`[verwerker] Foto ${bewerking.volgnummer} klaar`);
}

export async function verwerkSessie(sessieId: string): Promise<void> {
  const admin = createAdminClient();

  // Haal alle nog te verwerken foto's op (wachtrij óf vastgelopen in verwerking)
  const { data: bewerkingen, error } = await admin
    .from("foto_bewerkingen")
    .select("id, volgnummer, origineel_pad")
    .eq("sessie_id", sessieId)
    .in("status", ["wachtrij", "verwerking"])
    .order("volgnummer", { ascending: true });

  if (error || !bewerkingen) {
    throw new Error("Foto's ophalen mislukt: " + error?.message);
  }

  console.log(`[verwerker] Start verwerking sessie ${sessieId}: ${bewerkingen.length} foto's`);

  const gebruikteUitzonderingen = new Set<string>();
  await Promise.all(
    bewerkingen.map(async (bewerking) => {
      try {
        await verwerkEenFoto(sessieId, bewerking, gebruikteUitzonderingen);
      } catch (err) {
        console.error(`[verwerker] Foto ${bewerking.volgnummer} mislukt:`, err);
        await admin
          .from("foto_bewerkingen")
          .update({
            status: "fout",
            overgeslagen_reden: err instanceof Error ? err.message : "Onbekende fout",
            klaar_op: new Date().toISOString(),
          })
          .eq("id", bewerking.id);
      }
    })
  );

  const { error: sessieError } = await admin
    .from("foto_sessies")
    .update({ status: "klaar", klaar_op: new Date().toISOString() })
    .eq("id", sessieId);

  if (sessieError) {
    console.error(`[verwerker] Sessie afronden mislukt:`, sessieError.message);
  } else {
    console.log(`[verwerker] Sessie ${sessieId} klaar`);
  }
}
