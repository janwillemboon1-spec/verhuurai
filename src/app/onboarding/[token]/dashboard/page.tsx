import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { COOKIE_NAAM, verifyCookieWaarde } from "@/lib/onboarding/auth";
import Link from "next/link";

export default async function OnboardingDashboardPage({ params }: { params: { token: string } }) {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAAM);
  if (!cookie || !verifyCookieWaarde(cookie.value, params.token)) {
    redirect(`/onboarding/${params.token}`);
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("id, voornaam, achternaam")
    .eq("link_token", params.token)
    .single();

  if (!login) notFound();

  const { data: woningen } = await admin
    .from("onboarding_klanten")
    .select("id, naam, onboarding_checklist_items(id, voltooid)")
    .eq("login_id", login.id)
    .order("aangemaakt_op");

  if (!woningen || woningen.length === 0) notFound();

  if (woningen.length === 1) {
    redirect(`/onboarding/${params.token}/dashboard/${woningen[0].id}`);
  }

  const naam = login.voornaam || login.achternaam || "daar";

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Jouw onboarding bij</p>
          <h1 className="font-display text-2xl text-primary">Host Boni</h1>
          <p className="text-sm text-text-secondary">Hallo {naam} 👋 — kies een woning</p>
        </div>
        <div className="space-y-3">
          {woningen.map((woning: any) => {
            const items = woning.onboarding_checklist_items || [];
            const voltooid = items.filter((i: any) => i.voltooid).length;
            const totaal = items.length;
            const pct = totaal > 0 ? Math.round((voltooid / totaal) * 100) : 0;
            return (
              <Link
                key={woning.id}
                href={`/onboarding/${params.token}/dashboard/${woning.id}`}
                className="card p-5 flex items-center justify-between gap-4 hover:shadow-md transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <h2 className="font-semibold text-primary">{woning.naam}</h2>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex-1 bg-border rounded-full h-2 max-w-xs">
                      <div className="bg-accent h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-primary">{pct}%</span>
                  </div>
                </div>
                <span className="text-text-secondary">→</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
