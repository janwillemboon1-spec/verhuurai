import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const { bezetting, adr, reviewscore, reviews_aantal,
          omzet_365d, meting_datum,
          omzet_periode_bedrag, omzet_periode_label, notitie } = body;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_kpi_metingen")
    .insert({
      klant_id: params.id,
      bezetting: bezetting ?? null,
      adr: adr ?? null,
      reviewscore: reviewscore ?? null,
      reviews_aantal: reviews_aantal ?? null,
      omzet_365d: omzet_365d ?? null,
      meting_datum: meting_datum ?? null,
      omzet_periode_bedrag: omzet_periode_bedrag ?? null,
      omzet_periode_label: omzet_periode_label ?? null,
      notitie: notitie ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ meting: data }, { status: 201 });
}
