import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { hashWachtwoord } from "@/lib/onboarding/auth";

const ADMIN_EMAIL = "info@bnbassistant.com";

const STANDAARD_CHECKLIST = [
  { fase: "Advertentie optimalisatie", naam: "Advertentietitel geanalyseerd", volgorde: 1 },
  { fase: "Advertentie optimalisatie", naam: "Omschrijving herschreven", volgorde: 2 },
  { fase: "Advertentie optimalisatie", naam: "Foto's beoordeeld en aanbevelingen gegeven", volgorde: 3 },
  { fase: "Advertentie optimalisatie", naam: "Voorzieningenlijst gecontroleerd", volgorde: 4 },
  { fase: "Advertentie optimalisatie", naam: "Huisregels gecheckt", volgorde: 5 },
  { fase: "Prijsstrategie", naam: "Basisprijs ingesteld", volgorde: 6 },
  { fase: "Prijsstrategie", naam: "Weekendtoeslag geconfigureerd", volgorde: 7 },
  { fase: "Prijsstrategie", naam: "Seizoensprijzen ingesteld", volgorde: 8 },
  { fase: "Prijsstrategie", naam: "Minimum nachten bepaald", volgorde: 9 },
  { fase: "Prijsstrategie", naam: "Last-minute korting ingesteld", volgorde: 10 },
  { fase: "Reviews & profiel", naam: "Reviews geanalyseerd", volgorde: 11 },
  { fase: "Reviews & profiel", naam: "Antwoordstrategie bepaald", volgorde: 12 },
  { fase: "Reviews & profiel", naam: "Host profiel beoordeeld", volgorde: 13 },
  { fase: "Go-live", naam: "Alles gereviewed", volgorde: 14 },
  { fase: "Go-live", naam: "Klant geïnformeerd", volgorde: 15 },
  { fase: "Go-live", naam: "Live gegaan", volgorde: 16 },
];

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_klanten")
    .select("*, onboarding_checklist_items(id, voltooid), onboarding_todos(id, gedaan)")
    .order("aangemaakt_op", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ klanten: data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const body = await request.json();
  const { naam, email, wachtwoord, kpi_bezetting_nulmeting, kpi_adr_nulmeting,
          kpi_reviewscore_nulmeting, kpi_reviews_nulmeting, extra_omzet_periode } = body;

  if (!naam || !email || !wachtwoord) {
    return NextResponse.json({ error: "naam, email en wachtwoord zijn verplicht" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: klant, error } = await admin
    .from("onboarding_klanten")
    .insert({
      naam,
      email,
      wachtwoord_hash: hashWachtwoord(wachtwoord),
      kpi_bezetting_nulmeting: kpi_bezetting_nulmeting ?? null,
      kpi_adr_nulmeting: kpi_adr_nulmeting ?? null,
      kpi_reviewscore_nulmeting: kpi_reviewscore_nulmeting ?? null,
      kpi_reviews_nulmeting: kpi_reviews_nulmeting ?? null,
      extra_omzet_periode: extra_omzet_periode || "afgelopen 30 dagen",
    })
    .select()
    .single();

  if (error || !klant) return NextResponse.json({ error: error?.message || "Aanmaken mislukt" }, { status: 500 });

  const checklistItems = STANDAARD_CHECKLIST.map(item => ({
    klant_id: klant.id,
    fase: item.fase,
    naam: item.naam,
    volgorde: item.volgorde,
  }));
  await admin.from("onboarding_checklist_items").insert(checklistItems);

  return NextResponse.json({ klant }, { status: 201 });
}
