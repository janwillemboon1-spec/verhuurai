import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const ADMIN_EMAIL = "info@bnbassistant.com";

// ── Compliment-categorieën ────────────────────────────────────────────────────

const COMPLIMENT_CATEGORIEEN = [
  {
    naam: "Prachtige locatie",
    icoon: "📍",
    keywords: ["locatie", "strand", "centraal", "uitzicht", "loopafstand", "dichtbij", "omgeving", "ligging", "bereikbaar"],
  },
  {
    naam: "Behulpzame & vriendelijke host",
    icoon: "🤝",
    keywords: ["host", "behulpzaam", "vriendelijk", "communicatie", "snel", "responsief", "behulpzame", "bereikbaar", "persoonlijk"],
  },
  {
    naam: "Schoon & verzorgd",
    icoon: "✨",
    keywords: ["schoon", "verzorgd", "netjes", "hygiëne", "hygiënisch", "proper", "netheid"],
  },
  {
    naam: "Goede faciliteiten",
    icoon: "🏊",
    keywords: ["zwembad", "jacuzzi", "wifi", "parking", "parkeer", "keuken", "bbq", "voorzieningen", "faciliteiten", "tuin", "terras"],
  },
  {
    naam: "Ruim & comfortabel",
    icoon: "🛋️",
    keywords: ["ruim", "comfortabel", "ingericht", "mooi", "gezellig", "sfeer", "stijlvol", "ruimte"],
  },
  {
    naam: "Rust & privacy",
    icoon: "🌿",
    keywords: ["rustig", "privé", "stil", "privacy", "afgelegen", "vredig", "kalm"],
  },
  {
    naam: "Goede prijs-kwaliteit",
    icoon: "💰",
    keywords: ["prijs", "waarde", "kwaliteit", "aanrader", "aanbevelen", "zeker terug"],
  },
];

// ── Klacht-categorieën ────────────────────────────────────────────────────────

const KLACHT_CATEGORIEEN = [
  {
    naam: "Schoonmaak",
    icoon: "🧹",
    keywords: ["schoon", "vuil", "vies", "onhygiënisch", "schoonmaak", "smerig", "stof"],
  },
  {
    naam: "Communicatie",
    icoon: "💬",
    keywords: ["communicatie", "bereikbaar", "reactie", "antwoord", "contact", "reageert", "langzaam"],
  },
  {
    naam: "Wifi & internet",
    icoon: "📶",
    keywords: ["wifi", "internet", "verbinding", "traag", "snelheid", "netwerk", "signaal"],
  },
  {
    naam: "Klimaatregeling",
    icoon: "🌡️",
    keywords: ["airco", "airconditioner", "verwarming", "warm", "koud", "temperatuur", "lawaai airco"],
  },
  {
    naam: "Lawaai & overlast",
    icoon: "🔊",
    keywords: ["lawaai", "lawaaierig", "luid", "geluid", "buren", "herrie", "rumoerig", "verkeer"],
  },
  {
    naam: "Keuken & voorzieningen",
    icoon: "🍳",
    keywords: ["keuken", "apparatuur", "messen", "koffie", "magnetron", "kookgerei", "voorzieningen mist"],
  },
  {
    naam: "Foto's kloppen niet",
    icoon: "📸",
    keywords: ["foto", "misleidend", "anders dan", "verwachting", "afwijkt", "kleiner", "beschrijving"],
  },
  {
    naam: "Prijs-kwaliteit",
    icoon: "💸",
    keywords: ["te duur", "prijs", "overpriced", "verwachting", "niet waard"],
  },
];

function rond(n: number, decimalen = 1): number {
  return Math.round(n * Math.pow(10, decimalen)) / Math.pow(10, decimalen);
}

function sentimentKleur(type: "positief" | "neutraal" | "negatief"): string {
  if (type === "positief") return "text-success";
  if (type === "neutraal") return "text-warning";
  return "text-danger";
}

function sentimentBg(type: "positief" | "neutraal" | "negatief"): string {
  if (type === "positief") return "bg-success";
  if (type === "neutraal") return "bg-warning";
  return "bg-danger";
}

