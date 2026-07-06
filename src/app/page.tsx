"use client";

import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";
import { TestimonialCarousel } from "@/components/TestimonialCarousel";

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
                Als je verhuur tegenvalt ligt dat vrijwel altijd aan één van deze drie onderdelen: Advertentie, Prijzen of Hosting skills. Boni helpt je met drie krachtige tools om al deze onderdelen te optimaliseren.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start flex-wrap">
                <Link href="/listing-optimizer" className="btn-secondary text-center">
                  Listing Optimizer →
                </Link>
                <Link href="/host-performance" className="btn-primary text-center">
                  Host Performance Audit →
                </Link>
                <Link href="/prijscalculator" className="btn-secondary text-center">
                  Prijscalculator →
                </Link>
              </div>
              <div className="flex justify-center md:justify-start mt-2">
                <Link
                  href="/community"
                  className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors"
                >
                  <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs">🏘️</span>
                  Lid van de Superhost Community? Gratis toegang →
                </Link>
              </div>
            </div>
            <div className="flex flex-col items-center flex-shrink-0 gap-3">
              {/* Tekstwolkje */}
              <div className="relative bg-white border border-border rounded-2xl px-5 py-3 shadow-card max-w-[230px] text-center">
                <p className="text-sm text-primary leading-snug">
                  Hoi! Ik ben Boni. Ik help je meer gasten aan te trekken, betere reviews te krijgen én de juiste prijzen te hanteren.
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Professionele tools met één doel</h2>
            <p className="text-text-secondary text-lg">Meer boekingen, betere reviews, hogere omzet</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-8 xl:gap-y-0">

            {/* Listing Optimizer */}
            <div className="card p-8 relative
              xl:grid xl:[grid-row:span_5] xl:[grid-template-rows:subgrid] xl:gap-0">
              <div className="text-5xl pb-5">📋</div>
              <h3 className="font-display text-2xl font-bold text-primary pb-3">Listing Optimizer</h3>
              <p className="text-text-secondary leading-relaxed pb-5">
                Boni analyseert alle 12 onderdelen van jouw advertentie en geeft je een score, concrete verbeterpunten en kant-en-klare herschreven teksten.
              </p>
              <ul className="space-y-2 pb-6">
                {["Score per onderdeel", "Herschreven teksten met kopieerknop", "Actieplan: vandaag, deze week, deze maand", "Eenmalige betaling — geen abonnement"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-success font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-accent font-bold text-xl">€14,99 — eenmalig</p>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/gratis" className="btn-secondary text-[11px] text-center flex items-center justify-center py-3 whitespace-nowrap">Gratis proberen</Link>
                  <Link href="/listing-optimizer" className="btn-primary text-[11px] text-center flex items-center justify-center py-3 whitespace-nowrap">Meer info →</Link>
                </div>
                <Link href="/rapport/demo" className="text-center block text-sm border border-accent/40 text-accent font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/5 transition-colors flex items-center justify-center">
                  👁️ Bekijk voorbeeldrapport
                </Link>
              </div>
            </div>

            {/* Host Performance Audit */}
            <div className="card p-8 relative border-accent/40
              xl:grid xl:[grid-row:span_5] xl:[grid-template-rows:subgrid] xl:gap-0">
              <div className="absolute -top-3 right-6">
                <span className="bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">Nieuw</span>
              </div>
              <div className="text-5xl pb-5">⭐</div>
              <h3 className="font-display text-2xl font-bold text-primary pb-3">Host Performance Audit</h3>
              <p className="text-text-secondary leading-relaxed pb-5">
                Boni analyseert al jouw reviews en geeft je een helder rapport met sentimenttrend, terugkerende punten, concrete verbeterpunten en kant-en-klare reacties.
              </p>
              <ul className="space-y-2 pb-6">
                {["Automatisch alle reviews analyseren", "Sentimenttrend + terugkerende punten", "Verbeterpunten + kant-en-klare reacties", "Eenmalige betaling — geen abonnement"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-success font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-accent font-bold text-xl">€7,99 — eenmalig</p>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/host-performance/aanmelden?type=eenmalig" className="btn-primary text-[11px] text-center flex items-center justify-center py-3 whitespace-nowrap">Rapport aanvragen</Link>
                  <Link href="/host-performance" className="btn-secondary text-[11px] text-center flex items-center justify-center py-3 whitespace-nowrap">Meer info →</Link>
                </div>
                <Link href="/host-performance/demo" className="text-center block text-sm border border-accent/40 text-accent font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/5 transition-colors flex items-center justify-center">
                  👁️ Bekijk voorbeeldrapport
                </Link>
              </div>
            </div>

            {/* Prijscalculator */}
            <div className="card p-8 relative border-success/40
              xl:grid xl:[grid-row:span_5] xl:[grid-template-rows:subgrid] xl:gap-0">
              <div className="absolute -top-3 right-6 bg-success text-white text-xs font-bold px-3 py-1 rounded-full">Gratis</div>
              <div className="text-5xl pb-5">💰</div>
              <h3 className="font-display text-2xl font-bold text-primary pb-3">Prijscalculator</h3>
              <p className="text-text-secondary leading-relaxed pb-5">
                Vul je locatie en basisprijs in. Boni berekent automatisch de optimale prijzen voor heel 2027 op basis van seizoenen, evenementen en feestdagen.
              </p>
              <ul className="space-y-2 pb-6">
                {["Seizoensgebonden prijsadvies", "Lokale evenementen en feestdagen", "Weekdag vs. weekend onderscheid", "Volledig gratis te gebruiken"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-success font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-success font-bold text-xl">Gratis</p>
                <Link href="/prijscalculator" className="btn-primary text-sm w-full text-center flex items-center justify-center py-2.5">
                  Bereken mijn prijzen →
                </Link>
                <Link href="/prijscalculator/demo" className="text-center block text-sm border border-accent/40 text-accent font-semibold px-4 py-2.5 rounded-xl hover:bg-accent/5 transition-colors flex items-center justify-center">
                  👁️ Bekijk voorbeeldrapport
                </Link>
              </div>
            </div>

            {/* Photo Optimizer */}
            <div className="card p-8 relative
              xl:grid xl:[grid-row:span_5] xl:[grid-template-rows:subgrid] xl:gap-0">
              <div className="text-5xl pb-5">📷</div>
              <h3 className="font-display text-2xl font-bold text-primary pb-3">Photo Optimizer</h3>
              <p className="text-text-secondary leading-relaxed pb-5">
                Boni verbetert jouw advertentie foto's automatisch naar professionele kwaliteit. Betere helderheid, scherpte en witbalans — klaar in minuten.
              </p>
              <ul className="space-y-2 pb-6">
                {["Automatische beeldverbetering per foto", "Helderheid, scherpte & witbalans", "Download als zip-bestand", "Eenmalige betaling — geen abonnement"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-text-secondary">
                    <span className="text-success font-bold">✓</span>{item}
                  </li>
                ))}
              </ul>
              <div className="border-t border-border pt-4 space-y-3">
                <p className="text-accent font-bold text-xl">Vanaf €1,49 per foto</p>
                <div className="grid grid-cols-2 gap-3">
                  <Link href="/photo-optimizer/starten" className="btn-primary text-[11px] text-center flex items-center justify-center py-3 whitespace-nowrap">Foto's uploaden</Link>
                  <Link href="/photo-optimizer" className="btn-secondary text-[11px] text-center flex items-center justify-center py-3 whitespace-nowrap">Meer info →</Link>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Testimonials carousel */}
      <section className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat verhuurders zeggen</h2>
          </div>
          <TestimonialCarousel />
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <BoniAvatar size={100} animate={true} className="mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Waar wil je mee starten?
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 justify-center flex-wrap">
            <Link href="/listing-optimizer" className="btn-secondary text-center">
              📋 Listing Optimizer
            </Link>
            <Link href="/host-performance" className="btn-primary text-center">
              ⭐ Host Performance Audit
            </Link>
            <Link href="/prijscalculator" className="btn-secondary text-center">
              💰 Prijscalculator
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
