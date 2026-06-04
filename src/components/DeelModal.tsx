"use client";

import { useState, useEffect } from "react";

interface DeelModalProps {
  onSluit: () => void;
  titel?: string;
}

const DEEL_OPTIES = [
  {
    id: "link",
    label: "Link kopiëren",
    icoon: "🔗",
    kleur: "bg-primary/10 text-primary",
    actie: (url: string) => {
      navigator.clipboard.writeText(url);
      return "gekopieerd";
    },
  },
  {
    id: "whatsapp",
    label: "WhatsApp",
    icoon: "💬",
    kleur: "bg-green-100 text-green-700",
    actie: (url: string, tekst: string) => {
      window.open(`https://wa.me/?text=${encodeURIComponent(tekst + "\n" + url)}`, "_blank");
      return null;
    },
  },
  {
    id: "email",
    label: "E-mail",
    icoon: "✉️",
    kleur: "bg-blue-100 text-blue-700",
    actie: (url: string, tekst: string) => {
      window.open(`mailto:?subject=${encodeURIComponent("VerhuurAI Review Rapport")}&body=${encodeURIComponent(tekst + "\n\n" + url)}`, "_blank");
      return null;
    },
  },
  {
    id: "sms",
    label: "Berichten",
    icoon: "💬",
    kleur: "bg-green-50 text-green-600",
    actie: (url: string, tekst: string) => {
      window.open(`sms:?body=${encodeURIComponent(tekst + "\n" + url)}`, "_blank");
      return null;
    },
  },
  {
    id: "twitter",
    label: "X / Twitter",
    icoon: "𝕏",
    kleur: "bg-gray-900 text-white",
    actie: (url: string, tekst: string) => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(tekst)}&url=${encodeURIComponent(url)}`, "_blank");
      return null;
    },
  },
  {
    id: "facebook",
    label: "Facebook",
    icoon: "f",
    kleur: "bg-blue-600 text-white",
    actie: (url: string) => {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
      return null;
    },
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    icoon: "in",
    kleur: "bg-blue-700 text-white",
    actie: (url: string, tekst: string) => {
      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(tekst)}`, "_blank");
      return null;
    },
  },
  {
    id: "telegram",
    label: "Telegram",
    icoon: "✈️",
    kleur: "bg-sky-500 text-white",
    actie: (url: string, tekst: string) => {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(tekst)}`, "_blank");
      return null;
    },
  },
  {
    id: "pdf",
    label: "Download PDF",
    icoon: "⬇️",
    kleur: "bg-red-100 text-red-700",
    actie: () => null,
  },
];

export function DeelModal({ onSluit, titel }: DeelModalProps) {
  const [gekopieerd, setGekopieerd] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const deelTekst = titel
    ? `Bekijk mijn VerhuurAI review rapport: ${titel}`
    : "Ik gebruik VerhuurAI om mijn Airbnb reviews bij te houden! 🏠";

  const handleActie = (optie: typeof DEEL_OPTIES[0]) => {
    if (optie.id === "pdf") {
      window.print();
      return;
    }
    const result = optie.actie(url, deelTekst);
    if (result === "gekopieerd") {
      setGekopieerd(true);
      setTimeout(() => setGekopieerd(false), 2000);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
      onClick={onSluit}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-surface rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl text-primary">Rapport delen</h2>
          <button
            onClick={onSluit}
            className="w-8 h-8 rounded-full bg-border flex items-center justify-center text-text-secondary hover:text-primary transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Link preview */}
        <div className="bg-background rounded-xl p-3 flex items-center gap-2">
          <span className="text-text-secondary text-xs truncate flex-1">{url}</span>
          <button
            onClick={() => handleActie(DEEL_OPTIES[0])}
            className="text-xs font-semibold text-accent hover:underline flex-shrink-0"
          >
            {gekopieerd ? "✅ Gekopieerd!" : "Kopieer"}
          </button>
        </div>

        {/* Deel opties grid */}
        <div className="grid grid-cols-4 gap-3">
          {DEEL_OPTIES.map((optie) =>
            optie.id === "pdf" ? (
              <button
                key="pdf"
                onClick={() => window.print()}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-transform group-hover:scale-110 bg-red-100 text-red-700">
                  ⬇️
                </div>
                <span className="text-xs text-text-secondary text-center leading-tight">Download PDF</span>
              </button>
            ) : (
              <button
                key={optie.id}
                onClick={() => handleActie(optie)}
                className="flex flex-col items-center gap-1.5 group"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold transition-transform group-hover:scale-110 ${optie.kleur}`}>
                  {optie.id === "link" && gekopieerd ? "✅" : optie.icoon}
                </div>
                <span className="text-xs text-text-secondary text-center leading-tight">
                  {optie.id === "link" && gekopieerd ? "Gekopieerd!" : optie.label}
                </span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
