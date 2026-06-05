"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import { createClient } from "@/lib/supabase/client";

interface Rapport {
  id: string;
  periode_omschrijving: string;
  aangemaakt_op: string;
  gearchiveerd: boolean;
}

interface Abonnement {
  id: string;
  airbnb_url: string;
  listing_naam: string | null;
  frequentie: string;
  billing_interval: string;
  status: string;
  volgende_rapport_datum: string | null;
  rapporten: Rapport[];
}

interface ListingRapport {
  id: string;
  host_naam: string | null;
  aangemaakt_op: string;
}

export default function DashboardClient({
  email,
  abonnementen: initieel,
  listingRapporten,
  welkom,
  resterendeCredits,
}: {
  email: string;
  abonnementen: Abonnement[];
  listingRapporten: ListingRapport[];
  welkom: boolean;
  resterendeCredits?: number;
}) {
  const router = useRouter();
  const [abonnementen, setAbonnementen] = useState(initieel);
  const [toonArchief, setToonArchief] = useState<Record<string, boolean>>({});
  const [bezig, setBezig] = useState<string | null>(null);
  const [wijzigMenu, setWijzigMenu] = useState<string | null>(null);

  const sluitWijzigMenu = () => setWijzigMenu(null);

  const uitloggen = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  const verwijderWoning = async (aboId: string) => {
    if (!confirm("Weet je zeker dat je deze woning wil verwijderen? Dit kan niet ongedaan worden gemaakt.")) return;
    setBezig(aboId);
    await fetch("/api/abonnement-verwijderen", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ abonnementId: aboId }),
    });
    setAbonnementen((prev) => prev.filter((a) => a.id !== aboId));
    setBezig(null);
  };

  const archiveerRapport = async (aboId: string, rapportId: string, gearchiveerd: boolean) => {
    setBezig(rapportId);
    await fetch("/api/rapport-archiveren", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rapportId, gearchiveerd }),
    });
    setAbonnementen((prev) =>
      prev.map((abo) =>
        abo.id !== aboId ? abo : {
          ...abo,
          rapporten: abo.rapporten.map((r) =>
            r.id === rapportId ? { ...r, gearchiveerd } : r
          ),
        }
      )
    );
    setBezig(null);
  };

  return (
    <div className="min-h-screen bg-background" onClick={wijzigMenu ? sluitWijzigMenu : undefined}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {welkom && (
          <div className="card p-5 bg-success/10 border-success/30 flex items-center gap-4">
            <span className="text-3xl">🎉</span>
            <div>
              <p className="font-semibold text-success">Abonnement geactiveerd!</p>
              <p className="text-sm text-text-secondary">Boni stuurt je voortaan automatisch rapporten.</p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BoniAvatar size={50} />
            <div>
              <h1 className="font-display text-2xl text-primary">Mijn dashboard</h1>
              <p className="text-sm text-text-secondary">{email}</p>
            </div>
          </div>
          <button onClick={uitloggen} className="btn-secondary text-sm">Uitloggen</button>
        </div>

        {/* Listing Optimizer rapporten */}
        {listingRapporten.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-display text-xl text-primary">Listing Optimizer rapporten</h2>
            <div className="card overflow-hidden">
              {listingRapporten.map((r) => (
                <div key={r.id} className="flex items-center justify-between px-5 py-4 border-b border-border last:border-0 hover:bg-surface/50 transition-colors">
                  <div>
                    <p className="font-semibold text-primary text-sm">{r.host_naam || "Advertentie-analyse"}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <a href={`/dashboard/listing-rapporten/${r.id}`} className="text-accent text-sm font-semibold">
                    Bekijk →
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Woningen */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-primary">Review Monitor rapporten</h2>
            <Link href="/review-monitor/aanmelden" className="btn-primary text-sm py-2">
              + Woning toevoegen
            </Link>
          </div>

          {abonnementen.length === 0 ? (
            <div className="card p-8 text-center space-y-4">
              <div className="text-4xl">🏠</div>
              <h3 className="font-display text-xl text-primary">Nog geen Review Monitor actief</h3>
              <Link href="/review-monitor/aanmelden" className="btn-primary inline-block">
                Eerste rapport aanvragen →
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {abonnementen.map((abo) => {
                const actieveRapporten = abo.rapporten?.filter((r) => !r.gearchiveerd)
                  .sort((a, b) => new Date(b.aangemaakt_op).getTime() - new Date(a.aangemaakt_op).getTime()) ?? [];
                const gearchiveerdeRapporten = abo.rapporten?.filter((r) => r.gearchiveerd)
                  .sort((a, b) => new Date(b.aangemaakt_op).getTime() - new Date(a.aangemaakt_op).getTime()) ?? [];
                const archiefOpen = toonArchief[abo.id] ?? false;

                return (
                  <div key={abo.id} className="card overflow-hidden">
                    {/* Woning header */}
                    <div className="p-5 flex flex-wrap items-start justify-between gap-3 border-b border-border">
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="font-semibold text-primary">{abo.listing_naam || "Mijn woning"}</p>
                        <p className="text-xs text-text-secondary truncate">{abo.airbnb_url}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            abo.status === "active" ? "bg-success/10 text-success"
                            : abo.status === "trial" ? "bg-warning/10 text-warning"
                            : "bg-border text-text-secondary"
                          }`}>
                            {abo.status === "active" ? "Actief" : abo.status === "trial" ? "Proefperiode" : "Geannuleerd"}
                          </span>
                          <span className="text-xs text-text-secondary">
                            {abo.frequentie === "weekly" ? "Wekelijks" : "Maandelijks"}
                            {" · "}
                            {abo.billing_interval === "year" ? "Jaarlijks betaald" : "Maandelijks betaald"}
                          </span>
                          {abo.volgende_rapport_datum && (
                            <span className="text-xs text-text-secondary">
                              · Volgend rapport:{" "}
                              {new Date(abo.volgende_rapport_datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long" })}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0 relative">
                        {abo.status === "trial" && (
                          <Link href={`/review-monitor/abonneren/${abo.id}`} className="btn-primary text-sm py-2">
                            Activeer abonnement →
                          </Link>
                        )}
                        {abo.status === "active" && (
                          <div className="relative">
                            <button
                              onClick={() => setWijzigMenu(wijzigMenu === abo.id ? null : abo.id)}
                              className="btn-secondary text-sm py-2"
                            >
                              Wijzig abonnement ▾
                            </button>
                            {wijzigMenu === abo.id && (
                              <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-xl shadow-lg z-20 min-w-[200px] overflow-hidden">
                                <Link
                                  href={`/review-monitor/abonneren/${abo.id}`}
                                  onClick={() => setWijzigMenu(null)}
                                  className="flex items-center gap-2 px-4 py-3 text-sm text-primary hover:bg-background transition-colors"
                                >
                                  ⚙️ Abonnement aanpassen
                                </Link>
                                <button
                                  onClick={() => {
                                    setWijzigMenu(null);
                                    verwijderWoning(abo.id);
                                  }}
                                  className="flex items-center gap-2 px-4 py-3 text-sm text-danger hover:bg-danger/5 transition-colors w-full text-left border-t border-border"
                                >
                                  🚫 Abonnement beëindigen
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {abo.status !== "active" && (
                          <button
                            onClick={() => verwijderWoning(abo.id)}
                            disabled={bezig === abo.id}
                            className="text-xs text-danger hover:underline px-2 py-1"
                          >
                            {bezig === abo.id ? "..." : "Verwijder"}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actieve rapporten */}
                    {actieveRapporten.length === 0 && gearchiveerdeRapporten.length === 0 ? (
                      <div className="p-5 text-center text-sm text-text-secondary">
                        Nog geen rapporten — het eerste rapport wordt binnenkort gegenereerd.
                      </div>
                    ) : (
                      <>
                        {actieveRapporten.length === 0 && (
                          <div className="p-4 text-center text-sm text-text-secondary">
                            Alle rapporten zijn gearchiveerd.
                          </div>
                        )}
                        {actieveRapporten.map((rapport) => (
                          <div key={rapport.id} className="flex items-center justify-between px-4 py-3 border-b border-border hover:bg-surface/50 transition-colors group">
                            <Link href={`/dashboard/rapporten/${rapport.id}`} className="flex-1">
                              <p className="text-sm font-semibold text-primary">{rapport.periode_omschrijving}</p>
                              <p className="text-xs text-text-secondary">
                                {new Date(rapport.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                              </p>
                            </Link>
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => archiveerRapport(abo.id, rapport.id, true)}
                                disabled={bezig === rapport.id}
                                className="text-xs text-text-secondary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                {bezig === rapport.id ? "..." : "Archiveer"}
                              </button>
                              <Link href={`/dashboard/rapporten/${rapport.id}`} className="text-accent text-sm font-semibold">
                                Bekijk →
                              </Link>
                            </div>
                          </div>
                        ))}

                        {/* Archief toggle */}
                        {gearchiveerdeRapporten.length > 0 && (
                          <>
                            <button
                              onClick={() => setToonArchief((prev) => ({ ...prev, [abo.id]: !prev[abo.id] }))}
                              className="w-full px-4 py-2 text-xs text-text-secondary hover:text-primary flex items-center gap-1 border-t border-border"
                            >
                              <span>{archiefOpen ? "▾" : "▸"}</span>
                              Archief ({gearchiveerdeRapporten.length})
                            </button>
                            {archiefOpen && gearchiveerdeRapporten.map((rapport) => (
                              <div key={rapport.id} className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface/30 group">
                                <Link href={`/dashboard/rapporten/${rapport.id}`} className="flex-1 opacity-60">
                                  <p className="text-sm text-primary">{rapport.periode_omschrijving}</p>
                                  <p className="text-xs text-text-secondary">
                                    {new Date(rapport.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
                                  </p>
                                </Link>
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => archiveerRapport(abo.id, rapport.id, false)}
                                    disabled={bezig === rapport.id}
                                    className="text-xs text-text-secondary hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Herstel
                                  </button>
                                  <Link href={`/dashboard/rapporten/${rapport.id}`} className="text-text-secondary text-sm">
                                    Bekijk →
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
