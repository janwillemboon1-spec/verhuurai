import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const { methode, listing_id, rows } = await req.json();
  // rows = [{ maand: "2026-01", omzet: 1234.56 }, ...]

  const admin = createAdminClient();

  // Verwijder bestaande data voor deze methode + listing
  await admin
    .from("cockpit_omzet_csv")
    .delete()
    .eq("methode", methode)
    .eq("listing_id", listing_id ?? "portfolio");

  if (rows && rows.length > 0) {
    const inserts = rows.map((r: { maand: string; omzet: number }) => ({
      methode,
      listing_id: listing_id ?? "portfolio",
      maand: r.maand,
      omzet: r.omzet,
    }));
    const { error } = await admin.from("cockpit_omzet_csv").insert(inserts);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rows: rows?.length ?? 0 });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const methode = url.searchParams.get("methode");
  const listing_id = url.searchParams.get("listing_id") ?? "portfolio";

  const admin = createAdminClient();
  let query = admin.from("cockpit_omzet_csv").select("*").eq("listing_id", listing_id).order("maand");
  if (methode) query = query.eq("methode", methode);

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
