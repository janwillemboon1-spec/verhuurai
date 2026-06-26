"use client";

import { Suspense } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";

function SuccesInhoud() {
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
          Boni is al aan het werk. Je ontvangt binnen een minuut een e-mail met jouw persoonlijke analyselink.
        </p>

        <div className="card p-6 text-left space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-success text-xl mt-0.5">✓</span>
            <p className="text-sm text-text-secondary">Betaling bevestigd</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-success text-xl mt-0.5">✓</span>
            <p className="text-sm text-text-secondary">Jouw analyselink is aangemaakt</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-accent text-xl mt-0.5">→</span>
            <p className="text-sm text-text-secondary">
              <strong>Check je e-mail</strong> — de link staat er al in. Kijk ook in je spammap.
            </p>
          </div>
        </div>

        <p className="text-xs text-text-secondary mt-6">
          Geen e-mail ontvangen na 5 minuten? Stuur een berichtje naar{" "}
          <a href="mailto:boni@verhuurai.nl" className="text-accent underline">
            boni@verhuurai.nl
          </a>
        </p>
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
