"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { SearchPanel } from "@/components/SearchPanel";
import { FlightCard } from "@/components/FlightCard";
import { useCurrency } from "@/components/Providers";
import { AIRLINES, airportByCode, MAX_PAX, type FareId } from "@/lib/data";
import { lowestFare, searchDemoFlights } from "@/lib/demo-bookings";
import { useDemoState } from "@/lib/demo-storage";
import { useClientTime } from "@/lib/use-client-time";
import { fmtDate, fmtDuration, isValidDate, type FlightResult } from "@/lib/flight-utils";

const EMPTY_RESULTS: ReturnType<typeof searchDemoFlights> = { flights: [], strip: [] };
type Sort = "price" | "duration" | "depart" | "arrive";
const BUCKETS = [
  { id: "morning", label: "Morning", sub: "05:00 – 11:59", test: (m: number) => m >= 300 && m < 720 },
  { id: "afternoon", label: "Afternoon", sub: "12:00 – 17:59", test: (m: number) => m >= 720 && m < 1080 },
  { id: "evening", label: "Evening", sub: "18:00 – 23:59", test: (m: number) => m >= 1080 },
  { id: "night", label: "Night", sub: "00:00 – 04:59", test: (m: number) => m < 300 },
];

export function FlightsClient() {
  const sp = useSearchParams();
  const from = (sp.get("from") ?? "").toUpperCase();
  const to = (sp.get("to") ?? "").toUpperCase();
  const date = sp.get("date") ?? "";
  const pax = Math.min(MAX_PAX, Math.max(1, parseInt(sp.get("pax") ?? "1", 10) || 1));
  return <FlightResults key={`${from}/${to}/${date}/${pax}`} {...{ from, to, date, pax }} />;
}

