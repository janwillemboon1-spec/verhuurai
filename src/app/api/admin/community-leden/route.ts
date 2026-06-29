import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: leden, error } = await admin
    .from("community_leden")
    .select("*")
    .order("gesynchroniseerd_op", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ leden: leden || [] });
}
