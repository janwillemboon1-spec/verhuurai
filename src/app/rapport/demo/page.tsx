"use client";

import { BoniAvatar } from "@/components/BoniAvatar";
import { ScoreCircle, VeldScore } from "@/components/ScoreCircle";
import { CopyButton } from "@/components/CopyButton";
import Link from "next/link";

const DEMO_RAPPORT = {
  hostNaam: "Jan Willem",
  datum: "2 juni 2026",
  openingszin:
    "Hey Jan Willem! Ik heb jouw advertentie grondig bekeken en ik heb goed nieuws én een paar stevige verbeterpunten voor je. Laten we er samen induiken — want met een paar aanpassingen haal jij écht meer uit jouw woning.",
  totaalscore: 64,
  totaal_samenvatting:
    "Je advertentie heeft een solide basis, maar laat op meerdere punten kansen liggen. De titel mist structuur en concrete kenmerken, de beschrijving is te kort en de buurtinformatie is vaag. Met de verbeteringen die ik hieronder geef, kun je je score naar een 8 tillen.",
  top3_sterkste_punten: [
    "Sterke locatie dicht bij het centrum — dit is je grootste troef",
    "Gastrecensies zijn overwegend positief over netheid en communicatie",
    "Huisregels zijn duidelijk en professioneel opgesteld",
  ],
  top3_prioriteiten: [
    "Titel mist de verplichte structuur en concrete kenmerken — direct aanpassen",
    "Beschrijving is te kort (onder 400 tekens) en mist een sterke haak",
    "Buurtinformatie is vaag — voeg concrete afstanden toe",
  ],
  velden: {
    titel: {
      score: 4,
      analyse:
        "Je huidige titel 'Gezellig appartement in Amsterdam centrum' scoort laag. 'Gezellig' is een bijvoeglijk naamwoord (verboden), 'appartement' is het accommodatietype dat Airbnb al automatisch toont, en de verplichte lay-out met scheidingstekens ontbreekt volledig.",
      verbeterpunten: [
        "Verwijder 'gezellig' — dit is een bijvoeglijk naamwoord dat niets zegt",
        "Verwijder 'appartement' — Airbnb toont dit automatisch",
        "Gebruik de lay-out: [kenmerk] | [kenmerk] | [kenmerk] | [X] min van [bezienswaardigheid]",
        "Voeg een concrete afstand toe naar een bekende bezienswaardigheid",
      ],
      herschreven_versies: [
        {
          versie: "Dakterras | Gratis wifi | 5 min van Rijksmuseum",
          uitleg: "Concrete USPs (dakterras, wifi), geen bijv.naamwoorden, exacte afstand. 46 tekens.",
        },
        {
          versie: "Dakterras • Parkeren • 5 min van het Centrum",
          uitleg: "Variant met bullet als scheiding. Parkeren is schaars in Amsterdam — sterke USP. 46 tekens.",
        },
        {
          versie: "Dakterras | Werkplek | 8 min van Centraal Station",
          uitleg: "Gericht op zakenreizigers. Werkplek + station als combinatie converteert sterk. 50 tekens.",
        },
      ],
    },
    beschrijving: {
      score: 5,
      analyse:
        "Je beschrijving telt 280 tekens — dat is 120 tekens te weinig. De haak ('Welkom in ons appartement') is verboden én begint met het woord 'Welkom'. Er ontbreekt een ervaringsgerichte opening, een duidelijke doelgroep en een locatievoordeel.",
      verbeterpunten: [
        "Verwijder het woord 'Welkom' — dit is expliciet verboden",
        "Begin met een ervaringsgerichte haak die nieuwsgierigheid wekt",
        "Schrijf minimaal 400 tekens — je laat nu 120 tekens onbenut",
        "Voeg een locatievoordeel toe",
      ],
      herschreven_versie:
        "Ontwaak boven de daken van Amsterdam en stap vijf minuten later de Museumbuurt in. Dit loft-appartement is ideaal voor koppels en zakenreizigers die rust én centrumligging combineren. Geniet van het dakterras bij zonsondergang, werk aan de ruime bureauhoek met glasvezel-wifi, en stap na een dag Amsterdam zo je bed in. Vrije parkeerplaats op de stoep — goud waard in deze buurt.",
      herschreven_uitleg:
        "460 tekens, sterke ervaringshaak, doelgroep duidelijk (koppels/zakenreizigers), 3 voorzieningen, 1 locatievoordeel, afsluiting met een praktisch voordeel. Geen 'Welkom'.",
    },
    accommodatie: {
      score: 6,
      analyse:
        "De accommodatiebeschrijving geeft een aardig beeld maar mist specifieke details. Je schrijft 'slaapkamer met groot bed' — maar is het een queensize of kingsize? De badkamer wordt niet apart beschreven en de keuken krijgt slechts één zin.",
      verbeterpunten: [
        "Specificeer het type bed (queensize/kingsize)",
        "Beschrijf de badkamer apart: douche, ligbad, toilet apart?",
        "Geef de keuken meer aandacht: inductie, vaatwasser, koffiezetapparaat?",
        "Voeg de buitenruimte (dakterras) prominenter toe als eerste punt",
      ],
      herschreven_versie:
        "✦ Highlights\n• Dakterras met uitzicht over de stad\n• Queensize bed met hotelbeddengoed\n• Volledig uitgeruste keuken met inductie en Nespresso\n• Glasvezel wifi (500 Mbps)\n• Gratis parkeerplaats op straat\n\nWoonkamer — Lichte open ruimte met vaste bureauhoek, smart TV en comfortabele zithoek voor twee personen.\n\nSlaapkamer — Rustgevende kamer met verduisterende gordijnen, queensize bed (160x200) en ingebouwde kast.\n\nBadkamer — Inloopdouche, apart toilet, föhn aanwezig.\n\nKeuken — Open keuken met inductiekookplaat, vaatwasser, Nespresso-apparaat en alle basisbenodigdheden.\n\nDakterras — Privédakterras op het zuiden, bereikbaar vanuit de woonkamer. Buitenmeubilair aanwezig.",
    },
    toegang: {
      score: 7,
      analyse:
        "Je toegangsbeschrijving is helder maar bevat check-in instructies die hier niet thuishoren. De informatie over de sleutelkluis hoort in de check-in instructies, niet in dit veld.",
      verbeterpunten: [
        "Verwijder de instructies over de sleutelkluis — dat hoort in check-in instructies",
        "Maak duidelijk of het een volledig privéwoning is",
        "Voeg toe of er een buitenruimte is en of die privé is",
      ],
      herschreven_versie:
        "• Volledig privéappartement — geen gedeelde ruimtes met andere gasten of host\n• Privédakterras exclusief voor gasten\n• Gratis parkeerplaats op straat (niet gereserveerd, doorgaans beschikbaar)\n• Fietsenstalling in de gemeenschappelijke hal (gedeeld met overige bewoners)\n• Lift aanwezig — 3e verdieping",
    },
    interactie: {
      score: 8,
      analyse:
        "Goed! Je communicatiebeschrijving is duidelijk en professioneel. Je maakt duidelijk dat je beschikbaar bent maar de gast de ruimte geeft. Kleine verbetering: specificeer via welk kanaal je het snelst bereikbaar bent.",
      verbeterpunten: [
        "Vermeld expliciet dat je bereikbaar bent via de Airbnb-chat én telefoon",
      ],
      herschreven_versie:
        "Ik sta tijdens je verblijf altijd voor je klaar, maar de mate van contact bepaal je zelf. Ben je liever ongestoord? Dan hoor je niets van mij. Heb je een vraag of loopt er iets niet? Stuur me een bericht via de Airbnb-chat — ik reageer doorgaans binnen 30 minuten. Voor spoed ben ik ook telefonisch bereikbaar.",
    },
    andere_info: {
      score: 5,
      analyse:
        "Je 'Andere belangrijke informatie' is vrijwel leeg. Dit is een kritiek veld — hier voorkom je slechte reviews. Bijkomende kosten, beperkingen en bijzonderheden van de woning ontbreken volledig.",
      verbeterpunten: [
        "Vermeld de schoonmaakkosten expliciet",
        "Geef aan of het dakterras ook 's nachts toegankelijk is",
        "Vermeld of er geluidsoverlast kan zijn (drukke straat?)",
        "Geef aan of de parkeerplaats altijd beschikbaar is of niet gegarandeerd",
      ],
      herschreven_versie:
        "• Schoonmaakkosten: €45 (eenmalig bij vertrek)\n• Dakterras: toegankelijk tot 23:00 uur\n• De woning ligt aan een drukke winkelstraat — verwacht overdag stadsgeluid\n• Parkeerplaats op straat: doorgaans beschikbaar, niet gereserveerd\n• Geen lift naar dakterras — 1 trap van 12 treden\n• Wifi: glasvezel 500 Mbps (getest)",
    },
    voorzieningen: {
      score: 6,
      analyse:
        "Je voorzieningen zijn redelijk compleet maar missen een aantal belangrijke items die het Airbnb-algoritme positief beïnvloeden. De rookmelder en koolmonoxidemelder ontbreken — dit zijn kritieke veiligheidsitems.",
      ontbrekende_voorzieningen: [
        "🚨 Rookmelder — kritiek voor algoritme-ranking",
        "🚨 Koolmonoxidemelder — kritiek voor algoritme-ranking",
        "EHBO-kit",
        "Brandblusser",
        "Föhn (al aanwezig maar niet aangevinkt?)",
      ],
      aanbevelingen: [
        "Schaf direct een rookmelder én koolmonoxidemelder aan — dit verhoogt je ranking aantoonbaar",
        "Voeg EHBO-kit toe (€15 bij Bol.com) — simpele toevoeging, groot effect",
        "Controleer of de föhn al aanwezig is en vink hem aan",
      ],
    },
    buurt: {
      score: 4,
      analyse:
        "Je buurtbeschrijving is vaag en generiek. 'Vlakbij het centrum' en 'veel leuke restaurants' zeggen niets — noem namen en concrete afstanden in minuten. Gasten boeken op basis van specificiteit.",
      verbeterpunten: [
        "Vervang 'vlakbij' door exacte afstanden in minuten lopen",
        "Noem specifieke restaurants, cafés en bezienswaardigheden bij naam",
        "Voeg de supermarkt toe — dit wordt meer gewaardeerd dan je denkt",
        "Vermeld de afstand tot het station",
      ],
      herschreven_versie:
        "De woning ligt in de Museumbuurt — een van de mooiste plekken in Amsterdam.\n\n📍 Bezienswaardigheden\n• Rijksmuseum — 5 min lopen\n• Van Gogh Museum — 6 min lopen\n• Vondelpark — 4 min lopen\n\n🍽️ Eten & drinken\n• Bar Botanique — 3 min (top koffie en lunch)\n• Restaurant Beulings — 7 min (Nederlands/Frans)\n• Albert Heijn supermarkt — 2 min\n\n🚊 Vervoer\n• Tram 2/12 (Museumplein) — 2 min lopen\n• Amsterdam Centraal — 15 min met tram\n• Schiphol Airport — 20 min met trein",
    },
    vervoer: {
      score: 7,
      analyse:
        "Goede vervoersbeschrijving met OV en auto. Kleine aanvulling: vermeld ook de mogelijkheid per fiets — Amsterdam is bij uitstek een fietsstad en gasten vragen hier vaak naar.",
      verbeterpunten: [
        "Voeg fietsverhuur toe als optie (OV-fiets bij station, Swapfiets)",
        "Specificeer de parkeersituatie duidelijker — is het betaald parkeren?",
      ],
      herschreven_versie:
        "🚊 Openbaar vervoer\n• Tram 2/12 richting Centraal Station — 2 min lopen (iedere 5 min)\n• Amsterdam Centraal — 15 min met tram\n• Schiphol Airport — 20 min met trein via Centraal\n\n🚗 Met de auto\n• Gratis parkeren op straat (blauwe zone, geen vergunning nodig voor bezoekers)\n• Betaald parkeren garage Museumplein: €4/uur (5 min lopen)\n\n🚲 Per fiets\n• OV-fiets beschikbaar bij Museumplein tram-halte\n• Fietsstalling in de hal van het gebouw",
    },
    recensies: {
      score: 7,
      terugkerende_complimenten: [
        "Uitstekende locatie — vrijwel elke review noemt dit",
        "Schone en verzorgde woning",
        "Snelle en vriendelijke communicatie van de host",
        "Dakterras als groot pluspunt",
      ],
      terugkerende_klachten: [
        "Stadsgeluid overdag (2 reviews)",
        "Parkeren niet altijd mogelijk op de aangegeven plek (1 review)",
      ],
      rode_vlaggen: [],
      score_analyse:
        "Geen rode vlaggen. De klachten over geluid en parkeren zijn op te lossen door ze proactief te vermelden in 'Andere belangrijke informatie' — dan zijn gasten niet verrast en schrijven ze er geen review over.",
      host_reacties_analyse:
        "Je reageert professioneel en vriendelijk. Let op: in één reactie verdedig je je bij een klacht over geluid. Beter is om dit te erkennen en te bedanken.",
      voorbeeld_reacties: [
        {
          originele_review: "Mooie plek maar overdag wat lawaaiig door de straat.",
          aanbevolen_reactie:
            "Dank je wel voor je review! Je hebt helemaal gelijk — de Museumbuurt is overdag levendig. Ik heb dit inmiddels toegevoegd aan de omschrijving zodat toekomstige gasten goed weten wat ze kunnen verwachten. Fijn dat je er toch van genoten hebt! 🙏",
        },
      ],
      tips_meer_reviews: [
        "Stuur 24 uur na check-out een persoonlijk berichtje via Airbnb: 'Fijn dat je er was! Als je tevreden was, help je me enorm met een review.'",
        "Laat een klein handgeschreven welkomstkaartje achter — gasten onthouden het en reviewen vaker",
        "Reageer altijd op elke review (ook de positieve) — dat laat zien dat je een actieve host bent",
      ],
    },
    host_profiel: {
      score: 5,
      analyse:
        "Je hostprofiel is kort en zakelijk. Er ontbreekt een persoonlijk verhaal, je leeftijd, hobby's en wat jou drijft als host. Gasten boeken liever bij een mens dan bij een bedrijf.",
      verbeterpunten: [
        "Voeg een persoonlijk verhaal toe — wie ben jij?",
        "Vermeld je hobby's of interesses",
        "Leg uit waarom je host bent geworden",
        "Vul alle profielvelden volledig in (talen, werk, school)",
      ],
      herschreven_versie:
        "Hoi! Ik ben Jan Willem, 38 jaar en geboren en getogen Amsterdammer. Ik werk als property manager en deel mijn liefde voor deze stad graag met reizigers van over de hele wereld. In mijn vrije tijd fietst ik door de grachten, bezoek ik de lokale markten en ontdek ik nieuwe restaurants in de buurt.\n\nAl 6 jaar host ik via Airbnb en ik word er nog steeds blij van als gasten enthousiast zijn over Amsterdam. Mijn missie: zorgen dat jij je thuis voelt én de stad beleeft zoals een echte Amsterdammer dat doet. Vragen? Ik ben er altijd.",
    },
    huisregels: {
      score: 8,
      analyse:
        "Je huisregels zijn duidelijk en professioneel. De verplichte regel over het aantal personen is aanwezig. Er staan geen HOOFDLETTERS of dreigementen in. Kleine opmerking: één regel is iets te streng geformuleerd.",
      ontbrekende_regels: [],
      regels_verwijderen: [
        "'Schade wordt altijd verhaald' — dit schikt gasten af. Airbnb dekt dit al via AirCover.",
      ],
      toon_analyse:
        "Neutrale, zakelijke toon. Goed! Alleen de zin over schade klinkt dreigend en is overbodig.",
      herschreven_versie:
        "• Het is niet toegestaan om met meer personen te verblijven dan is bevestigd in de reservering\n• Roken is niet toegestaan in de woning (dakterras is rookvrij)\n• Huisdieren zijn niet toegestaan\n• Feesten of evenementen zijn niet toegestaan\n• Respecteer de buren — houd het rustig na 23:00\n• Vuilnis: restafval in de container aan de straatkant (ophaaldag: maandag)\n• Inchecktijd: vanaf 15:00 | Uitchecktijd: voor 11:00",
    },
    direct_boeken: {
      huidige_instelling: "Uit",
      aanbeveling: "Zet Direct Boeken aan",
      uitleg:
        "Met Direct Boeken krijg je significant meer boekingen. Het Airbnb-algoritme beloont hosts met Direct Boeken met een hogere positie in de zoekresultaten. Je kunt alsnog annuleren bij twijfel, maar de drempel voor gasten om te boeken is veel lager.",
    },
    annuleringsbeleid: {
      huidige_instelling: "Strikt",
      aanbeveling: "Overweeg 'Gematigd'",
      uitleg:
        "Een strikt annuleringsbeleid schrikt gasten af, zeker bij eerste boekingen. Met 'Gematigd' (gratis annulering tot 5 dagen voor aankomst) boek je gemiddeld 20-30% meer. Overweeg dit zeker in de laagseizoen-periodes.",
    },
  },
  actieplan: {
    vandaag: [
      "Pas de titel aan naar de juiste lay-out (max 30 minuten werk)",
      "Herschrijf de beschrijving tot minimaal 400 tekens",
      "Verwijder het woord 'Welkom' uit alle teksten",
    ],
    deze_week: [
      "Schaf rookmelder en koolmonoxidemelder aan",
      "Vul 'Andere belangrijke informatie' aan met bijkomende kosten en geluidswaarschuwing",
      "Zet Direct Boeken aan",
      "Update buurtbeschrijving met concrete afstanden",
    ],
    deze_maand: [
      "Herschrijf je hostprofiel met persoonlijk verhaal",
      "Overweeg annuleringsbeleid te wijzigen naar 'Gematigd'",
      "Stuur bestaande gasten een vriendelijk berichtje voor een review",
    ],
  },
  bonus_tips: [
    "Voeg seizoensgebonden tips toe aan je buurtbeschrijving — dit laat zien dat je een actieve host bent",
    "Upload minimaal 20 foto's inclusief alle ruimtes én de buurt — listings met 20+ foto's converteren aantoonbaar beter",
    "Reageer altijd op reviews binnen 24 uur — dit verhoogt je responsscore en daarmee je ranking",
  ],
  afsluiting:
    "Je hebt nu alles wat je nodig hebt om jouw advertentie naar het volgende niveau te tillen. Kleine aanpassingen, groot verschil — dat beloof ik je. Succes Jan Willem, en mocht je vragen hebben dan weet je me te vinden! 🏠✨",
};

