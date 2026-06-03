"use client";

import { useEffect, useRef, useState } from "react";

interface ScoreCircleProps {
  score: number; // 0-100
  size?: number;
  label?: string;
}

export function ScoreCircle({ score, size = 140, label }: ScoreCircleProps) {
  const [animated, setAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * score) / 100;

  const color =
    score >= 80 ? "#22C55E" : score >= 50 ? "#F59E0B" : "#EF4444";

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setAnimated(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="flex flex-col items-center gap-2">
      <div style={{ width: size, height: size }} className="relative">
        <svg viewBox="0 0 120 120" width={size} height={size}>
          <circle cx="60" cy="60" r={radius} fill="none" stroke="#E8E4DF" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={animated ? dashOffset : circumference}
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dashoffset 1.5s ease-in-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="font-mono font-bold"
            style={{ fontSize: size * 0.22, color }}
          >
            {score}
          </span>
          <span className="text-text-secondary text-xs">/100</span>
        </div>
      </div>
      {label && <p className="text-sm text-text-secondary text-center">{label}</p>}
    </div>
  );
}

export function VeldScore({ score }: { score: number }) {
  const color =
    score >= 7 ? "#22C55E" : score >= 5 ? "#F59E0B" : "#EF4444";
  const label =
    score >= 7 ? "Goed" : score >= 5 ? "Matig" : "Verbeteren";

  return (
    <div className="flex items-center gap-2">
      <span
        className="font-mono font-bold text-xl"
        style={{ color }}
      >
        {score}/10
      </span>
      <span
        className="text-xs font-semibold px-2 py-0.5 rounded-full"
        style={{ background: `${color}18`, color }}
      >
        {label}
      </span>
    </div>
  );
}
