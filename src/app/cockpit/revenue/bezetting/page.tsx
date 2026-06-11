"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Listing {
  id: string;
  name: string;
  interneNaam: string;
  city_name: string | null;
  no_of_bedrooms: number;
  base: number | null;
  min: number | null;
  max: number | null;
  recommended_base_price: number | null;
  occupancy_next_15: string;
  occupancy_next_30: string;
  occupancy_next_60: string;
  occupancy_next_90: string;
  market_occupancy_next_15: string;
  market_occupancy_next_30: string;
  market_occupancy_next_60: string;
  market_occupancy_next_90: string;
  booking_pickup_unique_past_3: number;
  booking_pickup_unique_past_30: number;
  last_date_pushed: string | null;
  occupancy_next_7: string;
  market_occupancy_next_7: string;
  blt_gemiddeld?: number;
  blt_mediaan?: number;
  blt_p7?: number | null;
  blt_p15?: number | null;
  blt_p30?: number | null;
  blt_p60?: number | null;
  blt_p90?: number | null;
  blt_avg_occ?: number | null;
}

function parseOcc(val: string) {
  return parseInt(val?.replace("%", "").trim() || "0", 10);
}

// Verwachte bezetting op horizon T obv BLT-boekingscurve
function verwachteOcc(l: Listing, horizon: 7 | 15 | 30 | 60 | 90): number | null {
  const pMap: Record<number, number | null | undefined> = {
    7: l.blt_p7, 15: l.blt_p15, 30: l.blt_p30, 60: l.blt_p60, 90: l.blt_p90,
  };
  const p = pMap[horizon];
  const avgOcc = l.blt_avg_occ;
  if (p == null || avgOcc == null || avgOcc === 0) return null;
  return Math.round(avgOcc * p * 100);
}

function PacingBadge({ own, market }: { own: number; market: number }) {
  const delta = own - market;
  if (delta >= 5) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded">
      +{delta}%
    </span>
  );
  if (delta <= -5) return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-red-700 bg-red-50 px-1.5 py-0.5 rounded">
      {delta}%
    </span>
  );
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
      {delta > 0 ? "+" : ""}{delta}%
    </span>
  );
}

function OccCell({ own, market, verwacht }: { own: string; market: string; verwacht?: number | null }) {
  const o = parseOcc(own);
  const m = parseOcc(market);
  return (
    <div className="text-center">
      <div className="font-medium text-gray-900 text-sm">{o}%</div>
      {verwacht != null ? (
        <div className="text-xs text-purple-500">{verwacht}%</div>
      ) : (
        <div className="text-xs text-gray-400">{m}%</div>
      )}
      <PacingBadge own={o} market={verwacht != null ? verwacht : m} />
    </div>
  );
}

function InlinePrice({
  listingId,
  field,
  value,
  onSave,
}: {
  listingId: string;
  field: "base" | "min" | "max";
  value: number | null;
  onSave: (id: string, field: string, val: number) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n > 0 && n !== value) {
      setEditing(false);
      setStatus("saving");
      await onSave(listingId, field, n);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2000);
    } else {
      setEditing(false);
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
        className="w-16 text-center text-sm border border-[#2b3885] rounded px-1 py-0.5 focus:outline-none"
      />
    );
  }

  if (status === "saving") {
    return <span className="text-xs text-gray-400 animate-pulse">opslaan…</span>;
  }

  if (status === "saved") {
    return <span className="text-xs text-green-600 font-medium">✓ opgeslagen</span>;
  }

  return (
    <button
      onClick={() => { setDraft(String(value ?? "")); setEditing(true); }}
      className="text-sm text-gray-700 hover:text-[#2b3885] hover:underline transition-colors"
      title="Klik om te bewerken"
    >
      {value != null ? `€${value}` : <span className="text-gray-300">—</span>}
    </button>
  );
}

type ActieType = "basisprijs" | "minimumprijs" | "dso_percent" | "dso_fixed";
type ConditieType = "bezetting_onder" | "bezetting_boven" | "pricelabs_advies" | "geen_pickup" | "prijs_niet_updated" | "blt_kort" | "blt_lang" | "eigen_tempo_achter" | "eigen_tempo_voor";

interface TriggerConditie {
  conditie: ConditieType;
  periode?: number;       // voor bezetting_onder/boven: 7, 15, 30, 60, 90
  drempel_pct?: number;   // percentage drempel
  dagen?: number;         // voor geen_pickup / prijs_niet_updated
}

interface Aanbeveling {
  listing_id: string;
  trigger_type: string;
  naam: string;
  reden: string;
  uitleg: string;
  actie: string;
  actie_type: ActieType;
  veld: "base" | "min" | "max";
  huidigeWaarde: number | null;
  nieuweWaarde: number;
  prioriteit: "hoog" | "middel";
  dso_periode?: number;
  dso_price_type?: "percent" | "fixed";
}

