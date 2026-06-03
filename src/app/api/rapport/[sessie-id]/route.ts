import { NextResponse } from "next/server";

declare global {
  var rapporten: Map<string, any>;
}
if (!global.rapporten) global.rapporten = new Map();

export async function GET(
  _request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  try {
    const sessieId = params["sessie-id"];

    if (!sessieId) {
      return NextResponse.json({ error: "sessieId is verplicht" }, { status: 400 });
    }

    const stored = global.rapporten.get(sessieId);

    if (!stored) {
      return NextResponse.json({ error: "Rapport niet gevonden" }, { status: 404 });
    }

    return NextResponse.json({
      rapport: stored,
      hostNaam: stored.hostNaam,
      datum: stored.datum,
    });
  } catch (error) {
    console.error("Rapport ophalen fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
