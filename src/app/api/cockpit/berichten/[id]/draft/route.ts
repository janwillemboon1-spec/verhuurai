import { createClient } from "@/lib/supabase/server";
import { getConversation } from "@/lib/hostaway";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const COCKPIT_EMAIL = "info@bnbassistant.com";
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const { id } = params;
  const conversationId = parseInt(id);
  const conv = await getConversation(conversationId);
  if (!conv) return NextResponse.json({ error: "Gesprek niet gevonden" }, { status: 404 });

  const messages = conv.conversationMessages ?? [];
  const lastGuestMessage = [...messages].reverse().find((m) => m.userId === null);
  if (!lastGuestMessage) return NextResponse.json({ error: "Geen gastbericht gevonden" }, { status: 400 });

  const conversationHistory = messages
    .slice(-10)
    .map((m) => `${m.userId === null ? "Gast" : "Host"}: ${m.body}`)
    .join("\n");

  // Detect guest language
  const langResponse = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 10,
    messages: [
      {
        role: "user",
        content: `Detecteer de taal van dit bericht en geef alleen de ISO 639-1 taalcode terug (bijv. "nl", "en", "de", "fr", "es"). Bericht: "${lastGuestMessage.body}"`,
      },
    ],
  });
  const detectedLang = langResponse.content[0].type === "text"
    ? langResponse.content[0].text.trim().slice(0, 2).toLowerCase()
    : "en";

  // Translate incoming message to Dutch (skip if already Dutch)
  let dutchLastMessage = lastGuestMessage.body;
  if (detectedLang !== "nl") {
    const translateIncoming = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Vertaal dit bericht naar het Nederlands. Geef ALLEEN de vertaling terug, geen uitleg.\n\n${lastGuestMessage.body}`,
        },
      ],
    });
    dutchLastMessage = translateIncoming.content[0].type === "text"
      ? translateIncoming.content[0].text
      : lastGuestMessage.body;
  }

  // Generate Dutch draft reply
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Je bent een behulpzame vakantieverhuur-assistent voor Jan Willem Boon. Schrijf een vriendelijk en professioneel antwoord op dit gastbericht in het Nederlands.

Gesprekgeschiedenis:
${conversationHistory}

Schrijf ALLEEN het antwoord in het Nederlands, geen uitleg of toelichting. Wees warm maar professioneel.
Als de gast vraagt om iets wat je kunt toezeggen (extra handdoeken, early check-in, late check-out), geef een vriendelijk antwoord maar laat de uiteindelijke beslissing open als je de details niet weet.`,
      },
    ],
  });
  const dutchDraft = response.content[0].type === "text" ? response.content[0].text : "";

  // Translate outgoing reply to guest language
  let translatedDraft = dutchDraft;
  if (detectedLang !== "nl") {
    const translateOutgoing = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Vertaal dit bericht naar ${detectedLang === "en" ? "het Engels" : detectedLang}. Geef ALLEEN de vertaling terug, geen uitleg.\n\n${dutchDraft}`,
        },
      ],
    });
    translatedDraft = translateOutgoing.content[0].type === "text"
      ? translateOutgoing.content[0].text
      : dutchDraft;
  }

  return NextResponse.json({
    dutchDraft,
    translatedDraft,
    detectedLang,
    guestName: conv.recipientName,
    lastMessage: dutchLastMessage,
    originalLastMessage: detectedLang !== "nl" ? lastGuestMessage.body : null,
  });
}
