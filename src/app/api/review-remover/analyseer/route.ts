import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  buildReviewRemoverSystemPrompt,
  buildReviewRemoverUserPrompt,
} from "@/lib/review-remover-prompt";

const BUCKET = "review-remover-bewijs";

function mediaTypeFromPad(
  pad: string
): "image/jpeg" | "image/png" | "image/webp" {
  if (pad.endsWith(".png")) return "image/png";
  if (pad.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

async function callClaude(
  client: Anthropic,
  systemPrompt: string,
  userContent: Anthropic.MessageParam["content"]
): Promise<string> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userContent }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Onverwacht antwoordtype van Claude");
  }

  return content.text
    .replace(/^```(?:json)?\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { naam, email, taal, reviewTekst, sterren, context, screenshotPaden } =
      body;

    // Input validatie
    if (!naam?.trim() || !email?.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Naam en geldig e-mailadres zijn verplicht" },
        { status: 400 }
      );
    }
    if (!reviewTekst?.trim()) {
      return NextResponse.json(
        { error: "Review-tekst is verplicht" },
        { status: 400 }
      );
    }
    if (!Number.isInteger(sterren) || sterren < 1 || sterren > 5) {
      return NextResponse.json(
        { error: "Sterrenbeoordeling moet 1 t/m 5 zijn" },
        { status: 400 }
      );
    }
    const paden: string[] = Array.isArray(screenshotPaden)
      ? screenshotPaden.slice(0, 5)
      : [];

    // Rate limiting voor de Claude API call
    if (!checkRateLimit(email.trim().toLowerCase(), 5)) {
      return NextResponse.json(
        {
          error:
            "Te veel aanvragen vanaf dit e-mailadres. Probeer het over een uur opnieuw.",
        },
        { status: 429 }
      );
    }

    const admin = createAdminClient();

    // Screenshots downloaden uit Storage en omzetten naar base64 voor Claude vision
    const screenshotBlocks = await Promise.all(
      paden.map(async (pad) => {
        const { data, error } = await admin.storage.from(BUCKET).download(pad);
        if (error || !data)
          throw new Error(`Screenshot downloaden mislukt: ${pad}`);
        const buffer = Buffer.from(await data.arrayBuffer());
        return {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaTypeFromPad(pad),
            data: buffer.toString("base64"),
          },
        };
      })
    );

    const taalGekozen = taal === "en" ? "en" : "nl";
    const systemPrompt = buildReviewRemoverSystemPrompt(taalGekozen);
    const userPrompt = buildReviewRemoverUserPrompt({
      reviewTekst: reviewTekst.trim(),
      sterren,
      context: context?.trim(),
      aantalScreenshots: screenshotBlocks.length,
    });

    const userContent: Anthropic.MessageParam["content"] = [
      { type: "text", text: userPrompt },
    ];
    for (const block of screenshotBlocks) {
      userContent.push({ type: "text", text: "Bewijs-screenshot:" });
      userContent.push(block);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Eerste poging
    let parsed: Record<string, unknown> | null = null;
    let raw = await callClaude(client, systemPrompt, userContent);

    try {
      parsed = JSON.parse(raw);
    } catch {
      // Eén retry bij JSON parse fout
      console.warn(
        "Review Remover: eerste JSON parse mislukt, retry...",
        raw.slice(0, 200)
      );
      raw = await callClaude(client, systemPrompt, userContent);
      parsed = JSON.parse(raw); // Gooit opnieuw als het nog steeds mislukt → outer catch vangt 500
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const screenshotUrls = paden.map(
      (pad) =>
        `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${pad}`
    );

    const { data: rapport, error: insertError } = await admin
      .from("review_remover_rapporten")
      .insert({
        naam: naam.trim(),
        email: email.trim(),
        taal: taalGekozen,
        review_tekst: reviewTekst.trim(),
        sterren,
        context: context?.trim() || null,
        screenshot_urls: screenshotUrls,
        verdict: parsed!.verdict,
        onderbouwing: parsed!.onderbouwing,
        toegepaste_regels: parsed!.toegepaste_regels ?? [],
        bezwaarbrief: parsed!.bezwaarbrief,
        stappenplan: parsed!.stappenplan ?? [],
      })
      .select("id")
      .single();

    if (insertError || !rapport) {
      throw new Error("Rapport opslaan mislukt: " + insertError?.message);
    }

    return NextResponse.json({
      id: rapport.id,
      verdict: parsed!.verdict,
      onderbouwing: parsed!.onderbouwing,
      toegepaste_regels: parsed!.toegepaste_regels ?? [],
      bezwaarbrief: parsed!.bezwaarbrief,
      stappenplan: parsed!.stappenplan ?? [],
    });
  } catch (error) {
    console.error("Review Remover analyseer fout:", error);
    return NextResponse.json(
      {
        error:
          "Er ging iets mis bij het analyseren van de recensie. Probeer het zo opnieuw.",
      },
      { status: 500 }
    );
  }
}
