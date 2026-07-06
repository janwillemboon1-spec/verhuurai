"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import { CopyButton } from "@/components/CopyButton";
import { DeelModal } from "@/components/DeelModal";
import { SuperhostTracker } from "@/components/SuperhostTracker";

const BERICHTEN = [
  "Boni haalt jouw reviews op...",
  "Reviews worden geanalyseerd...",
  "Boni zoekt verbeterpunten...",
  "Rapport wordt samengesteld...",
];

function RapportGenereerenInhoud() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const abonnementId = params.id as string;
  const stripeSid = searchParams.get("stripe_sid") || "";

  const [fase, setFase] = useState<"genereren" | "klaar" | "fout">("genereren");
  const [berichtIndex, setBerichtIndex] = useState(0);
  const [rapport, setRapport] = useState<any>(null);
  const [rapportId, setRapportId] = useState<string | null>(null);
  const [deelOpen, setDeelOpen] = useState(false);
  const rapportUrl = rapportId
    ? `${typeof window !== "undefined" ? window.location.origin : "https://www.hostboni.com"}/dashboard/rapporten/${rapportId}`
    : "";
  const bezig = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setBerichtIndex((i) => (i + 1) % BERICHTEN.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const genereer = async () => {
    try {
      const res = await fetch("/api/review-rapport", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abonnementId, stripe_session_id: stripeSid || undefined }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error);

      // rapport_json komt direct mee uit de API — geen aparte Supabase fetch nodig
      if (data.rapport_json) {
        setRapport(data.rapport_json);
        setRapportId(data.rapportId);
        setFase("klaar");
        return;
      }

      // Fallback: ophalen via Supabase client (ingelogde gebruikers)
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: rData } = await supabase
        .from("rapporten")
        .select("*")
        .eq("id", data.rapportId)
        .single();

      setRapport(rData?.rapport_json);
      setRapportId(data.rapportId);
      setFase("klaar");
    } catch {
      setFase("fout");
    }
  };

  useEffect(() => {
    if (bezig.current) return;
    bezig.current = true;
    genereer();
  }, [abonnementId]);

  if (fase === "genereren") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-8 text-center max-w-sm w-full">
          <BoniAvatar size={140} animate={true} className="boni-float" />
          <div>
            <p className="font-display text-2xl text-primary min-h-[2.5rem]">
              {BERICHTEN[berichtIndex]}
            </p>
            <p className="text-sm text-text-secondary mt-2">Dit duurt ongeveer 60 seconden</p>
          </div>
          <div className="w-full h-3 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full progress-animated" />
          </div>
        </div>
      </div>
    );
  }

  if (fase === "fout") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center space-y-4">
          <BoniAvatar size={80} className="mx-auto" />
          <h2 className="font-display text-2xl text-primary">Oeps, iets ging mis</h2>
          <p className="text-text-secondary">Boni kon het rapport niet genereren. Probeer het opnieuw.</p>
          <button onClick={() => { bezig.current = false; setFase("genereren"); genereer(); }} className="btn-primary">
            Opnieuw proberen
          </button>
        </div>
      </div>
    );
  }

  if (!rapport) return null;

  return (
    <div className="min-h-screen bg-background">
      {deelOpen && (
        <DeelModal
          onSluit={() => setDeelOpen(false)}
          titel={rapport?.rapportTitel}
          overrideUrl={rapportUrl}
        />
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Navigatie */}
        <div className="flex items-center justify-between">
          <a href="/dashboard" className="btn-secondary text-sm flex items-center gap-2">
            ← Dashboard
          </a>
          <button
            onClick={() => setDeelOpen(true)}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <span>↗</span> Rapport delen
          </button>
        </div>

        {/* Header */}
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BoniAvatar size={60} />
            <div>
              <h1 className="font-display text-2xl text-primary">
                {rapport.rapportTitel || "Review Rapport"}
              </h1>
              <p className="text-sm text-text-secondary">{rapport.totaalAantalReviews || 0} reviews geanalyseerd</p>
            </div>
          </div>

          {/* Sentiment */}
          {rapport.sentiment && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Positief", waarde: rapport.sentiment.positief, kleur: "text-success bg-success/10" },
                { label: "Neutraal", waarde: rapport.sentiment.neutraal, kleur: "text-warning bg-warning/10" },
                { label: "Negatief", waarde: rapport.sentiment.negatief, kleur: "text-danger bg-danger/10" },
              ].map(({ label, waarde, kleur }) => (
                <div key={label} className={`rounded-xl p-3 text-center ${kleur}`}>
                  <p className="text-2xl font-bold">{waarde}%</p>
                  <p className="text-xs font-semibold">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Samenvatting */}
        {rapport.samenvatting && (
          <div className="card p-6 flex gap-4">
            <BoniAvatar size={50} className="flex-shrink-0" />
            <p className="italic text-primary leading-relaxed">{rapport.samenvatting}</p>
          </div>
        )}

        {/* Complimenten */}
        {rapport.terugkerendeComplimenten?.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-display text-xl text-success flex items-center gap-2">✅ Wat gasten waarderen</h2>
            <ul className="space-y-2">
              {rapport.terugkerendeComplimenten.map((punt: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary">
                  <span className="text-success shrink-0">•</span>{punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Klachten */}
        {rapport.terugkerendeKlachten?.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-display text-xl text-warning flex items-center gap-2">⚠️ Terugkerende klachten</h2>
            <ul className="space-y-2">
              {rapport.terugkerendeKlachten.map((punt: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary">
                  <span className="text-warning shrink-0">•</span>{punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Rode vlaggen */}
        {rapport.rodeVlaggen?.length > 0 && (
          <div className="card p-6 space-y-3 border-danger/30 bg-danger/5">
            <h2 className="font-display text-xl text-danger flex items-center gap-2">🚨 Directe aandacht nodig</h2>
            <ul className="space-y-2">
              {rapport.rodeVlaggen.map((vlag: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary">
                  <span className="text-danger shrink-0">•</span>{vlag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Verbeterpunten */}
        {rapport.verbeterpunten?.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-display text-xl text-primary">🎯 Jouw verbeterpunten</h2>
            <ul className="space-y-2">
              {rapport.verbeterpunten.map((punt: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary bg-primary/5 rounded-xl p-3">
                  <span className="font-bold text-accent shrink-0">{i + 1}.</span>{punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Voorbeeldreacties */}
        {rapport.voorbeeldReacties?.length > 0 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary">💬 Voorbeeldreacties op reviews</h2>
            {rapport.voorbeeldReacties.map((r: any, i: number) => (
              <div key={i} className="bg-surface rounded-xl p-4 border border-border space-y-2">
                {r.origineelReview && (
                  <p className="text-xs text-text-secondary italic">"{r.origineelReview}"</p>
                )}
                <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
                  {r.aanbevolenReactie}
                </p>
                <CopyButton tekst={r.aanbevolenReactie} />
              </div>
            ))}
          </div>
        )}

        {/* Afsluiting */}
        {rapport.afsluiting && (
          <div className="card p-6 flex gap-4">
            <BoniAvatar size={50} className="flex-shrink-0" />
            <p className="text-text-secondary leading-relaxed italic">{rapport.afsluiting}</p>
          </div>
        )}

        {/* Superhost Score Tracker */}
        {Array.isArray(rapport.reviewsRaw) && rapport.reviewsRaw.length > 0 && (
          <SuperhostTracker reviewsRaw={rapport.reviewsRaw} />
        )}

        {/* CTA abonnement */}
        <div className="card p-8 bg-primary border-0 text-center space-y-4">
          <h2 className="font-display text-2xl text-white">
            Dit was je gratis rapport. Wil je dit automatisch blijven ontvangen?
          </h2>
          <p className="text-white/70">
            Start een abonnement en Boni stuurt je dit rapport automatisch elke week of maand.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href={`/host-performance/abonneren/${abonnementId}?frequentie=monthly&interval=month${stripeSid ? `&stripe_sid=${encodeURIComponent(stripeSid)}` : ""}`} className="btn-secondary text-center">
              Maandelijks — €5,99/maand
            </a>
            <a href={`/host-performance/abonneren/${abonnementId}?frequentie=weekly&interval=month${stripeSid ? `&stripe_sid=${encodeURIComponent(stripeSid)}` : ""}`} className="btn-primary text-center">
              Wekelijks — €9,99/maand
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function RapportGenereerenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <RapportGenereerenInhoud />
    </Suspense>
  );
}
