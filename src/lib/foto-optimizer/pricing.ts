// Marginale prijsschijven — elke schijf geldt alleen voor die foto's
const SCHIJVEN = [
  { van: 1,  tot: 5,  prijs: 1.49 },
  { van: 6,  tot: 10, prijs: 1.29 },
  { van: 11, tot: 20, prijs: 1.09 },
  { van: 21, tot: 30, prijs: 0.89 },
  { van: 31, tot: 50, prijs: 0.75 },
];

export const FOTO_MAX = 50;

export interface PrijsBerekening {
  totaal: number;       // afgerond op 2 decimalen
  gemiddeldPerFoto: number;
  schijfDetails: { label: string; aantal: number; prijs: number; subtotaal: number }[];
}

export function berekenPrijs(aantalFotos: number): PrijsBerekening {
  const n = Math.min(Math.max(1, aantalFotos), FOTO_MAX);
  let totaal = 0;
  const schijfDetails = [];

  for (const schijf of SCHIJVEN) {
    if (n < schijf.van) break;
    const aantalInSchijf = Math.min(n, schijf.tot) - schijf.van + 1;
    const subtotaal = aantalInSchijf * schijf.prijs;
    totaal += subtotaal;
    schijfDetails.push({
      label: schijf.van === schijf.tot
        ? `Foto ${schijf.van}`
        : `Foto ${schijf.van}–${schijf.tot}`,
      aantal: aantalInSchijf,
      prijs: schijf.prijs,
      subtotaal: Math.round(subtotaal * 100) / 100,
    });
  }

  return {
    totaal: Math.round(totaal * 100) / 100,
    gemiddeldPerFoto: Math.round((totaal / n) * 100) / 100,
    schijfDetails,
  };
}

// Prijs in centen voor Stripe
export function berekenPrijsInCenten(aantalFotos: number): number {
  return Math.round(berekenPrijs(aantalFotos).totaal * 100);
}
