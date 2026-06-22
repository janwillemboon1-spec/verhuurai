"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BoniAvatar } from "@/components/BoniAvatar";

const STAPPEN = [
  "Belichting & kleuren optimaliseren...",
  "Ruimte analyseren...",
  "Compositie & perspectief corrigeren...",
  "Kwaliteit verhogen...",
];

const SECONDEN_PER_FOTO = 10;

export default function VerwerkingPage({
  params,
}: {
  params: { "sessie-id": string };
}) {
  const sessieId = params["sessie-id"];
  const router = useRouter();

  const [totaal, setTotaal] = useState(0);
  const [klaarCount, setKlaarCount] = useState(0);
  const [gestart, setGestart] = useState(false);
  const [isKlaar, setIsKlaar] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [stapIndex, setStapIndex] = useState(0);
  const [simulatedPercent, setSimulatedPercent] = useState(0);
  const [toonHandmatig, setToonHandmatig] = useState(false);

  const startTijdRef = useRef<number | null>(null);
  const totaalRef = useRef(0); // ref zodat simulatie-interval altijd actuele waarde leest
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stapIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handmatigTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const redirectedRef = useRef(false);

  const redirect = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    // Opruimen
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    if (handmatigTimerRef.current) clearTimeout(handmatigTimerRef.current);
    setIsKlaar(true);
    setSimulatedPercent(100);
    setTimeout(() => router.push(`/foto-optimizer/resultaat/${sessieId}`), 600);
  }, [sessieId, router]);

  // Check of alle foto's klaar zijn — sessie.status is leidend, individuele statussen als backup
  const checkKlaar = useCallback(async () => {
    try {
      const res = await fetch(`/api/foto-optimizer/resultaat/${sessieId}`);
      if (!res.ok) return;
      const data = await res.json();

      // Sessie klaar → meteen redirect, ongeacht individuele bewerking-statussen
      if (data.sessie?.status === "klaar") {
        redirect();
        return;
      }

      if (!data.bewerkingen) return;

      const all = data.bewerkingen as any[];
      // Gebruik sessie.aantal_fotos als bron voor totaal (beschikbaar voor de simulatie-interval)
      const n = data.sessie?.aantal_fotos || all.length;
      if (n === 0) return;

      totaalRef.current = n;
      setTotaal(n);

      const gedaan = all.filter((b: any) =>
        b.status === "klaar" ||
        b.bewerkt_pad !== null ||
        b.status === "overgeslagen" ||
        b.status === "fout"
      ).length;

      setKlaarCount(gedaan);

      if (gedaan >= n) {
        redirect();
      }
    } catch {}
  }, [sessieId, redirect]);

  useEffect(() => {
    // Tekststapjes roteren
    stapIntervalRef.current = setInterval(() => setStapIndex(i => (i + 1) % STAPPEN.length), 3000);

    const start = async () => {
      const res = await fetch("/api/foto-optimizer/verwerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessieId }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setFout(d.error || "Verwerking kon niet worden gestart.");
        return;
      }

      const d = await res.json();
      if (d.klaar) {
        redirect();
        return;
      }

      setGestart(true);
      startTijdRef.current = Date.now();

      // Eerste check meteen
      await checkKlaar();

      // Poll elke 2 seconden
      pollIntervalRef.current = setInterval(checkKlaar, 2000);

      // Simulatiebalk — gebruikt totaalRef (ref, niet state) om stale closure te vermijden
      simIntervalRef.current = setInterval(() => {
        if (!startTijdRef.current) return;
        const n = totaalRef.current || 1;
        const totaalSec = n * SECONDEN_PER_FOTO;
        const verlopen = (Date.now() - startTijdRef.current) / 1000;
        setSimulatedPercent(prev => {
          const sim = Math.min(90, (verlopen / totaalSec) * 90);
          return Math.max(prev, sim);
        });
      }, 500);

      // Handmatige knop na 2 minuten
      handmatigTimerRef.current = setTimeout(() => setToonHandmatig(true), 2 * 60 * 1000);
    };

    start().catch(() => setFout("Verbinding mislukt. Ververs de pagina."));

    return () => {
      if (stapIntervalRef.current) clearInterval(stapIntervalRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
      if (handmatigTimerRef.current) clearTimeout(handmatigTimerRef.current);
    };
  }, [sessieId]); // eslint-disable-line react-hooks/exhaustive-deps

  const actuelePercent = totaal > 0 ? Math.round((klaarCount / totaal) * 100) : 0;
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
              ? "Je wordt doorgestuurd naar de resultaten..."
              : gestart
              ? STAPPEN[stapIndex % STAPPEN.length]
              : "Verwerking wordt gestart..."}
          </p>
        </div>

        {/* Voortgangskaart */}
        {gestart && (
          <div className="card p-6 space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span className="text-primary">
                  {totaal > 0 ? `${totaal} foto's worden verwerkt` : "Foto's worden geladen..."}
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

            {!isKlaar && (
              <div className="flex items-center gap-3 bg-primary/5 rounded-xl p-3">
                <svg className="animate-spin w-4 h-4 shrink-0 text-accent" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span className="text-sm text-text-secondary">Verwerking bezig...</span>
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

        {/* Wachttekst + handmatige knop */}
        {!fout && !isKlaar && gestart && (
          <div className="text-center mt-6 space-y-3">
            <p className="text-xs text-text-secondary">
              Dit kan enkele minuten duren. Sluit dit venster niet.
            </p>
            {toonHandmatig && (
              <button
                onClick={() => router.push(`/foto-optimizer/resultaat/${sessieId}`)}
                className="btn-secondary text-sm"
              >
                Ga naar resultaten →
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
