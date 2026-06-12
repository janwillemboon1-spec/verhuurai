"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import type { FotoVoortgang } from "@/types/foto-optimizer";

const STAPPEN = [
  "Oriëntatie & belichting corrigeren...",
  "Kleuren & witbalans optimaliseren...",
  "Ruimte analyseren...",
  "Staging & compositie verbeteren...",
  "Afwerking & kwaliteitscontrole...",
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
  const eventSourceRef = useRef<EventSource | null>(null);

  // Roteer tekststapjes voor animatie-gevoel
  useEffect(() => {
    const t = setInterval(() => setStapIndex(i => (i + 1) % STAPPEN.length), 3000);
    return () => clearInterval(t);
  }, []);

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

      // SSE abonneren voor live voortgang
      es = new EventSource(`/api/foto-optimizer/voortgang/${sessieId}`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        const update: FotoVoortgang = JSON.parse(e.data);
        setVoortgang(update);

        if (update.status === "klaar") {
          es?.close();
          setTimeout(() => router.push(`/foto-optimizer/resultaat/${sessieId}`), 1200);
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
  const progressPercent = voortgang
    ? Math.round((verwerkt / Math.max(voortgang.totaal, 1)) * 100)
    : 0;
  const isKlaar = voortgang?.status === "klaar";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
      <div className="max-w-lg mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <BoniAvatar size={90} animate={!isKlaar} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl text-primary mb-2">
            {isKlaar ? "Klaar! 🎉" : "Boni is aan het werk..."}
          </h1>
          <p className="text-text-secondary">
            {isKlaar
              ? "Alle foto's zijn bewerkt. Je wordt doorgestuurd..."
              : voortgang
              ? `${STAPPEN[stapIndex]}`
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
                  {verwerkt} van {voortgang.totaal} foto&apos;s
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

            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-background rounded-xl p-3">
                <div className="text-2xl font-bold text-success">{voortgang.klaar}</div>
                <div className="text-xs text-text-secondary mt-0.5">Bewerkt</div>
              </div>
              <div className="bg-background rounded-xl p-3">
                <div className="text-2xl font-bold text-warning">{voortgang.overgeslagen}</div>
                <div className="text-xs text-text-secondary mt-0.5">Overgeslagen</div>
              </div>
              <div className="bg-background rounded-xl p-3">
                <div className="text-2xl font-bold text-text-secondary">{voortgang.totaal}</div>
                <div className="text-xs text-text-secondary mt-0.5">Totaal</div>
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
