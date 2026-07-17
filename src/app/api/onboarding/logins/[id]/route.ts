import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashWachtwoord } from "@/lib/onboarding/auth";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { data: login, error } = await admin
    .from("onboarding_logins")
    .select("id, voornaam, achternaam, email, link_token, aangemaakt_op")
    .eq("id", params.id)
    .single();

  if (error || !login) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  return NextResponse.json({ login });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.email !== undefined) updates.email = body.email;
  if (body.wachtwoord) updates.wachtwoord_hash = hashWachtwoord(body.wachtwoord);
  if (body.voornaam !== undefined) updates.voornaam = body.voornaam || null;
  if (body.achternaam !== undefined) updates.achternaam = body.achternaam || null;

  const { data, error } = await admin
    .from("onboarding_logins")
    .update(updates)
    .eq("id", params.id)
    .select("id, voornaam, achternaam, email, link_token, aangemaakt_op")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ login: data });
}
