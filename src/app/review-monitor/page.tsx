import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";

export default function ReviewMonitorPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="section bg-gradient-to-br from-background to-blue-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <span className="badge-intro mb-4 inline-flex">
                €7,99 — eenmalig
              </span>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-primary leading-tight mb-5">
                Host Performance Audit
              </h1>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto md:mx-0">
                Boni analyseert al jouw reviews en geeft je een helder rapport met sentimenttrend, terugkerende punten, concrete verbeterpunten en kant-en-klare reacties.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/review-monitor/aanmelden?type=eenmalig" className="btn-primary text-center">
                  Rapport aanvragen — €7,99 →
                </Link>
                <Link href="#hoe-het-werkt" className="btn-secondary text-center">
                  Hoe werkt het?
                </Link>
              </div>
            </div>
            <div className="flex justify-center flex-shrink-0">
              <BoniAvatar size={180} animate={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Hoe het werkt */}
      <section id="hoe-het-werkt" className="section bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Hoe het werkt</h2>
            <p className="text-text-secondary text-lg">Drie stappen naar automatische review inzichten</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stap: "1", icoon: "🔗", titel: "Vul je Airbnb URL in", tekst: "Plak de link naar jouw Airbnb advertentie. Boni regelt de rest.", extra: "Binnenkort ook beschikbaar voor Booking.com" },
              { stap: "2", icoon: "🤖", titel: "Boni analyseert reviews", tekst: "Elke week of maand scrapt Boni alle nieuwe reviews en analyseert trends, klachten en complimenten." },
              { stap: "3", icoon: "📬", titel: "Rapport in je inbox", tekst: "Je ontvangt een helder rapport met verbeterpunten en kant-en-klare reacties op negatieve reviews." },
            ].map(({ stap, icoon, titel, tekst, extra }: any) => (
              <div key={stap} className="card p-8 text-center">
                <div className="text-5xl mb-4">{icoon}</div>
                <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Stap {stap}</div>
                <h3 className="font-display text-xl font-bold text-primary mb-3">{titel}</h3>
                <p className="text-text-secondary">{tekst}</p>
                {extra && (
                  <span className="inline-block mt-3 text-xs font-semibold px-3 py-1 rounded-full text-white" style={{ backgroundColor: "#003580" }}>
                    {extra}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wat staat er in het rapport */}
      <section className="section bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat staat er in het rapport?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icoon: "📋", titel: "Samenvatting nieuwe reviews", tekst: "Overzicht van alle reviews ontvangen in de afgelopen periode." },
              { icoon: "📈", titel: "Sentimenttrend", tekst: "Gaat het beter of slechter? Vergelijking met de vorige periode." },
              { icoon: "🔁", titel: "Terugkerende punten", tekst: "Wat gasten keer op keer benoemen — positief én negatief." },
              { icoon: "🎯", titel: "Concrete verbeterpunten", tekst: "Boni geeft 3-5 actiepunten die je direct kunt toepassen." },
              { icoon: "💬", titel: "Voorbeeldreacties", tekst: "Kant-en-klare reacties op negatieve reviews — kopieer en plak." },
              { icoon: "🏆", titel: "Online inzien", tekst: "Alle rapporten staan ook in je persoonlijke dashboard." },
            ].map(({ icoon, titel, tekst }) => (
              <div key={titel} className="card p-5 flex gap-4">
                <span className="text-2xl flex-shrink-0">{icoon}</span>
                <div>
                  <p className="font-semibold text-primary mb-1">{titel}</p>
                  <p className="text-sm text-text-secondary">{tekst}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prijzen */}
      <section className="section bg-surface">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Simpele prijs</h2>
            <p className="text-text-secondary text-lg">Eenmalige betaling. Geen abonnement.</p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="card p-8 text-center border-accent border-2 space-y-4">
              <div className="text-5xl">📊</div>
              <h3 className="font-display text-2xl font-bold text-primary">Host Performance Audit</h3>
              <p className="text-text-secondary">Volledig review-rapport voor één woning. Sentimenttrend, verbeterpunten en kant-en-klare reacties.</p>
              <div className="py-4">
                <p className="text-5xl font-bold text-accent">€7,99</p>
                <p className="text-text-secondary text-sm mt-1">eenmalig — geen abonnement</p>
              </div>
              <Link href="/review-monitor/aanmelden?type=eenmalig" className="btn-primary w-full text-center block">
                Rapport aanvragen →
              </Link>
            </div>
          </div>

          <div className="mt-8 max-w-2xl mx-auto card p-6 sm:p-8 space-y-4 border-accent/30 text-center">
            <h3 className="font-display text-xl text-primary">Benieuwd hoe een rapport eruitziet?</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["📈", "Sentiment-trend"], ["💬", "Voorbeeld-reacties"], ["🎯", "Verbeter-punten"]].map(([icoon, label]) => (
                <div key={label} className="bg-primary/5 rounded-xl p-2 sm:p-3">
                  <div className="text-xl sm:text-2xl mb-1">{icoon}</div>
                  <p className="text-text-secondary text-[10px] sm:text-xs font-semibold leading-tight">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-text-secondary text-sm">Een realistisch voorbeeld van Casa Luna in Alicante — 23 reviews geanalyseerd.</p>
            <Link href="/review-monitor/demo" className="btn-primary inline-block text-center">
              👁️ Bekijk het volledige voorbeeldrapport →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <BoniAvatar size={80} animate={true} className="mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Klaar voor je Host Performance Audit?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Boni analyseert al jouw reviews en levert binnen enkele minuten een volledig rapport.
          </p>
          <Link href="/review-monitor/aanmelden?type=eenmalig" className="btn-primary text-center inline-block">
            Rapport aanvragen — €7,99 →
          </Link>
        </div>
      </section>
    </div>
  );
}
