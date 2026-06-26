"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";

function SuccesInhoud() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessieId = searchParams.get("sessie_id") || "";

  useEffect(() => {
    if (sessieId) {
      router.replace(`/analyseer/${sessieId}`);
    }
  }, [sessieId, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <BoniAvatar size={100} animate={true} className="mx-auto" />
        <h1 className="font-display text-3xl text-primary">Betaling geslaagd!</h1>
        <p className="text-text-secondary">Boni maakt jouw analyseformulier klaar…</p>
        <div className="flex justify-center gap-1.5">
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

export default function SuccesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SuccesInhoud />
    </Suspense>
  );
}
