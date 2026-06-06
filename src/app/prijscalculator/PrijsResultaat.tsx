"use client";

import Link from "next/link";
import { DeelModal } from "@/components/DeelModal";
import { useState } from "react";

const MAANDEN = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];

const MODIFIERS = {
  laag:      { min: -0.30, max: -0.15, label: "Laagseizoen",   kleur: "blue",   icoon: "❄️" },
  tussen:    { min: -0.05, max:  0.10, label: "Tussenseizoen", kleur: "amber",  icoon: "🌤️" },
  hoog:      { min:  0.20, max:  0.50, label: "Hoogseizoen",   kleur: "orange", icoon: "☀️" },
  vakantie:  { min:  0.15, max:  0.40, label: "Vakantie",      kleur: "green",  icoon: "🏖️" },
  evenement: { min:  0.30, max:  0.80, label: "Evenement",     kleur: "purple", icoon: "🎉" },
  feestdag:  { min:  0.30, max:  0.80, label: "Feestdag",      kleur: "purple", icoon: "🎊" },
} as const;

const KLEUR: Record<string, { bg: string; text: string; border: string; header: string }> = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   header: "bg-blue-600 text-white" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  header: "bg-amber-500 text-white" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", header: "bg-orange-500 text-white" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  header: "bg-green-600 text-white" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", header: "bg-purple-600 text-white" },
};

function p(basis: number, s: { min: number; max: number }, e: { min: number; max: number } = { min: 0, max: 0 }) {
  return { min: Math.round(basis * (1 + s.min + e.min)), max: Math.round(basis * (1 + s.max + e.max)) };
}

