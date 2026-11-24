import { airportByCode, fareById, TAX_RATE, type CabinId } from "./data";

export type FlightBase = {
  id: number;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departMin: number;
  durationMin: number;
  stops: number;
  stopCode: string | null;
  aircraft: string;
  basePriceUsd: number;
};

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const DAY = 86400000;

export function isFlightId(id: number) {
  return Number.isInteger(id) && id > 0 && id <= 2147483647;
}

export function parseDate(date: string) {
  return new Date(`${date}T00:00:00Z`);
}
export function isValidDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date.startsWith("0000")) return false;
  const parsed = parseDate(date);
  return Number.isFinite(parsed.getTime()) && toDateStr(parsed) === date;
}
export function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function addDays(date: string, n: number) {
  return toDateStr(new Date(parseDate(date).getTime() + n * DAY));
}
export function todayStr(now = Date.now()) {
  return toDateStr(new Date(now));
}

/** Dynamic-pricing multiplier based on weekday, how soon the flight departs and flight/date noise. */
export function dateFactor(date: string, key: string, now = Date.now()) {
  const d = parseDate(date);
  const dow = d.getUTCDay();
  const today = Math.floor(now / DAY) * DAY;
  const days = Math.round((d.getTime() - today) / DAY);
  let f = 1;
  if (dow === 5 || dow === 0) f *= 1.12;
  if (dow === 2 || dow === 3) f *= 0.92;
  if (days <= 3) f *= 1.35;
  else if (days <= 7) f *= 1.2;
  else if (days <= 14) f *= 1.08;
  else if (days >= 45) f *= 0.94;
  f *= 0.95 + (hash(`${key}|${date}`) % 16) / 100;
  return f;
}

export function priceUsd(base: number, key: string, date: string, fareId: string, now = Date.now()) {
  const fare = fareById(fareId);
  if (!fare) return 0;
  return Math.round(base * dateFactor(date, key, now) * fare.mult);
}

export function farePrices(f: FlightBase, date: string, now = Date.now()) {
  const key = f.flightNumber;
  return {
    saver: priceUsd(f.basePriceUsd, key, date, "saver", now),
    flex: priceUsd(f.basePriceUsd, key, date, "flex", now),
    premium: priceUsd(f.basePriceUsd, key, date, "premium", now),
    business: priceUsd(f.basePriceUsd, key, date, "business", now),
  };
}

export type FarePrices = ReturnType<typeof farePrices>;

/* ---------- Time helpers ---------- */
export function fmtTime(min: number) {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(Math.round(m % 60)).padStart(2, "0")}`;
}
export function fmtDuration(min: number) {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}
const offsets = new Map<string, Intl.DateTimeFormat>();

function utcOffset(ms: number, airport: string) {
  const timeZone = airportByCode(airport)?.timeZone ?? "UTC";
  let formatter = offsets.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" });
    offsets.set(timeZone, formatter);
  }
  const offset = formatter.formatToParts(ms).find((part) => part.type === "timeZoneName")?.value;
  const match = offset?.match(/^GMT([+-])(\d{2}):(\d{2})(?::(\d{2}))?$/);
  return match ? (match[1] === "-" ? -1 : 1) * (+match[2] * 3600 + +match[3] * 60 + +(match[4] ?? 0)) * 1000 : 0;
}

export function departUtc(date: string, departMin: number, origin: string) {
  const local = parseDate(date).getTime() + departMin * 60000;
  const estimatedUtc = local - utcOffset(local, origin);
  return local - utcOffset(estimatedUtc, origin);
}

export function arrival(f: Pick<FlightBase, "departMin" | "durationMin" | "origin" | "destination">, date: string) {
  const utc = departUtc(date, f.departMin, f.origin) + f.durationMin * 60000;
  const total = Math.floor((utc + utcOffset(utc, f.destination) - parseDate(date).getTime()) / 60000);
  return { arrMin: ((total % 1440) + 1440) % 1440, dayOffset: Math.floor(total / 1440) };
}
export function fmtDate(date: string, long = false) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: long ? "numeric" : undefined,
    timeZone: "UTC",
  }).format(parseDate(date));
}

/* ---------- Seat map ---------- */
export type SeatRow = { row: number; cabin: CabinId; letters: string[]; legroom: boolean };

function buildRows(): SeatRow[] {
  const rows: SeatRow[] = [];
  for (let r = 1; r <= 4; r++) rows.push({ row: r, cabin: "business", letters: ["A", "C", "D", "F"], legroom: false });
  for (let r = 6; r <= 10; r++) rows.push({ row: r, cabin: "premium", letters: ["A", "B", "C", "D", "E", "F"], legroom: false });
  for (let r = 12; r <= 32; r++) {
    if (r === 13) continue;
    rows.push({ row: r, cabin: "economy", letters: ["A", "B", "C", "D", "E", "F"], legroom: r === 12 || r === 24 });
  }
  return rows;
}
export const SEAT_ROWS = buildRows();
export const ALL_SEATS = SEAT_ROWS.flatMap((r) => r.letters.map((l) => `${r.row}${l}`));

export function seatInfo(seat: string) {
  return SEAT_ROWS.find((r) => r.letters.some((letter) => seat === `${r.row}${letter}`));
}
export function seatFeeUsd(seat: string) {
  const info = seatInfo(seat);
  if (!info) return 0;
  return info.cabin === "economy" && info.legroom ? 25 : 0;
}
export function seededTaken(flightId: number, date: string, seat: string) {
  return hash(`${flightId}|${date}|${seat}`) % 100 < 30;
}

/* ---------- Totals ---------- */
export function computeTotals(unitUsd: number, pax: number, seats: (string | null)[]) {
  const subtotalCents = unitUsd * pax * 100;
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const seatFeesCents = seats.reduce((s, seat) => s + (seat ? seatFeeUsd(seat) * 100 : 0), 0);
  return { subtotalCents, taxCents, seatFeesCents, totalCents: subtotalCents + taxCents + seatFeesCents };
}

/** Deterministic pseudo-random helpers for boarding pass details. */
export function gateFor(ref: string, flightNumber: string) {
  const h = hash(ref + flightNumber);
  return `${"ABCDE"[h % 5]}${(h >>> 3) % 40 + 1}`;
}

export type FlightResult = FlightBase & { arrMin: number; dayOffset: number; fares: FarePrices; availableSeats: Record<CabinId, number> };
