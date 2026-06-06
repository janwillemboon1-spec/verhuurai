"use client";

import { useState } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";
import { DeelModal } from "@/components/DeelModal";

// ── Configuratie ──────────────────────────────────────────────────────────────

const MODIFIERS = {
  laag:      { min: -0.30, max: -0.15, label: "Laagseizoen",    kleur: "blue",   icoon: "❄️" },
  tussen:    { min: -0.05, max:  0.10, label: "Tussenseizoen",  kleur: "amber",  icoon: "🌤️" },
  hoog:      { min:  0.20, max:  0.50, label: "Hoogseizoen",    kleur: "orange", icoon: "☀️" },
  vakantie:  { min:  0.15, max:  0.40, label: "Vakantie",       kleur: "green",  icoon: "🏖️" },
  evenement: { min:  0.30, max:  0.80, label: "Evenement/Feestdag", kleur: "purple", icoon: "🎉" },
  feestdag:  { min:  0.30, max:  0.80, label: "Feestdag",       kleur: "purple", icoon: "🎊" },
  weekend:   { min:  0.10, max:  0.25, label: "Weekend",        kleur: "gray",   icoon: "" },
  weekdag:   { min: -0.20, max: -0.10, label: "Weekdag",        kleur: "gray",   icoon: "" },
} as const;

const KLEUR_CLASSES: Record<string, { bg: string; text: string; border: string; header: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   header: "bg-blue-600 text-white" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  header: "bg-amber-500 text-white" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", header: "bg-orange-500 text-white" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  header: "bg-green-600 text-white" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", header: "bg-purple-600 text-white" },
};

const MAANDEN = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const JAAR = new Date().getFullYear() + 1;

// ── Hulpfuncties ──────────────────────────────────────────────────────────────

