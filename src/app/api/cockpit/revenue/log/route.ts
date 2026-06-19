import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getListings } from "@/lib/pricelabs";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const vanaf = url.searchParams.get("vanaf");
  const tot = url.searchParams.get("tot");
  const limit = parseInt(url.searchParams.get("limit") ?? "200");

  const admin = createAdminClient();
  let query = admin
    .from("cockpit_prijs_log")
    .select("*")
    .order("aangemaakt_op", { ascending: false })
    .limit(limit);

  if (vanaf) query = query.gte("aangemaakt_op", vanaf);
  if (tot) query = query.lte("aangemaakt_op", tot + "T23:59:59Z");

  const { data } = await query;
  const entries = data ?? [];

  // Verrijk listing_naam: interne_naam (gebruikersinstelling) → PriceLabs naam → opgeslagen naam
  const listingIds = Array.from(new Set(entries.map((e: any) => e.listing_id as string)));
  if (listingIds.length > 0) {
    const [{ data: settings }, plListings] = await Promise.all([
      admin.from("cockpit_listing_settings").select("listing_id, interne_naam").in("listing_id", listingIds),
      getListings().catch(() => []),
    ]);

    const interneNaamMap: Record<string, string> = {};
    (settings ?? []).forEach((s: any) => { if (s.interne_naam) interneNaamMap[String(s.listing_id)] = s.interne_naam; });

    const plNaamMap: Record<string, string> = {};
    plListings.forEach((l) => { if (l.name) plNaamMap[l.id] = l.name.split("--")[0].trim(); });

    return NextResponse.json(entries.map((e: any) => ({
      ...e,
      listing_naam: interneNaamMap[e.listing_id] ?? plNaamMap[e.listing_id] ?? e.listing_naam,
    })));
  }

  return NextResponse.json(entries);
}
