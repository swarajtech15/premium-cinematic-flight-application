import { AIRPORTS } from "./data";
import { hash, haversineKm, type FlightBase } from "./flight-utils";

const CARRIERS = ["AL", "AR", "MR", "SL", "KS"];
const CARRIER_FACTOR: Record<string, number> = { AL: 1.06, AR: 0.95, MR: 1.0, SL: 0.92, KS: 1.03 };
const SLOTS = [360, 510, 675, 820, 980, 1145, 1310, 1410];
const HUBS = ["DXB", "FRA", "AMS", "SIN", "HKG", "LHR"];

function aircraftFor(km: number, h: number) {
  if (km < 2500) return h % 2 ? "Airbus A320neo" : "Boeing 737 MAX 8";
  if (km < 8000) return h % 2 ? "Boeing 787-9" : "Airbus A330-300";
  return h % 2 ? "Airbus A350-900" : "Boeing 777-300ER";
}

function buildFlights() {
  const rows: FlightBase[] = [];
  const counters: Record<string, number> = {};
  for (const o of AIRPORTS) {
    for (const d of AIRPORTS) {
      if (o.code === d.code) continue;
      const km = haversineKm(o.lat, o.lon, d.lat, d.lon);
      const h = hash(`${o.code}${d.code}`);
      const n = km < 1500 ? 3 : 4;
      for (let i = 0; i < n; i++) {
        const airline = CARRIERS[(h + i) % CARRIERS.length];
        counters[airline] = (counters[airline] ?? 100) + 1;
        const hi = hash(`${o.code}${d.code}${i}`);
        const oneStop = km > 10500 || (i === n - 1 && km > 2500);
        let duration = Math.round(((km / (km > 4000 ? 880 : 780)) * 60 + 35) / 5) * 5;
        let stopCode: string | null = null;
        if (oneStop) {
          duration = Math.round((duration * 1.22 + 95) / 5) * 5;
          const hubs = HUBS.filter((x) => x !== o.code && x !== d.code);
          stopCode = hubs[hi % hubs.length];
        }
        const base = (45 + km * 0.075) * CARRIER_FACTOR[airline] * (oneStop ? 0.86 : 1) * (0.96 + (hi % 9) / 100);
        rows.push({
          id: rows.length + 1,
          flightNumber: `${airline}${counters[airline]}`,
          airline,
          origin: o.code,
          destination: d.code,
          departMin: SLOTS[(h + i * 3) % SLOTS.length],
          durationMin: duration,
          stops: oneStop ? 1 : 0,
          stopCode,
          aircraft: aircraftFor(km, hi),
          basePriceUsd: Math.round(base),
        });
      }
    }
  }
  return rows;
}

// This fictional timetable repeats daily and has stable flight IDs across visits.
export const FLIGHT_SCHEDULE = buildFlights();
const flightsByRoute = new Map<string, FlightBase[]>();
for (const flight of FLIGHT_SCHEDULE) {
  const route = `${flight.origin}-${flight.destination}`;
  const rows = flightsByRoute.get(route) ?? [];
  rows.push(flight);
  flightsByRoute.set(route, rows);
}

export const scheduledFlight = (id: number) => FLIGHT_SCHEDULE[id - 1];
export const scheduledRoute = (origin: string, destination: string) =>
  flightsByRoute.get(`${origin}-${destination}`) ?? [];
