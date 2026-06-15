"use client";

import { useState } from "react";

export function TrainButton() {
  const [bezig, setBezig] = useState(false);
  const [resultaat, setResultaat] = useState<any>(null);
  const [fout, setFout] = useState<string | null>(null);

  const train = async () => {
    setBezig(true);
    setResultaat(null);
    setFout(null);
    try {
      const res = await fetch("/api/foto-optimizer/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminModus: true }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setResultaat(data);
      } else {
        setFout(data.error || data.reden || "Training mislukt");
      }
    } catch {
      setFout("Verbinding mislukt");
    }
    setBezig(false);
  };

  return (
    <div className="space-y-3">
      <button
        onClick={train}
        disabled={bezig}
        className={`btn-primary flex items-center gap-2 ${bezig ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {bezig ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Analyseren & trainen...
          </>
        ) : "🧠 Analyseer feedback & verbeter prompt"}
      </button>

      {fout && (
        <div className="text-sm text-danger bg-danger/10 rounded-xl p-3">{fout}</div>
      )}

      {resultaat && (
        <div className="bg-success/10 border border-success/20 rounded-xl p-4 space-y-2">
          <p className="font-semibold text-success text-sm">✓ Versie {resultaat.versie} actief — {resultaat.aantalFouten} fouten + {resultaat.aantalPositief} positief geanalyseerd</p>
          <p className="text-sm text-text-secondary">{resultaat.samenvatting}</p>
          {resultaat.verbeteringen?.length > 0 && (
            <ul className="text-xs text-text-secondary space-y-0.5 mt-1">
              {resultaat.verbeteringen.map((v: string, i: number) => (
                <li key={i}>• {v}</li>
              ))}
            </ul>
          )}
          <button onClick={() => window.location.reload()} className="text-xs text-accent underline mt-1">Pagina herladen om nieuwe versie te zien</button>
        </div>
      )}
    </div>
  );
}
