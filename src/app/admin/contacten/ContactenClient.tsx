"use client";

import Link from "next/link";
import { useState, useMemo } from "react";

interface Contact {
  naam: string;
  email: string;
  soort: string;
  plaats: string;
  datum: string;
}

type SortField = "datum" | "naam" | "soort" | "plaats";
type SortDir = "asc" | "desc";

const SOORT_KLEUR: Record<string, string> = {
  "Listing Optimizer": "bg-accent/10 text-accent",
  "Host Performance Audit": "bg-primary/10 text-primary",
  "Prijscalculator": "bg-success/10 text-success",
};

export default function ContactenClient({ contacten }: { contacten: Contact[] }) {
  const [filterSoort, setFilterSoort] = useState<string>("alle");
  const [sortField, setSortField] = useState<SortField>("datum");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const gefilterdEnGesorteerd = useMemo(() => {
    let lijst = filterSoort === "alle" ? contacten : contacten.filter(c => c.soort === filterSoort);
    lijst = [...lijst].sort((a, b) => {
      let va = a[sortField] ?? "";
      let vb = b[sortField] ?? "";
      const cmp = va.localeCompare(vb, "nl", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return lijst;
  }, [contacten, filterSoort, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir(field === "datum" ? "desc" : "asc");
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return <span className="text-border ml-1">↕</span>;
    return <span className="text-accent ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const downloadCSV = () => {
    const rijen = [
      ["email", "voornaam", "soort_rapport", "plaats", "datum"],
      ...gefilterdEnGesorteerd.map(c => [
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
    const emailLijst = Array.from(new Set(gefilterdEnGesorteerd.map(c => c.email))).filter(Boolean);
    const csv = ["email", ...emailLijst].join("\n");
    const blob = new Blob([csv], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `verhuurai-emails-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const unickeEmails = Array.from(new Set(gefilterdEnGesorteerd.map(c => c.email))).length;
  const soorten = ["alle", "Listing Optimizer", "Host Performance Audit", "Prijscalculator"];

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl text-primary">Contacten</h1>
            <p className="text-text-secondary text-sm mt-1">
              {unickeEmails} unieke emails · {gefilterdEnGesorteerd.length} van {contacten.length} contacten
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
            <button onClick={downloadEmailsOnly} className="btn-secondary text-sm">⬇️ Emails</button>
            <button onClick={downloadCSV} className="btn-primary text-sm">⬇️ CSV (Mailblue)</button>
          </div>
        </div>

        {/* Filter + zoek */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <span className="text-sm font-semibold text-primary">Filter:</span>
          <div className="flex gap-2 flex-wrap">
            {soorten.map(s => (
              <button
                key={s}
                onClick={() => setFilterSoort(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-all ${
                  filterSoort === s
                    ? "bg-primary text-white"
                    : "bg-border/50 text-text-secondary hover:bg-border"
                }`}
              >
                {s === "alle" ? `Alle (${contacten.length})` : `${s} (${contacten.filter(c => c.soort === s).length})`}
              </button>
            ))}
          </div>
        </div>

        {/* Tabel */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none"
                    onClick={() => toggleSort("naam")}
                  >
                    Naam {sortIcon("naam")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Email</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none"
                    onClick={() => toggleSort("soort")}
                  >
                    Soort {sortIcon("soort")}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none"
                    onClick={() => toggleSort("plaats")}
                  >
                    Plaats {sortIcon("plaats")}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none"
                    onClick={() => toggleSort("datum")}
                  >
                    Datum {sortIcon("datum")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gefilterdEnGesorteerd.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-sm text-text-secondary text-center">Geen contacten gevonden.</td></tr>
                )}
                {gefilterdEnGesorteerd.map((c, i) => (
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
