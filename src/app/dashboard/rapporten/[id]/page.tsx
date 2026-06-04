import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BoniAvatar } from "@/components/BoniAvatar";
import { CopyButton } from "@/components/CopyButton";
import RapportActions from "./RapportActions";

export default async function RapportPagina({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rapport } = await supabase
    .from("rapporten")
    .select("*, abonnementen(listing_naam, airbnb_url, frequentie)")
    .eq("id", params.id)
    .eq("user_id", user.id)
    .single();

  if (!rapport) redirect("/dashboard");

  const r = rapport.rapport_json;
  const abo = rapport.abonnementen as any;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* Navigatie */}
        <RapportActions titel={r.rapportTitel} />

        {/* Header */}
        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-3">
            <BoniAvatar size={50} />
            <div>
              <h1 className="font-display text-xl text-primary">{r.rapportTitel || "Review Rapport"}</h1>
              <p className="text-sm text-text-secondary">
                {abo?.listing_naam || "Mijn woning"} · {rapport.periode_omschrijving}
              </p>
            </div>
          </div>

          {r.sentiment && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Positief", waarde: r.sentiment.positief, kleur: "text-success bg-success/10" },
                { label: "Neutraal", waarde: r.sentiment.neutraal, kleur: "text-warning bg-warning/10" },
                { label: "Negatief", waarde: r.sentiment.negatief, kleur: "text-danger bg-danger/10" },
              ].map(({ label, waarde, kleur }) => (
                <div key={label} className={`rounded-xl p-3 text-center ${kleur}`}>
                  <p className="text-2xl font-bold">{waarde}%</p>
                  <p className="text-xs font-semibold">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {r.samenvatting && (
          <div className="card p-6 flex gap-4">
            <BoniAvatar size={50} className="flex-shrink-0" />
            <p className="italic text-primary leading-relaxed">{r.samenvatting}</p>
          </div>
        )}

        {r.terugkerendeComplimenten?.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-display text-xl text-success">✅ Wat gasten waarderen</h2>
            <ul className="space-y-2">
              {r.terugkerendeComplimenten.map((punt: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary">
                  <span className="text-success shrink-0">•</span>{punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.terugkerendeKlachten?.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-display text-xl text-warning">⚠️ Terugkerende klachten</h2>
            <ul className="space-y-2">
              {r.terugkerendeKlachten.map((punt: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary">
                  <span className="text-warning shrink-0">•</span>{punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.rodeVlaggen?.length > 0 && (
          <div className="card p-6 space-y-3 border-danger/30 bg-danger/5">
            <h2 className="font-display text-xl text-danger">🚨 Directe aandacht nodig</h2>
            <ul className="space-y-2">
              {r.rodeVlaggen.map((vlag: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary">
                  <span className="text-danger shrink-0">•</span>{vlag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.verbeterpunten?.length > 0 && (
          <div className="card p-6 space-y-3">
            <h2 className="font-display text-xl text-primary">🎯 Verbeterpunten</h2>
            <ul className="space-y-2">
              {r.verbeterpunten.map((punt: string, i: number) => (
                <li key={i} className="flex gap-2 text-sm text-primary bg-primary/5 rounded-xl p-3">
                  <span className="font-bold text-accent shrink-0">{i + 1}.</span>{punt}
                </li>
              ))}
            </ul>
          </div>
        )}

        {r.voorbeeldReacties?.length > 0 && (
          <div className="card p-6 space-y-4">
            <h2 className="font-display text-xl text-primary">💬 Voorbeeldreacties</h2>
            {r.voorbeeldReacties.map((reactie: any, i: number) => (
              <div key={i} className="bg-surface rounded-xl p-4 border border-border space-y-2">
                {reactie.origineelReview && (
                  <p className="text-xs text-text-secondary italic">"{reactie.origineelReview}"</p>
                )}
                <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
                  {reactie.aanbevolenReactie}
                </p>
                <CopyButton tekst={reactie.aanbevolenReactie} />
              </div>
            ))}
          </div>
        )}

        {r.afsluiting && (
          <div className="card p-6 flex gap-4">
            <BoniAvatar size={50} className="flex-shrink-0" />
            <p className="text-text-secondary leading-relaxed italic">{r.afsluiting}</p>
          </div>
        )}

      </div>
    </div>
  );
}
