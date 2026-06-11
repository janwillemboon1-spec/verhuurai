"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

const KANAAL_KLEUREN: Record<string, string> = {
  airbnb: "#FF5A5F",
  bcom:   "#003580",
  vrbo:   "#1A8FE3",
};
function kanaalKleur(kanaal: string): string {
  return KANAAL_KLEUREN[kanaal.toLowerCase()] ?? "#22C55E";
}
function kanaalLabel(kanaal: string): string {
  if (kanaal === "airbnb") return "Airbnb";
  if (kanaal === "bcom")   return "Booking.com";
  if (kanaal === "vrbo")   return "Vrbo";
  return kanaal.charAt(0).toUpperCase() + kanaal.slice(1);
}

function PieChart({ data }: { data: { label: string; value: number; color: string; pct: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  const cx = 80, cy = 80, r = 68;
  let angle = -Math.PI / 2;
  const slices = data.map((d) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle);
    const y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle);
    const y2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    return { ...d, path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z` };
  });

  return (
    <svg viewBox="0 0 160 160" className="w-full">
      {slices.map((s) => (
        <path key={s.label} d={s.path} fill={s.color} stroke="white" strokeWidth="1.5">
          <title>{s.label}: {s.pct}%</title>
        </path>
      ))}
    </svg>
  );
}

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
      {fmtPct(pct)} STLY
    </span>
  );
}

const MAAND_MAP: Record<string, string> = {
  Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
  Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
};

function parseCsv(text: string, filterJaar?: string): { rows: { maand: string; omzet: number }[]; jaren: string[]; format: string } {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  // Detect PriceLabs format: has Month, Year, Revenue columns
  const isPriceLabs = header.includes("Month") && header.includes("Year") && header.includes("Revenue");

  if (isPriceLabs) {
    const idxMonth = header.indexOf("Month");
    const idxYear = header.indexOf("Year");
    const idxRevenue = header.indexOf("Revenue");

    const aggr: Record<string, number> = {};
    const jarenSet = new Set<string>();

    for (const line of lines.slice(1)) {
      const cols = line.split(",").map((c) => c.trim().replace(/"/g, ""));
      const month = MAAND_MAP[cols[idxMonth]] ?? null;
      const jaar = cols[idxYear];
      const rev = parseFloat(cols[idxRevenue] ?? "0");
      if (!month || !jaar || isNaN(rev) || rev <= 0) continue;
      jarenSet.add(jaar);
      const key = `${jaar}-${month}`;
      aggr[key] = (aggr[key] ?? 0) + rev;
    }

    const jaren = Array.from(jarenSet).sort();
    const rows = Object.entries(aggr)
      .filter(([k]) => !filterJaar || k.startsWith(filterJaar))
      .map(([maand, omzet]) => ({ maand, omzet: Math.round(omzet * 100) / 100 }))
      .sort((a, b) => a.maand.localeCompare(b.maand));

    return { rows, jaren, format: "pricelabs" };
  }

  // Simple maand,omzet format
  const rows = lines.slice(1).map((line) => {
    const [maand, omzet] = line.split(",");
    return { maand: maand?.trim() ?? "", omzet: parseFloat(omzet?.trim() ?? "0") };
  }).filter((r) => r.maand && !isNaN(r.omzet) && r.omzet > 0);

  return { rows, jaren: [], format: "simple" };
}

function CsvUpload({ methode, listing_id, label, beschrijving }: { methode: number; listing_id: string; label: string; beschrijving: string }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [huidig, setHuidig] = useState<{ maand: string; omzet: number }[]>([]);
  const [beschikbareJaren, setBeschikbareJaren] = useState<string[]>([]);
  const [gekozenJaar, setGekozenJaar] = useState<string>("");
  const [parsedRows, setParsedRows] = useState<{ maand: string; omzet: number }[]>([]);

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
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, jaren, format } = parseCsv(text);
      if (format === "pricelabs" && jaren.length > 0) {
        setBeschikbareJaren(jaren);
        setGekozenJaar(jaren[jaren.length - 2] ?? jaren[jaren.length - 1]); // default vorig jaar
        setParsedRows(rows);
      } else {
        setBeschikbareJaren([]);
        setParsedRows(rows);
      }
    };
    reader.readAsText(file);
  }

  async function uploadRows(rows: { maand: string; omzet: number }[]) {
    setStatus("Uploaden...");
    const res = await fetch("/api/cockpit/revenue/omzet/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methode, listing_id, rows }),
    });
    const d = await res.json();
    setStatus(d.ok ? `✓ ${d.rows} maanden opgeslagen` : `Fout: ${d.error}`);
    setHuidig(rows);
  }

  const previewRows = beschikbareJaren.length > 0
    ? parsedRows.filter((r) => r.maand.startsWith(gekozenJaar))
    : parsedRows;

  const jaarTotaal = previewRows.reduce((s, r) => s + r.omzet, 0);

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
            Ondersteund: PriceLabs Portfolio Analytics export <strong>of</strong> eenvoudig formaat{" "}
            <code className="bg-gray-100 px-1 rounded">maand,omzet</code>
          </p>
          <input type="file" accept=".csv" onChange={handleFile}
            className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-[#eef7fe] file:text-[#2b3885] file:text-sm cursor-pointer" />

          {beschikbareJaren.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">Jaar als basis:</label>
              <select value={gekozenJaar} onChange={(e) => setGekozenJaar(e.target.value)}
                className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#2b3885]">
                {beschikbareJaren.map((j) => (
                  <option key={j} value={j}>{j}</option>
                ))}
              </select>
              {jaarTotaal > 0 && (
                <span className="text-xs text-gray-400">Totaal: {fmt(jaarTotaal)}</span>
              )}
            </div>
          )}

          {previewRows.length > 0 && (
            <div className="text-xs text-gray-400 max-h-24 overflow-y-auto">
              {previewRows.map((r) => `${r.maand}: ${fmt(r.omzet)}`).join(" · ")}
            </div>
          )}

          {previewRows.length > 0 && (
            <button
              onClick={() => uploadRows(previewRows)}
              className="px-3 py-1.5 bg-[#2b3885] text-white text-sm rounded hover:bg-[#232f6e] transition-colors"
            >
              Opslaan als prognose
            </button>
          )}

          {status && <p className="text-xs text-green-600">{status}</p>}
          {huidig.length > 0 && parsedRows.length === 0 && (
            <div className="text-xs text-gray-400">
              Huidige data: {huidig.slice(0, 6).map((r) => `${r.maand}: ${fmt(r.omzet)}`).join(" · ")}{huidig.length > 6 ? " ..." : ""}
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
  const [syncBezig, setSyncBezig] = useState(false);
  const [syncVoortgang, setSyncVoortgang] = useState<string | null>(null);
  type OmzetSortKey = "naam" | "omzet" | "omzet_ly" | "adr" | "bezetting" | "nachten" | "revpar";
  const [sortKey, setSortKey] = useState<OmzetSortKey>("omzet");
  const [sortAsc, setSortAsc] = useState(false);

  function toggleOmzetSort(k: OmzetSortKey) {
    if (sortKey === k) setSortAsc(v => !v);
    else { setSortKey(k); setSortAsc(k === "naam"); }
  }
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [cacheStats, setCacheStats] = useState<{ rijen: number; listings: number; omzet: number } | null>(null);
  const [syncMislukt, setSyncMislukt] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/cockpit/revenue/omzet/sync")
      .then(r => r.json())
      .then(d => {
        setLastSync(d.sync_op ?? null);
        if (d.cache_rijen != null) {
          setCacheStats({ rijen: d.cache_rijen, listings: d.listings_in_cache ?? 0, omzet: d.totaal_omzet_cache ?? 0 });
        }
      });
  }, []);

  async function syncData() {
    setSyncBezig(true);
    setSyncMislukt(null);
    setSyncVoortgang("Verbinding maken...");

    const res = await fetch("/api/cockpit/revenue/omzet/sync", { method: "POST" });
    if (!res.body) { setSyncBezig(false); return; }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const msg = JSON.parse(line.slice(6));
          if (msg.type === "progress") {
            setSyncVoortgang(`${msg.listing} (${msg.index}/${msg.totaal_listings})`);
          } else if (msg.type === "listing_ok") {
            setSyncVoortgang(`✓ ${msg.listing} — ${msg.reserveringen} reserveringen`);
          } else if (msg.type === "done") {
            setLastSync(msg.sync_op);
            // cache stats worden ververst bij page reload
            setSyncVoortgang(null);
            setSyncBezig(false);
            if (msg.mislukt?.length) setSyncMislukt(msg.mislukt);
            const { start, end } = getPeriode(periodeId);
            laad(eigenStart && eigenEnd && periodeId === "eigen" ? eigenStart : start,
                 eigenStart && eigenEnd && periodeId === "eigen" ? eigenEnd   : end);
          }
        } catch { continue; }
      }
    }
    setSyncBezig(false);
    setSyncVoortgang(null);
  }

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
        <div className="ml-auto flex items-center gap-4">
          <div className="text-right">
            <button
              onClick={syncData}
              disabled={syncBezig}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2b3885] text-white text-xs font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors"
            >
              <span className={syncBezig ? "animate-spin inline-block" : ""}>↻</span>
              {syncBezig ? (syncVoortgang ?? "Starten...") : "Data synchroniseren"}
            </button>
            {lastSync && (
              <p className="text-xs text-gray-400 mt-1">
                Laatste sync: {new Date(lastSync).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
            {cacheStats && (
              <p className={`text-xs mt-0.5 ${cacheStats.listings < 27 ? "text-amber-500" : "text-gray-400"}`}>
                {cacheStats.listings}/27 woningen · {cacheStats.rijen} rijen · €{cacheStats.omzet.toLocaleString("nl-NL")} totaal in cache
              </p>
            )}
            {!lastSync && !syncBezig && (
              <p className="text-xs text-amber-500 mt-1">Nog geen data — klik om te synchroniseren</p>
            )}
            {syncMislukt && syncMislukt.length > 0 && (
              <div className="mt-1.5 text-xs text-red-500 max-w-xs">
                Mislukt: {syncMislukt.join(", ")}
              </div>
            )}
          </div>
          <Link href="/cockpit/revenue/omzet/prognose" className="text-xs text-[#2b3885] hover:underline">
            Prognoses →
          </Link>
        </div>
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
            <div className="flex gap-4 items-stretch">
              {/* Tabel */}
              <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden min-w-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left px-3 py-1.5">Kanaal</th>
                      <th className="text-right px-3 py-1.5">Boekingen</th>
                      <th className="text-right px-3 py-1.5">Omzet</th>
                      <th className="text-right px-3 py-1.5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(p.kanalen).sort((a, b) => b[1].omzet - a[1].omzet).map(([kanaal, k]) => (
                      <tr key={kanaal} className="border-b border-gray-100">
                        <td className="px-3 py-1.5 font-medium text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: kanaalKleur(kanaal) }} />
                            {kanaalLabel(kanaal)}
                          </div>
                        </td>
                        <td className="px-3 py-1.5 text-right text-gray-600 text-sm">{k.boekingen}</td>
                        <td className="px-3 py-1.5 text-right font-medium text-sm">{fmt(k.omzet)}</td>
                        <td className="px-3 py-1.5 text-right text-gray-500 text-sm">
                          {p.omzet > 0 ? `${((k.omzet / p.omzet) * 100).toFixed(1)}%` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pie chart — zelfde hoogte als tabel via flex stretch */}
              <div className="flex-1 bg-white border border-gray-200 rounded-xl min-w-0 flex flex-row justify-center items-center gap-5 px-5 py-3">
                {(() => {
                  const sorted = Object.entries(p.kanalen).sort((a, b) => b[1].omzet - a[1].omzet);
                  const total = sorted.reduce((s, [, k]) => s + k.omzet, 0);
                  const pieData = sorted.map(([label, k]) => ({
                    label: kanaalLabel(label),
                    value: k.omzet,
                    color: kanaalKleur(label),
                    pct: total > 0 ? ((k.omzet / total) * 100).toFixed(1) : "0",
                  }));
                  return (
                    <>
                      <div className="flex-shrink-0 w-[110px]">
                        <PieChart data={pieData} />
                      </div>
                      <div className="space-y-2 min-w-0 flex-1">
                        {pieData.map((d) => (
                          <div key={d.label} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                              <span className="text-gray-700 font-medium truncate">{d.label}</span>
                            </div>
                            <span className="text-gray-500 ml-2 flex-shrink-0 font-medium">{d.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </section>

          {/* Per woning */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Per woning</h2>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase select-none">
                    {([
                      { k: "naam",      label: "Woning",    align: "left"  },
                      { k: "omzet",     label: "Omzet",     align: "right" },
                      { k: "omzet_ly",  label: "STLY",      align: "right" },
                      { k: "adr",       label: "ADR",        align: "right" },
                      { k: "bezetting", label: "Bezetting", align: "right" },
                      { k: "nachten",   label: "Nachten",   align: "right" },
                    ] as { k: OmzetSortKey; label: string; align: string }[]).map(col => (
                      <th key={col.k}
                        onClick={() => toggleOmzetSort(col.k)}
                        className={`px-4 py-2 cursor-pointer hover:text-gray-700 transition-colors ${col.align === "left" ? "text-left" : "text-right"}`}>
                        {col.label}
                        {sortKey === col.k
                          ? <span className="ml-0.5 text-[#2b3885]">{sortAsc ? "↑" : "↓"}</span>
                          : <span className="ml-0.5 text-gray-300">↕</span>}
                      </th>
                    ))}
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {[...data!.listings].sort((a, b) => {
                    let v = 0;
                    if (sortKey === "naam")      v = a.listing_naam.localeCompare(b.listing_naam);
                    else if (sortKey === "omzet")     v = a.omzet - b.omzet;
                    else if (sortKey === "omzet_ly")  v = (a.omzet_ly ?? 0) - (b.omzet_ly ?? 0);
                    else if (sortKey === "adr")       v = a.adr - b.adr;
                    else if (sortKey === "bezetting") v = a.bezetting - b.bezetting;
                    else if (sortKey === "nachten")   v = a.nachten - b.nachten;
                    return sortAsc ? v : -v;
                  }).map((l) => (
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
                      <th className="text-right px-4 py-2">STLY</th>
                      <th className="text-right px-4 py-2">Verschil</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data!.trend.map((t) => {
                      const today = new Date().toISOString().slice(0, 7);
                      const isToekomst = t.maand > today;
                      const diff = t.omzet_ly > 0 ? ((t.omzet - t.omzet_ly) / t.omzet_ly) * 100 : null;
                      return (
                        <tr key={t.maand} className={`border-b border-gray-100 ${isToekomst ? "bg-blue-50/30" : ""}`}>
                          <td className="px-4 py-2 font-medium">
                            {new Date(t.maand + "-15").toLocaleDateString("nl-NL", { month: "long", year: "numeric" })}
                          </td>
                          <td className={`px-4 py-2 text-right font-medium ${isToekomst ? "text-blue-700" : ""}`}>
                            {t.omzet > 0 ? fmt(t.omzet) : <span className="text-gray-300">—</span>}
                          </td>
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

        </div>
      )}
    </div>
  );
}
