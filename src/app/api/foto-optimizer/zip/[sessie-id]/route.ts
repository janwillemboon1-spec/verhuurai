import { createAdminClient } from "@/lib/supabase/admin";
import { zipSync, strToU8 } from "fflate";

export const maxDuration = 120;

export async function GET(
  _request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  const sessieId = params["sessie-id"];
  const admin = createAdminClient();

  const { data: sessie } = await admin
    .from("foto_sessies")
    .select("id, status")
    .eq("id", sessieId)
    .single();

  if (!sessie || sessie.status !== "klaar") {
    return new Response("Sessie niet gevonden of nog niet klaar", { status: 404 });
  }

  const { data: bewerkingen } = await admin
    .from("foto_bewerkingen")
    .select("volgnummer, ruimte, bewerkt_pad")
    .eq("sessie_id", sessieId)
    .not("bewerkt_pad", "is", null)
    .order("volgnummer", { ascending: true });

  if (!bewerkingen || bewerkingen.length === 0) {
    return new Response("Geen bewerkte foto's gevonden", { status: 404 });
  }

  // Download alle bewerkte foto's en verzamel in object voor fflate
  const bestanden: Record<string, Uint8Array> = {};

  await Promise.all(
    bewerkingen.map(async (b) => {
      if (!b.bewerkt_pad) return;
      const { data: blob } = await admin.storage
        .from("foto-bewerkt")
        .download(b.bewerkt_pad);
      if (!blob) return;
      const buffer = await blob.arrayBuffer();
      const ruimteLabel = b.ruimte || "foto";
      const naam = `${String(b.volgnummer).padStart(3, "0")}_${ruimteLabel}_bewerkt.png`;
      bestanden[naam] = new Uint8Array(buffer);
    })
  );

  if (Object.keys(bestanden).length === 0) {
    return new Response("Foto's konden niet worden gedownload", { status: 500 });
  }

  const zipBuffer = zipSync(bestanden, { level: 6 });
  const bestandsnaam = `hostboni-fotos-${sessieId.slice(0, 8)}.zip`;

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${bestandsnaam}"`,
      "Content-Length": String(zipBuffer.length),
    },
  });
}
