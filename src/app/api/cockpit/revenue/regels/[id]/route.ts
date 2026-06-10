import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

async function getUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === COCKPIT_EMAIL ? user : null;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await getUser()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const body = await req.json();
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("cockpit_revenue_regels")
    .update(body)
    .eq("id", params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await getUser()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const admin = createAdminClient();
  const { error } = await admin
    .from("cockpit_revenue_regels")
    .delete()
    .eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
