"use client";

import { useState } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";

type Fase = "email" | "tools";

export default function CommunityPage() {
  const [fase, setFase] = useState<Fase>("email");
  const [toonHpForm, setToonHpForm] = useState(false);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [tag, setTag] = useState("");
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  // HP form state
  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [listingNaam, setListingNaam] = useState("");
  const [voornaam, setVoornaam] = useState("");
  const [taal, setTaal] = useState("nl");
  const [hpLaden, setHpLaden] = useState(false);
  const [hpFout, setHpFout] = useState<string | null>(null);

  const controleerLidmaatschap = async () => {
    if (!email.includes("@")) return;
    setLaden(true);
    setFout(null);
    try {
      const res = await fetch("/api/community/verifieer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (!data.ok) {
        setFout(data.verlopen
          ? "Jouw toegang is verlopen. Neem contact op voor verlenging."
          : "Dit e-mailadres staat niet geregistreerd als lid. Controleer het adres of neem contact op.");
        setLaden(false);
        return;
      }

      setToken(data.token);
      setTag(data.tag || "");
      setFase("tools");
    } catch (err: any) {
      setFout(err?.message || "Verificatie mislukt. Probeer het opnieuw.");
    }
    setLaden(false);
  };

  const startLO = async () => {
    setLaden(true);
    try {
      const res = await fetch("/api/community/start-lo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = `/analyseer/${data.sessieId}`;
    } catch {
      setFout("Kon Listing Optimizer niet starten. Probeer opnieuw.");
      setLaden(false);
    }
  };

  const startHP = async () => {
    if (!airbnbUrl.includes("airbnb.")) return;
    setHpLaden(true);
    setHpFout(null);
    try {
      const res = await fetch("/api/community/start-hp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, airbnb_url: airbnbUrl.trim(), listing_naam: listingNaam.trim() || null, voornaam: voornaam.trim() || null, taal }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = `/host-performance/rapport-genereren/${data.abonnementId}?stripe_sid=${encodeURIComponent(data.token)}`;
    } catch (err: any) {
      setHpFout(err?.message || "Er ging iets mis. Probeer opnieuw.");
    }
    setHpLaden(false);
  };

  if (fase === "email") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <BoniAvatar size={80} className="mx-auto mb-4" />
            <h1 className="font-display text-3xl text-primary mb-2">Leden Portal</h1>
            <p className="text-text-secondary">Vul je e-mailadres in om gratis toegang te krijgen tot alle tools.</p>
          </div>

          <div className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">E-mailadres</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && controleerLidmaatschap()}
                placeholder="jij@voorbeeld.nl"
                className="input"
                autoFocus
              />
            </div>

            {fout && (
              <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
                {fout}
              </div>
            )}

            <button
              onClick={controleerLidmaatschap}
              disabled={!email.includes("@") || laden}
              className={`btn-primary w-full flex items-center justify-center gap-2 ${!email.includes("@") || laden ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              {laden ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Controleren...
                </>
              ) : "Toegang controleren →"}
            </button>

            <p className="text-xs text-text-secondary text-center">
              Geen lid?{" "}
              <a href="/" className="text-accent hover:underline">Betaal en gebruik de tools →</a>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (fase === "tools") {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <BoniAvatar size={80} className="mx-auto mb-4" />
            <h1 className="font-display text-3xl text-primary mb-1">Welkom terug!</h1>
            <p className="text-text-secondary text-sm">{email}</p>
            {tag && (
              <span className="inline-block mt-2 text-xs font-semibold bg-accent/10 text-accent px-3 py-1 rounded-full">
                {tag}
              </span>
            )}
            <p className="text-success font-semibold mt-3">Gratis toegang tot alle tools</p>
          </div>

          {fout && (
            <div className="mb-4 bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
              {fout}
            </div>
          )}

          <div className="grid gap-4">
            {/* Listing Optimizer */}
            <div className="card p-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-primary">Listing Optimizer</h2>
                <p className="text-text-secondary text-sm mt-1">AI-analyse van jouw Airbnb advertentie met verbeterpunten en een score.</p>
              </div>
              <button
                onClick={startLO}
                disabled={laden}
                className={`btn-primary shrink-0 ${laden ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {laden ? "Starten..." : "Starten →"}
              </button>
            </div>

            {/* Host Performance Audit */}
            <div className="card p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl text-primary">Host Performance Audit</h2>
                  <p className="text-text-secondary text-sm mt-1">Review-analyse van jouw woning — complimenten, klachten en verbeterpunten.</p>
                </div>
                {!toonHpForm && (
                  <button onClick={() => setToonHpForm(true)} className="btn-primary shrink-0">
                    Aanmelden →
                  </button>
                )}
              </div>

              {toonHpForm && (
                <div className="space-y-3 border-t border-border pt-4">
                  <input
                    type="url"
                    value={airbnbUrl}
                    onChange={(e) => setAirbnbUrl(e.target.value)}
                    placeholder="Airbnb URL (verplicht)"
                    className={`input ${airbnbUrl && !airbnbUrl.includes("airbnb.") ? "border-danger" : ""}`}
                  />
                  <input
                    type="text"
                    value={listingNaam}
                    onChange={(e) => setListingNaam(e.target.value)}
                    placeholder="Naam van de woning (optioneel)"
                    className="input"
                  />
                  <input
                    type="text"
                    value={voornaam}
                    onChange={(e) => setVoornaam(e.target.value)}
                    placeholder="Jouw voornaam (optioneel)"
                    className="input"
                  />
                  <div className="flex gap-3">
                    {[{ waarde: "nl", label: "🇳🇱 Nederlands" }, { waarde: "en", label: "🇬🇧 English" }].map((optie) => (
                      <label key={optie.waarde} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${taal === optie.waarde ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/50"}`}>
                        <input type="radio" name="taal" value={optie.waarde} checked={taal === optie.waarde} onChange={() => setTaal(optie.waarde)} className="sr-only" />
                        {optie.label}
                      </label>
                    ))}
                  </div>
                  {hpFout && (
                    <p className="text-danger text-sm">{hpFout}</p>
                  )}
                  <button
                    onClick={startHP}
                    disabled={!airbnbUrl.includes("airbnb.") || hpLaden}
                    className={`btn-primary w-full ${!airbnbUrl.includes("airbnb.") || hpLaden ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    {hpLaden ? "Rapport genereren..." : "Rapport genereren →"}
                  </button>
                </div>
              )}
            </div>

            {/* Foto Optimizer */}
            <div className="card p-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="font-display text-xl text-primary">Photo Optimizer</h2>
                <p className="text-text-secondary text-sm mt-1">AI-bewerking van jouw advertentie foto&apos;s naar 5-sterren kwaliteit.</p>
              </div>
              <a
                href={`/photo-optimizer/starten?community_token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`}
                className="btn-primary shrink-0"
              >
                Starten →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
