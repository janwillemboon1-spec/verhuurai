"use client";

import { useState } from "react";
import type {
  OnboardingKlant,
  OnboardingChecklistItem,
  OnboardingTodo,
  OnboardingActiviteit,
  OnboardingKpiMeting,
} from "@/lib/onboarding/types";

type Props = {
  klant: OnboardingKlant;
  checklistInit: OnboardingChecklistItem[];
  todosInit: OnboardingTodo[];
  activiteitenInit: OnboardingActiviteit[];
  metingenInit: OnboardingKpiMeting[];
};

function berekenExtraOmzet(
  klant: OnboardingKlant,
  metingen: OnboardingKpiMeting[]
): number | null {
  const laatste = metingen[0];
  if (!laatste || !klant.kpi_bezetting_nulmeting || !klant.kpi_adr_nulmeting) return null;
  if (!laatste.bezetting || !laatste.adr) return null;
  const dagOud = (klant.kpi_bezetting_nulmeting / 100) * klant.kpi_adr_nulmeting;
  const dagNieuw = (laatste.bezetting / 100) * laatste.adr;
  return Math.round((dagNieuw - dagOud) * 30);
}

export function AdminOnboardingClient({ klant, checklistInit, todosInit, activiteitenInit, metingenInit }: Props) {
  const [klantData, setKlantData] = useState(klant);
  const [checklist, setChecklist] = useState(checklistInit);
  const [todos, setTodos] = useState(todosInit);
  const [activiteiten, setActiviteiten] = useState(activiteitenInit);
  const [metingen, setMetingen] = useState(metingenInit);

  const [bewerkOpen, setBewerkOpen] = useState(false);
  const [bewerkForm, setBewerkForm] = useState({
    naam: klant.naam,
    email: klant.email,
    wachtwoord: "",
    kpi_bezetting_nulmeting: klant.kpi_bezetting_nulmeting?.toString() ?? "",
    kpi_adr_nulmeting: klant.kpi_adr_nulmeting?.toString() ?? "",
    kpi_reviewscore_nulmeting: klant.kpi_reviewscore_nulmeting?.toString() ?? "",
    kpi_reviews_nulmeting: klant.kpi_reviews_nulmeting?.toString() ?? "",
    kpi_omzet_365d_nulmeting: klant.kpi_omzet_365d_nulmeting?.toString() ?? "",
    geen_cijfers_nulmeting: klant.geen_cijfers_nulmeting ?? false,
    extra_omzet_periode: klant.extra_omzet_periode ?? "afgelopen 30 dagen",
  });
  const [bewerkBezig, setBewerkBezig] = useState(false);
  const [bewerkFout, setBewerkFout] = useState<string | null>(null);
  const [bewerkSucces, setBewerkSucces] = useState(false);

  const [nieuwItem, setNieuwItem] = useState({ fase: "", naam: "" });
  const [nieuwTodo, setNieuwTodo] = useState({ tekst: "", deadline: "" });
  const [nieuwActiviteit, setNieuwActiviteit] = useState({ tekst: "", categorie: "overig" as "prijs" | "advertentie" | "review" | "overig" });
  const [nieuweMeting, setNieuweMeting] = useState({
    bezetting: "", adr: "", reviewscore: "", reviews_aantal: "",
    omzet_365d: "", meting_datum: "",
    omzet_periode_bedrag: "", omzet_periode_label: "", notitie: ""
  });
  const [bezig, setBezig] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  const voltooid = checklist.filter(i => i.voltooid).length;
  const totaal = checklist.length;
  const pct = totaal > 0 ? Math.round((voltooid / totaal) * 100) : 0;
  const extraOmzet = berekenExtraOmzet(klantData, metingen);
  const laatste = metingen[0];

  const groepen = checklist.reduce((acc, item) => {
    if (!acc[item.fase]) acc[item.fase] = [];
    acc[item.fase].push(item);
    return acc;
  }, {} as Record<string, OnboardingChecklistItem[]>);

  async function slaKlantOp(e: React.FormEvent) {
    e.preventDefault();
    setBewerkBezig(true);
    setBewerkFout(null);
    setBewerkSucces(false);

    const body: Record<string, unknown> = {
      naam: bewerkForm.naam,
      email: bewerkForm.email,
      kpi_bezetting_nulmeting: bewerkForm.kpi_bezetting_nulmeting ? parseFloat(bewerkForm.kpi_bezetting_nulmeting) : null,
      kpi_adr_nulmeting: bewerkForm.kpi_adr_nulmeting ? parseFloat(bewerkForm.kpi_adr_nulmeting) : null,
      kpi_reviewscore_nulmeting: bewerkForm.kpi_reviewscore_nulmeting ? parseFloat(bewerkForm.kpi_reviewscore_nulmeting) : null,
      kpi_reviews_nulmeting: bewerkForm.kpi_reviews_nulmeting ? parseInt(bewerkForm.kpi_reviews_nulmeting) : null,
      kpi_omzet_365d_nulmeting: bewerkForm.kpi_omzet_365d_nulmeting ? parseFloat(bewerkForm.kpi_omzet_365d_nulmeting) : null,
      geen_cijfers_nulmeting: bewerkForm.geen_cijfers_nulmeting,
      extra_omzet_periode: bewerkForm.extra_omzet_periode,
    };
    if (bewerkForm.wachtwoord) body.wachtwoord = bewerkForm.wachtwoord;

    const res = await fetch(`/api/onboarding/klanten/${klant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      setKlantData(data.klant);
      setBewerkSucces(true);
      setBewerkForm(f => ({ ...f, wachtwoord: "" }));
      setTimeout(() => setBewerkSucces(false), 3000);
    } else {
      const data = await res.json();
      setBewerkFout(data.error || "Opslaan mislukt");
    }
    setBewerkBezig(false);
  }

  async function toggleChecklist(item: OnboardingChecklistItem) {
    setBezig(`check-${item.id}`);
    const res = await fetch(`/api/onboarding/checklist/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voltooid: !item.voltooid }),
    });
    if (res.ok) {
      const data = await res.json();
      setChecklist(prev => prev.map(i => i.id === item.id ? data.item : i));
    }
    setBezig(null);
  }

  async function voegItemToe(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuwItem.fase || !nieuwItem.naam) return;
    setBezig("nieuw-item");
    const res = await fetch(`/api/onboarding/klanten/${klant.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fase: nieuwItem.fase, naam: nieuwItem.naam }),
    });
    if (res.ok) {
      const data = await res.json();
      setChecklist(prev => [...prev, data.item]);
      setNieuwItem({ fase: "", naam: "" });
    }
    setBezig(null);
  }

  async function verwijderItem(id: string) {
    if (!confirm("Stap verwijderen?")) return;
    await fetch(`/api/onboarding/checklist/${id}`, { method: "DELETE" });
    setChecklist(prev => prev.filter(i => i.id !== id));
  }

  async function voegTodoToe(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuwTodo.tekst) return;
    setBezig("nieuw-todo");
    const res = await fetch(`/api/onboarding/klanten/${klant.id}/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tekst: nieuwTodo.tekst, deadline: nieuwTodo.deadline || null }),
    });
    if (res.ok) {
      const data = await res.json();
      setTodos(prev => [...prev, data.todo]);
      setNieuwTodo({ tekst: "", deadline: "" });
    }
    setBezig(null);
  }

  async function verwijderTodo(id: string) {
    if (!confirm("To-do verwijderen?")) return;
    await fetch(`/api/onboarding/todos/${id}`, { method: "DELETE" });
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  async function voegActiviteitToe(e: React.FormEvent) {
    e.preventDefault();
    if (!nieuwActiviteit.tekst) return;
    setBezig("nieuw-act");
    const res = await fetch(`/api/onboarding/klanten/${klant.id}/activiteiten`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nieuwActiviteit),
    });
    if (res.ok) {
      const data = await res.json();
      setActiviteiten(prev => [data.activiteit, ...prev]);
      setNieuwActiviteit({ tekst: "", categorie: "overig" });
    }
    setBezig(null);
  }

  async function verwijderActiviteit(id: string) {
    if (!confirm("Activiteit verwijderen?")) return;
    await fetch(`/api/onboarding/activiteiten/${id}`, { method: "DELETE" });
    setActiviteiten(prev => prev.filter(a => a.id !== id));
  }

  async function voegMetingToe(e: React.FormEvent) {
    e.preventDefault();
    setBezig("nieuw-meting");
    setFout(null);
    const res = await fetch(`/api/onboarding/klanten/${klant.id}/kpi-meting`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bezetting: nieuweMeting.bezetting ? parseFloat(nieuweMeting.bezetting) : null,
        adr: nieuweMeting.adr ? parseFloat(nieuweMeting.adr) : null,
        reviewscore: nieuweMeting.reviewscore ? parseFloat(nieuweMeting.reviewscore) : null,
        reviews_aantal: nieuweMeting.reviews_aantal ? parseInt(nieuweMeting.reviews_aantal) : null,
        omzet_365d: nieuweMeting.omzet_365d ? parseFloat(nieuweMeting.omzet_365d) : null,
        meting_datum: nieuweMeting.meting_datum || null,
        omzet_periode_bedrag: nieuweMeting.omzet_periode_bedrag ? parseFloat(nieuweMeting.omzet_periode_bedrag) : null,
        omzet_periode_label: nieuweMeting.omzet_periode_label || null,
        notitie: nieuweMeting.notitie || null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      setMetingen(prev => [data.meting, ...prev]);
      setNieuweMeting({ bezetting: "", adr: "", reviewscore: "", reviews_aantal: "", omzet_365d: "", meting_datum: "", omzet_periode_bedrag: "", omzet_periode_label: "", notitie: "" });
    } else {
      const data = await res.json();
      setFout(data.error);
    }
    setBezig(null);
  }

  const categorieKleur: Record<string, string> = {
    prijs: "bg-success/10 text-success",
    advertentie: "bg-accent/10 text-accent",
    review: "bg-warning/10 text-warning",
    overig: "bg-border text-text-secondary",
  };

  return (
    <div className="space-y-6">
      {/* Klantgegevens bewerken */}
      <div className="card p-5">
        <button
          type="button"
          onClick={() => setBewerkOpen(o => !o)}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="font-semibold text-primary">Klantgegevens</h2>
          <span className="text-text-secondary text-sm">{bewerkOpen ? "▲ Sluiten" : "▼ Bewerken"}</span>
        </button>

        {bewerkOpen && (
          <form onSubmit={slaKlantOp} className="mt-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-text-secondary">Naam woning</label>
                <input className="input w-full text-sm" value={bewerkForm.naam} onChange={e => setBewerkForm(f => ({ ...f, naam: e.target.value }))} required />
              </div>
              <div>
                <label className="text-xs text-text-secondary">E-mailadres klant</label>
                <input type="email" className="input w-full text-sm" value={bewerkForm.email} onChange={e => setBewerkForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>

            <div>
              <label className="text-xs text-text-secondary">Nieuw wachtwoord (laat leeg om ongewijzigd te laten)</label>
              <input type="password" className="input w-full text-sm" placeholder="••••••••" value={bewerkForm.wachtwoord} onChange={e => setBewerkForm(f => ({ ...f, wachtwoord: e.target.value }))} minLength={4} />
            </div>

            <div>
              <label className="text-xs text-text-secondary">Meetperiode extra omzet</label>
              <input className="input w-full text-sm" value={bewerkForm.extra_omzet_periode} onChange={e => setBewerkForm(f => ({ ...f, extra_omzet_periode: e.target.value }))} />
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">KPI nulmeting <span className="normal-case font-normal">(PriceLabs)</span></p>
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  id="bewerk_geen_cijfers"
                  checked={bewerkForm.geen_cijfers_nulmeting}
                  onChange={e => setBewerkForm(f => ({ ...f, geen_cijfers_nulmeting: e.target.checked }))}
                  className="w-4 h-4 accent-accent"
                />
                <label htmlFor="bewerk_geen_cijfers" className="text-sm text-text-secondary cursor-pointer">Nieuwe woning — geen cijfers beschikbaar</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-text-secondary">Bezetting (%)</label>
                  <input type="number" className="input w-full text-sm" placeholder="62" min="0" max="100" step="0.1" disabled={bewerkForm.geen_cijfers_nulmeting} value={bewerkForm.kpi_bezetting_nulmeting} onChange={e => setBewerkForm(f => ({ ...f, kpi_bezetting_nulmeting: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">ADR (€)</label>
                  <input type="number" className="input w-full text-sm" placeholder="89" min="0" step="0.01" disabled={bewerkForm.geen_cijfers_nulmeting} value={bewerkForm.kpi_adr_nulmeting} onChange={e => setBewerkForm(f => ({ ...f, kpi_adr_nulmeting: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Reviewscore</label>
                  <input type="number" className="input w-full text-sm" placeholder="4.6" min="1" max="5" step="0.1" disabled={bewerkForm.geen_cijfers_nulmeting} value={bewerkForm.kpi_reviewscore_nulmeting} onChange={e => setBewerkForm(f => ({ ...f, kpi_reviewscore_nulmeting: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary">Aantal reviews</label>
                  <input type="number" className="input w-full text-sm" placeholder="24" min="0" disabled={bewerkForm.geen_cijfers_nulmeting} value={bewerkForm.kpi_reviews_nulmeting} onChange={e => setBewerkForm(f => ({ ...f, kpi_reviews_nulmeting: e.target.value }))} />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs text-text-secondary">Omzet 365d (€)</label>
                  <input type="number" className="input w-full text-sm" placeholder="24000" min="0" step="0.01" disabled={bewerkForm.geen_cijfers_nulmeting} value={bewerkForm.kpi_omzet_365d_nulmeting} onChange={e => setBewerkForm(f => ({ ...f, kpi_omzet_365d_nulmeting: e.target.value }))} />
                </div>
              </div>
            </div>

            {bewerkFout && <p className="text-sm text-danger bg-danger/10 rounded-xl p-3">{bewerkFout}</p>}
            {bewerkSucces && <p className="text-sm text-success bg-success/10 rounded-xl p-3">Opgeslagen!</p>}

            <button type="submit" disabled={bewerkBezig} className="btn-primary text-sm">
              {bewerkBezig ? "Opslaan..." : "Wijzigingen opslaan"}
            </button>
          </form>
        )}
      </div>

      {/* Voortgang + extra omzet */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4 text-center sm:col-span-2">
          <p className="text-xs text-text-secondary mb-2">Voortgang onboarding</p>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-1 bg-border rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${pct >= 80 ? "bg-success" : pct >= 40 ? "bg-warning" : "bg-accent"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-bold text-primary text-lg">{pct}%</span>
          </div>
          <p className="text-xs text-text-secondary">{voltooid}/{totaal} stappen afgerond</p>
        </div>
        <div className={`card p-4 text-center ${extraOmzet !== null ? "border-success/30" : ""}`}>
          <p className="text-xs text-text-secondary mb-1">Extra omzet</p>
          {extraOmzet !== null ? (
            <>
              <p className="text-2xl font-bold text-success">+ €{extraOmzet.toLocaleString("nl-NL")}</p>
              <p className="text-xs text-text-secondary">{klantData.extra_omzet_periode}</p>
            </>
          ) : (
            <p className="text-sm text-text-secondary mt-2">Voeg een meting toe om te berekenen</p>
          )}
        </div>
      </div>

      {/* KPI vergelijking */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="font-semibold text-primary">KPI vergelijking</h2>
          <span className="text-xs text-text-secondary bg-surface px-2 py-1 rounded-lg">Bron: PriceLabs</span>
        </div>
        {klantData.geen_cijfers_nulmeting ? (
          <p className="text-sm text-text-secondary bg-surface rounded-xl p-4">
            Nieuwe woning — geen nulmeting beschikbaar. KPI&apos;s worden bijgehouden zodra er metingen worden toegevoegd.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Bezetting", nul: klantData.kpi_bezetting_nulmeting, nu: laatste?.bezetting, suffix: "%", decimals: 1 },
              { label: "ADR", nul: klantData.kpi_adr_nulmeting, nu: laatste?.adr, prefix: "€", decimals: 0 },
              {
                label: "RevPAR",
                nul: klantData.kpi_bezetting_nulmeting && klantData.kpi_adr_nulmeting
                  ? Math.round((klantData.kpi_bezetting_nulmeting / 100) * klantData.kpi_adr_nulmeting)
                  : null,
                nu: laatste?.bezetting && laatste?.adr
                  ? Math.round((laatste.bezetting / 100) * laatste.adr)
                  : null,
                prefix: "€",
                decimals: 0,
              },
              { label: "Reviewscore", nul: klantData.kpi_reviewscore_nulmeting, nu: laatste?.reviewscore, suffix: "/5", decimals: 1 },
              { label: "Reviews", nul: klantData.kpi_reviews_nulmeting, nu: laatste?.reviews_aantal, decimals: 0 },
              { label: "Omzet 365d", nul: klantData.kpi_omzet_365d_nulmeting, nu: laatste?.omzet_365d, prefix: "€", decimals: 0 },
            ].map(({ label, nul, nu, suffix = "", prefix = "", decimals }) => (
              <div key={label} className="bg-surface rounded-xl p-3 text-center">
                <p className="text-xs text-text-secondary mb-1">{label}</p>
                <p className="text-sm font-semibold text-text-secondary">{nul != null ? `${prefix}${nul}${suffix}` : "—"}</p>
                <p className="text-lg font-bold text-primary">
                  {nu != null ? `${prefix}${nu}${suffix}` : <span className="text-sm text-text-secondary">geen meting</span>}
                </p>
                {nul != null && nu != null && (
                  <p className={`text-xs font-semibold ${nu > nul ? "text-success" : nu < nul ? "text-danger" : "text-text-secondary"}`}>
                    {nu > nul ? "+" : ""}{(nu - nul).toFixed(decimals)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Checklist */}
      <div className="card p-5">
        <h2 className="font-semibold text-primary mb-4">Checklist</h2>
        <div className="space-y-4">
          {Object.entries(groepen).map(([fase, items]) => (
            <div key={fase}>
              <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">{fase}</h3>
              <div className="space-y-1">
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-surface group">
                    <button
                      onClick={() => toggleChecklist(item)}
                      disabled={bezig === `check-${item.id}`}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${item.voltooid ? "bg-success border-success text-white" : "border-border hover:border-success"}`}
                    >
                      {item.voltooid && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className={`flex-1 text-sm ${item.voltooid ? "line-through text-text-secondary" : "text-primary"}`}>{item.naam}</span>
                    {item.voltooid_op && (
                      <span className="text-xs text-text-secondary hidden group-hover:block">
                        {new Date(item.voltooid_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                      </span>
                    )}
                    <button onClick={() => verwijderItem(item.id)} className="text-danger opacity-0 group-hover:opacity-100 text-xs">✕</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={voegItemToe} className="mt-4 pt-4 border-t border-border flex gap-2 flex-wrap">
          <input
            className="input flex-1 min-w-32 text-sm"
            placeholder="Fase (bijv. Prijsstrategie)"
            value={nieuwItem.fase}
            onChange={e => setNieuwItem(f => ({ ...f, fase: e.target.value }))}
          />
          <input
            className="input flex-1 min-w-48 text-sm"
            placeholder="Naam stap"
            value={nieuwItem.naam}
            onChange={e => setNieuwItem(f => ({ ...f, naam: e.target.value }))}
          />
          <button type="submit" disabled={bezig === "nieuw-item"} className="btn-primary text-sm">+ Toevoegen</button>
        </form>
      </div>

      {/* To-do's */}
      <div className="card p-5">
        <h2 className="font-semibold text-primary mb-4">To-do&apos;s voor klant</h2>
        <div className="space-y-2">
          {todos.length === 0 && <p className="text-sm text-text-secondary">Nog geen to-do&apos;s.</p>}
          {todos.map(todo => (
            <div key={todo.id} className={`flex items-start gap-3 p-3 rounded-xl ${todo.gedaan ? "opacity-60" : "bg-surface"}`}>
              <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${todo.gedaan ? "bg-success border-success text-white" : "border-border"}`}>
                {todo.gedaan && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className={`text-sm ${todo.gedaan ? "line-through text-text-secondary" : "text-primary"}`}>{todo.tekst}</p>
                {todo.deadline && <p className="text-xs text-text-secondary mt-0.5">Deadline: {new Date(todo.deadline).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}</p>}
                {todo.gedaan_op && <p className="text-xs text-success mt-0.5">Gedaan op {new Date(todo.gedaan_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}</p>}
              </div>
              {!todo.gedaan && (
                <button onClick={() => verwijderTodo(todo.id)} className="text-danger text-xs opacity-60 hover:opacity-100">✕</button>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={voegTodoToe} className="mt-4 pt-4 border-t border-border flex gap-2 flex-wrap">
          <input
            className="input flex-1 min-w-48 text-sm"
            placeholder="Bijv. Vul de voorzieningenlijst volledig in"
            value={nieuwTodo.tekst}
            onChange={e => setNieuwTodo(f => ({ ...f, tekst: e.target.value }))}
          />
          <input
            type="date"
            className="input text-sm"
            value={nieuwTodo.deadline}
            onChange={e => setNieuwTodo(f => ({ ...f, deadline: e.target.value }))}
          />
          <button type="submit" disabled={bezig === "nieuw-todo"} className="btn-primary text-sm">+ To-do</button>
        </form>
      </div>

      {/* Activiteiten log */}
      <div className="card p-5">
        <h2 className="font-semibold text-primary mb-4">Activiteiten log</h2>
        <div className="space-y-2 mb-4">
          {activiteiten.length === 0 && <p className="text-sm text-text-secondary">Nog geen activiteiten.</p>}
          {activiteiten.map(act => (
            <div key={act.id} className="flex items-start gap-3 group">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mt-0.5 shrink-0 ${categorieKleur[act.categorie] || categorieKleur.overig}`}>{act.categorie}</span>
              <div className="flex-1">
                <p className="text-sm text-primary">{act.tekst}</p>
                <p className="text-xs text-text-secondary">{new Date(act.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</p>
              </div>
              <button onClick={() => verwijderActiviteit(act.id)} className="text-danger text-xs opacity-0 group-hover:opacity-100">✕</button>
            </div>
          ))}
        </div>
        <form onSubmit={voegActiviteitToe} className="flex gap-2 flex-wrap pt-3 border-t border-border">
          <select
            className="input text-sm"
            value={nieuwActiviteit.categorie}
            onChange={e => setNieuwActiviteit(f => ({ ...f, categorie: e.target.value as "prijs" | "advertentie" | "review" | "overig" }))}
          >
            <option value="advertentie">Advertentie</option>
            <option value="prijs">Prijs</option>
            <option value="review">Review</option>
            <option value="overig">Overig</option>
          </select>
          <input
            className="input flex-1 min-w-48 text-sm"
            placeholder="Bijv. Prijsstrategie ingesteld — weekendtoeslag +22%"
            value={nieuwActiviteit.tekst}
            onChange={e => setNieuwActiviteit(f => ({ ...f, tekst: e.target.value }))}
          />
          <button type="submit" disabled={bezig === "nieuw-act"} className="btn-primary text-sm">+ Log</button>
        </form>
      </div>

      {/* KPI meting toevoegen */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="font-semibold text-primary">Nieuwe KPI meting</h2>
          <span className="text-xs text-text-secondary bg-surface px-2 py-1 rounded-lg">Cijfers uit PriceLabs</span>
        </div>
        {fout && <p className="text-sm text-danger bg-danger/10 rounded-xl p-3 mb-3">{fout}</p>}
        <form onSubmit={voegMetingToe} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-secondary">Bezetting (%)</label>
              <input type="number" className="input w-full text-sm" placeholder="71" min="0" max="100" step="0.1" value={nieuweMeting.bezetting} onChange={e => setNieuweMeting(f => ({ ...f, bezetting: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary">ADR (€)</label>
              <input type="number" className="input w-full text-sm" placeholder="108" min="0" step="0.01" value={nieuweMeting.adr} onChange={e => setNieuweMeting(f => ({ ...f, adr: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Reviewscore</label>
              <input type="number" className="input w-full text-sm" placeholder="4.7" min="1" max="5" step="0.1" value={nieuweMeting.reviewscore} onChange={e => setNieuweMeting(f => ({ ...f, reviewscore: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Aantal reviews</label>
              <input type="number" className="input w-full text-sm" placeholder="28" min="0" value={nieuweMeting.reviews_aantal} onChange={e => setNieuweMeting(f => ({ ...f, reviews_aantal: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Omzet 365d (€)</label>
              <input type="number" className="input w-full text-sm" placeholder="28500" min="0" step="0.01" value={nieuweMeting.omzet_365d} onChange={e => setNieuweMeting(f => ({ ...f, omzet_365d: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Datum meting</label>
              <input type="date" className="input w-full text-sm" value={nieuweMeting.meting_datum} onChange={e => setNieuweMeting(f => ({ ...f, meting_datum: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary">Omzet in periode (€)</label>
              <input type="number" className="input w-full text-sm" placeholder="3240" min="0" step="0.01" value={nieuweMeting.omzet_periode_bedrag} onChange={e => setNieuweMeting(f => ({ ...f, omzet_periode_bedrag: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-text-secondary">Periode omschrijving</label>
              <input className="input w-full text-sm" placeholder="Juli 2026" value={nieuweMeting.omzet_periode_label} onChange={e => setNieuweMeting(f => ({ ...f, omzet_periode_label: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-text-secondary">Notitie (optioneel)</label>
            <input className="input w-full text-sm" placeholder="Bijv. eerste meting na 30 dagen live" value={nieuweMeting.notitie} onChange={e => setNieuweMeting(f => ({ ...f, notitie: e.target.value }))} />
          </div>
          <button type="submit" disabled={bezig === "nieuw-meting"} className="btn-primary text-sm">
            {bezig === "nieuw-meting" ? "Opslaan..." : "Meting opslaan"}
          </button>
        </form>

        {metingen.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Metingen historie</p>
            {metingen.map(m => (
              <div key={m.id} className="text-xs text-text-secondary flex gap-3 flex-wrap">
                <span className="font-medium text-primary">
                  {m.meting_datum
                    ? new Date(m.meting_datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
                    : m.omzet_periode_label || new Date(m.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                </span>
                {m.bezetting != null && <span>Bezetting: {m.bezetting}%</span>}
                {m.adr != null && <span>ADR: €{m.adr}</span>}
                {m.bezetting != null && m.adr != null && <span>RevPAR: €{Math.round((m.bezetting / 100) * m.adr)}</span>}
                {m.omzet_365d != null && <span>365d: €{m.omzet_365d.toLocaleString("nl-NL")}</span>}
                {m.reviewscore != null && <span>Score: {m.reviewscore}/5</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
