import { NextResponse } from "next/server";
import { verwerkSessie } from "@/lib/foto-optimizer/foto-verwerker";

export const maxDuration = 600;

export async function POST(request: Request) {
  const { sessieId } = await request.json();
  if (!sessieId) {
    return NextResponse.json({ error: "sessieId verplicht" }, { status: 400 });
  }

  try {
    await verwerkSessie(sessieId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[verwerk-uitvoeren] Verwerking mislukt:", error);
    return NextResponse.json({ error: "Verwerking mislukt" }, { status: 500 });
  }
}
