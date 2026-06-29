import { NextResponse } from "next/server";
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

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (secret !== "verhuurai-cron-2026") {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  try {
    const tagIds = await haalTagIds();
    if (tagIds.length === 0) {
      return NextResponse.json({ error: "Tags 'Founding member' en 'Member' niet gevonden in ActiveCampaign" }, { status: 404 });
    }

    const emailMap: Record<string, string> = {};
    for (const { id, naam } of tagIds) {
      const emails = await haalContactenMetTag(id);
      for (const email of emails) {
        // Founding member wint bij dubbele email
        if (!emailMap[email] || naam === "Founding member") {
          emailMap[email] = naam;
        }
      }
    }

    const upsertData = Object.entries(emailMap).map(([email, tag]) => ({
      email,
      tag,
      gesynchroniseerd_op: new Date().toISOString(),
    }));

    if (upsertData.length === 0) {
      return NextResponse.json({ ok: true, gesynchroniseerd: 0, bericht: "Geen leden gevonden" });
    }

    const admin = createAdminClient();
    const { error } = await admin
      .from("community_leden")
      .upsert(upsertData, { onConflict: "email" });

    if (error) throw error;

    return NextResponse.json({ ok: true, gesynchroniseerd: upsertData.length });
  } catch (error: any) {
    console.error("Community sync fout:", error);
    return NextResponse.json({ error: error?.message || "Sync mislukt" }, { status: 500 });
  }
}
