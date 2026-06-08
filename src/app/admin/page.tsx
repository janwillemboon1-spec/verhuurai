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
    { data: gratisRapporten },
    { data: usersData },
  ] = await Promise.all([
    admin.from("abonnementen").select("*, voornaam").order("aangemaakt_op", { ascending: false }),
    admin.from("rapporten").select("id, abonnement_id, aangemaakt_op, periode_omschrijving, user_id").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.from("listing_rapporten").select("id, host_naam, email, aangemaakt_op, user_id, airbnb_url, rapport_json->totaalscore").order("aangemaakt_op", { ascending: false }),
    admin.from("prijscalculator_rapporten").select("id, voornaam, email, locatie, land, basisprijs, aangemaakt_op").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.from("gratis_rapporten").select("id, naam, email, airbnb_url, titel, aangemaakt_op").order("aangemaakt_op", { ascending: false }).limit(100),
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

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-3xl text-primary">Admin</h1>
          <div className="flex gap-3">
            <a href="/admin/contacten" className="btn-primary text-sm">👥 Contacten & Export</a>
            <a href="/dashboard" className="btn-secondary text-sm">← Dashboard</a>
          </div>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
          {[
            { label: "Actief", aantal: actief, kleur: "text-success" },
            { label: "Proefperiode", aantal: proef, kleur: "text-warning" },
            { label: "Opgezegd", aantal: opgezegd, kleur: "text-text-secondary" },
            { label: "Review rapporten", aantal: reviewRapporten?.length ?? 0, kleur: "text-accent" },
            { label: "Listing rapporten", aantal: listingRapporten?.length ?? 0, kleur: "text-primary" },
            { label: "Gratis analyses", aantal: gratisRapporten?.length ?? 0, kleur: "text-accent" },
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
            <h2 className="font-display text-xl text-primary">Review Monitor ({abonnementen?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Voornaam", "Woning", "Email", "Status", "Frequentie", "Betaling", "Rapporten"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {abonnementen?.map((abo) => {
                  const aboRapporten = reviewRapporten?.filter(r => r.abonnement_id === abo.id) ?? [];
                  const frequentieLabel =
                    abo.frequentie === "weekly" ? "Wekelijks" :
                    abo.frequentie === "eenmalig" ? "Eenmalig" :
                    "Maandelijks";
                  const betalingLabel =
                    abo.frequentie === "eenmalig" ? "Eenmalig" :
                    abo.billing_interval === "year" ? "Jaarlijks" : "Maandelijks";
                  return (
                    <tr key={abo.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3 text-sm text-primary">
                        {abo.voornaam || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary text-sm">{abo.listing_naam || "—"}</p>
                        {abo.airbnb_url
                          ? <a href={abo.airbnb_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline truncate block max-w-[160px]">
                              {abo.airbnb_url.replace(/^https?:\/\/(www\.)?/, "")}
                            </a>
                          : <span className="text-xs text-text-secondary">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {userEmailMap[abo.user_id] || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusKleur[abo.status] || ""}`}>
                          {statusLabel[abo.status] || abo.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{frequentieLabel}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{betalingLabel}</td>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Email", "Airbnb URL", "Datum", "Score", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listingRapporten?.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-4 text-sm text-text-secondary">Nog geen rapporten.</td></tr>
                )}
                {listingRapporten?.map(r => {
                  const score = (r as any).totaalscore;
                  const scoreKleur = score >= 70 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
                  const airbnbUrl = (r as any).airbnb_url;
                  return (
                    <tr key={r.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3 font-semibold text-primary">{r.host_naam || "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{(r as any).email || userEmailMap[(r as any).user_id] || "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {airbnbUrl
                          ? <a href={airbnbUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block max-w-[160px]">{airbnbUrl.replace(/^https?:\/\/(www\.)?/, "")}</a>
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3">
                        {score != null ? <span className={`font-bold ${scoreKleur}`}>{score}/100</span> : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a href={`${BASE_URL}/dashboard/listing-rapporten/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-accent text-sm font-semibold hover:underline">
                          Bekijk →
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Gratis titelanalyses */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Gratis titelanalyses ({gratisRapporten?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Email", "Datum", "Airbnb URL", "Titel"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!gratisRapporten || gratisRapporten.length === 0) && (
                  <tr><td colSpan={5} className="px-5 py-4 text-sm text-text-secondary">Nog geen analyses.</td></tr>
                )}
                {gratisRapporten?.map(r => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary">{(r as any).naam || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{(r as any).email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {(r as any).airbnb_url
                        ? <a href={(r as any).airbnb_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block max-w-[160px]">
                            {(r as any).airbnb_url.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary max-w-[200px] truncate">{(r as any).titel || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Prijscalculator aanvragen */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Prijscalculator aanvragen ({calculatorRapporten?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Locatie", "Email", "Datum", "Prijs", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calculatorRapporten?.length === 0 && (
                  <tr><td colSpan={6} className="px-5 py-4 text-sm text-text-secondary">Nog geen aanvragen.</td></tr>
                )}
                {calculatorRapporten?.map(r => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary text-sm">{(r as any).voornaam || "—"}</td>
                    <td className="px-4 py-3 text-sm text-primary">{r.locatie}, {r.land}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{r.email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary">€{r.basisprijs}/nacht</td>
                    <td className="px-4 py-3 text-right">
                      <a href={`${BASE_URL}/prijscalculator/resultaat/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-accent text-sm font-semibold hover:underline">
                        Bekijk →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
