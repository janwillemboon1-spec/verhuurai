import { NextResponse } from "next/server";
import { syncCommunityLeden } from "@/lib/sync-community-leden";

export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (secret !== "verhuurai-cron-2026") {
    return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });
  }

  try {
    const { gesynchroniseerd } = await syncCommunityLeden();
    return NextResponse.json({ ok: true, gesynchroniseerd });
  } catch (error: any) {
    console.error("Community sync fout:", error);
    return NextResponse.json({ error: error?.message || "Sync mislukt" }, { status: 500 });
  }
}
