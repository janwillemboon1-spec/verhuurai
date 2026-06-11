"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

interface KPIs {
  omzet: number;
  omzetIncl: number;
  adr: number;
  nachten: number;
  bezetting: number;
  revpar: number;
  kanalen: Record<string, { omzet: number; boekingen: number }>;
  omzet_ly: number;
  yoy_pct: number | null;
}

interface ListingRij {
  listing_id: string;
  listing_naam: string;
  omzet: number;
  omzetIncl: number;
  adr: number;
  nachten: number;
  bezetting: number;
  revpar: number;
  omzet_ly: number;
  yoy_pct: number | null;
}

interface TrendRij { maand: string; omzet: number; omzet_ly: number; }

interface Prognose { m1: number; m2: number; m3: number; bevestigdFuture: number; }

interface OmzetData {
  periode: { start: string; end: string };
  portfolio: KPIs;
  listings: ListingRij[];
  trend: TrendRij[];
  prognose: Prognose;
}

const PERIODES = [
  { label: "Deze maand", id: "huidige_maand" },
  { label: "Vorige maand", id: "vorige_maand" },
  { label: "Dit jaar", id: "dit_jaar" },
  { label: "Eigen periode", id: "eigen" },
];

function getPeriode(id: string): { start: string; end: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  if (id === "huidige_maand") {
    const last = new Date(y, now.getMonth() + 1, 0).getDate();
    return { start: `${y}-${m}-01`, end: `${y}-${m}-${last}` };
  }
  if (id === "vorige_maand") {
    const pm = now.getMonth() === 0 ? 12 : now.getMonth();
    const py = now.getMonth() === 0 ? y - 1 : y;
    const last = new Date(py, pm, 0).getDate();
    return { start: `${py}-${String(pm).padStart(2, "0")}-01`, end: `${py}-${String(pm).padStart(2, "0")}-${last}` };
  }
  if (id === "dit_jaar") return { start: `${y}-01-01`, end: `${y}-12-31` };
  return { start: `${y}-${m}-01`, end: now.toISOString().slice(0, 10) };
}

