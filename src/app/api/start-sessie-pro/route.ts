import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

declare global {
  var sessies: Map<string, any>;
}
if (!global.sessies) global.sessies = new Map();

export async function POST(request: Request) {
  try {
    const { naam, email, airbnbUrl, taal } = await request.json();

    if (!airbnbUrl || !airbnbUrl.includes("airbnb")) {
      return NextResponse.json({ error: "Geldige Airbnb URL is verplicht" }, { status: 400 });
    }

    const sessieId = randomUUID();

    global.sessies.set(sessieId, {
      naam: naam?.trim() || "Host",
      email: email?.trim() || "",
      airbnbUrl: airbnbUrl.trim(),
      taal: taal || "nl",
      aangemaakt: new Date().toISOString(),
    });

    return NextResponse.json({ sessieId });
  } catch (error) {
    console.error("Start sessie pro fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
