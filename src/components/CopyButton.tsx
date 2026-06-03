"use client";

import { useState } from "react";

interface CopyButtonProps {
  tekst: string;
  className?: string;
}

export function CopyButton({ tekst, className = "" }: CopyButtonProps) {
  const [gekopieerd, setGekopieerd] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(tekst);
    setGekopieerd(true);
    setTimeout(() => setGekopieerd(false), 2000);
  };

  return (
    <button
      onClick={handleClick}
      className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition-all duration-200 ${
        gekopieerd
          ? "bg-success/10 text-success border-success/30"
          : "bg-surface text-text-secondary border-border hover:border-primary/30 hover:text-primary"
      } ${className}`}
    >
      {gekopieerd ? "✅ Gekopieerd!" : "📋 Kopieer"}
    </button>
  );
}
