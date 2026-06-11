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
}

function parseOcc(val: string) {
  return parseInt(val?.replace("%", "").trim() || "0", 10);
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

function OccCell({ own, market }: { own: string; market: string }) {
  const o = parseOcc(own);
  const m = parseOcc(market);
  return (
    <div className="text-center">
      <div className="font-medium text-gray-900 text-sm">{o}%</div>
      <div className="text-xs text-gray-400">{m}%</div>
      <PacingBadge own={o} market={m} />
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

interface Aanbeveling {
  listing_id: string;
  naam: string;
  reden: string;
  uitleg: string;
  actie: string;
  veld: "base" | "min" | "max";
  huidigeWaarde: number | null;
  nieuweWaarde: number;
  prioriteit: "hoog" | "middel";
}

function berekenAanbevelingen(listings: Listing[]): Aanbeveling[] {
  const aanbevelingen: Aanbeveling[] = [];

  for (const l of listings) {
    const naam = l.interneNaam || l.name.split("--")[0].trim();
    const d15 = parseOcc(l.occupancy_next_15) - parseOcc(l.market_occupancy_next_15);
    const d30 = parseOcc(l.occupancy_next_30) - parseOcc(l.market_occupancy_next_30);
    const d60 = parseOcc(l.occupancy_next_60) - parseOcc(l.market_occupancy_next_60);
    const base = l.base;
    const rec = l.recommended_base_price;
    const pickup3 = l.booking_pickup_unique_past_3;

    // Verlaging aanbevelen: loopt achter op markt
    if (d15 <= -15 && base) {
      const nieuw = Math.round(base * 0.90);
      aanbevelingen.push({
        listing_id: l.id, naam, prioriteit: "hoog",
        reden: `Bezetting 15d is ${Math.abs(d15)}% onder markt`,
        uitleg: `De komende 15 dagen staat de bezetting op ${parseOcc(l.occupancy_next_15)}% terwijl de markt op ${parseOcc(l.market_occupancy_next_15)}% zit. Dit verschil van ${Math.abs(d15)}% wijst op te hoge prijsstelling of gebrek aan zichtbaarheid. Een verlaging van 10% van de basisprijs kan de boekingskans sterk verbeteren.`,
        actie: `Verlaag basisprijs van €${base} naar €${nieuw} (−10%)`,
        veld: "base", huidigeWaarde: base, nieuweWaarde: nieuw,
      });
    } else if (d30 <= -10 && base && !aanbevelingen.find(a => a.listing_id === l.id)) {
      const nieuw = Math.round(base * 0.95);
      aanbevelingen.push({
        listing_id: l.id, naam, prioriteit: "middel",
        reden: `Bezetting 30d is ${Math.abs(d30)}% onder markt`,
        uitleg: `De komende 30 dagen zit de bezetting op ${parseOcc(l.occupancy_next_30)}% versus ${parseOcc(l.market_occupancy_next_30)}% in de markt. Een lichte prijsverlaging van 5% geeft de woning een competitiever profiel zonder te veel omzet te laten liggen.`,
        actie: `Verlaag basisprijs van €${base} naar €${nieuw} (−5%)`,
        veld: "base", huidigeWaarde: base, nieuweWaarde: nieuw,
      });
    }

    // Verhoging aanbevelen: loopt ver voor op markt
    if (d15 >= 15 && d30 >= 10 && base && !aanbevelingen.find(a => a.listing_id === l.id)) {
      const nieuw = Math.round(base * 1.10);
      aanbevelingen.push({
        listing_id: l.id, naam, prioriteit: "middel",
        reden: `Bezetting loopt ${d15}% voor op markt`,
        uitleg: `Met ${parseOcc(l.occupancy_next_15)}% bezetting voor de komende 15 dagen tegenover ${parseOcc(l.market_occupancy_next_15)}% marktgemiddelde loopt deze woning sterk voor. Dit is een signaal dat de prijs te laag staat — er is ruimte om de basisprijs te verhogen zonder bezetting te verliezen.`,
        actie: `Verhoog basisprijs van €${base} naar €${nieuw} (+10%)`,
        veld: "base", huidigeWaarde: base, nieuweWaarde: nieuw,
      });
    }

    // PriceLabs aanbeveling significant afwijkend
    if (rec && base && rec > base * 1.12 && !aanbevelingen.find(a => a.listing_id === l.id)) {
      aanbevelingen.push({
        listing_id: l.id, naam, prioriteit: "middel",
        reden: `PriceLabs adviseert €${rec} (huidig €${base})`,
        uitleg: `PriceLabs berekent op basis van marktdata en bezettingspatronen een aanbevolen basisprijs van €${rec}, wat ${Math.round(((rec - base) / base) * 100)}% hoger is dan de huidige €${base}. Dit kan duiden op sterk toegenomen vraag in dit marktsegment.`,
        actie: `Stel basisprijs in op €${rec} (PriceLabs advies)`,
        veld: "base", huidigeWaarde: base, nieuweWaarde: rec,
      });
    }

    // Geen pickup + achterstand
    if (pickup3 === 0 && d30 <= -5 && base && !aanbevelingen.find(a => a.listing_id === l.id)) {
      const nieuw = Math.round(base * 0.95);
      aanbevelingen.push({
        listing_id: l.id, naam, prioriteit: "middel",
        reden: `0 nieuwe boekingen in 3 dagen + bezetting loopt achter`,
        uitleg: `Er zijn de afgelopen 3 dagen geen nieuwe boekingen binnengekomen en de 30-daagse bezetting ligt ${Math.abs(d30)}% onder de markt. Dit patroon duidt op een te hoge prijs of te weinig zichtbaarheid. Een kleine verlaging kan de algoritmen van Airbnb/Booking.com prikkelen om de woning vaker te tonen.`,
        actie: `Verlaag basisprijs van €${base} naar €${nieuw} (−5%)`,
        veld: "base", huidigeWaarde: base, nieuweWaarde: nieuw,
      });
    }
  }

  return aanbevelingen.sort((a, b) => (a.prioriteit === "hoog" ? -1 : 1) - (b.prioriteit === "hoog" ? -1 : 1));
}

export default function RevenuePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortKey, setSortKey] = useState<"naam" | "occ15" | "occ30" | "occ60">("naam");
  const [pendingPush, setPendingPush] = useState<Set<string>>(new Set());
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    fetch("/api/cockpit/revenue/listings")
      .then((r) => r.json())
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

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
    await Promise.all(
      ids.map((id) =>
        fetch(`/api/cockpit/revenue/listings/${id}/push`, { method: "POST" })
      )
    );
    setPendingPush(new Set());
    setPushing(false);
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

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
        <span>Bezetting: <strong className="text-gray-600">eigen%</strong> / markt%</span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> ≥+5% voor op markt
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> ≤-5% achter op markt
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
                <th className="text-center px-3 py-3 font-medium">15 dagen</th>
                <th className="text-center px-3 py-3 font-medium">30 dagen</th>
                <th className="text-center px-3 py-3 font-medium">60 dagen</th>
                <th className="text-center px-3 py-3 font-medium">90 dagen</th>
                <th className="text-center px-3 py-3 font-medium">Min</th>
                <th className="text-center px-3 py-3 font-medium">Basis</th>
                <th className="text-center px-3 py-3 font-medium">Max</th>
                <th className="text-center px-3 py-3 font-medium">Aanbevolen</th>
                <th className="text-center px-3 py-3 font-medium">Pickup 3d</th>
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
                    <OccCell own={l.occupancy_next_15} market={l.market_occupancy_next_15} />
                  </td>
                  <td className="px-3 py-3">
                    <OccCell own={l.occupancy_next_30} market={l.market_occupancy_next_30} />
                  </td>
                  <td className="px-3 py-3">
                    <OccCell own={l.occupancy_next_60} market={l.market_occupancy_next_60} />
                  </td>
                  <td className="px-3 py-3">
                    <OccCell own={l.occupancy_next_90} market={l.market_occupancy_next_90} />
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

      {/* Aanbevelingen */}
      {!loading && listings.length > 0 && (() => {
        const aanbevelingen = berekenAanbevelingen(listings);
        if (aanbevelingen.length === 0) return (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Aanbevelingen</h2>
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-400">
              ✓ Geen aanbevelingen — alle woningen lopen goed in verhouding tot de markt.
            </div>
          </div>
        );
        return (
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Aanbevelingen <span className="ml-1.5 text-xs font-normal text-gray-400">({aanbevelingen.length})</span>
            </h2>
            <div className="space-y-3">
              {aanbevelingen.map((a) => (
                <AanbevelingKaart
                  key={a.listing_id + a.reden}
                  aanbeveling={a}
                  onUitvoer={async () => {
                    await handlePriceSave(a.listing_id, a.veld, a.nieuweWaarde);
                  }}
                />
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function AanbevelingKaart({ aanbeveling: a, onUitvoer }: { aanbeveling: Aanbeveling; onUitvoer: () => Promise<void> }) {
  const [uitgevoerd, setUitgevoerd] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [uitgevouwen, setUitgevouwen] = useState(false);

  async function uitvoeren() {
    setBezig(true);
    await onUitvoer();
    setBezig(false);
    setUitgevoerd(true);
  }

  return (
    <div className={`bg-white border rounded-xl p-4 transition-all ${
      a.prioriteit === "hoog" ? "border-amber-200" : "border-gray-200"
    } ${uitgevoerd ? "opacity-50" : ""}`}>
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
          <button
            onClick={() => setUitgevouwen(v => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {uitgevouwen ? "▲ Verberg uitleg" : "▼ Waarom deze aanbeveling?"}
          </button>
          {uitgevouwen && (
            <p className="mt-2 text-xs text-gray-500 leading-relaxed max-w-2xl">{a.uitleg}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          {uitgevoerd ? (
            <span className="text-xs text-green-600 font-medium">✓ Uitgevoerd</span>
          ) : (
            <button
              onClick={uitvoeren}
              disabled={bezig}
              className="px-3 py-1.5 bg-[#2b3885] text-white text-xs font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors"
            >
              {bezig ? "Bezig..." : "Uitvoeren"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
