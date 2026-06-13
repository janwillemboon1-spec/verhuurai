"use client";

import { useState } from "react";

export interface HerverwerkOptie {
  id: string;
  label: string;
  beschrijving: string;
  kans: number; // percentage
  prompt: string;
}

export const HERVERWERK_OPTIES: HerverwerkOptie[] = [
  {
    id: "helderder",
    label: "Foto helderder maken",
    beschrijving: "Belichting verhogen, schaduwen oplichten",
    kans: 90,
    prompt: "Make this room significantly brighter and better exposed. Increase brightness, lift shadows, and improve the overall lighting to make the space feel bright and welcoming. Keep all colors, furniture, and layout identical.",
  },
  {
    id: "beddengoed",
    label: "Beddengoed & kussens gladstrijken",
    beschrijving: "Kreukels verwijderen, hotel-kwaliteit uitstraling",
    kans: 75,
    prompt: "Smooth out all wrinkled, creased, or untidy bedding, pillows, cushions, and bed linens to look perfectly crisp and hotel-quality neat. Do not change anything else in the room.",
  },
  {
    id: "lucht",
    label: "Grijze lucht blauw maken",
    beschrijving: "Alleen voor buiten- en uitzichtfoto's",
    kans: 78,
    prompt: "Replace the grey, overcast, or dull sky with a clear bright blue sky with natural sunlight. Only change the sky visible through windows or in outdoor shots. Keep all interior elements, furniture, and colors identical.",
  },
  {
    id: "rommel",
    label: "Zichtbare rommel verwijderen",
    beschrijving: "Kopjes, tassen, kabels, schoenen, losse spullen",
    kans: 65,
    prompt: "Remove visible everyday clutter from the photo: cups, glasses, bags, cables, shoes, remote controls, papers, or other loose items on surfaces, tables, and floors. Keep all furniture, decorations, and room layout identical.",
  },
  {
    id: "persoonlijk",
    label: "Persoonlijke items verwijderen",
    beschrijving: "Toiletspullen, kleding, persoonlijke foto's",
    kans: 60,
    prompt: "Remove personal items visible in the photo: toiletries, cosmetics, clothing, personal photographs, medication, and other personal belongings. Keep all furniture, towels, and room structure identical.",
  },
  {
    id: "gordijnen",
    label: "Gordijnen & lakens gladstrijken",
    beschrijving: "Kreukels in stof verwijderen",
    kans: 65,
    prompt: "Smooth out wrinkled, creased, or bunched curtains, drapes, and fabric elements to look neatly arranged and professional. Do not change colors or positions, only remove creases.",
  },
  {
    id: "hoeken",
    label: "Donkere hoeken verlichten",
    beschrijving: "Lokale schaduwgebieden helderder maken",
    kans: 82,
    prompt: "Brighten dark corners and shadowed areas in the room to reveal more detail and create a more evenly lit space. Keep the overall color temperature and atmosphere natural.",
  },
];

interface Props {
  onBevestig: (prompt: string, optieLabel: string) => void;
  onAnnuleer: () => void;
}

export function HerverwerkModal({ onBevestig, onAnnuleer }: Props) {
  const [geselecteerd, setGeselecteerd] = useState<string | null>(null);
  const [extraInstructie, setExtraInstructie] = useState("");

  const optie = HERVERWERK_OPTIES.find(o => o.id === geselecteerd);

  const bevestig = () => {
    if (!optie) return;
    const prompt = extraInstructie.trim()
      ? `${optie.prompt} Additional instruction: ${extraInstructie.trim()}.`
      : optie.prompt;
    onBevestig(prompt, optie.label);
  };

  const kansKleur = (kans: number) =>
    kans >= 80 ? "text-success bg-success/10" :
    kans >= 65 ? "text-warning bg-warning/10" :
    "text-danger bg-danger/10";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onAnnuleer}>
      <div className="card p-6 max-w-lg w-full space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div>
          <h3 className="font-display text-xl text-primary">Wat wil je aanpassen? 🔄</h3>
          <p className="text-sm text-text-secondary mt-1">
            Kies wat er bewerkt moet worden. De kans van slagen verschilt per bewerking.
          </p>
        </div>

        {/* Opties */}
        <div className="space-y-2">
          {HERVERWERK_OPTIES.map(o => (
            <label
              key={o.id}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                geselecteerd === o.id
                  ? "border-accent bg-accent/5"
                  : "border-border hover:border-primary/20"
              }`}
            >
              <input
                type="radio"
                name="optie"
                value={o.id}
                checked={geselecteerd === o.id}
                onChange={() => setGeselecteerd(o.id)}
                className="mt-0.5 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-primary text-sm">{o.label}</p>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${kansKleur(o.kans)}`}>
                    {o.kans}%
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-0.5">{o.beschrijving}</p>
              </div>
            </label>
          ))}
        </div>

        {/* Legenda */}
        <div className="flex gap-3 text-xs text-text-secondary">
          <span className="flex items-center gap-1"><span className="text-success font-bold">●</span> ≥80% groot succes</span>
          <span className="flex items-center gap-1"><span className="text-warning font-bold">●</span> 65–79% redelijk</span>
          <span className="flex items-center gap-1"><span className="text-danger font-bold">●</span> &lt;65% wisselvallig</span>
        </div>

        {/* Extra instructie */}
        {geselecteerd && (
          <div>
            <label className="block text-sm font-semibold text-primary mb-1.5">
              Extra toelichting <span className="text-text-secondary font-normal">(optioneel)</span>
            </label>
            <textarea
              value={extraInstructie}
              onChange={e => setExtraInstructie(e.target.value)}
              placeholder="Bijv. 'het kleed is bijzonder rommelig' of 'focus op het rechtergedeelte'..."
              className="textarea h-16 w-full text-sm"
            />
          </div>
        )}

        {/* Waarschuwing */}
        {geselecteerd && (
          <p className="text-xs text-warning bg-warning/10 rounded-lg p-3">
            ⚠ Dit kan niet ongedaan worden gemaakt. Je kunt deze foto daarna niet meer zelf herverwerken.
          </p>
        )}

        <div className="flex gap-3">
          <button onClick={onAnnuleer} className="btn-secondary flex-1">Annuleren</button>
          <button
            onClick={bevestig}
            disabled={!geselecteerd}
            className={`btn-primary flex-1 ${!geselecteerd ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            Herverwerken (~45s)
          </button>
        </div>
      </div>
    </div>
  );
}
