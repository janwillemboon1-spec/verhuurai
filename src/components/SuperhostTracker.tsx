"use client";

import { useState } from "react";

interface ReviewRaw {
  createdAt: string | null;
  rating: number | null;
}

interface SuperhostTrackerProps {
  reviewsRaw: ReviewRaw[];
}

function getNextEvaluatieDatum(vandaag: Date): Date {
  const jaar = vandaag.getFullYear();
  const kandidaten = [
    new Date(jaar, 0, 1),
    new Date(jaar, 3, 1),
    new Date(jaar, 6, 1),
    new Date(jaar, 9, 1),
    new Date(jaar + 1, 0, 1),
  ];
  return kandidaten.find(d => d > vandaag)!;
}

function formatDatum(d: Date): string {
  return d.toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

export function SuperhostTracker({ reviewsRaw }: SuperhostTrackerProps) {
  const [toonUitleg, setToonUitleg] = useState(false);
  const vandaag = new Date();
  const volgendeEval = getNextEvaluatieDatum(vandaag);

  // Periode: exacte datum een jaar terug
  const periodeStart = new Date(volgendeEval);
  periodeStart.setFullYear(periodeStart.getFullYear() - 1);

  // Filter reviews met rating én datum in de periode
  const relevanteReviews = reviewsRaw.filter(r => {
    if (!r.createdAt || r.rating === null || r.rating === undefined) return false;
    const datum = new Date(r.createdAt);
    return datum >= periodeStart && datum <= vandaag;
  });

  const aantalReviews = relevanteReviews.length;

  if (aantalReviews === 0) return null;

  const totaalPunten = relevanteReviews.reduce((som, r) => som + (r.rating ?? 0), 0);
  const gemiddelde = totaalPunten / aantalReviews;
  const gemiddeldeAfgerond = Math.round(gemiddelde * 100) / 100;
  const boven48 = gemiddelde >= 4.8;

  // Hoeveel 5-sterrenreviews nodig om 4.8 te halen?
  let reviewsNodig: number | null = null;
  if (!boven48) {
    const n = Math.ceil((4.8 * aantalReviews - totaalPunten) / (5 - 4.8));
    reviewsNodig = n > 0 ? n : 1;
  }

  const dagenTotEval = Math.ceil((volgendeEval.getTime() - vandaag.getTime()) / (1000 * 60 * 60 * 24));
  const voortgangPct = Math.min((gemiddelde / 5) * 100, 100);
  const drempelPct = (4.8 / 5) * 100; // 96%

  return (
    <div className="card p-6 space-y-5">
      <div>
        <h2 className="font-display text-xl text-primary flex items-center gap-2">
          <span>🏆</span> Superhost Score Tracker
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Volgende beoordeling: <strong>{formatDatum(volgendeEval)}</strong> — over {dagenTotEval} dagen
          <span className="ml-2 text-border">·</span>
          <span className="ml-2">Periode: {formatDatum(periodeStart)} t/m vandaag</span>
        </p>
      </div>

      {/* Scorebalk */}
      <div className="space-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className={`text-4xl font-bold font-mono ${boven48 ? "text-success" : "text-warning"}`}>
            {gemiddeldeAfgerond.toFixed(2)}
          </span>
          <span className="text-text-secondary">/ 5,0</span>
        </div>

        {/* Balk met drempelmarkering */}
        <div className="relative">
          <div className="bg-border rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all ${boven48 ? "bg-success" : "bg-warning"}`}
              style={{ width: `${voortgangPct}%` }}
            />
          </div>
          {/* Drempellijn bij 4.8 — geen zwevend label */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-primary/70"
            style={{ left: `${drempelPct}%` }}
          />
        </div>

        {/* Labels onder de balk */}
        <div className="flex justify-between text-xs text-text-secondary">
          <span>{aantalReviews} reviews meegeteld</span>
          <span>grens Superhost: 4,80</span>
        </div>

        {boven48 ? (
          <p className="text-success text-sm font-semibold flex items-center gap-1.5">
            ✅ Je zit boven de Superhost-grens. Blijf zo doorgaan!
          </p>
        ) : (
          <p className="text-warning text-sm font-semibold flex items-center gap-1.5">
            ⚠️ Je zit {(4.8 - gemiddelde).toFixed(2)} onder de grens.
            {reviewsNodig && ` Nog ${reviewsNodig} review${reviewsNodig === 1 ? "" : "s"} van 5 sterren nodig om 4,8 te halen.`}
          </p>
        )}

      </div>

      {/* Vaste Superhost-vereisten */}
      <div className="border-t border-border pt-4 space-y-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Overige Superhost-vereisten (door Airbnb apart gemeten)</p>
        <ul className="space-y-1.5">
          {[
            "Minimaal 10 reserveringen of 3+ reserveringen van ≥ 100 nachten",
            "Responsgraad van 90% of hoger",
            "Annuleringspercentage onder 1%",
          ].map(item => (
            <li key={item} className="flex items-start gap-2 text-xs text-text-secondary">
              <span className="text-border mt-0.5 flex-shrink-0">—</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Uitlegcontainer — inklapbaar */}
      <div className="border-t border-border pt-4">
        <button
          onClick={() => setToonUitleg(v => !v)}
          className="flex items-center gap-2 text-sm text-accent font-semibold hover:underline w-full text-left"
        >
          <span>{toonUitleg ? "▲" : "▼"}</span>
          Wat levert Superhost-status je op?
        </button>

        {toonUitleg && (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-text-secondary">
              Airbnb controleert elke drie maanden of je het afgelopen jaar aan de Superhost-criteria hebt voldaan. Als dat zo is, word je een Superhost en profiteer je van de volgende voordelen:
            </p>

            <div className="space-y-3">
              {[
                {
                  icoon: "🎁",
                  titel: "Airbnb-tegoedbon",
                  tekst: "Elke keer dat je de Superhost-status een heel jaar weet te behouden, krijg je een Airbnb-tegoedbon van $100.",
                },
                {
                  icoon: "📧",
                  titel: "Gepromoot bij gasten",
                  tekst: "Gasten komen je tegen in promotionele e-mails van Airbnb.",
                },
                {
                  icoon: "🏅",
                  titel: "Superhost-badge",
                  tekst: "Dit vertrouwde symbool voor geweldige gastvrijheid wordt op je profiel en advertentiepagina's weergegeven.",
                },
                {
                  icoon: "💸",
                  titel: "Extra doorverwijzingsbonus",
                  tekst: "Je verdient een extra bonus van 20% bovenop de standaard doorverwijzingsbonus.",
                },
                {
                  icoon: "🚀",
                  titel: "Eerder toegang tot nieuwe functies",
                  tekst: "Probeer nieuwe programma's en functies uit voordat ze voor iedereen beschikbaar zijn.",
                },
                {
                  icoon: "🎧",
                  titel: "Voorrang bij support",
                  tekst: "Je krijgt voorrang wanneer je contact opneemt met Airbnb Support.",
                },
              ].map(({ icoon, titel, tekst }) => (
                <div key={titel} className="flex gap-3">
                  <span className="text-xl flex-shrink-0">{icoon}</span>
                  <div>
                    <p className="text-sm font-semibold text-primary">{titel}</p>
                    <p className="text-xs text-text-secondary leading-relaxed">{tekst}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
