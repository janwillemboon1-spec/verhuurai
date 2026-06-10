import { createClient } from "@/lib/supabase/server";
import { sendMessage } from "@/lib/hostaway";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const { id } = params;
  const { body } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Leeg bericht" }, { status: 400 });

  const ok = await sendMessage(parseInt(id), body);
  if (!ok) return NextResponse.json({ error: "Verzenden mislukt" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
