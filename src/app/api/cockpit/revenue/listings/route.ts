import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getListings } from "@/lib/pricelabs";
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
    admin.from("cockpit_listing_settings").select("listing_id, interne_naam"),
  ]);

  const namenMap = new Map(
    (settings ?? []).map((s: { listing_id: number; interne_naam: string | null }) => [
      String(s.listing_id),
      s.interne_naam ?? "",
    ])
  );

  return NextResponse.json(
    listings.map((l) => ({ ...l, interneNaam: namenMap.get(l.id) ?? "" }))
  );
}
