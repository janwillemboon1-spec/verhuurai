import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";

export default function ListingOptimizerPage() {
  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="section bg-gradient-to-br from-background to-orange-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <span className="badge-intro mb-4 inline-flex">Introductieprijs — 40% korting</span>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-primary leading-tight mb-5">
                Listing Optimizer
              </h1>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto md:mx-0">
                Boni analyseert jouw Airbnb advertentie van kop tot staart. Je krijgt per onderdeel een score, concrete verbeterpunten en kant-en-klare herschreven teksten.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/gratis" className="btn-secondary text-center">Gratis proberen (alleen titel)</Link>
                <Link href="/starten" className="btn-primary text-center">Volledig rapport — €14,99</Link>
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
            <p className="text-text-secondary text-lg">Drie stappen naar een betere advertentie</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stap: "1", icoon: "📝", titel: "Vul je advertentie in", tekst: "Plak je tekst in of upload screenshots. Boni vraagt je stap voor stap door alle 14 onderdelen heen." },
              { stap: "2", icoon: "🤖", titel: "Boni analyseert alles", tekst: "Binnen 60 seconden beoordeelt Boni alle onderdelen van jouw advertentie op basis van duizenden succesvolle listings." },
              { stap: "3", icoon: "📊", titel: "Ontvang je rapport", tekst: "Je krijgt een score per onderdeel, concrete verbeterpunten en kant-en-klare herschreven teksten met kopieerknop." },
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

      {/* Wat Boni analyseert */}
      <section className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat Boni analyseert</h2>
            <p className="text-text-secondary text-lg">Een volledig rapport over alle onderdelen van jouw advertentie</p>
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

      {/* Demo sectie + Reviews */}
      <section className="section bg-surface">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary">Benieuwd wat je krijgt?</h2>
            <p className="text-text-secondary text-lg">Bekijk een volledig voorbeeldrapport voordat je iets koopt.</p>
          </div>
          <div className="card p-6 sm:p-8 space-y-4 border-accent/30 max-w-3xl mx-auto">
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              {[["📊", "Score per onderdeel"], ["✍️", "Herschreven teksten"], ["🗓️", "Actieplan"]].map(([icoon, label]) => (
                <div key={label} className="bg-primary/5 rounded-xl p-3">
                  <div className="text-2xl mb-1">{icoon}</div>
                  <p className="text-text-secondary text-xs font-semibold">{label}</p>
                </div>
              ))}
            </div>
            <p className="text-text-secondary text-sm">Een realistisch voorbeeld van Jan Willem's appartement in Amsterdam — alle 12 onderdelen geanalyseerd.</p>
            <Link href="/rapport/demo" className="btn-primary w-full sm:w-auto inline-block text-center">
              👁️ Bekijk het volledige voorbeeldrapport →
            </Link>
          </div>

          {/* Reviews */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { quote: "Wat een uitgebreide feedback heb ik mogen ontvangen. Heel uitgebreid en praktisch toepasbaar. Echt heel erg bedankt !", naam: "Sjoukje", locatie: "Oosterwolde" },
              { quote: "Ik heb 5 advertenties gecheckt met de Listing Optimizer. Ik had 1 score van 4/10 en 4 van 3/10 — dus genoeg te doen! Handige tool, ik weet nu gelijk wat ik moet gaan aanpassen.", naam: "Marloes", locatie: "Bergen aan Zee" },
              { quote: "Wow! Superblij met de uitgebreide analyses van mijn 2 advertenties. Als je als host al wat langer verhuurt, kun je een blinde vlek krijgen. Met deze analyses hoop ik wat blinde vlekken te verbeteren wat hopelijk tot mooie resultaten zal leiden, bedankt!!!", naam: "Marleen", locatie: "Herkingen" },
            ].map(({ quote, naam, locatie }) => (
              <div key={naam} className="card p-6 flex flex-col">
                <div className="flex gap-0.5 mb-4">{[1,2,3,4,5].map(i => <span key={i} className="text-accent">★</span>)}</div>
                <p className="text-text-secondary leading-relaxed italic flex-1">&ldquo;{quote}&rdquo;</p>
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
                  <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold shrink-0">{naam[0]}</div>
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

      {/* Prijzen */}
      <section id="prijzen" className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Simpele prijs</h2>
            <p className="text-text-secondary text-lg">Eenmalige betaling per analyse. Geen abonnement, geen verborgen kosten.</p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="card p-8 text-center border-accent border-2 space-y-4">
              <div className="text-5xl">📋</div>
              <h3 className="font-display text-2xl font-bold text-primary">Volledige advertentie-analyse</h3>
              <p className="text-text-secondary">Score, verbeterpunten en herschreven teksten voor alle 12 onderdelen van jouw advertentie.</p>
              <div className="py-4">
                <p className="text-5xl font-bold text-accent">€14,99</p>
                <p className="text-text-secondary text-sm mt-1">per analyse — eenmalig</p>
              </div>
              <Link href="/starten" className="btn-primary w-full text-center block">Analyse starten →</Link>
              <Link href="/gratis" className="btn-secondary w-full text-center block text-sm">Eerst gratis proberen (alleen titel)</Link>
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
            Klaar om meer gasten aan te trekken.
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Probeer Boni gratis met je titel, of ga direct voor het volledige rapport.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/gratis" className="btn-secondary text-center">Gratis proberen</Link>
            <Link href="/starten" className="btn-primary text-center">Volledig rapport — €14,99</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
