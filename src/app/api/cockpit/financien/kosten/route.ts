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

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

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
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
