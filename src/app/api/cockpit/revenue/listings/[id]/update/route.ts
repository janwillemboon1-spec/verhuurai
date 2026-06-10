import { createClient } from "@/lib/supabase/server";
import { updateListing } from "@/lib/pricelabs";
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
  return NextResponse.json({ ok: true });
}
