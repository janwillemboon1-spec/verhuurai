import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function AdminReviewRemoverPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: rapporten } = await admin
    .from("review_remover_rapporten")
    .select("id, naam, email, sterren, verdict, aangemaakt_op, email_verzonden")
    .order("aangemaakt_op", { ascending: false })
    .limit(200);

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-3xl text-primary">Review Remover — Admin</h1>
          <Link href="/cockpit/hostboni-admin" className="btn-secondary text-sm">← Cockpit</Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Totaal", aantal: rapporten?.length ?? 0, kleur: "text-primary" },
            { label: "Hoge kans", aantal: rapporten?.filter((r) => r.verdict === "hoog").length ?? 0, kleur: "text-success" },
            { label: "Gemiddelde kans", aantal: rapporten?.filter((r) => r.verdict === "gemiddeld").length ?? 0, kleur: "text-warning" },
            { label: "Lage kans", aantal: rapporten?.filter((r) => r.verdict === "laag").length ?? 0, kleur: "text-danger" },
          ].map(({ label, aantal, kleur }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-3xl font-bold ${kleur}`}>{aantal}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Alle rapporten ({rapporten?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Email", "Sterren", "Verdict", "E-mail verstuurd", "Datum", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!rapporten || rapporten.length === 0) && (
                  <tr><td colSpan={7} className="px-5 py-4 text-sm text-text-secondary">Nog geen rapporten.</td></tr>
                )}
                {rapporten?.map((r) => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary">{r.naam}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{r.email}</td>
                    <td className="px-4 py-3 text-text-secondary">{r.sterren}★</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.verdict === "hoog" ? "bg-success/10 text-success" :
                        r.verdict === "gemiddeld" ? "bg-warning/10 text-warning" :
                        "bg-danger/10 text-danger"
                      }`}>
                        {r.verdict}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{r.email_verzonden ? "✅" : "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/review-remover/${r.id}`} className="text-accent text-sm font-semibold hover:underline">
                        Bekijk →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
