import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function TitelanalysePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const { data: rapporten } = await admin
    .from("gratis_rapporten")
    .select("id, naam, email, airbnb_url, titel, aangemaakt_op")
    .order("aangemaakt_op", { ascending: false });

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-primary">Titelanalyse</h1>
            <p className="text-sm text-text-secondary">{rapporten?.length ?? 0} analyses totaal</p>
          </div>
          <Link href="/cockpit/hostboni-admin" className="btn-secondary text-sm">← Cockpit</Link>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Email", "Titel", "Airbnb URL", "Datum"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!rapporten || rapporten.length === 0) && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-sm text-text-secondary text-center">Nog geen analyses.</td>
                  </tr>
                )}
                {rapporten?.map(r => (
                  <tr key={r.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary whitespace-nowrap">{(r as any).naam || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{(r as any).email || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary max-w-[200px] truncate">{(r as any).titel || "—"}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">
                      {(r as any).airbnb_url
                        ? <a href={(r as any).airbnb_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline truncate block max-w-[160px]">
                            {(r as any).airbnb_url.replace(/^https?:\/\/(www\.)?/, "")}
                          </a>
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(r.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
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
