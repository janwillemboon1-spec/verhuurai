import sharp from "sharp";

export interface SharpResultaat {
  buffer: Buffer;
  isLandscape: boolean;
}

export async function verwerkMetSharp(inputBuffer: Buffer): Promise<SharpResultaat> {
  const buffer = await sharp(inputBuffer)
    .rotate()
    .resize({ width: 2048, height: 2048, fit: "inside" })
    .normalize()
    .sharpen({ sigma: 1.0 })
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();

  const meta = await sharp(buffer).metadata();
  const isLandscape = (meta.width ?? 1) >= (meta.height ?? 1);

  return { buffer, isLandscape };
}

// Corrigeert globale kleurverschuiving tussen origineel en AI-bewerkt resultaat.
// Berekent het gemiddelde kanaalverschil en past 60% correctie toe zodat
// de toon van het origineel grotendeels bewaard blijft.
export async function corrigeerKleur(
  origineelBuffer: Buffer,
  bewerktBuffer: Buffer
): Promise<Buffer> {
  const [origStats, bewerktStats] = await Promise.all([
    sharp(origineelBuffer).stats(),
    sharp(bewerktBuffer).stats(),
  ]);

  // Gemiddelde per kanaal (R, G, B)
  const origR = origStats.channels[0].mean;
  const origG = origStats.channels[1].mean;
  const origB = origStats.channels[2].mean;
  const bewR = bewerktStats.channels[0].mean;
  const bewG = bewerktStats.channels[1].mean;
  const bewB = bewerktStats.channels[2].mean;

  // Corrigeer 60% van de verschuiving terug naar het origineel
  const blend = 0.6;
  const corrR = bewR > 0 ? (origR / bewR - 1) * blend + 1 : 1;
  const corrG = bewG > 0 ? (origG / bewG - 1) * blend + 1 : 1;
  const corrB = bewB > 0 ? (origB / bewB - 1) * blend + 1 : 1;

  // Geen correctie als het verschil te groot is (dan is de AI bewust afgeweken)
  const maxAfwijking = 0.3;
  if (
    Math.abs(corrR - 1) > maxAfwijking ||
    Math.abs(corrG - 1) > maxAfwijking ||
    Math.abs(corrB - 1) > maxAfwijking
  ) {
    return bewerktBuffer;
  }

  // Kleurcorrectie via recomb-matrix (per-kanaal vermenigvuldiging)
  return sharp(bewerktBuffer)
    .recomb([
      [corrR, 0, 0],
      [0, corrG, 0],
      [0, 0, corrB],
    ])
    .png()
    .toBuffer();
}
