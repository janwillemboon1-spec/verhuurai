"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface CalendarDay {
  date: string;
  price: number;
  user_price: number;
  uncustomized_price: number;
  min_stay: number;
  booking_status: string;
  demand_color: string;
  demand_desc: string;
}

interface Override {
  date: string;
  price: string;
  price_type: "percent" | "fixed";
  min_stay: number;
  reason: string;
}

interface ListingMeta {
  id: string;
  name: string;
  interneNaam: string;
  base: number | null;
  min: number | null;
  max: number | null;
}

const STATUS_STYLE: Record<string, string> = {
  "Booked": "bg-blue-100 text-blue-700",
  "Booked (Check-In)": "bg-blue-200 text-blue-800",
  "Booked (Check-Out)": "bg-blue-100 text-blue-600",
};

export default function RevenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [meta, setMeta] = useState<ListingMeta | null>(null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);

  // New override form
  const [form, setForm] = useState({
    date: "",
    price: "",
    price_type: "percent" as "percent" | "fixed",
    min_stay: "1",
    reason: "",
  });
  const [formSaving, setFormSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch("/api/cockpit/revenue/listings").then((r) => r.json()),
      fetch(`/api/cockpit/revenue/listings/${id}/calendar`).then((r) => r.json()),
      fetch(`/api/cockpit/revenue/listings/${id}/overrides`).then((r) => r.json()),
    ]).then(([allListings, cal, ovr]) => {
      const listing = allListings.find((l: ListingMeta) => l.id === id);
      setMeta(listing ?? null);
      setCalendar(Array.isArray(cal) ? cal : []);
      setOverrides(Array.isArray(ovr) ? ovr : []);
      setLoading(false);
    });
  }, [id]);

  async function addOverride() {
    if (!form.date || !form.price) return;
    setFormSaving(true);
    await fetch(`/api/cockpit/revenue/listings/${id}/overrides`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: form.date,
        price: form.price,
        price_type: form.price_type,
        min_stay: parseInt(form.min_stay),
        reason: form.reason,
      }),
    });
    const fresh = await fetch(`/api/cockpit/revenue/listings/${id}/overrides`).then((r) => r.json());
    setOverrides(Array.isArray(fresh) ? fresh : []);
    setForm({ date: "", price: "", price_type: "percent", min_stay: "1", reason: "" });
    setFormSaving(false);
  }

  async function removeOverride(date: string) {
    await fetch(`/api/cockpit/revenue/listings/${id}/overrides`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date }),
    });
    setOverrides((prev) => prev.filter((o) => o.date !== date));
  }

  const overrideDates = new Set(overrides.map((o) => o.date));
  const displayName = meta ? (meta.interneNaam || meta.name.split("--")[0].trim()) : "...";

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cockpit/revenue/bezetting" className="text-sm text-gray-400 hover:text-[#2b3885] transition-colors">
          ← Bezetting
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-[#2b3885] truncate">{displayName}</h1>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400 animate-pulse">Kalender laden...</div>
      ) : (
        <div className="space-y-8">

          {/* Prijsinformatie */}
          {meta && (
            <div className="flex gap-4 flex-wrap">
              {[["Min", meta.min], ["Basis", meta.base], ["Max", meta.max]].map(([label, val]) => (
                <div key={String(label)} className="bg-white border border-gray-200 rounded-lg px-4 py-3 min-w-[100px]">
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-lg font-semibold text-gray-900">{val != null ? `€${val}` : "—"}</p>
                </div>
              ))}
            </div>
          )}

          {/* Overrides */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Date Specific Overrides</h2>

            {overrides.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">Geen actieve overrides.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200 mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase">
                      <th className="text-left px-3 py-2">Datum</th>
                      <th className="text-left px-3 py-2">Prijs</th>
                      <th className="text-left px-3 py-2">Type</th>
                      <th className="text-left px-3 py-2">Min-stay</th>
                      <th className="text-left px-3 py-2">Reden</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {overrides.sort((a, b) => a.date.localeCompare(b.date)).map((o) => (
                      <tr key={o.date} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium">{o.date}</td>
                        <td className="px-3 py-2">{o.price}{o.price_type === "percent" ? "%" : " (vast)"}</td>
                        <td className="px-3 py-2 text-gray-500">{o.price_type}</td>
                        <td className="px-3 py-2">{o.min_stay}n</td>
                        <td className="px-3 py-2 text-gray-500">{o.reason || "—"}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => removeOverride(o.date)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Verwijder
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Nieuwe override form */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Override toevoegen</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Datum</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Waarde</label>
                  <input type="number" value={form.price} placeholder="bijv. 10 of 200"
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Type</label>
                  <select value={form.price_type} onChange={(e) => setForm({ ...form, price_type: e.target.value as "percent" | "fixed" })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]">
                    <option value="percent">% aanpassing</option>
                    <option value="fixed">Vaste prijs</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Min-stay</label>
                  <input type="number" min="1" value={form.min_stay}
                    onChange={(e) => setForm({ ...form, min_stay: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Reden</label>
                  <input type="text" value={form.reason} placeholder="bijv. event"
                    onChange={(e) => setForm({ ...form, reason: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                </div>
              </div>
              <button
                onClick={addOverride}
                disabled={formSaving || !form.date || !form.price}
                className="mt-3 px-4 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors"
              >
                {formSaving ? "Opslaan..." : "Override opslaan"}
              </button>
            </div>
          </section>

          {/* Kalender */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Prijskalender — komende 90 dagen</h2>
            <div className="grid grid-cols-7 gap-1">
              {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map((d) => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
              {/* Offset to start on correct weekday */}
              {calendar.length > 0 && (() => {
                const firstDay = new Date(calendar[0].date).getDay();
                const offset = firstDay === 0 ? 6 : firstDay - 1;
                return Array.from({ length: offset }).map((_, i) => <div key={`off-${i}`} />);
              })()}
              {calendar.map((day) => {
                const isBooked = day.booking_status.includes("Booked");
                const hasOverride = overrideDates.has(day.date);
                const d = new Date(day.date);
                return (
                  <div
                    key={day.date}
                    title={`${day.date}\n€${day.price}${hasOverride ? " (override)" : ""}\n${day.booking_status || day.demand_desc}`}
                    className={`relative rounded-md p-1.5 text-center cursor-default transition-colors ${
                      isBooked
                        ? "bg-blue-100 text-blue-800"
                        : "bg-white border border-gray-100 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-xs text-gray-400">{d.getDate()}</div>
                    <div className="text-xs font-medium">€{day.price}</div>
                    {hasOverride && (
                      <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-amber-400" title="Override actief" />
                    )}
                    {day.user_price > 0 && !isBooked && (
                      <div className="text-xs text-amber-600">✎</div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-200 inline-block" /> Geboekt</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" /> Override actief</span>
              <span className="flex items-center gap-1"><span className="text-amber-600">✎</span> Handmatige prijs</span>
            </div>
          </section>

        </div>
      )}
    </div>
  );
}
