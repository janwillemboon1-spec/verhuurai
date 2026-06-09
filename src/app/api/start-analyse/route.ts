import { NextResponse } from "next/server";

declare global {
  var sessies: Map<string, any>;
  var rapporten: Map<string, any>;
  var rapportStatus: Map<string, "verwerking" | "klaar" | "fout">;
}
if (!global.sessies) global.sessies = new Map();
if (!global.rapporten) global.rapporten = new Map();
if (!global.rapportStatus) global.rapportStatus = new Map();

export async function POST(request: Request) {
  const { sessieId, formData, fotos } = await request.json();

  if (!sessieId || !formData) {
    return NextResponse.json({ error: "sessieId en formData verplicht" }, { status: 400 });
  }

  // Sla airbnbUrl op in sessie zodat de analyse-route hem altijd heeft
  const sessie = global.sessies.get(sessieId);
  if (sessie && formData?.airbnbUrl) {
    global.sessies.set(sessieId, { ...sessie, airbnbUrl: formData.airbnbUrl });
  }

  // Markeer als bezig
  global.rapportStatus.set(sessieId, "verwerking");

  // Start analyse op achtergrond — NIET awaiten
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  fetch(`${baseUrl}/api/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessieId, formData, fotos }),
  }).catch((err) => {
    console.error("Achtergrond analyse mislukt:", err);
    global.rapportStatus.set(sessieId, "fout");
  });

  // Direct teruggeven — client kan doorsturen naar /laden
  return NextResponse.json({ ok: true, sessieId });
}
