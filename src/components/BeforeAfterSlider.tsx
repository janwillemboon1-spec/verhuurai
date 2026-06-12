"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface BeforeAfterSliderProps {
  voorUrl: string;
  naUrl: string;
  alt?: string;
}

export function BeforeAfterSlider({ voorUrl, naUrl, alt = "" }: BeforeAfterSliderProps) {
  const [positie, setPositie] = useState(50);
  const [sleept, setSleept] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePositie = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPositie(Math.round((x / rect.width) * 100));
  }, []);

  // Globale events tijdens slepen — werkt ook buiten de container
  useEffect(() => {
    if (!sleept) return;
    const onMove = (e: MouseEvent) => updatePositie(e.clientX);
    const onTouch = (e: TouchEvent) => updatePositie(e.touches[0].clientX);
    const onStop = () => setSleept(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onStop);
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("touchend", onStop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onStop);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("touchend", onStop);
    };
  }, [sleept, updatePositie]);

  const startSlepen = (clientX: number) => {
    setSleept(true);
    updatePositie(clientX);
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full aspect-[3/2] overflow-hidden rounded-xl select-none cursor-col-resize"
      onMouseDown={e => startSlepen(e.clientX)}
      onTouchStart={e => startSlepen(e.touches[0].clientX)}
    >
      {/* Voor — volledige achtergrond */}
      <img
        src={voorUrl}
        alt={alt}
        draggable={false}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
      />

      {/* Na — rechts van de lijn zichtbaar */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ clipPath: `inset(0 0 0 ${positie}%)` }}
      >
        <img
          src={naUrl}
          alt={alt}
          draggable={false}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Divider lijn */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${positie}%` }}
      />

      {/* Sleepknop */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 bg-white rounded-full shadow-xl flex items-center justify-center pointer-events-none"
        style={{ left: `${positie}%` }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1B2B4B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 9l-4 3 4 3M16 9l4 3-4 3" />
        </svg>
      </div>

      {/* Labels */}
      <div className="absolute top-3 left-3 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full pointer-events-none">
        Voor
      </div>
      <div className="absolute top-3 right-3 bg-accent text-white text-xs font-bold px-2.5 py-1 rounded-full pointer-events-none">
        Na
      </div>
    </div>
  );
}
