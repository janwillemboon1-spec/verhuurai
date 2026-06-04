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

  const { data: abonnementen } = await supabase
    .from("abonnementen")
    .select("*, rapporten(id, periode_omschrijving, aangemaakt_op, gearchiveerd)")
    .eq("user_id", user.id)
    .order("aangemaakt_op", { ascending: false });

  return (
    <DashboardClient
      email={user.email ?? ""}
      abonnementen={abonnementen ?? []}
      welkom={!!searchParams.welkom}
    />
  );
}
