import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL ? user : null;
}

export async function GET() {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: leden, error } = await admin
    .from("community_leden")
    .select("*")
    .order("gesynchroniseerd_op", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ leden: leden || [] });
}

export async function POST(request: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const { email, dagelijkseDuur } = await request.json();
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
  }

  let verloopt_op: string | null = null;
  if (dagelijkseDuur && dagelijkseDuur > 0) {
    const datum = new Date();
    datum.setDate(datum.getDate() + dagelijkseDuur);
    verloopt_op = datum.toISOString();
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_leden")
    .upsert({
      email: email.toLowerCase().trim(),
      tag: "Handmatig",
      bron: "handmatig",
      verloopt_op,
      gesynchroniseerd_op: new Date().toISOString(),
    }, { onConflict: "email" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const { email } = await request.json();
  if (!email) return NextResponse.json({ error: "email verplicht" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_leden")
    .delete()
    .eq("email", email.toLowerCase().trim());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
