"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";

const STAPPEN = [
  { tekst: "Advertentie ophalen via Airbnb...", duur: 15 },
  { tekst: "Reviews en beoordelingen inlezen...", duur: 20 },
  { tekst: "Boni analyseert jouw advertentie...", duur: 30 },
  { tekst: "Scores en verbeterpunten berekenen...", duur: 20 },
  { tekst: "Herschreven teksten genereren...", duur: 15 },
];

export default function LadenProPage() {
  const params = useParams();
  const router = useRouter();
  const sessieId = params["sessie-id"] as string;

  const [stapIndex, setStapIndex] = useState(0);
  const [fout, setFout] = useState<string | null>(null);
  const analyseGestart = useRef(false);

  // Stap-animatie op basis van tijd
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    let verstreken = 0;
    STAPPEN.forEach((stap, i) => {
      const timer = setTimeout(() => setStapIndex(i), verstreken * 1000);
      timers.push(timer);
      verstreken += stap.duur;
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Analyse starten + pollen
  useEffect(() => {
    if (!sessieId || analyseGestart.current) return;
    analyseGestart.current = true;

    // Analyse starten (lange request — fire-and-forget)
    fetch("/api/analyse-pro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessieId }),
    }).catch(() => {});

    // Pollen totdat klaar of fout
    const poll = setInterval(async () => {
      try {
        const res = await fetch(`/api/rapport-status/${sessieId}`);
        const data = await res.json();
        if (data.status === "klaar") {
          clearInterval(poll);
          router.push(`/rapport-pro/${sessieId}`);
        } else if (data.status === "fout") {
          clearInterval(poll);
          setFout(
            "Boni kon je advertentie niet automatisch inlezen. Airbnb blokkeert soms het ophalen. " +
            "Probeer het opnieuw of gebruik de standaard Listing Optimizer."
          );
        }
      } catch {
        // Tijdelijke netwerkfout — blijf pollen
      }
    }, 4000);

    return () => clearInterval(poll);
  }, [sessieId, router]);

  if (fout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-6">
          <BoniAvatar size={100} className="mx-auto" />
          <h2 className="font-display text-2xl text-primary">Automatisch inlezen mislukt</h2>
          <p className="text-text-secondary">{fout}</p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setFout(null); analyseGestart.current = false; }}
              className="btn-primary w-full"
            >
              Opnieuw proberen
            </button>
            <a href="/starten" className="btn-secondary w-full text-center">
              Standaard Listing Optimizer gebruiken
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        <BoniAvatar size={100} animate={true} className="mx-auto" />

        <div>
          <h1 className="font-display text-2xl font-bold text-primary mb-2">
            Boni is bezig...
          </h1>
          <p className="text-text-secondary">Dit duurt 2-3 minuten. Sluit dit venster niet.</p>
        </div>

        {/* Stappen */}
        <div className="card p-6 space-y-3 text-left">
          {STAPPEN.map((stap, i) => (
            <div key={i} className={`flex items-center gap-3 transition-all duration-500 ${i <= stapIndex ? "opacity-100" : "opacity-30"}`}>
              <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold transition-all
                ${i < stapIndex ? "bg-success text-white" : i === stapIndex ? "bg-accent text-white animate-pulse" : "bg-border text-text-secondary"}`}>
                {i < stapIndex ? "✓" : i + 1}
              </span>
              <span className={`text-sm ${i === stapIndex ? "text-primary font-semibold" : "text-text-secondary"}`}>
                {stap.tekst}
              </span>
            </div>
          ))}
        </div>

        {/* Voortgangsbalk */}
        <div className="bg-surface rounded-full h-2 overflow-hidden">
          <div
            className="bg-accent h-full rounded-full transition-all duration-[2000ms]"
            style={{ width: `${Math.round(((stapIndex + 1) / STAPPEN.length) * 90)}%` }}
          />
        </div>

        <p className="text-xs text-text-secondary">
          Je ontvangt het rapport ook per e-mail zodra het klaar is.
        </p>
      </div>
    </div>
  );
}