interface Trigger {
  trigger_type: string;
  conditie: string;       // legacy - nog steeds gebruikt als fallback
  condities?: TriggerConditie[];  // nieuwe multi-conditie array
  enabled: boolean;
  drempel_pct: number;
  aanpassing_pct: number;
  label: string;
  actie_type: ActieType;
  dso_periode: number;
  dso_price_type: "percent" | "fixed";
}

const DEFAULT_TRIGGERS: Trigger[] = [
  { trigger_type: "bezetting_15d_onder", conditie: "bezetting_15d_onder", enabled: true, drempel_pct: 15, aanpassing_pct: -10, label: "Bezetting 15 dagen > X% onder markt", actie_type: "basisprijs", dso_periode: 15, dso_price_type: "percent" },
  { trigger_type: "bezetting_30d_onder", conditie: "bezetting_30d_onder", enabled: true, drempel_pct: 10, aanpassing_pct: -5, label: "Bezetting 30 dagen > X% onder markt", actie_type: "basisprijs", dso_periode: 30, dso_price_type: "percent" },
  { trigger_type: "bezetting_voor_markt", conditie: "bezetting_voor_markt", enabled: true, drempel_pct: 15, aanpassing_pct: 10, label: "Bezetting loopt > X% voor op markt", actie_type: "basisprijs", dso_periode: 15, dso_price_type: "percent" },
  { trigger_type: "pricelabs_advies", conditie: "pricelabs_advies", enabled: true, drempel_pct: 12, aanpassing_pct: 0, label: "PriceLabs advies > X% afwijkend", actie_type: "basisprijs", dso_periode: 15, dso_price_type: "percent" },
  { trigger_type: "geen_pickup", conditie: "geen_pickup", enabled: true, drempel_pct: 5, aanpassing_pct: -5, label: "Geen nieuwe boekingen + bezetting achter", actie_type: "basisprijs", dso_periode: 30, dso_price_type: "percent" },
];

function getOccByPeriode(l: Listing, periode: number): number {
  const map: Record<number, string> = { 7: l.occupancy_next_7, 15: l.occupancy_next_15, 30: l.occupancy_next_30, 60: l.occupancy_next_60, 90: l.occupancy_next_90 };
  return parseOcc(map[periode] ?? "0");
}
function getMktByPeriode(l: Listing, periode: number): number {
  const map: Record<number, string> = { 7: l.market_occupancy_next_7, 15: l.market_occupancy_next_15, 30: l.market_occupancy_next_30, 60: l.market_occupancy_next_60, 90: l.market_occupancy_next_90 };
  return parseOcc(map[periode] ?? "0");
}

function checkConditie(l: Listing, c: TriggerConditie): boolean {
  const { conditie, periode = 30, drempel_pct = 10, dagen = 3 } = c;
  switch (conditie) {
    case "bezetting_onder": {
      const delta = getOccByPeriode(l, periode) - getMktByPeriode(l, periode);
      return delta <= -drempel_pct;
    }
    case "bezetting_boven": {
      const delta = getOccByPeriode(l, periode) - getMktByPeriode(l, periode);
      return delta >= drempel_pct;
    }
    case "pricelabs_advies": {
      const { base, recommended_base_price: rec } = l;
      return !!(rec && base && rec > base * (1 + drempel_pct / 100));
    }
    case "geen_pickup": {
      return dagen <= 3 ? l.booking_pickup_unique_past_3 === 0 : l.booking_pickup_unique_past_30 === 0;
    }
    case "prijs_niet_updated": {
      if (!l.last_date_pushed) return true;
      const daysSince = (Date.now() - new Date(l.last_date_pushed).getTime()) / 86400000;
      return daysSince >= dagen;
    }
    case "blt_kort": {
      // BLT mediaan is korter dan X dagen (last-minute woning)
      const blt = l.blt_mediaan ?? l.blt_gemiddeld ?? 999;
      return blt <= (drempel_pct ?? 30);
    }
    case "blt_lang": {
      const blt = l.blt_mediaan ?? l.blt_gemiddeld ?? 0;
      return blt >= (drempel_pct ?? 60);
    }
    case "eigen_tempo_achter": {
      const verwacht = verwachteOcc(l, (periode ?? 30) as 7 | 15 | 30 | 60 | 90);
      if (verwacht == null || verwacht === 0) return false;
      const eigen = getOccByPeriode(l, periode ?? 30);
      return (verwacht - eigen) >= (drempel_pct ?? 10);
    }
    case "eigen_tempo_voor": {
      const verwacht = verwachteOcc(l, (periode ?? 30) as 7 | 15 | 30 | 60 | 90);
      if (verwacht == null) return false;
      const eigen = getOccByPeriode(l, periode ?? 30);
      return (eigen - verwacht) >= (drempel_pct ?? 10);
    }
  }
  return false;
}

