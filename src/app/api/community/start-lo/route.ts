import { NextResponse } from "next/server";
import { verifieerCommunityToken } from "@/lib/community-tokens";
import { v4 as uuidv4 } from "uuid";

declare global {
  var sessies: Map<string, any>;
}
if (!global.sessies) global.sessies = new Map();

export async function POST(request: Request) {
  try {
    const { token } = await request.json();
    const email = verifieerCommunityToken(token);
    if (!email) {
      return NextResponse.json({ error: "Ongeldige of verlopen toegangstoken" }, { status: 401 });
    }

    const sessieId = uuidv4();
    global.sessies.set(sessieId, {
      id: sessieId,
      email,
      naam: email.split("@")[0],
      pakket: "listing-optimizer",
      credits: 1,
      gebruiktCredits: 0,
      aangemaakt: new Date().toISOString(),
      betaald: true,
      community: true,
    });

    return NextResponse.json({ sessieId });
  } catch (error) {
    console.error("Community start-lo fout:", error);
    return NextResponse.json({ error: "Sessie aanmaken mislukt" }, { status: 500 });
  }
}
