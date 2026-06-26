import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  const sessieId = params["sessie-id"];
  const admin = createAdminClient();

  const { data: sessie, error } = await admin
    .from("foto_sessies")
    .select("id, naam, status, aantal_fotos, totaal_prijs, klaar_op, regeneratie_gedaan")
    .eq("id", sessieId)
    .single();

  if (error || !sessie) {
    return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
  }

  const { data: bewerkingen } = await admin
    .from("foto_bewerkingen")
    .select("id, volgnummer, ruimte, origineel_pad, bewerkt_pad, status, overgeslagen_reden, analyse_json, feedback_type, feedback_toelichting, is_geregenereerd, gebruiker_herverwerkt_op, positief_beoordeeld")
    .eq("sessie_id", sessieId)
    .order("volgnummer", { ascending: true });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const bewerkingenMetUrls = (bewerkingen || []).map(b => {
    // Als bewerkt_pad in DB ontbreekt maar upload wél gelukt is (status "verwerking" of
    // "wachtrij" = DB-update faalde na upload), reconstrueer het verwachte pad.
    // "fout" en "overgeslagen" krijgen geen fallback — bij die statussen is er geen bestand.
    const kanFallback = !b.bewerkt_pad && b.status !== "fout" && b.status !== "overgeslagen";
    const bewerktPad = b.bewerkt_pad
      ?? (kanFallback
        ? `${sessieId}/${String(b.volgnummer).padStart(3, "0")}_bewerkt.png`
        : null);

    return {
      ...b,
      origineelUrl: b.origineel_pad
        ? `${base}/storage/v1/object/public/foto-originelen/${b.origineel_pad}`
        : null,
      bewerktUrl: bewerktPad
        ? `${base}/storage/v1/object/public/foto-bewerkt/${bewerktPad}`
        : null,
    };
  });

  return NextResponse.json({ sessie, bewerkingen: bewerkingenMetUrls });
}