export default async function HostPerformanceStatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  // Haal alle niet-gearchiveerde Host Performance rapporten op
  const { data: rapporten } = await admin
    .from("rapporten")
    .select("id, rapport_json, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false });

  const geldig = (rapporten ?? []).filter((r: any) => {
    const json = r.rapport_json;
    return json && json.sentiment && typeof json.sentiment.positief === "number";
  });

  const aantalRapporten = geldig.length;

  // ── Sentiment berekenen ───────────────────────────────────────────────────

  let totaalPositief = 0;
  let totaalNeutraal = 0;
  let totaalNegatief = 0;
  const alleComplimenten: string[] = [];
  const alleKlachten: string[] = [];

  for (const r of geldig) {
    const json = r.rapport_json as any;
    totaalPositief += json.sentiment.positief ?? 0;
    totaalNeutraal += json.sentiment.neutraal ?? 0;
    totaalNegatief += json.sentiment.negatief ?? 0;

    if (Array.isArray(json.terugkerendeComplimenten)) {
      alleComplimenten.push(...json.terugkerendeComplimenten.map((c: string) => c.toLowerCase()));
    }
    if (Array.isArray(json.terugkerendeKlachten)) {
      alleKlachten.push(...json.terugkerendeKlachten.map((k: string) => k.toLowerCase()));
    }
  }

  const gemPositief = aantalRapporten > 0 ? rond(totaalPositief / aantalRapporten, 0) : 0;
  const gemNeutraal = aantalRapporten > 0 ? rond(totaalNeutraal / aantalRapporten, 0) : 0;
  const gemNegatief = aantalRapporten > 0 ? rond(totaalNegatief / aantalRapporten, 0) : 0;

  // ── Categoriseren complimenten ────────────────────────────────────────────

  // Tel per rapport (max 1 treffer per rapport per categorie)
  const complimentScores = COMPLIMENT_CATEGORIEEN.map(cat => {
    const treffers = geldig.filter((r: any) => {
      const punten: string[] = (r.rapport_json?.terugkerendeComplimenten ?? []).map((c: string) => c.toLowerCase());
      return punten.some(c => cat.keywords.some(k => c.includes(k.toLowerCase())));
    }).length;
    return { ...cat, treffers, percentage: aantalRapporten > 0 ? Math.round((treffers / aantalRapporten) * 100) : 0 };
  }).sort((a, b) => b.treffers - a.treffers);

  const top3Complimenten = complimentScores.slice(0, 3);

  // ── Categoriseren klachten ────────────────────────────────────────────────

  const klachtScores = KLACHT_CATEGORIEEN.map(cat => {
    const treffers = geldig.filter((r: any) => {
      const punten: string[] = (r.rapport_json?.terugkerendeKlachten ?? []).map((k: string) => k.toLowerCase());
      return punten.some(k => cat.keywords.some(kw => k.includes(kw.toLowerCase())));
    }).length;
    return { ...cat, treffers, percentage: aantalRapporten > 0 ? Math.round((treffers / aantalRapporten) * 100) : 0 };
  }).sort((a, b) => b.treffers - a.treffers);

  const top3Klachten = klachtScores.filter(k => k.treffers > 0).slice(0, 3);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-3xl text-primary">Host Performance — Statistieken</h1>
            <p className="text-text-secondary text-sm mt-1">Op basis van {aantalRapporten} rapporten</p>
          </div>
          <a href="/cockpit/hostboni-admin" className="btn-secondary text-sm">← Terug naar cockpit</a>
        </div>

        {/* Sentiment KPI's */}
        <div className="card p-6 space-y-5">
          <h2 className="font-display text-xl text-primary">Gemiddelde sentimentverdeling</h2>
          <div className="grid grid-cols-3 gap-4">
            {(["positief", "neutraal", "negatief"] as const).map(type => {
              const waarde = type === "positief" ? gemPositief : type === "neutraal" ? gemNeutraal : gemNegatief;
              const label = type === "positief" ? "Positief" : type === "neutraal" ? "Neutraal" : "Negatief";
              const emoji = type === "positief" ? "😊" : type === "neutraal" ? "😐" : "😞";
              return (
                <div key={type} className="text-center space-y-2">
                  <p className="text-3xl">{emoji}</p>
                  <p className={`text-4xl font-bold ${sentimentKleur(type)}`}>{waarde}%</p>
                  <p className="text-sm text-text-secondary font-semibold">{label}</p>
                  <div className="bg-border rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${sentimentBg(type)}`}
                      style={{ width: `${waarde}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">

          {/* Top 3 complimenten */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary flex items-center gap-2">
              <span>⭐</span> Wat gasten het meest waarderen
            </h2>
            {top3Complimenten.length === 0 && (
              <p className="text-sm text-text-secondary">Nog niet genoeg data.</p>
            )}
            {top3Complimenten.map((cat, i) => (
              <div key={cat.naam} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-success/20 text-success text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xl flex-shrink-0">{cat.icoon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{cat.naam}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-success"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-success font-bold flex-shrink-0">
                      {cat.treffers}×
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Top 3 klachten */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary flex items-center gap-2">
              <span>⚠️</span> Terugkerende klachten
            </h2>
            {top3Klachten.length === 0 && (
              <p className="text-sm text-text-secondary">Nog niet genoeg data.</p>
            )}
            {top3Klachten.map((cat, i) => (
              <div key={cat.naam} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-danger/20 text-danger text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xl flex-shrink-0">{cat.icoon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary">{cat.naam}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-danger"
                        style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-danger font-bold flex-shrink-0">
                      {cat.treffers}×
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Alle compliment-categorieën */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">Alle compliment-categorieën</h2>
          <div className="space-y-3">
            {complimentScores.map(cat => (
              <div key={cat.naam} className="flex items-center gap-3">
                <span className="text-base w-6 flex-shrink-0 text-center">{cat.icoon}</span>
                <p className="text-sm text-primary w-52 flex-shrink-0">{cat.naam}</p>
                <div className="flex-1 bg-border rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-success transition-all"
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold font-mono text-success w-8 text-right flex-shrink-0">
                  {cat.treffers}×
                </span>
                <span className="text-xs text-text-secondary w-10 flex-shrink-0 text-right">
                  {cat.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alle klacht-categorieën */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">Alle klacht-categorieën</h2>
          <div className="space-y-3">
            {klachtScores.map(cat => (
              <div key={cat.naam} className="flex items-center gap-3">
                <span className="text-base w-6 flex-shrink-0 text-center">{cat.icoon}</span>
                <p className="text-sm text-primary w-52 flex-shrink-0">{cat.naam}</p>
                <div className="flex-1 bg-border rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full bg-danger transition-all"
                    style={{ width: `${Math.min(cat.percentage, 100)}%` }}
                  />
                </div>
                <span className="text-sm font-bold font-mono text-danger w-8 text-right flex-shrink-0">
                  {cat.treffers}×
                </span>
                <span className="text-xs text-text-secondary w-10 flex-shrink-0 text-right">
                  {cat.percentage}%
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary">
            Percentage = aandeel van {aantalRapporten} rapporten waarbij deze klacht terugkwam.
          </p>
        </div>

      </div>
    </div>
  );
}
