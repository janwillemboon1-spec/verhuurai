import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildReviewRemoverEmailHtml } from "@/lib/review-remover-email";

export async function POST(request: Request) {
  try {
    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "id is verplicht" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: rapport, error } = await admin
      .from("review_remover_rapporten")
      .select("naam, email, verdict, onderbouwing, bezwaarbrief, stappenplan")
      .eq("id", id)
      .maybeSingle();

    if (error || !rapport) {
      return NextResponse.json({ error: "Rapport niet gevonden" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";
    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Boni van Host Boni <boni@verhuurai.nl>",
      to: rapport.email,
      subject: "Jouw Review Remover beoordeling is klaar! 🏠",
      html: buildReviewRemoverEmailHtml({
        naam: rapport.naam,
        verdict: rapport.verdict,
        onderbouwing: rapport.onderbouwing,
        bezwaarbrief: rapport.bezwaarbrief,
        stappenplan: rapport.stappenplan ?? [],
        baseUrl,
      }),
    });

    await admin.from("review_remover_rapporten").update({ email_verzonden: true }).eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Review Remover email fout:", error);
    return NextResponse.json({ error: "E-mail versturen mislukt" }, { status: 500 });
  }
}
