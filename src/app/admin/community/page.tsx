"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Lid {
  id: string;
  email: string;
  tag: string;
  bron: string;
  verloopt_op: string | null;
  gesynchroniseerd_op: string;
}

const PERIODES = [
  { label: "7 dagen", dagen: 7 },
  { label: "30 dagen", dagen: 30 },
  { label: "90 dagen", dagen: 90 },
  { label: "180 dagen", dagen: 180 },
  { label: "1 jaar", dagen: 365 },
  { label: "Permanent", dagen: 0 },
];

function toegangStatus(lid: Lid): { label: string; kleur: string } {
  if (!lid.verloopt_op) return { label: "Permanent", kleur: "bg-success/10 text-success" };
  const verlopen = new Date(lid.verloopt_op) < new Date();
  if (verlopen) return { label: "Verlopen", kleur: "bg-danger/10 text-danger" };
  const dagen = Math.ceil((new Date(lid.verloopt_op).getTime() - Date.now()) / 86400000);
  return { label: `Nog ${dagen}d`, kleur: "bg-warning/10 text-warning" };
}

export default function AdminCommunityPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [laden, setLaden] = useState(true);
  const [syncBezig, setSyncBezig] = useState(false);
  const [syncResultaat, setSyncResultaat] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  // Handmatig toevoegen
  const [nieuwEmail, setNieuwEmail] = useState("");
  const [geselecteerdePeriode, setGeselecteerdePeriode] = useState(30);
  const [toevoegenBezig, setToevoegenBezig] = useState(false);
  const [toevoegenResultaat, setToevoegenResultaat] = useState<string | null>(null);

  // Verwijderen
  const [verwijderenEmail, setVerwijderenEmail] = useState<string | null>(null);

  useEffect(() => { laadLeden(); }, []);

  const laadLeden = async () => {
    setLaden(true);
    try {
      const res = await fetch("/api/admin/community-leden");
      const data = await res.json();
      setLeden(data.leden || []);
    } catch {
      setFout("Leden laden mislukt");
    }
    setLaden(false);
  };

  const syncMailblue = async () => {
    setSyncBezig(true);
    setSyncResultaat(null);
    setFout(null);
    try {
      const res = await fetch("/api/admin/sync-community?secret=verhuurai-cron-2026", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResultaat(`Gesynchroniseerd: ${data.gesynchroniseerd} leden`);
      await laadLeden();
    } catch (err: any) {
      setFout(err?.message || "Sync mislukt");
    }
    setSyncBezig(false);
  };

  const voegToe = async () => {
    if (!nieuwEmail.includes("@")) return;
    setToevoegenBezig(true);
    setToevoegenResultaat(null);
    setFout(null);
    try {
      const res = await fetch("/api/admin/community-leden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: nieuwEmail, dagelijkseDuur: geselecteerdePeriode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToevoegenResultaat(`${nieuwEmail} toegevoegd`);
      setNieuwEmail("");
      await laadLeden();
    } catch (err: any) {
      setFout(err?.message || "Toevoegen mislukt");
    }
    setToevoegenBezig(false);
  };

  const verwijder = async (email: string) => {
    setVerwijderenEmail(email);
    try {
      const res = await fetch("/api/admin/community-leden", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      await laadLeden();
    } catch {
      setFout("Verwijderen mislukt");
    }
    setVerwijderenEmail(null);
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-primary">Community leden</h1>
            <p className="text-text-secondary text-sm mt-1">{leden.length} leden geregistreerd</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={syncMailblue}
              disabled={syncBezig}
              className={`btn-secondary flex items-center gap-2 text-sm ${syncBezig ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              {syncBezig ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Synchroniseren...
                </>
              ) : "↻ Sync Mailblue"}
            </button>
            <Link href="/cockpit" className="btn-secondary text-sm">← Cockpit</Link>
          </div>
        </div>

        {/* Meldingen */}
        {syncResultaat && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-success text-sm font-semibold">
            ✓ {syncResultaat}
          </div>
        )}
        {toevoegenResultaat && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-success text-sm font-semibold">
            ✓ {toevoegenResultaat}
          </div>
        )}
        {fout && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
            {fout}
          </div>
        )}

        {/* Handmatig toevoegen */}
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-primary">Handmatig toegang geven</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={nieuwEmail}
              onChange={(e) => setNieuwEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && voegToe()}
              placeholder="emailadres@voorbeeld.nl"
              className="input flex-1"
            />
            <div className="flex gap-2 flex-wrap">
              {PERIODES.map((p) => (
                <button
                  key={p.dagen}
                  onClick={() => setGeselecteerdePeriode(p.dagen)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium border transition-colors ${
                    geselecteerdePeriode === p.dagen
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border text-text-secondary hover:border-accent/50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={voegToe}
            disabled={!nieuwEmail.includes("@") || toevoegenBezig}
            className={`btn-primary ${!nieuwEmail.includes("@") || toevoegenBezig ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            {toevoegenBezig ? "Toevoegen..." : "Toegang geven →"}
          </button>
          <p className="text-xs text-text-secondary">
            Als het e-mailadres al bestaat wordt de toegangsperiode overschreven.{" "}
            {geselecteerdePeriode === 0
              ? "Geselecteerd: permanent."
              : `Geselecteerd: ${geselecteerdePeriode} dagen.`}
          </p>
        </div>

        {/* Ledenlijst */}
        <div className="card overflow-hidden">
          {laden ? (
            <div className="p-8 text-center text-text-secondary">Laden...</div>
          ) : leden.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              Nog geen leden. Sync Mailblue of voeg handmatig toe.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    {["E-mail", "Tag/Bron", "Toegang", "Verloopt op", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leden.map(lid => {
                    const status = toegangStatus(lid);
                    return (
                      <tr key={lid.id} className="hover:bg-surface/50">
                        <td className="px-4 py-3 text-primary font-medium">{lid.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            lid.tag === "Founding member" ? "bg-accent/10 text-accent" :
                            lid.tag === "Handmatig" ? "bg-primary/10 text-primary" :
                            "bg-success/10 text-success"
                          }`}>
                            {lid.tag || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.kleur}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-text-secondary text-xs">
                          {lid.verloopt_op
                            ? new Date(lid.verloopt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => verwijder(lid.email)}
                            disabled={verwijderenEmail === lid.email}
                            className="text-xs text-danger hover:underline disabled:opacity-40"
                          >
                            {verwijderenEmail === lid.email ? "..." : "Verwijderen"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
