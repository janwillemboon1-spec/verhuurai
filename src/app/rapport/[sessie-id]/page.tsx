"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import { ScoreCircle, VeldScore } from "@/components/ScoreCircle";
import { CopyButton } from "@/components/CopyButton";
import { DeelModal } from "@/components/DeelModal";
import { BoniRapport, VeldRapport, scoreKleur, scoreBgKleur } from "@/types/rapport";

const VELD_ICONEN: Record<string, string> = {
  titel: "📌",
  beschrijving: "📝",
  accommodatie: "🏠",
  toegang: "🔑",
  interactie: "💬",
  andereInfo: "ℹ️",
  voorzieningen: "⚡",
  buurt: "📍",
  vervoer: "🚌",
  fotos: "📸",
  recensies: "⭐",
  hostProfiel: "👤",
  huisregels: "📋",
};

const VELD_NAMEN: Record<string, string> = {
  titel: "Titel",
  beschrijving: "Beschrijving",
  accommodatie: "Accommodatie",
  toegang: "Toegang voor gasten",
  interactie: "Interactie met gasten",
  andereInfo: "Andere belangrijke informatie",
  voorzieningen: "Voorzieningen",
  buurt: "Hoogtepunten van de buurt",
  vervoer: "Vervoersmogelijkheden",
  fotos: "Foto's",
  recensies: "Recensies",
  hostProfiel: "Host profiel",
  huisregels: "Huisregels",
};

const GESCOORDE_VELDEN = [
  "titel",
  "beschrijving",
  "accommodatie",
  "toegang",
  "interactie",
  "andereInfo",
  "voorzieningen",
  "buurt",
  "vervoer",
  "recensies",
  "hostProfiel",
  "huisregels",
] as const;

