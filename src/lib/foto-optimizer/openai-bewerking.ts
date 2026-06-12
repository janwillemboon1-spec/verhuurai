import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function bewerkMetOpenAI(
  imageBuffer: Buffer,
  editPrompt: string,
  isLandscape: boolean = true
): Promise<Buffer> {
  const imageFile = await toFile(imageBuffer, "photo.jpg", { type: "image/jpeg" });

  // Airbnb-aanbevolen formaat: 3:2 landschap of 2:3 portret
  const size = isLandscape ? "1536x1024" : "1024x1536";

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt: editPrompt,
    n: 1,
    size,
  });

  const item = response.data?.[0];

  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item?.url) {
    const res = await fetch(item.url);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error("OpenAI gaf geen afbeelding terug");
}
