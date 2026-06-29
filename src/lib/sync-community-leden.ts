import { createAdminClient } from "@/lib/supabase/admin";

const AC_BASE = "https://boonvakantieverhuur.api-us1.com/api/3";
const TAGS_GEZOCHT = ["Founding member", "Member"];

async function acFetch(path: string) {
  const res = await fetch(`${AC_BASE}${path}`, {
    headers: { "Api-Token": process.env.ACTIVECAMPAIGN_API_KEY! },
  });
  if (!res.ok) throw new Error(`ActiveCampaign API fout: ${res.status}`);
  return res.json();
}

async function haalTagIds(): Promise<{ id: string; naam: string }[]> {
  const data = await acFetch("/tags?limit=100");
  return (data.tags || [])
    .filter((t: any) => TAGS_GEZOCHT.includes(t.tag))
    .map((t: any) => ({ id: t.id, naam: t.tag }));
}

async function haalContactenMetTag(tagId: string): Promise<string[]> {
  const emails: string[] = [];
  let offset = 0;
  while (true) {
    const data = await acFetch(`/contacts?tagid=${tagId}&limit=100&offset=${offset}`);
    const contacts: any[] = data.contacts || [];
    contacts.forEach((c) => { if (c.email) emails.push(c.email.toLowerCase().trim()); });
    if (contacts.length < 100) break;
    offset += 100;
  }
  return emails;
}

export async function syncCommunityLeden(): Promise<{ gesynchroniseerd: number }> {
  const tagIds = await haalTagIds();
  if (tagIds.length === 0) return { gesynchroniseerd: 0 };

  const emailMap: Record<string, string> = {};
  for (const { id, naam } of tagIds) {
    const emails = await haalContactenMetTag(id);
    for (const email of emails) {
      if (!emailMap[email] || naam === "Founding member") emailMap[email] = naam;
    }
  }

  const upsertData = Object.entries(emailMap).map(([email, tag]) => ({
    email,
    tag,
    bron: "mailblue",
    gesynchroniseerd_op: new Date().toISOString(),
  }));

  if (upsertData.length === 0) return { gesynchroniseerd: 0 };

  const admin = createAdminClient();
  const { error } = await admin
    .from("community_leden")
    .upsert(upsertData, { onConflict: "email" });

  if (error) throw error;
  return { gesynchroniseerd: upsertData.length };
}
