"use client";

import { useEffect, useState } from "react";

type ActieType = "basisprijs" | "minimumprijs" | "dso_percent" | "dso_fixed";
type ConditieType = "bezetting_onder" | "bezetting_boven" | "pricelabs_advies" | "geen_pickup" | "prijs_niet_updated" | "blt_kort" | "blt_lang";

interface TriggerConditie {
  conditie: ConditieType;
  periode?: number;
  drempel_pct?: number;
  dagen?: number;
}

interface Trigger {
  trigger_type: string;
  conditie: string;
  condities?: TriggerConditie[];
  enabled: boolean;
  drempel_pct: number;
  aanpassing_pct: number;
  label: string;
  actie_type: ActieType;
  dso_periode: number;
  dso_price_type: "percent" | "fixed";
}

const ACTIE_OPTIES: { value: ActieType; label: string }[] = [
  { value: "basisprijs",   label: "Basisprijs aanpassen (%)" },
  { value: "minimumprijs", label: "Minimumprijs aanpassen (%)" },
  { value: "dso_percent",  label: "DSO — procentueel" },
  { value: "dso_fixed",    label: "DSO — vaste prijs (€)" },
];

const CONDITIE_TYPE_OPTIES: { value: ConditieType; label: string; tooltip: string }[] = [
  { value: "bezetting_onder",    label: "Bezetting onder markt",       tooltip: "Eigen bezetting loopt achter op markt" },
  { value: "bezetting_boven",    label: "Bezetting boven markt",       tooltip: "Eigen bezetting loopt voor op markt" },
  { value: "pricelabs_advies",   label: "PriceLabs advies afwijkend",  tooltip: "PriceLabs adviseert significant andere prijs" },
  { value: "geen_pickup",        label: "Geen nieuwe boekingen",       tooltip: "Geen nieuwe boekingen in N dagen" },
  { value: "prijs_niet_updated", label: "Prijs niet geüpdated",        tooltip: "Basisprijs N dagen niet gepusht" },
  { value: "blt_kort",           label: "Gem. boekingstijd korter dan X dagen",  tooltip: "Woning heeft kort leadtime — last-minute karakter" },
  { value: "blt_lang",           label: "Gem. boekingstijd langer dan X dagen",  tooltip: "Woning wordt ver van tevoren geboekt" },
];

const LEGE_CONDITIE: TriggerConditie = { conditie: "bezetting_onder", periode: 30, drempel_pct: 10, dagen: 3 };

function conditieZin(c: TriggerConditie): string {
  switch (c.conditie) {
    case "bezetting_onder": return `bezetting komende ${c.periode ?? 30} dagen meer dan ${c.drempel_pct ?? 10}% onder de markt`;
    case "bezetting_boven": return `bezetting komende ${c.periode ?? 30} dagen meer dan ${c.drempel_pct ?? 10}% boven de markt`;
    case "pricelabs_advies": return `PriceLabs advies meer dan ${c.drempel_pct ?? 10}% hoger dan huidig`;
    case "geen_pickup": return `geen nieuwe boekingen in de afgelopen ${c.dagen ?? 3} dagen`;
    case "prijs_niet_updated": return `prijs al meer dan ${c.dagen ?? 3} dagen niet geüpdated`;
    case "blt_kort": return `gemiddelde boekingstijd van de woning < ${c.drempel_pct ?? 30} dagen`;
    case "blt_lang": return `gemiddelde boekingstijd van de woning > ${c.drempel_pct ?? 60} dagen`;
    default: return c.conditie;
  }
}

function actieZin(actie_type: string, aanpassing: number, dso_periode?: number): string {
  switch (actie_type) {
    case "basisprijs": return aanpassing < 0 ? `verlaag de basisprijs met ${Math.abs(aanpassing)}%` : `verhoog de basisprijs met ${aanpassing}%`;
    case "minimumprijs": return aanpassing < 0 ? `verlaag de minimumprijs met ${Math.abs(aanpassing)}%` : `verhoog de minimumprijs met ${aanpassing}%`;
    case "dso_percent": return `zet een DSO van ${aanpassing}% op vrije datums komende ${dso_periode ?? 15} dagen`;
    case "dso_fixed": return `zet een vaste DSO-prijs van €${aanpassing} op vrije datums komende ${dso_periode ?? 15} dagen`;
    default: return `pas prijs aan met ${aanpassing}%`;
  }
}

