"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BoniAvatar } from "@/components/BoniAvatar";
import type { FotoVoortgang } from "@/types/foto-optimizer";

const STAPPEN = [
  "Belichting & kleuren optimaliseren...",
  "Ruimte analyseren...",
  "Staging & compositie verbeteren...",
  "Kwaliteit verhogen...",
];

export default function VerwerkingPage({
  params,
}: {
  params: { "sessie-id": string };
}) {
  const sessieId = params["sessie-id"];
  const router = useRouter();
  const [voortgang, setVoortgang] = useState<FotoVoortgang | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [stapIndex, setStapIndex] = useState(0);
  const [simulatedPercent, setSimulatedPercent] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const startTijdRef = useRef<number | null>(null);

  // Roteer tekststapjes voor animatie-gevoel
  useEffect(() => {
    const t = setInterval(() => setStapIndex(i => (i + 1) % STAPPEN.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Gesimuleerde voortgangsbalk op basis van geschatte verwerkingstijd
  const SECONDEN_PER_FOTO = 55;
  useEffect(() => {
    if (!voortgang || voortgang.status === "klaar" || voortgang.status === "fout") return;
    const totaalSeconden = Math.max(voortgang.totaal, 1) * SECONDEN_PER_FOTO;

    const t = setInterval(() => {
      if (!startTijdRef.current) return;
      const verlopen = (Date.now() - startTijdRef.current) / 1000;
      // Bereikt 90% na de geschatte tijd, zodat echte voltooiing altijd "wint"
      const sim = Math.min(90, (verlopen / totaalSeconden) * 90);
      setSimulatedPercent(sim);
    }, 500);

    return () => clearInterval(t);
  }, [voortgang]);

  useEffect(() => {
    let es: EventSource | null = null;

    const start = async () => {
      // Verwerking starten (of hervatten bij refresh)
      const res = await fetch("/api/foto-optimizer/verwerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessieId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setFout(data.error || "Verwerking kon niet worden gestart.");
        return;
      }

      const data = await res.json();

      // Direct doorsturen als al klaar
      if (data.klaar) {
        router.replace(`/foto-optimizer/resultaat/${sessieId}`);
        return;
      }

      // Simulatietimer starten
      startTijdRef.current = Date.now();

      // SSE abonneren voor live voortgang
      es = new EventSource(`/api/foto-optimizer/voortgang/${sessieId}`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        const update: FotoVoortgang = JSON.parse(e.data);
        setVoortgang(update);

        if (update.status === "klaar") {
          es?.close();
          setTimeout(() => router.push(`/foto-optimizer/resultaat/${sessieId}`), 500);
        } else if (update.status === "fout") {
          es?.close();
          setFout("Er ging iets mis tijdens de verwerking. Neem contact op via info@hostboni.com.");
        }
      };

      es.onerror = () => {
        // Herverbinden na fout — EventSource doet dit automatisch
      };
    };

    start().catch(() => setFout("Verbinding mislukt. Ververs de pagina."));

    return () => {
      eventSourceRef.current?.close();
    };
  }, [sessieId, router]);

  const verwerkt = voortgang
    ? voortgang.klaar + voortgang.overgeslagen + voortgang.fout
    : 0;
  const isKlaar = voortgang?.status === "klaar";
  const actuelePercent = voortgang
    ? Math.round((verwerkt / Math.max(voortgang.totaal, 1)) * 100)
    : 0;
  // Toon het hoogste van gesimuleerd of actueel — springt naar 100% bij echte voltooiing
  const progressPercent = isKlaar ? 100 : Math.max(Math.round(simulatedPercent), actuelePercent);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          {isKlaar ? (
            <BoniAvatar size={90} animate className="mx-auto mb-4" />
          ) : (
            <div className="mx-auto mb-4 w-24 h-24 relative">
              <Image
                src="/boni-schilder-nobg.png"
                alt="Boni aan het schilderen"
                fill
                className="object-contain"
                style={{ animation: "gentle-bob 2s ease-in-out infinite" }}
              />
            </div>
          )}
          <h1 className="font-display text-3xl text-primary mb-2">
            {isKlaar ? "Klaar! 🎉" : "Boni is aan het werk..."}
          </h1>
          <p className="text-text-secondary">
            {isKlaar
              ? "Alle foto's zijn bewerkt. Je wordt doorgestuurd..."
              : voortgang
              ? STAPPEN[stapIndex % STAPPEN.length]
              : "Verwerking wordt gestart..."}
          </p>
        </div>

        {/* Voortgangskaart */}
        {voortgang && (
          <div className="card p-6 space-y-5">
            {/* Progressbar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-primary">
                  {voortgang.totaal} foto&apos;s worden verwerkt
                </span>
                <span className="text-text-secondary">{progressPercent}%</span>
              </div>
              <div className="h-3 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Animatie indicator tijdens verwerking */}
            {!isKlaar && (
              <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3">
                <svg className="animate-spin w-4 h-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-sm text-text-secondary">
                  {voortgang.huidigeFoto
                    ? `Foto ${voortgang.huidigeFoto} wordt verwerkt...`
                    : "Verwerking bezig..."}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Foutmelding */}
        {fout && (
          <div className="card p-5 mt-4 bg-danger/5 border-danger/20 text-danger text-sm text-center">
            {fout}
          </div>
        )}

        {/* Wachttekst */}
        {!fout && !isKlaar && (
          <p className="text-xs text-text-secondary text-center mt-6">
            Dit kan enkele minuten duren afhankelijk van het aantal foto&apos;s.
            <br />Sluit dit venster niet — je krijgt ook een e-mail als alles klaar is.
          </p>
        )}
      </div>
    </div>
  );
}
