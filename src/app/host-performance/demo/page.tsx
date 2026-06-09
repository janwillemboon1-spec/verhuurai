import { BoniAvatar } from "@/components/BoniAvatar";
import { CopyButton } from "@/components/CopyButton";
import Link from "next/link";

const DEMO = {
  rapportTitel: "Host Performance Audit",
  listingNaam: "Casa Louise · Alicante",
  hostNaam: "Peter",
  totaalAantalReviews: 23,
  sentiment: { positief: 78, neutraal: 13, negatief: 9 },
  samenvatting:
    "Peter, Casa Louise scoort goed bij gasten. 78% van de reviews is positief — de locatie en het privézwembad zijn duidelijke troefkaarten. Er zijn twee terugkerende klachten die directe aandacht verdienen: de airconditioner in de slaapkamer en de wifi-snelheid. Pak die aan en je bent klaar voor een 9+ gemiddelde.",
  terugkerendeComplimenten: [
    "Prachtige locatie — op loopafstand van het strand (12 van 23 reviews)",
    "Privézwembad als groot pluspunt, vooral voor gezinnen",
    "Schone en verzorgde woning bij aankomst",
    "Snelle en vriendelijke communicatie van de host",
    "Mooi uitzicht vanaf het terras",
  ],
  terugkerendeKlachten: [
    "Airconditioner in de slaapkamer maakt veel lawaai 's nachts (4 reviews)",
    "Wifi-snelheid tegenvallend voor thuiswerkers (3 reviews)",
    "Keuken mist een paar basisvoorzieningen (koffiezetapparaat, scherpe messen)",
  ],
  rodeVlaggen: [],
  verbeterpunten: [
    "Laat de airconditioner nakijken of vervangen — dit is de meest genoemde klacht en vermijdbaar",
    "Upgrade de wifi naar minimaal 100 Mbps — thuiswerkers zijn een groeiende doelgroep",
    "Voeg een Nespresso-apparaat en een goed messenset toe aan de keuken (investering < €100)",
    "Vermeld het geluid van de airco proactief in 'Andere info' zodat gasten niet verrast zijn",
  ],
  voorbeeldReacties: [
    {
      origineelReview:
        "Prachtig huis en geweldige locatie! Alleen de airco in de slaapkamer was erg luidruchtig waardoor we slecht sliepen. Jammer.",
      aanbevolenReactie:
        "Dank je wel voor je eerlijke review! Het spijt me te horen dat de airco je nachtrust heeft verstoord — dat is zeker niet de bedoeling. We hebben een technicus ingepland om dit te laten nakijken. Fijn dat de locatie en het huis verder in de smaak vielen, en hopelijk mogen we je een volgende keer weer verwelkomen! 🙏",
    },
    {
      origineelReview:
        "Mooie villa, maar wifi werkte slecht. Als je van plan bent om te werken, pas op.",
      aanbevolenReactie:
        "Bedankt voor je feedback! Je hebt gelijk — de wifi was niet op het niveau dat we willen bieden voor gasten die ook willen werken. We hebben inmiddels een sneller pakket besteld en passen de omschrijving aan zodat toekomstige gasten goed geïnformeerd zijn. Fijn dat je er verder van genoten hebt!",
    },
  ],
  herschrevenVersie:
    "Reageer altijd binnen 24 uur op een review — positief én negatief.\n\nBij positieve reviews: bedank kort en persoonlijk. Noem iets specifieks uit hun review.\nBij kritische reviews: erken het punt, bied geen excuses maar een oplossing, en sluit positief af.\n\nVermijd: in de verdediging schieten, lange uitleg geven, of de schuld bij de gast leggen.\n\nGouden formule voor negatieve reviews:\n1. Bedank voor de eerlijkheid\n2. Erken het punt (ook al ben je het er niet mee eens)\n3. Noem wat je hebt aangepast of gaat aanpassen\n4. Sluit warm af",
  afsluiting:
    "Casa Louise heeft een sterke basis, Peter. De airco en wifi zijn de twee punten die je vandaag nog kunt aanpakken — klein effort, groot verschil voor je score. Je doet het goed! 🏡✨",
};

