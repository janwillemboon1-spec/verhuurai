import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function AdminFotoOptimizerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  const [{ data: sessies }, { data: feedbackLijst }] = await Promise.all([
    admin
      .from("foto_sessies")
      .select("id, naam, email, status, aantal_fotos, totaal_prijs, aangemaakt_op, klaar_op")
      .order("aangemaakt_op", { ascending: false })
      .limit(100),
    admin
      .from("foto_bewerkingen")
      .select("id, sessie_id, volgnummer, ruimte, feedback_type, feedback_toelichting, feedback_op, origineel_pad, bewerkt_pad")
      .eq("feedback_type", "fout_van_boni")
      .not("feedback_toelichting", "is", null)
      .order("feedback_op", { ascending: false })
      .limit(50),
  ]);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-3xl text-primary">Foto Optimizer — Admin</h1>
          <div className="flex gap-3">
            <Link href="/admin" className="btn-secondary text-sm">← Admin</Link>
          </div>
        </div>

        {/* Statistieken */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Sessies totaal", aantal: sessies?.length ?? 0, kleur: "text-primary" },
            { label: "Klaar", aantal: sessies?.filter(s => s.status === "klaar").length ?? 0, kleur: "text-success" },
            { label: "Bezig", aantal: sessies?.filter(s => s.status === "verwerking").length ?? 0, kleur: "text-warning" },
            { label: "Fout van Boni", aantal: feedbackLijst?.length ?? 0, kleur: "text-danger" },
          ].map(({ label, aantal, kleur }) => (
            <div key={label} className="card p-4 text-center">
              <p className={`text-3xl font-bold ${kleur}`}>{aantal}</p>
              <p className="text-xs text-text-secondary mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Fout van Boni feedback */}
        {feedbackLijst && feedbackLijst.length > 0 && (
          <div className="card overflow-hidden">
            <div className="p-5 border-b border-border">
              <h2 className="font-display text-xl text-primary">Fout van Boni — feedback ({feedbackLijst.length})</h2>
              <p className="text-sm text-text-secondary mt-1">Beoordeel of dit een vaste regel moet worden.</p>
            </div>
            <div className="divide-y divide-border">
              {feedbackLijst.map(fb => (
                <div key={fb.id} className="p-4 flex gap-4 items-start">
                  {fb.origineel_pad && (
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/foto-originelen/${fb.origineel_pad}`}
                      alt=""
                      className="w-20 h-14 object-cover rounded-lg shrink-0"
                    />
                  )}
                  {fb.bewerkt_pad && (
                    <img
                      src={`${supabaseUrl}/storage/v1/object/public/foto-bewerkt/${fb.bewerkt_pad}`}
                      alt=""
                      className="w-20 h-14 object-cover rounded-lg shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary">{fb.ruimte || "Onbekende ruimte"} · #{fb.volgnummer}</p>
                    <p className="text-sm text-text-secondary mt-1 italic">"{fb.feedback_toelichting}"</p>
                    <p className="text-xs text-text-secondary mt-1">
                      {fb.feedback_op ? new Date(fb.feedback_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                    </p>
                  </div>
                  <Link
                    href={`/admin/foto-optimizer/${fb.sessie_id}`}
                    className="btn-secondary text-xs shrink-0"
                  >
                    Bekijk sessie →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sessies */}
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-border">
            <h2 className="font-display text-xl text-primary">Alle sessies ({sessies?.length ?? 0})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  {["Naam", "Email", "Status", "Foto's", "Bedrag", "Datum", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-text-secondary uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(!sessies || sessies.length === 0) && (
                  <tr><td colSpan={7} className="px-5 py-4 text-sm text-text-secondary">Nog geen sessies.</td></tr>
                )}
                {sessies?.map(s => (
                  <tr key={s.id} className="hover:bg-surface/50">
                    <td className="px-4 py-3 font-semibold text-primary">{s.naam}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary">{s.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        s.status === "klaar" ? "bg-success/10 text-success" :
                        s.status === "verwerking" ? "bg-warning/10 text-warning" :
                        s.status === "fout" ? "bg-danger/10 text-danger" :
                        "bg-border text-text-secondary"
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{s.aantal_fotos}</td>
                    <td className="px-4 py-3 text-text-secondary">€{Number(s.totaal_prijs).toFixed(2).replace(".", ",")}</td>
                    <td className="px-4 py-3 text-xs text-text-secondary whitespace-nowrap">
                      {new Date(s.aangemaakt_op).toLocaleDateString("nl-NL", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/foto-optimizer/${s.id}`} className="text-accent text-sm font-semibold hover:underline">
                        Beheer →
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
