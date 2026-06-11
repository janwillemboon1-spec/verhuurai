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
    admin.from("cockpit_blt_cache").select(
      "listing_id, blt_mediaan, blt_gemiddeld, p_boven_7, p_boven_15, p_boven_30, p_boven_60, p_boven_90, avg_occ"
    ),
  ]);

  const namenMap = new Map(
    (settings ?? []).map((s: { listing_id: number; interne_naam: string | null }) => [
      String(s.listing_id), s.interne_naam ?? "",
    ])
  );

  const bltMap = new Map(
    (bltCache ?? []).map((b: {
      listing_id: string;
      blt_mediaan: number | null; blt_gemiddeld: number | null;
      p_boven_7: number | null; p_boven_15: number | null;
      p_boven_30: number | null; p_boven_60: number | null;
      p_boven_90: number | null; avg_occ: number | null;
    }) => [b.listing_id, b])
  );

  return NextResponse.json(
    listings.map((l) => {
      const blt = bltMap.get(l.id);
      return {
        ...l,
        interneNaam: namenMap.get(l.id) ?? "",
        blt_mediaan: blt?.blt_mediaan ?? null,
        blt_gemiddeld: blt?.blt_gemiddeld ?? null,
        blt_p7:  blt?.p_boven_7  ?? null,
        blt_p15: blt?.p_boven_15 ?? null,
        blt_p30: blt?.p_boven_30 ?? null,
        blt_p60: blt?.p_boven_60 ?? null,
        blt_p90: blt?.p_boven_90 ?? null,
        blt_avg_occ: blt?.avg_occ ?? null,
      };
    })
  );
}
