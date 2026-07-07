import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export default async function OnboardingOverzichtPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: klanten } = await admin
    .from("onboarding_klanten")
    .select("*, onboarding_checklist_items(id, voltooid), onboarding_todos(id, gedaan)")
    .order("aangemaakt_op", { ascending: false });

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-primary">Onboarding</h1>
            <p className="text-text-secondary text-sm mt-1">Online Beheer — klant voortgang</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin/onboarding/nieuw" className="btn-primary text-sm">+ Nieuwe klant</Link>
            <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
          </div>
        </div>

        {(!klanten || klanten.length === 0) && (
          <div className="card p-8 text-center text-text-secondary">
            <p className="text-lg">Nog geen onboarding klanten.</p>
            <Link href="/admin/onboarding/nieuw" className="btn-primary text-sm mt-4 inline-block">Eerste klant toevoegen</Link>
          </div>
        )}

        <div className="space-y-3">
          {klanten?.map((klant: any) => {
            const items = klant.onboarding_checklist_items || [];
            const todos = klant.onboarding_todos || [];
            const voltooid = items.filter((i: any) => i.voltooid).length;
            const totaal = items.length;
            const pct = totaal > 0 ? Math.round((voltooid / totaal) * 100) : 0;
            const openTodos = todos.filter((t: any) => !t.gedaan).length;
            const pctKleur = pct >= 80 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-accent";

            return (
              <div key={klant.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h2 className="font-semibold text-primary text-lg">{klant.naam}</h2>
                      <span className="text-xs text-text-secondary">{klant.email}</span>
                    </div>
                    <p className="text-xs text-text-secondary mb-3">
                      Gestart: {new Date(klant.startdatum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                      {openTodos > 0 && <span className="ml-3 bg-warning/15 text-warning font-semibold px-2 py-0.5 rounded-full">{openTodos} to-do{openTodos !== 1 ? "'s" : ""} open</span>}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 bg-border rounded-full h-2 max-w-xs">
                        <div className={`${pctKleur} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm font-semibold text-primary">{pct}%</span>
                      <span className="text-xs text-text-secondary">{voltooid}/{totaal} stappen</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`${BASE_URL}/onboarding/${klant.link_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary text-xs"
                    >
                      Klant link →
                    </a>
                    <Link href={`/admin/onboarding/${klant.id}`} className="btn-primary text-xs">
                      Beheren →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
