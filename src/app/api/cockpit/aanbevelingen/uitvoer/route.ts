import { createClient } from "@/lib/supabase/server";
import { getCalendar, upsertOverride, updateListing, pushPrices, getListings } from "@/lib/pricelabs";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const { listing_id, actie_type, veld, nieuwe_waarde, dso_periode, aanpassing_pct, trigger_type } = await req.json();

  try {
    if (actie_type === "basisprijs") {
      await updateListing(listing_id, { base: nieuwe_waarde });
      await pushPrices(listing_id);

    } else if (actie_type === "minimumprijs") {
      await updateListing(listing_id, { min: nieuwe_waarde });
      await pushPrices(listing_id);

    } else if (actie_type === "dso_percent" || actie_type === "dso_fixed") {
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + (dso_periode ?? 15));

      const todayStr = today.toISOString().slice(0, 10);
      const endDateStr = endDate.toISOString().slice(0, 10);

      // Haal kalender op om vrije datums te vinden
      const calendar = await getCalendar(listing_id, todayStr, endDateStr);
      const vrijeDatums = calendar.filter(d =>
        !d.booking_status.toLowerCase().includes("booked") && d.date >= todayStr
      );

      if (vrijeDatums.length === 0) {
        return NextResponse.json({ ok: true, dso_count: 0, message: "Geen vrije datums gevonden" });
      }

      // DSO toepassen op alle vrije datums
      let count = 0;
      for (const dag of vrijeDatums) {
        await upsertOverride(listing_id, {
          date: dag.date,
          price: String(Math.abs(aanpassing_pct)),
          price_type: actie_type === "dso_fixed" ? "fixed" : "percent",
          min_stay: 1,
          reason: `Trigger: ${trigger_type}`,
        });
        count++;
      }
      await pushPrices(listing_id);
      return NextResponse.json({ ok: true, dso_count: count });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
