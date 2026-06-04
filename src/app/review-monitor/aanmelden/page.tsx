"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoniAvatar } from "@/components/BoniAvatar";

const MAAND_DAGEN = [
  { waarde: "1",  label: "1e dag van de maand" },
  { waarde: "15", label: "15e dag van de maand" },
  { waarde: "28", label: "28e dag van de maand" },
];

export default function AanmeldenPage() {
  const searchParams = useSearchParams();

  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [listingNaam, setListingNaam] = useState("");
  const [email, setEmail] = useState("");
  const isEenmalig = searchParams.get("type") === "eenmalig";
  const [frequentie, setFrequentie] = useState<"monthly" | "weekly">(
    (searchParams.get("frequentie") as "monthly" | "weekly") || "monthly"
  );
  const [interval, setInterval] = useState<"month" | "year">(
    (searchParams.get("interval") as "month" | "year") || "month"
  );
  const [stap, setStap] = useState<"formulier" | "code">("formulier");
  const [code, setCode] = useState("");
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [isIngelogd, setIsIngelogd] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (user) setIsIngelogd(true);
    });
  }, []);

  const geldigeUrl = airbnbUrl.trim().includes("airbnb.");
  const geldigEmail = email.trim().includes("@");

  const verstuurAanmelding = async () => {
    if (!geldigeUrl) return;
    setLaden(true);
    setFout(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Al ingelogd — abonnement direct aanmaken
      const res = await fetch("/api/abonnement-aanmaken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airbnb_url: airbnbUrl.trim(),
          naam: listingNaam.trim(),
          frequentie,
          interval,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout("Er ging iets mis. Probeer het opnieuw.");
        setLaden(false);
        return;
      }
      window.location.href = `/review-monitor/rapport-genereren/${data.abonnementId}`;
      return;
    }

    // Niet ingelogd — OTP sturen
    if (!geldigEmail) {
      setFout("Vul een geldig e-mailadres in.");
      setLaden(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: true },
    });

    if (error) {
      setFout(`Er ging iets mis: ${error.message}`);
    } else {
      setStap("code");
    }
    setLaden(false);
  };

  const verifieerEnMaakAbo = async () => {
    if (code.length < 4) return;
    setLaden(true);
    setFout(null);

    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });

    if (error) {
      setFout(`Ongeldige code: ${error.message}`);
      setLaden(false);
      return;
    }

    const res = await fetch("/api/abonnement-aanmaken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        airbnb_url: airbnbUrl.trim(),
        naam: listingNaam.trim(),
        frequentie,
        interval,
      }),
    });
    const data = await res.json();

    if (res.ok && data.abonnementId) {
      window.location.href = `/review-monitor/rapport-genereren/${data.abonnementId}`;
    } else {
      setFout("Account aangemaakt maar woning toevoegen mislukt. Probeer opnieuw.");
      setLaden(false);
    }
  };

  // Stap: code invoeren
  if (stap === "code") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full card p-8 text-center space-y-5">
          <div className="text-5xl">📬</div>
          <h2 className="font-display text-2xl text-primary">Vul je inlogcode in</h2>
          <p className="text-text-secondary">
            We stuurden een 6-cijferige code naar <strong>{email}</strong>.
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.trim())}
            onKeyDown={(e) => e.key === "Enter" && verifieerEnMaakAbo()}
            placeholder="Vul je code in"
            className="input text-center font-mono text-2xl tracking-widest"
            autoFocus
          />
          {fout && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
              {fout}
            </div>
          )}
          <button
            onClick={verifieerEnMaakAbo}
            disabled={code.length < 4 || laden}
            className={`btn-primary w-full ${code.length < 6 || laden ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {laden ? "Bezig..." : "Bevestigen en rapport genereren →"}
          </button>
          <p className="text-xs text-text-secondary">
            Check ook je spammap. Code is 10 minuten geldig.
          </p>
          <button
            onClick={() => { setStap("formulier"); setCode(""); setFout(null); }}
            className="text-sm text-accent underline"
          >
            ← Terug
          </button>
        </div>
      </div>
    );
  }

  // Stap: formulier invullen
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <BoniAvatar size={70} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl text-primary mb-2">
            {isEenmalig ? "Eenmalig rapport aanvragen" : "Aanmelden Review Monitor"}
          </h1>
          <p className="text-text-secondary">
            {isEenmalig ? "Betaal eenmalig €7,99 — geen abonnement." : "Je eerste rapport is gratis. Geen creditcard nodig."}
          </p>
        </div>

        <div className="card p-6 md:p-8 space-y-6">
          {/* Stap 1 — Woning */}
          <div className="space-y-4">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">1</span>
              Jouw woning
            </h2>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                Airbnb advertentie URL <span className="text-accent">*</span>
              </label>
              <input
                type="url"
                value={airbnbUrl}
                onChange={(e) => setAirbnbUrl(e.target.value)}
                placeholder="https://www.airbnb.nl/rooms/12345678"
                className={`input ${airbnbUrl && !geldigeUrl ? "border-danger" : ""}`}
              />
              {airbnbUrl && !geldigeUrl && (
                <p className="text-xs text-danger mt-1">Voer een geldige Airbnb URL in</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                Naam van de woning <span className="text-text-secondary text-xs font-normal">(optioneel)</span>
              </label>
              <input
                type="text"
                value={listingNaam}
                onChange={(e) => setListingNaam(e.target.value)}
                placeholder="Bijv. Appartement Amsterdam Centrum"
                className="input"
              />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* Stap 2 — Frequentie (alleen bij abonnement) */}
          {!isEenmalig && <div className="space-y-3">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">2</span>
              Hoe vaak wil je een rapport?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {[
                { waarde: "monthly", label: "Maandelijks", prijs: "€5,99/maand", omschrijving: "Rapport op de 1e van de maand" },
                { waarde: "weekly",  label: "Wekelijks",   prijs: "€9,99/maand", omschrijving: "Rapport elke maandag" },
              ].map(({ waarde, label, prijs, omschrijving }) => (
                <button
                  key={waarde}
                  onClick={() => setFrequentie(waarde as "monthly" | "weekly")}
                  className={`card p-4 text-left transition-all ${
                    frequentie === waarde ? "border-accent ring-2 ring-accent/30" : "hover:border-primary/20"
                  }`}
                >
                  <p className="font-semibold text-primary">{label}</p>
                  <p className="text-accent font-bold text-sm">{prijs}</p>
                  <p className="text-xs text-text-secondary">{omschrijving}</p>
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary">
              Eerste rapport is gratis. Daarna automatisch verlengd. Altijd opzegbaar.
            </p>
          </div>}

          <div className="border-t border-border" />

          {/* Stap 3 — Email (alleen als niet ingelogd) */}
          {!isIngelogd && (
            <div className="space-y-3">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">3</span>
                Jouw e-mailadres
              </h2>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="input"
              />
              <p className="text-xs text-text-secondary">
                We sturen je een 6-cijferige inlogcode. Geen wachtwoord nodig.
              </p>
            </div>
          )}

          {fout && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
              {fout}
            </div>
          )}

          <button
            onClick={verstuurAanmelding}
            disabled={!geldigeUrl || (!isIngelogd && !geldigEmail) || laden}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${
              !geldigeUrl || (!isIngelogd && !geldigEmail) || laden ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            {laden ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Bezig...
              </>
            ) : isEenmalig
              ? "Eenmalig rapport aanvragen — €7,99 →"
              : isIngelogd
              ? "Woning toevoegen →"
              : "Gratis rapport aanvragen →"}
          </button>
        </div>
      </div>
    </div>
  );
}
