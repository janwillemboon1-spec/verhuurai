import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { maakCommunityToken } from "@/lib/community-tokens";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Ongeldig e-mailadres" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: lid } = await admin
      .from("community_leden")
      .select("email, tag, verloopt_op")
      .eq("email", email.toLowerCase().trim())
      .maybeSingle();

    if (!lid) {
      return NextResponse.json({ ok: false });
    }

    if (lid.verloopt_op && new Date(lid.verloopt_op) < new Date()) {
      return NextResponse.json({ ok: false, verlopen: true });
    }

    const token = maakCommunityToken(email.toLowerCase().trim());
    return NextResponse.json({ ok: true, token, tag: lid.tag });
  } catch (error) {
    console.error("Community verifieer fout:", error);
    return NextResponse.json({ error: "Verificatie mislukt" }, { status: 500 });
  }
}
