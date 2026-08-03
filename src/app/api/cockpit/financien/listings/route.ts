import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === COCKPIT_EMAIL ? user : null;
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("cockpit_commissie_config")
    .select("*")
    .order("sort_order");

  return NextResponse.json({ listings: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  const { data: maxRow } = await admin
    .from("cockpit_commissie_config")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const volgendeSortOrder = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await admin
    .from("cockpit_commissie_config")
    .insert({
      listing_id: body.listing_id,
      listing_naam: body.listing_naam,
      pms: body.pms,
      model: body.model,
      tarief: body.tarief ?? null,
      tarief_1_2: body.tarief_1_2 ?? null,
      tarief_3: body.tarief_3 ?? null,
      tarief_4plus: body.tarief_4plus ?? null,
      groeit_mee: body.groeit_mee ?? true,
      actief: body.actief ?? true,
      van_maand: body.van_maand ?? 1,
      tot_maand: body.tot_maand ?? 12,
      sort_order: volgendeSortOrder,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
