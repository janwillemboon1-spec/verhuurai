"use client";

import { useState, useEffect } from "react";

interface Testimonial {
  quote: string;
  naam: string;
  locatie: string;
  tool: string;
}

const TESTIMONIALS: Testimonial[] = [
  { quote: "Ik heb 5 advertenties gecheckt met de Listing Optimizer. Ik had 1 score van 4/10 en 4 van 3/10 — dus genoeg te doen! Handige tool, ik weet nu gelijk wat ik moet gaan aanpassen.", naam: "Marloes", locatie: "Bergen aan Zee", tool: "Listing Optimizer" },
  { quote: "Wat een uitgebreide feedback heb ik mogen ontvangen. Heel uitgebreid en praktisch toepasbaar. Echt heel erg bedankt !", naam: "Sjoukje", locatie: "Oosterwolde", tool: "Listing Optimizer" },
  { quote: "Wow! Superblij met de uitgebreide analyses van mijn 2 advertenties. Als je als host al wat langer verhuurt, kun je een blinde vlek krijgen. Met deze analyses hoop ik wat blinde vlekken te verbeteren wat hopelijk tot mooie resultaten zal leiden, bedankt!!!", naam: "Marleen", locatie: "Herkingen", tool: "Listing Optimizer" },
  { quote: "Ik deed nooit iets met mijn prijzen, omdat ik geen idee had hoe ik die moest bepalen. Het rapport dat ik kreeg van Boni was ontzettend waardevol voor mij. Hij vond zelfs feestdagen waar ik het bestaan niet van wist.", naam: "Sophie", locatie: "Estepona", tool: "Prijscalculator" },
  { quote: "De Host Performance Audit werkt echt fantastisch. Bizar wat een goede actiepunten ik meekreeg. De adviezen heb ik opgevolgd en worden goed ontvangen door gasten! Ik sta echt versteld. Boni is mijn nieuwe vriend haha.", naam: "Peter", locatie: "Abcoude", tool: "Host Performance Audit" },
];

const DESKTOP = 3;

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const maxIndex = isMobile ? TESTIMONIALS.length - 1 : TESTIMONIALS.length - DESKTOP;
  // Zorg dat index nooit buiten bereik valt bij resize
  const effectiveIndex = Math.min(index, maxIndex);

  const vorige = () => setIndex(i => Math.max(0, Math.min(i, maxIndex) - 1));
  const volgende = () => setIndex(i => Math.min(maxIndex, Math.min(i, maxIndex) + 1));
  const naarIndex = (i: number) => setIndex(i);

  const zichtbaar = isMobile
    ? [TESTIMONIALS[effectiveIndex]]
    : TESTIMONIALS.slice(effectiveIndex, effectiveIndex + DESKTOP);

  return (
    <div className="space-y-6">
      {/* Kaarten */}
      <div className={`grid gap-6 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
        {zichtbaar.map(({ quote, naam, locatie, tool }) => (
          <div key={naam} className="card p-6 flex flex-col">
            <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full self-start mb-4">
              {tool}
            </span>
            <p className="text-text-secondary leading-relaxed italic flex-1">&ldquo;{quote}&rdquo;</p>
            <div className="flex items-center gap-3 mt-4 pt-4 border-t border-border">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                {naam[0]}
              </div>
              <div>
                <p className="font-semibold text-primary text-sm">{naam}</p>
                <p className="text-text-secondary text-xs">{locatie}</p>
              </div>
              <div className="ml-auto flex gap-0.5">
                {[1,2,3,4,5].map(i => <span key={i} className="text-accent text-xs">★</span>)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigatie */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={vorige}
          disabled={effectiveIndex === 0}
          aria-label="Vorige"
          className={`w-9 h-9 rounded-full border text-lg flex items-center justify-center transition-colors ${
            effectiveIndex === 0
              ? "border-border text-text-secondary/30 cursor-not-allowed"
              : "border-primary/20 text-primary hover:bg-primary/5"
          }`}
        >
          ‹
        </button>

        <div className="flex gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => naarIndex(i)}
              aria-label={`Slide ${i + 1}`}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === effectiveIndex ? "bg-accent" : "bg-border hover:bg-accent/40"
              }`}
            />
          ))}
        </div>

        <button
          onClick={volgende}
          disabled={effectiveIndex >= maxIndex}
          aria-label="Volgende"
          className={`w-9 h-9 rounded-full border text-lg flex items-center justify-center transition-colors ${
            effectiveIndex >= maxIndex
              ? "border-border text-text-secondary/30 cursor-not-allowed"
              : "border-primary/20 text-primary hover:bg-primary/5"
          }`}
        >
          ›
        </button>
      </div>
    </div>
  );
}
