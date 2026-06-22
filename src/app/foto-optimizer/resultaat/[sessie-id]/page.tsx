"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";
import { HerverwerkModal } from "@/components/HerverwerkModal";

interface Bewerking {
  id: string;
  volgnummer: number;
  ruimte: string | null;
  origineelUrl: string | null;
  bewerktUrl: string | null;
  status: string;
  overgeslagen_reden: string | null;
  feedback_type: string | null;
  feedback_toelichting: string | null;
  is_geregenereerd: boolean;
  gebruiker_herverwerkt_op: string | null;
  positief_beoordeeld: boolean;
}

interface Sessie {
  id: string;
  naam: string;
  status: string;
  aantal_fotos: number;
  regeneratie_gedaan: boolean;
}

interface FeedbackFormState {
  type: "fout_van_boni" | "kwestie_van_smaak";
  toelichting: string;
}

const RUIMTE_LABELS: Record<string, string> = {
  woonkamer: "Woonkamer", keuken: "Keuken", eetgedeelte: "Eetgedeelte",
  slaapkamer: "Slaapkamer", badkamer: "Badkamer", buitenruimte: "Buitenruimte",
  exterieur: "Exterieur", overig: "Overig",
};
const RUIMTE_VOLGORDE = ["woonkamer", "keuken", "eetgedeelte", "slaapkamer", "badkamer", "buitenruimte", "exterieur", "overig"];

