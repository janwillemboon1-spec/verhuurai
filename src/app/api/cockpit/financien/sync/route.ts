import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFinReserveringen, berekenFinancials } from "@/lib/hostaway";
import { getReservationData } from "@/lib/pricelabs";
import { NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";
const AIRBNB_DIRECT_LISTINGS = [
  "546956232389613086",  // Molenkade 2 - Studio
  "1521024137813189296", // Molenkade 2B
  "1584289727457529809", // Ankeveen
];
// Airbnb houdt een host service fee in op de brutohuurprijs (rental_revenue in PriceLabs is bruto)
const AIRBNB_DIRECT_HOST_FEE_PCT = 0.155;
const GEANNULEERD_ARRAY = ["cancelled", "declined", "expired", "inquiry"];
const GEANNULEERD = new Set(GEANNULEERD_ARRAY);

interface CommissieConfig {
  listing_id: string;
  listing_naam: string;
  pms: string;
  model: string;
  tarief: number | null;
  tarief_1_2: number | null;
  tarief_3: number | null;
  tarief_4plus: number | null;
  groeit_mee: boolean;
  actief: boolean;
  sort_order: number;
}

function maandVanDatum(datum: string): string {
  return datum.slice(0, 7); // YYYY-MM
}

function berekenOwnerTarief(
  config: { tarief_1_2: number | null; tarief_3: number | null; tarief_4plus: number | null },
  aantalGasten: number
): number {
  if (aantalGasten <= 2) return config.tarief_1_2 ?? 55;
  if (aantalGasten === 3) return config.tarief_3 ?? 65;
  return config.tarief_4plus ?? 75;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const jaar = parseInt(url.searchParams.get("jaar") ?? String(new Date().getFullYear()));
  const startDatum = `${jaar}-01-01`;
  const eindDatum = `${jaar}-12-31`;

  const admin = createAdminClient();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      function stuur(data: object) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* verbinding gesloten */ }
      }

      stuur({ type: "start", jaar, bericht: `Sync gestart voor ${jaar}` });

      // Laad commissie config
      const { data: configs } = await admin
        .from("cockpit_commissie_config")
        .select("*")
        .eq("actief", true);

      if (!configs || configs.length === 0) {
        stuur({ type: "fout", bericht: "Geen commissie config gevonden — voer eerst de SQL migratie uit." });
        controller.close();
        return;
      }

      const configMap = new Map<string, CommissieConfig>(
        (configs as CommissieConfig[]).map(c => [c.listing_id, c])
      );

      // Wis bestaande data voor dit jaar
      await admin.from("cockpit_fin_reserveringen").delete().eq("jaar", jaar);
      await admin.from("cockpit_fin_commissies").delete().eq("jaar", jaar);

      stuur({ type: "progress", bericht: "Bestaande data gewist, ophalen gestart..." });

      // ── Stap 1: Hostaway reserveringen ophalen ──
      stuur({ type: "progress", bericht: "Hostaway reserveringen ophalen..." });
      let hostawayRijen: object[] = [];
      try {
        const reserveringen = await getFinReserveringen(
          startDatum,
          eindDatum,
          (bericht) => stuur({ type: "progress", bericht })
        );

        stuur({ type: "progress", bericht: `${reserveringen.length} Hostaway reserveringen opgehaald, financials berekenen...` });

        hostawayRijen = reserveringen
          .filter(r => !GEANNULEERD.has((r.status ?? "").toLowerCase()) && r.arrivalDate >= startDatum)
          .map(r => {
            const { rent_from_ota, payout_ota } = berekenFinancials(r);
            return {
              hostaway_id: String(r.id),
              listing_id: String(r.listingMapId),
              listing_naam: r.listingName,
              kanaal: r.channelName,
              check_in: r.arrivalDate,
              check_out: r.departureDate,
              nachten: r.nights,
              aantal_gasten: r.numberOfGuests,
              rent_from_ota,
              payout_ota,
              status: r.status,
              jaar,
            };
          });

        // Sla op in batches
        for (let i = 0; i < hostawayRijen.length; i += 200) {
          await admin.from("cockpit_fin_reserveringen").upsert(
            hostawayRijen.slice(i, i + 200),
            { onConflict: "hostaway_id" }
          );
        }

        stuur({ type: "hostaway_ok", reserveringen: hostawayRijen.length });
      } catch (err) {
        stuur({ type: "waarschuwing", bericht: `Hostaway fout: ${String(err)}` });
      }

      // ── Stap 2: PriceLabs Airbnb-direct listings ──
      stuur({ type: "progress", bericht: "Airbnb-direct listings ophalen (Molenkade, Ankeveen)..." });
      let plRijen: object[] = [];

      for (const listingId of AIRBNB_DIRECT_LISTINGS) {
        try {
          const rows = await getReservationData(startDatum, eindDatum, listingId);
          const config = configMap.get(listingId);
          const naam = config?.listing_naam ?? listingId;

          const geldig = rows.filter(r => !GEANNULEERD.has((r.booking_status ?? "").toLowerCase()));
          for (const r of geldig) {
            const brutoPrijs = parseFloat(r.rental_revenue ?? "0") || 0;
            plRijen.push({
              hostaway_id: `pl_${listingId}_${r.reservation_id}`,
              listing_id: listingId,
              listing_naam: naam,
              kanaal: "airbnb_direct",
              check_in: r.check_in,
              check_out: r.check_out,
              nachten: r.no_of_days,
              aantal_gasten: null,
              rent_from_ota: brutoPrijs * (1 - AIRBNB_DIRECT_HOST_FEE_PCT),
              payout_ota: parseFloat(r.total_cost ?? "0") || 0,
              status: r.booking_status,
              jaar,
            });
          }
        } catch (err) {
          stuur({ type: "waarschuwing", bericht: `PriceLabs fout voor ${listingId}: ${String(err)}` });
        }
      }

      if (plRijen.length > 0) {
        await admin.from("cockpit_fin_reserveringen").upsert(plRijen, { onConflict: "hostaway_id" });
      }
      stuur({ type: "pricelabs_ok", reserveringen: plRijen.length });

      // ── Stap 3: Commissies berekenen per listing per maand ──
      stuur({ type: "progress", bericht: "Commissies berekenen..." });

      // Supabase heeft een server-side rij-limiet van 1000 — pagineer alle reserveringen op
      const PAGE = 1000;
      const alleRes: { listing_id: string; check_in: string; nachten: number; aantal_gasten: number; rent_from_ota: number; payout_ota: number }[] = [];
      for (let van = 0; ; van += PAGE) {
        const { data: batch } = await admin
          .from("cockpit_fin_reserveringen")
          .select("listing_id, check_in, nachten, aantal_gasten, rent_from_ota, payout_ota")
          .eq("jaar", jaar)
          .not("status", "in", `(${GEANNULEERD_ARRAY.join(",")})`)
          .range(van, van + PAGE - 1);
        if (!batch || batch.length === 0) break;
        alleRes.push(...batch);
        if (batch.length < PAGE) break;
      }

      // Aggregeer per listing per maand
      const commissieMap = new Map<string, { commissie: number; omzet_basis: number }>();

      for (const r of alleRes) {
        const config = configMap.get(r.listing_id);
        if (!config) continue;

        const maand = maandVanDatum(r.check_in);
        const sleutel = `${r.listing_id}|${maand}`;

        if (!commissieMap.has(sleutel)) {
          commissieMap.set(sleutel, { commissie: 0, omzet_basis: 0 });
        }

        const entry = commissieMap.get(sleutel)!;
        let commissie = 0;
        let basis = 0;

        switch (config.model) {
          case "pct_rent":
            basis = r.rent_from_ota ?? 0;
            commissie = basis * (config.tarief ?? 0);
            break;
          case "pct_payout":
            basis = r.payout_ota ?? 0;
            commissie = basis * (config.tarief ?? 0);
            break;
          case "per_nacht_verschil":
            basis = r.payout_ota ?? 0;
            const ownerTarief = berekenOwnerTarief(config, r.aantal_gasten ?? 2);
            commissie = basis - (r.nachten ?? 0) * ownerTarief;
            break;
          case "vast_maand":
            // Vast maand wordt apart toegevoegd
            break;
        }

        entry.commissie += Math.max(0, commissie);
        entry.omzet_basis += basis;
      }

      // Voeg vaste maandbedragen toe (12 maanden)
      for (const config of configs as CommissieConfig[]) {
        if (config.model !== "vast_maand") continue;
        for (let m = 1; m <= 12; m++) {
          const maand = `${jaar}-${String(m).padStart(2, "0")}`;
          const sleutel = `${config.listing_id}|${maand}`;
          commissieMap.set(sleutel, {
            commissie: config.tarief ?? 0,
            omzet_basis: config.tarief ?? 0,
          });
        }
      }

      // Sla commissies op
      const commissieRijen = Array.from(commissieMap.entries()).map(([sleutel, data]) => {
        const [listing_id, maand] = sleutel.split("|");
        const config = configMap.get(listing_id);
        return {
          listing_id,
          listing_naam: config?.listing_naam ?? listing_id,
          maand,
          jaar,
          commissie: Math.round(data.commissie * 100) / 100,
          omzet_basis: Math.round(data.omzet_basis * 100) / 100,
          model: config?.model ?? "onbekend",
          berekend_op: new Date().toISOString(),
        };
      });

      if (commissieRijen.length > 0) {
        await admin.from("cockpit_fin_commissies").upsert(
          commissieRijen,
          { onConflict: "listing_id,maand" }
        );
      }

      // Update sync timestamp
      const nu = new Date().toISOString();
      await admin.from("cockpit_cache_meta").upsert(
        { sleutel: `financien_sync_${jaar}`, waarde: nu, bijgewerkt_op: nu },
        { onConflict: "sleutel" }
      );

      stuur({
        type: "done",
        jaar,
        hostaway_reserveringen: hostawayRijen.length,
        pricelabs_reserveringen: plRijen.length,
        commissie_regels: commissieRijen.length,
        sync_op: nu,
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

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const jaar = url.searchParams.get("jaar") ?? String(new Date().getFullYear());
  const admin = createAdminClient();

  const { data: meta } = await admin
    .from("cockpit_cache_meta")
    .select("waarde")
    .eq("sleutel", `financien_sync_${jaar}`)
    .single();

  return NextResponse.json({ sync_op: meta?.waarde ?? null, jaar });
}
