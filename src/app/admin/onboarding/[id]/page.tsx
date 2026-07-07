import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { AdminOnboardingClient } from "./AdminOnboardingClient";

const ADMIN_EMAIL = "info@bnbassistant.com";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://www.hostboni.com";

export default async function AdminKlantPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();
  const [
    { data: klant },
    { data: checklist },
    { data: todos },
    { data: activiteiten },
    { data: metingen },
  ] = await Promise.all([
    admin.from("onboarding_klanten").select("*").eq("id", params.id).single(),
    admin.from("onboarding_checklist_items").select("*").eq("klant_id", params.id).order("volgorde"),
    admin.from("onboarding_todos").select("*").eq("klant_id", params.id).order("aangemaakt_op"),
    admin.from("onboarding_activiteiten").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
    admin.from("onboarding_kpi_metingen").select("*").eq("klant_id", params.id).order("datum", { ascending: false }),
  ]);

  if (!klant) notFound();

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="font-display text-2xl text-primary">{klant.naam}</h1>
            <p className="text-text-secondary text-sm">{klant.email}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <a
              href={`${BASE_URL}/onboarding/${klant.link_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary text-xs"
            >
              Klant link →
            </a>
            <Link href="/admin/onboarding" className="btn-secondary text-sm">← Overzicht</Link>
          </div>
        </div>

        <AdminOnboardingClient
          klant={klant}
          checklistInit={checklist || []}
          todosInit={todos || []}
          activiteitenInit={activiteiten || []}
          metingenInit={metingen || []}
        />
      </div>
    </div>
  );
}