function conditieTekst(c: TriggerConditie): string {
  switch (c.conditie) {
    case "bezetting_onder": return `bezetting komende ${c.periode ?? 30}d meer dan ${c.drempel_pct ?? 10}% onder markt`;
    case "bezetting_boven": return `bezetting komende ${c.periode ?? 30}d meer dan ${c.drempel_pct ?? 10}% boven markt`;
    case "pricelabs_advies": return `PriceLabs advies meer dan ${c.drempel_pct ?? 10}% hoger`;
    case "geen_pickup": return `geen nieuwe boekingen in ${c.dagen ?? 3} dagen`;
    case "prijs_niet_updated": return `prijs meer dan ${c.dagen ?? 3} dagen niet geüpdated`;
    case "blt_kort": return `gemiddelde boekingstijd < ${c.drempel_pct ?? 30} dagen (last-minute woning)`;
    case "blt_lang": return `gemiddelde boekingstijd > ${c.drempel_pct ?? 60} dagen (ver vooruit geboekt)`;
    case "eigen_tempo_achter": return `bezetting ${c.periode ?? 30}d loopt ${c.drempel_pct ?? 10}% achter op eigen historisch tempo`;
    case "eigen_tempo_voor": return `bezetting ${c.periode ?? 30}d loopt ${c.drempel_pct ?? 10}% voor op eigen historisch tempo`;
    default: return c.conditie;
  }
}

