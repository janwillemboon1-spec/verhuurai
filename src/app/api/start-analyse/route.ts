import { createClient } from "@/lib/supabase/server";
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

  // Sessie updaten met airbnbUrl en (als nog niet aanwezig) auth-email
  const sessie = global.sessies.get(sessieId);
  const updates: Record<string, any> = {};
  if (formData?.airbnbUrl) updates.airbnbUrl = formData.airbnbUrl;
  if (sessie && !sessie.email) {
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) updates.email = user.email;
    } catch {}
  }
  if (sessie && Object.keys(updates).length > 0) {
    global.sessies.set(sessieId, { ...sessie, ...updates });
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
