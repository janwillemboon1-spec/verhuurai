"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Lid {
  id: string;
  email: string;
  tag: string;
  gesynchroniseerd_op: string;
}

export default function AdminCommunityPage() {
  const [leden, setLeden] = useState<Lid[]>([]);
  const [laden, setLaden] = useState(true);
  const [syncBezig, setSyncBezig] = useState(false);
  const [syncResultaat, setSyncResultaat] = useState<string | null>(null);
  const [fout, setFout] = useState<string | null>(null);

  useEffect(() => {
    laadLeden();
  }, []);

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
      const res = await fetch("/api/admin/sync-community?secret=verhuurai-cron-2026", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSyncResultaat(`Gesynchroniseerd: ${data.gesynchroniseerd} leden`);
      await laadLeden();
    } catch (err: any) {
      setFout(err?.message || "Sync mislukt");
    }
    setSyncBezig(false);
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-primary">Community leden</h1>
            <p className="text-text-secondary text-sm mt-1">{leden.length} leden geregistreerd</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={syncMailblue}
              disabled={syncBezig}
              className={`btn-primary flex items-center gap-2 ${syncBezig ? "opacity-60 cursor-not-allowed" : ""}`}
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
            <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
          </div>
        </div>

        {syncResultaat && (
          <div className="bg-success/10 border border-success/20 rounded-xl p-3 text-success text-sm font-semibold">
            {syncResultaat}
          </div>
        )}
        {fout && (
          <div className="bg-danger/10 border border-danger/20 rounded-xl p-3 text-danger text-sm">
            {fout}
          </div>
        )}

        <div className="card overflow-hidden">
          {laden ? (
            <div className="p-8 text-center text-text-secondary">Laden...</div>
          ) : leden.length === 0 ? (
            <div className="p-8 text-center text-text-secondary">
              Nog geen leden. Klik op &quot;Sync Mailblue&quot; om te synchroniseren.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-surface border-b border-border">
                  <tr>
                    {["E-mail", "Tag", "Gesynchroniseerd"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {leden.map(lid => (
                    <tr key={lid.id} className="hover:bg-surface/50">
                      <td className="px-4 py-3 text-primary font-medium">{lid.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${lid.tag === "Founding member" ? "bg-accent/10 text-accent" : "bg-success/10 text-success"}`}>
                          {lid.tag || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-xs">
                        {new Date(lid.gesynchroniseerd_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
