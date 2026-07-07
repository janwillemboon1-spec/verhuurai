import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { COOKIE_NAAM, verifyCookieWaarde } from "@/lib/onboarding/auth";
import { WachtwoordForm } from "./WachtwoordForm";

export default async function OnboardingLoginPage({ params }: { params: { token: string } }) {
  const admin = createAdminClient();
  const { data: klant } = await admin
    .from("onboarding_klanten")
    .select("id, naam, link_token")
    .eq("link_token", params.token)
    .single();

  if (!klant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm w-full">
          <p className="text-text-secondary">Onbekende onboarding link.</p>
        </div>
      </div>
    );
  }

  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAAM);
  if (cookie && verifyCookieWaarde(cookie.value, params.token)) {
    redirect(`/onboarding/${params.token}/dashboard`);
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl text-primary">Welkom, {klant.naam}</h1>
          <p className="text-sm text-text-secondary">Voer je wachtwoord in om je onboarding voortgang te bekijken.</p>
        </div>
        <WachtwoordForm token={params.token} />
      </div>
    </div>
  );
}
