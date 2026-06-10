import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const { id } = params;
  const { enabled, name } = await req.json();
  const listingId = parseInt(id);

  const admin = createAdminClient();
  const { error } = await admin.from("cockpit_listing_settings").upsert(
    { listing_id: listingId, listing_name: name, berichten_sync: enabled, bijgewerkt_op: new Date().toISOString() },
    { onConflict: "listing_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
