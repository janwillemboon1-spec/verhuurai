"use client";

import { useState, useEffect, useRef } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";

const DEMO_TEKST = `**Openingszin**
Hey Sophie! Ik heb jouw advertentie grondig bekeken en ik heb goed nieuws én een paar stevige verbeterpunten voor je. Laten we er samen induiken — want met een paar aanpassingen haal jij écht meer uit jouw woning.

**Totaalscore: 67/100**
Je advertentie heeft een solide basis, maar laat op meerdere punten kansen liggen. De titel mist concrete kenmerken, de beschrijving is te generiek en de buurtinformatie bevat geen specifieke afstanden. Met de verbeteringen hieronder kun je je score naar een 8+ tillen.

**Sterkste punten**
✅ Uitstekende recensies — gasten zijn enthousiast over netheid en communicatie
✅ Goede locatie dicht bij het centrum
✅ Huisregels zijn helder en professioneel opgesteld

**Top prioriteiten**
🔧 Titel mist structuur en concrete kenmerken — direct aanpassen
🔧 Beschrijving is te kort en begint met "Welkom" — verboden
🔧 Buurtbeschrijving is vaag — voeg concrete afstanden toe

**Analyse: Titel**
Score: 4/10
Je huidige titel bevat het accommodatietype ("appartement") dat Airbnb al automatisch toont, en bijvoeglijke naamwoorden ("gezellig") die niets zeggen. De verplichte structuur met kenmerken en afstand ontbreekt.

Herschreven versies:
1. "Dakterras | Vrij parkeren | 5 min van Rijksmuseum" — 46 tekens
2. "Zwembad • Werkplek • 8 min van Centraal Station" — 47 tekens
3. "Hottub | Zeezicht | 3 min van het Strand" — 41 tekens

**Analyse: Beschrijving**
Score: 5/10
Je beschrijving telt slechts 210 tekens. Het minimum is 400 tekens. De opening begint met "Welkom" — dit is expliciet verboden. Er ontbreekt een ervaringsgerichte haak, duidelijke doelgroep en locatievoordeel.

Herschreven versie:
"Ontwaak boven de daken van Amsterdam en stap vijf minuten later de Museumbuurt in. Dit loft-appartement is ideaal voor koppels en zakenreizigers die rust én centrumligging combineren. Geniet van het privédakterras bij zonsondergang, werk aan de ruime bureauhoek met glasvezel-wifi. Vrije parkeerplaats op de stoep — goud waard in deze buurt."

**Jouw actieplan**
Vandaag: Pas de titel aan naar de juiste lay-out
Deze week: Herschrijf de beschrijving tot minimaal 400 tekens
Deze maand: Herschrijf het hostprofiel met persoonlijk verhaal`;

const VERWACHTE_CHARS = DEMO_TEKST.length;
const SNELHEID_MS = 18; // ms per chunk

const MIJLPALEN = [10, 25, 40, 55, 70, 88];

const BERICHTEN: { vanaf: number; tekst: string }[] = [
  { vanaf: 0,  tekst: "Boni analyseert je advertentietitel..." },
  { vanaf: 15, tekst: "Boni leest je advertentiebeschrijving..." },
  { vanaf: 30, tekst: "Boni bekijkt je accommodatie en voorzieningen..." },
  { vanaf: 48, tekst: "Boni leest je reviews en hostprofiel..." },
  { vanaf: 63, tekst: "Boni analyseert je locatie en buurt..." },
  { vanaf: 76, tekst: "Boni schrijft je actiepunten..." },
  { vanaf: 90, tekst: "Boni rondt het rapport af..." },
];

export default function StreamingDemoPage() {
  const [gestart, setGestart] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [tekst, setTekst] = useState("");
  const [voortgang, setVoortgang] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const indexRef = useRef(0);

  const start = () => {
    setGestart(true);
    setKlaar(false);
    setTekst("");
    setVoortgang(0);
    indexRef.current = 0;

    intervalRef.current = setInterval(() => {
      const chunkGrootte = Math.floor(Math.random() * 8) + 3; // 3-10 chars per tick
      const nieuwIndex = Math.min(indexRef.current + chunkGrootte, DEMO_TEKST.length);
      indexRef.current = nieuwIndex;

      setTekst(DEMO_TEKST.slice(0, nieuwIndex));
      setVoortgang(Math.round((nieuwIndex / VERWACHTE_CHARS) * 100));

      if (nieuwIndex >= DEMO_TEKST.length) {
        clearInterval(intervalRef.current!);
        setKlaar(true);
      }
    }, SNELHEID_MS);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setGestart(false);
    setKlaar(false);
    setTekst("");
    setVoortgang(0);
    indexRef.current = 0;
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-xs font-bold px-3 py-1 rounded-full">
            🎭 Voorbeeld — zo ziet streaming eruit
          </div>
          <h1 className="font-display text-3xl text-primary">Rapport wordt gegenereerd</h1>
          <p className="text-text-secondary">Boni schrijft het rapport direct terwijl je kijkt</p>
        </div>

        {/* Voortgangsbalk */}
        {gestart && (
          <div className="card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BoniAvatar size={40} animate={!klaar} />
                <div>
                  <p className="font-semibold text-primary text-sm">
                    {klaar ? "Rapport klaar! 🎉" : "Boni analyseert jouw advertentie..."}
                  </p>
                  <p className="text-xs text-text-secondary">
                    {klaar ? "Je kunt het rapport hieronder bekijken" : "Dit duurt zo'n 60 seconden"}
                  </p>
                </div>
              </div>
              <span className="font-mono font-bold text-accent text-lg">{voortgang}%</span>
            </div>

            {/* Voortgangsbalk met mijlpalen */}
            <div className="relative">
              <div className="h-3 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-75"
                  style={{ width: `${voortgang}%` }}
                />
              </div>
              {/* Mijlpaal-stipjes op de balk */}
              <div className="absolute inset-0 flex items-center">
                {MIJLPALEN.map((pct) => (
                  <div
                    key={pct}
                    className="absolute -translate-x-1/2"
                    style={{ left: `${pct}%` }}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 transition-all duration-300 ${
                      voortgang >= pct
                        ? "bg-success border-success shadow-sm"
                        : "bg-background border-border"
                    }`} />
                  </div>
                ))}
              </div>
            </div>

            {/* Beschrijvend bericht */}
            <p className="text-xs text-text-secondary italic text-center min-h-[1rem]">
              {klaar
                ? "✅ Analyse voltooid"
                : BERICHTEN.filter(b => voortgang >= b.vanaf).pop()?.tekst ?? ""}
            </p>
          </div>
        )}


        {/* Knoppen */}
        <div className="flex gap-3">
          {!gestart ? (
            <button onClick={start} className="btn-primary flex-1 py-4 text-lg">
              ▶ Start voorbeeld
            </button>
          ) : klaar ? (
            <>
              <button onClick={reset} className="btn-secondary flex-1">
                ↺ Opnieuw
              </button>
              <button className="btn-primary flex-1">
                Rapport bekijken →
              </button>
            </>
          ) : (
            <button onClick={reset} className="btn-secondary flex-1">
              ✕ Stop
            </button>
          )}
        </div>

        <p className="text-center text-xs text-text-secondary">
          Dit is een voorbeeld met gesimuleerde snelheid. In werkelijkheid verschijnt de echte tekst van Claude.
        </p>
      </div>
    </div>
  );
}