function triggerSamenvattingZin(condities: TriggerConditie[], actie_type: string, aanpassing: number, dso_periode?: number): string {
  if (condities.length === 0) return "";
  const voorwaarden = condities.map(conditieZin).join(", én ");
  return `Als ${voorwaarden} → ${actieZin(actie_type, aanpassing, dso_periode)}.`;
}

const CONDITIE_OPTIES = [
  { value: "bezetting_15d_onder", label: "Bezetting 15 dagen onder markt" },
  { value: "bezetting_30d_onder", label: "Bezetting 30 dagen onder markt" },
  { value: "bezetting_voor_markt", label: "Bezetting loopt voor op markt" },
  { value: "pricelabs_advies",     label: "PriceLabs advies afwijkend" },
  { value: "geen_pickup",          label: "Geen nieuwe boekingen + achterstand" },
];

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
  const [editTriggerType, setEditTriggerType] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{
    label: string; condities: TriggerConditie[]; aanpassing_pct: number;
    actie_type: ActieType; dso_periode: number; dso_price_type: "percent" | "fixed"; drempel_pct: number;
  } | null>(null);

  function startEdit(t: Trigger) {
    setEditTriggerType(t.trigger_type);
    setEditValues({
      label: t.label,
      condities: t.condities && t.condities.length > 0 ? [...t.condities.map(c => ({ ...c }))] : [{ ...LEGE_CONDITIE }],
      aanpassing_pct: t.aanpassing_pct,
      actie_type: t.actie_type ?? "basisprijs",
      dso_periode: t.dso_periode ?? 15,
      dso_price_type: t.dso_price_type ?? "percent",
      drempel_pct: t.drempel_pct,
    });
    setToevoegen(false);
  }

  async function slaEditOp() {
    if (!editTriggerType || !editValues) return;
    const updated = { ...triggers.find(t => t.trigger_type === editTriggerType)!, ...editValues, condities: editValues.condities };
    setTriggers(prev => prev.map(t => t.trigger_type === editTriggerType ? updated : t));
    await fetch("/api/cockpit/aanbevelingen/triggers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggers: [updated] }),
    });
    setEditTriggerType(null);
    setEditValues(null);
  }

  const [nieuweTrigger, setNieuweTrigger] = useState({
    conditie: "bezetting_15d_onder",
    condities: [{ ...LEGE_CONDITIE }] as TriggerConditie[],
    label: "",
    drempel_pct: 15,
    aanpassing_pct: -10,
    actie_type: "basisprijs" as ActieType,
    dso_periode: 15,
    dso_price_type: "percent" as "percent" | "fixed",
  });
  const [toevoegen, setToevoegen] = useState(false);

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

  async function deleteTrigger(trigger_type: string) {
    setTriggers(prev => prev.filter(t => t.trigger_type !== trigger_type));
    await fetch("/api/cockpit/aanbevelingen/triggers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger_type }),
    });
  }

  async function voegTriggerToe() {
    const trigger_type = `custom_${Date.now()}`;
    const nieuw: Trigger = { ...nieuweTrigger, trigger_type, enabled: true, condities: nieuweTrigger.condities };
    const res = await fetch("/api/cockpit/aanbevelingen/triggers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trigger: nieuw }),
    });
    const data = await res.json();
    setTriggers(prev => [...prev, { ...nieuw, ...data }]);
    setNieuweTrigger({ conditie: "bezetting_15d_onder", condities: [{ ...LEGE_CONDITIE }], label: "", drempel_pct: 15, aanpassing_pct: -10, actie_type: "basisprijs", dso_periode: 15, dso_price_type: "percent" });
    setToevoegen(false);
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

      {/* Aanbeveling triggers — altijd zichtbaar */}
      <div className="mt-12">
          <h1 className="text-2xl font-bold text-[#2b3885] mb-1">Aanbeveling triggers</h1>
          <p className="text-gray-500 mb-6 text-sm">
            Stel per trigger in of hij actief is, wat de drempelwaarde is (%) en welke prijsaanpassing wordt aanbevolen.
          </p>
          <div className="space-y-3">
            {triggers.length === 0 && (
              <div className="bg-white border border-gray-200 rounded-xl px-5 py-4 text-sm text-gray-400">
                Geen triggers ingesteld. Klik op "+ Trigger toevoegen" om te beginnen.
              </div>
            )}
            {triggers.map(t => (
              <div key={t.trigger_type} className={`bg-white border rounded-xl transition-all ${
                editTriggerType === t.trigger_type ? "border-[#2b3885]" : t.enabled ? "border-gray-200" : "border-gray-100 opacity-60"
              }`}>
                {/* Normale weergave */}
                {editTriggerType !== t.trigger_type && (
                  <div className="flex items-start gap-4 p-4">
                    <button onClick={() => updateTrigger(t.trigger_type, "enabled", !t.enabled)}
                      className={`mt-0.5 relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus:outline-none ${t.enabled ? "bg-[#2b3885]" : "bg-gray-200"}`}
                      role="switch" aria-checked={t.enabled}>
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${t.enabled ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 mb-1">{t.label || t.trigger_type}</p>
                      {t.condities && t.condities.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {t.condities.map((c, i) => (
                            <span key={i} className="text-xs bg-[#eef7fe] text-[#2b3885] px-1.5 py-0.5 rounded">
                              {i > 0 && <span className="mr-1 text-gray-400">EN</span>}
                              {CONDITIE_TYPE_OPTIES.find(o => o.value === c.conditie)?.label}
                              {c.periode && ` ${c.periode}d`}
                              {c.drempel_pct != null && ` >${c.drempel_pct}%`}
                              {c.dagen && ` ${c.dagen}d`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                          {CONDITIE_OPTIES.find(c => c.value === (t.conditie ?? t.trigger_type))?.label ?? t.conditie}
                        </span>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {ACTIE_OPTIES.find(o => o.value === (t.actie_type ?? "basisprijs"))?.label} · {t.aanpassing_pct > 0 ? "+" : ""}{t.aanpassing_pct}{t.actie_type === "dso_fixed" ? "€" : "%"}
                        {(t.actie_type === "dso_percent" || t.actie_type === "dso_fixed") && ` · ${t.dso_periode ?? 15}d`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => { startEdit(t); setToevoegen(false); }}
                        className="text-xs text-[#2b3885] hover:underline">
                        Bewerken
                      </button>
                      <button onClick={() => deleteTrigger(t.trigger_type)}
                        className="text-gray-300 hover:text-red-500 transition-colors text-sm" title="Verwijder trigger">✕</button>
                    </div>
                  </div>
                )}

                {/* Edit formulier */}
                {editTriggerType === t.trigger_type && editValues && (
                  <div className="p-4">
                    <p className="text-sm font-semibold text-[#2b3885] mb-3">Trigger bewerken</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="sm:col-span-2">
                        <label className="text-xs text-gray-500 block mb-1">Naam</label>
                        <input type="text" value={editValues.label}
                          onChange={e => setEditValues(p => p && ({ ...p, label: e.target.value }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
                      </div>
                      <div className="sm:col-span-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs text-gray-500">Condities (AND)</label>
                          <button type="button" onClick={() => setEditValues(p => p && ({ ...p, condities: [...p.condities, { ...LEGE_CONDITIE }] }))}
                            className="text-xs text-[#2b3885] hover:underline">+ Conditie toevoegen</button>
                        </div>
                        <div className="space-y-2">
                          {editValues.condities.map((c, i) => (
                            <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                                  <div className="sm:col-span-2">
                                    <label className="text-xs text-gray-400 block mb-0.5">Conditietype</label>
                                    <select value={c.conditie}
                                      onChange={e => setEditValues(p => { if (!p) return p; const cs = [...p.condities]; cs[i] = { ...cs[i], conditie: e.target.value as ConditieType }; return { ...p, condities: cs }; })}
                                      className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]">
                                      {CONDITIE_TYPE_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                    </select>
                                  </div>
                                  {(c.conditie === "bezetting_onder" || c.conditie === "bezetting_boven") && (<>
                                    <div>
                                      <label className="text-xs text-gray-400 block mb-0.5">Periode</label>
                                      <select value={c.periode ?? 30}
                                        onChange={e => setEditValues(p => { if (!p) return p; const cs = [...p.condities]; cs[i] = { ...cs[i], periode: parseInt(e.target.value) }; return { ...p, condities: cs }; })}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]">
                                        {[7,15,30,60,90].map(d => <option key={d} value={d}>{d} dagen</option>)}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-xs text-gray-400 block mb-0.5">Achterstand (%)</label>
                                      <input type="number" min="1" max="50" value={c.drempel_pct ?? 10}
                                        onChange={e => setEditValues(p => { if (!p) return p; const cs = [...p.condities]; cs[i] = { ...cs[i], drempel_pct: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                    </div>
                                  </>)}
                                  {c.conditie === "pricelabs_advies" && (
                                    <div>
                                      <label className="text-xs text-gray-400 block mb-0.5">Afwijking (%)</label>
                                      <input type="number" min="1" max="100" value={c.drempel_pct ?? 10}
                                        onChange={e => setEditValues(p => { if (!p) return p; const cs = [...p.condities]; cs[i] = { ...cs[i], drempel_pct: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                    </div>
                                  )}
                                  {(c.conditie === "geen_pickup" || c.conditie === "prijs_niet_updated") && (
                                    <div>
                                      <label className="text-xs text-gray-400 block mb-0.5">Aantal dagen</label>
                                      <input type="number" min="1" max="90" value={c.dagen ?? 3}
                                        onChange={e => setEditValues(p => { if (!p) return p; const cs = [...p.condities]; cs[i] = { ...cs[i], dagen: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                    </div>
                                  )}
                                  {(c.conditie === "blt_kort" || c.conditie === "blt_lang") && (
                                    <div>
                                      <label className="text-xs text-gray-400 block mb-0.5">Max/min dagen</label>
                                      <input type="number" min="1" max="365" value={c.drempel_pct ?? (c.conditie === "blt_kort" ? 30 : 60)}
                                        onChange={e => setEditValues(p => { if (!p) return p; const cs = [...p.condities]; cs[i] = { ...cs[i], drempel_pct: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                        className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                    </div>
                                  )}
                                </div>
                                {editValues.condities.length > 1 && (
                                  <button type="button" onClick={() => setEditValues(p => p && ({ ...p, condities: p.condities.filter((_, j) => j !== i) }))}
                                    className="text-gray-300 hover:text-red-500 text-xs mt-1">✕</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block mb-1">Actie</label>
                        <select value={editValues.actie_type}
                          onChange={e => setEditValues(p => p && ({ ...p, actie_type: e.target.value as ActieType }))}
                          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]">
                          {ACTIE_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      {(editValues.actie_type === "basisprijs" || editValues.actie_type === "minimumprijs" || editValues.actie_type === "dso_percent" || editValues.actie_type === "dso_fixed") && (
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">
                            {editValues.actie_type === "dso_fixed" ? "Prijs (€)" : "Aanpassing (%)"}
                          </label>
                          <input type="number" min="-10000" max="10000" value={editValues.aanpassing_pct}
                            onChange={e => setEditValues(p => p && ({ ...p, aanpassing_pct: parseInt(e.target.value) || 0 }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
                        </div>
                      )}
                      {(editValues.actie_type === "dso_percent" || editValues.actie_type === "dso_fixed") && (
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Periode (dagen)</label>
                          <select value={editValues.dso_periode}
                            onChange={e => setEditValues(p => p && ({ ...p, dso_periode: parseInt(e.target.value) }))}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]">
                            {[7,15,30,60].map(d => <option key={d} value={d}>{d} dagen</option>)}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Live samenvatting */}
                    {editValues.condities.length > 0 && (
                      <div className="bg-[#eef7fe] border border-blue-100 rounded-lg px-4 py-3 text-xs text-[#2b3885] mb-3 leading-relaxed">
                        <span className="font-medium">Samenvatting: </span>
                        {triggerSamenvattingZin(editValues.condities, editValues.actie_type, editValues.aanpassing_pct, editValues.dso_periode)}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={slaEditOp}
                        className="px-4 py-2 bg-[#2b3885] text-white text-sm rounded-lg hover:bg-[#232f6e] transition-colors">
                        Opslaan
                      </button>
                      <button onClick={() => { setEditTriggerType(null); setEditValues(null); }}
                        className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                        Annuleren
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Nieuwe trigger */}
            {toevoegen ? (
              <div className="bg-[#eef7fe] border border-blue-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-[#2b3885] mb-3">Nieuwe trigger</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 block mb-1">Naam</label>
                    <input type="text" value={nieuweTrigger.label} placeholder="bijv. 'Zomerverlaging grote woningen'"
                      onChange={e => setNieuweTrigger(p => ({ ...p, label: e.target.value }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
                  </div>
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-500">Condities (alle moeten gelden — AND)</label>
                      <button type="button"
                        onClick={() => setNieuweTrigger(p => ({ ...p, condities: [...p.condities, { ...LEGE_CONDITIE }] }))}
                        className="text-xs text-[#2b3885] hover:underline">+ Conditie toevoegen</button>
                    </div>
                    <div className="space-y-2">
                      {nieuweTrigger.condities.map((c, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-3">
                          <div className="flex items-start gap-2">
                            <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-2">
                              <div className="sm:col-span-2">
                                <label className="text-xs text-gray-400 block mb-0.5">Conditietype</label>
                                <select value={c.conditie}
                                  onChange={e => setNieuweTrigger(p => { const cs = [...p.condities]; cs[i] = { ...cs[i], conditie: e.target.value as ConditieType }; return { ...p, condities: cs }; })}
                                  className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]">
                                  {CONDITIE_TYPE_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                                </select>
                              </div>
                              {(c.conditie === "bezetting_onder" || c.conditie === "bezetting_boven") && (
                                <>
                                  <div>
                                    <label className="text-xs text-gray-400 block mb-0.5">Periode</label>
                                    <select value={c.periode ?? 30}
                                      onChange={e => setNieuweTrigger(p => { const cs = [...p.condities]; cs[i] = { ...cs[i], periode: parseInt(e.target.value) }; return { ...p, condities: cs }; })}
                                      className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]">
                                      {[7,15,30,60,90].map(d => <option key={d} value={d}>{d} dagen</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-gray-400 block mb-0.5">Achterstand (%)</label>
                                    <input type="number" min="1" max="50" value={c.drempel_pct ?? 10}
                                      onChange={e => setNieuweTrigger(p => { const cs = [...p.condities]; cs[i] = { ...cs[i], drempel_pct: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                      className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                  </div>
                                </>
                              )}
                              {c.conditie === "pricelabs_advies" && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-0.5">Afwijking (%)</label>
                                  <input type="number" min="1" max="100" value={c.drempel_pct ?? 10}
                                    onChange={e => setNieuweTrigger(p => { const cs = [...p.condities]; cs[i] = { ...cs[i], drempel_pct: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                </div>
                              )}
                              {(c.conditie === "geen_pickup" || c.conditie === "prijs_niet_updated") && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-0.5">Aantal dagen</label>
                                  <input type="number" min="1" max="90" value={c.dagen ?? 3}
                                    onChange={e => setNieuweTrigger(p => { const cs = [...p.condities]; cs[i] = { ...cs[i], dagen: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                </div>
                              )}
                              {(c.conditie === "blt_kort" || c.conditie === "blt_lang") && (
                                <div>
                                  <label className="text-xs text-gray-400 block mb-0.5">Max/min dagen (BLT)</label>
                                  <input type="number" min="1" max="365" value={c.drempel_pct ?? (c.conditie === "blt_kort" ? 30 : 60)}
                                    onChange={e => setNieuweTrigger(p => { const cs = [...p.condities]; cs[i] = { ...cs[i], drempel_pct: parseInt(e.target.value) || 0 }; return { ...p, condities: cs }; })}
                                    className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-[#2b3885]" />
                                </div>
                              )}
                            </div>
                            {nieuweTrigger.condities.length > 1 && (
                              <button type="button"
                                onClick={() => setNieuweTrigger(p => ({ ...p, condities: p.condities.filter((_, j) => j !== i) }))}
                                className="text-gray-300 hover:text-red-500 text-xs mt-1">✕</button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Drempel (%)</label>
                    <input type="number" min="1" max="50" value={nieuweTrigger.drempel_pct}
                      onChange={e => setNieuweTrigger(p => ({ ...p, drempel_pct: parseInt(e.target.value) || 0 }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Actie</label>
                    <select value={nieuweTrigger.actie_type}
                      onChange={e => setNieuweTrigger(p => ({ ...p, actie_type: e.target.value as ActieType }))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]">
                      {ACTIE_OPTIES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {nieuweTrigger.conditie !== "pricelabs_advies" && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">
                        {nieuweTrigger.actie_type === "dso_fixed" ? "Prijs (€)" : "Aanpassing (%)"}
                      </label>
                      <input type="number" min="-10000" max="10000" value={nieuweTrigger.aanpassing_pct}
                        onChange={e => setNieuweTrigger(p => ({ ...p, aanpassing_pct: parseInt(e.target.value) || 0 }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]" />
                    </div>
                  )}
                  {(nieuweTrigger.actie_type === "dso_percent" || nieuweTrigger.actie_type === "dso_fixed") && (
                    <div>
                      <label className="text-xs text-gray-500 block mb-1">Periode (dagen)</label>
                      <select value={nieuweTrigger.dso_periode}
                        onChange={e => setNieuweTrigger(p => ({ ...p, dso_periode: parseInt(e.target.value) }))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2b3885]">
                        {[7, 15, 30, 60].map(d => <option key={d} value={d}>{d} dagen</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {/* Live samenvatting */}
                {nieuweTrigger.condities.length > 0 && (
                  <div className="bg-white border border-blue-100 rounded-lg px-4 py-3 text-xs text-[#2b3885] leading-relaxed">
                    <span className="font-medium">Samenvatting: </span>
                    {triggerSamenvattingZin(nieuweTrigger.condities, nieuweTrigger.actie_type, nieuweTrigger.aanpassing_pct, nieuweTrigger.dso_periode)}
                  </div>
                )}

                <div className="flex gap-2">
                  <button onClick={voegTriggerToe} disabled={!nieuweTrigger.label}
                    className="px-4 py-2 bg-[#2b3885] text-white text-sm rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors">
                    Toevoegen
                  </button>
                  <button onClick={() => setToevoegen(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                    Annuleren
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setToevoegen(true)}
                className="w-full py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-400 hover:border-[#2b3885] hover:text-[#2b3885] transition-colors">
                + Trigger toevoegen
              </button>
            )}
          </div>

          <div className="mt-4">
            <button onClick={saveTriggers} disabled={triggerSaving}
              className="px-4 py-2 bg-[#2b3885] text-white text-sm font-medium rounded-lg hover:bg-[#232f6e] disabled:opacity-50 transition-colors">
              {triggerSaved ? "✓ Opgeslagen" : triggerSaving ? "Opslaan..." : "Wijzigingen opslaan"}
            </button>
          </div>
        </div>
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
