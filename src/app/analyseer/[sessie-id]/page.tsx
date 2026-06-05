"use client";

import { useState, useRef, ChangeEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { BoniAvatar } from "@/components/BoniAvatar";
import { VeldUitleg } from "@/components/VeldUitleg";
import { AnalyseFormulier } from "@/types/rapport";

const TOTAAL_STAPPEN = 14;

const DOELGROEP_OPTIES = [
  "Gezinnen met kinderen",
  "Koppels",
  "Zakenreizigers",
  "Backpackers",
  "Luxe reizigers",
  "Groepen",
  "Anders",
];

const WONING_TYPEN = [
  "Appartement",
  "Vrijstaand huis",
  "Kamer",
  "Villa",
  "Unieke accommodatie",
  "Anders",
];

const STAP_QUOTES: Record<number, string> = {
  1: "Vertel me iets over jezelf en je woning. Hoe meer ik weet, hoe beter mijn analyse!",
  2: "De titel is je eerste indruk. Laten we zorgen dat hij opvalt!",
  3: "Een sterke opening haalt gasten binnen. Maak hem onweerstaanbaar!",
  4: "Vertel gasten precies wat ze kunnen verwachten. Duidelijkheid wekt vertrouwen.",
  5: "Hoe makkelijker de toegang, hoe meer vijfsterrenreviews je krijgt.",
  6: "Gasten waarderen warmte. Laat zien dat je er voor ze bent!",
  7: "Extra info voorkomt verrassingen. Dat levert blije gasten op.",
  8: "Voorzieningen zijn een van de grootste zoekfilters. Laten we ze optimaliseren.",
  9: "Gasten boeken een ervaring, niet alleen een bed. Vertel over de buurt!",
  10: "Makkelijk bereikbaar? Dan boeken ze sneller. Geef duidelijke vervoersinformatie.",
  11: "Reviews zijn goud waard. Laten we zien wat gasten écht vinden.",
  12: "Je hostprofiel bouwt vertrouwen. Vertel wie jij bent!",
  13: "Duidelijke huisregels = minder misverstanden. Goed voor iedereen!",
  14: "Bijna klaar! Deel wat jij het belangrijkste vindt en ik neem het mee.",
};

const STAP_NAMEN: Record<number, string> = {
  1: "Basisinformatie",
  2: "Titel",
  3: "Advertentiebeschrijving",
  4: "Accommodatie omschrijving",
  5: "Toegang voor gasten",
  6: "Interactie met gasten",
  7: "Andere informatie",
  8: "Voorzieningen",
  9: "Hoogtepunten buurt",
  10: "Vervoersmogelijkheden",
  11: "Recensies",
  12: "Host profiel",
  13: "Huisregels",
  14: "Extra context",
};

interface FotoPerStap {
  [stap: number]: { file: File; preview: string }[];
}

export default function AnalyseerPage() {
  const params = useParams();
  const router = useRouter();
  const sessieId = Array.isArray(params["sessie-id"]) ? params["sessie-id"][0] : params["sessie-id"] as string;

  const [huidigeStap, setHuidigeStap] = useState(1);
  const [fout, setFout] = useState<string | null>(null);
  const [laden, setLaden] = useState(false);
  const [fotoPerStap, setFotoPerStap] = useState<FotoPerStap>({});
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<AnalyseFormulier>({
    defaultValues: {
      rapportTaal: "nl",
      doelgroep: [],
      directBoeken: "weet_niet",
      annuleringsbeleid: "Flexibel",
    },
  });

  const sessieFout = !sessieId || sessieId.trim().length < 3;

  if (sessieFout) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 max-w-md w-full text-center">
          <BoniAvatar size={80} className="mx-auto mb-4" />
          <h1 className="font-display text-2xl text-primary mb-3">Ongeldige sessie</h1>
          <p className="text-text-secondary mb-6">
            Dit sessie-ID is niet geldig. Controleer de link in je e-mail of start een nieuwe sessie.
          </p>
          <Link href="/starten" className="btn-primary inline-block">
            Terug naar pakketten
          </Link>
        </div>
      </div>
    );
  }

  const totaalFotos = Object.values(fotoPerStap).reduce((sum, arr) => sum + arr.length, 0);

  const voegFotoToe = (stap: number, files: FileList) => {
    const nieuweItems = Array.from(files)
      .filter((f) => f.size <= 10 * 1024 * 1024)
      .slice(0, Math.max(0, 20 - totaalFotos))
      .map((file) => ({ file, preview: URL.createObjectURL(file) }));

    setFotoPerStap((prev) => ({
      ...prev,
      [stap]: [...(prev[stap] || []), ...nieuweItems],
    }));
  };

  const verwijderFoto = (stap: number, index: number) => {
    setFotoPerStap((prev) => {
      const huidig = [...(prev[stap] || [])];
      URL.revokeObjectURL(huidig[index].preview);
      huidig.splice(index, 1);
      return { ...prev, [stap]: huidig };
    });
  };

  const naarVolgend = () => {
    if (huidigeStap < TOTAAL_STAPPEN) setHuidigeStap((s) => s + 1);
  };

  const naarVorig = () => {
    if (huidigeStap > 1) setHuidigeStap((s) => s - 1);
  };

  const onSubmit = async (data: AnalyseFormulier) => {
    setLaden(true);
    setFout(null);
    try {
      const fotos: Array<{ base64: string; mediaType: string; stap: number }> = [];
      for (const [stapStr, arr] of Object.entries(fotoPerStap)) {
        const stap = parseInt(stapStr);
        for (const { file } of arr) {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const [header, base64] = dataUrl.split(",");
          const mediaType = header.split(":")[1].split(";")[0];
          fotos.push({ base64, mediaType, stap });
        }
      }
      const payload = { sessieId, formData: data, fotos };
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Er ging iets mis. Probeer het opnieuw.");
      }
      router.push(`/laden/${sessieId}`);
    } catch (e: unknown) {
      setFout(e instanceof Error ? e.message : "Er ging iets mis. Probeer het opnieuw.");
      setLaden(false);
    }
  };

  const voortgang = Math.round(((huidigeStap - 1) / TOTAAL_STAPPEN) * 100);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              Stap {huidigeStap} van {TOTAAL_STAPPEN}
            </span>
            <span className="text-xs font-semibold text-accent">{voortgang}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-500"
              style={{ width: `${voortgang}%` }}
            />
          </div>
          <p className="text-sm font-semibold text-primary mt-2">{STAP_NAMEN[huidigeStap]}</p>
        </div>

        <div className="flex items-start gap-3 mb-6 card p-4">
          <BoniAvatar size={50} />
          <p className="text-sm text-text-secondary italic mt-1 leading-relaxed">
            "{STAP_QUOTES[huidigeStap]}"
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {huidigeStap === 1 && (
            <Stap1 register={register} control={control} watch={watch} errors={errors} />
          )}
          {huidigeStap === 2 && (
            <Stap2 register={register} watch={watch} errors={errors} />
          )}
          {huidigeStap === 3 && (
            <Stap3 register={register} watch={watch} />
          )}
          {huidigeStap >= 4 && huidigeStap <= 13 && huidigeStap !== 11 && (
            <StapInhoud
              key={huidigeStap}
              stap={huidigeStap}
              register={register}
              fotos={fotoPerStap[huidigeStap] || []}
              totaalFotos={totaalFotos}
              onFotoToevoegen={(files) => voegFotoToe(huidigeStap, files)}
              onFotoVerwijderen={(i) => verwijderFoto(huidigeStap, i)}
              fileInputRef={(el) => { fileInputRefs.current[huidigeStap] = el; }}
              onFotoKnopKlik={() => fileInputRefs.current[huidigeStap]?.click()}
            />
          )}
          {huidigeStap === 11 && (
            <Stap11Reviews
              register={register}
              airbnbUrl={watch("airbnbUrl")}
              onReviewsGeladen={(recensies, kenmerken) => {
                setValue("recensies", recensies);
                setValue("veelgenoemdeKenmerken", kenmerken);
              }}
              fotos={fotoPerStap[11] || []}
              totaalFotos={totaalFotos}
              onFotoToevoegen={(files) => voegFotoToe(11, files)}
              onFotoVerwijderen={(i) => verwijderFoto(11, i)}
              fileInputRef={(el) => { fileInputRefs.current[11] = el; }}
              onFotoKnopKlik={() => fileInputRefs.current[11]?.click()}
            />
          )}
          {huidigeStap === 14 && (
            <Stap14 register={register} control={control} />
          )}

          {fout && (
            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 my-4 text-danger text-sm">
              {fout}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            {huidigeStap > 1 && (
              <button
                type="button"
                onClick={naarVorig}
                className="btn-secondary flex-1"
              >
                ← Terug
              </button>
            )}
            {huidigeStap < TOTAAL_STAPPEN ? (
              <button
                key="volgende"
                type="button"
                onClick={naarVolgend}
                className="btn-primary flex-1"
              >
                Volgende →
              </button>
            ) : (
              <button
                key="analyseer"
                type="submit"
                disabled={laden}
                className={`btn-primary flex-1 flex items-center justify-center gap-2 ${laden ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                {laden ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Analyseren...
                  </>
                ) : (
                  <><span className="hidden sm:inline">Laat Boni mijn advertentie analyseren</span><span className="sm:hidden">Analyseer mijn advertentie</span> →</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function Stap1({
  register,
  control,
  watch,
  errors,
}: {
  register: ReturnType<typeof useForm<AnalyseFormulier>>["register"];
  control: ReturnType<typeof useForm<AnalyseFormulier>>["control"];
  watch: ReturnType<typeof useForm<AnalyseFormulier>>["watch"];
  errors: ReturnType<typeof useForm<AnalyseFormulier>>["formState"]["errors"];
}) {
  const doelgroepWaarden = watch("doelgroep") || [];
  const andersAangevinkt = doelgroepWaarden.includes("Anders");

  return (
    <div className="card p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-primary mb-1.5">
          Airbnb advertentie URL
          <span className="text-text-secondary text-xs font-normal ml-1">(optioneel)</span>
        </label>
        <input
          {...register("airbnbUrl")}
          type="url"
          placeholder="https://www.airbnb.nl/rooms/12345678"
          className="input"
        />
        <p className="text-xs text-text-secondary mt-1">
          Vul je URL in om bij stap 11 reviews automatisch op te halen via Airbnb.
        </p>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary mb-1.5">
          Naam van de host <span className="text-accent">*</span>
        </label>
        <input
          {...register("hostNaam", { required: true })}
          placeholder="Jouw voornaam"
          className={`input ${errors.hostNaam ? "border-danger focus:border-danger" : ""}`}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Taal van het rapport
        </label>
        <Controller
          name="rapportTaal"
          control={control}
          render={({ field }) => (
            <div className="flex gap-3">
              {[
                { waarde: "nl", label: "🇳🇱 Nederlands" },
                { waarde: "en", label: "🇬🇧 English" },
              ].map(({ waarde, label }) => (
                <label
                  key={waarde}
                  className={`flex items-center gap-2 cursor-pointer card px-4 py-2.5 flex-1 justify-center text-sm font-medium transition-all ${
                    field.value === waarde ? "border-accent bg-accent/5 text-accent" : "text-text-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    value={waarde}
                    checked={field.value === waarde}
                    onChange={() => field.onChange(waarde)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary mb-1.5">
          Type woning
        </label>
        <select {...register("woningType")} className="input">
          <option value="">Kies een type...</option>
          {WONING_TYPEN.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Doelgroep
        </label>
        <Controller
          name="doelgroep"
          control={control}
          render={({ field }) => (
            <div className="grid grid-cols-2 gap-2">
              {DOELGROEP_OPTIES.map((optie) => {
                const aangevinkt = (field.value || []).includes(optie);
                return (
                  <label
                    key={optie}
                    className={`flex items-center gap-2 cursor-pointer card px-3 py-2 text-sm transition-all ${
                      aangevinkt ? "border-accent bg-accent/5 text-accent font-medium" : "text-text-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={aangevinkt}
                      onChange={() => {
                        const huidig = field.value || [];
                        field.onChange(
                          aangevinkt ? huidig.filter((v) => v !== optie) : [...huidig, optie]
                        );
                      }}
                      className="accent-accent"
                    />
                    {optie}
                  </label>
                );
              })}
            </div>
          )}
        />
        {andersAangevinkt && (
          <input
            {...register("doelgroepCustom")}
            placeholder="Omschrijf je doelgroep..."
            className="input mt-2"
          />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-primary mb-1.5">Land</label>
          <input {...register("land")} placeholder="Nederland" className="input" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary mb-1.5">
            Stad <span className="text-accent">*</span>
          </label>
          <input
            {...register("stad", { required: true })}
            placeholder="Amsterdam"
            className={`input ${errors.stad ? "border-danger" : ""}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-primary mb-1.5">
            Gem. prijs per nacht (€)
          </label>
          <input
            {...register("prijsPerNacht", { valueAsNumber: true })}
            type="number"
            min={0}
            placeholder="85"
            className="input"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-primary mb-1.5">
            Bezettingsgraad (%)
          </label>
          <input
            {...register("bezettingsgraad", { valueAsNumber: true })}
            type="number"
            min={0}
            max={100}
            placeholder="70"
            className="input"
          />
        </div>
      </div>
    </div>
  );
}

function Stap2({
  register,
  watch,
  errors,
}: {
  register: ReturnType<typeof useForm<AnalyseFormulier>>["register"];
  watch: ReturnType<typeof useForm<AnalyseFormulier>>["watch"];
  errors: ReturnType<typeof useForm<AnalyseFormulier>>["formState"]["errors"];
}) {
  const titel = watch("titel") || "";
  const aantalTekens = titel.length;
  const teVeel = aantalTekens > 50;

  return (
    <div className="card p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-primary mb-1">
          Jouw advertentietitel
        </label>
        <p className="text-xs text-text-secondary mb-3">
          De titel is een van de eerste dingen die gasten zien in de zoekresultaten. Maximaal 50 tekens.
        </p>

        <div className="bg-background rounded-xl border border-border p-3 mb-4">
          <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide mb-2">
            Voorbeeld zoekresultaat
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/uitleg/airbnb-voorbeeld.png"
            alt="Voorbeeld Airbnb zoekresultaat"
            className="w-48 rounded-xl"
          />
          <p className="text-xs text-text-secondary mt-2">
            ↑ Jouw titel komt te staan in het <span className="font-semibold text-red-500">rode vak</span>.
          </p>
        </div>

        <input
          {...register("titel")}
          placeholder="Bijv: Gezellig appartement in het hart van Amsterdam"
          className={`input ${errors.titel || teVeel ? "border-danger focus:border-danger" : ""}`}
        />
        <div className="flex justify-end mt-1">
          <span className={`text-xs font-semibold ${teVeel ? "text-danger" : "text-text-secondary"}`}>
            {aantalTekens}/50
          </span>
        </div>
      </div>
    </div>
  );
}

function Stap3({
  register,
  watch,
}: {
  register: ReturnType<typeof useForm<AnalyseFormulier>>["register"];
  watch: ReturnType<typeof useForm<AnalyseFormulier>>["watch"];
}) {
  const beschrijving = watch("beschrijving") || "";
  const aantalTekens = beschrijving.length;
  const teKort = aantalTekens > 0 && aantalTekens < 400;
  const teVeel = aantalTekens > 500;

  return (
    <div className="card p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-primary mb-1">
          Advertentiebeschrijving
        </label>
        <p className="text-xs text-text-secondary mb-3">
          De eerste tekst die gasten zien. Maximaal 500 tekens. Dit is je haak — maak hem sterk.
        </p>

        <div className="bg-background rounded-xl border border-border p-4 mb-4">
          <p className="text-xs text-text-secondary font-semibold uppercase tracking-wide mb-2">
            Voorbeeld listing preview
          </p>
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-xs text-text-secondary leading-relaxed line-clamp-3">
              {beschrijving || "Jouw beschrijving verschijnt hier als voorbeeld..."}
            </p>
            {beschrijving.length > 180 && (
              <span className="text-xs text-accent font-medium">meer tonen</span>
            )}
          </div>
        </div>

        <textarea
          {...register("beschrijving")}
          rows={6}
          placeholder="Welkom in ons zonnige appartement met uitzicht op de grachten..."
          className={`textarea ${
            teVeel ? "border-danger" : teKort ? "border-warning" : ""
          }`}
        />
        <div className="flex items-center justify-between mt-1">
          {teKort && (
            <span className="text-xs text-warning font-medium">
              Aanbevolen minimaal 400 tekens
            </span>
          )}
          {teVeel && (
            <span className="text-xs text-danger font-medium">
              Maximaal 500 tekens
            </span>
          )}
          {!teKort && !teVeel && <span />}
          <span className={`text-xs font-semibold ml-auto ${teVeel ? "text-danger" : teKort ? "text-warning" : "text-text-secondary"}`}>
            {aantalTekens}/500
          </span>
        </div>
      </div>
    </div>
  );
}

const STAP_VELD_NAMEN: Record<number, { label: string; uitleg: string; veld: keyof AnalyseFormulier; airbnbUitleg: string }> = {
  4: {
    label: "Accommodatie omschrijving",
    uitleg: "Beschrijf alle ruimtes, het interieur en wat de woning bijzonder maakt.",
    veld: "accommodatie",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Je woning' → 'Accommodatieomschrijving'",
  },
  5: {
    label: "Toegang voor gasten",
    uitleg: "Hoe komen gasten binnen? Sleutelkluisje, slimme slot, check-in instructies?",
    veld: "toegang",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Je woning' → 'Toegang voor gasten'",
  },
  6: {
    label: "Interactie met gasten",
    uitleg: "Hoe beschikbaar ben je? Vertel over je communicatiestijl als host.",
    veld: "interactie",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Je woning' → 'Interactie met gasten'",
  },
  7: {
    label: "Andere belangrijke informatie",
    uitleg: "Denk aan trap zonder lift, parkeerruimte, huisdieren, geluidsniveau, etc.",
    veld: "andereInfo",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Je woning' → 'Andere dingen die gasten moeten weten'",
  },
  8: {
    label: "Voorzieningen",
    uitleg: "Lijst alle voorzieningen op, gescheiden door komma's of als lijst.",
    veld: "voorzieningen",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Voorzieningen'",
  },
  9: {
    label: "Hoogtepunten van de buurt",
    uitleg: "Restaurants, bezienswaardigheden, parken, markten — wat maakt jouw buurt bijzonder?",
    veld: "buurt",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Locatie' → 'Hoogtepunten van de buurt'",
  },
  10: {
    label: "Vervoersmogelijkheden",
    uitleg: "Hoe ver is het station, de bushalte, de luchthaven? Parkeermogelijkheden?",
    veld: "vervoer",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Locatie' → 'Verplaatsen'",
  },
  11: {
    label: "Recensies",
    uitleg: "Plak hier minimaal 5 recensies (inclusief eventuele hostrespons). Hoe meer, hoe beter.",
    veld: "recensies",
    airbnbUitleg: "Ga naar de publieke pagina van jouw advertentie → scroll naar 'Recensies'. Kopieer de tekst inclusief jouw reacties.",
  },
  12: {
    label: "Host profiel",
    uitleg: "Plak de tekst van jouw hostprofiel. Wat vertel je over jezelf?",
    veld: "hostProfiel",
    airbnbUitleg: "Hostmodus → Profiel → klik op jouw naam/foto → kopieer de profieltekst bij 'Over mij'",
  },
  13: {
    label: "Huisregels",
    uitleg: "Wat zijn de regels voor gasten? Inchecktijden, huisdieren, roken, feesten?",
    veld: "huisregels",
    airbnbUitleg: "Hostmodus → Advertenties → jouw woning → Bewerken → 'Huisregels'",
  },
};

function StapInhoud({
  stap,
  register,
  fotos,
  totaalFotos,
  onFotoToevoegen,
  onFotoVerwijderen,
  fileInputRef,
  onFotoKnopKlik,
}: {
  stap: number;
  register: ReturnType<typeof useForm<AnalyseFormulier>>["register"];
  fotos: { file: File; preview: string }[];
  totaalFotos: number;
  onFotoToevoegen: (files: FileList) => void;
  onFotoVerwijderen: (index: number) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFotoKnopKlik: () => void;
}) {
  const info = STAP_VELD_NAMEN[stap];
  if (!info) return null;

  const rijenTekstveld = stap === 11 ? 10 : 5;

  return (
    <div className="card p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-primary mb-1">{info.label}</label>
        <p className="text-xs text-text-secondary mb-3">{info.uitleg}</p>
        {(info as any).airbnbUitleg && (
          <VeldUitleg tekst={(info as any).airbnbUitleg} />
        )}
        <textarea
          {...register(info.veld as keyof AnalyseFormulier)}
          rows={rijenTekstveld}
          placeholder={`Jouw ${info.label.toLowerCase()}...`}
          className="textarea"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-primary">Screenshot uploaden</p>
          <span className="text-xs text-text-secondary">{totaalFotos}/20 foto&apos;s</span>
        </div>
        <p className="text-xs text-text-secondary mb-3">
          Optioneel — max 10 MB per foto. Helpt Boni je advertentie beter te analyseren.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
              onFotoToevoegen(e.target.files);
              e.target.value = "";
            }
          }}
        />

        <button
          type="button"
          onClick={onFotoKnopKlik}
          disabled={totaalFotos >= 20}
          className={`btn-secondary w-full flex items-center justify-center gap-2 ${totaalFotos >= 20 ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <span>📸</span>
          Screenshot uploaden
        </button>

        {fotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {fotos.map((foto, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                <img
                  src={foto.preview}
                  alt={`Screenshot ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => onFotoVerwijderen(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-danger text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stap14({
  register,
  control,
}: {
  register: ReturnType<typeof useForm<AnalyseFormulier>>["register"];
  control: ReturnType<typeof useForm<AnalyseFormulier>>["control"];
}) {
  return (
    <div className="card p-6 space-y-5">
      <div>
        <label className="block text-sm font-semibold text-primary mb-1.5">
          Wat vind je zelf het sterkste punt van je woning?
        </label>
        <textarea
          {...register("sterkstePunt")}
          rows={3}
          placeholder="Bijv: De ligging vlak bij het centrum, het ruime terras..."
          className="textarea"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary mb-1.5">
          Waar twijfel je zelf over?
        </label>
        <textarea
          {...register("twijfels")}
          rows={3}
          placeholder="Bijv: Mijn titel is misschien te generiek, of mijn foto's..."
          className="textarea"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Direct boeken
        </label>
        <Controller
          name="directBoeken"
          control={control}
          render={({ field }) => (
            <div className="flex gap-3 flex-wrap">
              {[
                { waarde: "aan", label: "Aan" },
                { waarde: "uit", label: "Uit" },
                { waarde: "weet_niet", label: "Weet ik niet" },
              ].map(({ waarde, label }) => (
                <label
                  key={waarde}
                  className={`flex items-center gap-2 cursor-pointer card px-4 py-2.5 text-sm font-medium transition-all ${
                    field.value === waarde ? "border-accent bg-accent/5 text-accent" : "text-text-secondary"
                  }`}
                >
                  <input
                    type="radio"
                    value={waarde}
                    checked={field.value === waarde}
                    onChange={() => field.onChange(waarde)}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          )}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-primary mb-1.5">
          Annuleringsbeleid
        </label>
        <select {...register("annuleringsbeleid")} className="input">
          <option value="Flexibel">Flexibel</option>
          <option value="Gematigd">Gematigd</option>
          <option value="Strikt">Strikt</option>
          <option value="Niet-restitueerbaar">Niet-restitueerbaar</option>
        </select>
      </div>
    </div>
  );
}

function Stap11Reviews({
  register,
  airbnbUrl,
  onReviewsGeladen,
  fotos,
  totaalFotos,
  onFotoToevoegen,
  onFotoVerwijderen,
  fileInputRef,
  onFotoKnopKlik,
}: {
  register: ReturnType<typeof useForm<AnalyseFormulier>>["register"];
  airbnbUrl?: string;
  onReviewsGeladen: (recensies: string, kenmerken: string[]) => void;
  fotos: { file: File; preview: string }[];
  totaalFotos: number;
  onFotoToevoegen: (files: FileList) => void;
  onFotoVerwijderen: (index: number) => void;
  fileInputRef: (el: HTMLInputElement | null) => void;
  onFotoKnopKlik: () => void;
}) {
  const [scraping, setScraping] = useState(false);
  const [scrapeFout, setScrapeFout] = useState<string | null>(null);
  const [scrapeSucces, setScrapeSucces] = useState<{ aantal: number; kenmerken: string[] } | null>(null);

  const haalReviewsOp = async () => {
    if (!airbnbUrl) return;
    setScraping(true);
    setScrapeFout(null);
    setScrapeSucces(null);

    try {
      const res = await fetch("/api/scrape-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: airbnbUrl }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setScrapeFout(
          (data.error || "Kon reviews niet ophalen.") +
          (data.suggestie ? ` ${data.suggestie}` : " Plak ze handmatig in het tekstveld.")
        );
        return;
      }

      onReviewsGeladen(data.recensies, data.veelgenoemdeKenmerken || []);
      setScrapeSucces({ aantal: data.aantalReviews, kenmerken: data.veelgenoemdeKenmerken || [] });
    } catch {
      setScrapeFout("Verbindingsfout. Plak de reviews handmatig hieronder.");
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="card p-6 space-y-4">
      <div>
        <label className="block text-sm font-semibold text-primary mb-1">Recensies</label>
        <p className="text-xs text-text-secondary mb-3">
          Plak minimaal 5 recensies (inclusief eventuele hostrespons). Hoe meer, hoe beter.
        </p>

        {/* Automatisch ophalen via Apify */}
        {airbnbUrl ? (
          <div className="bg-primary/5 border border-primary/15 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-primary mb-1">
              🤖 Automatisch reviews ophalen
            </p>
            <p className="text-xs text-text-secondary mb-3">
              Boni haalt tot 50 reviews op van jouw Airbnb advertentie.
              Dit duurt ca. 60 seconden.
            </p>
            <button
              type="button"
              onClick={haalReviewsOp}
              disabled={scraping}
              className={`btn-primary w-full flex items-center justify-center gap-2 ${scraping ? "opacity-70 cursor-not-allowed" : ""}`}
            >
              {scraping ? (
                <>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Reviews ophalen... (ca. 60 sec)
                </>
              ) : (
                "⬇️ Haal reviews op via Airbnb"
              )}
            </button>

            {scrapeSucces && (
              <div className="mt-3 bg-success/10 border border-success/20 rounded-lg p-3">
                <p className="text-sm font-semibold text-success mb-1">
                  ✅ {scrapeSucces.aantal} reviews opgehaald!
                </p>
                {scrapeSucces.kenmerken.length > 0 && (
                  <p className="text-xs text-text-secondary">
                    Veelgenoemde kenmerken:{" "}
                    <span className="font-medium text-primary">
                      {scrapeSucces.kenmerken.join(", ")}
                    </span>
                    {" "}— Boni gebruikt deze voor je titeladvies.
                  </p>
                )}
              </div>
            )}

            {scrapeFout && (
              <div className="mt-3 bg-warning/10 border border-warning/20 rounded-lg p-3">
                <p className="text-xs text-warning font-medium">⚠️ {scrapeFout}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-border/50 rounded-xl p-3 mb-3 text-xs text-text-secondary">
            💡 Tip: vul bij stap 1 je Airbnb URL in om reviews automatisch op te halen.
          </div>
        )}

        <textarea
          {...register("recensies")}
          rows={10}
          placeholder="Plak hier je recensies, of gebruik de knop hierboven om ze automatisch op te halen..."
          className="textarea"
        />
      </div>

      {/* Foto upload */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-primary">Screenshot uploaden</p>
          <span className="text-xs text-text-secondary">{totaalFotos}/20 foto&apos;s</span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            if (e.target.files && e.target.files.length > 0) {
              onFotoToevoegen(e.target.files);
              e.target.value = "";
            }
          }}
        />
        <button
          type="button"
          onClick={onFotoKnopKlik}
          disabled={totaalFotos >= 20}
          className={`btn-secondary w-full flex items-center justify-center gap-2 ${totaalFotos >= 20 ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <span>📸</span>
          Screenshot uploaden
        </button>
        {fotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            {fotos.map((foto, i) => (
              <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                <img src={foto.preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onFotoVerwijderen(i)}
                  className="absolute top-1 right-1 w-5 h-5 bg-danger text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
