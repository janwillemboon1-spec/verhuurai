"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Regel {
  id: string;
  naam: string;
  periode: number;
  conditie: "onder_markt" | "boven_markt";
  drempel: number;
  aanpassing: number;
  scope: string;
  enabled: boolean;
  aangemaakt_op: string;
}

const EMPTY_FORM = {
  naam: "",
  periode: 30,
  conditie: "onder_markt" as "onder_markt" | "boven_markt",
  drempel: 10,
  aanpassing: -5,
  scope: "all",
  enabled: true,
};

function regelTekst(r: Regel) {
  const conditieTekst = r.conditie === "onder_markt"
    ? `meer dan ${r.drempel}% ónder de markt`
    : `meer dan ${r.drempel}% bóven de markt`;
  const actieTekst = r.aanpassing < 0
    ? `verlaag de basisprijs met ${Math.abs(r.aanpassing)}%`
    : `verhoog de basisprijs met ${r.aanpassing}%`;
  const scopeTekst = r.scope === "all" ? "alle woningen" : "geselecteerde woningen";
  return `Als de bezetting de komende ${r.periode} dagen ${conditieTekst} zit, ${actieTekst} voor ${scopeTekst}.`;
}

export default function RevenueRegelsPage() {
  const [regels, setRegels] = useState<Regel[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cockpit/revenue/regels")
      .then((r) => r.json())
      .then(setRegels)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit() {
    if (!form.naam) return;
    setSaving(true);
    if (editId) {
      const res = await fetch(`/api/cockpit/revenue/regels/${editId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setRegels((prev) => prev.map((r) => r.id === editId ? updated : r));
      setEditId(null);
    } else {
      const res = await fetch("/api/cockpit/revenue/regels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setRegels((prev) => [...prev, created]);
    }
    setForm(EMPTY_FORM);
    setSaving(false);
  }

  async function toggleEnabled(regel: Regel) {
    const res = await fetch(`/api/cockpit/revenue/regels/${regel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: !regel.enabled }),
    });
    const updated = await res.json();
    setRegels((prev) => prev.map((r) => r.id === regel.id ? updated : r));
  }

  async function deleteRegel(id: string) {
    await fetch(`/api/cockpit/revenue/regels/${id}`, { method: "DELETE" });
    setRegels((prev) => prev.filter((r) => r.id !== id));
  }

  function startEdit(regel: Regel) {
    setEditId(regel.id);
    setForm({
      naam: regel.naam,
      periode: regel.periode,
      conditie: regel.conditie,
      drempel: regel.drempel,
      aanpassing: regel.aanpassing,
      scope: regel.scope,
      enabled: regel.enabled,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEdit() {
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/cockpit/revenue" className="text-sm text-gray-400 hover:text-[#2b3885] transition-colors">
          ← Revenue
        </Link>
        <span className="text-gray-200">/</span>
        <h1 className="text-xl font-bold text-[#2b3885]">Automatiseringsregels</h1>
      </div>

      <p className="text-sm text-gray-500 mb-8">
        Definieer regels die automatisch de basisprijs aanpassen op basis van pacing ten opzichte van de markt.
        Regels worden dagelijks uitgevoerd wanneer de automatisering is ingeschakeld.
      </p>

      {/* Formulier */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          {editId ? "Regel bewerken" : "Nieuwe regel"}
        </h2>

        <div className="space-y-4">
          {/* Naam */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Naam (ter identificatie)</label>
            <input
              type="text"
              value={form.naam}
              placeholder="bijv. 'Verlaging bij lage bezetting 30d'"
              onChange={(e) => setForm({ ...form, naam: e.target.value })}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]"
            />
          </div>

          {/* Trigger */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Periode</label>
              <select
                value={form.periode}
                onChange={(e) => setForm({ ...form, periode: Number(e.target.value) })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]"
              >
                {[7, 15, 30, 60, 90].map((p) => (
                  <option key={p} value={p}>Komende {p} dagen</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Conditie</label>
              <select
                value={form.conditie}
                onChange={(e) => setForm({ ...form, conditie: e.target.value as "onder_markt" | "boven_markt" })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]"
              >
                <option value="onder_markt">Onder markt</option>
                <option value="boven_markt">Boven markt</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Drempel (%)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={form.drempel}
                onChange={(e) => setForm({ ...form, drempel: Number(e.target.value) })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]"
              />
            </div>
          </div>

          {/* Actie */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">
                Prijsaanpassing (% — negatief = verlaging)
              </label>
              <input
                type="number"
                min="-50"
                max="50"
                value={form.aanpassing}
                onChange={(e) => setForm({ ...form, aanpassing: Number(e.target.value) })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Van toepassing op</label>
              <select
                value={form.scope}
                onChange={(e) => setForm({ ...form, scope: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]"
              >
                <option value="all">Alle woningen</option>
              </select>
            </div>
          </div>

          {/* Preview */}
          {form.naam && (
            <div className="bg-[#eef7fe] rounded-lg px-4 py-3 text-sm text-[#2b3885]">
              {regelTekst({ ...form, id: "", aangemaakt_op: "" })}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving || !form.naam}
              className="px-4 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors"
            >
              {saving ? "Opslaan..." : editId ? "Wijzigingen opslaan" : "Regel toevoegen"}
            </button>
            {editId && (
              <button
                onClick={cancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Annuleren
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Regellijst */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Gedefinieerde regels ({regels.length})
        </h2>

        {loading ? (
          <div className="text-sm text-gray-400">Laden...</div>
        ) : regels.length === 0 ? (
          <div className="text-sm text-gray-400 bg-white border border-gray-200 rounded-xl p-6 text-center">
            Nog geen regels gedefinieerd.
          </div>
        ) : (
          <div className="space-y-3">
            {regels.map((r) => (
              <div
                key={r.id}
                className={`bg-white border rounded-xl p-4 transition-all ${
                  r.enabled ? "border-gray-200" : "border-gray-100 opacity-60"
                } ${editId === r.id ? "ring-2 ring-[#2b3885]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 text-sm">{r.naam}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                        r.conditie === "onder_markt"
                          ? "bg-red-50 text-red-600"
                          : "bg-green-50 text-green-600"
                      }`}>
                        {r.conditie === "onder_markt" ? "↓ onder markt" : "↑ boven markt"}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{regelTekst(r)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleEnabled(r)}
                      className={`relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer ${
                        r.enabled ? "bg-[#2b3885]" : "bg-gray-200"
                      }`}
                      role="switch"
                      aria-checked={r.enabled}
                      title={r.enabled ? "Uitschakelen" : "Inschakelen"}
                    >
                      <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        r.enabled ? "translate-x-4" : "translate-x-0"
                      }`} />
                    </button>
                    <button
                      onClick={() => startEdit(r)}
                      className="text-xs text-gray-400 hover:text-[#2b3885] transition-colors px-1"
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={() => deleteRegel(r.id)}
                      className="text-xs text-gray-300 hover:text-red-500 transition-colors px-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
