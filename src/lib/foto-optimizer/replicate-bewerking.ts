import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

// FLUX.1 Pro — commerciële licentie, hoogste kwaliteit, img2img
// prompt_strength 0.3 = 30% aanpassing, 70% van de originele foto behouden
const MODEL = "black-forest-labs/flux-1.1-pro";
const PROMPT_STRENGTH = 0.3;

export async function bewerkMetReplicate(
  imageBuffer: Buffer,
  prompt: string,
): Promise<Buffer> {
  const base64 = imageBuffer.toString("base64");
  const dataUri = `data:image/jpeg;base64,${base64}`;

  const output = await replicate.run(MODEL, {
    input: {
      prompt,
      image: dataUri,
      prompt_strength: PROMPT_STRENGTH,
      output_format: "jpg",
      output_quality: 95,
      safety_tolerance: 5,
    },
  }) as string | string[] | ReadableStream;

  // Output kan een URL-string of array van URLs zijn
  let url: string | null = null;
  if (typeof output === "string") {
    url = output;
  } else if (Array.isArray(output) && output.length > 0) {
    url = output[0] as string;
  }

  if (!url) throw new Error("Replicate gaf geen afbeelding terug");

  const response = await fetch(url);
  if (!response.ok) throw new Error("Download van Replicate resultaat mislukt");

  return Buffer.from(await response.arrayBuffer());
}
