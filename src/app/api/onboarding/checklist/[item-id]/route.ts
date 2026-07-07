import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { stuurStapVoltooidEmail } from "@/lib/onboarding/email";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function PATCH(request: Request, { params }: { params: { "item-id": string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();

  const updates: Record<string, unknown> = {};
  if (body.voltooid !== undefined) {
    updates.voltooid = body.voltooid;
    updates.voltooid_op = body.voltooid ? new Date().toISOString() : null;
  }
  if (body.notitie !== undefined) updates.notitie = body.notitie;
  if (body.naam !== undefined) updates.naam = body.naam;
  if (body.fase !== undefined) updates.fase = body.fase;

  const { data: item, error } = await admin
    .from("onboarding_checklist_items")
    .update(updates)
    .eq("id", params["item-id"])
    .select("*, onboarding_klanten(naam, email)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (body.voltooid === true && item) {
    const klant = (item as any).onboarding_klanten;
    if (klant?.email) {
      await stuurStapVoltooidEmail(klant.email, klant.naam, item.naam).catch(() => {});
    }
  }

  return NextResponse.json({ item });
}

export async function DELETE(_: Request, { params }: { params: { "item-id": string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("onboarding_checklist_items")
    .delete()
    .eq("id", params["item-id"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
