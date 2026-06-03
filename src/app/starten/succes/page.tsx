"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";

function SuccesInhoud() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const [handmatigId, setHandmatigId] = useState("");

  useEffect(() => {
    if (sessionId) {
      setHandmatigId(sessionId);
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-background py-16 px-4">
      <div className="max-w-lg mx-auto text-center">
        <div className="mb-6">
          <BoniAvatar size={100} animate={true} className="mx-auto" />
        </div>

        <h1 className="font-display text-4xl md:text-5xl text-primary mb-4">
          Betaling geslaagd!
        </h1>

        <p className="text-text-secondary text-lg mb-8 leading-relaxed">
          Je sessie-ID is verstuurd naar je e-mailadres. Check ook je spam.
          Gebruik je sessie-ID om je analyse te starten.
        </p>

        {sessionId && (
          <div className="card p-5 mb-8 text-left">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
              Jouw sessie-ID
            </p>
            <p className="font-mono text-sm text-primary break-all select-all bg-background rounded-lg px-3 py-2">
              {sessionId}
            </p>
          </div>
        )}

        {sessionId && (
          <Link
            href={`/analyseer/${sessionId}`}
            className="btn-primary w-full inline-block text-center text-lg py-4 mb-6"
          >
            Start mijn analyse →
          </Link>
        )}

        <div className="card p-6 text-left">
          <h2 className="font-semibold text-primary mb-2 text-base">
            Sessie-ID nog niet ontvangen?
          </h2>
          <p className="text-text-secondary text-sm mb-4">
            Check je spam-map. Heb je hem nog niet? Voer je sessie-ID hieronder in zodra je hem hebt:
          </p>
          <input
            type="text"
            value={handmatigId}
            onChange={(e) => setHandmatigId(e.target.value)}
            placeholder="Plak hier je sessie-ID"
            className="input mb-3"
          />
          <Link
            href={handmatigId.trim() ? `/analyseer/${handmatigId.trim()}` : "#"}
            className={`btn-primary w-full inline-block text-center ${!handmatigId.trim() ? "pointer-events-none opacity-40" : ""}`}
          >
            Naar mijn analyse →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function SuccesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-text-secondary">Laden...</div>
      </div>
    }>
      <SuccesInhoud />
    </Suspense>
  );
}
