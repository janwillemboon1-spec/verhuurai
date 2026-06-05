"use client";

import { BoniAvatar } from "@/components/BoniAvatar";
import Link from "next/link";

const MODIFIERS = {
  laag:      { min: -0.30, max: -0.15, label: "Laagseizoen",    kleur: "blue",   icoon: "❄️" },
  tussen:    { min: -0.05, max:  0.10, label: "Tussenseizoen",  kleur: "amber",  icoon: "🌤️" },
  hoog:      { min:  0.20, max:  0.50, label: "Hoogseizoen",    kleur: "orange", icoon: "☀️" },
  vakantie:  { min:  0.15, max:  0.40, label: "Vakantie",       kleur: "green",  icoon: "🏖️" },
  evenement: { min:  0.30, max:  0.80, label: "Evenement",      kleur: "purple", icoon: "🎉" },
  feestdag:  { min:  0.30, max:  0.80, label: "Feestdag",       kleur: "purple", icoon: "🎊" },
} as const;

const KLEUR = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200",   header: "bg-blue-600 text-white" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200",  header: "bg-amber-500 text-white" },
  orange: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", header: "bg-orange-500 text-white" },
  green:  { bg: "bg-green-50",  text: "text-green-700",  border: "border-green-200",  header: "bg-green-600 text-white" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", header: "bg-purple-600 text-white" },
};

const MAANDEN = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const BASIS = 150;
const JAAR = 2027;

const DEMO = {
  locatie: "Estepona, Costa del Sol",
  land: "Spanje",
  seizoenen: { "1":"laag","2":"laag","3":"laag","4":"tussen","5":"tussen","6":"tussen","7":"hoog","8":"hoog","9":"tussen","10":"laag","11":"laag","12":"laag" },
  toelichting: "Estepona is een populaire badplaats aan de Costa del Sol, geliefd bij golfers en strandgangers. Het absolute hoogseizoen valt in juli en augustus wanneer Europese toeristen massaal naar de Costa del Sol trekken. April t/m juni en september zijn drukke schouderseizoenen. De wintermaanden zijn rustig, maar de kerstperiode trekt bezoekers die de zachte temperaturen opzoeken.",
  bijzonder: [
    { maand: 1,  naam: "Nieuwjaarsdag",         type: "feestdag",  prijs: { min: 195, max: 270 }, beschrijving: null },
    { maand: 2,  naam: "Carnaval Estepona",      type: "evenement", prijs: { min: 195, max: 270 }, beschrijving: "Kleurrijk carnaval met optochten in het historische centrum" },
    { maand: 4,  naam: "Semana Santa",           type: "vakantie",  prijs: { min: 180, max: 240 }, beschrijving: "Heilige Week met indrukwekkende processies, grote toestroom toeristen" },
    { maand: 5,  naam: "Feria de San Isidro",   type: "evenement", prijs: { min: 195, max: 270 }, beschrijving: "Traditionele kermis en feesten ter ere van de heilige Isidro" },
    { maand: 6,  naam: "Noche de San Juan",      type: "feestdag",  prijs: { min: 195, max: 270 }, beschrijving: "Midzomernacht met vreugdevuren op het strand — een van de drukste nachten" },
    { maand: 7,  naam: "Feria de Estepona",      type: "evenement", prijs: { min: 270, max: 270 }, beschrijving: "Grootste jaarlijkse feest van Estepona, een week lang" },
    { maand: 7,  naam: "Dia del Carmen",         type: "feestdag",  prijs: { min: 270, max: 270 }, beschrijving: "Vissersfeest op zee, traditioneel en druk bezocht" },
    { maand: 8,  naam: "Zomervakantie",          type: "vakantie",  prijs: { min: 180, max: 225 }, beschrijving: null },
    { maand: 10, naam: "Dia de la Hispanidad",  type: "feestdag",  prijs: { min: 143, max: 165 }, beschrijving: "Nationale feestdag Spanje" },
    { maand: 11, naam: "Todos los Santos",       type: "feestdag",  prijs: { min: 128, max: 150 }, beschrijving: "Spaanse Allerheiligen" },
    { maand: 12, naam: "Kerstvakantie",          type: "vakantie",  prijs: { min: 270, max: 270 }, beschrijving: "Kerst- en nieuwjaarsweek: altijd +80% in deze regio" },
    { maand: 12, naam: "Kerstmis",              type: "feestdag",  prijs: { min: 270, max: 270 }, beschrijving: null },
    { maand: 12, naam: "Oud & Nieuw",           type: "evenement", prijs: { min: 270, max: 270 }, beschrijving: "Groot vuurwerkspektakel aan het strand" },
  ],
};

function maandPrijzen(m: number) {
  const s = DEMO.seizoenen[m.toString() as keyof typeof DEMO.seizoenen] as keyof typeof MODIFIERS;
  const mod = MODIFIERS[s];
  const wd = { min: Math.round(BASIS * (1 + mod.min - 0.20)), max: Math.round(BASIS * (1 + mod.max - 0.10)) };
  const we = { min: Math.round(BASIS * (1 + mod.min + 0.10)), max: Math.round(BASIS * (1 + mod.max + 0.25)) };
  return { seizoen: s, mod, wd, we };
}

