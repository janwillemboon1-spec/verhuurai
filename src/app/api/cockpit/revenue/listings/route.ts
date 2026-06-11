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
  const [listings, { data: settings }, { data: bltCache }] = await Promise.all([
    getListings(),
    admin.from("cockpit_listing_settings").select("listing_id, interne_naam"),
    admin.from("cockpit_blt_cache").select("listing_id, blt_mediaan, blt_gemiddeld"),
  ]);

  const namenMap = new Map(
    (settings ?? []).map((s: { listing_id: number; interne_naam: string | null }) => [
      String(s.listing_id),
      s.interne_naam ?? "",
    ])
  );

  // listing_id in blt_cache is TEXT — directe string vergelijking, geen precisieverlies
  const bltMap = new Map(
    (bltCache ?? []).map((b: { listing_id: string; blt_mediaan: number | null; blt_gemiddeld: number | null }) => [
      b.listing_id,
      { mediaan: b.blt_mediaan, gemiddeld: b.blt_gemiddeld },
    ])
  );

  return NextResponse.json(
    listings.map((l) => ({
      ...l,
      interneNaam: namenMap.get(l.id) ?? "",
      blt_mediaan: bltMap.get(l.id)?.mediaan ?? null,
      blt_gemiddeld: bltMap.get(l.id)?.gemiddeld ?? null,
    }))
  );
}
