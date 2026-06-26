import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const abonnementId = searchParams.get("abonnement_id");

  if (!abonnementId) {
    return NextResponse.json({ error: "abonnement_id verplicht" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

    const { data: abo, error } = await admin
      .from("abonnementen")
      .select("id, user_id")
      .eq("id", abonnementId)
      .single();

    if (error || !abo) {
      return NextResponse.json({ error: "Abonnement niet gevonden" }, { status: 404 });
    }

    const { data: user } = await admin.auth.admin.getUserById(abo.user_id);
    if (!user?.user?.email) {
      return NextResponse.json({ error: "Gebruiker niet gevonden" }, { status: 404 });
    }

    const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: user.user.email,
      options: {
        redirectTo: `${baseUrl}/host-performance/rapport-genereren/${abonnementId}`,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Magic link genereren mislukt:", linkError);
      return NextResponse.json({ error: "Login link genereren mislukt" }, { status: 500 });
    }

    return NextResponse.json({ loginUrl: linkData.properties.action_link });
  } catch (err) {
    console.error("Login link fout:", err);
    return NextResponse.json({ error: "Er ging iets mis" }, { status: 500 });
  }
}
