"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import { createClient } from "@/lib/supabase/client";

export default function StartenPage() {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [ingelogd, setIngelogd] = useState(false);
  const [ingelogdEmail, setIngelogdEmail] = useState("");

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIngelogd(true);
        setIngelogdEmail(user.email ?? "");
      }
    });
  }, []);

  const geldig = ingelogd || (naam.trim().length > 0 && email.trim().includes("@"));

  const starten = async () => {
    if (!geldig) return;
    setLaden(true);
    setFout(null);
    try {
      const res = await fetch("/api/stripe/checkout-lo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: ingelogd ? (ingelogdEmail.split("@")[0]) : naam.trim(),
          email: ingelogd ? ingelogdEmail : email.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      setFout("Er ging iets mis. Probeer het opnieuw.");
      setLaden(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <BoniAvatar size={80} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl text-primary mb-2">Start jouw analyse</h1>
          <p className="text-text-secondary">
            {ingelogd ? `Ingelogd als ${ingelogdEmail}` : "Vul je naam en e-mailadres in en Boni gaat direct aan de slag."}
          </p>
          <p className="text-accent font-semibold mt-2">€14,99 per analyse — eenmalig</p>
        </div>

        <div className="card p-6 md:p-8 space-y-5">
          {!ingelogd && (
            <>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1.5">
                  Voornaam <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={naam}
                  onChange={(e) => setNaam(e.target.value)}
                  placeholder="Bijv. Sophie"
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-primary mb-1.5">
                  E-mailadres <span className="text-accent">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jij@voorbeeld.nl"
                  className="input"
                />
              </div>
            </>
          )}

          {ingelogd && (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-success text-xl">✓</span>
              <div>
                <p className="font-semibold text-success text-sm">Ingelogd</p>
                <p className="text-xs text-text-secondary">{ingelogdEmail} — rapport wordt opgeslagen in je dashboard</p>
              </div>
            </div>
          )}

          <div className="bg-background rounded-xl p-4 flex items-center gap-3">
            <BoniAvatar size={50} />
            <p className="text-sm text-text-secondary italic">
              "Ik ga direct aan de slag met jouw advertentie!"
            </p>
          </div>

          {fout && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm">
              {fout}
            </div>
          )}

          <button
            onClick={starten}
            disabled={!geldig || laden}
            className={`btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 ${!geldig || laden ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {laden ? (
              <>
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Bezig...
              </>
            ) : "Analyse starten →"}
          </button>
        </div>
      </div>
    </div>
  );
}
