"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BoniAvatar } from "@/components/BoniAvatar";

const MAAND_DAGEN = [
  { waarde: "1",  label: "1e dag van de maand" },
  { waarde: "15", label: "15e dag van de maand" },
  { waarde: "28", label: "28e dag van de maand" },
];

function AanmeldenForm() {
  const searchParams = useSearchParams();

  const [voornaam, setVoornaam] = useState("");
  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [listingNaam, setListingNaam] = useState("");
  const [email, setEmail] = useState("");
  const [typeRapport, setTypeRapport] = useState<"abonnement" | "eenmalig">(
    searchParams.get("type") === "eenmalig" ? "eenmalig" : "abonnement"
  );
  const isEenmalig = typeRapport === "eenmalig";
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
          voornaam: voornaam.trim() || null,
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

    const res = await fetch("/api/otp-sturen", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json();

    if (!res.ok) {
      setFout(data.error || "Er ging iets mis. Probeer het opnieuw.");
    } else {
      setStap("code");
    }
    setLaden(false);
  };

  const verifieerEnMaakAbo = async () => {
    if (code.length < 4) return;
    setLaden(true);
    setFout(null);

    const verRes = await fetch("/api/otp-verifieer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });
    const verData = await verRes.json();

    if (!verRes.ok) {
      setFout(verData.error || "Ongeldige of verlopen code.");
      setLaden(false);
      return;
    }

    // Sessie starten via de login URL
    if (verData.loginUrl) {
      try { await fetch(verData.loginUrl, { redirect: "manual" }); } catch {}
    }

    const res = await fetch("/api/abonnement-aanmaken", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        airbnb_url: airbnbUrl.trim(),
        naam: listingNaam.trim(),
        voornaam: voornaam.trim() || null,
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
            We stuurden een inlogcode naar <strong>{email}</strong>.
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
          <h1 className="font-display text-3xl text-primary mb-2">Review Monitor</h1>
          <p className="text-text-secondary">Kies een optie en vraag je rapport aan.</p>
        </div>

        <div className="card p-6 md:p-8 space-y-6">

          {/* Type rapport kiezen */}
          <div className="space-y-3">
            <h2 className="font-semibold text-primary">Wat wil je?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { waarde: "abonnement", label: "Eerste rapport gratis", prijs: "Dan €5,99 of €9,99/maand", omschrijving: "Automatisch elke week of maand", badge: "Populair" },
                { waarde: "eenmalig", label: "Eenmalig rapport", prijs: "€7,99", omschrijving: "Geen abonnement, geen verlenging", badge: null },
              ].map(({ waarde, label, prijs, omschrijving, badge }) => (
                <button
                  key={waarde}
                  onClick={() => setTypeRapport(waarde as "abonnement" | "eenmalig")}
                  className={`card p-4 text-left transition-all relative ${
                    typeRapport === waarde ? "border-accent ring-2 ring-accent/30" : "hover:border-primary/20"
                  }`}
                >
                  {badge && (
                    <span className="absolute -top-2 right-3 bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                      {badge}
                    </span>
                  )}
                  <p className="font-semibold text-primary text-sm">{label}</p>
                  <p className="text-accent font-bold">{prijs}</p>
                  <p className="text-xs text-text-secondary">{omschrijving}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-border" />

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
                Naam van de woning <span className="text-text-secondary text-xs font-normal">(voor intern gebruik)</span>
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

          {/* Stap 2 — Frequentie + interval (alleen bij abonnement) */}
          {!isEenmalig && <div className="space-y-4">
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

            {/* Betaalinterval */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { waarde: "month", label: "Maandelijks betalen", prijs: frequentie === "monthly" ? "€5,99/maand" : "€9,99/maand", korting: null },
                { waarde: "year",  label: "Jaarlijks betalen",   prijs: frequentie === "monthly" ? "€59/jaar" : "€99/jaar", korting: "2 maanden gratis" },
              ].map(({ waarde, label, prijs, korting }) => (
                <button
                  key={waarde}
                  onClick={() => setInterval(waarde as "month" | "year")}
                  className={`card p-4 text-left transition-all ${
                    interval === waarde ? "border-accent ring-2 ring-accent/30" : "hover:border-primary/20"
                  }`}
                >
                  <p className="font-semibold text-primary text-sm">{label}</p>
                  <p className="text-accent font-bold">{prijs}</p>
                  {korting && <p className="text-xs text-success font-semibold">{korting}</p>}
                </button>
              ))}
            </div>

            <p className="text-xs text-text-secondary">
              Eerste rapport is gratis. Daarna automatisch verlengd. Altijd opzegbaar.
            </p>
          </div>}

          <div className="border-t border-border" />

          {/* Stap 3 — Voornaam + Email (alleen als niet ingelogd) */}
          {!isIngelogd && (
            <div className="space-y-3">
              <h2 className="font-semibold text-primary flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">3</span>
                Jouw gegevens
              </h2>
              <input
                type="text"
                value={voornaam}
                onChange={(e) => setVoornaam(e.target.value)}
                placeholder="Voornaam"
                className="input"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="input"
              />
              <p className="text-xs text-text-secondary">
                We sturen je een inlogcode per email. Geen wachtwoord nodig.
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

export default function AanmeldenPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <AanmeldenForm />
    </Suspense>
  );
}
