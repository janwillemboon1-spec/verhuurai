import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import { CopyButton } from "@/components/CopyButton";
import { ScoreCircle, VeldScore } from "@/components/ScoreCircle";
import { scoreKleur, scoreBgKleur, BoniRapport, VeldRapport } from "@/types/rapport";
import RapportActions from "../../rapporten/[id]/RapportActions";

export default async function ListingRapportPagina({ params }: { params: { id: string } }) {
  const supabase = createAdminClient();

  const { data: opgeslagenRapport } = await supabase
    .from("listing_rapporten")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!opgeslagenRapport) notFound();

  const rapport = opgeslagenRapport.rapport_json as BoniRapport & { hostNaam?: string; datum?: string };
  const velden = rapport.velden;

  const VELD_ICONEN: Record<string, string> = {
    titel: "📌", beschrijving: "📝", accommodatie: "🏠", toegang: "🔑",
    interactie: "💬", andereInfo: "ℹ️", voorzieningen: "⚡", buurt: "📍",
    vervoer: "🚌", recensies: "⭐", hostProfiel: "👤", huisregels: "📋",
  };

  const isEn = (rapport as any).rapportTaal === "en";
  const VELD_NAMEN = isEn ? {
    titel: "Title", beschrijving: "Description", accommodatie: "Accommodation",
    toegang: "Guest access", interactie: "Guest interaction", andereInfo: "Other important info",
    voorzieningen: "Amenities", buurt: "Neighbourhood highlights", vervoer: "Getting around",
    recensies: "Reviews", hostProfiel: "Host profile", huisregels: "House rules",
  } : {
    titel: "Titel", beschrijving: "Beschrijving", accommodatie: "Accommodatie",
    toegang: "Toegang", interactie: "Interactie met gasten", andereInfo: "Andere informatie",
    voorzieningen: "Voorzieningen", buurt: "Buurt", vervoer: "Vervoer",
    recensies: "Recensies", hostProfiel: "Hostprofiel", huisregels: "Huisregels",
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        <RapportActions titel={rapport.totaalSamenvatting ? "Listing Rapport" : undefined} />

        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-3">
            <BoniAvatar size={60} />
            <div>
              <h1 className="font-display text-2xl text-primary">Listing Optimizer Rapport</h1>
              <p className="text-sm text-text-secondary">
                {rapport.hostNaam || opgeslagenRapport.host_naam} ·{" "}
                {new Date(opgeslagenRapport.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
          </div>
        </div>

        {rapport.openingszin && (
          <div className="card p-6 flex gap-4 items-start">
            <BoniAvatar size={50} className="shrink-0" />
            <p className="italic text-primary leading-relaxed">"{rapport.openingszin}"</p>
          </div>
        )}

        <div className="card p-6 space-y-6">
          <h2 className="font-display text-2xl text-primary">{isEn ? "Total score" : "Totaalscore"}</h2>
          <div className="flex flex-col items-center gap-4">
            <ScoreCircle score={rapport.totaalscore} size={160} />
            {rapport.totaalSamenvatting && (
              <p className="text-text-secondary text-center max-w-md leading-relaxed">{rapport.totaalSamenvatting}</p>
            )}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {rapport.top3SterkstePunten?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-display text-lg text-success">{isEn ? "Strongest points" : "Sterkste punten"}</h3>
                {rapport.top3SterkstePunten.map((punt: string, i: number) => (
                  <div key={i} className="flex gap-3 items-start bg-success/10 border border-success/20 rounded-xl p-3">
                    <span>✅</span><p className="text-sm text-primary">{punt}</p>
                  </div>
                ))}
              </div>
            )}
            {rapport.top3Prioriteiten?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-display text-lg text-warning">{isEn ? "Priorities" : "Prioriteiten"}</h3>
                {rapport.top3Prioriteiten.map((p: string, i: number) => (
                  <div key={i} className="flex gap-3 items-start bg-warning/10 border border-warning/20 rounded-xl p-3">
                    <span>🔧</span><p className="text-sm text-primary">{p}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="font-display text-2xl text-primary">{isEn ? "Analysis per section" : "Analyse per onderdeel"}</h2>
          {Object.entries(velden || {}).map(([key, veld]: [string, any]) => {
            if (!veld || !veld.score) return null;
            const bgKleur = scoreBgKleur(veld.score);
            return (
              <div key={key} className={`card p-5 sm:p-6 border ${bgKleur} space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-xl text-primary flex items-center gap-2">
                    <span>{VELD_ICONEN[key] ?? "📄"}</span>
                    <span>{(VELD_NAMEN as Record<string, string>)[key] ?? key}</span>
                  </h3>
                  <VeldScore score={veld.score} />
                </div>
                {veld.analyse && <p className="italic text-text-secondary leading-relaxed">{veld.analyse}</p>}
                {veld.verbeterpunten?.length > 0 && (
                  <ul className="space-y-1">
                    {veld.verbeterpunten.map((p: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-text-secondary">
                        <span className="text-accent mt-0.5">•</span><span>{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {veld.herschrevenVersie && (
                  <div className="bg-surface rounded-xl p-4 border border-border space-y-2">
                    <p className="text-sm text-primary whitespace-pre-line">{veld.herschrevenVersie}</p>
                    <CopyButton tekst={veld.herschrevenVersie} />
                  </div>
                )}
                {veld.herschrevenVersies?.map((v: any, i: number) => (
                  <div key={i} className="bg-surface rounded-xl p-4 border border-border space-y-2">
                    {v.uitleg && <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">{v.uitleg}</p>}
                    <p className="text-sm text-primary">{v.versie}</p>
                    <CopyButton tekst={v.versie} />
                  </div>
                ))}
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
