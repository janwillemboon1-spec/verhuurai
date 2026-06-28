import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const COCKPIT_EMAIL = "info@bnbassistant.com";
const MAANDEN = ["jan","feb","mrt","apr","mei","jun","jul","aug","sep","okt","nov","dec"];

function berekenKostenPerMaand(kosten: {
  bedrag: number; frequentie: string; betaalmaand: number | null;
  van_maand: number | null; tot_maand: number | null;
}[]): number[] {
  const perMaand = Array(12).fill(0);

  for (const k of kosten) {
    switch (k.frequentie) {
      case "maandelijks": {
        const van = (k.van_maand ?? 1) - 1;
        const tot = (k.tot_maand ?? 12) - 1;
        for (let m = van; m <= tot; m++) {
          perMaand[m] += k.bedrag;
        }
        break;
      }
      case "jaarlijks":
      case "eenmalig": {
        const m = (k.betaalmaand ?? 1) - 1;
        perMaand[m] += k.bedrag;
        break;
      }
      case "kwartaal": {
        const startM = (k.betaalmaand ?? 1) - 1;
        for (let q = 0; q < 4; q++) {
          const m = (startM + q * 3) % 12;
          perMaand[m] += k.bedrag;
        }
        break;
      }
    }
  }

  return perMaand;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== COCKPIT_EMAIL) {
    return NextResponse.json({ error: "Geen toegang" }, { status: 401 });
  }

  const url = new URL(req.url);
  const jaar = parseInt(url.searchParams.get("jaar") ?? String(new Date().getFullYear()));
  const admin = createAdminClient();

  const [{ data: commissies }, { data: kosten }, { data: overig }, { data: meta }] = await Promise.all([
    admin.from("cockpit_fin_commissies").select("maand, commissie").eq("jaar", jaar),
    admin.from("cockpit_fin_kosten").select("*").eq("jaar", jaar).eq("actief", true),
    admin.from("cockpit_fin_overig").select("*").eq("jaar", jaar).eq("actief", true),
    admin.from("cockpit_cache_meta").select("waarde").eq("sleutel", `financien_sync_${jaar}`).single(),
  ]);

  // Commissies per maand
  const commissiesPerMaand = Array(12).fill(0);
  for (const c of commissies ?? []) {
    const m = parseInt(c.maand.slice(5, 7)) - 1;
    commissiesPerMaand[m] += c.commissie;
  }

  // Overige inkomsten per maand
  const overigPerMaand = Array(12).fill(0);
  const overigRijen = (overig ?? []).map((o: {
    naam: string;
    jan: number; feb: number; mrt: number; apr: number; mei: number; jun: number;
    jul: number; aug: number; sep: number; okt: number; nov: number; dec: number;
  }) => {
    const maanden = [o.jan,o.feb,o.mrt,o.apr,o.mei,o.jun,o.jul,o.aug,o.sep,o.okt,o.nov,o.dec];
    maanden.forEach((v, i) => { overigPerMaand[i] += v; });
    return { naam: o.naam, maanden, totaal: maanden.reduce((s, v) => s + v, 0) };
  });

  // Totale inkomsten per maand
  const inkomstenPerMaand = commissiesPerMaand.map((c, i) => c + overigPerMaand[i]);

  // Kosten per maand
  const kostenPerMaand = berekenKostenPerMaand(kosten ?? []);

  // Resultaat per maand
  const resultaatPerMaand = inkomstenPerMaand.map((i, m) => i - kostenPerMaand[m]);

  const totaalInkomsten = inkomstenPerMaand.reduce((s, v) => s + v, 0);
  const totaalKosten = kostenPerMaand.reduce((s, v) => s + v, 0);
  const totaalResultaat = totaalInkomsten - totaalKosten;

  const huidigeMaand = new Date().getMonth(); // 0-indexed
  const isHuidigJaar = new Date().getFullYear() === jaar;
  const ytdMaanden = isHuidigJaar ? huidigeMaand : 12;

  return NextResponse.json({
    jaar,
    sync_op: meta?.waarde ?? null,
    maand_labels: MAANDEN,
    commissies_per_maand: commissiesPerMaand,
    overig_per_maand: overigPerMaand,
    inkomsten_per_maand: inkomstenPerMaand,
    kosten_per_maand: kostenPerMaand,
    resultaat_per_maand: resultaatPerMaand,
    overig_rijen: overigRijen,
    kpi: {
      inkomsten_ytd: inkomstenPerMaand.slice(0, ytdMaanden).reduce((s, v) => s + v, 0),
      kosten_ytd: kostenPerMaand.slice(0, ytdMaanden).reduce((s, v) => s + v, 0),
      resultaat_ytd: resultaatPerMaand.slice(0, ytdMaanden).reduce((s, v) => s + v, 0),
      inkomsten_jaar: totaalInkomsten,
      kosten_jaar: totaalKosten,
      resultaat_jaar: totaalResultaat,
      winstmarge: totaalInkomsten > 0 ? (totaalResultaat / totaalInkomsten) * 100 : 0,
    },
  });
}
