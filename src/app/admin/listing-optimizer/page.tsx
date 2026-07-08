import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "info@bnbassistant.com";

const VELD_NAMEN: Record<string, string> = {
  titel: "Titel",
  beschrijving: "Beschrijving",
  accommodatie: "Accommodatie",
  toegang: "Toegang voor gasten",
  interactie: "Interactie met gasten",
  andereInfo: "Andere informatie",
  voorzieningen: "Voorzieningen",
  buurt: "Buurt",
  vervoer: "Vervoer",
  recensies: "Recensies",
  hostProfiel: "Host profiel",
  huisregels: "Huisregels",
};

const VELD_ICONEN: Record<string, string> = {
  titel: "📌", beschrijving: "📝", accommodatie: "🏠", toegang: "🔑",
  interactie: "💬", andereInfo: "ℹ️", voorzieningen: "⚡", buurt: "📍",
  vervoer: "🚌", recensies: "⭐", hostProfiel: "👤", huisregels: "📋",
};

const GESCOORDE_VELDEN = [
  "titel", "beschrijving", "accommodatie", "toegang", "interactie",
  "andereInfo", "voorzieningen", "buurt", "vervoer", "recensies",
  "hostProfiel", "huisregels",
] as const;

// Terugkerende thema's — keyword-matching op verbeterpunten (NL)
const THEMAS = [
  {
    naam: "Accommodatietype in de titel",
    beschrijving: "Host vermeldt 'villa', 'appartement', 'huis' etc. in de titel",
    keywords: ["accommodatietype", "appartement", "villa", "woning", "studio", "kamer", "huis"],
    veld: "titel",
  },
  {
    naam: "Bijvoeglijke naamwoorden in titel",
    beschrijving: "Gebruik van vage adjectieven zoals 'mooi', 'gezellig', 'luxe'",
    keywords: ["bijvoeglijk", "gezellig", "mooi", "prachtig", "knus", "modern", "luxe", "geweldig", "sfeervol"],
    veld: "titel",
  },
  {
    naam: "Titel te lang of te kort",
    beschrijving: "Titellengte zit niet in het optimale bereik van 40-50 tekens",
    keywords: ["tekens", "te lang", "te kort", "50 tekens", "lengte", "40"],
    veld: "titel",
  },
  {
    naam: "Beschrijving mist sfeer en beleving",
    beschrijving: "Beschrijving is te feitelijk zonder gevoel of ervaring over te brengen",
    keywords: ["sfeer", "beleving", "ervaring", "gevoel", "feitelijk", "haak", "eerste zin"],
    veld: "beschrijving",
  },
  {
    naam: "Geen concrete afstanden in buurtbeschrijving",
    beschrijving: "Gebruik van vage termen als 'vlakbij' zonder concrete afstanden",
    keywords: ["afstand", "vlakbij", "concrete", "kilometer", "minuten", "meter"],
    veld: "buurt",
  },
  {
    naam: "Vervoersinformatie ontbreekt of onvolledig",
    beschrijving: "Openbaar vervoer, station of loopafstand niet beschreven",
    keywords: ["vervoer", "openbaar", "station", "bus", "tram", "ov", "metro", "trein"],
    veld: "vervoer",
  },
  {
    naam: "Ontbrekende of onvoldoende voorzieningen",
    beschrijving: "Relevante voorzieningen niet aanwezig of niet vermeld",
    keywords: ["ontbreekt", "voeg toe", "aanbevolen", "werkplek", "wifi", "parkeer", "kinderstoel"],
    veld: "voorzieningen",
  },
  {
    naam: "Host profiel te onpersoonlijk of leeg",
    beschrijving: "Weinig persoonlijk verhaal, hobby's of menselijk karakter",
    keywords: ["persoonlijk", "verhaal", "hobby", "leeg", "onpersoonlijk", "menselijk", "warm"],
    veld: "hostProfiel",
  },
  {
    naam: "Huisregels: verkeerde toon of HOOFDLETTERS",
    beschrijving: "Dreigend taalgebruik of gebruik van hoofdletters in huisregels",
    keywords: ["hoofdletter", "dreig", "toon", "streng", "verboden", "boete"],
    veld: "huisregels",
  },
  {
    naam: "Accommodatiebeschrijving onvolledig",
    beschrijving: "Ruimtes niet allemaal beschreven of te weinig detail",
    keywords: ["ruimte", "slaapkamer", "badkamer", "keuken", "woonkamer", "buitenruimte", "onvolledig"],
    veld: "accommodatie",
  },
];

function scoreKleur(score: number): string {
  if (score >= 7) return "text-success";
  if (score >= 5) return "text-warning";
  return "text-danger";
}

function scoreBalk(score: number): string {
  if (score >= 7) return "bg-success";
  if (score >= 5) return "bg-warning";
  return "bg-danger";
}

