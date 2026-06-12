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
    .select("id, naam, status, aantal_fotos, totaal_prijs, klaar_op")
    .eq("id", sessieId)
    .single();

  if (error || !sessie) {
    return NextResponse.json({ error: "Sessie niet gevonden" }, { status: 404 });
  }

  const { data: bewerkingen } = await admin
    .from("foto_bewerkingen")
    .select("id, volgnummer, ruimte, origineel_pad, bewerkt_pad, status, overgeslagen_reden, analyse_json")
    .eq("sessie_id", sessieId)
    .order("volgnummer", { ascending: true });

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;

  const bewerkingenMetUrls = (bewerkingen || []).map(b => ({
    ...b,
    origineelUrl: b.origineel_pad
      ? `${base}/storage/v1/object/public/foto-originelen/${b.origineel_pad}`
      : null,
    bewerktUrl: b.bewerkt_pad
      ? `${base}/storage/v1/object/public/foto-bewerkt/${b.bewerkt_pad}`
      : null,
  }));

  return NextResponse.json({ sessie, bewerkingen: bewerkingenMetUrls });
}
