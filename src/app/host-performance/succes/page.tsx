"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";

function HPSuccesInhoud() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") || "";
  const [fout, setFout] = useState(false);

  useEffect(() => {
    if (!sessionId) { setFout(true); return; }

    let gestopt = false;
    let pogingen = 0;

    const poll = async () => {
      if (gestopt) return;
      try {
        const res = await fetch(`/api/hp-audit/abonnement-voor-checkout?session_id=${encodeURIComponent(sessionId)}`);
        const data = await res.json();

        if (data.abonnementId) {
          window.location.href = `/host-performance/rapport-genereren/${data.abonnementId}?stripe_sid=${encodeURIComponent(sessionId)}`;
          return;
        }
      } catch {}

      pogingen++;
      if (pogingen >= 15) { setFout(true); return; }
      setTimeout(poll, 2000);
    };

    setTimeout(poll, 1500);
    return () => { gestopt = true; };
  }, [sessionId]);

  if (fout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full card p-8 text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="font-display text-2xl text-primary">Iets ging mis</h2>
          <p className="text-text-secondary text-sm">
            Jouw betaling is ontvangen maar de verwerking duurde te lang. Stuur een mailtje naar{" "}
            <a href="mailto:boni@verhuurai.nl" className="text-accent underline">boni@verhuurai.nl</a>{" "}
            en we lossen het direct op.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <BoniAvatar size={100} animate={true} className="mx-auto" />
        <h1 className="font-display text-3xl text-primary">Betaling geslaagd!</h1>
        <p className="text-text-secondary">Boni maakt jouw rapport klaar…</p>
        <div className="flex justify-center gap-1.5 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full bg-accent animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HPSuccesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <HPSuccesInhoud />
    </Suspense>
  );
}