function rond(n: number, decimalen = 1): number {
  return Math.round(n * Math.pow(10, decimalen)) / Math.pow(10, decimalen);
}

export default async function ListingOptimizerStatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  // Haal alle niet-gearchiveerde rapporten op met rapport_json
  const { data: rapporten } = await admin
    .from("listing_rapporten")
    .select("id, aangemaakt_op, rapport_json")
    .or("gearchiveerd.eq.false,gearchiveerd.is.null")
    .order("aangemaakt_op", { ascending: false });

  const geldig = (rapporten ?? []).filter((r: any) => {
    const json = r.rapport_json;
    return json && typeof json.totaalscore === "number" && json.velden;
  });

  const aantalRapporten = geldig.length;

  // ── Scores berekenen ──────────────────────────────────────────────────────

  const totalScores: number[] = [];
  const veldScores: Record<string, number[]> = Object.fromEntries(
    GESCOORDE_VELDEN.map(v => [v, []])
  );

  for (const r of geldig) {
    const json = r.rapport_json as any;
    totalScores.push(json.totaalscore);

    for (const veld of GESCOORDE_VELDEN) {
      const score = json.velden?.[veld]?.score;
      if (typeof score === "number") {
        veldScores[veld].push(score);
      }
    }
  }

  const gemiddeldTotaal = totalScores.length > 0
    ? rond(totalScores.reduce((a, b) => a + b, 0) / totalScores.length, 0)
    : 0;

  const gemiddeldPerVeld = Object.fromEntries(
    GESCOORDE_VELDEN.map(v => {
      const scores = veldScores[v];
      if (scores.length === 0) return [v, null];
      return [v, rond(scores.reduce((a, b) => a + b, 0) / scores.length)];
    })
  ) as Record<string, number | null>;

  // Top 3 beste en slechtste velden
  const gesorteerd = GESCOORDE_VELDEN
    .filter(v => gemiddeldPerVeld[v] !== null)
    .sort((a, b) => (gemiddeldPerVeld[b] ?? 0) - (gemiddeldPerVeld[a] ?? 0));

  const top3Beste = gesorteerd.slice(0, 3);
  const top3Slechtste = [...gesorteerd].reverse().slice(0, 3);

  // Scoreverdeling totaalscore
  const verdelingBuckets = [
    { label: "90-100", min: 90, max: 100 },
    { label: "80-89", min: 80, max: 89 },
    { label: "70-79", min: 70, max: 79 },
    { label: "60-69", min: 60, max: 69 },
    { label: "<60", min: 0, max: 59 },
  ];
  const scoreverdeling = verdelingBuckets.map(b => ({
    ...b,
    aantal: totalScores.filter(s => s >= b.min && s <= b.max).length,
  }));

  // ── Thema-analyse ─────────────────────────────────────────────────────────

  const themaResultaten = THEMAS.map(thema => {
    let treffers = 0;
    for (const r of geldig) {
      const json = r.rapport_json as any;
      const veldenTeDoorzoeken = thema.veld
        ? [thema.veld]
        : GESCOORDE_VELDEN;

      let gevonden = false;
      for (const veld of veldenTeDoorzoeken) {
        const verbeterpunten: string[] = json.velden?.[veld]?.verbeterpunten ?? [];
        const analyse: string = json.velden?.[veld]?.analyse ?? "";
        const tekst = [...verbeterpunten, analyse].join(" ").toLowerCase();
        if (thema.keywords.some(k => tekst.includes(k.toLowerCase()))) {
          gevonden = true;
          break;
        }
      }
      if (gevonden) treffers++;
    }
    return { ...thema, treffers, percentage: aantalRapporten > 0 ? Math.round((treffers / aantalRapporten) * 100) : 0 };
  }).sort((a, b) => b.treffers - a.treffers);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-primary">Listing Optimizer — Statistieken</h1>
            <p className="text-text-secondary text-sm mt-1">Op basis van {aantalRapporten} actieve rapporten</p>
          </div>
          <a href="/cockpit/hostboni-admin" className="btn-secondary text-sm">← Terug naar cockpit</a>
        </div>

        {/* KPI-kaarten */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card p-5 text-center">
            <p className="text-4xl font-bold text-primary">{aantalRapporten}</p>
            <p className="text-xs text-text-secondary mt-1">Totaal rapporten</p>
          </div>
          <div className="card p-5 text-center">
            <p className={`text-4xl font-bold ${scoreKleur(gemiddeldTotaal / 10)}`}>{gemiddeldTotaal}</p>
            <p className="text-xs text-text-secondary mt-1">Gem. totaalscore /100</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-xl font-bold text-success">{VELD_NAMEN[top3Beste[0]] ?? "—"}</p>
            <p className="text-2xl font-bold text-success mt-0.5">{gemiddeldPerVeld[top3Beste[0]] ?? "—"}</p>
            <p className="text-xs text-text-secondary mt-1">Beste veld /10</p>
          </div>
          <div className="card p-5 text-center">
            <p className="text-xl font-bold text-danger">{VELD_NAMEN[top3Slechtste[0]] ?? "—"}</p>
            <p className="text-2xl font-bold text-danger mt-0.5">{gemiddeldPerVeld[top3Slechtste[0]] ?? "—"}</p>
            <p className="text-xs text-text-secondary mt-1">Slechtste veld /10</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {/* Top 3 beste velden */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary flex items-center gap-2">
              <span>🏆</span> Top 3 beste velden
            </h2>
            {top3Beste.map((veld, i) => (
              <div key={veld} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-lg flex-shrink-0">{VELD_ICONEN[veld]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{VELD_NAMEN[veld]}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${scoreBalk(gemiddeldPerVeld[veld] ?? 0)}`}
                        style={{ width: `${((gemiddeldPerVeld[veld] ?? 0) / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-success font-bold flex-shrink-0">
                      {gemiddeldPerVeld[veld]}/10
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Top 3 slechtste velden */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary flex items-center gap-2">
              <span>⚠️</span> Top 3 verbeterpunten
            </h2>
            {top3Slechtste.map((veld, i) => (
              <div key={veld} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-danger/20 text-danger text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-lg flex-shrink-0">{VELD_ICONEN[veld]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{VELD_NAMEN[veld]}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${scoreBalk(gemiddeldPerVeld[veld] ?? 0)}`}
                        style={{ width: `${((gemiddeldPerVeld[veld] ?? 0) / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-danger font-bold flex-shrink-0">
                      {gemiddeldPerVeld[veld]}/10
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scores per veld — volledig overzicht */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">Gemiddelde score per veld</h2>
          <div className="space-y-3">
            {GESCOORDE_VELDEN
              .filter(v => gemiddeldPerVeld[v] !== null)
              .sort((a, b) => (gemiddeldPerVeld[b] ?? 0) - (gemiddeldPerVeld[a] ?? 0))
              .map(veld => {
                const score = gemiddeldPerVeld[veld] ?? 0;
                const aantalMetScore = veldScores[veld].length;
                return (
                  <div key={veld} className="flex items-center gap-3">
                    <span className="text-base w-6 flex-shrink-0 text-center">{VELD_ICONEN[veld]}</span>
                    <p className="text-sm text-primary w-40 flex-shrink-0">{VELD_NAMEN[veld]}</p>
                    <div className="flex-1 bg-border rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${scoreBalk(score)}`}
                        style={{ width: `${(score / 10) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-bold font-mono w-12 text-right flex-shrink-0 ${scoreKleur(score)}`}>
                      {score}/10
                    </span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Scoreverdeling totaalscore */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">Verdeling totaalscores</h2>
          <div className="space-y-2">
            {scoreverdeling.map(b => (
              <div key={b.label} className="flex items-center gap-3">
                <p className="text-sm text-primary w-14 flex-shrink-0 font-mono">{b.label}</p>
                <div className="flex-1 bg-border rounded-full h-5 relative overflow-hidden">
                  <div
                    className={`h-5 rounded-full transition-all ${
                      b.min >= 80 ? "bg-success" : b.min >= 60 ? "bg-warning" : "bg-danger"
                    }`}
                    style={{ width: aantalRapporten > 0 ? `${(b.aantal / aantalRapporten) * 100}%` : "0%" }}
                  />
                </div>
                <span className="text-sm font-semibold text-primary w-8 text-right flex-shrink-0">
                  {b.aantal}
                </span>
                <span className="text-xs text-text-secondary w-10 text-right flex-shrink-0">
                  {aantalRapporten > 0 ? Math.round((b.aantal / aantalRapporten) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Terugkerende thema's */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-display text-xl text-primary">Terugkerende verbeterthema&apos;s</h2>
            <p className="text-sm text-text-secondary mt-1">
              Gedetecteerd via keyword-matching in verbeterpunten en analyses
            </p>
          </div>
          <div className="space-y-3">
            {themaResultaten.map((thema, i) => (
              <div key={thema.naam} className="border border-border rounded-xl p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-primary">{thema.naam}</p>
                      <p className="text-xs text-text-secondary">{thema.beschrijving}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-primary">{thema.treffers}×</p>
                    <p className="text-xs text-text-secondary">{thema.percentage}%</p>
                  </div>
                </div>
                <div className="bg-border rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-accent"
                    style={{ width: `${thema.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary">
            Percentage = aandeel van {aantalRapporten} rapporten waarbij dit thema terugkwam in verbeterpunten of analyse.
          </p>
        </div>

      </div>
    </div>
  );
}
