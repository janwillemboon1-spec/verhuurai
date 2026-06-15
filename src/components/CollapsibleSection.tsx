"use client";

import { useState } from "react";

interface Props {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function CollapsibleSection({ title, count, children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full p-5 flex items-center justify-between hover:bg-surface/50 transition-colors text-left"
      >
        <h2 className="font-display text-xl text-primary flex items-center gap-2">
          {title}
          {count !== undefined && (
            <span className="text-sm font-normal text-text-secondary">({count})</span>
          )}
        </h2>
        <svg
          className={`w-5 h-5 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && <div className="border-t border-border">{children}</div>}
    </div>
  );
}
