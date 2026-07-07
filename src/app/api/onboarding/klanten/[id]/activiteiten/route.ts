import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_activiteiten")
    .select("*")
    .eq("klant_id", params.id)
    .order("datum", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activiteiten: data });
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  const body = await request.json();
  const { tekst, categorie, datum } = body;
  if (!tekst) return NextResponse.json({ error: "tekst is verplicht" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_activiteiten")
    .insert({
      klant_id: params.id,
      tekst,
      categorie: categorie || "overig",
      datum: datum || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ activiteit: data }, { status: 201 });
}
