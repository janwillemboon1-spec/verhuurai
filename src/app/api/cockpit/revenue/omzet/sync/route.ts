import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getReservationData, getListings } from "@/lib/pricelabs";
import { NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";
const START_OFFSET_JAREN = 2;
const END_OFFSET_JAREN   = 1;
const VERTRAGING_MS      = 1000; // 1 seconde tussen listings om rate limit te voorkomen

function wacht(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function haalMetRetry(listingId: string, startStr: string, endStr: string, maxPogingen = 3) {
  for (let poging = 1; poging <= maxPogingen; poging++) {
    try {
      const data = await getReservationData(startStr, endStr, listingId);
      return { ok: true, data };
    } catch (err) {
      if (poging < maxPogingen) {
        await wacht(2000 * poging); // exponential backoff
      } else {
        return { ok: false, fout: String(err), data: [] };
      }
    }
  }
  return { ok: false, fout: "Max pogingen bereikt", data: [] };
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const listings = await getListings();

  const endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + END_OFFSET_JAREN);
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - START_OFFSET_JAREN);
  const startStr = startDate.toISOString().slice(0, 10);
  const endStr   = endDate.toISOString().slice(0, 10);
  const nu = new Date().toISOString();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function stuur(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* verbinding gesloten */ }
      }

      let totaal = 0;
      const mislukt: string[] = [];

      stuur({ type: "start", totaal_listings: listings.length, venster: `${startStr} → ${endStr}` });

      for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        const naam = listing.name.split("--")[0].trim();

        stuur({ type: "progress", listing: naam, index: i + 1, totaal_listings: listings.length });

        const { ok, data: reservations, fout } = await haalMetRetry(listing.id, startStr, endStr);

        if (!ok || reservations.length === 0) {
          if (!ok) mislukt.push(`${naam} (${fout})`);
          if (i < listings.length - 1) await wacht(VERTRAGING_MS);
          continue;
        }

        try {
          const rows = reservations.map(r => ({
            listing_id: listing.id,
            reservation_id: r.reservation_id,
            check_in: r.check_in,
            check_out: r.check_out,
            booking_status: r.booking_status,
            booked_date: r.booked_date ?? null,
            rental_revenue: r.rental_revenue ? parseFloat(r.rental_revenue) : null,
            total_cost: r.total_cost ? parseFloat(r.total_cost) : null,
            no_of_days: r.no_of_days ?? null,
            currency: r.currency ?? null,
            booking_channel: r.booking_channel ?? null,
            cleaning_fees: r.cleaning_fees ?? null,
            listing_naam: r.listing_name ?? listing.name,
          }));

          for (let j = 0; j < rows.length; j += 100) {
            await admin.from("cockpit_reserveringen_cache").upsert(
              rows.slice(j, j + 100),
              { onConflict: "listing_id,reservation_id" }
            );
          }
          totaal += rows.length;
          stuur({ type: "listing_ok", listing: naam, reserveringen: rows.length });
        } catch (err) {
          mislukt.push(`${naam} (opslaan: ${String(err)})`);
        }

        if (i < listings.length - 1) await wacht(VERTRAGING_MS);
      }

      await admin.from("cockpit_cache_meta").upsert(
        { sleutel: "reserveringen_sync", waarde: nu, bijgewerkt_op: nu },
        { onConflict: "sleutel" }
      );

      stuur({
        type: "done",
        reserveringen: totaal,
        sync_op: nu,
        mislukt: mislukt.length > 0 ? mislukt : null,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const admin = createAdminClient();
  const [meta, count] = await Promise.all([
    admin.from("cockpit_cache_meta").select("waarde").eq("sleutel", "reserveringen_sync").single(),
    admin.from("cockpit_reserveringen_cache").select("listing_id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    sync_op: meta.data?.waarde ?? null,
    cache_rijen: count.count ?? 0,
  });
}
