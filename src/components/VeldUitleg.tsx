"use client";

interface VeldUitlegProps {
  tekst: string;
}

export function VeldUitleg({ tekst }: VeldUitlegProps) {
  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl px-3 py-2">
      <p className="text-xs text-text-secondary leading-relaxed">
        <span className="font-semibold text-primary">📍 Waar te vinden:</span> {tekst}
      </p>
    </div>
  );
}
