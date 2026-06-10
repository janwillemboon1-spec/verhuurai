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
  onSave: (id: string, field: string, val: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));

  function commit() {
    const n = parseInt(draft, 10);
    if (!isNaN(n) && n > 0) onSave(listingId, field, n);
    setEditing(false);
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

export default function RevenuePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<"naam" | "occ15" | "occ30" | "occ60">("naam");

  useEffect(() => {
    fetch("/api/cockpit/revenue/listings")
      .then((r) => r.json())
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

  async function handlePriceSave(id: string, field: string, val: number) {
    setSaving(id);
    await fetch(`/api/cockpit/revenue/listings/${id}/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: val }),
    });
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, [field]: val } : l))
    );
    setSaving(null);
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
        <Link href="/cockpit/revenue/regels" className="ml-auto text-xs text-[#2b3885] hover:underline">
          Automatiseringsregels →
        </Link>
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
                  className={`border-b border-gray-100 hover:bg-[#eef7fe] transition-colors ${saving === l.id ? "opacity-60" : ""} ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"}`}
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
    </div>
  );
}
