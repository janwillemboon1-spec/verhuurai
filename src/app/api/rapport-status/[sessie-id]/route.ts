import { NextResponse } from "next/server";

declare global {
  var rapportStatus: Map<string, "verwerking" | "klaar" | "fout">;
}
if (!global.rapportStatus) global.rapportStatus = new Map();

export async function GET(
  _request: Request,
  { params }: { params: { "sessie-id": string } }
) {
  try {
    const sessieId = params["sessie-id"];

    if (!sessieId) {
      return NextResponse.json({ error: "sessieId is verplicht" }, { status: 400 });
    }

    const status = global.rapportStatus.get(sessieId);

    if (!status) {
      return NextResponse.json({ status: "niet_gevonden" });
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Rapport status fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
