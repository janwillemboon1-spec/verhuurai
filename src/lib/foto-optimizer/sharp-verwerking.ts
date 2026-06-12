import sharp from "sharp";

export async function verwerkMetSharp(inputBuffer: Buffer): Promise<Buffer> {
  return sharp(inputBuffer)
    .rotate()                                          // EXIF auto-orient
    .resize({ width: 1536, height: 1536, fit: "inside" }) // max 1536px, behoud ratio
    .normalize()                                       // auto-levels
    .modulate({ saturation: 1.1, brightness: 1.02 })  // kleur- en helderheidsboost
    .sharpen({ sigma: 1.2 })                           // scherpte
    .jpeg({ quality: 92, progressive: true })
    .toBuffer();
}
