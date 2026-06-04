"use client";

import { useState } from "react";
import { DeelModal } from "@/components/DeelModal";

export default function RapportActions({ titel }: { titel?: string }) {
  const [deelOpen, setDeelOpen] = useState(false);

  return (
    <>
      {deelOpen && <DeelModal onSluit={() => setDeelOpen(false)} titel={titel} />}
      <div className="flex items-center justify-between">
        <a href="/dashboard" className="btn-secondary text-sm flex items-center gap-2">
          ← Dashboard
        </a>
        <button
          onClick={() => setDeelOpen(true)}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <span>↗</span> Rapport delen
        </button>
      </div>
    </>
  );
}
