"use client";

import { useState } from "react";

interface Testimonial {
  quote: string;
  naam: string;
  locatie: string;
  tool: string;
}

const TESTIMONIALS: Testimonial[] = [
  { quote: "Ik heb 5 advertenties gecheckt met de Listing Optimizer. Ik had 1 score van 4/10 en 4 van 3/10 — dus genoeg te doen! Handige tool, ik weet nu gelijk wat ik moet gaan aanpassen.", naam: "Marloes", locatie: "Bergen aan Zee", tool: "Listing Optimizer" },
  { quote: "Wat een uitgebreide feedback heb ik mogen ontvangen. Heel uitgebreid en praktisch toepasbaar. Echt heel erg bedankt !", naam: "Sjoukje", locatie: "Oosterwolde", tool: "Listing Optimizer" },
  { quote: "Ik deed nooit iets met mijn prijzen, omdat ik geen idee had hoe ik die moest bepalen. Het rapport dat ik kreeg van Boni was ontzettend waardevol voor mij. Hij vond zelfs feestdagen waar ik het bestaan niet van wist.", naam: "Sophie", locatie: "Estepona", tool: "Prijscalculator" },
  { quote: "De Host Performance Audit werkt echt fantastisch. Bizar wat een goede actiepunten ik meekreeg. De adviezen heb ik opgevolgd en worden goed ontvangen door gasten! Ik sta echt versteld. Boni is mijn nieuwe vriend haha.", naam: "Peter", locatie: "Abcoude", tool: "Host Performance Audit" },
];

const ZICHTBAAR = 3; // aantal tegelijk zichtbaar op desktop

export function TestimonialCarousel() {
  const [index, setIndex] = useState(0);
  const maxIndex = TESTIMONIALS.length - ZICHTBAAR;

  const vorige = () => setIndex(i => Math.max(0, i - 1));
  const volgende = () => setIndex(i => Math.min(maxIndex, i + 1));

  const zichtbareItems = TESTIMONIALS.slice(index, index + ZICHTBAAR);

  return (
    <div className="space-y-6">
      {/* Kaarten */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {zichtbareItems.map(({ quote, naam, locatie, tool }) => (
          <div key={naam} className="card p-6 flex flex-col">
            <span className="text-xs font-semibold text-accent bg-accent/10 px-2.5 py-1 rounded-full self-start mb-4">{tool}</span>
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
          disabled={index === 0}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
            index === 0
              ? "border-border text-text-secondary/30 cursor-not-allowed"
              : "border-primary/20 text-primary hover:bg-primary/5"
          }`}
          aria-label="Vorige"
        >
          ‹
        </button>

        {/* Dots */}
        <div className="flex gap-2">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === index ? "bg-accent" : "bg-border hover:bg-accent/40"
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={volgende}
          disabled={index >= maxIndex}
          className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors ${
            index >= maxIndex
              ? "border-border text-text-secondary/30 cursor-not-allowed"
              : "border-primary/20 text-primary hover:bg-primary/5"
          }`}
          aria-label="Volgende"
        >
          ›
        </button>
      </div>
    </div>
  );
}
