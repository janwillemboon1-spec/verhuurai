"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

interface Bewerking {
  id: string;
  volgnummer: number;
  ruimte: string | null;
  origineel_pad: string | null;
  bewerkt_pad: string | null;
  origineelUrl: string | null;
  bewerktUrl: string | null;
  status: string;
  overgeslagen_reden: string | null;
  analyse_json: Record<string, any> | null;
}

interface Sessie {
  id: string;
  naam: string;
  status: string;
  aantal_fotos: number;
  totaal_prijs: number;
  klaar_op: string | null;
}

const RUIMTE_LABELS: Record<string, string> = {
  woonkamer: "Woonkamer",
  keuken: "Keuken",
  eetgedeelte: "Eetgedeelte",
  slaapkamer: "Slaapkamer",
  badkamer: "Badkamer",
  buitenruimte: "Buitenruimte",
  exterieur: "Exterieur",
  overig: "Overig",
};

const RUIMTE_VOLGORDE = ["woonkamer", "keuken", "eetgedeelte", "slaapkamer", "badkamer", "buitenruimte", "exterieur", "overig"];


export default function ResultaatPage({
  params,
}: {
  params: { "sessie-id": string };
}) {
  const sessieId = params["sessie-id"];
  const [sessie, setSessie] = useState<Sessie | null>(null);
  const [bewerkingen, setBewerkingen] = useState<Bewerking[]>([]);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  // Per foto: true = toon bewerkt (na), false = toon origineel (voor)
  const [zipLaden, setZipLaden] = useState(false);

  useEffect(() => {
    fetch(`/api/foto-optimizer/resultaat/${sessieId}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setFout(data.error); return; }
        setSessie(data.sessie);
        setBewerkingen(data.bewerkingen);
      })
      .catch(() => setFout("Kon resultaten niet laden."))
      .finally(() => setLaden(false));
  }, [sessieId]);

  const klaare = bewerkingen.filter(b => b.status === "klaar");
  const overgeslagen = bewerkingen.filter(b => b.status === "overgeslagen" || b.status === "fout");

  // Groepeer per ruimte
  const perRuimte = RUIMTE_VOLGORDE.reduce<Record<string, Bewerking[]>>((acc, r) => {
    const fotos = klaare.filter(b => (b.ruimte || "overig") === r);
    if (fotos.length > 0) acc[r] = fotos;
    return acc;
  }, {});

  const downloadZip = async () => {
    setZipLaden(true);
    const link = document.createElement("a");
    link.href = `/api/foto-optimizer/zip/${sessieId}`;
    link.download = `hostboni-fotos-${sessieId.slice(0, 8)}.zip`;
    link.click();
    setTimeout(() => setZipLaden(false), 3000);
  };

  if (laden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <BoniAvatar size={80} animate className="mx-auto mb-4" />
          <p className="text-text-secondary">Resultaten laden...</p>
        </div>
      </div>
    );
  }

  if (fout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <p className="text-danger mb-4">{fout}</p>
          <Link href="/foto-optimizer" className="btn-primary">Nieuwe analyse starten</Link>
        </div>
      </div>
    );
  }

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
            {klaare.length} foto{klaare.length !== 1 ? "'s" : ""} professioneel bewerkt door Boni.
          </p>

          {/* Stats */}
          <div className="flex justify-center gap-4 mt-4 flex-wrap">
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

        {/* Download knop */}
        <div className="card p-5 mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-primary">Download alle bewerkte foto&apos;s</p>
            <p className="text-sm text-text-secondary">{klaare.length} foto&apos;s als ZIP-bestand</p>
          </div>
          <button
            onClick={downloadZip}
            disabled={zipLaden}
            className="btn-primary shrink-0 flex items-center gap-2"
          >
            {zipLaden ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Bezig...
              </>
            ) : "⬇ Download ZIP"}
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
              {fotos.map(foto => (
                <div key={foto.id} className="card overflow-hidden">
                  {foto.origineelUrl && foto.bewerktUrl ? (
                    <BeforeAfterSlider
                      voorUrl={foto.origineelUrl}
                      naUrl={foto.bewerktUrl}
                      alt={`Foto ${foto.volgnummer}`}
                    />
                  ) : (
                    <div className="aspect-[3/2] bg-border flex items-center justify-center text-text-secondary text-sm">
                      Geen afbeelding
                    </div>
                  )}
                  {foto.ruimte && (
                    <div className="px-3 py-2">
                      <p className="text-xs text-text-secondary">
                        {RUIMTE_LABELS[foto.ruimte] || foto.ruimte} · #{foto.volgnummer}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Overgeslagen foto's */}
        {overgeslagen.length > 0 && (
          <div className="mb-10">
            <h2 className="font-display text-xl text-primary mb-4">
              Overgeslagen <span className="text-sm font-normal text-text-secondary">({overgeslagen.length})</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {overgeslagen.map(foto => (
                <div key={foto.id} className="card overflow-hidden opacity-60">
                  <div className="aspect-square bg-border flex items-center justify-center p-3">
                    {foto.origineelUrl ? (
                      <img src={foto.origineelUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-text-secondary text-xs text-center">#{foto.volgnummer}</span>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-text-secondary text-center">{foto.overgeslagen_reden || "Overgeslagen"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onderste download + CTA */}
        <div className="card p-6 text-center space-y-4">
          <p className="font-semibold text-primary">Tevreden met de resultaten?</p>
          <p className="text-text-secondary text-sm">
            Download je foto&apos;s en gebruik ze direct in je Airbnb advertentie.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={downloadZip} disabled={zipLaden} className="btn-primary flex items-center justify-center gap-2">
              ⬇ Download alle foto&apos;s (ZIP)
            </button>
            <Link href="/listing-optimizer" className="btn-secondary">
              Listing Optimizer →
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
