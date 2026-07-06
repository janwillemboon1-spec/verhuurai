"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";

function SuccesInhoud() {
  const params = useSearchParams();
  const router = useRouter();
  const sessieId = params.get("sessie_id") || "";

  // Automatisch doorsturen naar verwerkingspagina na korte vertraging
  useEffect(() => {
    if (!sessieId) return;
    const timer = setTimeout(() => {
      router.push(`/photo-optimizer/verwerken/${sessieId}`);
    }, 2500);
    return () => clearTimeout(timer);
  }, [sessieId, router]);

  return (
    <div className="min-h-screen bg-background py-16 px-4 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <BoniAvatar size={100} animate className="mx-auto mb-6" />
        <h1 className="font-display text-4xl text-primary mb-3">Betaling geslaagd!</h1>
        <p className="text-text-secondary text-lg mb-8 leading-relaxed">
          Top! Boni gaat direct aan de slag met jouw foto's.
          Je wordt automatisch doorgestuurd...
        </p>

        <div className="flex justify-center mb-8">
          <svg className="animate-spin w-8 h-8 text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        </div>

        {sessieId && (
          <button
            onClick={() => router.push(`/photo-optimizer/verwerken/${sessieId}`)}
            className="btn-primary w-full text-lg py-4"
          >
            Ga naar mijn foto's →
          </button>
        )}
      </div>
    </div>
  );
}

export default function FotoOptimizerSuccesPage() {
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
