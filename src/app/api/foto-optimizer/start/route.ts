import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOrCreateUser } from "@/lib/supabase/get-or-create-user";
import { berekenPrijs } from "@/lib/foto-optimizer/pricing";

function extFromType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const { naam, email, fotos } = await request.json();

    if (!naam?.trim() || !email?.trim() || !Array.isArray(fotos) || fotos.length === 0) {
      return NextResponse.json({ error: "Ongeldige invoer" }, { status: 400 });
    }
    if (fotos.length > 50) {
      return NextResponse.json({ error: "Maximaal 50 foto's toegestaan" }, { status: 400 });
    }

    const admin = createAdminClient();
    const prijsBerekening = berekenPrijs(fotos.length);

    const { userId } = await getOrCreateUser(email.trim());

    // Sessie aanmaken in DB
    const { data: sessie, error: sessieError } = await admin
      .from("foto_sessies")
      .insert({
        naam: naam.trim(),
        email: email.trim(),
        user_id: userId,
        status: "upload_bezig",
        aantal_fotos: fotos.length,
        totaal_prijs: prijsBerekening.totaal,
      })
      .select("id")
      .single();

    if (sessieError || !sessie) {
      throw new Error("Sessie aanmaken mislukt: " + sessieError?.message);
    }

    const sessieId = sessie.id;

    // Paden bepalen per foto (vóór insert zodat origineel_pad direct mee kan)
    const fotoPaden = fotos.map((f: { volgnummer: number; type: string }) => ({
      volgnummer: f.volgnummer,
      pad: `${sessieId}/${String(f.volgnummer).padStart(3, "0")}.${extFromType(f.type)}`,
    }));

    // foto_bewerkingen aanmaken inclusief origineel_pad
    await admin.from("foto_bewerkingen").insert(
      fotoPaden.map(f => ({
        sessie_id: sessieId,
        volgnummer: f.volgnummer,
        origineel_pad: f.pad,
        status: "wachtrij",
      }))
    );

    // Signed upload URLs genereren per foto
    const uploadTokens = await Promise.all(
      fotoPaden.map(async f => {
        const { data, error } = await admin.storage
          .from("foto-originelen")
          .createSignedUploadUrl(f.pad);
        if (error || !data) throw new Error("Upload URL genereren mislukt");
        return { volgnummer: f.volgnummer, pad: f.pad, token: data.token };
      })
    );

    return NextResponse.json({ sessieId, uploadTokens });
  } catch (error) {
    console.error("Foto optimizer start fout:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het starten" }, { status: 500 });
  }
}
