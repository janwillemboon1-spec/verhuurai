import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "info@bnbassistant.com";

function rond(n: number, decimalen = 0): number {
  return Math.round(n * Math.pow(10, decimalen)) / Math.pow(10, decimalen);
}

export default async function PrijscalculatorStatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  const { data: rapporten } = await admin
    .from("prijscalculator_rapporten")
    .select("id, voornaam, email, locatie, land, basisprijs, min_nachten, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false });

  const alleData = rapporten ?? [];

  // Dedupliceer: email + locatie + basisprijs exact gelijk = duplicaat
  const gezien = new Set<string>();
  const data = alleData.filter(r => {
    const sleutel = `${(r.email || "").toLowerCase().trim()}|${(r.locatie || "").toLowerCase().trim()}|${r.basisprijs}`;
    if (gezien.has(sleutel)) return false;
    gezien.add(sleutel);
    return true;
  });

  const aantalDuplicaten = alleData.length - data.length;
  const totaal = data.length;

  if (totaal === 0) {
    return (
      <div className="min-h-screen bg-background py-10 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="font-display text-3xl text-primary">Prijscalculator — Statistieken</h1>
            <a href="/cockpit/hostboni-admin" className="btn-secondary text-sm">← Terug naar cockpit</a>
          </div>
          <div className="card p-8 text-center text-text-secondary">Nog geen aanvragen.</div>
        </div>
      </div>
    );
  }

  // ── Basisprijzen ──────────────────────────────────────────────────────────

  const prijzen = data.map(r => Number(r.basisprijs)).filter(p => p > 0);
  const hoogstePrijs = Math.max(...prijzen);
  const laagstePrijs = Math.min(...prijzen);
  const gemiddeldePrijs = rond(prijzen.reduce((a, b) => a + b, 0) / prijzen.length, 0);
  const mediaanPrijs = (() => {
    const gesorteerd = [...prijzen].sort((a, b) => a - b);
    const m = Math.floor(gesorteerd.length / 2);
    return gesorteerd.length % 2 === 0
      ? rond((gesorteerd[m - 1] + gesorteerd[m]) / 2, 0)
      : gesorteerd[m];
  })();

  // Prijsverdeling in buckets
  const prijsBuckets = [
    { label: "< €50", min: 0, max: 49 },
    { label: "€50 – €99", min: 50, max: 99 },
    { label: "€100 – €149", min: 100, max: 149 },
    { label: "€150 – €199", min: 150, max: 199 },
    { label: "€200 – €299", min: 200, max: 299 },
    { label: "≥ €300", min: 300, max: Infinity },
  ].map(b => ({
    ...b,
    aantal: prijzen.filter(p => p >= b.min && p <= b.max).length,
  }));

  // ── Locaties ──────────────────────────────────────────────────────────────

  const locatieTellers: Record<string, number> = {};
  const landTellers: Record<string, number> = {};

  for (const r of data) {
    const loc = r.locatie?.trim() || "Onbekend";
    const land = r.land?.trim() || "Onbekend";
    locatieTellers[loc] = (locatieTellers[loc] || 0) + 1;
    landTellers[land] = (landTellers[land] || 0) + 1;
  }

  const aantalUniekeLocaties = Object.keys(locatieTellers).length;
  const aantalUniekeLanden = Object.keys(landTellers).length;

  const topLocaties = Object.entries(locatieTellers)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([locatie, aantal]) => ({ locatie, aantal, percentage: Math.round((aantal / totaal) * 100) }));

  const landenVerdeling = Object.entries(landTellers)
    .sort((a, b) => b[1] - a[1])
    .map(([land, aantal]) => ({ land, aantal, percentage: Math.round((aantal / totaal) * 100) }));

  // ── Minimum nachten ───────────────────────────────────────────────────────

  const nachtenTellers: Record<number, number> = {};
  for (const r of data) {
    const n = Number(r.min_nachten) || 1;
    nachtenTellers[n] = (nachtenTellers[n] || 0) + 1;
  }
  const nachtenVerdeling = Object.entries(nachtenTellers)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([nachten, aantal]) => ({ nachten: Number(nachten), aantal, percentage: Math.round((aantal / totaal) * 100) }));

  // ── Trend per maand ───────────────────────────────────────────────────────

  const maandTellers: Record<string, number> = {};
  for (const r of data) {
    const maand = new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { month: "short", year: "numeric" });
    maandTellers[maand] = (maandTellers[maand] || 0) + 1;
  }
  const maandTrend = Object.entries(maandTellers)
    .slice(0, 6)
    .reverse();
  const maxMaand = Math.max(...maandTrend.map(([, n]) => n));

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-primary">Prijscalculator — Statistieken</h1>
            <p className="text-text-secondary text-sm mt-1">
              Op basis van {totaal} unieke aanvragen
              {aantalDuplicaten > 0 && <span className="ml-1 text-text-secondary/60">({aantalDuplicaten} duplicaat{aantalDuplicaten === 1 ? "" : "s"} uitgefilterd)</span>}
            </p>
          </div>
          <a href="/cockpit/hostboni-admin" className="btn-secondary text-sm">← Terug naar cockpit</a>
        </div>

        {/* KPI's */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Totaal aanvragen", waarde: totaal, kleur: "text-primary" },
            { label: "Unieke locaties", waarde: aantalUniekeLocaties, kleur: "text-accent" },
            { label: "Landen", waarde: aantalUniekeLanden, kleur: "text-primary" },
            { label: "Gem. basisprijs", waarde: `€${gemiddeldePrijs}`, kleur: "text-success" },
          ].map(({ label, waarde, kleur }) => (
            <div key={label} className="card p-5 text-center">
              <p className={`text-3xl font-bold ${kleur}`}>{waarde}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Basisprijs statistieken */}
        <div className="grid sm:grid-cols-2 gap-6">
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary">Basisprijs</h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Hoogste", waarde: `€${hoogstePrijs}`, kleur: "text-success" },
                { label: "Laagste", waarde: `€${laagstePrijs}`, kleur: "text-danger" },
                { label: "Gemiddelde", waarde: `€${gemiddeldePrijs}`, kleur: "text-primary" },
                { label: "Mediaan", waarde: `€${mediaanPrijs}`, kleur: "text-primary" },
              ].map(({ label, waarde, kleur }) => (
                <div key={label} className="bg-surface rounded-xl p-3 text-center">
                  <p className={`text-2xl font-bold ${kleur}`}>{waarde}</p>
                  <p className="text-xs text-text-secondary mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Prijsverdeling */}
          <div className="card p-6 space-y-3">
            <h2 className="font-display text-xl text-primary">Prijsverdeling</h2>
            {prijsBuckets.map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <p className="text-sm text-primary w-24 flex-shrink-0 font-mono">{b.label}</p>
                <div className="flex-1 bg-border rounded-full h-5 overflow-hidden">
                  <div
                    className="h-5 bg-accent rounded-full"
                    style={{ width: totaal > 0 ? `${(b.aantal / totaal) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-sm font-bold text-primary w-6 text-right flex-shrink-0">{b.aantal}</span>
                <span className="text-xs text-text-secondary w-9 text-right flex-shrink-0">
                  {totaal > 0 ? Math.round((b.aantal / totaal) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Landen */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">Verdeling per land</h2>
          <div className="space-y-2">
            {landenVerdeling.map(({ land, aantal, percentage }) => (
              <div key={land} className="flex items-center gap-3">
                <p className="text-sm text-primary w-40 flex-shrink-0 truncate">{land}</p>
                <div className="flex-1 bg-border rounded-full h-4 overflow-hidden">
                  <div
                    className="h-4 bg-primary rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary w-6 text-right flex-shrink-0">{aantal}</span>
                <span className="text-xs text-text-secondary w-9 text-right flex-shrink-0">{percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top locaties */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">Top 10 locaties</h2>
          <div className="space-y-2">
            {topLocaties.map(({ locatie, aantal, percentage }, i) => (
              <div key={locatie} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <p className="text-sm text-primary flex-1 truncate">{locatie}</p>
                <div className="w-32 bg-border rounded-full h-3 overflow-hidden flex-shrink-0">
                  <div
                    className="h-3 bg-accent rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary w-6 text-right flex-shrink-0">{aantal}</span>
                <span className="text-xs text-text-secondary w-9 text-right flex-shrink-0">{percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Minimum nachten */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">Minimum nachten</h2>
          <div className="space-y-2">
            {nachtenVerdeling.map(({ nachten, aantal, percentage }) => (
              <div key={nachten} className="flex items-center gap-3">
                <p className="text-sm text-primary w-24 flex-shrink-0">
                  {nachten === 1 ? "1 nacht" : `${nachten} nachten`}
                </p>
                <div className="flex-1 bg-border rounded-full h-4 overflow-hidden">
                  <div
                    className="h-4 bg-success rounded-full"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-primary w-6 text-right flex-shrink-0">{aantal}</span>
                <span className="text-xs text-text-secondary w-9 text-right flex-shrink-0">{percentage}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trend afgelopen 6 maanden */}
        {maandTrend.length > 0 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary">Aanvragen per maand (recent)</h2>
            <div className="space-y-2">
              {maandTrend.map(([maand, aantal]) => (
                <div key={maand} className="flex items-center gap-3">
                  <p className="text-sm text-primary w-28 flex-shrink-0">{maand}</p>
                  <div className="flex-1 bg-border rounded-full h-5 overflow-hidden">
                    <div
                      className="h-5 bg-primary rounded-full transition-all"
                      style={{ width: maxMaand > 0 ? `${(aantal / maxMaand) * 100}%` : "0%" }}
                    />
                  </div>
                  <span className="text-sm font-bold text-primary w-6 text-right flex-shrink-0">{aantal}</span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
