"use client";

import { useState, useRef, useCallback } from "react";

interface Props {
  voor: string;
  na: string;
  label?: string;
}

export function VoorNaSlider({ voor, na, label }: Props) {
  const [positie, setPositie] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const sleepRef = useRef(false);

  const updatePositie = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPositie(Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-xl select-none aspect-[4/3] cursor-col-resize"
      onMouseDown={() => { sleepRef.current = true; }}
      onMouseUp={() => { sleepRef.current = false; }}
      onMouseLeave={() => { sleepRef.current = false; }}
      onMouseMove={(e) => { if (sleepRef.current) updatePositie(e.clientX); }}
      onClick={(e) => updatePositie(e.clientX)}
      onTouchMove={(e) => { e.preventDefault(); updatePositie(e.touches[0].clientX); }}
      style={{ touchAction: "none" }}
    >
      {/* Na foto (achtergrond) */}
      <img src={na} alt="na" className="absolute inset-0 w-full h-full object-cover" draggable={false} />

      {/* Voor foto (geclipd naar links) */}
      <img
        src={voor}
        alt="voor"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - positie}% 0 0)` }}
        draggable={false}
      />

      {/* Scheidingslijn */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white/90 shadow-[0_0_8px_rgba(0,0,0,0.4)] pointer-events-none"
        style={{ left: `calc(${positie}% - 1px)` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center text-primary pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M7 9l-4 3 4 3M17 9l4 3-4 3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Voor / Na labels */}
      <div className="absolute bottom-3 left-3 text-xs font-bold text-white bg-black/60 rounded px-2 py-0.5 pointer-events-none">Voor</div>
      <div className="absolute bottom-3 right-3 text-xs font-bold text-white bg-black/60 rounded px-2 py-0.5 pointer-events-none">Na</div>

      {label && (
        <div className="absolute top-3 left-3 text-xs font-semibold text-white bg-black/60 rounded-full px-3 py-1 pointer-events-none capitalize">
          {label}
        </div>
      )}
    </div>
  );
}
