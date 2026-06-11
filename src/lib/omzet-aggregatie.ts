import { PLReservation } from "./pricelabs";

export interface OmzetMetrics {
  omzet: number;
  omzetIncl: number;
  adr: number;
  nachten: number;
  bezetting: number;
  revpar: number;
  kanalen: Record<string, { omzet: number; boekingen: number }>;
}

export interface ListingOmzet extends OmzetMetrics {
  listing_id: string;
  listing_naam: string;
}

export function aggregeer(reservations: PLReservation[], totaleDagen: number): OmzetMetrics {
  const geboekt = reservations.filter((r) => r.booking_status === "booked");

  const omzet = geboekt.reduce((s, r) => s + parseFloat(r.rental_revenue || "0"), 0);
  const omzetIncl = geboekt.reduce((s, r) => s + parseFloat(r.total_cost || "0"), 0);
  const nachten = geboekt.reduce((s, r) => s + (r.no_of_days || 0), 0);
  const adr = nachten > 0 ? omzet / nachten : 0;
  const bezetting = totaleDagen > 0 ? (nachten / totaleDagen) * 100 : 0;
  const revpar = totaleDagen > 0 ? omzet / totaleDagen : 0;

  const kanalen: Record<string, { omzet: number; boekingen: number }> = {};
  for (const r of geboekt) {
    const raw = (r.booking_channel || "overig").toLowerCase();
    // Alles wat airbnb bevat samenvoegen onder één sleutel
    const k = raw.includes("airbnb") ? "airbnb" : raw;
    if (!kanalen[k]) kanalen[k] = { omzet: 0, boekingen: 0 };
    kanalen[k].omzet += parseFloat(r.rental_revenue || "0");
    kanalen[k].boekingen += 1;
  }

  return { omzet, omzetIncl, adr, nachten, bezetting, revpar, kanalen };
}

export function dagenInPeriode(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
}

export function groepeerPerMaand(reservations: PLReservation[]): Record<string, PLReservation[]> {
  const map: Record<string, PLReservation[]> = {};
  for (const r of reservations) {
    const maand = r.check_in.slice(0, 7); // YYYY-MM
    if (!map[maand]) map[maand] = [];
    map[maand].push(r);
  }
  return map;
}

export function groepeerPerListing(reservations: PLReservation[]): Record<string, PLReservation[]> {
  const map: Record<string, PLReservation[]> = {};
  for (const r of reservations) {
    if (!map[r.listing_id]) map[r.listing_id] = [];
    map[r.listing_id].push(r);
  }
  return map;
}

export function berekenPrognose(
  historisch: PLReservation[],
  vorigJaar: PLReservation[],
  futureListing: { date: string; price: number; booking_status: string }[],
  csvData: Record<string, Record<string, number>>,
  startDate: string,
  endDate: string
) {
  const dagen = dagenInPeriode(startDate, endDate);

  // Methode 1: historische gemiddelde maandelijkse omzet
  const histOmzet = historisch
    .filter((r) => r.booking_status === "booked")
    .reduce((s, r) => s + parseFloat(r.rental_revenue || "0"), 0);
  const histMaanden = Math.max(1, dagenInPeriode(
    historisch.reduce((min, r) => r.check_in < min ? r.check_in : min, "9999"),
    historisch.reduce((max, r) => r.check_in > max ? r.check_in : max, "0000")
  ) / 30);
  const m1 = csvData[1]
    ? Object.values(csvData[1]).reduce((s, v) => s + v, 0)
    : (histOmzet / histMaanden) * (dagen / 30);

  // Methode 2: zelfde periode vorig jaar (STLY)
  const m2 = csvData[2]
    ? Object.values(csvData[2]).reduce((s, v) => s + v, 0)
    : vorigJaar.filter((r) => r.booking_status === "booked")
        .reduce((s, r) => s + parseFloat(r.rental_revenue || "0"), 0);

  // Methode 3: bevestigde boekingen + potentieel
  const bevestigd = futureListing
    .filter((d) => d.booking_status.toLowerCase().includes("booked"))
    .reduce((s, d) => s + d.price, 0);
  const beschikbaar = futureListing
    .filter((d) => !d.booking_status.toLowerCase().includes("booked"))
    .reduce((s, d) => s + d.price * 0.7, 0); // 70% kans geschat
  const m3 = csvData[3]
    ? Object.values(csvData[3]).reduce((s, v) => s + v, 0)
    : bevestigd + beschikbaar;

  return { m1, m2, m3, bevestigdFuture: bevestigd };
}
