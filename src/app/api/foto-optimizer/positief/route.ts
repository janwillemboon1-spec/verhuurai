import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const { bewerkingId } = await request.json();
    if (!bewerkingId) {
      return NextResponse.json({ error: "bewerkingId verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("foto_bewerkingen")
      .update({ positief_beoordeeld: true })
      .eq("id", bewerkingId);

    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Positieve beoordeling opslaan fout:", err);
    return NextResponse.json({ error: "Opslaan mislukt" }, { status: 500 });
  }
}
