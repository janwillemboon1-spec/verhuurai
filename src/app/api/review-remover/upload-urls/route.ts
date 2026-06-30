import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "review-remover-bewijs";
const MAX_SCREENSHOTS = 5;

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

    const admin = createAdminClient();
    const sessieId = crypto.randomUUID();

    const uploadTokens = await Promise.all(
      screenshots.map(async (s: { volgnummer: number; type: string }) => {
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
