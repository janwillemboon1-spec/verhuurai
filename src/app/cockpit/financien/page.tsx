"use client";

import { useState, useEffect, useCallback, useMemo } from "react";

const MAANDEN = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];
const MAANDEN_LANG = ["Januari","Februari","Maart","April","Mei","Juni","Juli","Augustus","September","Oktober","November","December"];
const CATEGORIEEN = ["Software","Telefoon","Bank","Educatie","Administratie","Pensioen","Personeel (variabel)","Overig"];
const FREQUENTIES = ["maandelijks","jaarlijks","kwartaal","eenmalig"];

function eur(v: number) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
}

type Periode = "deze_maand" | "vorige_maand" | "dit_jaar" | "eigen";

function getMaandIndices(periode: Periode, eigenVan: number, eigenTot: number, huidigeMaand: number): number[] {
  switch (periode) {
    case "deze_maand": return [huidigeMaand];
    case "vorige_maand": return [(huidigeMaand + 11) % 12];
    case "dit_jaar": return Array.from({ length: 12 }, (_, i) => i);
    case "eigen": {
      const indices: number[] = [];
      for (let i = eigenVan; i <= eigenTot; i++) indices.push(i);
      return indices;
    }
  }
}

function sumIndices(arr: number[], indices: number[]): number {
  return indices.reduce((s, i) => s + (arr[i] ?? 0), 0);
}

interface Overzicht {
  jaar: number;
  sync_op: string | null;
  maand_labels: string[];
  commissies_per_maand: number[];
  overig_per_maand: number[];
  inkomsten_per_maand: number[];
  kosten_per_maand: number[];
  resultaat_per_maand: number[];
  overig_rijen: { naam: string; maanden: number[]; totaal: number }[];
  kpi: {
    inkomsten_ytd: number;
    kosten_ytd: number;
    resultaat_ytd: number;
    inkomsten_jaar: number;
    kosten_jaar: number;
    resultaat_jaar: number;
    winstmarge: number;
  };
}

interface Commissies {
  jaar: number;
  maand_labels: string[];
  listings: { listing_id: string; listing_naam: string; maanden: number[]; totaal: number }[];
  totaal_per_maand: number[];
  totaal_jaar: number;
}

interface Kostenpost {
  id: number;
  naam: string;
  categorie: string;
  bedrag: number;
  frequentie: string;
  betaalmaand: number | null;
  van_maand: number | null;
  tot_maand: number | null;
  actief: boolean;
}

interface OverigInkomsten {
  id: number;
  naam: string;
  jaar: number;
  jan: number; feb: number; mrt: number; apr: number; mei: number; jun: number;
  jul: number; aug: number; sep: number; okt: number; nov: number; dec: number;
}

type TabId = "inkomsten" | "kosten" | "pl";

