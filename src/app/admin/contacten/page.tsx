import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import ContactenClient from "./ContactenClient";

const ADMIN_EMAIL = "info@bnbassistant.com";

export default async function ContactenPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== ADMIN_EMAIL) redirect("/login");

  const admin = createAdminClient();

  const [
    { data: listingRapporten },
    { data: abonnementen },
    { data: calculatorRapporten },
    { data: usersData },
  ] = await Promise.all([
    admin.from("listing_rapporten").select("id, host_naam, email, aangemaakt_op, user_id").order("aangemaakt_op", { ascending: false }),
    admin.from("abonnementen").select("id, listing_naam, airbnb_url, user_id, aangemaakt_op").order("aangemaakt_op", { ascending: false }),
    admin.from("prijscalculator_rapporten").select("id, email, locatie, land, basisprijs, aangemaakt_op").order("aangemaakt_op", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const userEmailMap: Record<string, string> = {};
  (usersData?.users ?? []).forEach(u => { if (u.id && u.email) userEmailMap[u.id] = u.email; });

  // Samengevoegde contactenlijst
  const contacten: { naam: string; email: string; soort: string; plaats: string; datum: string }[] = [];
  const gezienEmails = new Set<string>();

  const voegToe = (naam: string, email: string, soort: string, plaats: string, datum: string) => {
    if (!email) return;
    const key = `${email.toLowerCase()}|${soort}`;
    if (gezienEmails.has(key)) return;
    gezienEmails.add(key);
    contacten.push({ naam: naam || email.split("@")[0], email: email.toLowerCase(), soort, plaats, datum });
  };

  // Listing Optimizer
  for (const r of listingRapporten ?? []) {
    const email = (r as any).email || userEmailMap[(r as any).user_id] || "";
    voegToe((r as any).host_naam || "", email, "Listing Optimizer", "", r.aangemaakt_op);
  }

  // Host Performance Audit
  for (const a of abonnementen ?? []) {
    const email = userEmailMap[(a as any).user_id] || "";
    voegToe((a as any).listing_naam || "", email, "Host Performance Audit", "", a.aangemaakt_op);
  }

  // Prijscalculator
  for (const c of calculatorRapporten ?? []) {
    voegToe("", (c as any).email || "", "Prijscalculator", `${(c as any).locatie}, ${(c as any).land}`, c.aangemaakt_op);
  }

  // Sorteer op datum nieuwste eerst
  contacten.sort((a, b) => b.datum.localeCompare(a.datum));

  return <ContactenClient contacten={contacten} />;
}
