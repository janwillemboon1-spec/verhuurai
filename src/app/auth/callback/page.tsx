"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoniAvatar } from "@/components/BoniAvatar";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("Verbinding maken...");
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    const afhandelen = async () => {
      const supabase = createClient();
      const code = searchParams.get("code");
      const airbnb_url = searchParams.get("airbnb_url");
      const naam = searchParams.get("naam");
      const frequentie = searchParams.get("frequentie");
      const interval = searchParams.get("interval");

      // Geen code — kijk of er al een sessie is (bijv. via hash/implicit flow)
      if (!code) {
        setStatus("Sessie controleren...");
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setStatus("Ingelogd! Doorsturen...");
          router.replace(airbnb_url ? `/host-performance/rapport-genereren` : "/dashboard");
        } else {
          setFout(`Geen inlogcode ontvangen. URL params: ${searchParams.toString() || "(leeg)"}`);
        }
        return;
      }

      setStatus("Inlogcode verwerken...");
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.user) {
        setFout(`Inloggen mislukt: ${error?.message || "onbekende fout"}`);
        return;
      }

      setStatus("Gelukt! Doorsturen...");

      const next = searchParams.get("next");
      if (next && next.startsWith("/")) {
        router.replace(next);
        return;
      }

      if (airbnb_url) {
        setStatus("Woning koppelen...");
        const res = await fetch("/api/abonnement-aanmaken", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ airbnb_url, naam, frequentie, interval }),
        });
        const aboData = await res.json();
        if (res.ok && aboData.abonnementId) {
          router.replace(`/host-performance/rapport-genereren/${aboData.abonnementId}`);
          return;
        }
      }

      router.replace("/dashboard");
    };

    afhandelen();
  }, [searchParams, router]);

  if (fout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center space-y-4">
          <BoniAvatar size={80} className="mx-auto" />
          <h2 className="font-display text-xl text-primary">Inloggen mislukt</h2>
          <p className="text-sm text-danger bg-danger/10 rounded-xl p-3 text-left">{fout}</p>
          <a href="/login" className="btn-primary inline-block">Opnieuw proberen</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="flex flex-col items-center gap-6 text-center">
        <BoniAvatar size={100} animate={true} className="boni-float" />
        <p className="font-display text-xl text-primary">{status}</p>
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