function VeldSectie({ veldKey, veld }: { veldKey: string; veld: VeldRapport }) {
  const icoon = VELD_ICONEN[veldKey] ?? "📄";
  const naam = VELD_NAMEN[veldKey] ?? veldKey;
  const score = veld.score;
  const bgKleur = scoreBgKleur(score);

  return (
    <div className={`card p-5 sm:p-6 border ${bgKleur} space-y-4`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-xl text-primary flex items-center gap-2">
          <span>{icoon}</span>
          <span>{naam}</span>
        </h3>
        <VeldScore score={score} />
      </div>

      {veld.analyse && (
        <p className="italic text-text-secondary leading-relaxed">
          {veld.analyse}
        </p>
      )}

      {veld.verbeterpunten && veld.verbeterpunten.length > 0 && (
        <div>
          <p className="font-semibold text-primary text-sm mb-2">Verbeterpunten</p>
          <ul className="space-y-1">
            {veld.verbeterpunten.map((punt, i) => (
              <li key={i} className="flex gap-2 text-sm text-text-secondary">
                <span className="mt-0.5 text-accent">•</span>
                <span>{punt}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {veld.herschrevenVersies && veld.herschrevenVersies.length > 0 && (
        <div className="space-y-3">
          <p className="font-semibold text-primary text-sm">Herschreven versie(s)</p>
          {veld.herschrevenVersies.map((v, i) => (
            <div key={i} className="bg-surface rounded-xl p-4 border border-border space-y-2">
              {v.uitleg && (
                <div className="flex items-start gap-1.5">
                  <span className="text-xs font-bold text-accent flex-shrink-0 mt-0.5">Toelichting</span>
                  <p className="text-xs text-text-secondary italic leading-relaxed">{v.uitleg}</p>
                </div>
              )}
              <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
                {v.versie}
              </p>
              <CopyButton tekst={v.versie} />
            </div>
          ))}
        </div>
      )}

      {veld.herschrevenVersie && !veld.herschrevenVersies?.length && (
        <div className="bg-surface rounded-xl p-4 border border-border space-y-2">
          {veld.herschrevenUitleg && (
            <div className="flex items-start gap-1.5">
              <span className="text-xs font-bold text-accent flex-shrink-0 mt-0.5">Toelichting</span>
              <p className="text-xs text-text-secondary italic leading-relaxed">{veld.herschrevenUitleg}</p>
            </div>
          )}
          <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
            {veld.herschrevenVersie}
          </p>
          <CopyButton tekst={veld.herschrevenVersie} />
        </div>
      )}

      {veldKey === "recensies" && veld.voorbeeldReacties && veld.voorbeeldReacties.length > 0 && (
        <div className="space-y-3">
          <p className="font-semibold text-primary text-sm">Voorbeeldreacties op reviews</p>
          {veld.voorbeeldReacties.map((r, i) => (
            <div key={i} className="bg-surface rounded-xl p-4 border border-border space-y-2">
              {r.origineelReview && (
                <p className="text-xs text-text-secondary italic">"{r.origineelReview}"</p>
              )}
              <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
                {r.aanbevolenReactie}
              </p>
              <CopyButton tekst={r.aanbevolenReactie} />
            </div>
          ))}
        </div>
      )}

      {veld.ontbrekendeVoorzieningen && veld.ontbrekendeVoorzieningen.length > 0 && (
        <div>
          <p className="font-semibold text-primary text-sm mb-2">Ontbrekende voorzieningen</p>
          <ul className="space-y-1">
            {veld.ontbrekendeVoorzieningen.map((item, i) => (
              <li key={i} className="text-sm text-text-secondary flex gap-2">
                <span className="text-warning">⚠️</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {veld.algemeneTips && veld.algemeneTips.length > 0 && (
        <div>
          <p className="font-semibold text-primary text-sm mb-2">Algemene tips</p>
          <ul className="space-y-1">
            {veld.algemeneTips.map((tip, i) => (
              <li key={i} className="text-sm text-text-secondary flex gap-2">
                <span>💡</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function RapportPagina() {
  const params = useParams();
  const sessieId = params["sessie-id"] as string;

  const [rapport, setRapport] = useState<BoniRapport | null>(null);
  const [hostNaam, setHostNaam] = useState<string | null>(null);
  const [datum, setDatum] = useState<string | null>(null);
  const [laden, setLaden] = useState(true);
  const [fout, setFout] = useState<string | null>(null);
  const [emailVersturen, setEmailVersturen] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "verstuurd" | "fout">("idle");
  const [emailInvoer, setEmailInvoer] = useState("");
  const [toonEmailInvoer, setToonEmailInvoer] = useState(false);
  const [deelOpen, setDeelOpen] = useState(false);
  const rapportUrl = typeof window !== "undefined" ? window.location.href : "";
  const [dashboardOpgeslagen, setDashboardOpgeslagen] = useState(false);

  useEffect(() => {
    if (!sessieId) return;

    fetch(`/api/rapport/${sessieId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Rapport niet gevonden");
        return res.json();
      })
      .then((data) => {
        setRapport(data.rapport);
        setHostNaam(data.hostNaam ?? null);
        setDatum(data.datum ?? null);
        setLaden(false);

        // Automatisch opslaan in dashboard als gebruiker ingelogd is met hetzelfde email
        fetch("/api/listing-rapport-opslaan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessieId }),
        }).then((r) => r.json()).then((d) => {
          if (d.opgeslagen && !d.bestaand) setDashboardOpgeslagen(true);
        }).catch(() => {});
      })
      .catch((err) => {
        setFout(err.message ?? "Er ging iets mis bij het laden van het rapport.");
        setLaden(false);
      });
  }, [sessieId]);

  const handleEmailVersturen = async () => {
    setEmailVersturen(true);
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessieId, emailOverride: emailInvoer || undefined }),
      });

      if (res.status === 400 && !toonEmailInvoer) {
        // Email niet gevonden — vraag het op
        setToonEmailInvoer(true);
        setEmailVersturen(false);
        return;
      }

      setEmailStatus(res.ok ? "verstuurd" : "fout");
      setToonEmailInvoer(false);
    } catch {
      setEmailStatus("fout");
    } finally {
      setEmailVersturen(false);
    }
  };

  if (laden) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-text-secondary">Rapport wordt geladen...</p>
        </div>
      </div>
    );
  }

  if (fout || !rapport) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center space-y-6">
          <BoniAvatar size={100} className="mx-auto" />
          <h2 className="font-display text-2xl text-primary">Rapport niet gevonden</h2>
          <p className="text-text-secondary">{fout ?? "Het rapport kon niet worden geladen."}</p>
          <a href="/starten" className="btn-primary inline-block">
            Nieuwe analyse starten
          </a>
        </div>
      </div>
    );
  }

  const velden = rapport.velden;


  const rapportPubliekUrl = `${typeof window !== "undefined" ? window.location.origin : "https://verhuurai.nl"}/dashboard/listing-rapporten/${sessieId}`;

  return (
    <div className="min-h-screen bg-background">
      {deelOpen && <DeelModal onSluit={() => setDeelOpen(false)} overrideUrl={rapportPubliekUrl} titel="Listing Optimizer Rapport" />}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Navigatie */}
        <div className="flex items-center justify-between gap-3 flex-wrap print:hidden">
          <a href="/dashboard" className="btn-secondary text-sm">← Dashboard</a>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="btn-secondary text-sm flex items-center gap-2">
              ⬇️ Download PDF
            </button>
            <button onClick={() => setDeelOpen(true)} className="btn-secondary text-sm flex items-center gap-2">
              <span>↗</span> Delen
            </button>
          </div>
        </div>

        {dashboardOpgeslagen && (
          <div className="card p-4 bg-success/10 border-success/30 flex items-center gap-3">
            <span className="text-success text-xl">✅</span>
            <div>
              <p className="font-semibold text-success text-sm">Rapport opgeslagen in je dashboard</p>
              <p className="text-xs text-text-secondary">
                Je vindt dit rapport terug in je{" "}
                <a href="/dashboard" className="text-accent underline">dashboard</a>.
              </p>
            </div>
          </div>
        )}

        <div className="card p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BoniAvatar size={60} />
              <span className="font-display text-xl text-primary">Host Boni Rapport</span>
            </div>
            <div className="text-right text-sm text-text-secondary">
              {hostNaam && <p className="font-semibold text-primary">{hostNaam}</p>}
              {datum && <p>{new Date(datum).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</p>}
            </div>
          </div>
          {toonEmailInvoer && emailStatus !== "verstuurd" ? (
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                value={emailInvoer}
                onChange={(e) => setEmailInvoer(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEmailVersturen()}
                placeholder="jij@voorbeeld.nl"
                className="input text-sm flex-1 min-w-0"
                autoFocus
              />
              <button
                onClick={handleEmailVersturen}
                disabled={!emailInvoer.includes("@") || emailVersturen}
                className={`btn-primary text-sm flex-shrink-0 ${!emailInvoer.includes("@") ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                {emailVersturen ? "Versturen..." : "Verstuur →"}
              </button>
            </div>
          ) : (
            <button
              onClick={handleEmailVersturen}
              disabled={emailVersturen || emailStatus === "verstuurd"}
              className="btn-secondary text-sm w-full sm:w-auto"
            >
              {emailVersturen
                ? "Versturen..."
                : emailStatus === "verstuurd"
                ? "✅ Verstuurd!"
                : emailStatus === "fout"
                ? "❌ Probeer opnieuw"
                : "📧 Rapport per email ontvangen"}
            </button>
          )}
        </div>

        {rapport.openingszin && (
          <div className="card p-6 flex gap-4 items-start">
            <BoniAvatar size={60} className="shrink-0" />
            <p className="italic text-primary leading-relaxed text-lg">
              "{rapport.openingszin}"
            </p>
          </div>
        )}

        <div className="card p-6 space-y-6">
          <h2 className="font-display text-2xl text-primary">Totaalscore</h2>
          <div className="flex flex-col items-center gap-4">
            <ScoreCircle score={rapport.totaalscore} size={160} />
            {rapport.totaalSamenvatting && (
              <p className="text-text-secondary text-center max-w-md leading-relaxed">
                {rapport.totaalSamenvatting}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {rapport.top3SterkstePunten?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-display text-lg text-success">Sterkste punten</h3>
                <div className="space-y-2">
                  {rapport.top3SterkstePunten.map((punt, i) => (
                    <div
                      key={i}
                      className="flex gap-3 items-start bg-success/10 border border-success/20 rounded-xl p-3"
                    >
                      <span>✅</span>
                      <p className="text-sm text-primary">{punt}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {rapport.top3Prioriteiten?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-display text-lg text-warning">Prioriteiten</h3>
                <div className="space-y-2">
                  {rapport.top3Prioriteiten.map((prioriteit, i) => (
                    <div
                      key={i}
                      className="flex gap-3 items-start bg-warning/10 border border-warning/20 rounded-xl p-3"
                    >
                      <span>🔧</span>
                      <p className="text-sm text-primary">{prioriteit}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-2xl text-primary">Analyse per onderdeel</h2>

          {GESCOORDE_VELDEN.map((key) => {
            const veld = velden[key as keyof typeof velden];
            if (!veld) return null;
            return <VeldSectie key={key} veldKey={key} veld={veld as VeldRapport} />;
          })}

          {velden.directBoeken && (
            <div className="card p-5 sm:p-6 border border-border space-y-3">
              <h3 className="font-display text-xl text-primary flex items-center gap-2">
                <span>⚡</span>
                <span>Direct boeken</span>
              </h3>
              {velden.directBoeken.huidigeInstelling && (
                <p className="text-sm text-text-secondary">
                  Huidige instelling: <span className="font-semibold text-primary">{velden.directBoeken.huidigeInstelling}</span>
                </p>
              )}
              {velden.directBoeken.aanbeveling && (
                <p className="text-sm text-primary">{velden.directBoeken.aanbeveling}</p>
              )}
              {velden.directBoeken.uitleg && (
                <p className="text-sm text-text-secondary italic">{velden.directBoeken.uitleg}</p>
              )}
            </div>
          )}

          {velden.annuleringsbeleid && (
            <div className="card p-5 sm:p-6 border border-border space-y-3">
              <h3 className="font-display text-xl text-primary flex items-center gap-2">
                <span>📅</span>
                <span>Annuleringsbeleid</span>
              </h3>
              {velden.annuleringsbeleid.huidigeInstelling && (
                <p className="text-sm text-text-secondary">
                  Huidige instelling: <span className="font-semibold text-primary">{velden.annuleringsbeleid.huidigeInstelling}</span>
                </p>
              )}
              {velden.annuleringsbeleid.aanbeveling && (
                <p className="text-sm text-primary">{velden.annuleringsbeleid.aanbeveling}</p>
              )}
              {velden.annuleringsbeleid.uitleg && (
                <p className="text-sm text-text-secondary italic">{velden.annuleringsbeleid.uitleg}</p>
              )}
            </div>
          )}
        </div>

        {rapport.actieplan && (
          <div className="space-y-4">
            <h2 className="font-display text-2xl text-primary">Jouw actieplan</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {rapport.actieplan.vandaag?.length > 0 && (
                <div className="card p-5 border-l-4 border-danger space-y-3">
                  <h3 className="font-display text-lg text-danger">Vandaag</h3>
                  <ul className="space-y-2">
                    {rapport.actieplan.vandaag.map((item, i) => (
                      <li key={i} className="text-sm text-primary flex gap-2">
                        <span className="text-danger shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rapport.actieplan.dezeWeek?.length > 0 && (
                <div className="card p-5 border-l-4 border-warning space-y-3">
                  <h3 className="font-display text-lg text-warning">Deze week</h3>
                  <ul className="space-y-2">
                    {rapport.actieplan.dezeWeek.map((item, i) => (
                      <li key={i} className="text-sm text-primary flex gap-2">
                        <span className="text-warning shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {rapport.actieplan.dezeMaand?.length > 0 && (
                <div className="card p-5 border-l-4 border-success space-y-3">
                  <h3 className="font-display text-lg text-success">Deze maand</h3>
                  <ul className="space-y-2">
                    {rapport.actieplan.dezeMaand.map((item, i) => (
                      <li key={i} className="text-sm text-primary flex gap-2">
                        <span className="text-success shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {rapport.bonusTips?.length > 0 && (
          <div className="card p-6 border border-accent/20 space-y-3">
            <h2 className="font-display text-2xl text-primary flex items-center gap-2">
              <span>🎁</span>
              <span>Bonustips van Boni</span>
            </h2>
            <ul className="space-y-2">
              {rapport.bonusTips.map((tip, i) => (
                <li key={i} className="text-sm text-primary flex gap-2">
                  <span className="shrink-0">✨</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {rapport.afsluiting && (
          <div className="card p-6 flex gap-4 items-start">
            <BoniAvatar size={60} className="shrink-0" />
            <div className="space-y-2">
              <h3 className="font-display text-lg text-primary">Boni's afsluiting</h3>
              <p className="text-text-secondary leading-relaxed">{rapport.afsluiting}</p>
            </div>
          </div>
        )}

        <div className="card p-8 text-center space-y-4 bg-primary text-white border-0">
          <h2 className="font-display text-2xl">
            Wil je nog een advertentie laten analyseren?
          </h2>
          <p className="text-white/70 text-sm">
            Boni staat klaar om je volgende listing onder de loep te nemen.
          </p>
          <a href="/starten" className="btn-primary inline-block w-full sm:w-auto text-center">
            Nieuwe analyse starten →
          </a>
        </div>
      </div>
    </div>
  );
}
