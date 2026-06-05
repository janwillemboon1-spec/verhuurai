"use client";

import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="section bg-gradient-to-br from-background to-orange-50/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary leading-tight mb-5">
                Meer uit jouw verhuur halen?
              </h1>
              <p className="text-text-secondary text-lg sm:text-xl mb-8 max-w-xl mx-auto md:mx-0">
                Boni helpt Airbnb verhuurders met twee krachtige tools: een advertentie-analyse en een automatische review monitor.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/listing-optimizer" className="btn-secondary text-center">
                  Listing Optimizer →
                </Link>
                <Link href="/review-monitor" className="btn-primary text-center">
                  Review Monitor →
                </Link>
              </div>
            </div>
            <div className="flex flex-col items-center flex-shrink-0 gap-3">
              {/* Tekstwolkje */}
              <div className="relative bg-white border border-border rounded-2xl px-5 py-3 shadow-card max-w-[230px] text-center">
                <p className="text-sm text-primary leading-snug">
                  Hoi! Ik ben Boni. Ik analyseer jouw advertentie en help je meer gasten aan te trekken.
                </p>
                {/* Pijltje naar beneden */}
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-r border-b border-border rotate-45" />
              </div>
              <BoniAvatar size={260} animate={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Twee producten */}
      <section className="section bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Twee tools, één doel</h2>
            <p className="text-text-secondary text-lg">Meer boekingen, betere reviews, hogere omzet</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Listing Optimizer */}
            <div className="card p-8 flex flex-col">
              <div className="text-5xl mb-5">📋</div>
              <h3 className="font-display text-2xl font-bold text-primary mb-2">Listing Optimizer</h3>
              <p className="text-text-secondary leading-relaxed mb-5 min-h-[5rem]">
                Boni analyseert alle 12 onderdelen van jouw advertentie en geeft je een score, concrete verbeterpunten en kant-en-klare herschreven teksten.
              </p>
              <ul className="space-y-2 flex-1">
                {["Score per onderdeel", "Herschreven teksten met kopieerknop", "Actieplan: vandaag, deze week, deze maand", "Eenmalige betaling — geen abonnement"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-success font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-border space-y-3">
                <p className="text-accent font-bold text-xl">€9,99 per analyse — eenmalig</p>
                <div className="flex gap-3">
                  <Link href="/gratis" className="btn-secondary text-sm flex-1 text-center">Gratis proberen</Link>
                  <Link href="/listing-optimizer" className="btn-primary text-sm flex-1 text-center">Meer info →</Link>
                </div>
                <Link href="/rapport/demo" className="text-center block text-sm border border-accent/40 text-accent font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/5 transition-colors">
                  👁️ Bekijk voorbeeldrapport
                </Link>
              </div>
            </div>

            {/* Review Monitor */}
            <div className="card p-8 flex flex-col relative border-accent/40">
              <div className="absolute -top-3 right-6 flex gap-2">
                <span className="bg-success text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">Eerste rapport gratis</span>
                <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">Nieuw</span>
              </div>
              <div className="text-5xl mb-5">⭐</div>
              <h3 className="font-display text-2xl font-bold text-primary mb-2">Review Monitor</h3>
              <p className="text-text-secondary leading-relaxed mb-5 min-h-[5rem]">
                Boni leest automatisch alle nieuwe reviews en stuurt je wekelijks of maandelijks een rapport met verbeterpunten en voorbeeldreacties.
              </p>
              <ul className="space-y-2 flex-1">
                {["Automatisch reviews bijhouden", "Sentimenttrend + terugkerende punten", "Verbeterpunten + voorbeeldreacties", "Kies je eigen dag en tijdstip"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-success font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t border-border space-y-3">
                <p className="text-accent font-bold text-xl">Vanaf €5,99/maand</p>
                <Link href="/review-monitor" className="btn-primary text-sm w-full text-center block">
                  Meer info en aanmelden →
                </Link>
                <Link href="/review-monitor/demo" className="text-center block text-sm border border-accent/40 text-accent font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/5 transition-colors">
                  👁️ Bekijk voorbeeldrapport
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat verhuurders zeggen</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { quote: "Met een paar kleine aanpassingen steeg mijn bezettingsgraad van 68% naar 84% in twee maanden.", naam: "Mark", locatie: "Amsterdam" },
              { quote: "De herschreven titel van Boni leverde meteen 40% meer kliks op. Ongelofelijk.", naam: "Sophie", locatie: "Rotterdam" },
              { quote: "De Review Monitor geeft me elke week inzicht in wat gasten vinden. Geen verrassingen meer.", naam: "Peter", locatie: "Utrecht" },
            ].map(({ quote, naam, locatie }) => (
              <div key={naam} className="card p-6 flex flex-col gap-4">
                <p className="text-text-secondary leading-relaxed italic">"{quote}"</p>
                <div className="flex items-center gap-2 mt-auto pt-2 border-t border-border">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                    {naam[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-primary text-sm">{naam}</p>
                    <p className="text-text-secondary text-xs">{locatie}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <BoniAvatar size={100} animate={true} className="mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Waar wil je mee starten?
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/listing-optimizer" className="btn-secondary text-center">
              📋 Listing Optimizer
            </Link>
            <Link href="/review-monitor" className="btn-primary text-center">
              ⭐ Review Monitor
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
