import { createAdminClient } from "@/lib/supabase/admin";

interface LogEntry {
  listing_id: string;
  listing_naam?: string;
  wijziging_type: "handmatig" | "automatisch";
  veld: string;
  oude_waarde?: string | null;
  nieuwe_waarde: string;
  override_datum?: string | null;
  regel_naam?: string | null;
}

export async function logPrijsWijziging(entry: LogEntry) {
  const admin = createAdminClient();
  await admin.from("cockpit_prijs_log").insert({
    listing_id: entry.listing_id,
    listing_naam: entry.listing_naam ?? null,
    wijziging_type: entry.wijziging_type,
    veld: entry.veld,
    oude_waarde: entry.oude_waarde ?? null,
    nieuwe_waarde: entry.nieuwe_waarde,
    override_datum: entry.override_datum ?? null,
    regel_naam: entry.regel_naam ?? null,
  });
}
