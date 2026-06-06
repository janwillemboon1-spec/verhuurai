"use client";

import Link from "next/link";

interface Contact {
  naam: string;
  email: string;
  soort: string;
  plaats: string;
  datum: string;
}

const SOORT_KLEUR: Record<string, string> = {
  "Listing Optimizer": "bg-accent/10 text-accent",
  "Review Monitor": "bg-primary/10 text-primary",
  "Prijscalculator": "bg-success/10 text-success",
};

export default function ContactenClient({ contacten }: { contacten: Contact[] }) {
  const downloadCSV = () => {
    const rijen = [
      ["email", "voornaam", "soort_rapport", "plaats", "datum"],
      ...contacten.map(c => [
        c.email,
        c.naam.replace(/,/g, " "),
        c.soort,
        c.plaats.replace(/,/g, " "),
        new Date(c.datum).toLocaleDateString("nl-NL"),
      ]),
    ];
    const csv = rijen.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verhuurai-contacten-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadEmailsOnly = () => {
    const emailLijst = Array.from(new Set(contacten.map(c => c.email))).filter(Boolean);
    const csv = ["email", ...emailLijst].join("\n");
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verhuurai-emails-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unickeEmails = Array.from(new Set(contacten.map(c => c.email))).length;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-primary">Contacten</h1>
            <p className="text-text-secondary text-sm mt-1">{unickeEmails} unieke emailadressen · {contacten.length} contactmomenten</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
            <button onClick={downloadEmailsOnly} className="btn-secondary text-sm flex items-center gap-2">
              ⬇️ Emails downloaden
            </button>
            <button onClick={downloadCSV} className="btn-primary text-sm flex items-center gap-2">
              ⬇️ Volledig CSV (Mailblue)
            </button>
          </div>
        </div>

        {/* Tabel */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Email", "Soort rapport", "Plaats", "Datum"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {contacten.map((c, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary">{c.naam || "—"}</td>
                    <td className="px-4 py-3 text-text-secondary">{c.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SOORT_KLEUR[c.soort] || "bg-border text-text-secondary"}`}>
                        {c.soort}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">{c.plaats || "—"}</td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {new Date(c.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
