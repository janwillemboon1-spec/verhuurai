import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const { fase, naam, volgorde } = body;
  if (!fase || !naam) return NextResponse.json({ error: "fase en naam zijn verplicht" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("onboarding_checklist_items")
    .insert({ klant_id: params.id, fase, naam, volgorde: volgorde ?? 99 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ item: data }, { status: 201 });
}