export default function PrijscalculatorDemoPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="py-16 px-4 bg-gradient-to-br from-background to-blue-50/30">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <BoniAvatar size={80} animate className="mx-auto" />
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-sm font-bold px-3 py-1 rounded-full">
            🎭 Voorbeeldrapport
          </div>
          <h1 className="font-display text-4xl sm:text-5xl text-primary font-bold">Prijscalculator</h1>
          <p className="text-text-secondary text-lg">
            Estepona, Spanje · Basisprijs €150/nacht · Min. 3 nachten
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 pb-16 space-y-8 -mt-4">

        {/* Demo banner */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
          <p className="text-sm text-primary">
            🎭 Dit is een voorbeeldrapport voor Estepona, Spanje. <Link href="/prijscalculator" className="text-accent underline font-semibold">Bereken jouw eigen prijzen →</Link>
          </p>
        </div>

        {/* Marktanalyse */}
        <div className="card p-5 flex gap-4 items-start border-accent/30">
          <BoniAvatar size={52} className="flex-shrink-0" />
          <div>
            <p className="font-display text-lg text-primary">{DEMO.locatie}, {DEMO.land}</p>
            <p className="text-text-secondary text-sm mt-1 leading-relaxed">{DEMO.toelichting}</p>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-text-secondary font-semibold">Legenda:</span>
          {(["laag","tussen","hoog","vakantie","evenement"] as const).map(k => {
            const m = MODIFIERS[k]; const kl = KLEUR[(m as any).kleur as keyof typeof KLEUR];
            return <span key={k} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${kl.bg} ${kl.text}`}>{(m as any).icoon} {m.label}</span>;
          })}
        </div>

        {/* Maandkaarten */}
        <div>
          <h2 className="font-display text-2xl text-primary mb-4">Prijsoverzicht {JAAR}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MAANDEN.map((naam, mi) => {
              const m = mi + 1;
              const { seizoen, mod, wd, we } = maandPrijzen(m);
              const kl = KLEUR[(mod as any).kleur as keyof typeof KLEUR];
              const dagen = DEMO.bijzonder.filter(d => d.maand === m);
              return (
                <div key={m} className={`card overflow-hidden border ${kl.border}`}>
                  <div className={`px-4 py-2.5 flex items-center justify-between ${kl.header}`}>
                    <span className="font-semibold text-sm">{naam}</span>
                    <span className="text-xs opacity-90">{(mod as any).icoon} {mod.label}</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className={`rounded-xl p-3 text-center ${kl.bg}`}>
                        <p className="text-xs text-text-secondary font-semibold mb-1">Weekdag</p>
                        <p className="font-bold text-primary text-sm">€{wd.min}–{wd.max}</p>
                      </div>
                      <div className={`rounded-xl p-3 text-center ${kl.bg}`}>
                        <p className="text-xs text-text-secondary font-semibold mb-1">Weekend</p>
                        <p className="font-bold text-primary text-sm">€{we.min}–{we.max}</p>
                      </div>
                    </div>
                    {dagen.length > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-border">
                        {dagen.map((d, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 bg-purple-50 rounded-lg px-2.5 py-1.5">
                            <p className="text-xs font-semibold text-purple-800 truncate">{(MODIFIERS[d.type as keyof typeof MODIFIERS] as any).icoon} {d.naam}</p>
                            <p className="text-xs font-bold text-purple-700 whitespace-nowrap">€{d.prijs.min}–{d.prijs.max}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alle bijzondere dagen */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-surface">
            <h2 className="font-display text-xl text-primary">🎉 Alle bijzondere dagen {JAAR}</h2>
          </div>
          <div className="divide-y divide-border">
            {DEMO.bijzonder.map((item, i) => {
              const evMod = MODIFIERS[item.type as keyof typeof MODIFIERS];
              const kl = KLEUR[(evMod as any).kleur as keyof typeof KLEUR];
              return (
                <div key={i} className="px-6 py-4 flex items-start justify-between gap-4 hover:bg-surface/50">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs text-text-secondary font-semibold">{MAANDEN[item.maand - 1]}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${kl.bg} ${kl.text}`}>
                        {(evMod as any).icoon} {evMod.label}
                      </span>
                    </div>
                    <p className="font-semibold text-primary">{item.naam}</p>
                    {item.beschrijving && <p className="text-xs text-text-secondary mt-0.5">{item.beschrijving}</p>}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-accent">€{item.prijs.min}–€{item.prijs.max}</p>
                    <p className="text-xs text-text-secondary">per nacht</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="card p-6 border-warning/40 bg-warning/5 space-y-4">
          <div className="flex gap-3 items-start">
            <span className="text-2xl flex-shrink-0">💡</span>
            <div className="space-y-2">
              <p className="font-semibold text-primary">Deze prijzen zijn ter indicatie</p>
              <p className="text-sm text-text-secondary leading-relaxed">
                De bovenstaande prijzen zijn een goede eerste stap als je tot nu toe weinig of niets met je prijsstrategie hebt gedaan. Voor een echt optimale strategie raden we een dynamic pricing tool aan.
              </p>
            </div>
          </div>
          <div className="border-t border-warning/20 pt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-primary">Boni raadt PriceLabs aan</p>
              <p className="text-xs text-text-secondary">Start via onze link en ontvang <strong>1 maand gratis + $10 credit</strong> cadeau</p>
            </div>
            <a href="https://pricelabs.co/users/sign_up?referral/NkFJkg" target="_blank" rel="noopener noreferrer" className="btn-primary whitespace-nowrap flex-shrink-0">
              Probeer PriceLabs →
            </a>
          </div>
        </div>

        {/* CTA */}
        <div className="card p-8 bg-primary border-0 text-center space-y-4">
          <h2 className="font-display text-2xl text-white">Bereken jouw eigen prijzen</h2>
          <p className="text-white/70">Volledig gratis. Vul je locatie en basisprijs in.</p>
          <Link href="/prijscalculator" className="btn-primary inline-block">Start de calculator →</Link>
        </div>

      </div>
    </div>
  );
}
