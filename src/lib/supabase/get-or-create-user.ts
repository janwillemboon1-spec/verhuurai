import { createAdminClient } from "./admin";

export async function getOrCreateUser(email: string): Promise<{ userId: string | null; isNieuw: boolean; loginUrl: string | null }> {
  const admin = createAdminClient();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://verhuurai.nl";

  // Probeer gebruiker aan te maken (email_confirm=true: geen bevestiging nodig)
  const { data: nieuw, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
  });

  if (nieuw?.user) {
    // Nieuw account — genereer inloglink
    const { data: link } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${baseUrl}/dashboard` },
    });
    return { userId: nieuw.user.id, isNieuw: true, loginUrl: link?.properties?.action_link || null };
  }

  // Altijd zoeken op email (nieuw of bestaand)
  // Supabase geeft een error als het account al bestaat — in beide gevallen zoeken we de user op
  if (!nieuw?.user) {
    const { data: lijstData } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const bestaand = lijstData?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (bestaand) {
      const { data: link } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
        options: { redirectTo: `${baseUrl}/dashboard` },
      });
      return { userId: bestaand.id, isNieuw: false, loginUrl: link?.properties?.action_link || null };
    }
  }

  return { userId: null, isNieuw: false, loginUrl: null };
}
