import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === COCKPIT_EMAIL ? user : null;
}

export async function GET() {
  if (!await getUser()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin
    .from("cockpit_revenue_regels")
    .select("*")
    .order("aangemaakt_op", { ascending: true });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await getUser()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cockpit_revenue_regels")
    .insert({
      naam: body.naam,
      periode: body.periode,
      conditie: body.conditie,
      drempel: body.drempel,
      periode2: body.periode2 ?? null,
      conditie2: body.conditie2 ?? null,
      drempel2: body.drempel2 ?? null,
      aanpassing: body.aanpassing,
      scope: body.scope ?? "all",
      enabled: body.enabled ?? true,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
