import { createClient } from "@/lib/supabase/server";
import { getCalendar, upsertOverride, updateListing, pushPrices } from "@/lib/pricelabs";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const { listing_id, actie_type, veld, nieuwe_waarde, dso_periode, aanpassing_pct, trigger_type } = await req.json();

  // Valideer dso_periode — gebruik de waarde uit de trigger, nooit een silent default
  const periode = typeof dso_periode === "number" && dso_periode > 0 ? dso_periode : null;

  try {
    if (actie_type === "basisprijs") {
      await updateListing(listing_id, { base: nieuwe_waarde });
      await pushPrices(listing_id);

    } else if (actie_type === "minimumprijs") {
      await updateListing(listing_id, { min: nieuwe_waarde });
      await pushPrices(listing_id);

    } else if (actie_type === "dso_percent" || actie_type === "dso_fixed") {
      if (!periode) {
        return NextResponse.json({ error: "dso_periode ontbreekt of is ongeldig" }, { status: 400 });
      }

      const today = new Date();
      const endDate = new Date();
      endDate.setDate(today.getDate() + periode);

      const todayStr = today.toISOString().slice(0, 10);
      const endDateStr = endDate.toISOString().slice(0, 10);

      // Haal kalender op — bevat ook de min_stay per datum
      const calendar = await getCalendar(listing_id, todayStr, endDateStr);
      const vrijeDatums = calendar.filter(d =>
        !d.booking_status.toLowerCase().includes("booked") && d.date >= todayStr && d.date <= endDateStr
      );

      if (vrijeDatums.length === 0) {
        return NextResponse.json({ ok: true, dso_count: 0, message: "Geen vrije datums gevonden" });
      }

      let count = 0;
      for (const dag of vrijeDatums) {
        await upsertOverride(listing_id, {
          date: dag.date,
          price: String(aanpassing_pct),
          price_type: actie_type === "dso_fixed" ? "fixed" : "percent",
          min_stay: dag.min_stay,   // Gebruik de bestaande min_stay per datum — nooit overschrijven
          reason: `Trigger: ${trigger_type}`,
        });
        count++;
      }
      await pushPrices(listing_id);
      return NextResponse.json({ ok: true, dso_count: count, periode, datums: vrijeDatums.length });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
