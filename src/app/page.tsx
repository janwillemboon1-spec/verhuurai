"use client";

import Link from "next/link";
import { useState } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";

function FaqItem({ vraag, antwoord }: { vraag: string; antwoord: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="card border-border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-5 text-left font-semibold text-primary hover:bg-primary/5 transition-colors duration-200"
      >
        <span>{vraag}</span>
        <span className={`text-text-secondary transition-transform duration-200 ml-4 flex-shrink-0 ${open ? "rotate-45" : ""}`}>
          +
        </span>
      </button>
      {open && (
        <div className="px-6 pb-5 text-text-secondary leading-relaxed border-t border-border pt-4">
          {antwoord}
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      <section className="from-background to-orange-50/30 bg-gradient-to-br section">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col-reverse md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <span className="badge-intro mb-4 inline-flex">
                Introductieprijs — 40% korting
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-primary leading-tight mb-5">
                Jouw Airbnb advertentie. Geoptimaliseerd door Boni.
              </h1>
              <p className="text-text-secondary text-lg sm:text-xl mb-8 max-w-xl mx-auto md:mx-0">
                Boni analyseert jouw Airbnb advertentie in minder dan 60 seconden en geeft je concrete verbeterpunten, herschreven teksten en een eerlijk rapport.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
                <Link href="/gratis" className="btn-secondary text-center">
                  Probeer gratis (alleen titel)
                </Link>
                <Link href="/starten" className="btn-primary text-center">
                  Volledig rapport — vanaf €9,40
                </Link>
              </div>
            </div>
            <div className="flex justify-center md:justify-end flex-shrink-0">
              <BoniAvatar size={200} animate={true} />
            </div>
          </div>
        </div>
      </section>

      <section id="hoe-het-werkt" className="section bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Hoe het werkt</h2>
            <p className="text-text-secondary text-lg">Drie stappen naar een betere advertentie</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">📝</div>
              <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Stap 1</div>
              <h3 className="font-display text-xl font-bold text-primary mb-3">Vul je advertentie in</h3>
              <p className="text-text-secondary">Plak je tekst rechtstreeks in of upload een screenshot van je advertentie.</p>
            </div>
            <div className="card p-8 text-center border-accent/30">
              <div className="text-5xl mb-4">🤖</div>
              <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Stap 2</div>
              <h3 className="font-display text-xl font-bold text-primary mb-3">Boni analyseert alles</h3>
              <p className="text-text-secondary">Binnen 60 seconden beoordeelt Boni alle 12 onderdelen van jouw advertentie.</p>
            </div>
            <div className="card p-8 text-center">
              <div className="text-5xl mb-4">📊</div>
              <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Stap 3</div>
              <h3 className="font-display text-xl font-bold text-primary mb-3">Ontvang je rapport</h3>
              <p className="text-text-secondary">Je krijgt concrete verbeterpunten, herschreven teksten en een eindscore.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat Boni analyseert</h2>
            <p className="text-text-secondary text-lg">Een volledig rapport over alle onderdelen van jouw advertentie</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
              { icoon: "📸", naam: "Foto's" },
              { icoon: "⭐", naam: "Recensies" },
              { icoon: "👤", naam: "Host profiel" },
            ].map(({ icoon, naam }) => (
              <div key={naam} className="card p-4 flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{icoon}</span>
                <span className="font-semibold text-primary text-sm sm:text-base">{naam}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="prijzen" className="section bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-4">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Kies je pakket</h2>
            <p className="text-text-secondary text-lg mb-2">Eenmalige betaling, geen abonnement</p>
            <span className="badge-intro">Introductieprijs — 40% korting op alle pakketten</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
            {[
              { aantal: "1 advertentie", normaal: "€19", intro: "€11,40", populair: false },
              { aantal: "3 advertenties", normaal: "€49", intro: "€29,40", populair: true },
              { aantal: "5 advertenties", normaal: "€79", intro: "€47,40", populair: false },
              { aantal: "10 advertenties", normaal: "€149", intro: "€89,40", populair: false },
            ].map(({ aantal, normaal, intro, populair }) => (
              <div
                key={aantal}
                className={`card p-6 flex flex-col gap-4 relative ${populair ? "border-accent border-2" : ""}`}
              >
                {populair && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap">
                    Meest gekozen
                  </div>
                )}
                <div>
                  <h3 className="font-display text-lg font-bold text-primary mb-1">{aantal}</h3>
                  <p className="text-text-secondary line-through text-sm">{normaal}</p>
                  <p className="text-accent font-bold text-2xl">{intro}</p>
                </div>
                <Link href="/starten" className="btn-primary text-center text-sm mt-auto">
                  Start nu →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat verhuurders zeggen</h2>
            <p className="text-text-secondary text-lg">Echte resultaten van echte verhuurders</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "Met een paar kleine aanpassingen steeg mijn bezettingsgraad van 68% naar 84% in twee maanden.",
                naam: "Mark",
                locatie: "Amsterdam",
              },
              {
                quote: "De herschreven titel van Boni leverde meteen 40% meer kliks op. Ongelofelijk.",
                naam: "Sophie",
                locatie: "Rotterdam",
              },
              {
                quote: "Eindelijk eerlijk advies in plaats van vage tips. Boni zegt gewoon wat hij denkt.",
                naam: "Peter",
                locatie: "Utrecht",
              },
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

      <section id="faq" className="section bg-surface">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Veelgestelde vragen</h2>
            <p className="text-text-secondary text-lg">Alles wat je wilt weten over Boni</p>
          </div>
          <div className="flex flex-col gap-3">
            <FaqItem
              vraag="Hoe lang duurt een analyse?"
              antwoord="Boni heeft jouw advertentie binnen 60 seconden geanalyseerd. Je hoeft niet lang te wachten."
            />
            <FaqItem
              vraag="In welke taal krijg ik mijn rapport?"
              antwoord="Je kiest zelf of je het rapport in het Nederlands of in het Engels wilt ontvangen."
            />
            <FaqItem
              vraag="Moet ik een account aanmaken?"
              antwoord="Nee, je hebt geen account nodig. Je vult alleen je naam en e-mailadres in en dat is het."
            />
            <FaqItem
              vraag="Wat als ik niet tevreden ben?"
              antwoord="We bieden een 100% tevredenheidsgarantie. Als je niet tevreden bent met het rapport, krijg je je geld terug."
            />
            <FaqItem
              vraag="Kan ik meerdere advertenties analyseren?"
              antwoord="Zeker. Kies simpelweg een pakket met meerdere analyses. Dan bespaar je ook nog eens flink op de prijs per analyse."
            />
          </div>
        </div>
      </section>

      <section className="section bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <BoniAvatar size={100} animate={true} className="mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Klaar om meer gasten te trekken?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Probeer Boni gratis uit met je titel, of ga direct voor het volledige rapport.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/gratis" className="btn-secondary text-center">
              Probeer gratis
            </Link>
            <Link href="/starten" className="btn-primary text-center">
              Volledig rapport — vanaf €9,40
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
