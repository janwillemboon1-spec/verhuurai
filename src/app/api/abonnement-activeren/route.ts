import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { abonnementId, frequentie, billingInterval, dag, tijd } = await request.json();
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Niet ingelogd" }, { status: 401 });

    const nu = new Date();
    let volgendeDatum: Date;

    if (frequentie === "weekly") {
      // Volgende maandag
      const dag = nu.getDay();
      const dagenTotMaandag = dag === 0 ? 1 : 8 - dag;
      volgendeDatum = new Date(nu);
      volgendeDatum.setDate(nu.getDate() + dagenTotMaandag);
    } else {
      // Eerste van volgende maand
      volgendeDatum = new Date(nu.getFullYear(), nu.getMonth() + 1, 1);
    }

    const { error } = await supabase
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
      .eq("id", abonnementId)
      .eq("user_id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Activeren fout:", error);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
