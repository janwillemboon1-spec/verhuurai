"use client";

import { useState } from "react";
import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";
import { CopyButton } from "@/components/CopyButton";

interface HerschrevenVersie {
  versie: string;
  tekens?: number;
  uitleg: string;
}

interface AnalyseResultaat {
  score: number;
  oordeel: string;
  analyse: string;
  verbeterpunten: string[];
  herschreven_versies: HerschrevenVersie[];
  conclusie: string;
}

export default function GratisPage() {
  const [titel, setTitel] = useState("");
  const [airbnbUrl, setAirbnbUrl] = useState("");
  const [recensies, setRecensies] = useState("");
  const [toonExtra, setToonExtra] = useState(false);
  const [laden, setLaden] = useState(false);
  const [resultaat, setResultaat] = useState<AnalyseResultaat | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeFout, setScrapeFout] = useState<string | null>(null);
  const [scrapeSucces, setScrapeSucces] = useState<number | null>(null);

  const titelTeLang = titel.length > 50;
  const kanAnalyseren = titel.trim().length > 0 && !titelTeLang && !laden;

  const haalReviewsOp = async () => {
    if (!airbnbUrl.trim()) return;
    setScraping(true);
    setScrapeFout(null);
    setScrapeSucces(null);
    try {
      const res = await fetch("/api/scrape-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: airbnbUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setScrapeFout(data.error || "Kon reviews niet ophalen. Plak ze handmatig hieronder.");
        return;
      }
      setRecensies(data.recensies);
      setScrapeSucces(data.aantalReviews);
    } catch {
      setScrapeFout("Verbindingsfout. Plak de reviews handmatig hieronder.");
    } finally {
      setScraping(false);
    }
  };

  const analyseer = async () => {
    setLaden(true);
    setFout(null);
    setResultaat(null);

    try {
      const res = await fetch("/api/gratis-analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titel,
          airbnbUrl: airbnbUrl.trim() || undefined,
          recensies: recensies.trim() || undefined,
        }),
      });

      if (!res.ok) throw new Error("API fout");
      const data: AnalyseResultaat = await res.json();
      setResultaat(data);
    } catch {
      setFout("Er ging iets mis. Boni heeft even een moment nodig. Probeer het zo opnieuw.");
    } finally {
      setLaden(false);
    }
  };

  const scoreKleur =
    resultaat && resultaat.score >= 8
      ? "text-success"
      : resultaat && resultaat.score >= 5
      ? "text-warning"
      : "text-danger";

  const scoreBg =
    resultaat && resultaat.score >= 8
      ? "bg-success/10 border-success/20"
      : resultaat && resultaat.score >= 5
      ? "bg-warning/10 border-warning/20"
      : "bg-danger/10 border-danger/20";

  return (
    <div className="section">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-8">
          <BoniAvatar size={80} animate={false} className="flex-shrink-0" />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary leading-tight">
              Test Boni gratis uit — analyseer je titel
            </h1>
            <p className="text-text-secondary mt-1">
              Geen account nodig. Geen betaling. Gewoon eerlijk advies van Boni.
            </p>
          </div>
        </div>

        <div className="card p-6 sm:p-8 mb-6 space-y-5">
          {/* Titel */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="titel-input" className="font-semibold text-primary block">
                Jouw advertentietitel <span className="text-accent">*</span>
              </label>
              <span
                className={`text-sm font-mono font-medium transition-colors duration-200 ${
                  titelTeLang ? "text-danger" : titel.length >= 40 ? "text-warning" : "text-text-secondary"
                }`}
              >
                {titel.length}/50
              </span>
            </div>
            <input
              id="titel-input"
              type="text"
              value={titel}
              onChange={(e) => setTitel(e.target.value)}
              placeholder="Bijv. Zwembad • Zeezicht • 5 min van Centrum"
              className={`input ${titelTeLang ? "border-danger/50 focus:ring-danger/30 focus:border-danger/50" : ""}`}
              disabled={laden}
            />
            {titelTeLang && (
              <p className="text-danger text-sm mt-1.5">
                ⚠️ Je titel is te lang — maximaal 50 tekens.
              </p>
            )}
          </div>

          {/* Extra context toggle */}
          <button
            type="button"
            onClick={() => setToonExtra(!toonExtra)}
            className="flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-primary transition-colors"
          >
            <span className={`transition-transform duration-200 ${toonExtra ? "rotate-90" : ""}`}>▶</span>
            {toonExtra ? "Minder opties verbergen" : "Extra context toevoegen voor betere analyse (optioneel)"}
          </button>

          {toonExtra && (
            <div className="space-y-4 border-t border-border pt-4">
              {/* Airbnb URL */}
              <div>
                <label htmlFor="url-input" className="block text-sm font-semibold text-primary mb-1.5">
                  Airbnb advertentie URL
                </label>
                <input
                  id="url-input"
                  type="url"
                  value={airbnbUrl}
                  onChange={(e) => setAirbnbUrl(e.target.value)}
                  placeholder="https://www.airbnb.nl/rooms/12345678"
                  className="input"
                  disabled={laden}
                />
                <p className="text-xs text-text-secondary mt-1">
                  Helpt Boni je woning beter te begrijpen voor titeladvies.
                </p>
                {airbnbUrl.trim() && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={haalReviewsOp}
                      disabled={scraping || laden}
                      className={`btn-secondary w-full flex items-center justify-center gap-2 ${scraping ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      {scraping ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                          </svg>
                          Reviews ophalen... (ca. 60 sec)
                        </>
                      ) : (
                        "⬇️ Reviews ophalen via Airbnb"
                      )}
                    </button>
                    {scrapeSucces !== null && (
                      <p className="text-xs text-success font-medium mt-2">
                        ✅ {scrapeSucces} reviews opgehaald
                      </p>
                    )}
                    {scrapeFout && (
                      <p className="text-xs text-warning font-medium mt-2">
                        ⚠️ {scrapeFout}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Reviews */}
              <div>
                <label htmlFor="recensies-input" className="block text-sm font-semibold text-primary mb-1.5">
                  Plak hier je beste reviews
                </label>
                <textarea
                  id="recensies-input"
                  value={recensies}
                  onChange={(e) => setRecensies(e.target.value)}
                  rows={6}
                  placeholder="Plak hier je gastrecenties zodat Boni ziet wat gasten waarderen. Hoe meer reviews, hoe beter het advies over welke kenmerken in jouw titel moeten."
                  className="textarea"
                  disabled={laden}
                />
                <p className="text-xs text-text-secondary mt-1">
                  Boni gebruikt de meest genoemde positieve punten als inspiratie voor je titelkenmerken.
                </p>
              </div>
            </div>
          )}

          {/* Knop */}
          <button
            onClick={analyseer}
            disabled={!kanAnalyseren}
            className={`btn-primary w-full flex items-center justify-center gap-2 ${
              !kanAnalyseren ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {laden ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Boni analyseert...
              </>
            ) : (
              "Analyseer mijn titel →"
            )}
          </button>
        </div>

        {/* Foutmelding */}
        {fout && (
          <div className="card p-5 border-danger/30 bg-danger/5 flex items-start gap-3 mb-6">
            <BoniAvatar size={40} className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger mb-1">Boni kon je titel niet analyseren</p>
              <p className="text-text-secondary text-sm">{fout}</p>
            </div>
          </div>
        )}

        {/* Resultaat */}
        {resultaat && (
          <div className="flex flex-col gap-5">
            {/* Score + analyse */}
            <div className="card p-6 sm:p-8">
              <div className="flex items-start gap-4 mb-6">
                <BoniAvatar size={56} className="flex-shrink-0" />
                <div className="flex-1">
                  <h2 className="font-display text-xl font-bold text-primary mb-2">Boni&apos;s oordeel</h2>
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${scoreBg}`}>
                    <span className={`font-mono text-3xl font-bold ${scoreKleur}`}>
                      {resultaat.score}
                    </span>
                    <span className="text-text-secondary font-medium">/10</span>
                    <span className={`text-sm font-semibold capitalize ${scoreKleur}`}>
                      — {resultaat.oordeel}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-primary/5 rounded-xl p-4 mb-5">
                <p className="text-primary leading-relaxed">{resultaat.analyse}</p>
              </div>

              {resultaat.verbeterpunten?.length > 0 && (
                <div className="mb-4">
                  <h3 className="font-semibold text-primary mb-3">Verbeterpunten</h3>
                  <ul className="flex flex-col gap-2">
                    {resultaat.verbeterpunten.map((punt, i) => (
                      <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                        <span className="text-accent font-bold mt-0.5 flex-shrink-0">→</span>
                        {punt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {resultaat.conclusie && (
                <p className="text-text-secondary text-sm italic border-t border-border pt-4">
                  {resultaat.conclusie}
                </p>
              )}
            </div>

            {/* Herschreven versies */}
            {resultaat.herschreven_versies?.length > 0 && (
              <div className="card p-6 sm:p-8">
                <h2 className="font-display text-xl font-bold text-primary mb-5">
                  Herschreven versies van Boni
                </h2>
                <div className="flex flex-col gap-4">
                  {resultaat.herschreven_versies.map(({ versie, tekens, uitleg }, i) => (
                    <div key={i} className="border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div>
                          <p className="font-semibold text-primary">{versie}</p>
                          {tekens && (
                            <span className="text-xs font-mono text-text-secondary">{tekens} tekens</span>
                          )}
                        </div>
                        <CopyButton tekst={versie} className="flex-shrink-0" />
                      </div>
                      <p className="text-text-secondary text-sm">{uitleg}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA */}
            <div className="card p-6 sm:p-8 border-accent/40 bg-accent/5">
              <div className="flex items-start gap-4">
                <span className="text-3xl flex-shrink-0">🚀</span>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-bold text-primary mb-2">
                    Wil je je volledige advertentie laten analyseren?
                  </h3>
                  <p className="text-text-secondary mb-4">
                    Boni bekijkt alle 12 onderdelen — beschrijving, foto&apos;s, recensies, host profiel — voor slechts{" "}
                    <strong className="text-primary">€9,40</strong>.
                  </p>
                  <Link href="/starten" className="btn-primary inline-flex">
                    Bekijk pakketten →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {!resultaat && !laden && !fout && (
          <div className="card p-6 border-dashed text-center">
            <p className="text-text-secondary text-sm">
              Vul je advertentietitel in en klik op &quot;Analyseer mijn titel&quot; om te beginnen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