export default function ReviewMonitorDemoPage() {
  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Demo banner */}
        <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-primary">
            🎭 Dit is een voorbeeldrapport van de Host Performance Audit — voor illustratiedoeleinden
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Een echt rapport wordt automatisch gegenereerd op basis van jouw eigen reviews.
          </p>
        </div>

        {/* Header */}
        <div className="card p-6 space-y-3">
          <div className="flex items-center gap-3">
            <BoniAvatar size={60} />
            <div>
              <h1 className="font-display text-xl text-primary">{DEMO.rapportTitel}</h1>
              <p className="text-sm text-text-secondary">{DEMO.listingNaam} · {DEMO.totaalAantalReviews} reviews geanalyseerd</p>
            </div>
          </div>

          {/* Sentiment */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Positief", waarde: DEMO.sentiment.positief, kleur: "text-success bg-success/10" },
              { label: "Neutraal", waarde: DEMO.sentiment.neutraal, kleur: "text-warning bg-warning/10" },
              { label: "Negatief", waarde: DEMO.sentiment.negatief, kleur: "text-danger bg-danger/10" },
            ].map(({ label, waarde, kleur }) => (
              <div key={label} className={`rounded-xl p-3 text-center ${kleur}`}>
                <p className="text-2xl font-bold">{waarde}%</p>
                <p className="text-xs font-semibold">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Samenvatting */}
        <div className="card p-6 flex gap-4">
          <BoniAvatar size={50} className="flex-shrink-0" />
          <p className="italic text-primary leading-relaxed">{DEMO.samenvatting}</p>
        </div>

        {/* Complimenten */}
        <div className="card p-6 space-y-3">
          <h2 className="font-display text-xl text-success">✅ Wat gasten waarderen</h2>
          <ul className="space-y-2">
            {DEMO.terugkerendeComplimenten.map((punt, i) => (
              <li key={i} className="flex gap-2 text-sm text-primary bg-success/5 rounded-xl p-3">
                <span className="text-success shrink-0">•</span>{punt}
              </li>
            ))}
          </ul>
        </div>

        {/* Klachten */}
        <div className="card p-6 space-y-3">
          <h2 className="font-display text-xl text-warning">⚠️ Terugkerende klachten</h2>
          <ul className="space-y-2">
            {DEMO.terugkerendeKlachten.map((punt, i) => (
              <li key={i} className="flex gap-2 text-sm text-primary bg-warning/5 rounded-xl p-3">
                <span className="text-warning shrink-0">•</span>{punt}
              </li>
            ))}
          </ul>
        </div>

        {/* Verbeterpunten */}
        <div className="card p-6 space-y-3">
          <h2 className="font-display text-xl text-primary">🎯 Verbeterpunten</h2>
          <ul className="space-y-2">
            {DEMO.verbeterpunten.map((punt, i) => (
              <li key={i} className="flex gap-2 text-sm text-primary bg-primary/5 rounded-xl p-3">
                <span className="font-bold text-accent shrink-0">{i + 1}.</span>{punt}
              </li>
            ))}
          </ul>
        </div>

        {/* Voorbeeldreacties */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-xl text-primary">💬 Voorbeeldreacties op reviews</h2>
          {DEMO.voorbeeldReacties.map((r, i) => (
            <div key={i} className="bg-surface rounded-xl p-4 border border-border space-y-3">
              <p className="text-xs text-text-secondary italic bg-border/30 rounded-lg p-3">
                "{r.origineelReview}"
              </p>
              <p className="text-sm text-primary leading-relaxed whitespace-pre-line">
                {r.aanbevolenReactie}
              </p>
              <CopyButton tekst={r.aanbevolenReactie} />
            </div>
          ))}
        </div>

        {/* Reactiestrategie */}
        <div className="card p-6 space-y-3">
          <h2 className="font-display text-xl text-primary">📖 Jouw reactiestrategie</h2>
          <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
            {DEMO.herschrevenVersie}
          </p>
          <CopyButton tekst={DEMO.herschrevenVersie} />
        </div>

        {/* Afsluiting */}
        <div className="card p-6 flex gap-4">
          <BoniAvatar size={50} className="flex-shrink-0" />
          <p className="text-text-secondary leading-relaxed italic">{DEMO.afsluiting}</p>
        </div>

        {/* CTA */}
        <div className="card p-8 bg-primary border-0 text-center space-y-4">
          <h2 className="font-display text-2xl text-white">
            Wil je dit voor jouw eigen woning?
          </h2>
          <p className="text-white/70">
            Boni analyseert al jouw reviews en levert binnen enkele minuten een volledig rapport — voor €7,99.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/host-performance/aanmelden?type=eenmalig" className="btn-primary text-center">
              Rapport aanvragen — €7,99 →
            </Link>
            <Link href="/host-performance" className="btn-secondary text-center">
              Meer info
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
