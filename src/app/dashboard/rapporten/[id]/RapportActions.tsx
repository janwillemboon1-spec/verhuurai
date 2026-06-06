"use client";

import { useState } from "react";
import { DeelModal } from "@/components/DeelModal";

export default function RapportActions({ titel }: { titel?: string }) {
  const [deelOpen, setDeelOpen] = useState(false);

  return (
    <>
      {deelOpen && <DeelModal onSluit={() => setDeelOpen(false)} titel={titel} />}
      <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
        <a href="/dashboard" className="btn-secondary text-sm">← Dashboard</a>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="btn-secondary text-sm flex items-center gap-2">
            ⬇️ Download PDF
          </button>
          <button onClick={() => setDeelOpen(true)} className="btn-secondary text-sm flex items-center gap-2">
            <span>↗</span> Delen
          </button>
        </div>
      </div>
    </>
  );
}
