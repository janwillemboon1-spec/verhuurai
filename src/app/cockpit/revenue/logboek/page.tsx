"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LogEntry {
  id: string;
  aangemaakt_op: string;
  listing_id: string;
  listing_naam: string | null;
  wijziging_type: "handmatig" | "automatisch";
  veld: string;
  oude_waarde: string | null;
  nieuwe_waarde: string;
  override_datum: string | null;
  regel_naam: string | null;
}

const SNELKEUZE = [
  { label: "Vandaag", dagen: 0 },
  { label: "7 dagen", dagen: 7 },
  { label: "30 dagen", dagen: 30 },
  { label: "90 dagen", dagen: 90 },
  { label: "1 jaar", dagen: 365 },
];

function datumOffset(dagen: number) {
  const d = new Date();
  d.setDate(d.getDate() - dagen);
  return d.toISOString().slice(0, 10);
}

function formatDatum(iso: string) {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function LogboekPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [vanaf, setVanaf] = useState(datumOffset(7));
  const [tot, setTot] = useState(today);

  function load(v: string, t: string) {
    setLoading(true);
    fetch(`/api/cockpit/revenue/log?vanaf=${v}&tot=${t}`)
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(vanaf, tot); }, []);

  function applySnelkeuze(dagen: number) {
    const v = dagen === 0 ? today : datumOffset(dagen);
    setVanaf(v);
    setTot(today);
    load(v, today);
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cockpit/revenue" className="text-sm text-gray-400 hover:text-[#2b3885] transition-colors">
          ← Revenue
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-[#2b3885]">Logboek prijswijzigingen</h1>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex flex-wrap items-end gap-4">
        <div className="flex gap-2 flex-wrap">
          {SNELKEUZE.map((s) => (
            <button
              key={s.label}
              onClick={() => applySnelkeuze(s.dagen)}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-[#2b3885] hover:text-white transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Vanaf</label>
            <input type="date" value={vanaf} onChange={(e) => setVanaf(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
          </div>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Tot en met</label>
            <input type="date" value={tot} onChange={(e) => setTot(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
          </div>
          <button
            onClick={() => load(vanaf, tot)}
            className="mt-4 px-4 py-1.5 bg-[#2b3885] text-white text-sm rounded-lg hover:bg-[#232f6e] transition-colors"
          >
            Zoeken
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Logboek laden...</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl p-8 text-center">
          Geen wijzigingen gevonden in deze periode.
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 font-medium">
            {entries.length} wijzigingen
          </div>
          <div className="divide-y divide-gray-100">
            {entries.map((e) => (
              <div key={e.id} className="px-4 py-3 flex items-start gap-4 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                    e.wijziging_type === "automatisch"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-blue-100 text-blue-700"
                  }`}>
                    {e.wijziging_type === "automatisch" ? "A" : "H"}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-medium text-sm text-gray-900">
                      {e.listing_naam ?? e.listing_id}
                    </span>
                    <span className="text-xs text-gray-400">{formatDatum(e.aangemaakt_op)}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-0.5">
                    <span className="font-medium capitalize">{e.veld}</span>
                    {e.override_datum && <span className="text-gray-400"> · {e.override_datum}</span>}
                    {e.oude_waarde && (
                      <span className="text-gray-400"> van <span className="line-through">{e.oude_waarde}</span></span>
                    )}
                    {e.oude_waarde && <span className="text-gray-400"> naar </span>}
                    {!e.oude_waarde && <span className="text-gray-400"> → </span>}
                    <span className="font-medium text-gray-900">{e.nieuwe_waarde}</span>
                    {e.regel_naam && (
                      <span className="ml-2 text-xs text-purple-500">via regel: {e.regel_naam}</span>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
