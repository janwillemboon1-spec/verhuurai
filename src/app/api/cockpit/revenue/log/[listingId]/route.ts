import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET(req: NextRequest, { params }: { params: { listingId: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const vanaf = url.searchParams.get("vanaf");
  const tot = url.searchParams.get("tot");

  const admin = createAdminClient();
  let query = admin
    .from("cockpit_prijs_log")
    .select("*")
    .eq("listing_id", params.listingId)
    .order("aangemaakt_op", { ascending: false })
    .limit(500);

  if (vanaf) query = query.gte("aangemaakt_op", vanaf);
  if (tot) query = query.lte("aangemaakt_op", tot + "T23:59:59Z");

  const { data } = await query;
  return NextResponse.json(data ?? []);
}
