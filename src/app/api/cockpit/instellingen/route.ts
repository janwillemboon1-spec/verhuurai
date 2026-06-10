import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data } = await admin.from("cockpit_instellingen").select("*");
  const map: Record<string, string> = {};
  (data ?? []).forEach((r: { sleutel: string; waarde: string }) => { map[r.sleutel] = r.waarde; });
  return NextResponse.json(map);
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const { sleutel, waarde } = await req.json();
  const admin = createAdminClient();
  const { error } = await admin.from("cockpit_instellingen").upsert(
    { sleutel, waarde, bijgewerkt_op: new Date().toISOString() },
    { onConflict: "sleutel" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
