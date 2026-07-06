import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = "info@bnbassistant.com";
const MAX_VOORBEELDEN = 15;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "id verplicht" }, { status: 400 });

  const admin = createAdminClient();

  const { data: foto } = await admin
    .from("foto_bewerkingen")
    .select("toon_als_voorbeeld")
    .eq("id", id)
    .single();

  if (!foto) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const nieuwWaarde = !foto.toon_als_voorbeeld;

  if (nieuwWaarde) {
    const { count } = await admin
      .from("foto_bewerkingen")
      .select("id", { count: "exact", head: true })
      .eq("toon_als_voorbeeld", true);

    if ((count ?? 0) >= MAX_VOORBEELDEN) {
      return NextResponse.json(
        { error: `Maximum van ${MAX_VOORBEELDEN} voorbeelden bereikt. Schakel eerst een andere foto uit.` },
        { status: 400 }
      );
    }
  }

  await admin
    .from("foto_bewerkingen")
    .update({ toon_als_voorbeeld: nieuwWaarde })
    .eq("id", id);

  return NextResponse.json({ toon_als_voorbeeld: nieuwWaarde });
}
