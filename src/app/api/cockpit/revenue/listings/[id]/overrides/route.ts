import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOverrides, upsertOverride, deleteOverride, pushPrices } from "@/lib/pricelabs";
import { logPrijsWijziging } from "@/lib/prijs-log";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

async function auth() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.email === COCKPIT_EMAIL ? user : null;
}

async function getListingNaam(listingId: string): Promise<string> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("cockpit_listing_settings")
    .select("interne_naam")
    .eq("listing_id", listingId)
    .single();
  return data?.interne_naam ?? listingId;
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const overrides = await getOverrides(params.id);
  return NextResponse.json(overrides);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const body = await req.json();
  const ok = await upsertOverride(params.id, {
    date: body.date,
    price: String(body.price),
    price_type: body.price_type ?? "percent",
    min_stay: body.min_stay ?? 1,
    reason: body.reason ?? "",
  });
  if (!ok) return NextResponse.json({ error: "Override opslaan mislukt" }, { status: 500 });
  await pushPrices(params.id);

  await logPrijsWijziging({
    listing_id: params.id,
    listing_naam: await getListingNaam(params.id),
    wijziging_type: "handmatig",
    veld: "override",
    nieuwe_waarde: `${body.price}${body.price_type === "percent" ? "%" : " (vast)"}`,
    override_datum: body.date,
    regel_naam: body.reason || null,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!await auth()) return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  const { date } = await req.json();
  const ok = await deleteOverride(params.id, date);
  if (!ok) return NextResponse.json({ error: "Verwijderen mislukt" }, { status: 500 });
  await pushPrices(params.id);

  await logPrijsWijziging({
    listing_id: params.id,
    listing_naam: await getListingNaam(params.id),
    wijziging_type: "handmatig",
    veld: "override verwijderd",
    nieuwe_waarde: "verwijderd",
    override_datum: date,
  });

  return NextResponse.json({ ok: true });
}
