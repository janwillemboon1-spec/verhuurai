import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  const { data: abonnementen } = await admin
    .from("abonnementen")
    .select("*")
    .order("aangemaakt_op", { ascending: false });

  const { data: rapporten } = await admin
    .from("rapporten")
    .select("id, abonnement_id, aangemaakt_op, periode_omschrijving")
    .order("aangemaakt_op", { ascending: false })
    .limit(50);

  const statusKleur: Record<string, string> = {
    active: "bg-success/10 text-success",
    trial: "bg-warning/10 text-warning",
    cancelled: "bg-border text-text-secondary",
  };

  const statusLabel: Record<string, string> = {
    active: "Actief",
    trial: "Proefperiode",
    cancelled: "Opgezegd",
  };

  const actief = abonnementen?.filter(a => a.status === "active").length ?? 0;
  const proef = abonnementen?.filter(a => a.status === "trial").length ?? 0;
  const opgezegd = abonnementen?.filter(a => a.status === "cancelled").length ?? 0;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl text-primary">Admin — Abonnees</h1>
          <a href="/dashboard" className="btn-secondary text-sm">← Dashboard</a>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Actief", aantal: actief, kleur: "text-success" },
            { label: "Proefperiode", aantal: proef, kleur: "text-warning" },
            { label: "Opgezegd", aantal: opgezegd, kleur: "text-text-secondary" },
          ].map(({ label, aantal, kleur }) => (
            <div key={label} className="card p-5 text-center">
              <p className={`text-4xl font-bold ${kleur}`}>{aantal}</p>
              <p className="text-sm text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Abonnementen tabel */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Alle abonnees ({abonnementen?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Woning", "Status", "Frequentie", "Volgende rapport", "Laaste rapport", "Reviews"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {abonnementen?.map((abo) => {
                  const aantalRapporten = rapporten?.filter(r => r.abonnement_id === abo.id).length ?? 0;
                  return (
                    <tr key={abo.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary">{abo.listing_naam || "—"}</p>
                        <p className="text-xs text-text-secondary truncate max-w-[200px]">{abo.airbnb_url}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusKleur[abo.status] || ""}`}>
                          {statusLabel[abo.status] || abo.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {abo.frequentie === "weekly" ? "Wekelijks" : "Maandelijks"}
                        <br />
                        <span className="text-xs">{abo.billing_interval === "year" ? "Jaarlijks" : "Maandelijks"} betaald</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {abo.volgende_rapport_datum
                          ? new Date(abo.volgende_rapport_datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })
                          : "—"}
                        {abo.rapport_tijd && <><br /><span className="text-xs">{abo.rapport_tijd}u</span></>}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {abo.laatste_rapport_datum
                          ? new Date(abo.laatste_rapport_datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })
                          : "—"}
                        <br />
                        <span className="text-xs">{aantalRapporten} rapport{aantalRapporten !== 1 ? "en" : ""}</span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {abo.laatste_review_count || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
