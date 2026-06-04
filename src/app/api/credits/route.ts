import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ credits: 0 });

  const { data } = await supabase
    .from("listing_credits")
    .select("credits_totaal, credits_gebruikt")
    .eq("user_id", user.id)
    .maybeSingle();

  const resterend = data ? data.credits_totaal - data.credits_gebruikt : 0;
  return NextResponse.json({ credits: resterend, totaal: data?.credits_totaal ?? 0, gebruikt: data?.credits_gebruikt ?? 0 });
}

export async function POST(request: Request) {
  const { actie, aantal } = await request.json();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

  const { data: bestaand } = await supabase
    .from("listing_credits")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (actie === "toevoegen") {
    if (bestaand) {
      await supabase.from("listing_credits").update({
        credits_totaal: bestaand.credits_totaal + aantal,
      }).eq("user_id", user.id);
    } else {
      await supabase.from("listing_credits").insert({
        user_id: user.id,
        credits_totaal: aantal,
        credits_gebruikt: 0,
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (actie === "gebruiken") {
    const resterend = bestaand ? bestaand.credits_totaal - bestaand.credits_gebruikt : 0;
    if (resterend < 1) return NextResponse.json({ error: "Geen credits meer" }, { status: 402 });

    await supabase.from("listing_credits").update({
      credits_gebruikt: bestaand!.credits_gebruikt + 1,
    }).eq("user_id", user.id);

    return NextResponse.json({ ok: true, resterend: resterend - 1 });
  }

  return NextResponse.json({ error: "Ongeldige actie" }, { status: 400 });
}
