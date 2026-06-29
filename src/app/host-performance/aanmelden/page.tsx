"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";

function AanmeldenForm() {
  const searchParams = useSearchParams();
  const isOto = searchParams.get("oto") === "true";

  const [voornaam, setVoornaam] = useState("");
  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [listingNaam, setListingNaam] = useState("");
  const [email, setEmail] = useState("");
  const [taal, setTaal] = useState("nl");
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const geldigeUrl = airbnbUrl.trim().includes("airbnb.");
  const geldigEmail = email.trim().includes("@");
  const geldig = geldigeUrl && geldigEmail;

  const naarBetaling = async () => {
    if (!geldig) return;
    setLaden(true);
    setFout(null);

    try {
      const endpoint = isOto ? "/api/stripe/checkout-hp-oto" : "/api/stripe/checkout-hp";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          airbnb_url: airbnbUrl.trim(),
          listing_naam: listingNaam.trim() || null,
          voornaam: voornaam.trim() || null,
          email: email.trim(),
          taal,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error || "Er ging iets mis. Probeer het opnieuw.");
        setLaden(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setFout("Er ging iets mis. Probeer het opnieuw.");
      setLaden(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <BoniAvatar size={70} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl text-primary mb-2">Host Performance Audit</h1>
          <p className="text-text-secondary">Vul je gegevens in en betaal — je rapport staat daarna direct klaar.</p>
          {isOto ? (
            <>
              <div className="mt-1 inline-flex items-center gap-2">
                <span className="text-text-secondary line-through text-sm">€7,99</span>
                <span className="text-accent font-bold text-xl">€4,99</span>
                <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">Eenmalig aanbod</span>
              </div>
              <p className="text-xs text-warning mt-2">
                ⚠️ Dit aanbod vervalt zodra je deze pagina verlaat.
              </p>
            </>
          ) : (
            <p className="text-accent font-semibold mt-1">€7,99 — eenmalig</p>
          )}
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

          {/* Stap 2 — Jouw gegevens */}
          <div className="space-y-3">
            <h2 className="font-semibold text-primary flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center font-bold">2</span>
              Jouw gegevens
            </h2>
            <input
              type="text"
              value={voornaam}
              onChange={(e) => setVoornaam(e.target.value)}
              placeholder="Voornaam (optioneel)"
              className="input"
            />
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="input"
              />
              <p className="text-xs text-text-secondary mt-1">
                Je rapport en login-link worden naar dit adres gestuurd.
              </p>
            </div>
          </div>

          {/* Taal */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">Rapporttaal</label>
            <div className="flex gap-3">
              {[{ waarde: "nl", label: "🇳🇱 Nederlands" }, { waarde: "en", label: "🇬🇧 English" }].map((optie) => (
                <label key={optie.waarde} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${taal === optie.waarde ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/50"}`}>
                  <input type="radio" name="taal" value={optie.waarde} checked={taal === optie.waarde} onChange={() => setTaal(optie.waarde)} className="sr-only" />
                  {optie.label}
                </label>
              ))}
            </div>
          </div>

          {fout && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
              {fout}
            </div>
          )}

          <button
            onClick={naarBetaling}
            disabled={!geldig || laden}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${!geldig || laden ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {laden ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Bezig...
              </>
            ) : isOto ? "Betalen en rapport genereren — €4,99 →" : "Betalen en rapport genereren — €7,99 →"}
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
