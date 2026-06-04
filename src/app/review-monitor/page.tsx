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
                Eerste rapport gratis
              </span>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-primary leading-tight mb-5">
                Altijd weten wat gasten over jouw woning zeggen.
              </h1>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto md:mx-0">
                Boni analyseert automatisch alle nieuwe reviews en stuurt je wekelijks of maandelijks een helder rapport met verbeterpunten en voorbeeldreacties.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/review-monitor/aanmelden" className="btn-primary text-center">
                  Start gratis — eerste rapport gratis →
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
              { stap: "1", icoon: "🔗", titel: "Vul je Airbnb URL in", tekst: "Plak de link naar jouw Airbnb advertentie. Boni regelt de rest." },
              { stap: "2", icoon: "🤖", titel: "Boni analyseert reviews", tekst: "Elke week of maand scrapt Boni alle nieuwe reviews en analyseert trends, klachten en complimenten." },
              { stap: "3", icoon: "📬", titel: "Rapport in je inbox", tekst: "Je ontvangt een helder rapport met verbeterpunten en kant-en-klare reacties op negatieve reviews." },
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
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Simpele prijzen</h2>
            <p className="text-text-secondary text-lg">Eerste rapport altijd gratis. Daarna maandelijks opzegbaar.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Maandelijks */}
            <div className="card p-8 flex flex-col">
              <div className="text-4xl mb-4">📅</div>
              <h3 className="font-display text-2xl font-bold text-primary mb-3">Maandelijks</h3>
              <p className="text-text-secondary flex-1">Rapport op de 1e van elke maand. Ideaal voor rustige verhuurders.</p>
              <div className="mt-4 mb-4">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-accent">€5,99</span>
                  <span className="text-text-secondary">/maand</span>
                </div>
                <p className="text-sm text-success font-semibold">of €59/jaar — bespaar 2 maanden</p>
              </div>
              <Link href="/review-monitor/aanmelden?frequentie=monthly" className="btn-secondary w-full text-center block mt-auto">
                Start maandelijks →
              </Link>
            </div>

            {/* Wekelijks */}
            <div className="card p-8 flex flex-col border-accent border-2 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                Meest gekozen
              </div>
              <div className="text-4xl mb-4">⚡</div>
              <h3 className="font-display text-2xl font-bold text-primary mb-3">Wekelijks</h3>
              <p className="text-text-secondary flex-1">Rapport elke maandag. Blijf altijd een stap voor op je gasten.</p>
              <div className="mt-4 mb-4">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold text-accent">€9,99</span>
                  <span className="text-text-secondary">/maand</span>
                </div>
                <p className="text-sm text-success font-semibold">of €99/jaar — bespaar 2 maanden</p>
              </div>
              <Link href="/review-monitor/aanmelden?frequentie=weekly" className="btn-primary w-full text-center block mt-auto">
                Start wekelijks →
              </Link>
            </div>
          </div>
          <p className="text-center text-sm text-text-secondary mt-6">
            Meerdere woningen? Elke extra woning goedkoper. Altijd opzegbaar.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <BoniAvatar size={80} animate={true} className="mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Klaar om altijd op de hoogte te zijn?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Start vandaag gratis. Je eerste rapport is voor niks.
          </p>
          <Link href="/review-monitor/aanmelden" className="btn-primary text-center inline-block">
            Eerste rapport gratis aanvragen →
          </Link>
        </div>
      </section>
    </div>
  );
}
