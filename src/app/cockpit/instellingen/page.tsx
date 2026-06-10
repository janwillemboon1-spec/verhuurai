"use client";

import { useEffect, useState } from "react";

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

  useEffect(() => {
    fetch("/api/cockpit/listings")
      .then((r) => r.json())
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

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
