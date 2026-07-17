import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

type WoningRow = {
  id: string;
  naam: string;
  startdatum: string;
  onboarding_checklist_items: { id: string; voltooid: boolean }[];
  onboarding_todos: { id: string; gedaan: boolean }[];
  onboarding_logins: {
    id: string;
    voornaam: string | null;
    achternaam: string | null;
    email: string;
    link_token: string;
  } | null;
};

export default async function OnboardingOverzichtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: woningen } = await admin
    .from("onboarding_klanten")
    .select("id, naam, startdatum, onboarding_checklist_items(id, voltooid), onboarding_todos(id, gedaan), onboarding_logins(id, voornaam, achternaam, email, link_token)")
    .order("aangemaakt_op", { ascending: false });

  const groepen = new Map<string, { login: NonNullable<WoningRow["onboarding_logins"]>; woningen: WoningRow[] }>();
  for (const woning of (woningen || []) as unknown as WoningRow[]) {
    const login = woning.onboarding_logins;
    if (!login) continue;
    if (!groepen.has(login.id)) groepen.set(login.id, { login, woningen: [] });
    groepen.get(login.id)!.woningen.push(woning);
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-primary">Onboarding</h1>
            <p className="text-text-secondary text-sm mt-1">Online Beheer — klant voortgang</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/onboarding/nieuw" className="btn-primary text-sm">+ Nieuwe woning</Link>
            <Link href="/cockpit" className="btn-secondary text-sm">← Cockpit</Link>
          </div>
        </div>

        {groepen.size === 0 && (
          <div className="card p-8 text-center text-text-secondary">
            <p className="text-lg">Nog geen onboarding klanten.</p>
            <Link href="/admin/onboarding/nieuw" className="btn-primary text-sm mt-4 inline-block">Eerste klant toevoegen</Link>
          </div>
        )}

        <div className="space-y-4">
          {Array.from(groepen.values()).map(({ login, woningen }) => (
            <div key={login.id} className="card p-5 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="font-semibold text-primary text-lg">
                    {[login.voornaam, login.achternaam].filter(Boolean).join(" ") || login.email}
                  </h2>
                  <span className="text-xs text-text-secondary">{login.email}</span>
                </div>
                <a
                  href={`${BASE_URL}/onboarding/${login.link_token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-xs"
                >
                  Klant link →
                </a>
              </div>
              <div className="space-y-2">
                {woningen.map(woning => {
                  const items = woning.onboarding_checklist_items || [];
                  const todos = woning.onboarding_todos || [];
                  const voltooid = items.filter(i => i.voltooid).length;
                  const totaal = items.length;
                  const pct = totaal > 0 ? Math.round((voltooid / totaal) * 100) : 0;
                  const openTodos = todos.filter(t => !t.gedaan).length;
                  const pctKleur = pct >= 80 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-accent";

                  return (
                    <div key={woning.id} className="bg-surface rounded-xl p-4 flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-medium text-primary">{woning.naam}</h3>
                          {openTodos > 0 && <span className="text-xs bg-warning/15 text-warning font-semibold px-2 py-0.5 rounded-full">{openTodos} to-do{openTodos !== 1 ? "'s" : ""} open</span>}
                        </div>
                        <p className="text-xs text-text-secondary mb-2">
                          Gestart: {new Date(woning.startdatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                        </p>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-border rounded-full h-2 max-w-xs">
                            <div className={`${pctKleur} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-semibold text-primary">{pct}%</span>
                          <span className="text-xs text-text-secondary">{voltooid}/{totaal} stappen</span>
                        </div>
                      </div>
                      <Link href={`/admin/onboarding/${woning.id}`} className="btn-primary text-xs shrink-0">
                        Beheren →
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
