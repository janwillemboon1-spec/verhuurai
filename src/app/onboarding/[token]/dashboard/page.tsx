import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { COOKIE_NAAM, verifyCookieWaarde } from "@/lib/onboarding/auth";
import { OnboardingDashboard } from "./OnboardingDashboard";

export default async function OnboardingDashboardPage({ params }: { params: { token: string } }) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAAM);
  if (!cookie || !verifyCookieWaarde(cookie.value, params.token)) {
    redirect(`/onboarding/${params.token}`);
  }

  const admin = createAdminClient();
  const { data: klant } = await admin
    .from("onboarding_klanten")
    .select("*")
    .eq("link_token", params.token)
    .single();

  if (!klant) notFound();

  const [
    { data: checklist },
    { data: todos },
    { data: activiteiten },
    { data: metingen },
  ] = await Promise.all([
    admin.from("onboarding_checklist_items").select("*").eq("klant_id", klant.id).order("volgorde"),
    admin.from("onboarding_todos").select("*").eq("klant_id", klant.id).order("aangemaakt_op"),
    admin.from("onboarding_activiteiten").select("*").eq("klant_id", klant.id).order("datum", { ascending: false }),
    admin.from("onboarding_kpi_metingen").select("*").eq("klant_id", klant.id).order("datum", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Jouw onboarding bij</p>
          <h1 className="font-display text-2xl text-primary">Host Boni</h1>
          <p className="text-sm text-text-secondary">Hallo {klant.naam} 👋</p>
        </div>
        <OnboardingDashboard
          klant={klant}
          checklist={checklist || []}
          todos={todos || []}
          activiteiten={activiteiten || []}
          metingen={metingen || []}
        />
      </div>
    </div>
  );
}
