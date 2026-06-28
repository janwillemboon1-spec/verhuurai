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
    .from("cockpit_fin_overig")
    .select("*")
    .eq("jaar", jaar)
    .order("id");

  return NextResponse.json({ overig: data ?? [], jaar });
}

export async function POST(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cockpit_fin_overig")
    .insert({
      naam: body.naam,
      jaar: body.jaar ?? new Date().getFullYear(),
      jan: body.jan ?? 0, feb: body.feb ?? 0, mrt: body.mrt ?? 0,
      apr: body.apr ?? 0, mei: body.mei ?? 0, jun: body.jun ?? 0,
      jul: body.jul ?? 0, aug: body.aug ?? 0, sep: body.sep ?? 0,
      okt: body.okt ?? 0, nov: body.nov ?? 0, dec: body.dec ?? 0,
      actief: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
