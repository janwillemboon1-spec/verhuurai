import { createAdminClient } from "@/lib/supabase/admin";
import archiver from "archiver";
import { PassThrough } from "stream";

export const maxDuration = 120;

export async function GET(
  _request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  const sessieId = params["sessie-id"];
  const admin = createAdminClient();

  const { data: sessie } = await admin
    .from("foto_sessies")
    .select("id, naam, status")
    .eq("id", sessieId)
    .single();

  if (!sessie || sessie.status !== "klaar") {
    return new Response("Sessie niet gevonden of nog niet klaar", { status: 404 });
  }

  const { data: bewerkingen } = await admin
    .from("foto_bewerkingen")
    .select("volgnummer, ruimte, bewerkt_pad")
    .eq("sessie_id", sessieId)
    .eq("status", "klaar")
    .order("volgnummer", { ascending: true });

  if (!bewerkingen || bewerkingen.length === 0) {
    return new Response("Geen bewerkte foto's gevonden", { status: 404 });
  }

  // Alle bewerkte foto's downloaden en in ZIP stoppen
  const archive = archiver("zip", { zlib: { level: 5 } });
  const pass = new PassThrough();
  archive.pipe(pass);

  for (const b of bewerkingen) {
    if (!b.bewerkt_pad) continue;
    const { data: blob } = await admin.storage
      .from("foto-bewerkt")
      .download(b.bewerkt_pad);
    if (!blob) continue;
    const buffer = Buffer.from(await blob.arrayBuffer());
    const ruimteLabel = b.ruimte || "foto";
    const naam = `${String(b.volgnummer).padStart(3, "0")}_${ruimteLabel}_bewerkt.png`;
    archive.append(buffer, { name: naam });
  }

  await archive.finalize();

  // Stream bufferen
  const chunks: Buffer[] = [];
  for await (const chunk of pass) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const zipBuffer = Buffer.concat(chunks);

  const bestandsnaam = `hostboni-fotos-${sessieId.slice(0, 8)}.zip`;

  return new Response(zipBuffer, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${bestandsnaam}"`,
      "Content-Length": String(zipBuffer.length),
    },
  });
}
