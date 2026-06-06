"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";

const BERICHTEN = [
  "Boni leest je advertentie aandachtig...",
  "Boni analyseert je teksten grondig...",
  "Boni schrijft verbeterpunten voor je uit...",
  "Bijna klaar — nog even geduld...",
];

export default function LadenPagina() {
  const params = useParams();
  const router = useRouter();
  const sessieId = params["sessie-id"] as string;

  const [berichtIndex, setBerichtIndex] = useState(0);
  const [fout, setFout] = useState<string | null>(null);
  const [timeout, setTimeoutBereikte] = useState(false);

  useEffect(() => {
    const berichtInterval = setInterval(() => {
      setBerichtIndex((i) => (i + 1) % BERICHTEN.length);
    }, 8000);
    return () => clearInterval(berichtInterval);
  }, []);

  useEffect(() => {
    if (!sessieId) return;

    const timeoutTimer = globalThis.setTimeout(() => {
      setTimeoutBereikte(true);
    }, 90000);

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/rapport-status/${sessieId}`);
        const data = await res.json();

        if (data.status === "klaar") {
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
          router.push(`/rapport/${sessieId}`);
        } else if (data.status === "fout") {
          clearInterval(pollInterval);
          clearTimeout(timeoutTimer);
          setFout(data.bericht ?? "Er ging iets mis bij de analyse.");
        }
      } catch {
        // Netwerk fout — blijf proberen
      }
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeoutTimer);
    };
  }, [sessieId, router]);

  if (timeout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-6">
          <BoniAvatar size={100} className="mx-auto" />
          <h2 className="font-display text-2xl text-primary">
            Het duurt wat langer dan verwacht
          </h2>
          <p className="text-text-secondary">
            Boni is nog druk bezig, maar het lijkt langer te duren dan normaal.
            Wacht nog even of probeer het opnieuw.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => {
                setTimeoutBereikte(false);
                setFout(null);
              }}
              className="btn-secondary"
            >
              Nog even wachten
            </button>
            <a href="/starten" className="btn-primary text-center">
              Opnieuw beginnen
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (fout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-6">
          <BoniAvatar size={100} className="mx-auto" />
          <h2 className="font-display text-2xl text-primary">
            Oeps, er ging iets mis
          </h2>
          <p className="text-text-secondary">{fout}</p>
          <a href="/starten" className="btn-primary inline-block">
            Opnieuw proberen
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
        <BoniAvatar size={160} animate={true} className="boni-float" />

        <div className="space-y-2">
          <p className="font-display text-2xl text-primary min-h-[2.5rem] transition-all duration-500">
            {BERICHTEN[berichtIndex]}
          </p>
        </div>

        <div className="w-80 max-w-full space-y-3">
          <div className="w-full h-3 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full progress-animated" />
          </div>
          <p className="text-sm text-text-secondary">
            Dit duurt gemiddeld 3 à 4 minuten
          </p>
        </div>
      </div>
    </div>
  );
}
