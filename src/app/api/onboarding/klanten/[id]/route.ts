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
  const { data: klant, error } = await admin
    .from("onboarding_klanten")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error || !klant) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const [
    { data: checklist },
    { data: todos },
    { data: activiteiten },
    { data: metingen },
  ] = await Promise.all([
    admin.from("onboarding_checklist_items").select("*").eq("klant_id", params.id).order("volgorde"),
    admin.from("onboarding_todos").select("*").eq("klant_id", params.id).order("aangemaakt_op"),
    admin.from("onboarding_activiteiten").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
    admin.from("onboarding_kpi_metingen").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
  ]);

  return NextResponse.json({ klant, checklist, todos, activiteiten, metingen });
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.naam !== undefined) updates.naam = body.naam;
  if (body.email !== undefined) updates.email = body.email;
  if (body.wachtwoord) updates.wachtwoord_hash = hashWachtwoord(body.wachtwoord);
  if (body.voornaam !== undefined) updates.voornaam = body.voornaam || null;
  if (body.achternaam !== undefined) updates.achternaam = body.achternaam || null;
  if (body.kpi_bezetting_nulmeting !== undefined) updates.kpi_bezetting_nulmeting = body.kpi_bezetting_nulmeting;
  if (body.kpi_adr_nulmeting !== undefined) updates.kpi_adr_nulmeting = body.kpi_adr_nulmeting;
  if (body.kpi_reviewscore_nulmeting !== undefined) updates.kpi_reviewscore_nulmeting = body.kpi_reviewscore_nulmeting;
  if (body.kpi_reviews_nulmeting !== undefined) updates.kpi_reviews_nulmeting = body.kpi_reviews_nulmeting;
  if (body.extra_omzet_periode !== undefined) updates.extra_omzet_periode = body.extra_omzet_periode;
  if (body.geen_cijfers_nulmeting !== undefined) updates.geen_cijfers_nulmeting = body.geen_cijfers_nulmeting;
  if (body.kpi_omzet_365d_nulmeting !== undefined) updates.kpi_omzet_365d_nulmeting = body.kpi_omzet_365d_nulmeting;

  const { data, error } = await admin
    .from("onboarding_klanten")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ klant: data });
}
