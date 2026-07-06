"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";

const PRIJZEN = {
  monthly: { month: "€5,99/maand", year: "€59/jaar" },
  weekly:  { month: "€9,99/maand", year: "€99/jaar" },
};

const MAAND_DAGEN = [
  { waarde: "1",  label: "1e van de maand" },
  { waarde: "15", label: "15e van de maand" },
  { waarde: "28", label: "28e van de maand" },
];

const WEEK_DAGEN = [
  { waarde: "maandag",   label: "Maandag",   kort: "Ma" },
  { waarde: "dinsdag",   label: "Dinsdag",   kort: "Di" },
  { waarde: "woensdag",  label: "Woensdag",  kort: "Wo" },
  { waarde: "donderdag", label: "Donderdag", kort: "Do" },
  { waarde: "vrijdag",   label: "Vrijdag",   kort: "Vr" },
  { waarde: "zaterdag",  label: "Zaterdag",  kort: "Za" },
  { waarde: "zondag",    label: "Zondag",    kort: "Zo" },
];

function KeuzeKnop({
  geselecteerd,
  onClick,
  children,
}: {
  geselecteerd: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`card p-3 sm:p-4 text-left transition-all ${
        geselecteerd
          ? "border-accent ring-2 ring-accent/30 font-semibold text-primary"
          : "text-text-secondary hover:border-primary/20"
      }`}
    >
      {children}
    </button>
  );
}

export default function AbonnerenPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const abonnementId = params.id as string;
  const stripeSid = searchParams.get("stripe_sid") || "";
  const [frequentie, setFrequentie] = useState<"monthly" | "weekly">(
    (searchParams.get("frequentie") as "monthly" | "weekly") || "monthly"
  );
  const [interval, setInterval] = useState<"month" | "year">(
    (searchParams.get("interval") as "month" | "year") || "month"
  );
  const [dag, setDag] = useState<string>(
    (searchParams.get("frequentie") as string) === "weekly" ? "maandag" : "1"
  );
  const [tijd, setTijd] = useState("08:00");
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const activeer = async () => {
    setLaden(true);
    setFout(null);
    try {
      const res = await fetch("/api/abonnement-activeren", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ abonnementId, frequentie, billingInterval: interval, dag, tijd, stripe_session_id: stripeSid || undefined }),
      });
      if (!res.ok) throw new Error("Activeren mislukt");
      router.push("/dashboard?welkom=1");
    } catch {
      setFout("Er ging iets mis. Probeer het opnieuw.");
      setLaden(false);
    }
  };

  const prijs = PRIJZEN[frequentie][interval];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="text-center">
          <BoniAvatar size={70} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl sm:text-4xl text-primary mb-2">Start jouw abonnement</h1>
          <p className="text-text-secondary">
            Boni stuurt je automatisch rapporten. Altijd opzegbaar.
          </p>
        </div>

        <div className="card p-6 sm:p-8 space-y-8">

          {/* Rij 1: Frequentie + Betaalinterval */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-primary mb-3">Hoe vaak een rapport?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { waarde: "monthly", label: "Maandelijks", sub: "Elke 1e van de maand" },
                  { waarde: "weekly",  label: "Wekelijks",   sub: "Elke gekozen dag" },
                ].map(({ waarde, label, sub }) => (
                  <KeuzeKnop
                    key={waarde}
                    geselecteerd={frequentie === waarde}
                    onClick={() => {
                      setFrequentie(waarde as "monthly" | "weekly");
                      setDag(waarde === "weekly" ? "maandag" : "1");
                    }}
                  >
                    <p className="font-semibold text-primary text-sm">{label}</p>
                    <p className="text-xs text-text-secondary hidden sm:block">{sub}</p>
                  </KeuzeKnop>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-primary mb-3">Hoe wil je betalen?</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { waarde: "month", label: "Maandelijks", korting: null },
                  { waarde: "year",  label: "Jaarlijks",   korting: "2 maanden gratis" },
                ].map(({ waarde, label, korting }) => (
                  <KeuzeKnop
                    key={waarde}
                    geselecteerd={interval === waarde}
                    onClick={() => setInterval(waarde as "month" | "year")}
                  >
                    <p className="font-semibold text-primary text-sm">{label}</p>
                    {korting && <p className="text-xs text-success font-semibold">{korting}</p>}
                  </KeuzeKnop>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Rij 2: Dag kiezen */}
          <div>
            <p className="text-sm font-semibold text-primary mb-3">
              Op welke dag wil je het rapport ontvangen?
            </p>
            {frequentie === "monthly" ? (
              <div className="grid grid-cols-3 gap-3">
                {MAAND_DAGEN.map(({ waarde, label }) => (
                  <button
                    key={waarde}
                    onClick={() => setDag(waarde)}
                    className={`card p-3 sm:p-4 text-center text-sm transition-all ${
                      dag === waarde
                        ? "border-accent ring-2 ring-accent/30 font-semibold text-primary"
                        : "text-text-secondary hover:border-primary/20"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {WEEK_DAGEN.map(({ waarde, label, kort }) => (
                  <button
                    key={waarde}
                    onClick={() => setDag(waarde)}
                    className={`card py-3 px-1 text-center transition-all ${
                      dag === waarde
                        ? "border-accent ring-2 ring-accent/30 font-semibold text-primary"
                        : "text-text-secondary hover:border-primary/20"
                    }`}
                  >
                    <span className="block sm:hidden text-xs">{kort}</span>
                    <span className="hidden sm:block text-xs">{label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Rij 3: Tijd kiezen */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-primary mb-3">
                Hoe laat wil je het rapport ontvangen?
              </p>
              <input
                type="time"
                value={tijd}
                onChange={(e) => setTijd(e.target.value)}
                className="input w-44 font-mono text-xl text-center"
              />
            </div>
            <div className="bg-primary/5 rounded-xl p-4 sm:min-w-[220px] flex items-center justify-between sm:justify-end gap-4">
              <div>
                <p className="font-semibold text-primary text-sm">
                  {frequentie === "monthly" ? "Maandrapport" : "Weekrapport"}
                </p>
                <p className="text-xs text-text-secondary">
                  {dag === "1" ? "1e vd maand" : dag === "15" ? "15e vd maand" : dag === "28" ? "28e vd maand" : dag.charAt(0).toUpperCase() + dag.slice(1)} · {tijd}u
                </p>
              </div>
              <p className="text-2xl font-bold text-accent whitespace-nowrap">{prijs}</p>
            </div>
          </div>

          {fout && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
              {fout}
            </div>
          )}

          <button
            onClick={activeer}
            disabled={laden}
            className={`btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 ${laden ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {laden ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Bezig...
              </>
            ) : (
              `Abonnement starten — ${prijs} →`
            )}
          </button>

          <p className="text-xs text-text-secondary text-center">
            Altijd opzegbaar via je dashboard. Geen verborgen kosten.
          </p>
        </div>
      </div>
    </div>
  );
}
