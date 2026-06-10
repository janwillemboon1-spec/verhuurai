import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getConversations } from "@/lib/hostaway";
import { NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: settings } = await admin
    .from("cockpit_listing_settings")
    .select("listing_id")
    .eq("berichten_sync", true);

  const enabledIds = (settings ?? []).map((s: { listing_id: number }) => s.listing_id);
  const conversations = await getConversations(enabledIds);

  return NextResponse.json(conversations);
}
