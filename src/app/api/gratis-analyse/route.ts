import Anthropic from "@anthropic-ai/sdk";
import { buildTitelPrompt } from "@/lib/boni-prompt";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

function kapTitelAf(titel: string): string {
  if (titel.length <= 50) return titel;
  const afgekapt = titel.slice(0, 50);
  const lastSpace = afgekapt.lastIndexOf(" ");
  return lastSpace > 30 ? afgekapt.slice(0, lastSpace).trimEnd() : afgekapt.trimEnd();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { titel, airbnbUrl, recensies, naam, email } = body;

    if (!titel || typeof titel !== "string") {
      return NextResponse.json({ error: "Titel is verplicht" }, { status: 400 });
    }

    if (titel.trim().length > 100) {
      return NextResponse.json({ error: "Titel mag maximaal 100 tekens bevatten" }, { status: 400 });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: buildTitelPrompt(titel.trim(), airbnbUrl?.trim(), recensies?.trim()),
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Onverwacht antwoordtype van Claude");
    }

    const raw = content.text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed.herschreven_versies)) {
      parsed.herschreven_versies = parsed.herschreven_versies.map((v: { versie: string; tekens: number; uitleg: string }) => {
        const versie = kapTitelAf(v.versie);
        return { ...v, versie, tekens: versie.length };
      });
    }

    // Opslaan in Supabase (fire-and-forget, blokkeer response niet)
    try {
      const admin = createAdminClient();
      await admin.from("gratis_rapporten").insert({
        naam: naam?.trim() || null,
        email: email?.trim() || null,
        airbnb_url: airbnbUrl?.trim() || null,
        titel: titel.trim(),
      });
    } catch (e) {
      console.error("Gratis rapport opslaan mislukt:", e);
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Gratis analyse fout:", error);
    return NextResponse.json(
      { error: "Boni heeft even een technisch probleem. Probeer het zo nog eens!" },
      { status: 500 }
    );
  }
}
