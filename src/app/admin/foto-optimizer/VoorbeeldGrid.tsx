"use client";

import { useState } from "react";

interface Foto {
  id: string;
  ruimte: string | null;
  origineel_pad: string | null;
  bewerkt_pad: string | null;
  toon_als_voorbeeld: boolean;
}

export function VoorbeeldGrid({ fotos, supabaseUrl }: { fotos: Foto[]; supabaseUrl: string }) {
  const [staten, setStaten] = useState<Record<string, boolean>>(
    Object.fromEntries(fotos.map((f) => [f.id, f.toon_als_voorbeeld]))
  );
  const [laden, setLaden] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const aantalActief = Object.values(staten).filter(Boolean).length;

  const toggle = async (id: string) => {
    setLaden(id);
    setFout(null);
    try {
      const res = await fetch("/api/admin/foto-optimizer/voorbeeld-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.error || "Er ging iets mis");
        return;
      }
      setStaten((prev) => ({ ...prev, [id]: data.toon_als_voorbeeld }));
    } finally {
      setLaden(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <p className="text-sm text-text-secondary">
          Aangevinkte foto's verschijnen als voor/na voorbeeld op de publieke Photo Optimizer pagina.
        </p>
        <span className={`text-sm font-semibold px-3 py-1 rounded-full ${
          aantalActief >= 15 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"
        }`}>
          {aantalActief} / 15 geselecteerd
        </span>
      </div>

      {fout && (
        <div className="mb-4 bg-danger/10 border border-danger/20 rounded-xl px-4 py-2 text-danger text-sm">
          {fout}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {fotos.map((foto) => {
          const actief = staten[foto.id];
          const bezig = laden === foto.id;
          return (
            <div
              key={foto.id}
              onClick={() => !bezig && toggle(foto.id)}
              className={`relative cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                actief
                  ? "border-accent ring-2 ring-accent/20 shadow-md"
                  : "border-border hover:border-primary/40"
              } ${bezig ? "opacity-60 pointer-events-none" : ""}`}
            >
              {/* Na foto */}
              {foto.bewerkt_pad ? (
                <img
                  src={`${supabaseUrl}/storage/v1/object/public/foto-bewerkt/${foto.bewerkt_pad}`}
                  alt="na"
                  className="w-full aspect-[4/3] object-cover"
                />
              ) : (
                <div className="w-full aspect-[4/3] bg-surface" />
              )}

              {/* Voor thumbnail (linksonder overlay) */}
              {foto.origineel_pad && (
                <div className="absolute top-2 left-2 w-14 h-10 rounded border-2 border-white shadow-md overflow-hidden">
                  <img
                    src={`${supabaseUrl}/storage/v1/object/public/foto-originelen/${foto.origineel_pad}`}
                    alt="voor"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Checkbox rechtsbovenhoek */}
              <div className={`absolute top-2 right-2 w-6 h-6 rounded flex items-center justify-center shadow transition-colors ${
                actief ? "bg-accent" : "bg-white/90 border border-border"
              }`}>
                {actief && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Ruimtelabel */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2">
                <p className="text-xs text-white capitalize truncate">{foto.ruimte || "overig"}</p>
              </div>

              {/* Loading overlay */}
              {bezig && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/40">
                  <svg className="animate-spin w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
