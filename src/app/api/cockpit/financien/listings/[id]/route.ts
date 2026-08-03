import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

async function checkAuth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === COCKPIT_EMAIL ? user : null;
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("cockpit_commissie_config")
    .update({
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
    })
    .eq("listing_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await checkAuth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });

  const { id } = await params;
  const admin = createAdminClient();

  const { error } = await admin.from("cockpit_commissie_config").delete().eq("listing_id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