export default function ResultaatPage({ params }: { params: { "sessie-id": string } }) {
  const sessieId = params["sessie-id"];
  const [sessie, setSessie] = useState<Sessie | null>(null);
  const [bewerkingen, setBewerkingen] = useState<Bewerking[]>([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [zipLaden, setZipLaden] = useState(false);

  // Feedback state
  const [feedbackModal, setFeedbackModal] = useState<string | null>(null); // bewerkingId
  const [feedbackForm, setFeedbackForm] = useState<FeedbackFormState>({ type: "fout_van_boni", toelichting: "" });
  const [feedbackOpslaan, setFeedbackOpslaan] = useState(false);
  const [lokaalFeedback, setLokaalFeedback] = useState<Record<string, { type: string; toelichting: string }>>({});

  // Positieve beoordelingen (lokaal bijhouden voor directe UI-feedback)
  const [positief, setPositief] = useState<Set<string>>(new Set());

  // Herverwerk state (per foto)
  const [herverwerkModal, setHerverwerkModal] = useState<string | null>(null);
  const [herverwerkBezig, setHerverwerkBezig] = useState<string | null>(null); // bewerkingId
  const [bewerktUrls, setBewerktUrls] = useState<Record<string, string>>({});

  // Regeneratie state
  const [waarschuwingOpen, setWaarschuwingOpen] = useState(false);
  const [regenereerBezig, setRegenereerBezig] = useState(false);
  const [regenereerVoortgang, setRegenereerVoortgang] = useState({ klaar: 0, totaal: 0 });

  const laadData = useCallback(() => {
    fetch(`/api/foto-optimizer/resultaat/${sessieId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setFout(data.error); return; }
        setSessie(data.sessie);
        setBewerkingen(data.bewerkingen);
        // Bestaande positieve beoordelingen inladen
        const positiefSet = new Set<string>(
          data.bewerkingen.filter((b: Bewerking) => b.positief_beoordeeld).map((b: Bewerking) => b.id)
        );
        setPositief(positiefSet);
        // Bestaande feedback inladen
        const bestaand: Record<string, { type: string; toelichting: string }> = {};
        data.bewerkingen.forEach((b: Bewerking) => {
          if (b.feedback_type) {
            bestaand[b.id] = { type: b.feedback_type, toelichting: b.feedback_toelichting || "" };
          }
        });
        setLokaalFeedback(bestaand);
      })
      .catch(() => setFout("Kon resultaten niet laden."))
      .finally(() => setLaden(false));
  }, [sessieId]);

  useEffect(() => { laadData(); }, [laadData]);

  // Poll elke 3 seconden zolang de sessie nog niet klaar is (bv. bij handmatige navigatie)
  useEffect(() => {
    if (laden) return;
    if (sessie?.status === "klaar") return;
    const interval = setInterval(laadData, 3000);
    return () => clearInterval(interval);
  }, [laden, sessie?.status, laadData]);

  // Polling tijdens regeneratie
  useEffect(() => {
    if (!regenereerBezig) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/foto-optimizer/regenereer-status/${sessieId}`);
      const data = await res.json();
      setRegenereerVoortgang({ klaar: data.klaar, totaal: data.totaal });
      if (data.gedaan) {
        clearInterval(interval);
        setRegenereerBezig(false);
        laadData(); // Herlaad met nieuwe foto URLs
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [regenereerBezig, sessieId, laadData]);

  // Toon foto's als status "klaar" is OF als bewerktUrl gevuld is (upload gelukt, status-update soms afgebroken door Railway)
  const klaare = bewerkingen.filter(b =>
    b.status === "klaar" || (b.bewerktUrl !== null && b.status !== "overgeslagen")
  );
  const overgeslagen = bewerkingen.filter(b =>
    (b.status === "overgeslagen" || b.status === "fout") && !b.bewerktUrl
  );
  const perRuimte = RUIMTE_VOLGORDE.reduce<Record<string, Bewerking[]>>((acc, r) => {
    const fotos = klaare.filter(b => (b.ruimte || "overig") === r);
    if (fotos.length > 0) acc[r] = fotos;
    return acc;
  }, {});

  const metToelichting = Object.values(lokaalFeedback).filter(f => f.toelichting.trim()).length;
  const kanRegenereren = metToelichting > 0 && !sessie?.regeneratie_gedaan && !regenereerBezig;

  const openFeedbackModal = (bewerkingId: string) => {
    const bestaand = lokaalFeedback[bewerkingId];
    setFeedbackForm({
      type: (bestaand?.type as any) || "fout_van_boni",
      toelichting: bestaand?.toelichting || "",
    });
    setFeedbackModal(bewerkingId);
  };

  const slaFeedbackOp = async () => {
    if (!feedbackModal) return;
    setFeedbackOpslaan(true);
    try {
      await fetch("/api/foto-optimizer/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bewerkingId: feedbackModal,
          type: feedbackForm.type,
          toelichting: feedbackForm.toelichting.trim() || null,
        }),
      });
      setLokaalFeedback(prev => ({
        ...prev,
        [feedbackModal]: { type: feedbackForm.type, toelichting: feedbackForm.toelichting },
      }));
      setFeedbackModal(null);
    } finally {
      setFeedbackOpslaan(false);
    }
  };

  const togglePositief = async (bewerkingId: string) => {
    const wasPositief = positief.has(bewerkingId);
    // Optimistisch updaten
    setPositief(prev => {
      const nieuw = new Set(Array.from(prev));
      wasPositief ? nieuw.delete(bewerkingId) : nieuw.add(bewerkingId);
      return nieuw;
    });
    await fetch("/api/foto-optimizer/positief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bewerkingId }),
    });
  };

  const verwijderFeedback = async (bewerkingId: string) => {
    setLokaalFeedback(prev => {
      const nieuw = { ...prev };
      delete nieuw[bewerkingId];
      return nieuw;
    });
    await fetch("/api/foto-optimizer/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bewerkingId, verwijder: true }),
    });
  };

  const startHerverwerk = async (prompt: string) => {
    if (!herverwerkModal) return;
    const id = herverwerkModal;
    setHerverwerkModal(null);
    setHerverwerkBezig(id);
    try {
      const res = await fetch("/api/foto-optimizer/herverwerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bewerkingId: id, instructie: prompt }),
      });
      const data = await res.json();
      if (res.ok && data.nieuweUrl) {
        // Cache-buster zodat browser niet de oude versie toont
        setBewerktUrls(prev => ({ ...prev, [id]: `${data.nieuweUrl}?t=${Date.now()}` }));
        // Herlaad vanuit DB zodat de nieuwste bewerkt_pad altijd leidend is
        laadData();
      } else {
        alert(data.error || "Herverwerking mislukt.");
      }
    } catch {
      alert("Verbinding mislukt.");
    }
    setHerverwerkBezig(null);
  };

  const startRegeneratie = async () => {
    setWaarschuwingOpen(false);
    setRegenereerBezig(true);
    setRegenereerVoortgang({ klaar: 0, totaal: metToelichting });
    try {
      const res = await fetch("/api/foto-optimizer/regenereer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessieId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setRegenereerBezig(false);
        setFout(data.error || "Regeneratie kon niet worden gestart.");
      }
    } catch {
      setRegenereerBezig(false);
      setFout("Verbinding mislukt. Probeer opnieuw.");
    }
  };

  const downloadZip = async () => {
    setZipLaden(true);
    const link = document.createElement("a");
    link.href = `/api/foto-optimizer/zip/${sessieId}`;
    link.download = `hostboni-fotos-${sessieId.slice(0, 8)}.zip`;
    link.click();
    setTimeout(() => setZipLaden(false), 3000);
  };

  if (laden) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <BoniAvatar size={80} animate className="mx-auto mb-4" />
        <p className="text-text-secondary">Resultaten laden...</p>
      </div>
    </div>
  );

  if (fout) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="card p-8 max-w-md text-center">
        <p className="text-danger mb-4">{fout}</p>
        <Link href="/foto-optimizer" className="btn-primary">Nieuwe analyse starten</Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <BoniAvatar size={72} className="mx-auto mb-4" />
          <h1 className="font-display text-3xl md:text-4xl text-primary mb-2">
            Jouw bewerkte foto&apos;s zijn klaar!
          </h1>
          <p className="text-text-secondary">
            {sessie?.naam && `Hey ${sessie.naam} — `}
            {klaare.length} foto{klaare.length !== 1 ? "'s" : ""} bewerkt door Boni.
          </p>
          <div className="flex justify-center gap-3 mt-4 flex-wrap">
            <span className="bg-success/10 text-success text-sm font-semibold px-3 py-1 rounded-full">
              ✓ {klaare.length} bewerkt
            </span>
            {overgeslagen.length > 0 && (
              <span className="bg-warning/10 text-warning text-sm font-semibold px-3 py-1 rounded-full">
                ⚠ {overgeslagen.length} overgeslagen
              </span>
            )}
          </div>
        </div>

        {/* Download */}
        <div className="card p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-primary">Download alle bewerkte foto&apos;s</p>
            <p className="text-sm text-text-secondary">{klaare.length} foto&apos;s als ZIP-bestand</p>
          </div>
          <button onClick={downloadZip} disabled={zipLaden} className="btn-primary shrink-0 flex items-center gap-2">
            {zipLaden ? <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>Bezig...</> : "⬇ Download ZIP"}
          </button>
        </div>

        {/* Foto's per ruimte */}
        {Object.entries(perRuimte).map(([ruimte, fotos]) => (
          <div key={ruimte} className="mb-10">
            <h2 className="font-display text-xl text-primary mb-4 flex items-center gap-2">
              <span>{RUIMTE_LABELS[ruimte] || ruimte}</span>
              <span className="text-sm font-normal text-text-secondary">({fotos.length})</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {fotos.map(foto => {
                const fb = lokaalFeedback[foto.id];
                // Lokale cache-busted URL heeft voorrang; anders DB-URL met cache-buster als de foto herverwerkt is
                const bewerktUrl = bewerktUrls[foto.id]
                  || (foto.gebruiker_herverwerkt_op && foto.bewerktUrl
                      ? `${foto.bewerktUrl}?t=${new Date(foto.gebruiker_herverwerkt_op).getTime()}`
                      : foto.bewerktUrl);
                const bezig = herverwerkBezig === foto.id;
                const alHerverwerkt = !!foto.gebruiker_herverwerkt_op;
                return (
                  <div key={foto.id} className="card overflow-hidden">
                    {foto.origineelUrl && bewerktUrl ? (
                      <div className="relative">
                        <BeforeAfterSlider
                          voorUrl={foto.origineelUrl}
                          naUrl={bewerktUrl}
                          alt={`Foto ${foto.volgnummer}`}
                        />
                        {bezig && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-xl">
                            <div className="text-center text-white">
                              <svg className="animate-spin w-8 h-8 mx-auto mb-2" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                              </svg>
                              <p className="text-sm font-semibold">Herverwerken...</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-[3/2] bg-border flex items-center justify-center text-text-secondary text-sm">
                        Geen afbeelding
                      </div>
                    )}
                    <div className="px-3 py-2 flex items-center justify-between gap-2">
                      <p className="text-xs text-text-secondary">
                        {foto.ruimte ? RUIMTE_LABELS[foto.ruimte] || foto.ruimte : ""} · #{foto.volgnummer}
                        {foto.is_geregenereerd && <span className="ml-1 text-success font-semibold">· Hergenereerd</span>}
                        {alHerverwerkt && <span className="ml-1 text-primary font-semibold">· Herverwerkt</span>}
                      </p>
                      <div className="flex items-center gap-1 shrink-0">
                        {/* Positief oordeel knop — toggle */}
                        <button
                          onClick={() => togglePositief(foto.id)}
                          title={positief.has(foto.id) ? "Like verwijderen" : "Goed bewerkt"}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            positief.has(foto.id)
                              ? "bg-success/15 text-success hover:bg-danger/10 hover:text-danger"
                              : "text-text-secondary hover:text-success hover:bg-success/10"
                          }`}
                        >
                          👍
                        </button>
                        {/* Herverwerk knop */}
                        <button
                          onClick={() => setHerverwerkModal(foto.id)}
                          disabled={alHerverwerkt || bezig}
                          title={alHerverwerkt ? "Al herverwerkt" : "Herverwerken"}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                            alHerverwerkt || bezig
                              ? "text-text-secondary/40 cursor-not-allowed"
                              : "text-text-secondary hover:text-primary hover:bg-primary/5"
                          }`}
                        >
                          🔄
                        </button>
                        {/* Feedback knop + verwijder */}
                        {!sessie?.regeneratie_gedaan && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => openFeedbackModal(foto.id)}
                              title={fb ? "Feedback bewerken" : "Fout melden"}
                              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors ${
                                fb
                                  ? fb.type === "fout_van_boni"
                                    ? "bg-danger/10 text-danger"
                                    : "bg-warning/10 text-warning"
                                  : "text-text-secondary hover:text-danger hover:bg-danger/5"
                              }`}
                            >
                              👎 {fb ? (fb.type === "fout_van_boni" ? "Fout" : "Smaak") : "Melden"}
                            </button>
                            {fb && (
                              <button
                                onClick={() => verwijderFeedback(foto.id)}
                                title="Feedback verwijderen"
                                className="text-xs px-1 py-1 text-text-secondary hover:text-danger transition-colors"
                              >
                                ×
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Overgeslagen */}
        {overgeslagen.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-xl text-primary mb-4">
              Overgeslagen <span className="text-sm font-normal text-text-secondary">({overgeslagen.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {overgeslagen.map(foto => (
                <div key={foto.id} className="card overflow-hidden opacity-60">
                  <div className="aspect-square bg-border flex items-center justify-center">
                    {foto.origineelUrl ? (
                      <img src={foto.origineelUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-text-secondary text-xs">#{foto.volgnummer}</span>
                    )}
                  </div>
                  <p className="text-xs text-text-secondary text-center p-2">{foto.overgeslagen_reden || "Overgeslagen"}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regenereer sectie */}
        {!sessie?.regeneratie_gedaan && (
          <div className={`card p-5 mb-6 border-2 transition-colors ${kanRegenereren ? "border-accent/30 bg-accent/5" : "border-border"}`}>
            {regenereerBezig ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="animate-spin w-5 h-5 text-accent shrink-0" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <p className="font-semibold text-primary">
                    Regenereren... {regenereerVoortgang.klaar} van {regenereerVoortgang.totaal} klaar
                  </p>
                </div>
                <div className="h-2 bg-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full transition-all duration-500"
                    style={{ width: `${regenereerVoortgang.totaal > 0 ? (regenereerVoortgang.klaar / regenereerVoortgang.totaal) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-primary">Niet tevreden met een resultaat?</p>
                  <p className="text-sm text-text-secondary mt-0.5">
                    Klik 👎 bij een foto, geef een toelichting, en Boni genereert hem opnieuw.
                    {metToelichting > 0 && (
                      <span className="text-accent font-semibold ml-1">{metToelichting} foto{metToelichting !== 1 ? "'s" : ""} klaar voor regeneratie.</span>
                    )}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">Eenmalig · max 10 foto&apos;s</p>
                </div>
                <button
                  onClick={() => setWaarschuwingOpen(true)}
                  disabled={!kanRegenereren}
                  className={`btn-primary shrink-0 ${!kanRegenereren ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  🔄 Regenereer {metToelichting > 0 ? `${metToelichting} foto${metToelichting !== 1 ? "'s" : ""}` : "foto's"}
                </button>
              </div>
            )}
          </div>
        )}

        {sessie?.regeneratie_gedaan && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-4 mb-6 text-sm text-success font-semibold text-center">
            ✓ Regeneratie voltooid — foto&apos;s zijn bijgewerkt
          </div>
        )}

        {/* Onderste CTA */}
        <div className="card p-6 text-center space-y-4">
          <p className="font-semibold text-primary">Tevreden met de resultaten?</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={downloadZip} disabled={zipLaden} className="btn-primary flex items-center justify-center gap-2">
              ⬇ Download alle foto&apos;s (ZIP)
            </button>
            <Link href="/listing-optimizer" className="btn-secondary">Listing Optimizer →</Link>
          </div>
        </div>
      </div>

      {/* Herverwerk modal */}
      {herverwerkModal && (
        <HerverwerkModal
          onBevestig={(prompt) => startHerverwerk(prompt)}
          onAnnuleer={() => setHerverwerkModal(null)}
        />
      )}

      {/* Feedback modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setFeedbackModal(null)}>
          <div className="card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-primary">Fout melden</h3>

            {/* Type keuze */}
            <div className="space-y-2">
              {(["fout_van_boni", "kwestie_van_smaak"] as const).map(type => (
                <label key={type} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${
                  feedbackForm.type === type ? "border-accent bg-accent/5" : "border-border hover:border-primary/20"
                }`}>
                  <input
                    type="radio"
                    name="feedbackType"
                    value={type}
                    checked={feedbackForm.type === type}
                    onChange={() => setFeedbackForm(p => ({ ...p, type }))}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="font-semibold text-primary text-sm">
                      {type === "fout_van_boni" ? "Fout van Boni" : "Kwestie van smaak"}
                    </p>
                    <p className="text-xs text-text-secondary">
                      {type === "fout_van_boni"
                        ? "Boni heeft iets gedaan wat niet mag of objectief fout is"
                        : "Het resultaat is technisch correct maar niet mijn voorkeur"}
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {/* Toelichting */}
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                Toelichting <span className="text-accent">*</span>
                <span className="text-text-secondary font-normal ml-1">(verplicht voor regeneratie)</span>
              </label>
              <textarea
                value={feedbackForm.toelichting}
                onChange={e => setFeedbackForm(p => ({ ...p, toelichting: e.target.value }))}
                placeholder="Beschrijf wat er mis is en wat je wilt zien in de nieuwe versie..."
                className="textarea h-24 w-full"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setFeedbackModal(null)} className="btn-secondary flex-1">Annuleren</button>
              <button
                onClick={slaFeedbackOp}
                disabled={feedbackOpslaan}
                className="btn-primary flex-1"
              >
                {feedbackOpslaan ? "Opslaan..." : "Opslaan"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Waarschuwing modal */}
      {waarschuwingOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setWaarschuwingOpen(false)}>
          <div className="card p-6 max-w-sm w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-primary">Weet je het zeker?</h3>
            <p className="text-text-secondary text-sm leading-relaxed">
              De huidige bewerkte versies van <strong>{metToelichting} foto{metToelichting !== 1 ? "'s" : ""}</strong> worden vervangen door nieuwe versies op basis van jouw toelichting.
              <span className="block mt-2 font-semibold text-danger">Dit kan niet ongedaan worden gemaakt.</span>
            </p>
            <p className="text-xs text-text-secondary bg-warning/10 border border-warning/20 rounded-lg p-3">
              ⚠ Regeneratie is eenmalig per sessie. Na bevestiging kun je niet opnieuw regenereren.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setWaarschuwingOpen(false)} className="btn-secondary flex-1">Annuleren</button>
              <button onClick={startRegeneratie} className="btn-primary flex-1 bg-danger hover:bg-red-600">
                Ja, regenereer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