export default function FinancienPage() {
  const jaar = new Date().getFullYear();
  const huidigeMaand = new Date().getMonth();

  const [actieveTab, setActieveTab] = useState<TabId>("inkomsten");
  const [periode, setPeriode] = useState<Periode>("dit_jaar");
  const [eigenVan, setEigenVan] = useState(0);
  const [eigenTot, setEigenTot] = useState(huidigeMaand);

  const [overzicht, setOverzicht] = useState<Overzicht | null>(null);
  const [commissies, setCommissies] = useState<Commissies | null>(null);
  const [kosten, setKosten] = useState<Kostenpost[]>([]);
  const [overig, setOverig] = useState<OverigInkomsten[]>([]);
  const [laden, setLaden] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);
  const [toonSyncLog, setToonSyncLog] = useState(false);
  const [bewerkKosten, setBewerkKosten] = useState<Kostenpost | null>(null);
  const [nieuwKosten, setNieuwKosten] = useState(false);
  const [bewerkOverig, setBewerkOverig] = useState<OverigInkomsten | null>(null);
  const [nieuwOverig, setNieuwOverig] = useState(false);

  const maandIndices = useMemo(
    () => getMaandIndices(periode, eigenVan, eigenTot, huidigeMaand),
    [periode, eigenVan, eigenTot, huidigeMaand]
  );

  const laadData = useCallback(async () => {
    setLaden(true);
    const [ovRes, comRes, kosRes, ovgRes] = await Promise.all([
      fetch(`/api/cockpit/financien/overzicht?jaar=${jaar}`).then(r => r.json()),
      fetch(`/api/cockpit/financien/commissies?jaar=${jaar}`).then(r => r.json()),
      fetch(`/api/cockpit/financien/kosten?jaar=${jaar}`).then(r => r.json()),
      fetch(`/api/cockpit/financien/overig?jaar=${jaar}`).then(r => r.json()),
    ]);
    setOverzicht(ovRes);
    setCommissies(comRes);
    setKosten(kosRes.kosten ?? []);
    setOverig(ovgRes.overig ?? []);
    setLaden(false);
  }, [jaar]);

  useEffect(() => { laadData(); }, [laadData]);

  async function startSync() {
    setSyncing(true);
    setSyncLog([]);
    setToonSyncLog(true);

    const res = await fetch(`/api/cockpit/financien/sync?jaar=${jaar}`, { method: "POST" });
    if (!res.body) { setSyncing(false); return; }

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
          const evt = JSON.parse(line.slice(6));
          if (evt.bericht || evt.type) {
            setSyncLog(prev => [...prev, evt.bericht ?? `[${evt.type}]`]);
          }
          if (evt.type === "done") {
            setSyncing(false);
            await laadData();
          }
        } catch { /* skip */ }
      }
    }
    setSyncing(false);
  }

  async function slaKostenOp(data: Partial<Kostenpost>) {
    if (bewerkKosten) {
      await fetch(`/api/cockpit/financien/kosten/${bewerkKosten.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/cockpit/financien/kosten", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, jaar }),
      });
    }
    setBewerkKosten(null);
    setNieuwKosten(false);
    await laadData();
  }

  async function verwijderKosten(id: number) {
    if (!confirm("Kostenpost verwijderen?")) return;
    await fetch(`/api/cockpit/financien/kosten/${id}`, { method: "DELETE" });
    await laadData();
  }

  async function slaOverigOp(data: Partial<OverigInkomsten>) {
    if (bewerkOverig) {
      await fetch(`/api/cockpit/financien/overig/${bewerkOverig.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
    } else {
      await fetch("/api/cockpit/financien/overig", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, jaar }),
      });
    }
    setBewerkOverig(null);
    setNieuwOverig(false);
    await laadData();
  }

  async function verwijderOverig(id: number) {
    if (!confirm("Inkomstenbron verwijderen?")) return;
    await fetch(`/api/cockpit/financien/overig/${id}`, { method: "DELETE" });
    await laadData();
  }

  if (laden) {
    return <div className="text-gray-400 text-sm py-12 text-center">Laden...</div>;
  }

  const syncOp = overzicht?.sync_op
    ? new Date(overzicht.sync_op).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : null;

  // KPI berekeningen voor geselecteerde periode
  const periodeInkomsten = overzicht ? sumIndices(overzicht.inkomsten_per_maand, maandIndices) : 0;
  const periodeKosten = overzicht ? sumIndices(overzicht.kosten_per_maand, maandIndices) : 0;
  const periodeResultaat = periodeInkomsten - periodeKosten;
  const periodeMarge = periodeInkomsten > 0 ? (periodeResultaat / periodeInkomsten) * 100 : 0;

  const kpiLabel = {
    deze_maand: MAANDEN_LANG[huidigeMaand],
    vorige_maand: MAANDEN_LANG[(huidigeMaand + 11) % 12],
    dit_jaar: "Dit jaar",
    eigen: `${MAANDEN[eigenVan]}–${MAANDEN[eigenTot]}`,
  }[periode];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[#2b3885]">Financiën {jaar}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {syncOp ? `Laatste sync: ${syncOp}` : "Nog niet gesynchroniseerd"}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {toonSyncLog && (
            <button onClick={() => setToonSyncLog(false)} className="text-xs text-gray-400 hover:text-gray-600">
              Log verbergen
            </button>
          )}
          <button
            onClick={startSync}
            disabled={syncing}
            className="px-4 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#1e2a6e] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {syncing ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Synchroniseren...
              </>
            ) : "↻ Synchroniseer"}
          </button>
        </div>
      </div>

      {/* Sync log */}
      {toonSyncLog && syncLog.length > 0 && (
        <div className="mb-4 bg-gray-900 rounded-lg p-3 max-h-32 overflow-y-auto font-mono text-xs text-green-400">
          {syncLog.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {/* Periodekiezer */}
      <div className="flex items-center gap-4 mb-5 flex-wrap">
        <div className="flex gap-0 border-b border-gray-200">
          {([
            ["deze_maand", "Deze maand"],
            ["vorige_maand", "Vorige maand"],
            ["dit_jaar", "Dit jaar"],
            ["eigen", "Eigen periode"],
          ] as [Periode, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setPeriode(id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                periode === id
                  ? "border-[#2b3885] text-[#2b3885]"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {periode === "eigen" && (
          <div className="flex items-center gap-2 text-sm">
            <select
              value={eigenVan}
              onChange={e => setEigenVan(Math.min(parseInt(e.target.value), eigenTot))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#2b3885]"
            >
              {MAANDEN_LANG.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <span className="text-gray-400">t/m</span>
            <select
              value={eigenTot}
              onChange={e => setEigenTot(Math.max(parseInt(e.target.value), eigenVan))}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-[#2b3885]"
            >
              {MAANDEN_LANG.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label={`Inkomsten — ${kpiLabel}`} waarde={periodeInkomsten} kleur="text-green-700" />
        <KpiCard label={`Kosten — ${kpiLabel}`} waarde={periodeKosten} kleur="text-red-600" />
        <KpiCard label={`Resultaat — ${kpiLabel}`} waarde={periodeResultaat} kleur={periodeResultaat >= 0 ? "text-[#2b3885]" : "text-red-600"} />
        <KpiCard label="Winstmarge" waarde={null} extra={`${periodeMarge.toFixed(1)}%`} kleur="text-gray-700" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 border-b border-gray-200">
        {([["inkomsten", "Inkomsten"], ["kosten", "Kosten"], ["pl", "P&L"]] as [TabId, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActieveTab(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              actieveTab === id
                ? "border-[#2b3885] text-[#2b3885]"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Inkomsten */}
      {actieveTab === "inkomsten" && commissies && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Commissies per woning</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 min-w-[180px]">Woning</th>
                  {maandIndices.map(i => (
                    <th key={i} className={`text-right py-2 px-2 font-medium w-14 ${i === huidigeMaand ? "text-[#2b3885]" : "text-gray-500"}`}>
                      {MAANDEN[i]}
                    </th>
                  ))}
                  {maandIndices.length > 1 && (
                    <th className="text-right py-2 px-3 font-semibold text-gray-700 w-20">Totaal</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {commissies.listings.map(l => {
                  const totaal = sumIndices(l.maanden, maandIndices);
                  return (
                    <tr key={l.listing_id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-700 truncate max-w-[180px]">{l.listing_naam}</td>
                      {maandIndices.map(i => (
                        <td key={i} className={`text-right py-2 px-2 ${l.maanden[i] === 0 ? "text-gray-300" : "text-gray-700"}`}>
                          {l.maanden[i] === 0 ? "—" : eur(l.maanden[i])}
                        </td>
                      ))}
                      {maandIndices.length > 1 && (
                        <td className="text-right py-2 px-3 font-semibold text-gray-800">{eur(totaal)}</td>
                      )}
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 bg-blue-50 font-semibold">
                  <td className="py-2 px-3 text-[#2b3885]">Commissies totaal</td>
                  {maandIndices.map(i => {
                    const v = commissies.totaal_per_maand[i] ?? 0;
                    return <td key={i} className="text-right py-2 px-2 text-[#2b3885]">{v === 0 ? "—" : eur(v)}</td>;
                  })}
                  {maandIndices.length > 1 && (
                    <td className="text-right py-2 px-3 text-[#2b3885]">
                      {eur(sumIndices(commissies.totaal_per_maand, maandIndices))}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Overige inkomsten */}
          {overzicht && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-700">Overige inkomsten</h2>
                <button
                  onClick={() => setNieuwOverig(true)}
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
                >
                  + Toevoegen
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left py-2 px-3 font-medium text-gray-600 min-w-[180px]">Inkomstenbron</th>
                      {maandIndices.map(i => (
                        <th key={i} className="text-right py-2 px-2 font-medium text-gray-500 w-14">{MAANDEN[i]}</th>
                      ))}
                      {maandIndices.length > 1 && (
                        <th className="text-right py-2 px-3 font-semibold text-gray-700 w-20">Totaal</th>
                      )}
                      <th className="w-16" />
                    </tr>
                  </thead>
                  <tbody>
                    {overig.map(o => {
                      const maanden = [o.jan,o.feb,o.mrt,o.apr,o.mei,o.jun,o.jul,o.aug,o.sep,o.okt,o.nov,o.dec];
                      const totaal = sumIndices(maanden, maandIndices);
                      return (
                        <tr key={o.id} className="border-t border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-700">{o.naam}</td>
                          {maandIndices.map(i => (
                            <td key={i} className={`text-right py-2 px-2 ${maanden[i] === 0 ? "text-gray-300" : "text-gray-700"}`}>
                              {maanden[i] === 0 ? "—" : eur(maanden[i])}
                            </td>
                          ))}
                          {maandIndices.length > 1 && (
                            <td className="text-right py-2 px-3 font-semibold text-gray-800">{eur(totaal)}</td>
                          )}
                          <td className="text-right py-2 px-3">
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => setBewerkOverig(o)} className="text-gray-400 hover:text-[#2b3885]">✏️</button>
                              <button onClick={() => verwijderOverig(o.id)} className="text-gray-400 hover:text-red-500">🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-gray-300 bg-blue-50 font-semibold">
                      <td className="py-2 px-3 text-[#2b3885]">Totaal inkomsten</td>
                      {maandIndices.map(i => {
                        const v = overzicht.inkomsten_per_maand[i] ?? 0;
                        return <td key={i} className="text-right py-2 px-2 text-[#2b3885]">{v === 0 ? "—" : eur(v)}</td>;
                      })}
                      {maandIndices.length > 1 && (
                        <td className="text-right py-2 px-3 text-[#2b3885]">
                          {eur(sumIndices(overzicht.inkomsten_per_maand, maandIndices))}
                        </td>
                      )}
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Kosten */}
      {actieveTab === "kosten" && overzicht && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Kostenposten {jaar}</h2>
            <button
              onClick={() => setNieuwKosten(true)}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors"
            >
              + Nieuwe kostenpost
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-600 min-w-[160px]">Kostenpost</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-600">Categorie</th>
                  {maandIndices.map(i => (
                    <th key={i} className="text-right py-2 px-2 font-medium text-gray-500 w-12">{MAANDEN[i]}</th>
                  ))}
                  {maandIndices.length > 1 && (
                    <th className="text-right py-2 px-3 font-semibold text-gray-700 w-20">Totaal</th>
                  )}
                  <th className="w-16" />
                </tr>
              </thead>
              <tbody>
                {kosten.filter(k => k.actief).map(k => {
                  const maandBedragen = berekenKostenMaanden(k);
                  const totaal = sumIndices(maandBedragen, maandIndices);
                  return (
                    <tr key={k.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3 text-gray-700">{k.naam}</td>
                      <td className="py-2 px-3 text-gray-500">{k.categorie}</td>
                      {maandIndices.map(i => (
                        <td key={i} className={`text-right py-2 px-2 ${maandBedragen[i] === 0 ? "text-gray-300" : "text-red-600"}`}>
                          {maandBedragen[i] === 0 ? "—" : eur(maandBedragen[i])}
                        </td>
                      ))}
                      {maandIndices.length > 1 && (
                        <td className="text-right py-2 px-3 font-semibold text-red-700">{eur(totaal)}</td>
                      )}
                      <td className="text-right py-2 px-3">
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setBewerkKosten(k)} className="text-gray-400 hover:text-[#2b3885]">✏️</button>
                          <button onClick={() => verwijderKosten(k.id)} className="text-gray-400 hover:text-red-500">🗑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-300 bg-red-50 font-semibold">
                  <td className="py-2 px-3 text-red-700" colSpan={2}>Totaal kosten</td>
                  {maandIndices.map(i => {
                    const v = overzicht.kosten_per_maand[i] ?? 0;
                    return <td key={i} className="text-right py-2 px-2 text-red-700">{v === 0 ? "—" : eur(v)}</td>;
                  })}
                  {maandIndices.length > 1 && (
                    <td className="text-right py-2 px-3 text-red-700">
                      {eur(sumIndices(overzicht.kosten_per_maand, maandIndices))}
                    </td>
                  )}
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: P&L */}
      {actieveTab === "pl" && overzicht && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 font-medium text-gray-600 min-w-[160px]">Rubriek</th>
                {maandIndices.map(i => (
                  <th key={i} className={`text-right py-2 px-2 font-medium w-16 ${i === huidigeMaand ? "text-[#2b3885]" : "text-gray-500"}`}>
                    {MAANDEN[i]}
                  </th>
                ))}
                {maandIndices.length > 1 && (
                  <th className="text-right py-2 px-3 font-semibold text-gray-700">Totaal</th>
                )}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 bg-green-50">
                <td className="py-2 px-3 font-semibold text-green-800">Inkomsten</td>
                {maandIndices.map(i => {
                  const v = overzicht.inkomsten_per_maand[i] ?? 0;
                  return <td key={i} className="text-right py-2 px-2 font-semibold text-green-700">{v === 0 ? "—" : eur(v)}</td>;
                })}
                {maandIndices.length > 1 && (
                  <td className="text-right py-2 px-3 font-bold text-green-700">{eur(periodeInkomsten)}</td>
                )}
              </tr>
              <tr className="border-t border-gray-200 bg-red-50">
                <td className="py-2 px-3 font-semibold text-red-700">Kosten</td>
                {maandIndices.map(i => {
                  const v = overzicht.kosten_per_maand[i] ?? 0;
                  return <td key={i} className="text-right py-2 px-2 font-semibold text-red-600">{v === 0 ? "—" : eur(v)}</td>;
                })}
                {maandIndices.length > 1 && (
                  <td className="text-right py-2 px-3 font-bold text-red-700">{eur(periodeKosten)}</td>
                )}
              </tr>
              <tr className="border-t-2 border-gray-400 bg-blue-50">
                <td className="py-2 px-3 font-bold text-[#2b3885]">Resultaat</td>
                {maandIndices.map(i => {
                  const v = overzicht.resultaat_per_maand[i] ?? 0;
                  return (
                    <td key={i} className={`text-right py-2 px-2 font-bold ${v >= 0 ? "text-[#2b3885]" : "text-red-600"}`}>
                      {eur(v)}
                    </td>
                  );
                })}
                {maandIndices.length > 1 && (
                  <td className={`text-right py-2 px-3 font-bold ${periodeResultaat >= 0 ? "text-[#2b3885]" : "text-red-600"}`}>
                    {eur(periodeResultaat)}
                  </td>
                )}
              </tr>
              <tr className="border-t border-gray-200">
                <td className="py-2 px-3 text-gray-500">Marge %</td>
                {maandIndices.map(i => {
                  const ink = overzicht.inkomsten_per_maand[i] ?? 0;
                  const res = overzicht.resultaat_per_maand[i] ?? 0;
                  const marge = ink > 0 ? (res / ink) * 100 : 0;
                  return (
                    <td key={i} className={`text-right py-2 px-2 ${marge >= 0 ? "text-gray-600" : "text-red-500"}`}>
                      {ink === 0 ? "—" : `${marge.toFixed(0)}%`}
                    </td>
                  );
                })}
                {maandIndices.length > 1 && (
                  <td className="text-right py-2 px-3 text-gray-600">{periodeMarge.toFixed(1)}%</td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {(bewerkKosten || nieuwKosten) && (
        <KostenModal
          kosten={bewerkKosten}
          onOpslaan={slaKostenOp}
          onSluiten={() => { setBewerkKosten(null); setNieuwKosten(false); }}
        />
      )}
      {(bewerkOverig || nieuwOverig) && (
        <OverigModal
          overig={bewerkOverig}
          onOpslaan={slaOverigOp}
          onSluiten={() => { setBewerkOverig(null); setNieuwOverig(false); }}
        />
      )}
    </div>
  );
}

function KpiCard({ label, waarde, extra, kleur }: {
  label: string; waarde: number | null; extra?: string; kleur: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className={`text-xl font-bold ${kleur}`}>
        {waarde !== null ? eur(waarde) : extra}
      </div>
    </div>
  );
}

function berekenKostenMaanden(k: Kostenpost): number[] {
  const result = Array(12).fill(0);
  switch (k.frequentie) {
    case "maandelijks": {
      const van = (k.van_maand ?? 1) - 1;
      const tot = (k.tot_maand ?? 12) - 1;
      for (let m = van; m <= tot; m++) result[m] = k.bedrag;
      break;
    }
    case "jaarlijks":
    case "eenmalig": {
      const m = (k.betaalmaand ?? 1) - 1;
      result[m] = k.bedrag;
      break;
    }
    case "kwartaal": {
      const start = (k.betaalmaand ?? 1) - 1;
      for (let q = 0; q < 4; q++) result[(start + q * 3) % 12] += k.bedrag;
      break;
    }
  }
  return result;
}

function KostenModal({ kosten, onOpslaan, onSluiten }: {
  kosten: Kostenpost | null;
  onOpslaan: (d: Partial<Kostenpost>) => Promise<void>;
  onSluiten: () => void;
}) {
  const [form, setForm] = useState({
    naam: kosten?.naam ?? "",
    categorie: kosten?.categorie ?? "Software",
    bedrag: String(kosten?.bedrag ?? ""),
    frequentie: kosten?.frequentie ?? "maandelijks",
    betaalmaand: String(kosten?.betaalmaand ?? ""),
    van_maand: String(kosten?.van_maand ?? "1"),
    tot_maand: String(kosten?.tot_maand ?? "12"),
  });
  const [bezig, setBezig] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    await onOpslaan({
      naam: form.naam,
      categorie: form.categorie,
      bedrag: parseFloat(form.bedrag),
      frequentie: form.frequentie,
      betaalmaand: form.betaalmaand ? parseInt(form.betaalmaand) : null,
      van_maand: form.van_maand ? parseInt(form.van_maand) : null,
      tot_maand: form.tot_maand ? parseInt(form.tot_maand) : null,
      actief: true,
    });
    setBezig(false);
  }

  return (
    <Modal titel={kosten ? "Kostenpost bewerken" : "Nieuwe kostenpost"} onSluiten={onSluiten}>
      <form onSubmit={submit} className="space-y-3">
        <Veld label="Naam">
          <input className={invoerKlasse} value={form.naam} onChange={e => setForm({...form, naam: e.target.value})} required />
        </Veld>
        <Veld label="Categorie">
          <select className={invoerKlasse} value={form.categorie} onChange={e => setForm({...form, categorie: e.target.value})}>
            {CATEGORIEEN.map(c => <option key={c}>{c}</option>)}
          </select>
        </Veld>
        <Veld label="Bedrag (€)">
          <input type="number" step="0.01" className={invoerKlasse} value={form.bedrag} onChange={e => setForm({...form, bedrag: e.target.value})} required />
        </Veld>
        <Veld label="Frequentie">
          <select className={invoerKlasse} value={form.frequentie} onChange={e => setForm({...form, frequentie: e.target.value})}>
            {FREQUENTIES.map(f => <option key={f}>{f}</option>)}
          </select>
        </Veld>
        {(form.frequentie === "jaarlijks" || form.frequentie === "eenmalig") && (
          <Veld label="Betaalmaand (1-12)">
            <input type="number" min={1} max={12} className={invoerKlasse} value={form.betaalmaand} onChange={e => setForm({...form, betaalmaand: e.target.value})} />
          </Veld>
        )}
        {form.frequentie === "maandelijks" && (
          <div className="flex gap-3">
            <Veld label="Vanaf maand">
              <input type="number" min={1} max={12} className={invoerKlasse} value={form.van_maand} onChange={e => setForm({...form, van_maand: e.target.value})} />
            </Veld>
            <Veld label="Tot en met maand">
              <input type="number" min={1} max={12} className={invoerKlasse} value={form.tot_maand} onChange={e => setForm({...form, tot_maand: e.target.value})} />
            </Veld>
          </div>
        )}
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={bezig} className="flex-1 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#1e2a6e] disabled:opacity-50">
            {bezig ? "Opslaan..." : "Opslaan"}
          </button>
          <button type="button" onClick={onSluiten} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Annuleren
          </button>
        </div>
      </form>
    </Modal>
  );
}

function OverigModal({ overig, onOpslaan, onSluiten }: {
  overig: OverigInkomsten | null;
  onOpslaan: (d: Partial<OverigInkomsten>) => Promise<void>;
  onSluiten: () => void;
}) {
  const leeg = { jan: 0, feb: 0, mrt: 0, apr: 0, mei: 0, jun: 0, jul: 0, aug: 0, sep: 0, okt: 0, nov: 0, dec: 0 };
  const [naam, setNaam] = useState(overig?.naam ?? "");
  const [maanden, setMaanden] = useState<Record<string, number>>(
    overig ? { jan: overig.jan, feb: overig.feb, mrt: overig.mrt, apr: overig.apr, mei: overig.mei, jun: overig.jun,
                jul: overig.jul, aug: overig.aug, sep: overig.sep, okt: overig.okt, nov: overig.nov, dec: overig.dec }
    : { ...leeg }
  );
  const [bezig, setBezig] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    await onOpslaan({ naam, ...maanden });
    setBezig(false);
  }

  return (
    <Modal titel={overig ? "Inkomstenbron bewerken" : "Nieuwe inkomstenbron"} onSluiten={onSluiten}>
      <form onSubmit={submit} className="space-y-3">
        <Veld label="Naam">
          <input className={invoerKlasse} value={naam} onChange={e => setNaam(e.target.value)} required />
        </Veld>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Bedragen per maand (€)</label>
          <div className="grid grid-cols-4 gap-2">
            {MAANDEN.map(m => (
              <div key={m}>
                <span className="text-xs text-gray-500">{m}</span>
                <input
                  type="number"
                  step="0.01"
                  className="w-full text-xs border border-gray-200 rounded px-2 py-1 mt-0.5"
                  value={maanden[m] ?? 0}
                  onChange={e => setMaanden({...maanden, [m]: parseFloat(e.target.value) || 0})}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={bezig} className="flex-1 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#1e2a6e] disabled:opacity-50">
            {bezig ? "Opslaan..." : "Opslaan"}
          </button>
          <button type="button" onClick={onSluiten} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Annuleren
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Modal({ titel, children, onSluiten }: { titel: string; children: React.ReactNode; onSluiten: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onSluiten}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-5 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">{titel}</h3>
          <button onClick={onSluiten} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Veld({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

const invoerKlasse = "w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]";
