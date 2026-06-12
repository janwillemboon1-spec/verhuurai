import OpenAI, { toFile } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function bewerkMetOpenAI(
  imageBuffer: Buffer,
  editPrompt: string
): Promise<Buffer> {
  const imageFile = await toFile(imageBuffer, "photo.jpg", { type: "image/jpeg" });

  const response = await openai.images.edit({
    model: "gpt-image-1",
    image: imageFile,
    prompt: editPrompt,
    n: 1,
    size: "1024x1024",
  });

  const item = response.data?.[0];

  // gpt-image-1 returns base64 by default
  if (item?.b64_json) {
    return Buffer.from(item.b64_json, "base64");
  }

  if (item?.url) {
    const res = await fetch(item.url);
    return Buffer.from(await res.arrayBuffer());
  }

  throw new Error("OpenAI gaf geen afbeelding terug");
}
