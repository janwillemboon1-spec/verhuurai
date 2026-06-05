"use client";

import { useState } from "react";
// eslint-disable-next-line @next/next/no-img-element

interface VeldUitlegProps {
  tekst: string;
  screenshot?: string; // bestandsnaam in /uitleg/, bijv. "titel.png"
}

export function VeldUitleg({ tekst, screenshot }: VeldUitlegProps) {
  const [toonScreenshot, setToonScreenshot] = useState(false);

  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-text-secondary leading-relaxed">
          <span className="font-semibold text-primary">📍 Waar te vinden:</span> {tekst}
        </p>
        {screenshot && (
          <button
            type="button"
            onClick={() => setToonScreenshot(!toonScreenshot)}
            className="text-xs text-accent font-semibold whitespace-nowrap hover:underline flex-shrink-0"
          >
            {toonScreenshot ? "Verberg voorbeeld" : "Toon voorbeeld"}
          </button>
        )}
      </div>
      {toonScreenshot && screenshot && (
        <div className="rounded-lg overflow-hidden border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/uitleg/${screenshot}`}
            alt="Voorbeeld"
            className="w-full h-auto"
          />
        </div>
      )}
    </div>
  );
}
