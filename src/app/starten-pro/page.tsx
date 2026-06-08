"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import { createClient } from "@/lib/supabase/client";

export default function StartenProPage() {
  const router = useRouter();
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [airbnbUrl, setAirbnbUrl] = useState("");
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

  const geldigeUrl = airbnbUrl.trim().includes("airbnb.");
  const geldig =
    geldigeUrl &&
    (ingelogd || (naam.trim().length > 0 && email.trim().includes("@")));

  const starten = async () => {
    if (!geldig) return;
    setLaden(true);
    setFout(null);
    try {
      const res = await fetch("/api/start-sessie-pro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: ingelogd ? ingelogdEmail.split("@")[0] : naam.trim(),
          email: ingelogd ? ingelogdEmail : email.trim(),
          airbnbUrl: airbnbUrl.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const { sessieId } = await res.json();
      router.push(`/laden-pro/${sessieId}`);
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
          <h1 className="font-display text-3xl text-primary mb-2">Listing Optimizer Pro</h1>
          <p className="text-text-secondary">
            Plak je Airbnb URL en Boni haalt alles automatisch op.
          </p>
          <p className="text-accent font-semibold mt-2">€14,99 per analyse — eenmalig</p>
        </div>

        <div className="card p-6 md:p-8 space-y-5">

          {/* Airbnb URL */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">
              Airbnb advertentie URL <span className="text-accent">*</span>
            </label>
            <input
              type="url"
              value={airbnbUrl}
              onChange={(e) => setAirbnbUrl(e.target.value)}
              placeholder="https://www.airbnb.nl/rooms/12345678"
              className={`input ${airbnbUrl && !geldigeUrl ? "border-danger/50" : ""}`}
              disabled={laden}
              autoFocus
            />
            {airbnbUrl && !geldigeUrl && (
              <p className="text-xs text-danger mt-1">Voer een geldige Airbnb URL in</p>
            )}
            {!airbnbUrl && (
              <p className="text-xs text-text-secondary mt-1">
                Bijv. https://www.airbnb.nl/rooms/31050827
              </p>
            )}
          </div>

          {/* Naam + email of ingelogd */}
          {ingelogd ? (
            <div className="bg-success/10 border border-success/20 rounded-xl p-4 flex items-center gap-3">
              <span className="text-success text-xl">✓</span>
              <div>
                <p className="font-semibold text-success text-sm">Ingelogd</p>
                <p className="text-xs text-text-secondary">{ingelogdEmail}</p>
              </div>
            </div>
          ) : (
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
                  disabled={laden}
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
                  disabled={laden}
                />
                <p className="text-xs text-text-secondary mt-1">We sturen het rapport naar dit adres</p>
              </div>
            </>
          )}

          <div className="bg-background rounded-xl p-4 flex items-center gap-3">
            <BoniAvatar size={50} />
            <p className="text-sm text-text-secondary italic">
              "Ik lees jouw advertentie in en ben klaar binnen 2-3 minuten!"
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

          <p className="text-xs text-text-secondary text-center">
            Werkt de automatische inlezing niet?{" "}
            <a href="/starten" className="text-accent hover:underline">Gebruik de standaard Listing Optimizer</a>
          </p>
        </div>
      </div>
    </div>
  );
}
