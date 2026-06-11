"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Metrics {
  omzet: number; omzetIncl: number; adr: number; nachten: number;
  bezetting: number; revpar: number; omzet_ly: number; yoy_pct: number | null;
  kanalen: Record<string, { omzet: number; boekingen: number }>;
}
interface TrendRij { maand: string; omzet: number; omzet_ly: number; nachten: number; adr: number; }
interface Reservering { check_in: string; check_out: string; nachten: number; omzet: number; kanaal: string; }
interface Prognose { m1: number; m2: number; m3: number; bevestigdFuture: number; }
interface DetailData {
  listing_id: string;
  metrics: Metrics;
  trend: TrendRij[];
  prognose: Prognose;
  reservations: Reservering[];
}

const PERIODES = [
  { label: "Deze maand", id: "huidige_maand" },
  { label: "Vorige maand", id: "vorige_maand" },
  { label: "Dit jaar", id: "dit_jaar" },
  { label: "Eigen periode", id: "eigen" },
];

function getPeriode(id: string) {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  if (id === "huidige_maand") { const last = new Date(y, now.getMonth() + 1, 0).getDate(); return { start: `${y}-${m}-01`, end: `${y}-${m}-${last}` }; }
  if (id === "vorige_maand") { const pm = now.getMonth() === 0 ? 12 : now.getMonth(); const py = now.getMonth() === 0 ? y - 1 : y; const last = new Date(py, pm, 0).getDate(); return { start: `${py}-${String(pm).padStart(2, "0")}-01`, end: `${py}-${String(pm).padStart(2, "0")}-${last}` }; }
  if (id === "dit_jaar") return { start: `${y}-01-01`, end: `${y}-12-31` };
  return { start: `${y}-${m}-01`, end: now.toISOString().slice(0, 10) };
}

function fmt(n: number) { return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n); }
function YoyBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-300">—</span>;
  return <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pct >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}% YoY</span>;
}

