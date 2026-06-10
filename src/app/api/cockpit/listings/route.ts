import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getListings } from "@/lib/hostaway";
import { NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [listings, { data: settings }] = await Promise.all([
    getListings(),
    admin.from("cockpit_listing_settings").select("*"),
  ]);

  const settingsMap = new Map((settings ?? []).map((s: { listing_id: number; berichten_sync: boolean }) => [s.listing_id, s.berichten_sync]));

  return NextResponse.json(
    listings.map((l) => ({
      id: l.id,
      name: l.name,
      cityName: l.cityName,
      berichtenSync: settingsMap.get(l.id) ?? false,
    }))
  );
}
