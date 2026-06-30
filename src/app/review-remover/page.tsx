"use client";

import { useState } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";
import { CopyButton } from "@/components/CopyButton";
import { createClient } from "@/lib/supabase/client";

const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 5;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const MAX_SCREENSHOTS = 5;

interface ScreenshotItem {
  id: string;
  bestand: File;
  preview: string;
  fout: string | null;
}

interface Resultaat {
  id: string;
  verdict: "laag" | "gemiddeld" | "hoog";
  onderbouwing: string;
  toegepaste_regels: string[];
  bezwaarbrief: string;
  stappenplan: string[];
}

export default function ReviewRemoverPage() {
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [taal, setTaal] = useState("nl");
  const [reviewTekst, setReviewTekst] = useState("");
  const [sterren, setSterren] = useState<number | null>(null);
  const [context, setContext] = useState("");
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([]);
  const [laden, setLaden] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);
  const [emailVerzonden, setEmailVerzonden] = useState(false);
  const [emailVerzendBezig, setEmailVerzendBezig] = useState(false);

  const geldigeScreenshots = screenshots.filter((s) => !s.fout);
  const kanAnalyseren =
    naam.trim().length > 0 &&
    email.trim().includes("@") &&
    reviewTekst.trim().length > 0 &&
    sterren !== null &&
    !laden;

  const voegToe = (bestanden: File[]) => {
    const ruimte = MAX_SCREENSHOTS - screenshots.length;
    const items: ScreenshotItem[] = bestanden.slice(0, Math.max(ruimte, 0)).map((b) => ({
      id: crypto.randomUUID(),
      bestand: b,
      preview: URL.createObjectURL(b),
      fout: !TOEGESTANE_TYPES.includes(b.type)
        ? "Ongeldig type — gebruik JPEG, PNG of WEBP"
        : b.size > MAX_BYTES
          ? `Te groot — max ${MAX_MB} MB`
          : null,
    }));
    setScreenshots((prev) => [...prev, ...items]);
  };

  const verwijder = (id: string) => {
    setScreenshots((prev) => {
      const item = prev.find((s) => s.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter((s) => s.id !== id);
    });
  };

  const analyseer = async () => {
    if (!kanAnalyseren || sterren === null) return;
    setLaden(true);
    setFout(null);
    setResultaat(null);
    setEmailVerzonden(false);

    try {
      let screenshotPaden: string[] = [];

      if (geldigeScreenshots.length > 0) {
        const uploadUrlsRes = await fetch("/api/review-remover/upload-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            screenshots: geldigeScreenshots.map((s, i) => ({ volgnummer: i + 1, type: s.bestand.type })),
          }),
        });
        if (!uploadUrlsRes.ok) throw new Error("Upload voorbereiden mislukt");
        const { uploadTokens } = await uploadUrlsRes.json();

        const supabase = createClient();
        await Promise.all(
          uploadTokens.map(async (t: { volgnummer: number; pad: string; token: string }) => {
            const item = geldigeScreenshots[t.volgnummer - 1];
            const { error } = await supabase.storage
              .from("review-remover-bewijs")
              .uploadToSignedUrl(t.pad, t.token, item.bestand, { contentType: item.bestand.type });
            if (error) throw new Error(`Screenshot uploaden mislukt: ${error.message}`);
          })
        );
        screenshotPaden = uploadTokens.map((t: { pad: string }) => t.pad);
      }

      const res = await fetch("/api/review-remover/analyseer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: naam.trim(),
          email: email.trim(),
          taal,
          reviewTekst: reviewTekst.trim(),
          sterren,
          context: context.trim() || undefined,
          screenshotPaden,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "API fout");
      }
      const data: Resultaat = await res.json();
      setResultaat(data);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis. Probeer het zo opnieuw.");
    } finally {
      setLaden(false);
    }
  };

  const stuurEmail = async () => {
    if (!resultaat) return;
    setEmailVerzendBezig(true);
    try {
      const res = await fetch("/api/review-remover/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: resultaat.id }),
      });
      if (res.ok) setEmailVerzonden(true);
    } finally {
      setEmailVerzendBezig(false);
    }
  };

  const verdictLabel =
    resultaat?.verdict === "hoog" ? "Hoge kans op verwijdering" :
    resultaat?.verdict === "gemiddeld" ? "Gemiddelde kans op verwijdering" :
    "Lage kans op verwijdering";

  const verdictKleur =
    resultaat?.verdict === "hoog" ? "text-success bg-success/10 border-success/20" :
    resultaat?.verdict === "gemiddeld" ? "text-warning bg-warning/10 border-warning/20" :
    "text-danger bg-danger/10 border-danger/20";

  return (
    <div className="section">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-8">
          <BoniAvatar size={80} animate={false} src="/Boni-rechter.png" className="flex-shrink-0" />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-primary leading-tight">
              Review Remover — check of je een recensie kunt laten verwijderen
            </h1>
            <p className="text-text-secondary mt-1">
              Plak de recensie, geef context en eventueel bewijs. Gratis, geen account nodig.
            </p>
          </div>
        </div>

        <div className="card p-6 sm:p-8 mb-6 space-y-5">
          {/* Naam + email */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                Voornaam <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={naam}
                onChange={(e) => setNaam(e.target.value)}
                placeholder="Jouw voornaam"
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
            </div>
          </div>

          {/* Review tekst */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">
              De recensie <span className="text-accent">*</span>
            </label>
            <textarea
              value={reviewTekst}
              onChange={(e) => setReviewTekst(e.target.value)}
              placeholder="Plak hier de volledige tekst van de recensie..."
              rows={5}
              className="input"
              disabled={laden}
            />
          </div>

          {/* Sterren */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Hoeveel sterren gaf de gast? <span className="text-accent">*</span>
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSterren(n)}
                  disabled={laden}
                  className={`w-12 h-12 rounded-xl border text-lg font-semibold transition-colors ${
                    sterren === n ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/50"
                  }`}
                >
                  {n}★
                </button>
              ))}
            </div>
          </div>

          {/* Context */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">Context (optioneel)</label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Wat is er volgens jou gebeurd? Eventuele relevante details..."
              rows={3}
              className="input"
              disabled={laden}
            />
          </div>

          {/* Screenshots */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">
              Bewijs-screenshots (optioneel, max {MAX_SCREENSHOTS})
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => e.target.files && voegToe(Array.from(e.target.files))}
              disabled={laden || screenshots.length >= MAX_SCREENSHOTS}
              className="text-sm"
            />
            {screenshots.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-3">
                {screenshots.map((s) => (
                  <div key={s.id} className="relative">
                    <img src={s.preview} alt="" className="w-full aspect-square object-cover rounded-lg" />
                    {s.fout && <p className="text-xs text-danger mt-1">{s.fout}</p>}
                    <button
                      type="button"
                      onClick={() => verwijder(s.id)}
                      className="absolute -top-2 -right-2 bg-danger text-white w-6 h-6 rounded-full text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Taal */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">Taal van de bezwaarbrief</label>
            <div className="flex gap-3">
              {[{ waarde: "nl", label: "🇳🇱 Nederlands" }, { waarde: "en", label: "🇬🇧 English" }].map((optie) => (
                <label key={optie.waarde} className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer text-sm font-medium transition-colors ${taal === optie.waarde ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary hover:border-accent/50"}`}>
                  <input type="radio" name="taal" value={optie.waarde} checked={taal === optie.waarde} onChange={() => setTaal(optie.waarde)} className="sr-only" />
                  {optie.label}
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={analyseer}
            disabled={!kanAnalyseren}
            className={`btn-primary w-full ${!kanAnalyseren ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {laden ? "Boni beoordeelt..." : "Beoordeel mijn recensie →"}
          </button>
        </div>

        {fout && (
          <div className="card p-5 border-danger/30 bg-danger/5 flex items-start gap-3 mb-6">
            <BoniAvatar size={40} src="/Boni-rechter.png" className="flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-danger mb-1">Boni kon de recensie niet beoordelen</p>
              <p className="text-text-secondary text-sm">{fout}</p>
            </div>
          </div>
        )}

        {resultaat && (
          <div className="flex flex-col gap-5">
            <div className="card p-6 sm:p-8">
              <div className={`inline-flex items-center px-4 py-2 rounded-xl border font-semibold text-sm mb-4 ${verdictKleur}`}>
                {verdictLabel}
              </div>
              <p className="text-primary leading-relaxed mb-4">{resultaat.onderbouwing}</p>
              {resultaat.toegepaste_regels.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {resultaat.toegepaste_regels.map((regel) => (
                    <span key={regel} className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                      {regel}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-display text-xl font-bold text-primary">Jouw bezwaarbrief</h2>
                <CopyButton tekst={resultaat.bezwaarbrief} />
              </div>
              <p className="text-text-secondary text-sm whitespace-pre-wrap bg-primary/5 rounded-xl p-4">
                {resultaat.bezwaarbrief}
              </p>
            </div>

            <div className="card p-6 sm:p-8">
              <h2 className="font-display text-xl font-bold text-primary mb-3">Stappenplan</h2>
              <ol className="space-y-2">
                {resultaat.stappenplan.map((stap, i) => (
                  <li key={i} className="flex items-start gap-2 text-text-secondary text-sm">
                    <span className="text-accent font-bold mt-0.5 flex-shrink-0">{i + 1}.</span>
                    {stap}
                  </li>
                ))}
              </ol>
            </div>

            <div className="card p-6 sm:p-8 text-center">
              {emailVerzonden ? (
                <p className="text-success font-semibold">✅ Verstuurd naar {email}</p>
              ) : (
                <button onClick={stuurEmail} disabled={emailVerzendBezig} className="btn-secondary">
                  {emailVerzendBezig ? "Versturen..." : "Stuur naar mijn e-mail"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
