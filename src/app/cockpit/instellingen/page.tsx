"use client";

import { useEffect, useState } from "react";

interface Trigger {
  trigger_type: string;
  enabled: boolean;
  drempel_pct: number;
  aanpassing_pct: number;
  label: string;
}

const TRIGGER_OMSCHRIJVING: Record<string, string> = {
  bezetting_15d_onder: "Als bezetting 15 dagen > drempel% onder markt → verlaag basisprijs met |aanpassing|%",
  bezetting_30d_onder: "Als bezetting 30 dagen > drempel% onder markt → verlaag basisprijs met |aanpassing|%",
  bezetting_voor_markt: "Als bezetting > drempel% boven markt (15+30d) → verhoog basisprijs met aanpassing%",
  pricelabs_advies: "Als PriceLabs-advies > drempel% boven huidige basisprijs → stel adviesprijs in",
  geen_pickup: "Als 0 nieuwe boekingen (3d) én bezetting > drempel% achter markt → verlaag met |aanpassing|%",
};

interface Listing {
  id: number;
  name: string;
  cityName: string | null;
  berichtenSync: boolean;
  interneNaam: string;
}

export default function CockpitInstellingenPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);
  const [triggers, setTriggers] = useState<Trigger[]>([]);
  const [triggerSaving, setTriggerSaving] = useState(false);
  const [triggerSaved, setTriggerSaved] = useState(false);

  useEffect(() => {
    fetch("/api/cockpit/listings")
      .then((r) => r.json())
      .then(setListings)
      .finally(() => setLoading(false));
    fetch("/api/cockpit/aanbevelingen/triggers")
      .then((r) => r.json())
      .then((rows: Trigger[]) => {
        if (rows.length > 0) setTriggers(rows);
      });
  }, []);

  async function saveTriggers() {
    setTriggerSaving(true);
    await fetch("/api/cockpit/aanbevelingen/triggers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggers }),
    });
    setTriggerSaving(false);
    setTriggerSaved(true);
    setTimeout(() => setTriggerSaved(false), 2000);
  }

  function updateTrigger(type: string, field: keyof Trigger, value: unknown) {
    setTriggers(prev => prev.map(t => t.trigger_type === type ? { ...t, [field]: value } : t));
  }

  async function toggle(listing: Listing) {
    setSaving(listing.id);
    const newVal = !listing.berichtenSync;
    await fetch(`/api/cockpit/listings/${listing.id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: newVal, name: listing.name }),
    });
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, berichtenSync: newVal } : l))
    );
    setSaving(null);
  }

  async function saveNaam(listing: Listing, naam: string) {
    setListings((prev) =>
      prev.map((l) => (l.id === listing.id ? { ...l, interneNaam: naam } : l))
    );
    await fetch(`/api/cockpit/listings/${listing.id}/naam`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ naam }),
    });
  }

  const enabled = listings.filter((l) => l.berichtenSync);
  const disabled = listings.filter((l) => !l.berichtenSync);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#2b3885] mb-1">Woning instellingen</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Kies per woning of berichten worden gesynchroniseerd en beantwoord.
      </p>

      {loading ? (
        <div className="text-gray-400 text-sm">Woningen laden...</div>
      ) : (
        <div className="space-y-8">
          {enabled.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Actief ({enabled.length})
              </h2>
              <div className="space-y-2">
                {enabled.map((l) => (
                  <ListingRow key={l.id} listing={l} saving={saving === l.id} onToggle={toggle} onSaveNaam={saveNaam} />
                ))}
              </div>
            </section>
          )}

          {disabled.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Niet actief ({disabled.length})
              </h2>
              <div className="space-y-2">
                {disabled.map((l) => (
                  <ListingRow key={l.id} listing={l} saving={saving === l.id} onToggle={toggle} onSaveNaam={saveNaam} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Aanbeveling triggers */}
      {triggers.length > 0 && (
        <div className="mt-12">
          <h1 className="text-2xl font-bold text-[#2b3885] mb-1">Aanbeveling triggers</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Stel per trigger in of hij actief is, wat de drempelwaarde is (%) en welke prijsaanpassing wordt aanbevolen.
          </p>
          <div className="space-y-3">
            {triggers.map(t => (
              <div key={t.trigger_type} className={`bg-white border rounded-xl p-4 transition-all ${t.enabled ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                <div className="flex items-start gap-4">
                  {/* Toggle */}
                  <button
                    onClick={() => updateTrigger(t.trigger_type, "enabled", !t.enabled)}
                    className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none ${t.enabled ? "bg-[#2b3885]" : "bg-gray-200"}`}
                    role="switch" aria-checked={t.enabled}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${t.enabled ? "translate-x-4" : "translate-x-0"}`} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 mb-0.5">{t.label}</p>
                    <p className="text-xs text-gray-400 mb-3">{TRIGGER_OMSCHRIJVING[t.trigger_type]}</p>

                    <div className="flex gap-6 flex-wrap">
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Drempel (%)</label>
                        <input
                          type="number" min="1" max="50"
                          value={t.drempel_pct}
                          onChange={e => updateTrigger(t.trigger_type, "drempel_pct", parseInt(e.target.value) || 0)}
                          className="w-20 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#2b3885]"
                        />
                      </div>
                      {t.trigger_type !== "pricelabs_advies" && (
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            Aanpassing (%, negatief = verlaging)
                          </label>
                          <input
                            type="number" min="-50" max="50"
                            value={t.aanpassing_pct}
                            onChange={e => updateTrigger(t.trigger_type, "aanpassing_pct", parseInt(e.target.value) || 0)}
                            className="w-24 text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#2b3885]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <button
              onClick={saveTriggers}
              disabled={triggerSaving}
              className="px-4 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors"
            >
              {triggerSaved ? "✓ Opgeslagen" : triggerSaving ? "Opslaan..." : "Triggers opslaan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ListingRow({
  listing,
  saving,
  onToggle,
  onSaveNaam,
}: {
  listing: Listing;
  saving: boolean;
  onToggle: (l: Listing) => void;
  onSaveNaam: (l: Listing, naam: string) => void;
}) {
  const [draft, setDraft] = useState(listing.interneNaam);

  return (
    <div className="bg-white border border-gray-200 rounded-lg px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-gray-900 text-sm truncate">{listing.name}</p>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => { if (draft !== listing.interneNaam) onSaveNaam(listing, draft); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            placeholder="Interne naam (bijv. 'Houseboat Amsterdam')"
            className="mt-1 w-full text-xs text-gray-500 placeholder-gray-300 bg-transparent border-b border-transparent hover:border-gray-200 focus:border-[#2b3885] focus:outline-none py-0.5 transition-colors"
          />
        </div>
        <button
          onClick={() => onToggle(listing)}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            listing.berichtenSync ? "bg-[#2b3885]" : "bg-gray-200"
          } ${saving ? "opacity-50 cursor-wait" : "cursor-pointer"}`}
          role="switch"
          aria-checked={listing.berichtenSync}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              listing.berichtenSync ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