export default function OmzetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [periodeId, setPeriodeId] = useState("dit_jaar");
  const [eigenStart, setEigenStart] = useState("");
  const [eigenEnd, setEigenEnd] = useState("");
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [csvOpen, setCsvOpen] = useState<number | null>(null);

  function laad(start: string, end: string) {
    setLoading(true);
    fetch(`/api/cockpit/revenue/omzet/${id}?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!id) return;
    const { start, end } = getPeriode(periodeId);
    laad(start, end);
  }, [id, periodeId]);

  function handleCsvFile(methode: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").slice(1);
      const rows = lines.map((line) => {
        const [maand, omzet] = line.split(",");
        return { maand: maand.trim(), omzet: parseFloat(omzet?.trim() ?? "0") };
      }).filter((r) => r.maand && !isNaN(r.omzet));
      await fetch("/api/cockpit/revenue/omzet/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methode, listing_id: id, rows }),
      });
      const { start, end } = getPeriode(periodeId);
      laad(start, end);
    };
    reader.readAsText(file);
  }

  const m = data?.metrics;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cockpit/revenue/omzet" className="text-sm text-gray-400 hover:text-[#2b3885] transition-colors">← Omzet portfolio</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-[#2b3885] truncate">{id}</h1>
      </div>

      <div className="flex gap-1 mb-6 border-b border-gray-200">
        {PERIODES.map((per) => (
          <button key={per.id} onClick={() => setPeriodeId(per.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${periodeId === per.id ? "border-[#2b3885] text-[#2b3885]" : "border-transparent text-gray-400 hover:text-gray-600"}`}>
            {per.label}
          </button>
        ))}
      </div>

      {periodeId === "eigen" && (
        <div className="flex items-center gap-3 mb-6">
          <input type="date" value={eigenStart} onChange={(e) => setEigenStart(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
          <span className="text-gray-400">tot</span>
          <input type="date" value={eigenEnd} onChange={(e) => setEigenEnd(e.target.value)} className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
          <button onClick={() => laad(eigenStart, eigenEnd)} className="px-4 py-2 bg-[#2b3885] text-white text-sm rounded-lg hover:bg-[#232f6e] transition-colors">Tonen</button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Laden...</div>
      ) : !m ? null : (
        <div className="space-y-8">

          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Huuromzet", val: fmt(m.omzet), sub: <YoyBadge pct={m.yoy_pct} /> },
              { label: "Totaal incl. schoonmaak", val: fmt(m.omzetIncl), sub: null },
              { label: "ADR", val: fmt(m.adr), sub: null },
              { label: "Bezetting", val: `${m.bezetting.toFixed(1)}%`, sub: null },
              { label: "RevPAR", val: fmt(m.revpar), sub: null },
              { label: "Geboekte nachten", val: String(m.nachten), sub: null },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                <p className="text-lg font-bold text-gray-900">{k.val}</p>
                {k.sub}
              </div>
            ))}
          </div>

          {/* Maandtrend */}
          {data!.trend.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Maandoverzicht</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Maand</th>
                    <th className="text-right px-4 py-2">Omzet</th>
                    <th className="text-right px-4 py-2">Vorig jaar</th>
                    <th className="text-right px-4 py-2">ADR</th>
                    <th className="text-right px-4 py-2">Nachten</th>
                  </tr></thead>
                  <tbody>
                    {data!.trend.map((t) => (
                      <tr key={t.maand} className="border-b border-gray-100">
                        <td className="px-4 py-2 font-medium">{new Date(t.maand + "-15").toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(t.omzet)}</td>
                        <td className="px-4 py-2 text-right text-gray-400">{t.omzet_ly > 0 ? fmt(t.omzet_ly) : "—"}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{t.adr > 0 ? fmt(t.adr) : "—"}</td>
                        <td className="px-4 py-2 text-right text-gray-500">{t.nachten}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Prognose */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Prognose komende 90 dagen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              {[
                { label: "M1 — Historisch", val: data!.prognose.m1, id: 1 },
                { label: "M2 — Seizoen (STLY)", val: data!.prognose.m2, id: 2 },
                { label: "M3 — Boekingen + potentieel", val: data!.prognose.m3, id: 3 },
              ].map((prog) => (
                <div key={prog.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">{prog.label}</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(prog.val)}</p>
                  <button onClick={() => setCsvOpen(csvOpen === prog.id ? null : prog.id)}
                    className="text-xs text-[#2b3885] hover:underline mt-2">
                    {csvOpen === prog.id ? "▲" : "▼"} CSV uploaden
                  </button>
                  {csvOpen === prog.id && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">Format: <code className="bg-gray-100 px-1 rounded">maand,omzet</code></p>
                      <input type="file" accept=".csv" onChange={(e) => handleCsvFile(prog.id, e)}
                        className="text-xs text-gray-600 file:mr-2 file:px-2 file:py-1 file:rounded file:border-0 file:bg-[#eef7fe] file:text-[#2b3885] cursor-pointer" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Boekingen lijst */}
          {data!.reservations.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Boekingen in periode ({data!.reservations.length})</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 border-b text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Check-in</th>
                    <th className="text-left px-4 py-2">Check-out</th>
                    <th className="text-right px-4 py-2">Nachten</th>
                    <th className="text-right px-4 py-2">Omzet</th>
                    <th className="text-left px-4 py-2">Kanaal</th>
                  </tr></thead>
                  <tbody>
                    {data!.reservations.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-4 py-2">{r.check_in}</td>
                        <td className="px-4 py-2">{r.check_out}</td>
                        <td className="px-4 py-2 text-right">{r.nachten}</td>
                        <td className="px-4 py-2 text-right font-medium">{fmt(r.omzet)}</td>
                        <td className="px-4 py-2 capitalize text-gray-500">{r.kanaal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

        </div>
      )}
    </div>
  );
}