function KopieerBlok({ tekst, label }: { tekst: string; label?: string }) {
  return (
    <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 mt-3">
      {label && <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">{label}</p>}
      <p className="text-sm text-primary whitespace-pre-line leading-relaxed">{tekst}</p>
      <div className="mt-3">
        <CopyButton tekst={tekst} />
      </div>
    </div>
  );
}

function VeldSectie({
  icoon,
  naam,
  score,
  analyse,
  verbeterpunten,
  children,
}: {
  icoon: string;
  naam: string;
  score: number;
  analyse: string;
  verbeterpunten?: string[];
  children?: React.ReactNode;
}) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h3 className="font-display text-lg font-bold text-primary flex items-center gap-2">
          <span>{icoon}</span> {naam}
        </h3>
        <VeldScore score={score} />
      </div>
      <p className="text-text-secondary text-sm leading-relaxed italic">{analyse}</p>
      {verbeterpunten && verbeterpunten.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {verbeterpunten.map((p, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
              <span className="text-accent mt-0.5 flex-shrink-0">→</span> {p}
            </li>
          ))}
        </ul>
      )}
      {children}
    </div>
  );
}

export default function DemoRapportPage() {
  const r = DEMO_RAPPORT;

  return (
    <div className="py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Demo banner */}
        <div className="bg-accent-gold/20 border border-accent-gold/40 rounded-xl p-4 text-center">
          <p className="text-sm font-semibold text-primary">
            🎭 Dit is een voorbeeldrapport — voor illustratiedoeleinden
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Een echt rapport wordt gegenereerd op basis van jouw eigen advertentiegegevens.
          </p>
        </div>

        {/* Header */}
        <div className="card p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <BoniAvatar size={72} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-display font-bold text-primary">🏠 VerhuurAI</span>
              </div>
              <p className="text-sm text-text-secondary">{r.hostNaam} · {r.datum}</p>
            </div>
          </div>
          <button className="btn-secondary text-sm flex items-center gap-2" disabled>
            📧 Stuur naar email (demo)
          </button>
        </div>

        {/* Openingszin */}
        <div className="card p-6 flex items-start gap-4">
          <BoniAvatar size={52} className="flex-shrink-0" />
          <p className="text-primary leading-relaxed italic">&ldquo;{r.openingszin}&rdquo;</p>
        </div>

        {/* Totaalscore */}
        <div className="card p-6 text-center space-y-4">
          <h2 className="font-display text-2xl font-bold text-primary">Totaalscore</h2>
          <div className="flex justify-center">
            <ScoreCircle score={r.totaalscore} size={160} label="van 100 punten" />
          </div>
          <p className="text-text-secondary max-w-lg mx-auto text-sm leading-relaxed">{r.totaal_samenvatting}</p>

          <div className="grid sm:grid-cols-2 gap-4 mt-2 text-left">
            <div className="bg-success/8 border border-success/20 rounded-xl p-4">
              <p className="font-semibold text-success text-sm mb-2">✅ Top 3 sterke punten</p>
              <ul className="space-y-1">
                {r.top3_sterkste_punten.map((p, i) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                    <span className="text-success flex-shrink-0">·</span> {p}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-warning/8 border border-warning/20 rounded-xl p-4">
              <p className="font-semibold text-warning text-sm mb-2">🔧 Top 3 prioriteiten</p>
              <ul className="space-y-1">
                {r.top3_prioriteiten.map((p, i) => (
                  <li key={i} className="text-sm text-text-secondary flex items-start gap-1.5">
                    <span className="text-warning flex-shrink-0">·</span> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Titel */}
        <VeldSectie icoon="📌" naam="Titel" score={r.velden.titel.score}
          analyse={r.velden.titel.analyse} verbeterpunten={r.velden.titel.verbeterpunten}>
          <div className="space-y-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Herschreven versies</p>
            {r.velden.titel.herschreven_versies.map((v, i) => (
              <div key={i} className="border border-border rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <p className="font-semibold text-primary">{v.versie}</p>
                  <CopyButton tekst={v.versie} className="flex-shrink-0" />
                </div>
                <p className="text-xs text-text-secondary">{v.uitleg}</p>
              </div>
            ))}
          </div>
        </VeldSectie>

        {/* Beschrijving */}
        <VeldSectie icoon="📝" naam="Advertentiebeschrijving" score={r.velden.beschrijving.score}
          analyse={r.velden.beschrijving.analyse} verbeterpunten={r.velden.beschrijving.verbeterpunten}>
          <KopieerBlok tekst={r.velden.beschrijving.herschreven_versie!} label="Herschreven versie" />
        </VeldSectie>

        {/* Accommodatie */}
        <VeldSectie icoon="🏠" naam="Accommodatie omschrijving" score={r.velden.accommodatie.score}
          analyse={r.velden.accommodatie.analyse} verbeterpunten={r.velden.accommodatie.verbeterpunten}>
          <KopieerBlok tekst={r.velden.accommodatie.herschreven_versie!} label="Herschreven versie" />
        </VeldSectie>

        {/* Toegang */}
        <VeldSectie icoon="🔑" naam="Toegang voor gasten" score={r.velden.toegang.score}
          analyse={r.velden.toegang.analyse} verbeterpunten={r.velden.toegang.verbeterpunten}>
          <KopieerBlok tekst={r.velden.toegang.herschreven_versie!} label="Herschreven versie" />
        </VeldSectie>

        {/* Interactie */}
        <VeldSectie icoon="💬" naam="Interactie met gasten" score={r.velden.interactie.score}
          analyse={r.velden.interactie.analyse} verbeterpunten={r.velden.interactie.verbeterpunten}>
          <KopieerBlok tekst={r.velden.interactie.herschreven_versie!} label="Herschreven versie" />
        </VeldSectie>

        {/* Andere info */}
        <VeldSectie icoon="ℹ️" naam="Andere belangrijke informatie" score={r.velden.andere_info.score}
          analyse={r.velden.andere_info.analyse} verbeterpunten={r.velden.andere_info.verbeterpunten}>
          <KopieerBlok tekst={r.velden.andere_info.herschreven_versie!} label="Herschreven versie" />
        </VeldSectie>

        {/* Voorzieningen */}
        <VeldSectie icoon="⚡" naam="Voorzieningen" score={r.velden.voorzieningen.score}
          analyse={r.velden.voorzieningen.analyse}>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Ontbrekende voorzieningen</p>
            {r.velden.voorzieningen.ontbrekende_voorzieningen?.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-danger bg-danger/5 border border-danger/15 rounded-lg px-3 py-2">
                {v}
              </div>
            ))}
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mt-3">Aanbevelingen</p>
            {r.velden.voorzieningen.aanbevelingen?.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-accent flex-shrink-0">→</span> {a}
              </div>
            ))}
          </div>
        </VeldSectie>

        {/* Buurt */}
        <VeldSectie icoon="📍" naam="Hoogtepunten buurt" score={r.velden.buurt.score}
          analyse={r.velden.buurt.analyse} verbeterpunten={r.velden.buurt.verbeterpunten}>
          <KopieerBlok tekst={r.velden.buurt.herschreven_versie!} label="Herschreven versie" />
        </VeldSectie>

        {/* Vervoer */}
        <VeldSectie icoon="🚌" naam="Vervoersmogelijkheden" score={r.velden.vervoer.score}
          analyse={r.velden.vervoer.analyse} verbeterpunten={r.velden.vervoer.verbeterpunten}>
          <KopieerBlok tekst={r.velden.vervoer.herschreven_versie!} label="Herschreven versie" />
        </VeldSectie>

        {/* Recensies */}
        <VeldSectie icoon="⭐" naam="Recensies" score={r.velden.recensies.score}
          analyse={r.velden.recensies.score_analyse}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-success/8 border border-success/15 rounded-xl p-3">
              <p className="text-xs font-semibold text-success mb-2">Terugkerende complimenten</p>
              {r.velden.recensies.terugkerende_complimenten?.map((c, i) => (
                <p key={i} className="text-xs text-text-secondary">· {c}</p>
              ))}
            </div>
            <div className="bg-warning/8 border border-warning/15 rounded-xl p-3">
              <p className="text-xs font-semibold text-warning mb-2">Terugkerende klachten</p>
              {r.velden.recensies.terugkerende_klachten?.map((c, i) => (
                <p key={i} className="text-xs text-text-secondary">· {c}</p>
              ))}
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-2">Voorbeeld host-reactie</p>
            {r.velden.recensies.voorbeeld_reacties?.map((vr, i) => (
              <div key={i} className="border border-border rounded-xl p-4 space-y-2">
                <p className="text-xs text-text-secondary italic">&ldquo;{vr.originele_review}&rdquo;</p>
                <KopieerBlok tekst={vr.aanbevolen_reactie} label="Aanbevolen reactie" />
              </div>
            ))}
          </div>
        </VeldSectie>

        {/* Host profiel */}
        <VeldSectie icoon="👤" naam="Host profiel" score={r.velden.host_profiel.score}
          analyse={r.velden.host_profiel.analyse} verbeterpunten={r.velden.host_profiel.verbeterpunten}>
          <KopieerBlok tekst={r.velden.host_profiel.herschreven_versie!} label="Herschreven profieltekst" />
        </VeldSectie>

        {/* Huisregels */}
        <VeldSectie icoon="📋" naam="Huisregels" score={r.velden.huisregels.score}
          analyse={r.velden.huisregels.toon_analyse!} verbeterpunten={r.velden.huisregels.regels_verwijderen}>
          <KopieerBlok tekst={r.velden.huisregels.herschreven_versie!} label="Herschreven huisregels" />
        </VeldSectie>

        {/* Direct boeken + annulering */}
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { icoon: "⚡", titel: "Direct boeken", veld: r.velden.direct_boeken },
            { icoon: "📅", titel: "Annuleringsbeleid", veld: r.velden.annuleringsbeleid },
          ].map(({ icoon, titel, veld }) => (
            <div key={titel} className="card p-5 space-y-2">
              <p className="font-semibold text-primary text-sm">{icoon} {titel}</p>
              <p className="text-xs text-text-secondary">Huidig: <span className="font-medium text-primary">{veld.huidige_instelling}</span></p>
              <p className="text-xs font-semibold text-accent">→ {veld.aanbeveling}</p>
              <p className="text-xs text-text-secondary leading-relaxed">{veld.uitleg}</p>
            </div>
          ))}
        </div>

        {/* Actieplan */}
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold text-primary mb-5">🗓️ Actieplan</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { label: "Vandaag", kleur: "border-danger/30 bg-danger/5", tekst: "text-danger", items: r.actieplan.vandaag },
              { label: "Deze week", kleur: "border-warning/30 bg-warning/5", tekst: "text-warning", items: r.actieplan.deze_week },
              { label: "Deze maand", kleur: "border-success/30 bg-success/5", tekst: "text-success", items: r.actieplan.deze_maand },
            ].map(({ label, kleur, tekst, items }) => (
              <div key={label} className={`border rounded-xl p-4 ${kleur}`}>
                <p className={`font-semibold text-sm mb-3 ${tekst}`}>{label}</p>
                <ul className="space-y-2">
                  {items.map((item, i) => (
                    <li key={i} className="text-xs text-text-secondary flex items-start gap-1.5">
                      <span className={`flex-shrink-0 ${tekst}`}>·</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bonus tips */}
        <div className="card p-6">
          <h2 className="font-display text-xl font-bold text-primary mb-4">🎁 Bonus tips van Boni</h2>
          <ul className="space-y-3">
            {r.bonus_tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                <span className="text-accent-gold font-bold flex-shrink-0">✦</span> {tip}
              </li>
            ))}
          </ul>
        </div>

        {/* Afsluiting */}
        <div className="card p-6 flex items-start gap-4">
          <BoniAvatar size={56} animate={true} className="flex-shrink-0" />
          <p className="text-primary leading-relaxed italic">&ldquo;{r.afsluiting}&rdquo;</p>
        </div>

        {/* CTA */}
        <div className="card p-8 bg-primary text-white text-center space-y-4">
          <h2 className="font-display text-2xl font-bold">Wil je je eigen advertentie laten analyseren?</h2>
          <p className="text-white/70 text-sm">Boni analyseert jouw echte advertentie en geeft gepersonaliseerd advies. Vanaf €9,40.</p>
          <Link href="/starten" className="btn-primary inline-flex mx-auto">
            Start mijn analyse →
          </Link>
        </div>

      </div>
    </div>
  );
}