function berekenAanbevelingen(listings: Listing[], triggers: Trigger[]): Aanbeveling[] {
  const actief = triggers.filter(t => t.enabled);
  // Legacy: triggers zonder condities array gebruiken de oude conditie-veld aanpak
  const byConditie = (c: string) => actief.filter(t => !t.condities?.length && (t.conditie ?? t.trigger_type) === c);
  const aanbevelingen: Aanbeveling[] = [];

  for (const l of listings) {
    const naam = l.interneNaam || l.name.split("--")[0].trim();
    const d15 = parseOcc(l.occupancy_next_15) - parseOcc(l.market_occupancy_next_15);
    const d30 = parseOcc(l.occupancy_next_30) - parseOcc(l.market_occupancy_next_30);
    const base = l.base;
    const rec = l.recommended_base_price;
    const pickup3 = l.booking_pickup_unique_past_3;

    const maakActieTekst = (t: Trigger, base: number, rec?: number | null): { actie: string; veld: "base" | "min" | "max"; nieuw: number } => {
      const at = t.actie_type ?? "basisprijs";
      if (at === "dso_percent") return { actie: `DSO: ${t.aanpassing_pct}% op alle vrije datums komende ${t.dso_periode}d`, veld: "base", nieuw: t.aanpassing_pct };
      if (at === "dso_fixed") return { actie: `DSO: vaste prijs €${t.aanpassing_pct} op alle vrije datums komende ${t.dso_periode}d`, veld: "base", nieuw: t.aanpassing_pct };
      if (at === "minimumprijs") { const n = Math.round(base * (1 + t.aanpassing_pct / 100)); return { actie: `${t.aanpassing_pct < 0 ? "Verlaag" : "Verhoog"} minimumprijs naar €${n} (${t.aanpassing_pct}%)`, veld: "min", nieuw: n }; }
      // basisprijs (default)
      if (rec && t.conditie === "pricelabs_advies") return { actie: `Stel basisprijs in op €${rec} (PriceLabs advies)`, veld: "base", nieuw: rec };
      const n = Math.round(base * (1 + t.aanpassing_pct / 100));
      return { actie: `${t.aanpassing_pct < 0 ? "Verlaag" : "Verhoog"} basisprijs van €${base} naar €${n} (${t.aanpassing_pct}%)`, veld: "base", nieuw: n };
    };

    const own15 = parseOcc(l.occupancy_next_15), mkt15 = parseOcc(l.market_occupancy_next_15);
    const own30 = parseOcc(l.occupancy_next_30), mkt30 = parseOcc(l.market_occupancy_next_30);
    const own60 = parseOcc(l.occupancy_next_60), mkt60 = parseOcc(l.market_occupancy_next_60);

    for (const t of byConditie("bezetting_15d_onder")) {
      if (d15 <= -t.drempel_pct && base) {
        const { actie, veld, nieuw } = maakActieTekst(t, base);
        aanbevelingen.push({
          listing_id: l.id, trigger_type: t.trigger_type, naam, prioriteit: "hoog", actie_type: t.actie_type ?? "basisprijs",
          dso_periode: t.dso_periode, dso_price_type: t.dso_price_type,
          reden: `15d bezetting: ${own15}% eigen — ${mkt15}% markt (${d15}%)`,
          uitleg: `De komende 15 dagen staat de bezetting op ${own15}% terwijl de markt op ${mkt15}% zit. Een achterstand van ${Math.abs(d15)}% wijst op te hoge prijsstelling of gebrek aan zichtbaarheid.`,
          actie, veld, huidigeWaarde: base, nieuweWaarde: nieuw,
        });
      }
    }

    for (const t of byConditie("bezetting_30d_onder")) {
      if (d30 <= -t.drempel_pct && base && !aanbevelingen.some(a => a.listing_id === l.id && a.trigger_type === t.trigger_type)) {
        const { actie, veld, nieuw } = maakActieTekst(t, base);
        aanbevelingen.push({
          listing_id: l.id, trigger_type: t.trigger_type, naam, prioriteit: "middel", actie_type: t.actie_type ?? "basisprijs",
          dso_periode: t.dso_periode, dso_price_type: t.dso_price_type,
          reden: `30d bezetting: ${own30}% eigen — ${mkt30}% markt (${d30}%)`,
          uitleg: `De komende 30 dagen zit de bezetting op ${own30}% versus ${mkt30}% in de markt. Een verlaging van ${Math.abs(t.aanpassing_pct)}% geeft een competitiever profiel.`,
          actie, veld, huidigeWaarde: base, nieuweWaarde: nieuw,
        });
      }
    }

    for (const t of byConditie("bezetting_voor_markt")) {
      if (d15 >= t.drempel_pct && d30 >= t.drempel_pct / 2 && base && !aanbevelingen.some(a => a.listing_id === l.id && a.trigger_type === t.trigger_type)) {
        const { actie, veld, nieuw } = maakActieTekst(t, base);
        aanbevelingen.push({
          listing_id: l.id, trigger_type: t.trigger_type, naam, prioriteit: "middel", actie_type: t.actie_type ?? "basisprijs",
          dso_periode: t.dso_periode, dso_price_type: t.dso_price_type,
          reden: `15d bezetting: ${own15}% eigen — ${mkt15}% markt (+${d15}%)`,
          uitleg: `Met ${own15}% (15d) en ${own30}% (30d) bezetting tegenover ${mkt15}% en ${mkt30}% marktgemiddelde loopt deze woning duidelijk voor. Er is ruimte de prijs te verhogen zonder bezetting te verliezen.`,
          actie, veld, huidigeWaarde: base, nieuweWaarde: nieuw,
        });
      }
    }

    for (const t of byConditie("pricelabs_advies")) {
      if (rec && base && rec > base * (1 + t.drempel_pct / 100) && !aanbevelingen.some(a => a.listing_id === l.id && a.trigger_type === t.trigger_type)) {
        const { actie, veld, nieuw } = maakActieTekst(t, base, rec);
        const pctAfwijking = Math.round(((rec - base) / base) * 100);
        aanbevelingen.push({
          listing_id: l.id, trigger_type: t.trigger_type, naam, prioriteit: "middel", actie_type: t.actie_type ?? "basisprijs",
          dso_periode: t.dso_periode, dso_price_type: t.dso_price_type,
          reden: `PriceLabs advies: €${rec} — huidig €${base} (+${pctAfwijking}%)`,
          uitleg: `PriceLabs berekent op basis van marktdata een aanbevolen basisprijs van €${rec}, wat ${pctAfwijking}% hoger is dan de huidige €${base}. Dit wijst op toegenomen vraag in dit marktsegment.`,
          actie, veld, huidigeWaarde: base, nieuweWaarde: nieuw,
        });
      }
    }

    for (const t of byConditie("geen_pickup")) {
      if (pickup3 === 0 && d30 <= -t.drempel_pct && base && !aanbevelingen.some(a => a.listing_id === l.id && a.trigger_type === t.trigger_type)) {
        const { actie, veld, nieuw } = maakActieTekst(t, base);
        aanbevelingen.push({
          listing_id: l.id, trigger_type: t.trigger_type, naam, prioriteit: "middel", actie_type: t.actie_type ?? "basisprijs",
          dso_periode: t.dso_periode, dso_price_type: t.dso_price_type,
          reden: `0 nieuwe boekingen (3d) — 30d: ${own30}% eigen vs ${mkt30}% markt (${d30}%)`,
          uitleg: `Geen nieuwe boekingen in 3 dagen en de 30-daagse bezetting ligt ${Math.abs(d30)}% onder de markt (${own30}% vs ${mkt30}%). Een verlaging van ${Math.abs(t.aanpassing_pct)}% prikkelt de zoekalgoritmens.`,
          actie, veld, huidigeWaarde: base, nieuweWaarde: nieuw,
        });
      }
    }

    // Nieuwe multi-conditie triggers (AND logica)
    for (const t of actief.filter(tr => tr.condities && tr.condities.length > 0)) {
      if (aanbevelingen.some(a => a.listing_id === l.id && a.trigger_type === t.trigger_type)) continue;
      const base = l.base;
      if (!base) continue;

      const alleVoldaan = t.condities!.every(c => checkConditie(l, c));
      if (!alleVoldaan) continue;

      const { actie, veld, nieuw } = maakActieTekst(t, base, l.recommended_base_price);
      const conditiesSamenvatting = t.condities!.map(conditieTekst).join(" én ");
      // Concrete bezettingscijfers toevoegen aan de uitleg
      const bezettingContext = `15d: ${own15}% eigen / ${mkt15}% markt — 30d: ${own30}% eigen / ${mkt30}% markt — 60d: ${own60}% eigen / ${mkt60}% markt`;
      aanbevelingen.push({
        listing_id: l.id, trigger_type: t.trigger_type, naam,
        prioriteit: t.drempel_pct >= 15 ? "hoog" : "middel",
        actie_type: t.actie_type ?? "basisprijs",
        dso_periode: t.dso_periode, dso_price_type: t.dso_price_type,
        reden: t.label,
        uitleg: `Alle condities voldaan: ${conditiesSamenvatting}. — ${bezettingContext}.`,
        actie, veld, huidigeWaarde: base, nieuweWaarde: nieuw,
      });
    }
  }

  return aanbevelingen.sort((a, b) => (a.prioriteit === "hoog" ? -1 : 1) - (b.prioriteit === "hoog" ? -1 : 1));
}

