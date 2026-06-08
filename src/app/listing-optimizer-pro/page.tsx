import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";

export default function ListingOptimizerProPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="section bg-gradient-to-br from-background to-blue-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <span className="badge-intro mb-4 inline-flex">Nieuw — Automatisch inlezen</span>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-primary leading-tight mb-3">
                Listing Optimizer Pro
              </h1>
              <p className="text-accent font-semibold text-lg mb-4">Alleen jouw Airbnb URL — Boni regelt de rest</p>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto md:mx-0">
                Boni leest jouw advertentie automatisch in via de URL. Geen kopiëren, geen screenshots. Gewoon de URL invullen en binnen enkele minuten heb je een volledig rapport.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/starten-pro" className="btn-primary text-center">Analyse starten — €14,99</Link>
                <Link href="/rapport/demo" className="btn-secondary text-center">Bekijk voorbeeldrapport</Link>
              </div>
            </div>
            <div className="flex justify-center flex-shrink-0">
              <BoniAvatar size={180} animate={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Hoe het werkt */}
      <section className="section bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Hoe het werkt</h2>
            <p className="text-text-secondary text-lg">Twee stappen naar een beter rapport</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {[
              { stap: "1", icoon: "🔗", titel: "Plak je Airbnb URL", tekst: "Dat is alles. Boni haalt automatisch je titel, beschrijving, voorzieningen, buurt, huisregels, recensies en meer op." },
              { stap: "2", icoon: "📊", titel: "Ontvang je Pro rapport", tekst: "Binnen 2-3 minuten krijg je een score per onderdeel, concrete verbeterpunten en kant-en-klare herschreven teksten." },
            ].map(({ stap, icoon, titel, tekst }) => (
              <div key={stap} className="card p-8 text-center">
                <div className="text-5xl mb-4">{icoon}</div>
                <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Stap {stap}</div>
                <h3 className="font-display text-xl font-bold text-primary mb-3">{titel}</h3>
                <p className="text-text-secondary">{tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Vergelijking Pro vs Standaard */}
      <section className="section bg-background">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold text-primary mb-3">Pro vs. Standaard</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-6 space-y-3 border-accent/30 border-2">
              <p className="font-display text-lg font-bold text-accent text-center">Pro ⚡</p>
              {[
                "Alleen URL invullen",
                "Automatisch ingelezen",
                "Reviews automatisch opgehaald",
                "2-3 minuten totaal",
                "Zelfde output als standaard",
              ].map(t => (
                <div key={t} className="flex items-center gap-2 text-sm text-primary">
                  <span className="text-success font-bold">✓</span> {t}
                </div>
              ))}
            </div>
            <div className="card p-6 space-y-3">
              <p className="font-display text-lg font-bold text-text-secondary text-center">Standaard</p>
              {[
                "14-stappen formulier",
                "Teksten zelf kopiëren",
                "Reviews optioneel toevoegen",
                "~10 minuten invullen",
                "Zelfde uitvoer als Pro",
              ].map(t => (
                <div key={t} className="flex items-center gap-2 text-sm text-text-secondary">
                  <span className="text-border">–</span> {t}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-text-secondary text-center mt-4">
            Werkt de URL-scraper niet? Gebruik dan de <Link href="/starten" className="text-accent hover:underline">standaard Listing Optimizer</Link> als back-up.
          </p>
        </div>
      </section>

      {/* Wat Boni analyseert */}
      <section className="section bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat Boni analyseert</h2>
            <p className="text-text-secondary text-lg">Alle 12 onderdelen — automatisch opgehaald via jouw URL</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
            {[
              { icoon: "📌", naam: "Titel" },
              { icoon: "📝", naam: "Beschrijving" },
              { icoon: "🏠", naam: "Accommodatie" },
              { icoon: "🔑", naam: "Toegang voor gasten" },
              { icoon: "💬", naam: "Interactie" },
              { icoon: "ℹ️", naam: "Andere info" },
              { icoon: "⚡", naam: "Voorzieningen" },
              { icoon: "📍", naam: "Buurt" },
              { icoon: "🚌", naam: "Vervoer" },
              { icoon: "⭐", naam: "Recensies" },
              { icoon: "👤", naam: "Host profiel" },
              { icoon: "📋", naam: "Huisregels" },
            ].map(({ icoon, naam }) => (
              <div key={naam} className="card p-4 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{icoon}</span>
                <span className="font-semibold text-primary text-sm sm:text-base">{naam}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prijzen */}
      <section className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Simpele prijs</h2>
            <p className="text-text-secondary text-lg">Eenmalige betaling. Geen abonnement.</p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="card p-8 text-center border-accent border-2 space-y-4">
              <div className="text-5xl">⚡</div>
              <h3 className="font-display text-2xl font-bold text-primary">Listing Optimizer Pro</h3>
              <p className="text-text-secondary">Volledig rapport voor alle 12 onderdelen — automatisch ingelezen via jouw Airbnb URL.</p>
              <div className="py-4">
                <p className="text-5xl font-bold text-accent">€14,99</p>
                <p className="text-text-secondary text-sm mt-1">per analyse — eenmalig</p>
              </div>
              <Link href="/starten-pro" className="btn-primary w-full text-center block">Analyse starten →</Link>
              <Link href="/rapport/demo" className="w-full text-center block text-sm border border-accent/40 text-accent font-semibold px-4 py-3 rounded-xl hover:bg-accent/5 transition-colors">
                👁️ Bekijk een voorbeeldrapport
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <BoniAvatar size={80} animate={true} className="mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Klaar? Plak je URL en ga.
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Boni haalt alles automatisch op en levert binnen enkele minuten een volledig rapport.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/rapport/demo" className="btn-secondary text-center">Voorbeeldrapport bekijken</Link>
            <Link href="/starten-pro" className="btn-primary text-center">Analyse starten — €14,99</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