function prijs(basis: number, seizoen: { min: number; max: number }, extra: { min: number; max: number } = { min: 0, max: 0 }) {
  return {
    min: Math.round(basis * (1 + seizoen.min + extra.min)),
    max: Math.round(basis * (1 + seizoen.max + extra.max)),
  };
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Bijzonderedag { naam: string; datum: string; datumTot?: string | null; beschrijving?: string; type: string }
interface Analyse {
  locatie: string; land: string;
  seizoenen: Record<string, string>;
  vakanties: Bijzonderedag[];
  evenementen: Bijzonderedag[];
  feestdagen: Bijzonderedag[];
  marktToelichting: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PrijscalculatorPage() {
  const [land, setLand] = useState("");
  const [plaats, setPlaats] = useState("");
  const [basisprijs, setBasisprijs] = useState("");
  const [minNachten, setMinNachten] = useState("");
  const [email, setEmail] = useState("");
  const [laden, setLaden] = useState(false);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [opgeslagenId, setOpgeslagenId] = useState<string | null>(null);
  const [deelOpen, setDeelOpen] = useState(false);

  const basis = parseFloat(basisprijs) || 0;
  const minN = parseInt(minNachten) || 1;
  const locatie = [plaats, land].filter(Boolean).join(", ");
  const gebruikBasisprijs = minN >= 6;

  const analyseer = async () => {
    if (!land.trim() || !plaats.trim() || !basis) return;
    setLaden(true); setFout(null); setAnalyse(null); setOpgeslagenId(null);
    try {
      const res = await fetch("/api/locatie-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locatie: locatie.trim(), jaar: JAAR }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error();
      setAnalyse(data.data);

      // Opslaan in Supabase + email sturen
      const saveRes = await fetch("/api/prijscalculator-opslaan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || null,
          locatie: data.data.locatie,
          land: data.data.land,
          basisprijs: basis,
          minNachten: minN,
          jaar: JAAR,
          resultaat: data.data,
        }),
      });
      const saveData = await saveRes.json();
      if (saveData.id) setOpgeslagenId(saveData.id);
    } catch {
      setFout("Analyse mislukt. Probeer een specifiekere locatie (bijv. 'Amsterdam' of 'Costa del Sol').");
    }
    setLaden(false);
  };

  const resultaatUrl = opgeslagenId
    ? `${typeof window !== "undefined" ? window.location.origin : "https://verhuurai.nl"}/prijscalculator/resultaat/${opgeslagenId}`
    : "";

  // Bouw bijzondere-dagen map per maand
  const bijzonderPerMaand: Record<number, Bijzonderedag[]> = {};
  if (analyse) {
    const voegToe = (item: Bijzonderedag) => {
      // Vakanties hebben van/tot, evenementen/feestdagen hebben datum
      const startDatum = item.datum || (item as any).van;
      const eindDatum = (item as any).tot || item.datumTot || startDatum;
      if (!startDatum) return;

      // Voeg toe aan alle maanden die de periode beslaat
      const van = new Date(startDatum);
      const tot = eindDatum ? new Date(eindDatum) : van;
      const maanden = new Set<number>();
      for (let d = new Date(van); d <= tot; d.setDate(d.getDate() + 1)) {
        maanden.add(d.getMonth() + 1);
      }
      maanden.forEach(m => {
        if (!bijzonderPerMaand[m]) bijzonderPerMaand[m] = [];
        // Voorkom duplicaten
        if (!bijzonderPerMaand[m].find(x => x.naam === item.naam)) {
          bijzonderPerMaand[m].push({ ...item, datum: startDatum });
        }
      });
    };
    [...(analyse.evenementen || []), ...(analyse.feestdagen || []), ...(analyse.vakanties || [])].forEach(voegToe);
  }

  const alleBijzonder = analyse
    ? [...(analyse.feestdagen || []), ...(analyse.evenementen || [])]
        .filter(a => a?.datum)
        .sort((a, b) => a.datum.localeCompare(b.datum))
    : [];

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-to-br from-background to-blue-50/30">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <BoniAvatar size={90} animate className="mx-auto" />
          <h1 className="font-display text-4xl sm:text-5xl text-primary font-bold">Prijscalculator</h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto">
            Vul je locatie en basisprijs in. Boni analyseert de lokale markt en berekent automatisch de optimale prijzen voor heel {JAAR}.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8">

        {/* Formulier */}
        <div className="card p-6 sm:p-8 space-y-5 -mt-8 shadow-lg">
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">Land <span className="text-accent">*</span></label>
              <input
                type="text" value={land}
                onChange={e => setLand(e.target.value)}
                placeholder="Bijv. Nederland, Italië, Spanje"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">Plaats <span className="text-accent">*</span></label>
              <input
                type="text" value={plaats}
                onChange={e => setPlaats(e.target.value)}
                placeholder="Bijv. Amsterdam, Toscane, Mallorca"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">Basisprijs per nacht (€) <span className="text-accent">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary font-semibold">€</span>
                <input
                  type="number" value={basisprijs}
                  onChange={e => setBasisprijs(e.target.value)}
                  placeholder="150" min={1}
                  className="input pl-7"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">Minimum aantal nachten</label>
              <input
                type="number" value={minNachten}
                onChange={e => setMinNachten(e.target.value)}
                placeholder="Bijv. 2"
                min={1} max={30}
                className="input"
              />
              {minN >= 6 && (
                <p className="text-xs text-success font-semibold mt-1">
                  ✓ Bij ≥6 nachten geldt dezelfde prijs voor weekdagen en weekenden
                </p>
              )}
              {minN > 0 && minN < 6 && (
                <p className="text-xs text-text-secondary mt-1">
                  Weekdag -10% tot -20% · Weekend +10% tot +25%
                </p>
              )}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">
              E-mailadres <span className="text-text-secondary text-xs font-normal">(we sturen je rapport naar dit adres)</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jij@voorbeeld.nl"
              className="input"
            />
          </div>

          <div className="text-center">
            <a href="/prijscalculator/demo" className="text-center block text-sm border border-accent/40 text-accent font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/5 transition-colors flex items-center justify-center gap-2">
              👁️ Bekijk een voorbeeldrapport (Estepona, Spanje) →
            </a>
          </div>

          {fout && <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">{fout}</div>}

          <button
            onClick={analyseer}
            disabled={!land.trim() || !plaats.trim() || !basis || laden}
            className={`btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 ${(!land.trim() || !plaats.trim() || !basis || laden) ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {laden ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Boni analyseert de markt... (±15 sec)
              </>
            ) : `Bereken prijzen voor ${JAAR} →`}
          </button>
        </div>

        {/* Resultaat */}
        {analyse && basis > 0 && (
          <div className="space-y-6">

            {/* Deelknop */}
            {opgeslagenId && (
              <>
                {deelOpen && <DeelModal onSluit={() => setDeelOpen(false)} overrideUrl={resultaatUrl} titel={`Prijsrapport ${analyse.locatie}`} />}
                <div className="flex justify-end">
                  <button onClick={() => setDeelOpen(true)} className="btn-secondary text-sm flex items-center gap-2">
                    <span>↗</span> Rapport delen
                  </button>
                </div>
              </>
            )}

            {/* Marktanalyse */}
            <div className="card p-5 flex gap-4 items-start border-accent/30">
              <BoniAvatar size={52} className="flex-shrink-0" />
              <div>
                <p className="font-display text-lg text-primary">{analyse.locatie}, {analyse.land}</p>
                <p className="text-text-secondary text-sm mt-1 leading-relaxed">{analyse.marktToelichting}</p>
              </div>
            </div>

            {/* Legenda */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-text-secondary font-semibold">Legenda:</span>
              {(["laag","tussen","hoog","vakantie","evenement"] as const).map(k => {
                const m = MODIFIERS[k];
                const kl = KLEUR_CLASSES[(m as any).kleur];
                return (
                  <span key={k} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${kl.bg} ${kl.text}`}>
                    {(m as any).icoon} {m.label}
                  </span>
                );
              })}
            </div>

            {/* Maandkaarten */}
            <div>
              <h2 className="font-display text-2xl text-primary mb-4">Prijsoverzicht {JAAR}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {MAANDEN.map((naam, mi) => {
                  const m = mi + 1;
                  const seizoen = analyse.seizoenen[m.toString()] as keyof typeof MODIFIERS;
                  const mod = MODIFIERS[seizoen] || MODIFIERS.tussen;
                  const kl = KLEUR_CLASSES[(mod as any).kleur];
                  const dagen = bijzonderPerMaand[m] || [];

                  // Bij ≥6 nachten: geen weekdag/weekend onderscheid, alleen seizoen
                  const wdPrijs = gebruikBasisprijs
                    ? prijs(basis, mod)
                    : prijs(basis, mod, MODIFIERS.weekdag);
                  const wePrijs = gebruikBasisprijs
                    ? prijs(basis, mod)
                    : prijs(basis, mod, MODIFIERS.weekend);

                  return (
                    <div key={m} className={`card overflow-hidden border ${kl.border}`}>
                      {/* Header */}
                      <div className={`px-4 py-2.5 flex items-center justify-between ${kl.header}`}>
                        <span className="font-semibold text-sm">{naam}</span>
                        <span className="text-xs opacity-90">{(mod as any).icoon} {mod.label}</span>
                      </div>

                      {/* Prijzen */}
                      <div className="p-4 space-y-3">
                        {gebruikBasisprijs ? (
                          <div className={`rounded-xl p-3 text-center ${kl.bg}`}>
                            <p className="text-xs text-text-secondary font-semibold mb-1">Prijs per nacht</p>
                            <p className="font-bold text-primary">€{wdPrijs.min}–{wdPrijs.max}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <div className={`rounded-xl p-3 text-center ${kl.bg}`}>
                              <p className="text-xs text-text-secondary font-semibold mb-1">Weekdag</p>
                              <p className="font-bold text-primary">€{wdPrijs.min}–{wdPrijs.max}</p>
                            </div>
                            <div className={`rounded-xl p-3 text-center ${kl.bg}`}>
                              <p className="text-xs text-text-secondary font-semibold mb-1">Weekend</p>
                              <p className="font-bold text-primary">€{wePrijs.min}–{wePrijs.max}</p>
                            </div>
                          </div>
                        )}

                        {/* Bijzondere dagen */}
                        {dagen.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-border">
                            {dagen.slice(0, 3).map((d, i) => {
                              const evModRaw = MODIFIERS[(d.type as keyof typeof MODIFIERS)] || MODIFIERS.evenement;
                              // Kerstvakantie in hoogseizoen: altijd +80%
                              const isKerst = d.naam?.toLowerCase().includes("kerst");
                              const isHoogseizoen = seizoen === "hoog";
                              const effectieveMod = isKerst && isHoogseizoen
                                ? { min: 0.80, max: 0.80 }
                                : { min: Math.max(mod.min, evModRaw.min), max: Math.max(mod.max, evModRaw.max) };
                              const evPrijs = prijs(basis, effectieveMod);
                              return (
                                <div key={i} className="flex items-center justify-between gap-2 bg-purple-50 rounded-lg px-2.5 py-1.5">
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-purple-800 truncate">{(evModRaw as any).icoon} {d.naam}</p>
                                  </div>
                                  <p className="text-xs font-bold text-purple-700 whitespace-nowrap">€{evPrijs.min}–{evPrijs.max}</p>
                                </div>
                              );
                            })}
                            {dagen.length > 3 && <p className="text-xs text-text-secondary pl-1">+{dagen.length - 3} meer</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alle bijzondere dagen */}
            {alleBijzonder.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-border bg-surface">
                  <h2 className="font-display text-xl text-primary">🎉 Alle bijzondere dagen {JAAR}</h2>
                </div>
                <div className="divide-y divide-border">
                  {alleBijzonder.map((item, i) => {
                    const evModRaw = MODIFIERS[(item.type as keyof typeof MODIFIERS)] || MODIFIERS.evenement;
                    const maandNr = parseInt(item.datum.split("-")[1]);
                    const seizoenVanMaand = analyse!.seizoenen[maandNr.toString()] as keyof typeof MODIFIERS;
                    const seizoenMod = MODIFIERS[seizoenVanMaand] || MODIFIERS.tussen;
                    const isKerstItem = item.naam?.toLowerCase().includes("kerst");
                    const isHoogItem = seizoenVanMaand === "hoog";
                    const effectieveMod2 = isKerstItem && isHoogItem
                      ? { min: 0.80, max: 0.80 }
                      : { min: Math.max(seizoenMod.min, evModRaw.min), max: Math.max(seizoenMod.max, evModRaw.max) };
                    const evPrijs = prijs(basis, effectieveMod2);
                    const datum = new Date(item.datum);
                    const kl = KLEUR_CLASSES[(evModRaw as any).kleur];
                    return (
                      <div key={i} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-surface/50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs text-text-secondary font-semibold">
                              {datum.toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kl.bg} ${kl.text}`}>
                              {(evModRaw as any).icoon} {evModRaw.label}
                            </span>
                          </div>
                          <p className="font-semibold text-primary">{item.naam}</p>
                          {item.beschrijving && <p className="text-xs text-text-secondary mt-0.5">{item.beschrijving}</p>}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-accent">€{evPrijs.min}–€{evPrijs.max}</p>
                          <p className="text-xs text-text-secondary">per nacht</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <div className="card p-6 border-warning/40 bg-warning/5 space-y-4">
              <div className="flex gap-3 items-start">
                <span className="text-2xl flex-shrink-0">💡</span>
                <div className="space-y-2">
                  <p className="font-semibold text-primary">Deze prijzen zijn ter indicatie</p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    De bovenstaande prijzen zijn een goede eerste stap als je tot nu toe weinig of niets met je prijsstrategie hebt gedaan. Ze geven je een solide basisstructuur op basis van seizoenen, weekenden en lokale evenementen.
                  </p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Wil je echt het maximale uit je verhuur halen? Dan is een <strong className="text-primary">dynamic pricing tool</strong> de volgende stap. Zulke tools passen je prijzen automatisch dagelijks aan op basis van tientallen factoren.
                  </p>
                </div>
              </div>
              <div className="border-t border-warning/20 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-primary">Boni raadt PriceLabs aan</p>
                  <p className="text-xs text-text-secondary">Start via onze link en ontvang <strong>1 maand gratis + $10 credit</strong> cadeau</p>
                </div>
                <a
                  href="https://pricelabs.co/users/sign_up?referral/NkFJkg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary whitespace-nowrap flex-shrink-0"
                >
                  Probeer PriceLabs →
                </a>
              </div>
            </div>

            {/* CTA */}
            <div className="card p-8 bg-primary border-0 text-center space-y-4">
              <h2 className="font-display text-2xl text-white">Wil je ook je advertentie laten optimaliseren?</h2>
              <p className="text-white/70">Boni analyseert je titel, beschrijving en alle andere velden.</p>
              <a href="/listing-optimizer" className="btn-primary inline-block">Listing Optimizer →</a>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
