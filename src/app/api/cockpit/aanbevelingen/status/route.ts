import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === COCKPIT_EMAIL ? user : null;
}

export async function GET() {
  if (!await auth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const admin = createAdminClient();
  const { data } = await admin.from("cockpit_aanbeveling_status").select("*");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const { listing_id, trigger_type, status } = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("cockpit_aanbeveling_status").upsert(
    { listing_id, trigger_type, status, bijgewerkt_op: new Date().toISOString() },
    { onConflict: "listing_id,trigger_type" }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
