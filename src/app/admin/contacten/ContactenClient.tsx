"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";

interface Contact {
  naam: string;
  email: string;
  soort: string;
  plaats: string;
  datum: string;
}

type SortField = "datum" | "naam" | "soort" | "plaats";
type SortDir = "asc" | "desc";

const LS_KEY = "contacten_laatste_download";

const SOORT_KLEUR: Record<string, string> = {
  "Listing Optimizer": "bg-accent/10 text-accent",
  "Host Performance Audit": "bg-primary/10 text-primary",
  "Prijscalculator": "bg-success/10 text-success",
  "Foto Optimizer": "bg-warning/10 text-warning",
  "Titelanalyse": "bg-danger/10 text-danger",
  "Review Remover": "bg-surface text-text-secondary",
};

function maakCSV(lijst: Contact[]): string {
  const rijen = [
    ["email", "voornaam", "soort_rapport", "plaats", "datum"],
    ...lijst.map(c => [
      c.email,
      c.naam.replace(/,/g, " "),
      c.soort,
      c.plaats.replace(/,/g, " "),
      new Date(c.datum).toLocaleDateString("nl-NL"),
    ]),
  ];
  return rijen.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
}

function triggerDownload(inhoud: string, bestandsnaam: string, type: string) {
  const prefix = type.includes("csv") ? "﻿" : "";
  const blob = new Blob([prefix + inhoud], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = bestandsnaam;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ContactenClient({ contacten }: { contacten: Contact[] }) {
  const [filterSoort, setFilterSoort] = useState<string>("alle");
  const [sortField, setSortField] = useState<SortField>("datum");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [laatsteDownload, setLaatsteDownload] = useState<string | null>(null);

  useEffect(() => {
    setLaatsteDownload(localStorage.getItem(LS_KEY));
  }, []);

  const nieuweLeads = useMemo(() => {
    if (!laatsteDownload) return contacten;
    return contacten.filter(c => c.datum > laatsteDownload);
  }, [contacten, laatsteDownload]);

  const gefilterdEnGesorteerd = useMemo(() => {
    let lijst = filterSoort === "alle" ? contacten : contacten.filter(c => c.soort === filterSoort);
    lijst = [...lijst].sort((a, b) => {
      const va = a[sortField] ?? "";
      const vb = b[sortField] ?? "";
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

  function markeerGezien() {
    const nu = new Date().toISOString();
    localStorage.setItem(LS_KEY, nu);
    setLaatsteDownload(nu);
  }

  function downloadNieuweCSV() {
    triggerDownload(maakCSV(nieuweLeads), `nieuwe-leads-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
    markeerGezien();
  }

  function downloadNieuweEmails() {
    const emails = Array.from(new Set(nieuweLeads.map(c => c.email))).filter(Boolean);
    triggerDownload(["email", ...emails].join("\n"), `nieuwe-emails-${new Date().toISOString().split("T")[0]}.csv`, "text/plain");
    markeerGezien();
  }

  function downloadCSV() {
    triggerDownload(maakCSV(gefilterdEnGesorteerd), `verhuurai-contacten-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
  }

  function downloadEmailsOnly() {
    const emails = Array.from(new Set(gefilterdEnGesorteerd.map(c => c.email))).filter(Boolean);
    triggerDownload(["email", ...emails].join("\n"), `verhuurai-emails-${new Date().toISOString().split("T")[0]}.csv`, "text/plain");
  }

  const unickeEmails = Array.from(new Set(gefilterdEnGesorteerd.map(c => c.email))).length;
  const soorten = ["alle", ...Array.from(new Set(contacten.map(c => c.soort))).sort()];

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
            <Link href="/cockpit/hostboni-admin" className="btn-secondary text-sm">← Cockpit</Link>
            <button onClick={downloadEmailsOnly} className="btn-secondary text-sm">⬇ Emails</button>
            <button onClick={downloadCSV} className="btn-primary text-sm">⬇ CSV (Mailblue)</button>
          </div>
        </div>

        {/* Nieuwe leads */}
        <div className={`card p-5 ${nieuweLeads.length > 0 ? "border-success/30 bg-success/5" : ""}`}>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-semibold text-primary flex items-center gap-2">
                Nieuwe leads
                {nieuweLeads.length > 0 && (
                  <span className="text-xs font-bold bg-success text-white px-2 py-0.5 rounded-full">{nieuweLeads.length}</span>
                )}
              </h2>
              {laatsteDownload ? (
                <p className="text-xs text-text-secondary mt-0.5">
                  Sinds laatste download op {new Date(laatsteDownload).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              ) : (
                <p className="text-xs text-text-secondary mt-0.5">Nog nooit gedownload — alle {contacten.length} contacten worden als nieuw beschouwd.</p>
              )}
            </div>
            {nieuweLeads.length > 0 ? (
              <div className="flex gap-2 flex-wrap">
                <button onClick={markeerGezien} className="btn-secondary text-xs">Markeer als gezien</button>
                <button onClick={downloadNieuweEmails} className="btn-secondary text-sm">⬇ Nieuwe emails</button>
                <button onClick={downloadNieuweCSV} className="btn-primary text-sm">⬇ Nieuwe CSV</button>
              </div>
            ) : (
              <p className="text-sm text-success font-semibold">Alles up-to-date ✓</p>
            )}
          </div>

          {nieuweLeads.length > 0 && (
            <div className="mt-4 space-y-1">
              {nieuweLeads.slice(0, 5).map((c, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${SOORT_KLEUR[c.soort] || "bg-border text-text-secondary"}`}>{c.soort}</span>
                  <span className="text-primary font-medium truncate">{c.naam || c.email}</span>
                  <span className="text-text-secondary text-xs shrink-0">{c.email}</span>
                  <span className="text-text-secondary text-xs shrink-0 ml-auto">
                    {new Date(c.datum).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
              {nieuweLeads.length > 5 && (
                <p className="text-xs text-text-secondary pt-1">+ {nieuweLeads.length - 5} meer</p>
              )}
            </div>
          )}
        </div>

        {/* Filter */}
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
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none" onClick={() => toggleSort("naam")}>
                    Naam {sortIcon("naam")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none" onClick={() => toggleSort("soort")}>
                    Soort {sortIcon("soort")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none" onClick={() => toggleSort("plaats")}>
                    Plaats {sortIcon("plaats")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase cursor-pointer hover:text-primary select-none" onClick={() => toggleSort("datum")}>
                    Datum {sortIcon("datum")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {gefilterdEnGesorteerd.length === 0 && (
                  <tr><td colSpan={5} className="px-5 py-8 text-sm text-text-secondary text-center">Geen contacten gevonden.</td></tr>
                )}
                {gefilterdEnGesorteerd.map((c, i) => (
                  <tr key={i} className={`hover:bg-surface/50 ${nieuweLeads.includes(c) ? "bg-success/5" : ""}`}>
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
