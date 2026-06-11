import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateListing, pushPrices } from "@/lib/pricelabs";
import { logPrijsWijziging } from "@/lib/prijs-log";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const body = await req.json();
  const fields: { base?: number; min?: number; max?: number } = {};
  if (body.base !== undefined) fields.base = Number(body.base);
  if (body.min !== undefined) fields.min = Number(body.min);
  if (body.max !== undefined) fields.max = Number(body.max);

  const ok = await updateListing(params.id, fields);
  if (!ok) return NextResponse.json({ error: "Bijwerken mislukt" }, { status: 500 });
  await pushPrices(params.id);

  // Naam ophalen voor het log
  const admin = createAdminClient();
  const { data: setting } = await admin
    .from("cockpit_listing_settings")
    .select("interne_naam")
    .eq("listing_id", params.id)
    .single();
  const listingNaam = setting?.interne_naam ?? body.listing_naam ?? params.id;

  // Log elke gewijzigd veld
  for (const [veld, nieuweWaarde] of Object.entries(fields)) {
    await logPrijsWijziging({
      listing_id: params.id,
      listing_naam: listingNaam,
      wijziging_type: "handmatig",
      veld,
      oude_waarde: body.oude_waarden?.[veld] != null ? String(body.oude_waarden[veld]) : null,
      nieuwe_waarde: String(nieuweWaarde),
    });
  }

  return NextResponse.json({ ok: true });
}
