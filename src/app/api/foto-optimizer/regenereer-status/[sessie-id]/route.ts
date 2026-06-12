import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  const sessieId = params["sessie-id"];
  const admin = createAdminClient();

  const { data: sessie } = await admin
    .from("foto_sessies")
    .select("regeneratie_gedaan")
    .eq("id", sessieId)
    .single();

  const { data: bewerkingen } = await admin
    .from("foto_bewerkingen")
    .select("is_geregenereerd")
    .eq("sessie_id", sessieId)
    .not("feedback_toelichting", "is", null);

  const totaal = bewerkingen?.length || 0;
  const klaar = bewerkingen?.filter(b => b.is_geregenereerd).length || 0;

  return NextResponse.json({
    totaal,
    klaar,
    gedaan: sessie?.regeneratie_gedaan ?? false,
  });
}
