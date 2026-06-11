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
  const { data } = await admin.from("cockpit_aanbeveling_triggers").select("*").order("trigger_type");
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const { triggers } = await req.json();
  const admin = createAdminClient();
  for (const t of triggers) {
    await admin.from("cockpit_aanbeveling_triggers").upsert(
      { trigger_type: t.trigger_type, enabled: t.enabled, drempel_pct: t.drempel_pct, aanpassing_pct: t.aanpassing_pct, label: t.label },
      { onConflict: "trigger_type" }
    );
  }
  return NextResponse.json({ ok: true });
}
