import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function AdminReviewRemoverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: rapport } = await admin
    .from("review_remover_rapporten")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!rapport) notFound();

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-2xl text-primary">{rapport.naam} — {rapport.email}</h1>
          <Link href="/admin/review-remover" className="btn-secondary text-sm">← Terug</Link>
        </div>

        <div className="card p-6 space-y-2">
          <p className="text-sm text-text-secondary">
            Sterren: <strong>{rapport.sterren}★</strong> · Taal: <strong>{rapport.taal}</strong> ·
            Verdict: <strong>{rapport.verdict}</strong> · E-mail verstuurd: <strong>{rapport.email_verzonden ? "Ja" : "Nee"}</strong>
          </p>
          <p className="text-xs text-text-secondary">
            {new Date(rapport.aangemaakt_op).toLocaleString("nl-NL")}
          </p>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg text-primary mb-2">Recensie-tekst</h2>
          <p className="text-text-secondary text-sm whitespace-pre-wrap">{rapport.review_tekst}</p>
        </div>

        {rapport.context && (
          <div className="card p-6">
            <h2 className="font-display text-lg text-primary mb-2">Context van de host</h2>
            <p className="text-text-secondary text-sm whitespace-pre-wrap">{rapport.context}</p>
          </div>
        )}

        {Array.isArray(rapport.screenshot_urls) && rapport.screenshot_urls.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display text-lg text-primary mb-3">Screenshots</h2>
            <div className="grid grid-cols-3 gap-3">
              {(rapport.screenshot_urls as string[]).map((url) => (
                <a key={url} href={url} target="_blank" rel="noopener noreferrer">
                  <img src={url} alt="" className="w-full aspect-square object-cover rounded-lg" />
                </a>
              ))}
            </div>
          </div>
        )}

        <div className="card p-6">
          <h2 className="font-display text-lg text-primary mb-2">Onderbouwing</h2>
          <p className="text-text-secondary text-sm">{rapport.onderbouwing}</p>
        </div>

        <div className="card p-6">
          <h2 className="font-display text-lg text-primary mb-2">Bezwaarbrief</h2>
          <p className="text-text-secondary text-sm whitespace-pre-wrap">{rapport.bezwaarbrief}</p>
        </div>

        {Array.isArray(rapport.stappenplan) && rapport.stappenplan.length > 0 && (
          <div className="card p-6">
            <h2 className="font-display text-lg text-primary mb-2">Stappenplan</h2>
            <ol className="text-text-secondary text-sm space-y-1 list-decimal list-inside">
              {(rapport.stappenplan as string[]).map((stap, i) => <li key={i}>{stap}</li>)}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
