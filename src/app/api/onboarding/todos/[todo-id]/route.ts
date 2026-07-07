import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === ADMIN_EMAIL;
}

export async function PATCH(request: Request, { params }: { params: { "todo-id": string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const body = await request.json();
  const admin = createAdminClient();
  const updates: Record<string, unknown> = {};
  if (body.tekst !== undefined) updates.tekst = body.tekst;
  if (body.deadline !== undefined) updates.deadline = body.deadline;

  const { data, error } = await admin
    .from("onboarding_todos")
    .update(updates)
    .eq("id", params["todo-id"])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ todo: data });
}

export async function DELETE(_: Request, { params }: { params: { "todo-id": string } }) {
  if (!await checkAdmin()) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("onboarding_todos")
    .delete()
    .eq("id", params["todo-id"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
