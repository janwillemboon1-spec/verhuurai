"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { BoniAvatar } from "@/components/BoniAvatar";
import { createClient } from "@/lib/supabase/client";
import { berekenPrijs, FOTO_MAX } from "@/lib/foto-optimizer/pricing";

const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_MB = 20;
const MAX_BYTES = MAX_MB * 1024 * 1024;

interface FotoItem {
  id: string;
  bestand: File;
  preview: string;
  fout: string | null;
}

function FotoOptimizerInhoud() {
  const searchParams = useSearchParams();
  const communityToken = searchParams.get("community_token") || "";
  const communityEmail = searchParams.get("email") || "";

  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState(communityEmail);
  const [fotos, setFotos] = useState<FotoItem[]>([]);
  const [uploaden, setUploaden] = useState(false);
  const [voortgang, setVoortgang] = useState(0);
  const [fout, setFout] = useState<string | null>(null);
  const [sleepActief, setSleepActief] = useState(false);
  const invoerRef = useRef<HTMLInputElement>(null);

  const geldigeFotos = fotos.filter(f => !f.fout);
  const ongeldige = fotos.filter(f => f.fout);
  const prijs = geldigeFotos.length > 0 ? berekenPrijs(geldigeFotos.length) : null;
  const teVeel = geldigeFotos.length > FOTO_MAX;
  const formulierGeldig =
    naam.trim().length >= 2 &&
    email.includes("@") &&
    geldigeFotos.length >= 1 &&
    !teVeel &&
    !uploaden;

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => fotos.forEach(f => URL.revokeObjectURL(f.preview));
  }, []);

  const voegToe = useCallback((bestanden: File[]) => {
    const items: FotoItem[] = bestanden.map(b => ({
      id: crypto.randomUUID(),
      bestand: b,
      preview: URL.createObjectURL(b),
      fout: !TOEGESTANE_TYPES.includes(b.type)
        ? "Ongeldig type — gebruik JPEG, PNG of WEBP"
        : b.size > MAX_BYTES
          ? `Te groot — max ${MAX_MB} MB`
          : null,
    }));
    setFotos(prev => [...prev, ...items]);
  }, []);

  const verwijder = (id: string) => {
    setFotos(prev => {
      const item = prev.find(f => f.id === id);
      if (item) URL.revokeObjectURL(item.preview);
      return prev.filter(f => f.id !== id);
    });
  };

  const betaal = async () => {
    if (!formulierGeldig) return;
    setUploaden(true);
    setVoortgang(0);
    setFout(null);

    try {
      const fotoMeta = geldigeFotos.map((f, i) => ({
        volgnummer: i + 1,
        bestandsnaam: f.bestand.name,
        type: f.bestand.type,
      }));

      // Stap 1: sessie + signed upload URLs aanmaken
      const startRes = await fetch("/api/foto-optimizer/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ naam: naam.trim(), email: email.trim(), fotos: fotoMeta }),
      });
      if (!startRes.ok) {
        const body = await startRes.json().catch(() => ({}));
        throw new Error(`Stap 1 mislukt (${startRes.status}): ${body?.error || "onbekend"}`);
      }
      const { sessieId, uploadTokens } = await startRes.json();

      // Stap 2: foto's uploaden naar Supabase Storage (3 tegelijk)
      const supabase = createClient();
      let klaar = 0;

      for (let i = 0; i < uploadTokens.length; i += 3) {
        const batch = uploadTokens.slice(i, i + 3);
        await Promise.all(
          batch.map(async (t: { volgnummer: number; pad: string; token: string }) => {
            const foto = geldigeFotos[t.volgnummer - 1];
            const { error } = await supabase.storage
              .from("foto-originelen")
              .uploadToSignedUrl(t.pad, t.token, foto.bestand, {
                contentType: foto.bestand.type,
              });
            if (error) throw new Error(`Stap 2 mislukt (foto ${t.volgnummer}): ${error.message}`);
            klaar++;
            setVoortgang(Math.round((klaar / geldigeFotos.length) * 100));
          })
        );
      }

      // Stap 3: Stripe sessie aanmaken (nu foto's veilig zijn opgeslagen)
      const stripeRes = await fetch("/api/foto-optimizer/naar-stripe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessieId, community_token: communityToken || undefined }),
      });
      if (!stripeRes.ok) {
        const body = await stripeRes.json().catch(() => ({}));
        throw new Error(`Stap 3 mislukt (${stripeRes.status}): ${body?.error || "onbekend"}`);
      }
      const { stripeUrl } = await stripeRes.json();

      window.location.href = stripeUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      console.error("Foto Optimizer fout:", msg);
      setFout(`Er ging iets mis: ${msg}`);
      setUploaden(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <BoniAvatar size={80} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl md:text-4xl text-primary mb-3">
            Foto Optimizer
          </h1>
          <p className="text-text-secondary max-w-lg mx-auto leading-relaxed">
            Upload jouw advertentie foto&apos;s. Boni verbetert ze naar 5-sterren kwaliteit.
          </p>
        </div>

        {/* Wat wordt verbeterd */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6 text-center">
          {[
            { icon: "💡", label: "Helderheid" },
            { icon: "🔍", label: "Scherpte" },
            { icon: "⚖️", label: "Witbalans" },
            { icon: "✨", label: "Duidelijkheid" },
          ].map(item => (
            <div key={item.label} className="bg-surface border border-border rounded-xl py-3 px-2">
              <div className="text-xl mb-1">{item.icon}</div>
              <div className="text-xs font-medium text-text-secondary">{item.label}</div>
            </div>
          ))}
        </div>


        <div className="card p-6 md:p-8 space-y-6">

          {/* Naam + email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                Voornaam <span className="text-accent">*</span>
              </label>
              <input
                type="text"
                value={naam}
                onChange={e => setNaam(e.target.value)}
                placeholder="Bijv. Sophie"
                className="input"
                disabled={uploaden}
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
                onChange={e => setEmail(e.target.value)}
                placeholder="jij@voorbeeld.nl"
                className="input"
                disabled={uploaden}
              />
            </div>
          </div>

          {/* Upload zone */}
          <div>
            <label className="block text-sm font-semibold text-primary mb-2">
              Foto's <span className="text-accent">*</span>
              <span className="text-text-secondary font-normal ml-2 text-xs">
                max {FOTO_MAX} foto's · max {MAX_MB} MB · JPEG / PNG / WEBP
              </span>
            </label>

            <div
              onDragOver={e => { e.preventDefault(); setSleepActief(true); }}
              onDragLeave={() => setSleepActief(false)}
              onDrop={e => {
                e.preventDefault();
                setSleepActief(false);
                voegToe(Array.from(e.dataTransfer.files));
              }}
              onClick={() => !uploaden && invoerRef.current?.click()}
              className={`
                border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
                ${uploaden ? "pointer-events-none opacity-50" : "cursor-pointer"}
                ${sleepActief
                  ? "border-accent bg-accent/5 scale-[1.01]"
                  : "border-border hover:border-primary/40 hover:bg-primary/[0.02]"}
              `}
            >
              <input
                ref={invoerRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={e => e.target.files && voegToe(Array.from(e.target.files))}
              />
              <div className="text-4xl mb-2">📷</div>
              <p className="font-semibold text-primary">Sleep foto's hiernaartoe</p>
              <p className="text-text-secondary text-sm mt-1">of klik om te bladeren</p>
            </div>

            {/* Thumbnails */}
            {fotos.length > 0 && (
              <div className="mt-4 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                {fotos.map(foto => (
                  <div key={foto.id} className="relative group aspect-square">
                    <img
                      src={foto.preview}
                      alt=""
                      className={`w-full h-full object-cover rounded-lg ${
                        foto.fout ? "opacity-30 grayscale" : ""
                      }`}
                    />
                    {foto.fout && (
                      <div className="absolute inset-0 flex items-end p-1">
                        <span className="w-full text-[9px] text-danger font-bold bg-white/95 rounded px-1 py-0.5 leading-tight text-center">
                          {foto.fout.split(" — ")[0]}
                        </span>
                      </div>
                    )}
                    {!uploaden && (
                      <button
                        onClick={e => { e.stopPropagation(); verwijder(foto.id); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-danger text-white rounded-full text-xs font-bold leading-none items-center justify-center hidden group-hover:flex shadow-sm"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {/* Meer toevoegen knop */}
                {!uploaden && geldigeFotos.length < FOTO_MAX && (
                  <button
                    onClick={() => invoerRef.current?.click()}
                    className="aspect-square border-2 border-dashed border-border rounded-lg flex items-center justify-center text-text-secondary hover:border-primary/40 hover:text-primary transition-colors text-2xl"
                  >
                    +
                  </button>
                )}
              </div>
            )}

            {/* Teller + meldingen */}
            <div className="mt-2 space-y-1">
              {geldigeFotos.length > 0 && (
                <p className={`text-xs ${teVeel ? "text-danger font-semibold" : "text-text-secondary"}`}>
                  {geldigeFotos.length} {geldigeFotos.length === 1 ? "foto" : "foto's"} geselecteerd
                  {teVeel && ` — verwijder ${geldigeFotos.length - FOTO_MAX} foto${geldigeFotos.length - FOTO_MAX > 1 ? "'s" : ""}`}
                </p>
              )}
              {ongeldige.length > 0 && (
                <p className="text-xs text-warning">
                  {ongeldige.length} {ongeldige.length === 1 ? "foto" : "foto's"} overgeslagen (ongeldig type of te groot)
                </p>
              )}
            </div>
          </div>

          {/* Prijsoverzicht */}
          {prijs && !teVeel && (
            <div className="bg-primary/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-primary text-sm">
                  Totaal — {geldigeFotos.length} foto{geldigeFotos.length !== 1 ? "'s" : ""}
                </span>
                <span className="text-2xl font-bold text-primary">
                  €{prijs.totaal.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <p className="text-xs text-text-secondary">
                Gem. €{prijs.gemiddeldPerFoto.toFixed(2).replace(".", ",")} per foto
              </p>
              {prijs.schijfDetails.length > 1 && (
                <div className="border-t border-border/50 pt-2 space-y-0.5">
                  {prijs.schijfDetails.map(s => (
                    <div key={s.label} className="flex justify-between text-xs text-text-secondary">
                      <span>{s.label} ({s.aantal} × €{s.prijs.toFixed(2).replace(".", ",")})</span>
                      <span>€{s.subtotaal.toFixed(2).replace(".", ",")}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Upload voortgang */}
          {uploaden && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-primary">
                  {voortgang < 100
                    ? `📤 Foto's uploaden...`
                    : "✓ Upload klaar — doorsturen naar betaling..."}
                </span>
                <span className="text-text-secondary">{voortgang}%</span>
              </div>
              <div className="h-2.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-300"
                  style={{ width: `${voortgang}%` }}
                />
              </div>
              <p className="text-xs text-text-secondary text-center">
                Even geduld — foto's worden veilig opgeslagen
              </p>
            </div>
          )}

          {/* Foutmelding */}
          {fout && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm">
              {fout}
            </div>
          )}

          {/* Submit knop */}
          <button
            onClick={betaal}
            disabled={!formulierGeldig}
            className={`btn-primary w-full text-lg py-4 flex items-center justify-center gap-2 ${
              !formulierGeldig ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            {uploaden ? (
              <>
                <svg className="animate-spin w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Bezig...
              </>
            ) : prijs ? (
              `Betaal €${prijs.totaal.toFixed(2).replace(".", ",")} en start →`
            ) : (
              "Voeg foto's toe om te starten"
            )}
          </button>

          <p className="text-xs text-text-secondary text-center">
            {communityToken
              ? "Gratis toegang als community lid · iDEAL niet nodig"
              : "Eenmalige betaling · Geen abonnement · Veilig betalen via Stripe · iDEAL mogelijk"}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function FotoOptimizerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <FotoOptimizerInhoud />
    </Suspense>
  );
}
