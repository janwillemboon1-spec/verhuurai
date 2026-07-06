import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { abonnementId, frequentie, billingInterval, dag, tijd, stripe_session_id } = await request.json();
    const supabase = await createClient();
    const admin = createAdminClient();

    const { data: { user } } = await supabase.auth.getUser();

    // Auth: ingelogd óf verificatie via stripe_session_id
    if (!user && !stripe_session_id) {
      return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    if (!user && stripe_session_id) {
      const { data: abo } = await admin
        .from("abonnementen")
        .select("id")
        .eq("id", abonnementId)
        .eq("stripe_session_id", stripe_session_id)
        .maybeSingle();
      if (!abo) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
    }

    const nu = new Date();
    let volgendeDatum: Date;

    if (frequentie === "weekly") {
      const dagNu = nu.getDay();
      const dagenTotMaandag = dagNu === 0 ? 1 : 8 - dagNu;
      volgendeDatum = new Date(nu);
      volgendeDatum.setDate(nu.getDate() + dagenTotMaandag);
    } else {
      volgendeDatum = new Date(nu.getFullYear(), nu.getMonth() + 1, 1);
    }

    const updateQuery = admin
      .from("abonnementen")
      .update({
        status: "active",
        frequentie,
        billing_interval: billingInterval,
        rapport_dag: dag,
        rapport_tijd: tijd || "08:00",
        volgende_rapport_datum: volgendeDatum.toISOString(),
        trial_gebruikt: true,
      })
      .eq("id", abonnementId);

    const { error } = user
      ? await updateQuery.eq("user_id", user.id)
      : await updateQuery;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Activeren fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