function FlightResults({ from, to, date, pax }: { from: string; to: string; date: string; pax: number }) {
  const router = useRouter();
  const { fmt } = useCurrency();
  const { data, error: storageError } = useDemoState();
  const now = useClientTime();
  const valid = !!airportByCode(from) && !!airportByCode(to) && from !== to && isValidDate(date);

  const loading = valid && now === null;
  const { flights, strip } = useMemo(
    () => valid && now !== null ? searchDemoFlights(data, from, to, date, pax, now) : EMPTY_RESULTS,
    [valid, data, from, to, date, pax, now],
  );
  const [stops, setStops] = useState<"any" | "0" | "1">("any");
  const [airlines, setAirlines] = useState<string[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const [maxPrice, setMaxPrice] = useState<number | null>(null);
  const [sort, setSort] = useState<Sort>("price");
  const [showFilters, setShowFilters] = useState(false);

  const range = useMemo(() => {
    const prices = flights.map((f) => lowestFare(f, pax));
    return { min: Math.min(...prices, Infinity), max: Math.max(...prices, 0) };
  }, [flights, pax]);
  const carriers = useMemo(() => Array.from(new Set(flights.map((f) => f.airline))), [flights]);

  const list = useMemo(() => {
    const cap = maxPrice ?? Infinity;
    const out = flights.filter(
      (f) =>
        (stops === "any" || f.stops === Number(stops)) &&
        (airlines.length === 0 || airlines.includes(f.airline)) &&
        (times.length === 0 || BUCKETS.some((b) => times.includes(b.id) && b.test(f.departMin))) &&
        lowestFare(f, pax) <= cap,
    );
    const cmp: Record<Sort, (a: FlightResult, b: FlightResult) => number> = {
      price: (a, b) => lowestFare(a, pax) - lowestFare(b, pax),
      duration: (a, b) => a.durationMin - b.durationMin,
      depart: (a, b) => a.departMin - b.departMin,
      arrive: (a, b) => a.arrMin + a.dayOffset * 1440 - (b.arrMin + b.dayOffset * 1440),
    };
    return out.sort(cmp[sort]);
  }, [flights, stops, airlines, times, maxPrice, sort, pax]);

  const cheapestId = useMemo(() => flights.slice().sort((a, b) => lowestFare(a, pax) - lowestFare(b, pax))[0]?.id, [flights, pax]);
  const fastestId = useMemo(() => flights.slice().sort((a, b) => a.durationMin - b.durationMin)[0]?.id, [flights]);

  const select = (f: FlightResult, fare: FareId) => {
    const url = `/book?flight=${f.id}&date=${date}&fare=${fare}&pax=${pax}`;
    router.push(url);
  };

  const toggle = (arr: string[], v: string, set: (a: string[]) => void) =>
    set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const activeFilters = (stops !== "any" ? 1 : 0) + airlines.length + times.length + (maxPrice !== null ? 1 : 0);
  const reset = () => {
    setStops("any");
    setAirlines([]);
    setTimes([]);
    setMaxPrice(null);
  };

  const origin = airportByCode(from);
  const dest = airportByCode(to);

  const filters = (
    <div className="space-y-7">
      <div>
        <p className="label">Stops</p>
        <div className="grid grid-cols-3 gap-2">
          {([["any", "Any"], ["0", "Nonstop"], ["1", "1 stop"]] as const).map(([v, l]) => (
            <button key={v} onClick={() => setStops(v)} className={`rounded-xl border px-2 py-2 text-xs font-semibold transition ${stops === v ? "border-ink-900 bg-ink-900 text-cream-50" : "border-sand-300 hover:bg-cream-200"}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <p className="label !mb-0">Max price</p>
          <p className="text-sm font-semibold">{fmt(maxPrice ?? range.max)}</p>
        </div>
        <input
          type="range"
          className="w-full accent-[#85694a]"
          min={range.min === Infinity ? 0 : range.min}
          max={range.max}
          value={maxPrice ?? range.max}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
        />
        <div className="flex justify-between text-xs text-ink-700">
          <span>{fmt(range.min === Infinity ? 0 : range.min)}</span>
          <span>{fmt(range.max)}</span>
        </div>
      </div>
      <div>
        <p className="label">Departure time</p>
        <div className="space-y-1">
          {BUCKETS.map((b) => (
            <label key={b.id} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream-200">
              <input type="checkbox" className="h-4 w-4 accent-[#85694a]" checked={times.includes(b.id)} onChange={() => toggle(times, b.id, setTimes)} />
              <span className="text-sm font-medium">{b.label}</span>
              <span className="ml-auto text-xs text-ink-700">{b.sub}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="label">Airlines</p>
        <div className="space-y-1">
          {carriers.map((c) => (
            <label key={c} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-cream-200">
              <input type="checkbox" className="h-4 w-4 accent-[#85694a]" checked={airlines.includes(c)} onChange={() => toggle(airlines, c, setAirlines)} />
              <span className="text-sm font-medium">{AIRLINES[c]?.name}</span>
            </label>
          ))}
        </div>
      </div>
      {activeFilters > 0 && (
        <button onClick={reset} className="btn btn-ghost w-full !py-2.5">Clear all filters</button>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8">
      <SearchPanel key={`${from}/${to}/${date}/${pax}`} compact initial={valid ? { from, to, date, pax } : { from: airportByCode(from)?.code, to: airportByCode(to)?.code }} />

      {!valid ? (
        <div className="card mt-10 p-12 text-center">
          <h1 className="serif text-4xl">Let&apos;s find your flight</h1>
          <p className="mt-2 text-ink-700">Choose where you&apos;re going and when, and we&apos;ll show you the best options.</p>
        </div>
      ) : (
        <>
          <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow mb-2">{fmtDate(date, true)} · {pax} traveller{pax > 1 ? "s" : ""} · Demo flights</p>
              <h1 className="serif text-4xl font-medium sm:text-5xl">
                {origin?.city} <span className="text-taupe-500">→</span> {dest?.city}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="btn btn-ghost !py-2.5 lg:hidden" onClick={() => setShowFilters((s) => !s)}>
                Filters{activeFilters ? ` (${activeFilters})` : ""}
              </button>
              <div>
                <label className="sr-only" htmlFor="sort">Sort</label>
                <select id="sort" className="field !w-auto !rounded-full !py-2.5 pr-8 text-sm font-semibold" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="price">Cheapest first</option>
                  <option value="duration">Fastest first</option>
                  <option value="depart">Earliest departure</option>
                  <option value="arrive">Earliest arrival</option>
                </select>
              </div>
            </div>
          </div>

          {/* Flexible dates */}
          {strip.length > 0 && (
            <div data-lenis-prevent className="mt-6 flex gap-2 overflow-x-auto pb-2">
              {strip.map((s) => {
                const active = s.date === date;
                return (
                  <button
                    key={s.date}
                    onClick={() => router.push(`/flights?from=${from}&to=${to}&date=${s.date}&pax=${pax}`)}
                    className={`min-w-[7.5rem] flex-1 rounded-2xl border px-4 py-3 text-left transition ${active ? "border-ink-900 bg-ink-900 text-cream-50" : "border-sand-300 bg-cream-50 hover:bg-cream-200"}`}
                  >
                    <p className={`text-xs font-medium ${active ? "text-sand-300" : "text-ink-700"}`}>{fmtDate(s.date)}</p>
                    <p className="serif text-2xl font-medium">{fmt(s.minUsd)}</p>
                  </button>
                );
              })}
            </div>
          )}

          <div className="mt-6 grid gap-8 lg:grid-cols-[17rem_1fr]">
            <aside className={`${showFilters ? "block" : "hidden"} lg:block`}>
              <div className="card p-5 lg:sticky lg:top-24">
                <p className="serif mb-5 text-2xl font-medium">Refine</p>
                {filters}
              </div>
            </aside>

            <section className="space-y-4">
              {loading && Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-44" />)}
              {!loading && storageError && (
                <div className="card p-10 text-center">
                  <p className="notice-danger-text font-semibold">{storageError}</p>
                </div>
              )}
              {!loading && (
                <>
                  <p className="text-sm text-ink-700">
                    {list.length} flight{list.length === 1 ? "" : "s"} found
                    {flights.length > 0 && <> · Fastest {fmtDuration(Math.min(...flights.map((f) => f.durationMin)))}</>}
                  </p>
                  <AnimatePresence>
                    {list.map((f, i) => (
                      <FlightCard
                        key={f.id + date}
                        flight={f}
                        pax={pax}
                        index={i}
                        badge={f.id === cheapestId ? "Cheapest" : f.id === fastestId ? "Fastest" : undefined}
                        onSelect={(fare) => select(f, fare)}
                      />
                    ))}
                  </AnimatePresence>
                  {list.length === 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card p-12 text-center">
                      <p className="serif text-3xl">{flights.length ? "No flights match your filters" : "No flights are available on this date"}</p>
                      {flights.length > 0 && <button onClick={reset} className="btn btn-primary mt-5">Clear filters</button>}
                    </motion.div>
                  )}
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
