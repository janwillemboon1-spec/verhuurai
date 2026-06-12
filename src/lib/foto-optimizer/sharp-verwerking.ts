import sharp from "sharp";

export interface SharpResultaat {
  buffer: Buffer;
  isLandscape: boolean; // true = breed > hoog (3:2), false = hoog > breed
}

export async function verwerkMetSharp(inputBuffer: Buffer): Promise<SharpResultaat> {
  const buffer = await sharp(inputBuffer)
    .rotate()                                             // EXIF auto-orient
    .resize({ width: 2048, height: 2048, fit: "inside" }) // max 2048px, behoud ratio
    .normalize()                                          // auto-levels (belichting)
    .sharpen({ sigma: 1.0 })                              // lichte scherpte
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();

  // Afmetingen bepalen voor oriëntatie
  const meta = await sharp(buffer).metadata();
  const isLandscape = (meta.width ?? 1) >= (meta.height ?? 1);

  return { buffer, isLandscape };
}
