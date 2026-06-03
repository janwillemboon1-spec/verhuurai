export interface Pakket {
  id: string;
  naam: string;
  advertenties: number;
  normaalPrijs: number;
  introPrijs: number;
  populair?: boolean;
}

export const PAKKETTEN: Pakket[] = [
  { id: "1x", naam: "1 advertentie", advertenties: 1, normaalPrijs: 19, introPrijs: 11.40 },
  { id: "3x", naam: "3 advertenties", advertenties: 3, normaalPrijs: 49, introPrijs: 29.40, populair: true },
  { id: "5x", naam: "5 advertenties", advertenties: 5, normaalPrijs: 79, introPrijs: 47.40 },
  { id: "10x", naam: "10 advertenties", advertenties: 10, normaalPrijs: 149, introPrijs: 89.40 },
];

export interface Sessie {
  id: string;
  email: string;
  naam: string;
  pakket: string;
  credits: number;
  gebruiktCredits: number;
  aangemaakt: string;
}

export interface AnalyseFormulier {
  // Stap 1: Basis
  hostNaam: string;
  rapportTaal: "nl" | "en";
  woningType: string;
  doelgroep: string[];
  doelgroepCustom?: string;
  land: string;
  stad: string;
  prijsPerNacht?: number;
  bezettingsgraad?: number;
  // Airbnb URL (voor automatisch reviews scrapen)
  airbnbUrl?: string;
  veelgenoemdeKenmerken?: string[];
  // Stap 2-13: Inhoud
  titel: string;
  beschrijving: string;
  accommodatie: string;
  toegang: string;
  interactie: string;
  andereInfo: string;
  voorzieningen: string;
  buurt: string;
  vervoer: string;
  recensies: string;
  hostProfiel: string;
  huisregels: string;
  // Stap 14: Extra
  sterkstePunt?: string;
  twijfels?: string;
  directBoeken?: "aan" | "uit" | "weet_niet";
  annuleringsbeleid?: string;
  // Foto's
  fotos?: File[];
}

export interface VeldRapport {
  score: number;
  analyse: string;
  verbeterpunten?: string[];
  herschrevenVersie?: string;
  herschrevenVersies?: Array<{ versie: string; uitleg: string }>;
  herschrevenUitleg?: string;
  ontbrekendeVoorzieningen?: string[];
  aanbevelingen?: string[];
  perFoto?: Array<{ fotoNummer: number; beoordeling: string; verbeterpunten: string[] }>;
  bestHoofdfoto?: string;
  ontbrekendeRuimtes?: string[];
  algemeneTips?: string[];
  terugkerendeComplimenten?: string[];
  terugkerendeKlachten?: string[];
  rodeVlaggen?: string[];
  scoreAnalyse?: string;
  hostReactiesAnalyse?: string;
  voorbeeldReacties?: Array<{ origineelReview: string; aanbevolenReactie: string }>;
  tipsMeerReviews?: string[];
  huidigeInstelling?: string;
  aanbeveling?: string;
  uitleg?: string;
  ontbrekendeRegels?: string[];
  regelVerwijderen?: string[];
  toonAnalyse?: string;
}

export interface BoniRapport {
  openingszin: string;
  totaalscore: number;
  totaalSamenvatting: string;
  top3SterkstePunten: string[];
  top3Prioriteiten: string[];
  velden: {
    titel: VeldRapport;
    beschrijving: VeldRapport;
    accommodatie: VeldRapport;
    toegang: VeldRapport;
    interactie: VeldRapport;
    andereInfo: VeldRapport;
    voorzieningen: VeldRapport;
    buurt: VeldRapport;
    vervoer: VeldRapport;
    fotos?: VeldRapport;
    recensies: VeldRapport;
    hostProfiel: VeldRapport;
    huisregels: VeldRapport;
    directBoeken: VeldRapport;
    annuleringsbeleid: VeldRapport;
  };
  actieplan: {
    vandaag: string[];
    dezeWeek: string[];
    dezeMaand: string[];
  };
  bonusTips: string[];
  afsluiting: string;
}

export function scoreKleur(score: number): string {
  if (score >= 7) return "text-success";
  if (score >= 5) return "text-warning";
  return "text-danger";
}

export function scoreBgKleur(score: number): string {
  if (score >= 7) return "bg-success/10 border-success/20";
  if (score >= 5) return "bg-warning/10 border-warning/20";
  return "bg-danger/10 border-danger/20";
}
