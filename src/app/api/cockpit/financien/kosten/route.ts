import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === COCKPIT_EMAIL ? user : null;
}

export async function GET(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const url = new URL(req.url);
  const jaar = parseInt(url.searchParams.get("jaar") ?? String(new Date().getFullYear()));
  const admin = createAdminClient();

  const { data } = await admin
    .from("cockpit_fin_kosten")
    .select("*")
    .eq("jaar", jaar)
    .order("sort_order");

  return NextResponse.json({ kosten: data ?? [], jaar });
}

const MAAND_KEYS = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"] as const;

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  // Voor 'maandelijks'-posten: als de client geen expliciete maandbedragen meestuurt
  // (bv. een directe API-aanroep zonder de grid-UI), vullen we ze af op basis van
  // bedrag + van_maand/tot_maand, zoals het oude gedrag. De cockpit-UI stuurt altijd
  // expliciete waarden mee (zie KostenModal), dus dit is een defensieve fallback.
  const maandVelden: Record<string, number> = {};
  if (body.frequentie === "maandelijks") {
    const heeftExpliciteMaanden = MAAND_KEYS.some(m => body[m] !== undefined);
    if (heeftExpliciteMaanden) {
      for (const m of MAAND_KEYS) maandVelden[m] = body[m] ?? 0;
    } else {
      const van = body.van_maand ?? 1;
      const tot = body.tot_maand ?? 12;
      MAAND_KEYS.forEach((m, i) => {
        maandVelden[m] = (i + 1 >= van && i + 1 <= tot) ? body.bedrag : 0;
      });
    }
  }

  const { data, error } = await admin
    .from("cockpit_fin_kosten")
    .insert({
      naam: body.naam,
      categorie: body.categorie,
      bedrag: body.bedrag,
      frequentie: body.frequentie,
      betaalmaand: body.betaalmaand ?? null,
      van_maand: body.van_maand ?? null,
      tot_maand: body.tot_maand ?? null,
      jaar: body.jaar ?? new Date().getFullYear(),
      actief: true,
      ...maandVelden,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