function fmt(n: number) { return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n); }
function fmtPct(n: number | null) {
  if (n === null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function YoyBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-xs text-gray-300">geen data</span>;
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${pct >= 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
      {fmtPct(pct)} YoY
    </span>
  );
}

function CsvUpload({ methode, listing_id, label, beschrijving }: { methode: number; listing_id: string; label: string; beschrijving: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [huidig, setHuidig] = useState<{ maand: string; omzet: number }[]>([]);

  useEffect(() => {
    if (open) {
      fetch(`/api/cockpit/revenue/omzet/csv?methode=${methode}&listing_id=${listing_id}`)
        .then((r) => r.json())
        .then((d) => setHuidig(d.map((r: { maand: string; omzet: string }) => ({ maand: r.maand, omzet: parseFloat(r.omzet) }))));
    }
  }, [open, methode, listing_id]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.trim().split("\n").slice(1); // skip header
      const rows = lines.map((line) => {
        const [maand, omzet] = line.split(",");
        return { maand: maand.trim(), omzet: parseFloat(omzet?.trim() ?? "0") };
      }).filter((r) => r.maand && !isNaN(r.omzet));

      setStatus("Uploaden...");
      const res = await fetch("/api/cockpit/revenue/omzet/csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ methode, listing_id, rows }),
      });
      const d = await res.json();
      setStatus(d.ok ? `✓ ${d.rows} rijen opgeslagen` : `Fout: ${d.error}`);
      setHuidig(rows);
    };
    reader.readAsText(file);
  }

  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm"
      >
        <div>
          <span className="font-medium text-gray-700">{label}</span>
          <span className="ml-2 text-gray-400 text-xs">{beschrijving}</span>
        </div>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"} CSV uploaden</span>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-3 bg-white">
          <p className="text-xs text-gray-500">
            CSV-formaat: <code className="bg-gray-100 px-1 rounded">maand,omzet</code> — bijv. <code className="bg-gray-100 px-1 rounded">2026-01,4500</code>
          </p>
          <input type="file" accept=".csv" onChange={handleFile}
            className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-[#eef7fe] file:text-[#2b3885] file:text-sm cursor-pointer" />
          {status && <p className="text-xs text-green-600">{status}</p>}
          {huidig.length > 0 && (
            <div className="text-xs text-gray-400">
              Huidige data: {huidig.map((r) => `${r.maand}: ${fmt(r.omzet)}`).join(" · ")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OmzetPage() {
  const [periodeId, setPeriodeId] = useState("dit_jaar");
  const [eigenStart, setEigenStart] = useState("");
  const [eigenEnd, setEigenEnd] = useState("");
  const [data, setData] = useState<OmzetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [prognoseToelichting, setPrognoseToelichting] = useState(false);

  const laad = useCallback((start: string, end: string) => {
    setLoading(true);
    fetch(`/api/cockpit/revenue/omzet?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const { start, end } = getPeriode(periodeId);
    laad(start, end);
  }, [periodeId, laad]);

  function applyEigenPeriode() {
    if (eigenStart && eigenEnd) laad(eigenStart, eigenEnd);
  }

  const p = data?.portfolio;
  const maxOmzet = Math.max(...(data?.listings ?? []).map((l) => l.omzet), 1);

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cockpit/revenue" className="text-sm text-gray-400 hover:text-[#2b3885] transition-colors">← Revenue</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-[#2b3885]">Omzet</h1>
      </div>

      {/* Periode tabs */}
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
          <input type="date" value={eigenStart} onChange={(e) => setEigenStart(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
          <span className="text-gray-400">tot</span>
          <input type="date" value={eigenEnd} onChange={(e) => setEigenEnd(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
          <button onClick={applyEigenPeriode}
            className="px-4 py-2 bg-[#2b3885] text-white text-sm rounded-lg hover:bg-[#232f6e] transition-colors">
            Tonen
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Omzetdata ophalen...</div>
      ) : !p ? null : (
        <div className="space-y-8">

          {/* KPI kaarten */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Huuromzet", val: fmt(p.omzet), sub: <YoyBadge pct={p.yoy_pct} /> },
              { label: "Totaal incl. schoonmaak", val: fmt(p.omzetIncl), sub: null },
              { label: "ADR", val: fmt(p.adr), sub: <span className="text-xs text-gray-400">per nacht</span> },
              { label: "Bezetting", val: `${p.bezetting.toFixed(1)}%`, sub: <span className="text-xs text-gray-400">van beschikbare nachten</span> },
              { label: "RevPAR", val: fmt(p.revpar), sub: <span className="text-xs text-gray-400">per beschikbare nacht</span> },
              { label: "Geboekte nachten", val: String(p.nachten), sub: null },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1">{k.label}</p>
                <p className="text-lg font-bold text-gray-900">{k.val}</p>
                {k.sub}
              </div>
            ))}
          </div>

          {/* Kanalen */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Kanaaluitsplitsing</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Kanaal</th>
                    <th className="text-right px-4 py-2">Boekingen</th>
                    <th className="text-right px-4 py-2">Omzet</th>
                    <th className="text-right px-4 py-2">% van totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(p.kanalen).sort((a, b) => b[1].omzet - a[1].omzet).map(([kanaal, k]) => (
                    <tr key={kanaal} className="border-b border-gray-100">
                      <td className="px-4 py-2 font-medium capitalize">{kanaal}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{k.boekingen}</td>
                      <td className="px-4 py-2 text-right font-medium">{fmt(k.omzet)}</td>
                      <td className="px-4 py-2 text-right text-gray-500">
                        {p.omzet > 0 ? `${((k.omzet / p.omzet) * 100).toFixed(1)}%` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Per woning */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Per woning</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="text-left px-4 py-2">Woning</th>
                    <th className="text-right px-4 py-2">Omzet</th>
                    <th className="text-right px-4 py-2">YoY</th>
                    <th className="text-right px-4 py-2">ADR</th>
                    <th className="text-right px-4 py-2">Bezetting</th>
                    <th className="text-right px-4 py-2">Nachten</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {data!.listings.map((l) => (
                    <tr key={l.listing_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <div className="font-medium text-gray-900">{l.listing_naam}</div>
                        <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                          <div className="bg-[#2b3885] h-1 rounded-full" style={{ width: `${(l.omzet / maxOmzet) * 100}%` }} />
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-medium">{l.omzet > 0 ? fmt(l.omzet) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2 text-right"><YoyBadge pct={l.yoy_pct} /></td>
                      <td className="px-4 py-2 text-right text-gray-600">{l.adr > 0 ? fmt(l.adr) : "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{l.bezetting > 0 ? `${l.bezetting.toFixed(1)}%` : "—"}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{l.nachten > 0 ? l.nachten : "—"}</td>
                      <td className="px-4 py-2">
                        <Link href={`/cockpit/revenue/omzet/${l.listing_id}`} className="text-xs text-[#2b3885] hover:underline">Detail →</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Maandelijkse trend */}
          {data!.trend.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">Maandelijkse trend</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left px-4 py-2">Maand</th>
                      <th className="text-right px-4 py-2">Omzet</th>
                      <th className="text-right px-4 py-2">Vorig jaar</th>
                      <th className="text-right px-4 py-2">Verschil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.trend.map((t) => {
                      const diff = t.omzet_ly > 0 ? ((t.omzet - t.omzet_ly) / t.omzet_ly) * 100 : null;
                      return (
                        <tr key={t.maand} className="border-b border-gray-100">
                          <td className="px-4 py-2 font-medium">{new Date(t.maand + "-15").toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}</td>
                          <td className="px-4 py-2 text-right font-medium">{fmt(t.omzet)}</td>
                          <td className="px-4 py-2 text-right text-gray-400">{t.omzet_ly > 0 ? fmt(t.omzet_ly) : "—"}</td>
                          <td className="px-4 py-2 text-right"><YoyBadge pct={diff} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Prognose */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Prognose komende periode</h2>
              <button onClick={() => setPrognoseToelichting((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600">
                {prognoseToelichting ? "Verberg toelichting" : "Toelichting"} ▾
              </button>
            </div>

            {prognoseToelichting && (
              <div className="bg-[#eef7fe] rounded-lg p-4 mb-4 text-xs text-[#2b3885] space-y-1">
                <p><strong>M1 Historisch:</strong> Gemiddelde maandelijkse omzet op basis van huidige periode, geëxtrapoleerd.</p>
                <p><strong>M2 Seizoen (STLY):</strong> Dezelfde periode vorig jaar als referentie.</p>
                <p><strong>M3 Boekingen + potentieel:</strong> Bevestigde toekomstige boekingen + 70% van nog-te-boeken nachten × huidige prijs.</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "M1 — Historische prestatie", val: data!.prognose.m1, id: 1 },
                { label: "M2 — Seizoensprognose (STLY)", val: data!.prognose.m2, id: 2 },
                { label: "M3 — Boekingen + potentieel", val: data!.prognose.m3, id: 3 },
              ].map((m) => (
                <div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">{m.label}</p>
                  <p className="text-xl font-bold text-gray-900">{fmt(m.val)}</p>
                  {m.id === 3 && data!.prognose.bevestigdFuture > 0 && (
                    <p className="text-xs text-gray-400 mt-1">waarvan {fmt(data!.prognose.bevestigdFuture)} bevestigd</p>
                  )}
                </div>
              ))}
            </div>

            {/* CSV uploads */}
            <div className="space-y-2">
              <p className="text-xs text-gray-400 mb-2">Overschrijf een prognose met eigen CSV-data:</p>
              <CsvUpload methode={1} listing_id="portfolio" label="M1 — Historische prestatie" beschrijving="Eigen historische omzetdata per maand" />
              <CsvUpload methode={2} listing_id="portfolio" label="M2 — Seizoensprognose" beschrijving="Eigen seizoensgebonden verwachting per maand" />
              <CsvUpload methode={3} listing_id="portfolio" label="M3 — Onbenut potentieel" beschrijving="Eigen berekening van beschikbaar potentieel per maand" />
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
