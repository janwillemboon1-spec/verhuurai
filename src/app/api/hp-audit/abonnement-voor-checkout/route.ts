import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get("session_id");

  if (!sessionId) {
    return NextResponse.json({ error: "session_id verplicht" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("abonnementen")
      .select("id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ wachten: true }, { status: 202 });
    }

    return NextResponse.json({ abonnementId: data.id });
  } catch (err) {
    console.error("Abonnement opzoeken mislukt:", err);
    return NextResponse.json({ error: "Opzoeken mislukt" }, { status: 500 });
  }
}
