import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";
const MAANDEN = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const jaar = parseInt(url.searchParams.get("jaar") ?? String(new Date().getFullYear()));
  const admin = createAdminClient();

  const [{ data: commissies }, { data: configs }] = await Promise.all([
    admin.from("cockpit_fin_commissies").select("*").eq("jaar", jaar),
    admin.from("cockpit_commissie_config").select("*").eq("actief", true).order("sort_order"),
  ]);

  // Bouw matrix: listing × 12 maanden
  const commissiePerListing = new Map<string, number[]>();
  const commissieNamen = new Map<string, string>();

  for (const c of commissies ?? []) {
    if (!commissiePerListing.has(c.listing_id)) {
      commissiePerListing.set(c.listing_id, Array(12).fill(0));
    }
    const maandIdx = parseInt(c.maand.slice(5, 7)) - 1;
    commissiePerListing.get(c.listing_id)![maandIdx] = c.commissie;
    commissieNamen.set(c.listing_id, c.listing_naam);
  }

  // Sorteer op configs volgorde
  const sortVolgorde = new Map((configs ?? []).map((c: { listing_id: string }, i: number) => [c.listing_id, i]));
  const lijstVolgorde = Array.from(commissiePerListing.keys()).sort(
    (a, b) => (sortVolgorde.get(a) ?? 99) - (sortVolgorde.get(b) ?? 99)
  );

  const listings = lijstVolgorde.map(listingId => {
    const maanden = commissiePerListing.get(listingId)!;
    return {
      listing_id: listingId,
      listing_naam: commissieNamen.get(listingId) ?? listingId,
      maanden,
      totaal: maanden.reduce((s, v) => s + v, 0),
    };
  });

  // Totaalrij
  const totaalPerMaand = Array(12).fill(0);
  for (const l of listings) {
    l.maanden.forEach((v, i) => { totaalPerMaand[i] += v; });
  }

  return NextResponse.json({
    jaar,
    maand_labels: MAANDEN,
    listings,
    totaal_per_maand: totaalPerMaand,
    totaal_jaar: totaalPerMaand.reduce((s, v) => s + v, 0),
  });
}
