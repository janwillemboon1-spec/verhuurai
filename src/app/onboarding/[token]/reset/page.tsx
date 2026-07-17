import { createAdminClient } from "@/lib/supabase/admin";
import { verifyResetToken } from "@/lib/onboarding/auth";
import { notFound } from "next/navigation";
import { ResetForm } from "./ResetForm";

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { rt?: string };
}) {
  const rt = searchParams.rt;

  if (!rt || !verifyResetToken(params.token, rt)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card p-8 text-center max-w-sm w-full space-y-3">
          <p className="text-danger font-semibold">Link verlopen</p>
          <p className="text-sm text-text-secondary">
            Deze link is verlopen of ongeldig. Vraag een nieuwe aan via de loginpagina.
          </p>
          <a
            href={`/onboarding/${params.token}`}
            className="btn-secondary text-sm block text-center"
          >
            Terug naar login
          </a>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const { data: login } = await admin
    .from("onboarding_logins")
    .select("voornaam, achternaam")
    .eq("link_token", params.token)
    .single();

  if (!login) notFound();

  const naam = login.voornaam || login.achternaam || "daar";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="card p-8 max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <h1 className="font-display text-2xl text-primary">Nieuw wachtwoord</h1>
          <p className="text-sm text-text-secondary">Kies een nieuw wachtwoord voor {naam}.</p>
        </div>
        <ResetForm token={params.token} rt={rt} />
      </div>
    </div>
  );
}
