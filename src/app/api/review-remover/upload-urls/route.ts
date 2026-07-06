import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";

const BUCKET = "review-remover-bewijs";
const MAX_SCREENSHOTS = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

function extFromType(type: string): string {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

export async function POST(request: Request) {
  try {
    const { screenshots } = await request.json();

    if (!Array.isArray(screenshots) || screenshots.length === 0) {
      return NextResponse.json({ error: "Geen screenshots opgegeven" }, { status: 400 });
    }
    if (screenshots.length > MAX_SCREENSHOTS) {
      return NextResponse.json({ error: `Maximaal ${MAX_SCREENSHOTS} screenshots toegestaan` }, { status: 400 });
    }

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(`review-remover-upload:${ip}`, 20)) {
      return NextResponse.json({ error: "Te veel uploadverzoeken. Probeer het later opnieuw." }, { status: 429 });
    }

    const admin = createAdminClient();
    const sessieId = crypto.randomUUID();

    const uploadTokens = await Promise.all(
      screenshots.map(async (s: { volgnummer: number; type: string }) => {
        if (
          typeof s.volgnummer !== "number" ||
          !Number.isInteger(s.volgnummer) ||
          s.volgnummer < 1 ||
          s.volgnummer > MAX_SCREENSHOTS
        ) {
          throw new Error(`Ongeldig volgnummer: ${s.volgnummer}`);
        }
        if (!ALLOWED_TYPES.includes(s.type)) {
          throw new Error(`Ongeldig bestandstype: ${s.type}`);
        }
        const pad = `${sessieId}/${s.volgnummer}.${extFromType(s.type)}`;
        const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(pad);
        if (error || !data) throw new Error("Upload URL genereren mislukt");
        return { volgnummer: s.volgnummer, pad, token: data.token };
      })
    );

    return NextResponse.json({ sessieId, uploadTokens });
  } catch (error) {
    console.error("Review Remover upload-urls fout:", error);
    return NextResponse.json({ error: "Er ging iets mis bij het voorbereiden van de upload" }, { status: 500 });
  }
}
