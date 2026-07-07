import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

export async function DELETE(_: Request, { params }: { params: { "act-id": string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("onboarding_activiteiten").delete().eq("id", params["act-id"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
