import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { welkom?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: listingRapporten } = await supabase
    .from("listing_rapporten")
    .select("id, host_naam, accommodatie_naam, aangemaakt_op, gearchiveerd")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("aangemaakt_op", { ascending: false });

  const { data: calculatorRapporten } = await supabase
    .from("prijscalculator_rapporten")
    .select("id, locatie, land, basisprijs, aangemaakt_op")
    .or(`user_id.eq.${user.id},email.eq.${user.email}`)
    .order("aangemaakt_op", { ascending: false });

  const { data: abonnementen } = await supabase
    .from("abonnementen")
    .select("*, rapporten(id, periode_omschrijving, aangemaakt_op, gearchiveerd)")
    .eq("user_id", user.id)
    .order("aangemaakt_op", { ascending: false });

  const { data: credits } = await supabase
    .from("listing_credits")
    .select("credits_totaal, credits_gebruikt")
    .eq("user_id", user.id)
    .maybeSingle();

  const resterendeCredits = credits ? credits.credits_totaal - credits.credits_gebruikt : 0;

  return (
    <DashboardClient
      email={user.email ?? ""}
      abonnementen={abonnementen ?? []}
      listingRapporten={listingRapporten ?? []}
      calculatorRapporten={calculatorRapporten ?? []}
      welkom={!!searchParams.welkom}
      resterendeCredits={resterendeCredits}
    />
  );
}
