"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Prognose {
  m1: number;
  m2: number;
  m3: number;
  bevestigdFuture: number;
}

const MAAND_MAP: Record<string, string> = {
  Jan:"01",Feb:"02",Mar:"03",Apr:"04",May:"05",Jun:"06",
  Jul:"07",Aug:"08",Sep:"09",Oct:"10",Nov:"11",Dec:"12",
};

function parseCsv(text: string, filterJaar?: string): { rows: { maand: string; omzet: number }[]; jaren: string[] } {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
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
    return { rows, jaren };
  }

  const rows = lines.slice(1).map((line) => {
    const [maand, omzet] = line.split(",");
    return { maand: maand?.trim() ?? "", omzet: parseFloat(omzet?.trim() ?? "0") };
  }).filter((r) => r.maand && !isNaN(r.omzet) && r.omzet > 0);
  return { rows, jaren: [] };
}

function fmt(n: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
}

interface CsvState {
  beschikbareJaren: string[];
  gekozenJaar: string;
  parsedRows: { maand: string; omzet: number }[];
  status: string | null;
  huidig: { maand: string; omzet: number }[];
}

function CsvUploadBlok({
  methode,
  label,
  beschrijving,
}: {
  methode: number;
  label: string;
  beschrijving: string;
}) {
  const [state, setState] = useState<CsvState>({
    beschikbareJaren: [],
    gekozenJaar: "",
    parsedRows: [],
    status: null,
    huidig: [],
  });

  useEffect(() => {
    fetch(`/api/cockpit/revenue/omzet/csv?methode=${methode}&listing_id=portfolio`)
      .then((r) => r.json())
      .then((d) => setState((s) => ({ ...s, huidig: d.map((r: { maand: string; omzet: string }) => ({ maand: r.maand, omzet: parseFloat(r.omzet) })) })));
  }, [methode]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const { rows, jaren } = parseCsv(text);
      const gekozenJaar = jaren.length > 1 ? jaren[jaren.length - 2] : jaren[jaren.length - 1] ?? "";
      setState((s) => ({ ...s, beschikbareJaren: jaren, gekozenJaar, parsedRows: rows, status: null }));
    };
    reader.readAsText(file);
  }

  async function upload() {
    const rows = state.beschikbareJaren.length > 0 && state.gekozenJaar
      ? state.parsedRows.filter((r) => r.maand.startsWith(state.gekozenJaar))
      : state.parsedRows;
    setState((s) => ({ ...s, status: "Uploaden..." }));
    const res = await fetch("/api/cockpit/revenue/omzet/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ methode, listing_id: "portfolio", rows }),
    });
    const d = await res.json();
    setState((s) => ({
      ...s,
      status: d.ok ? `✓ ${d.rows} maanden opgeslagen` : `Fout: ${d.error}`,
      huidig: d.ok ? rows : s.huidig,
      parsedRows: [],
      beschikbareJaren: [],
    }));
  }

  const previewRows = state.beschikbareJaren.length > 0 && state.gekozenJaar
    ? state.parsedRows.filter((r) => r.maand.startsWith(state.gekozenJaar))
    : state.parsedRows;

  const jaarTotaal = previewRows.reduce((s, r) => s + r.omzet, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="font-semibold text-gray-800 text-sm mb-0.5">{label}</h3>
      <p className="text-xs text-gray-400 mb-4">{beschrijving}</p>

      <div className="space-y-3">
        <div>
          <p className="text-xs text-gray-500 mb-1.5">
            Upload een <strong>PriceLabs Portfolio Analytics export</strong> of eenvoudig{" "}
            <code className="bg-gray-100 px-1 rounded">maand,omzet</code> bestand:
          </p>
          <input type="file" accept=".csv" onChange={handleFile}
            className="text-sm text-gray-600 file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-[#eef7fe] file:text-[#2b3885] file:text-sm cursor-pointer" />
        </div>

        {state.beschikbareJaren.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500">Jaar als basis:</label>
            <select
              value={state.gekozenJaar}
              onChange={(e) => setState((s) => ({ ...s, gekozenJaar: e.target.value }))}
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-[#2b3885]"
            >
              {state.beschikbareJaren.map((j) => <option key={j} value={j}>{j}</option>)}
            </select>
            {jaarTotaal > 0 && <span className="text-xs text-gray-400">Totaal: {fmt(jaarTotaal)}</span>}
          </div>
        )}

        {previewRows.length > 0 && (
          <>
            <div className="text-xs text-gray-400 max-h-20 overflow-y-auto bg-gray-50 rounded p-2">
              {previewRows.map((r) => `${r.maand}: ${fmt(r.omzet)}`).join(" · ")}
            </div>
            <button onClick={upload}
              className="px-4 py-1.5 bg-[#2b3885] text-white text-sm rounded-lg hover:bg-[#232f6e] transition-colors">
              Opslaan als prognose
            </button>
          </>
        )}

        {state.status && (
          <p className={`text-xs ${state.status.startsWith("✓") ? "text-green-600" : "text-red-500"}`}>
            {state.status}
          </p>
        )}

        {state.huidig.length > 0 && previewRows.length === 0 && (
          <div className="text-xs text-gray-400 bg-gray-50 rounded p-2">
            <span className="font-medium text-gray-500">Huidig: </span>
            {state.huidig.slice(0, 8).map((r) => `${r.maand}: ${fmt(r.omzet)}`).join(" · ")}
            {state.huidig.length > 8 ? ` + ${state.huidig.length - 8} meer` : ""}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PrognosePortfolioPage() {
  const [prognose, setPrognose] = useState<Prognose | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const start = new Date().getFullYear() + "-01-01";
    fetch(`/api/cockpit/revenue/omzet?start=${start}&end=${today}`)
      .then((r) => r.json())
      .then((d) => {
        setPrognose(d.prognose ?? null);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cockpit/revenue/omzet" className="text-sm text-gray-400 hover:text-[#2b3885] transition-colors">← Omzet</Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-[#2b3885]">Prognoses</h1>
      </div>

      <p className="text-sm text-gray-500 mb-8">
        Drie methodes om de verwachte omzet te berekenen. Upload per methode een CSV om de berekening te overschrijven met eigen data.
      </p>

      {/* Huidige prognosewaarden */}
      {!loading && prognose && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
          {[
            { label: "M1 — Historisch", val: prognose.m1 },
            { label: "M2 — Seizoen (STLY)", val: prognose.m2 },
            { label: "M3 — Boekingen + potentieel", val: prognose.m3, sub: prognose.bevestigdFuture > 0 ? `waarvan ${fmt(prognose.bevestigdFuture)} bevestigd` : null },
          ].map((m) => (
            <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-1">{m.label}</p>
              <p className="text-2xl font-bold text-gray-900">{fmt(m.val)}</p>
              {m.sub && <p className="text-xs text-gray-400 mt-1">{m.sub}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Toelichting */}
      <div className="bg-[#eef7fe] rounded-lg p-4 mb-8 text-xs text-[#2b3885] space-y-1.5">
        <p><strong>M1 Historisch:</strong> Gemiddelde maandelijkse omzet op basis van de geselecteerde periode, geëxtrapoleerd naar de toekomst. Upload een PriceLabs export om een specifiek jaar als basis te gebruiken.</p>
        <p><strong>M2 Seizoen (STLY):</strong> Dezelfde periode vorig jaar als referentie. Geeft aan wat je kunt verwachten op basis van historisch seizoenspatroon.</p>
        <p><strong>M3 Boekingen + potentieel:</strong> Bevestigde toekomstige boekingen + schatting van nog te verwachten boekingen (70% van vrije nachten × huidige vraagprijs).</p>
      </div>

      {/* CSV uploads per methode */}
      <div className="space-y-4">
        <CsvUploadBlok
          methode={1}
          label="M1 — Historische prestatie"
          beschrijving="Upload een PriceLabs export en kies een referentiejaar als historische basis."
        />
        <CsvUploadBlok
          methode={2}
          label="M2 — Seizoensprognose"
          beschrijving="Upload een PriceLabs export en kies een jaar als seizoensreferentie."
        />
        <CsvUploadBlok
          methode={3}
          label="M3 — Onbenut potentieel"
          beschrijving="Upload een eigen berekening van het beschikbare potentieel per maand."
        />
      </div>
    </div>
  );
}
