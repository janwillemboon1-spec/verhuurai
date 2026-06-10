import { createClient } from "@/lib/supabase/server";
import { getCalendar } from "@/lib/pricelabs";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const start = url.searchParams.get("start") ?? new Date().toISOString().slice(0, 10);
  const end = url.searchParams.get("end") ?? new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);

  const calendar = await getCalendar(params.id, start, end);
  return NextResponse.json(calendar);
}
