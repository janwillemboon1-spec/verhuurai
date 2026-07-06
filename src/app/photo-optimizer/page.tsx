import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";
import { VoorNaSlider } from "@/components/VoorNaSlider";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function PhotoOptimizerPage() {
  const admin = createAdminClient();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const { data: voorbeelden } = await admin
    .from("foto_bewerkingen")
    .select("id, ruimte, origineel_pad, bewerkt_pad")
    .eq("positief_beoordeeld", true)
    .not("origineel_pad", "is", null)
    .not("bewerkt_pad", "is", null)
    .order("id", { ascending: false })
    .limit(5);

  const fotos = (voorbeelden ?? []).map((f) => ({
    id: f.id,
    label: f.ruimte || "kamer",
    voor: `${supabaseUrl}/storage/v1/object/public/foto-originelen/${f.origineel_pad}`,
    na: `${supabaseUrl}/storage/v1/object/public/foto-bewerkt/${f.bewerkt_pad}`,
  }));

  return (
    <div className="min-h-screen bg-background">

      {/* Hero */}
      <section className="section bg-gradient-to-br from-background to-blue-50/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row items-center gap-10 md:gap-16">
            <div className="flex-1 text-center md:text-left">
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-primary leading-tight mb-5">
                Photo Optimizer
              </h1>
              <p className="text-text-secondary text-lg mb-8 max-w-xl mx-auto md:mx-0">
                Boni verbetert jouw Airbnb foto's automatisch naar professionele kwaliteit. Betere helderheid, scherpte en witbalans — zonder dure fotograaf.
              </p>
              <Link href="/photo-optimizer/starten" className="btn-primary text-center inline-block">
                Foto's uploaden →
              </Link>
            </div>
            <div className="flex justify-center flex-shrink-0">
              <BoniAvatar size={180} animate={true} />
            </div>
          </div>
        </div>
      </section>

      {/* Hoe het werkt */}
      <section className="section bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Hoe het werkt</h2>
            <p className="text-text-secondary text-lg">Van upload naar professionele foto's in drie stappen</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stap: "1", icoon: "📤", titel: "Upload je foto's", tekst: "Sleep je advertentie foto's naar het formulier. Tot 50 foto's tegelijk, max 20 MB per stuk. JPEG, PNG of WEBP." },
              { stap: "2", icoon: "🤖", titel: "Boni bewerkt ze", tekst: "Boni verbetert automatisch de helderheid, scherpte, witbalans en duidelijkheid van elke foto op basis van duizenden Airbnb-voorbeelden." },
              { stap: "3", icoon: "📥", titel: "Download het resultaat", tekst: "Je krijgt alle verbeterde foto's in een zip-bestand. Direct klaar om te uploaden naar je Airbnb advertentie." },
            ].map(({ stap, icoon, titel, tekst }) => (
              <div key={stap} className="card p-8 text-center">
                <div className="text-5xl mb-4">{icoon}</div>
                <div className="text-xs font-bold text-accent uppercase tracking-widest mb-2">Stap {stap}</div>
                <h3 className="font-display text-xl font-bold text-primary mb-3">{titel}</h3>
                <p className="text-text-secondary">{tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Wat wordt verbeterd */}
      <section className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Wat Boni verbetert</h2>
            <p className="text-text-secondary text-lg">Vier aspecten die gasten overtuigen om te boeken</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icoon: "💡", titel: "Helderheid", tekst: "Donkere kamers worden helder en uitnodigend" },
              { icoon: "🔍", titel: "Scherpte", tekst: "Details komen beter naar voren" },
              { icoon: "⚖️", titel: "Witbalans", tekst: "Kleuren zien er natuurlijk en warm uit" },
              { icoon: "✨", titel: "Duidelijkheid", tekst: "De ruimte oogt groter en luchtiger" },
            ].map(({ icoon, titel, tekst }) => (
              <div key={titel} className="card p-6 text-center">
                <div className="text-4xl mb-3">{icoon}</div>
                <h3 className="font-display text-lg font-bold text-primary mb-2">{titel}</h3>
                <p className="text-text-secondary text-sm">{tekst}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Voor & Na voorbeelden */}
      {fotos.length > 0 && (
        <section className="section bg-surface">
          <div className="max-w-5xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Voor & Na</h2>
              <p className="text-text-secondary text-lg">Sleep de schuifbalk om het verschil te zien</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {fotos.map((foto) => (
                <VoorNaSlider key={foto.id} voor={foto.voor} na={foto.na} label={foto.label} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Prijzen */}
      <section id="prijzen" className="section bg-background">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-primary mb-3">Transparante prijs</h2>
            <p className="text-text-secondary text-lg">Je betaalt per foto. Hoe meer foto's, hoe lager de prijs per stuk.</p>
          </div>
          <div className="max-w-sm mx-auto">
            <div className="card p-8 border-accent border-2 space-y-1">
              <div className="text-5xl text-center mb-4">📷</div>
              <h3 className="font-display text-2xl font-bold text-primary text-center mb-4">Prijs per foto</h3>
              {[
                { label: "1–5 foto's", prijs: "€1,49 / foto" },
                { label: "6–10 foto's", prijs: "€1,29 / foto" },
                { label: "11–20 foto's", prijs: "€1,09 / foto" },
                { label: "21–30 foto's", prijs: "€0,89 / foto" },
                { label: "31–50 foto's", prijs: "€0,75 / foto" },
              ].map(({ label, prijs }) => (
                <div key={label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                  <span className="text-text-secondary text-sm">{label}</span>
                  <span className="font-semibold text-primary">{prijs}</span>
                </div>
              ))}
              <p className="text-xs text-text-secondary text-center pt-3">Eenmalige betaling · Geen abonnement · Veilig via Stripe · iDEAL mogelijk</p>
              <Link href="/photo-optimizer/starten" className="btn-primary w-full text-center block mt-4">
                Foto's uploaden →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section bg-primary">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <BoniAvatar size={80} animate={true} className="mx-auto mb-6" />
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-white mb-4">
            Klaar voor professionele foto's?
          </h2>
          <p className="text-white/70 text-lg mb-8">
            Upload je foto's en download ze verbeterd. Binnen een paar minuten klaar.
          </p>
          <Link href="/photo-optimizer/starten" className="btn-primary text-center inline-block">
            Foto's uploaden →
          </Link>
        </div>
      </section>

    </div>
  );
}
