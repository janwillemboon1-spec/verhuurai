"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { BeforeAfterSlider } from "@/components/BeforeAfterSlider";

const RUIMTE_LABELS: Record<string, string> = {
  woonkamer: "Woonkamer", keuken: "Keuken", eetgedeelte: "Eetgedeelte",
  slaapkamer: "Slaapkamer", badkamer: "Badkamer", buitenruimte: "Buitenruimte",
  exterieur: "Exterieur", overig: "Overig",
};

interface Bewerking {
  id: string;
  volgnummer: number;
  ruimte: string | null;
  origineelUrl: string | null;
  bewerktUrl: string | null;
  status: string;
  feedback_type: string | null;
  feedback_toelichting: string | null;
  is_geregenereerd: boolean;
  gebruiker_herverwerkt_op: string | null;
  overgeslagen_reden: string | null;
}

export default function AdminSessieDetailPage() {
  const params = useParams();
  const sessieId = params["sessie-id"] as string;
  const [bewerkingen, setBewerkingen] = useState<Bewerking[]>([]);
  const [sessieInfo, setSessieInfo] = useState<any>(null);
  const [laden, setLaden] = useState(true);
  const [bewerktUrls, setBewerktUrls] = useState<Record<string, string>>({});
  const [herverwerkModal, setHerverwerkModal] = useState<string | null>(null);
  const [instructie, setInstructie] = useState("");
  const [bezig, setBezig] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/photo-optimizer/resultaat/${sessieId}`)
      .then(r => r.json())
      .then(data => {
        setSessieInfo(data.sessie);
        setBewerkingen(data.bewerkingen || []);
      })
      .finally(() => setLaden(false));
  }, [sessieId]);

  const startHerverwerk = async () => {
    if (!herverwerkModal) return;
    const id = herverwerkModal;
    setHerverwerkModal(null);
    setBezig(id);
    try {
      const res = await fetch("/api/foto-optimizer/herverwerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bewerkingId: id, instructie, adminModus: true }),
      });
      const data = await res.json();
      if (res.ok && data.nieuweUrl) {
        setBewerktUrls(prev => ({ ...prev, [id]: `${data.nieuweUrl}?t=${Date.now()}` }));
        // Herlaad vanuit DB zodat de nieuwste bewerkt_pad behouden blijft na refresh
        const refreshed = await fetch(`/api/photo-optimizer/resultaat/${sessieId}`).then(r => r.json());
        if (refreshed.bewerkingen) setBewerkingen(refreshed.bewerkingen);
      } else {
        alert(data.error || "Mislukt.");
      }
    } catch {
      alert("Verbinding mislukt.");
    }
    setBezig(null);
    setInstructie("");
  };

  const klaare = bewerkingen.filter(b => b.status === "klaar");
  const overgeslagen = bewerkingen.filter(b => b.status === "overgeslagen" || b.status === "fout");

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <Link href="/admin/foto-optimizer" className="text-accent text-sm hover:underline">← Foto Optimizer admin</Link>
            <h1 className="font-display text-2xl text-primary mt-1">
              {sessieInfo?.naam || "Sessie"} — {sessieInfo?.aantal_fotos} foto&apos;s
            </h1>
            <p className="text-sm text-text-secondary">{sessieInfo?.email}</p>
          </div>
          <Link
            href={`/photo-optimizer/resultaat/${sessieId}`}
            target="_blank"
            className="btn-secondary text-sm"
          >
            Gebruikersweergave →
          </Link>
        </div>

        {laden && <p className="text-text-secondary">Laden...</p>}

        {/* Foto's grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {klaare.map(foto => {
            const url = bewerktUrls[foto.id] || foto.bewerktUrl;
            const fotoBezi = bezig === foto.id;
            return (
              <div key={foto.id} className="card overflow-hidden">
                {foto.origineelUrl && url ? (
                  <div className="relative">
                    <BeforeAfterSlider
                      voorUrl={foto.origineelUrl}
                      naUrl={url}
                      alt={`Foto ${foto.volgnummer}`}
                    />
                    {fotoBezi && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                        <div className="text-white text-center">
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
                  <div className="aspect-[3/2] bg-border flex items-center justify-center text-text-secondary text-sm">Geen afbeelding</div>
                )}

                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-secondary">
                      {foto.ruimte ? RUIMTE_LABELS[foto.ruimte] || foto.ruimte : "Onbekend"} · #{foto.volgnummer}
                    </p>
                    <button
                      onClick={() => { setHerverwerkModal(foto.id); setInstructie(""); }}
                      disabled={fotoBezi}
                      className="text-xs bg-primary text-white px-2 py-1 rounded-lg hover:bg-primary/80 disabled:opacity-40"
                    >
                      🔄 Herverwerken
                    </button>
                  </div>

                  {/* Feedback badge */}
                  {foto.feedback_toelichting && (
                    <div className={`text-xs p-2 rounded-lg ${
                      foto.feedback_type === "fout_van_boni" ? "bg-danger/10 text-danger" : "bg-warning/10 text-warning"
                    }`}>
                      <span className="font-semibold">{foto.feedback_type === "fout_van_boni" ? "Fout van Boni" : "Kwestie van smaak"}:</span>{" "}
                      {foto.feedback_toelichting}
                    </div>
                  )}

                  {foto.gebruiker_herverwerkt_op && (
                    <p className="text-xs text-primary font-semibold">✓ Door gebruiker herverwerkt</p>
                  )}
                  {foto.is_geregenereerd && (
                    <p className="text-xs text-success font-semibold">✓ Geregenereerd</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Overgeslagen */}
        {overgeslagen.length > 0 && (
          <div>
            <h2 className="font-display text-lg text-primary mb-3">Overgeslagen ({overgeslagen.length})</h2>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {overgeslagen.map(foto => (
                <div key={foto.id} className="card p-2 text-center opacity-60">
                  {foto.origineelUrl && <img src={foto.origineelUrl} alt="" className="w-full aspect-square object-cover rounded-lg mb-1" />}
                  <p className="text-xs text-text-secondary">#{foto.volgnummer}</p>
                  <p className="text-xs text-danger">{foto.overgeslagen_reden || "Overgeslagen"}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Herverwerk modal */}
      {herverwerkModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setHerverwerkModal(null)}>
          <div className="card p-6 max-w-md w-full space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-display text-xl text-primary">Admin — Foto herverwerken</h3>
            <p className="text-sm text-text-secondary">Als admin kun je dit onbeperkt doen. De eindgebruiker behoudt zijn eigen herverwerk-optie.</p>
            <div>
              <label className="block text-sm font-semibold text-primary mb-1.5">
                Instructie <span className="text-text-secondary font-normal">(optioneel)</span>
              </label>
              <textarea
                value={instructie}
                onChange={e => setInstructie(e.target.value)}
                placeholder="Bijv. 'maak helderder' of 'verwijder de rommel'..."
                className="textarea h-20 w-full"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setHerverwerkModal(null)} className="btn-secondary flex-1">Annuleren</button>
              <button onClick={startHerverwerk} className="btn-primary flex-1">Herverwerken (~45s)</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
