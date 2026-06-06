import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://verhuurai.nl";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  const [
    { data: abonnementen },
    { data: reviewRapporten },
    { data: listingRapporten },
    { data: calculatorRapporten },
    { data: usersData },
  ] = await Promise.all([
    admin.from("abonnementen").select("*").order("aangemaakt_op", { ascending: false }),
    admin.from("rapporten").select("id, abonnement_id, aangemaakt_op, periode_omschrijving, user_id").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.from("listing_rapporten").select("id, host_naam, email, aangemaakt_op, user_id").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.from("prijscalculator_rapporten").select("id, email, locatie, land, basisprijs, aangemaakt_op").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  // Map van user_id → email
  const userEmailMap: Record<string, string> = {};
  (usersData?.users ?? []).forEach(u => { if (u.id && u.email) userEmailMap[u.id] = u.email; });

  const statusKleur: Record<string, string> = {
    active: "bg-success/10 text-success",
    trial: "bg-warning/10 text-warning",
    cancelled: "bg-border text-text-secondary",
  };
  const statusLabel: Record<string, string> = {
    active: "Actief", trial: "Proefperiode", cancelled: "Opgezegd",
  };

  const actief = abonnementen?.filter(a => a.status === "active").length ?? 0;
  const proef = abonnementen?.filter(a => a.status === "trial").length ?? 0;
  const opgezegd = abonnementen?.filter(a => a.status === "cancelled").length ?? 0;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-primary">Admin</h1>
          <a href="/dashboard" className="btn-secondary text-sm">← Dashboard</a>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {[
            { label: "Actief", aantal: actief, kleur: "text-success" },
            { label: "Proefperiode", aantal: proef, kleur: "text-warning" },
            { label: "Opgezegd", aantal: opgezegd, kleur: "text-text-secondary" },
            { label: "Review rapporten", aantal: reviewRapporten?.length ?? 0, kleur: "text-accent" },
            { label: "Listing rapporten", aantal: listingRapporten?.length ?? 0, kleur: "text-primary" },
            { label: "Prijscalculator", aantal: calculatorRapporten?.length ?? 0, kleur: "text-success" },
          ].map(({ label, aantal, kleur }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-3xl font-bold ${kleur}`}>{aantal}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Abonnementen */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Review Monitor abonnees ({abonnementen?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Woning", "Email", "Status", "Frequentie", "Volgende rapport", "Rapporten"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {abonnementen?.map((abo) => {
                  const aboRapporten = reviewRapporten?.filter(r => r.abonnement_id === abo.id) ?? [];
                  return (
                    <tr key={abo.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">{abo.listing_naam || "—"}</p>
                        <p className="text-xs text-text-secondary truncate max-w-[180px]">{abo.airbnb_url}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {userEmailMap[abo.user_id] || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusKleur[abo.status] || ""}`}>
                          {statusLabel[abo.status] || abo.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {abo.frequentie === "weekly" ? "Wekelijks" : "Maandelijks"}<br />
                        {abo.billing_interval === "year" ? "Jaarlijks" : "Maandelijks"} betaald
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {abo.volgende_rapport_datum
                          ? new Date(abo.volgende_rapport_datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })
                          : "—"}
                        {abo.rapport_tijd && ` · ${abo.rapport_tijd}u`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {aboRapporten.length === 0 && <span className="text-xs text-text-secondary">Geen</span>}
                          {aboRapporten.map(r => (
                            <a
                              key={r.id}
                              href={`${BASE_URL}/dashboard/rapporten/${r.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-accent hover:underline"
                            >
                              {r.periode_omschrijving || new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })} →
                            </a>
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Listing Optimizer rapporten */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Listing Optimizer rapporten ({listingRapporten?.length ?? 0})</h2>
          </div>
          <div className="divide-y divide-border">
            {listingRapporten?.length === 0 && (
              <p className="p-5 text-sm text-text-secondary">Nog geen rapporten.</p>
            )}
            {listingRapporten?.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface/50">
                <div>
                  <p className="font-semibold text-primary text-sm">{r.host_naam || "Analyse"}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    <span className="ml-2 text-accent">
                      · {(r as any).email || userEmailMap[(r as any).user_id] || "—"}
                    </span>
                  </p>
                </div>
                <a
                  href={`${BASE_URL}/dashboard/listing-rapporten/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent font-semibold hover:underline"
                >
                  Bekijk →
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Prijscalculator aanvragen */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Prijscalculator aanvragen ({calculatorRapporten?.length ?? 0})</h2>
          </div>
          <div className="divide-y divide-border">
            {calculatorRapporten?.length === 0 && (
              <p className="p-5 text-sm text-text-secondary">Nog geen aanvragen.</p>
            )}
            {calculatorRapporten?.map(r => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-surface/50 gap-4">
                <div className="min-w-0">
                  <p className="font-semibold text-primary text-sm">{r.locatie}, {r.land}</p>
                  <p className="text-xs text-text-secondary">
                    {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    {r.email && <span className="ml-2 text-accent">· {r.email}</span>}
                    <span className="ml-2">· €{r.basisprijs}/nacht</span>
                  </p>
                </div>
                <a
                  href={`${BASE_URL}/prijscalculator/resultaat/${r.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-accent font-semibold hover:underline flex-shrink-0"
                >
                  Bekijk →
                </a>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
