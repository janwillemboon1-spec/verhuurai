import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CollapsibleSection } from "@/components/CollapsibleSection";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  const [
    { data: abonnementen },
    { data: reviewRapporten },
    { data: listingRapportenRaw },
    { data: calculatorRapporten },
    { data: gratisRapporten },
    { data: usersData },
    { data: fotoSessies },
  ] = await Promise.all([
    admin.from("abonnementen").select("*").order("aangemaakt_op", { ascending: false }),
    admin.from("rapporten").select("id, abonnement_id, aangemaakt_op, periode_omschrijving, user_id").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.from("listing_rapporten").select("id, host_naam, email, aangemaakt_op, user_id, airbnb_url, rapport_json").order("aangemaakt_op", { ascending: false }),
    admin.from("prijscalculator_rapporten").select("id, voornaam, email, locatie, land, basisprijs, aangemaakt_op").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.from("gratis_rapporten").select("id, naam, email, airbnb_url, titel, aangemaakt_op").order("aangemaakt_op", { ascending: false }).limit(100),
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin.from("foto_sessies").select("id, naam, email, status, aantal_fotos, totaal_prijs, aangemaakt_op").order("aangemaakt_op", { ascending: false }).limit(100),
  ]);

  // Extraheer totaalscore uit rapport_json
  const listingRapporten = (listingRapportenRaw ?? []).map((r: any) => ({
    ...r,
    totaalscore: r.rapport_json?.totaalscore ?? null,
  }));

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

  const fotoKlaar = fotoSessies?.filter(s => s.status === "klaar").length ?? 0;
  const fotoOmzet = fotoSessies?.reduce((sum, s) => sum + Number(s.totaal_prijs || 0), 0) ?? 0;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-3xl text-primary">Admin</h1>
          <div className="flex gap-3 flex-wrap">
            <a href="/admin/listing-optimizer" className="btn-secondary text-sm">📊 LO</a>
            <a href="/admin/host-performance" className="btn-secondary text-sm">⭐ HP</a>
            <a href="/admin/prijscalculator" className="btn-secondary text-sm">💰 PC</a>
            <Link href="/admin/foto-optimizer" className="btn-secondary text-sm">📷 Foto</Link>
            <a href="/admin/contacten" className="btn-primary text-sm">👥 Contacten</a>
            <a href="/dashboard" className="btn-secondary text-sm">← Dashboard</a>
          </div>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {[
            { label: "HP Actief", aantal: actief, kleur: "text-success" },
            { label: "HP Proef", aantal: proef, kleur: "text-warning" },
            { label: "HP Reviews", aantal: reviewRapporten?.length ?? 0, kleur: "text-accent" },
            { label: "LO Rapporten", aantal: listingRapporten?.length ?? 0, kleur: "text-primary" },
            { label: "Gratis", aantal: gratisRapporten?.length ?? 0, kleur: "text-accent" },
            { label: "Prijscalc.", aantal: calculatorRapporten?.length ?? 0, kleur: "text-success" },
            { label: "Foto sessies", aantal: fotoSessies?.length ?? 0, kleur: "text-primary" },
          ].map(({ label, aantal, kleur }) => (
            <div key={label} className="card p-3 text-center">
              <p className={`text-2xl font-bold ${kleur}`}>{aantal}</p>
              <p className="text-xs text-text-secondary mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Host Performance */}
        <CollapsibleSection title="Host Performance" count={abonnementen?.length ?? 0}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>{["Voornaam", "Woning", "Email", "Status", "Frequentie", "Betaling", "Rapporten"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {abonnementen?.map((abo) => {
                  const aboRapporten = reviewRapporten?.filter(r => r.abonnement_id === abo.id) ?? [];
                  const frequentieLabel = abo.frequentie === "weekly" ? "Wekelijks" : abo.frequentie === "eenmalig" ? "Eenmalig" : "Maandelijks";
                  const betalingLabel = abo.frequentie === "eenmalig" ? "Eenmalig" : abo.billing_interval === "year" ? "Jaarlijks" : "Maandelijks";
                  return (
                    <tr key={abo.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3 text-sm text-primary">{abo.voornaam || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-primary text-sm">{abo.listing_naam || "—"}</p>
                        {abo.airbnb_url ? <a href={abo.airbnb_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline truncate block max-w-[160px]">{abo.airbnb_url.replace(/^https?:\/\/(www\.)?/, "")}</a> : <span className="text-xs text-text-secondary">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{userEmailMap[abo.user_id] || "—"}</td>
                      <td className="px-4 py-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusKleur[abo.status] || ""}`}>{statusLabel[abo.status] || abo.status}</span></td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{frequentieLabel}</td>
                      <td className="px-4 py-3 text-text-secondary text-xs">{betalingLabel}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {aboRapporten.length === 0 && <span className="text-xs text-text-secondary">Geen</span>}
                          {aboRapporten.map(r => (
                            <a key={r.id} href={`${BASE_URL}/dashboard/rapporten/${r.id}`} target="_blank" rel="noopener noreferrer" className="block text-xs text-accent hover:underline">
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
        </CollapsibleSection>

        {/* Listing Optimizer */}
        <CollapsibleSection title="Listing Optimizer rapporten" count={listingRapporten?.length ?? 0}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>{["Naam", "Email", "Airbnb URL", "Datum", "Score", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {listingRapporten?.length === 0 && <tr><td colSpan={6} className="px-5 py-4 text-sm text-text-secondary">Nog geen rapporten.</td></tr>}
                {listingRapporten?.map((r: any) => {
                  const score = r.totaalscore;
                  const scoreKleur = score >= 70 ? "text-success" : score >= 50 ? "text-warning" : "text-danger";
                  return (
                    <tr key={r.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3 font-semibold text-primary">{r.host_naam || "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{r.email || userEmailMap[r.user_id] || "—"}</td>
                      <td className="px-4 py-3 text-xs text-text-secondary">
                        {r.airbnb_url ? <a href={r.airbnb_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block max-w-[160px]">{r.airbnb_url.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-text-secondary">{new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}</td>
                      <td className="px-4 py-3">{score != null ? <span className={`font-bold ${scoreKleur}`}>{score}/100</span> : "—"}</td>
                      <td className="px-4 py-3 text-right"><a href={`${BASE_URL}/dashboard/listing-rapporten/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-accent text-sm font-semibold hover:underline">Bekijk →</a></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Foto Optimizer */}
        <CollapsibleSection title="Foto Optimizer sessies" count={fotoSessies?.length ?? 0}>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-border">
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-success">{fotoKlaar}</p>
              <p className="text-xs text-text-secondary">Klaar</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-primary">€{fotoOmzet.toFixed(2).replace(".", ",")}</p>
              <p className="text-xs text-text-secondary">Totale omzet</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-xl font-bold text-primary">{fotoSessies?.reduce((s, f) => s + (f.aantal_fotos || 0), 0) ?? 0}</p>
              <p className="text-xs text-text-secondary">Foto&apos;s totaal</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>{["Naam", "Email", "Status", "Foto's", "Bedrag", "Datum", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!fotoSessies || fotoSessies.length === 0) && <tr><td colSpan={7} className="px-5 py-4 text-sm text-text-secondary">Nog geen sessies.</td></tr>}
                {fotoSessies?.map(s => (
                  <tr key={s.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary">{s.naam}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === "klaar" ? "bg-success/10 text-success" : s.status === "verwerking" ? "bg-warning/10 text-warning" : s.status === "fout" ? "bg-danger/10 text-danger" : "bg-border text-text-secondary"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{s.aantal_fotos}</td>
                    <td className="px-4 py-3 text-text-secondary">€{Number(s.totaal_prijs).toFixed(2).replace(".", ",")}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{new Date(s.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-right"><Link href={`/admin/foto-optimizer/${s.id}`} className="text-accent text-sm font-semibold hover:underline">Beheer →</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Gratis titelanalyses */}
        <CollapsibleSection title="Gratis titelanalyses" count={gratisRapporten?.length ?? 0}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>{["Naam", "Email", "Datum", "Airbnb URL", "Titel"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!gratisRapporten || gratisRapporten.length === 0) && <tr><td colSpan={5} className="px-5 py-4 text-sm text-text-secondary">Nog geen analyses.</td></tr>}
                {gratisRapporten?.map(r => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary">{(r as any).naam || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{(r as any).email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {(r as any).airbnb_url ? <a href={(r as any).airbnb_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block max-w-[160px]">{(r as any).airbnb_url.replace(/^https?:\/\/(www\.)?/, "")}</a> : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary max-w-[200px] truncate">{(r as any).titel || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* Prijscalculator */}
        <CollapsibleSection title="Prijscalculator aanvragen" count={calculatorRapporten?.length ?? 0}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>{["Naam", "Locatie", "Email", "Datum", "Prijs", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                ))}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {calculatorRapporten?.length === 0 && <tr><td colSpan={6} className="px-5 py-4 text-sm text-text-secondary">Nog geen aanvragen.</td></tr>}
                {calculatorRapporten?.map(r => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary text-sm">{(r as any).voornaam || "—"}</td>
                    <td className="px-4 py-3 text-sm text-primary">{r.locatie}, {r.land}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{r.email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">{new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">€{r.basisprijs}/nacht</td>
                    <td className="px-4 py-3 text-right"><a href={`${BASE_URL}/prijscalculator/resultaat/${r.id}`} target="_blank" rel="noopener noreferrer" className="text-accent text-sm font-semibold hover:underline">Bekijk →</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

      </div>
    </div>
  );
}