type StatusFilter = "in_afwachting" | "uitgevoerd" | "genegeerd";

export default function RevenuePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"naam" | "occ15" | "occ30" | "occ60">("naam");
  const [pendingPush, setPendingPush] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);
  type StatusRecord = { status: string; bijgewerkt_op: string };
  const [statussen, setStatussen] = useState<Map<string, StatusRecord>>(new Map());
  const [triggers, setTriggers] = useState<Trigger[]>(DEFAULT_TRIGGERS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("in_afwachting");
  const [vernieuwen, setVernieuwen] = useState(false);

  const [herberekeningBezig, setHerberekeningBezig] = useState(false);
  const [vergelijkMode, setVergelijkMode] = useState<"markt" | "blt">("markt");

  async function herbereken() {
    setHerberekeningBezig(true);
    await fetch("/api/cockpit/revenue/blt", { method: "POST" });
    await laadAlles(false);
    setHerberekeningBezig(false);
  }

  async function laadAlles(showLoader = false) {
    if (showLoader) setVernieuwen(true);
    await Promise.all([
      fetch("/api/cockpit/revenue/listings").then(r => r.json()).then((listingsData: Listing[]) => {
        setListings(listingsData);
      }),
      fetch("/api/cockpit/aanbevelingen/status").then(r => r.json())
        .then((rows: { listing_id: string; trigger_type: string; status: string; bijgewerkt_op: string }[]) => {
          setStatussen(new Map(rows.map(r => [
            `${r.listing_id}__${r.trigger_type}`,
            { status: r.status, bijgewerkt_op: r.bijgewerkt_op ?? "" }
          ])));
        }),
      fetch("/api/cockpit/aanbevelingen/triggers").then(r => r.json())
        .then((rows: Trigger[]) => { if (rows.length > 0) setTriggers(rows); }),
    ]);
    setLoading(false);
    if (showLoader) setVernieuwen(false);
  }

  useEffect(() => { laadAlles(); }, []);

  async function handlePriceSave(id: string, field: string, val: number): Promise<void> {
    const listing = listings.find((l) => l.id === id);
    const oudeWaarde = listing ? (listing as unknown as Record<string, unknown>)[field] : null;
    const res = await fetch(`/api/cockpit/revenue/listings/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: val, oude_waarden: { [field]: oudeWaarde }, skip_push: true }),
    });
    if (res.ok) {
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
      );
      setPendingPush((prev) => new Set(Array.from(prev).concat(id)));
    }
  }

  async function handlePush() {
    setPushing(true);
    const ids = Array.from(pendingPush);
    await Promise.all(ids.map(id => fetch(`/api/cockpit/revenue/listings/${id}/push`, { method: "POST" })));
    setPendingPush(new Set());
    setPushing(false);
  }

  async function updateStatus(listing_id: string, trigger_type: string, status: string) {
    const nu = new Date().toISOString();
    setStatussen(prev => new Map(prev).set(`${listing_id}__${trigger_type}`, { status, bijgewerkt_op: nu }));
    await fetch("/api/cockpit/aanbevelingen/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id, trigger_type, status }),
    });
  }

  const sorted = [...listings].sort((a, b) => {
    if (sortKey === "occ15") return parseOcc(b.occupancy_next_15) - parseOcc(a.occupancy_next_15);
    if (sortKey === "occ30") return parseOcc(b.occupancy_next_30) - parseOcc(a.occupancy_next_30);
    if (sortKey === "occ60") return parseOcc(b.occupancy_next_60) - parseOcc(a.occupancy_next_60);
    return (a.interneNaam || a.name).localeCompare(b.interneNaam || b.name);
  });

  return (
    <div>
      <div className="flex items-center gap-2 mb-5">
        <Link href="/cockpit/revenue" className="text-sm text-gray-400 hover:text-[#2b3885] transition-colors">
          ← Revenue
        </Link>
        <span className="text-gray-200">/</span>
        <span className="text-sm text-gray-600 font-medium">Bezetting</span>
        <div className="ml-auto flex items-center gap-4">
          <button onClick={herbereken} disabled={herberekeningBezig}
            className="text-xs text-gray-400 hover:text-[#2b3885] disabled:opacity-50 transition-colors"
            title="Herbereken BLT voor alle woningen (duurt ~30 sec)">
            {herberekeningBezig ? "BLT berekenen..." : "↻ BLT herbereken"}
          </button>
          {pendingPush.size > 0 && (
            <button
              onClick={handlePush}
              disabled={pushing}
              className="flex items-center gap-2 px-4 py-1.5 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-60 transition-colors animate-pulse-once"
            >
              {pushing ? (
                <>
                  <span className="animate-spin inline-block">↻</span>
                  Versturen...
                </>
              ) : (
                <>
                  ↑ Prijzen versturen ({pendingPush.size})
                </>
              )}
            </button>
          )}
          <Link href="/cockpit/revenue/logboek" className="text-xs text-[#2b3885] hover:underline">
            Logboek →
          </Link>
          <Link href="/cockpit/revenue/regels" className="text-xs text-[#2b3885] hover:underline">
            Automatiseringsregels →
          </Link>
        </div>
      </div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#2b3885]">Bezetting</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "Laden..." : `${listings.length} woningen · eigen% / markt% · klik op rij voor detail`}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>Sorteren:</span>
          {(["naam", "occ15", "occ30", "occ60"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              className={`px-2 py-1 rounded ${sortKey === k ? "bg-[#2b3885] text-white" : "bg-gray-100 hover:bg-gray-200"}`}
            >
              {k === "naam" ? "Naam" : k === "occ15" ? "15d" : k === "occ30" ? "30d" : "60d"}
            </button>
          ))}
        </div>
      </div>

      {/* Aanbevelingen */}
      {!loading && (() => {
        const COOLDOWN_UUR = 72;
        const nu = Date.now();

        // Meest recente actie per woning (over alle triggers)
        const laaststeActiePerListing = new Map<string, { tijdstip: Date; status: string }>();
        statussen.forEach((rec, key) => {
          if (!rec.bijgewerkt_op || rec.status === "in_afwachting") return;
          const lid = key.split("__")[0];
          const ts = new Date(rec.bijgewerkt_op);
          const huidig = laaststeActiePerListing.get(lid);
          if (!huidig || ts > huidig.tijdstip) laaststeActiePerListing.set(lid, { tijdstip: ts, status: rec.status });
        });

        // Woningen in cooldown (actie < 72u geleden)
        const inCooldown = new Set<string>();
        laaststeActiePerListing.forEach(({ tijdstip }, lid) => {
          const urenGelden = (nu - tijdstip.getTime()) / 3600000;
          if (urenGelden < COOLDOWN_UUR) inCooldown.add(lid);
        });

        const alle = berekenAanbevelingen(listings, triggers);

        // Pas cooldown toe: verberg in_afwachting aanbevelingen voor woningen in cooldown
        const gefilterd = alle.filter(a => {
          const rec = statussen.get(`${a.listing_id}__${a.trigger_type}`);
          const s = rec?.status ?? "in_afwachting";
          if (statusFilter === "in_afwachting" && inCooldown.has(a.listing_id)) return false;
          return s === statusFilter;
        });

        // Cooldown-woningen tonen als aparte sectie bij "in_afwachting"
        const cooldownLijst = statusFilter === "in_afwachting"
          ? Array.from(inCooldown).map(lid => {
              const l = listings.find(x => x.id === lid);
              const info = laaststeActiePerListing.get(lid)!;
              const urenGelden = Math.round((nu - info.tijdstip.getTime()) / 3600000);
              const resterend = COOLDOWN_UUR - urenGelden;
              return { lid, naam: l?.interneNaam || l?.name.split("--")[0].trim() || lid, resterend, status: info.status, tijdstip: info.tijdstip };
            })
          : [];

        const telPerStatus = {
          in_afwachting: alle.filter(a => {
            const rec = statussen.get(`${a.listing_id}__${a.trigger_type}`);
            return (rec?.status ?? "in_afwachting") === "in_afwachting" && !inCooldown.has(a.listing_id);
          }).length,
          uitgevoerd: alle.filter(a => statussen.get(`${a.listing_id}__${a.trigger_type}`)?.status === "uitgevoerd").length,
          genegeerd: alle.filter(a => statussen.get(`${a.listing_id}__${a.trigger_type}`)?.status === "genegeerd").length,
        };
        return (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700">Aanbevelingen</h2>
              <div className="flex items-center gap-3">
              <button
                onClick={() => laadAlles(true)}
                disabled={vernieuwen}
                className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-[#2b3885] disabled:opacity-50 transition-colors"
              >
                <span className={vernieuwen ? "animate-spin inline-block" : ""}>↻</span>
                {vernieuwen ? "Laden..." : "Vernieuwen"}
              </button>
              <div className="flex gap-1 text-xs">
                {(["in_afwachting", "uitgevoerd", "genegeerd"] as StatusFilter[]).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-full transition-colors ${statusFilter === s ? "bg-[#2b3885] text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                    {s === "in_afwachting" ? "In afwachting" : s === "uitgevoerd" ? "Uitgevoerd" : "Genegeerd"}
                    {telPerStatus[s] > 0 && <span className="ml-1 opacity-70">({telPerStatus[s]})</span>}
                  </button>
                ))}
              </div>
              </div>
            </div>
            {/* Subtiele cooldown info — alleen het aantal, geen details */}
            {statusFilter === "in_afwachting" && cooldownLijst.length > 0 && (
              <p className="text-xs text-gray-400 mb-3">
                ⏱ {cooldownLijst.length} {cooldownLijst.length === 1 ? "woning heeft" : "woningen hebben"} een actie ondergaan — nieuwe aanbeveling verschijnt na 72u.
              </p>
            )}

            {gefilterd.length === 0 ? (
              statusFilter === "in_afwachting" ? (
                <div className="bg-white border border-gray-200 rounded-xl px-6 py-8 flex items-center gap-6">
                  <img src="/boni-golf.png" alt="Boni" className="w-28 flex-shrink-0 object-contain" />
                  <div>
                    <p className="font-semibold text-gray-800 text-lg mb-1">Alles onder controle, je kunt gaan golfen.</p>
                    <p className="text-sm text-gray-400">Geen openstaande aanbevelingen op dit moment.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-400">
                  Geen aanbevelingen met status &apos;{statusFilter}&apos;.
                </div>
              )
            ) : (
              <div className="space-y-2">
                {gefilterd.map(a => (
                  <AanbevelingKaart
                    key={`${a.listing_id}__${a.trigger_type}`}
                    aanbeveling={a}
                    status={statusFilter}
                    bijgewerkt_op={statussen.get(`${a.listing_id}__${a.trigger_type}`)?.bijgewerkt_op}
                    onUitvoer={async () => {
                      await fetch("/api/cockpit/aanbevelingen/uitvoer", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          listing_id: a.listing_id,
                          actie_type: a.actie_type,
                          veld: a.veld,
                          nieuwe_waarde: a.nieuweWaarde,
                          dso_periode: a.dso_periode ?? 15,
                          aanpassing_pct: a.nieuweWaarde,
                          trigger_type: a.trigger_type,
                        }),
                      });
                      if (a.actie_type === "basisprijs" || a.actie_type === "minimumprijs") {
                        setListings(prev => prev.map(l =>
                          l.id === a.listing_id ? { ...l, [a.veld]: a.nieuweWaarde } : l
                        ));
                      }
                      await updateStatus(a.listing_id, a.trigger_type, "uitgevoerd");
                    }}
                    onNegeer={async () => {
                      await updateStatus(a.listing_id, a.trigger_type, "genegeerd");
                    }}
                    onHeropenen={async () => {
                      await updateStatus(a.listing_id, a.trigger_type, "in_afwachting");
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Legend + toggle */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
        {/* Vergelijk-toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button onClick={() => setVergelijkMode("markt")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${vergelijkMode === "markt" ? "bg-white text-[#2b3885] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            vs Markt
          </button>
          <button onClick={() => setVergelijkMode("blt")}
            className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${vergelijkMode === "blt" ? "bg-white text-[#2b3885] shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
            vs Eigen tempo
          </button>
        </div>
        <span>
          Bezetting: <strong className="text-gray-600">eigen%</strong> /{" "}
          {vergelijkMode === "markt" ? "markt%" : <span className="text-purple-600 font-medium">verwacht% (BLT)</span>}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
          {vergelijkMode === "markt" ? "≥+5% voor op markt" : "≥+5% voor op eigen tempo"}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
          {vergelijkMode === "markt" ? "≤-5% achter op markt" : "≤-5% achter op eigen tempo"}
        </span>
        <span className="ml-auto text-gray-300">Prijzen klikbaar om te bewerken</span>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Gegevens laden van PriceLabs...</div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium">Woning</th>
                <th className="text-center px-3 py-3 font-medium">
                  15 dagen{vergelijkMode === "blt" && <span className="block text-purple-400 font-normal text-xs">vs tempo</span>}
                </th>
                <th className="text-center px-3 py-3 font-medium">30 dagen</th>
                <th className="text-center px-3 py-3 font-medium">60 dagen</th>
                <th className="text-center px-3 py-3 font-medium">90 dagen</th>
                <th className="text-center px-3 py-3 font-medium">Min</th>
                <th className="text-center px-3 py-3 font-medium">Basis</th>
                <th className="text-center px-3 py-3 font-medium">Max</th>
                <th className="text-center px-3 py-3 font-medium">Aanbevolen</th>
                <th className="text-center px-3 py-3 font-medium">Pickup 3d</th>
                <th className="text-center px-3 py-3 font-medium">BLT</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((l, i) => (
                <tr
                  key={l.id}
                  className={`border-b border-gray-100 hover:bg-[#eef7fe] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
                >
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="font-medium text-gray-900 truncate">
                      {l.interneNaam || l.name.split("--")[0].trim()}
                    </div>
                    {l.interneNaam && (
                      <div className="text-xs text-gray-400 truncate">{l.city_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <OccCell own={l.occupancy_next_15} market={l.market_occupancy_next_15} verwacht={vergelijkMode === "blt" ? verwachteOcc(l, 15) : null} />
                  </td>
                  <td className="px-3 py-3">
                    <OccCell own={l.occupancy_next_30} market={l.market_occupancy_next_30} verwacht={vergelijkMode === "blt" ? verwachteOcc(l, 30) : null} />
                  </td>
                  <td className="px-3 py-3">
                    <OccCell own={l.occupancy_next_60} market={l.market_occupancy_next_60} verwacht={vergelijkMode === "blt" ? verwachteOcc(l, 60) : null} />
                  </td>
                  <td className="px-3 py-3">
                    <OccCell own={l.occupancy_next_90} market={l.market_occupancy_next_90} verwacht={vergelijkMode === "blt" ? verwachteOcc(l, 90) : null} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <InlinePrice listingId={l.id} field="min" value={l.min} onSave={handlePriceSave} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <InlinePrice listingId={l.id} field="base" value={l.base} onSave={handlePriceSave} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    <InlinePrice listingId={l.id} field="max" value={l.max} onSave={handlePriceSave} />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {l.recommended_base_price ? (
                      <span className={`text-sm font-medium ${l.base && l.recommended_base_price > l.base ? "text-amber-600" : "text-gray-500"}`}>
                        €{l.recommended_base_price}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-sm font-medium ${l.booking_pickup_unique_past_3 > 0 ? "text-green-600" : "text-gray-400"}`}>
                      {l.booking_pickup_unique_past_3}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {l.blt_mediaan != null ? (
                      <span className="text-sm text-gray-700" title={`Gemiddeld: ${l.blt_gemiddeld}d — Mediaan: ${l.blt_mediaan}d`}>
                        {l.blt_mediaan}d
                      </span>
                    ) : (
                      <span className="text-gray-300 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <Link
                      href={`/cockpit/revenue/bezetting/${l.id}`}
                      className="text-xs text-[#2b3885] hover:underline"
                    >
                      Detail →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}

function AanbevelingKaart({
  aanbeveling: a, status, bijgewerkt_op, onUitvoer, onNegeer, onHeropenen
}: {
  aanbeveling: Aanbeveling;
  status: StatusFilter;
  bijgewerkt_op?: string;
  onUitvoer: () => Promise<void>;
  onNegeer: () => Promise<void>;
  onHeropenen: () => Promise<void>;
}) {
  const [bezig, setBezig] = useState<string | null>(null);
  const [uitgevouwen, setUitgevouwen] = useState(false);

  async function run(fn: () => Promise<void>, label: string) {
    setBezig(label);
    await fn();
    setBezig(null);
  }

  return (
    <div className={`bg-white border rounded-xl p-4 transition-all ${
      a.prioriteit === "hoog" ? "border-amber-200" : "border-gray-200"
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {a.prioriteit === "hoog" && (
              <span className="text-xs font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">Urgent</span>
            )}
            <span className="font-medium text-gray-900 text-sm">{a.naam}</span>
            <span className="text-xs text-gray-400">{a.reden}</span>
          </div>
          <p className="text-sm font-medium text-[#2b3885] mb-1">{a.actie}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setUitgevouwen(v => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              {uitgevouwen ? "▲ Verberg uitleg" : "▼ Waarom deze aanbeveling?"}
            </button>
            {bijgewerkt_op && (
              <>
                <span className="text-gray-200">·</span>
                <span className="text-xs text-gray-400">
                  {status === "uitgevoerd" ? "Uitgevoerd" : "Genegeerd"} op{" "}
                  {new Date(bijgewerkt_op).toLocaleString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
                <a href={`/cockpit/revenue/logboek`}
                  className="text-xs text-[#2b3885] hover:underline transition-colors">
                  Bekijk wijziging →
                </a>
              </>
            )}
          </div>
          {uitgevouwen && (
            <p className="mt-2 text-xs text-gray-500 leading-relaxed max-w-2xl">{a.uitleg}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === "in_afwachting" && (
            <>
              <button onClick={() => run(onUitvoer, "uitvoer")} disabled={bezig !== null}
                className="px-3 py-1.5 bg-[#2b3885] text-white text-xs font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors">
                {bezig === "uitvoer" ? "Bezig..." : "Uitvoeren"}
              </button>
              <button onClick={() => run(onNegeer, "negeer")} disabled={bezig !== null}
                className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
                {bezig === "negeer" ? "..." : "Negeren"}
              </button>
            </>
          )}
          {status !== "in_afwachting" && (
            <button onClick={() => run(onHeropenen, "heropen")} disabled={bezig !== null}
              className="px-3 py-1.5 bg-gray-100 text-gray-500 text-xs font-medium rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors">
              {bezig === "heropen" ? "..." : "↩ Heropenen"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
