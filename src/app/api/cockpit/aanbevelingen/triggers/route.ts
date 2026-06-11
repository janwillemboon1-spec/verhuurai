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
  const body = await req.json();
  const admin = createAdminClient();

  // Bulk upsert (bestaande triggers opslaan)
  if (body.triggers) {
    for (const t of body.triggers) {
      await admin.from("cockpit_aanbeveling_triggers").upsert(
        { trigger_type: t.trigger_type, conditie: t.conditie ?? t.trigger_type, enabled: t.enabled, drempel_pct: t.drempel_pct, aanpassing_pct: t.aanpassing_pct, label: t.label },
        { onConflict: "trigger_type" }
      );
    }
    return NextResponse.json({ ok: true });
  }

  // Nieuwe trigger aanmaken
  if (body.trigger) {
    const t = body.trigger;
    const { data, error } = await admin.from("cockpit_aanbeveling_triggers").insert({
      trigger_type: t.trigger_type,
      conditie: t.conditie,
      enabled: true,
      drempel_pct: t.drempel_pct,
      aanpassing_pct: t.aanpassing_pct,
      label: t.label,
    }).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Ongeldig verzoek" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  if (!await auth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const { trigger_type } = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("cockpit_aanbeveling_triggers").delete().eq("trigger_type", trigger_type);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