export default function PrijsResultaat({ analyse, basis, minN, jaar, opgeslagenId }: {
  analyse: any; basis: number; minN: number; jaar: number; opgeslagenId: string;
}) {
  const [deelOpen, setDeelOpen] = useState(false);
  const gebruikBasisprijs = minN >= 6;
  const resultaatUrl = typeof window !== "undefined"
    ? `${window.location.origin}/prijscalculator/resultaat/${opgeslagenId}`
    : `https://verhuurai.nl/prijscalculator/resultaat/${opgeslagenId}`;

  const bijzonderPerMaand: Record<number, any[]> = {};
  const voegToe = (item: any) => {
    const startDatum = item.datum || item.van;
    if (!startDatum) return;
    const van = new Date(startDatum);
    const tot = item.tot || item.datumTot ? new Date(item.tot || item.datumTot) : van;
    const maanden = new Set<number>();
    for (let d = new Date(van); d <= tot; d.setDate(d.getDate() + 1)) maanden.add(d.getMonth() + 1);
    maanden.forEach(m => {
      if (!bijzonderPerMaand[m]) bijzonderPerMaand[m] = [];
      if (!bijzonderPerMaand[m].find((x: any) => x.naam === item.naam))
        bijzonderPerMaand[m].push({ ...item, datum: startDatum });
    });
  };
  [...(analyse.evenementen || []), ...(analyse.feestdagen || []), ...(analyse.vakanties || [])].forEach(voegToe);
  const alleBijzonder = [...(analyse.feestdagen || []), ...(analyse.evenementen || [])].filter((a: any) => a?.datum).sort((a: any, b: any) => a.datum.localeCompare(b.datum));

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      {deelOpen && <DeelModal onSluit={() => setDeelOpen(false)} overrideUrl={resultaatUrl} titel={`Prijsrapport ${analyse.locatie}`} />}
      <div className="max-w-4xl mx-auto space-y-8">

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-3xl text-primary">Prijsrapport</h1>
            <p className="text-text-secondary">{analyse.locatie}, {analyse.land} · Basisprijs €{basis}/nacht · {jaar}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeelOpen(true)} className="btn-secondary text-sm flex items-center gap-2">
              <span>↗</span> Delen
            </button>
            <Link href="/prijscalculator" className="btn-primary text-sm">Nieuwe berekening →</Link>
          </div>
        </div>

        <div className="card p-5 flex gap-4 items-start border-accent/30">
          <p className="text-text-secondary text-sm leading-relaxed">{analyse.marktToelichting}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(["laag","tussen","hoog","vakantie","evenement"] as const).map(k => {
            const m = MODIFIERS[k]; const kl = KLEUR[(m as any).kleur];
            return <span key={k} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${kl.bg} ${kl.text}`}>{(m as any).icoon} {m.label}</span>;
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {MAANDEN.map((naam, mi) => {
            const m = mi + 1;
            const seizoen = (analyse.seizoenen || {})[m.toString()] as keyof typeof MODIFIERS;
            const mod = MODIFIERS[seizoen] || MODIFIERS.tussen;
            const kl = KLEUR[(mod as any).kleur];
            const dagen = bijzonderPerMaand[m] || [];
            const wdPrijs = gebruikBasisprijs ? p(basis, mod) : p(basis, mod, { min: -0.20, max: -0.10 });
            const wePrijs = gebruikBasisprijs ? p(basis, mod) : p(basis, mod, { min: 0.10, max: 0.25 });

            return (
              <div key={m} className={`card overflow-hidden border ${kl.border}`}>
                <div className={`px-4 py-2.5 flex items-center justify-between ${kl.header}`}>
                  <span className="font-semibold text-sm">{naam}</span>
                  <span className="text-xs opacity-90">{(mod as any).icoon} {mod.label}</span>
                </div>
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
                        <p className="font-bold text-primary text-sm">€{wdPrijs.min}–{wdPrijs.max}</p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${kl.bg}`}>
                        <p className="text-xs text-text-secondary font-semibold mb-1">Weekend</p>
                        <p className="font-bold text-primary text-sm">€{wePrijs.min}–{wePrijs.max}</p>
                      </div>
                    </div>
                  )}
                  {dagen.length > 0 && (
                    <div className="space-y-1.5 pt-1 border-t border-border">
                      {dagen.slice(0, 3).map((d: any, i: number) => {
                        const evMod = MODIFIERS[(d.type as keyof typeof MODIFIERS)] || MODIFIERS.evenement;
                        const isKerst = d.naam?.toLowerCase().includes("kerst") && seizoen === "hoog";
                        const effectief = isKerst ? { min: 0.80, max: 0.80 } : { min: Math.max(mod.min, evMod.min), max: Math.max(mod.max, evMod.max) };
                        const evPrijs = p(basis, effectief);
                        return (
                          <div key={i} className="flex items-center justify-between gap-2 bg-purple-50 rounded-lg px-2.5 py-1.5">
                            <p className="text-xs font-semibold text-purple-800 truncate">{(evMod as any).icoon} {d.naam}</p>
                            <p className="text-xs font-bold text-purple-700 whitespace-nowrap">€{evPrijs.min}–{evPrijs.max}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {alleBijzonder.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-surface">
              <h2 className="font-display text-xl text-primary">🎉 Alle bijzondere dagen {jaar}</h2>
            </div>
            <div className="divide-y divide-border">
              {alleBijzonder.map((item: any, i: number) => {
                const evMod = MODIFIERS[(item.type as keyof typeof MODIFIERS)] || MODIFIERS.evenement;
                const maandNr = parseInt(item.datum.split("-")[1]);
                const seizoenMod = MODIFIERS[(analyse.seizoenen?.[maandNr.toString()] as keyof typeof MODIFIERS)] || MODIFIERS.tussen;
                const isKerst = item.naam?.toLowerCase().includes("kerst") && seizoenMod === MODIFIERS.hoog;
                const effectief = isKerst ? { min: 0.80, max: 0.80 } : { min: Math.max(seizoenMod.min, evMod.min), max: Math.max(seizoenMod.max, evMod.max) };
                const evPrijs = p(basis, effectief);
                const kl = KLEUR[(evMod as any).kleur];
                return (
                  <div key={i} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-surface/50">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs text-text-secondary">{new Date(item.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kl.bg} ${kl.text}`}>{(evMod as any).icoon} {evMod.label}</span>
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

        <div className="card p-6 border-warning/40 bg-warning/5 space-y-4">
          <div className="flex gap-3 items-start">
            <span className="text-2xl">💡</span>
            <div className="space-y-2">
              <p className="font-semibold text-primary">Deze prijzen zijn ter indicatie</p>
              <p className="text-sm text-text-secondary">De bovenstaande prijzen zijn een goede eerste stap als je tot nu toe weinig of niets met je prijsstrategie hebt gedaan. Voor een echt optimale strategie raden we een dynamic pricing tool aan.</p>
            </div>
          </div>
          <div className="border-t border-warning/20 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-primary">Boni raadt PriceLabs aan</p>
              <p className="text-xs text-text-secondary">Start via onze link: <strong>1 maand gratis + $10 credit</strong></p>
            </div>
            <a href="https://pricelabs.co/users/sign_up?referral/NkFJkg" target="_blank" rel="noopener noreferrer" className="btn-primary whitespace-nowrap">
              Probeer PriceLabs →
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}
