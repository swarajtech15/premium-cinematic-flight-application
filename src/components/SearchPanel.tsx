"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AIRPORTS, airportByCode, MAX_PAX } from "@/lib/data";
import { useClientTime } from "@/lib/use-client-time";
import { addDays, isValidDate, todayStr } from "@/lib/flight-utils";

function AirportInput({ label, value, onChange, exclude }: { label: string; value: string; onChange: (c: string) => void; exclude?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const id = useId();
  const listId = `${id}-options`;
  const ref = useRef<HTMLDivElement>(null);
  const ap = airportByCode(value);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    return AIRPORTS.filter(
      (a) =>
        a.code !== exclude &&
        (!s || a.city.toLowerCase().includes(s) || a.code.toLowerCase().includes(s) || a.country.toLowerCase().includes(s) || a.name.toLowerCase().includes(s)),
    );
  }, [q, exclude]);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    setQ("");
  };

  return (
    <div ref={ref} className="relative">
      <label className="label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className="field"
        placeholder="City or airport"
        value={open ? q : ap ? `${ap.city} (${ap.code})` : ""}
        onFocus={() => {
          setOpen(true);
          setQ("");
          setHi(0);
        }}
        onChange={(e) => {
          setOpen(true);
          setQ(e.target.value);
          setHi(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => open && results.length ? Math.min(h + 1, results.length - 1) : 0);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setHi((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter" && open && results[hi]) {
            e.preventDefault();
            choose(results[hi].code);
          } else if (e.key === "Enter" && open) {
            e.preventDefault();
          } else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[hi] ? `${listId}-${results[hi].code}` : undefined}
        autoComplete="off"
      />
      <AnimatePresence>
        {open && (
          <motion.ul
            id={listId}
            role="listbox"
            aria-label={label}
            data-lenis-prevent
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="card absolute left-0 top-full z-40 mt-2 max-h-72 w-full sm:min-w-[17rem] overflow-y-auto p-1.5"
          >
            {results.length === 0 && <li className="px-3 py-3 text-sm text-ink-700">No airports found</li>}
            {results.map((a, i) => (
              <li key={a.code} role="presentation">
                <button
                  type="button"
                  role="option"
                  id={`${listId}-${a.code}`}
                  aria-selected={i === hi}
                  tabIndex={-1}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => choose(a.code)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left ${i === hi ? "bg-cream-200" : ""}`}
                >
                  <span>
                    <span className="block text-sm font-semibold">{a.city}</span>
                    <span className="block text-xs text-ink-700">
                      {a.name}, {a.country}
                    </span>
                  </span>
                  <span className="rounded-md bg-sand-300/50 px-2 py-0.5 text-xs font-bold tracking-wider text-taupe-600">{a.code}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function SearchPanel({
  initial,
  compact = false,
}: {
  initial?: { from?: string; to?: string; date?: string; pax?: number };
  compact?: boolean;
}) {
  const router = useRouter();
  const [from, setFrom] = useState(initial?.from ?? "JFK");
  const [to, setTo] = useState(initial?.to ?? "LHR");
  const now = useClientTime();
  const minDate = now === null ? "" : todayStr(now);
  const [selectedDate, setDate] = useState(initial?.date);
  const date = selectedDate ?? (minDate ? addDays(minDate, 21) : "");
  const [pax, setPax] = useState(initial?.pax ?? 1);
  const [error, setError] = useState("");
  const [swapped, setSwapped] = useState(0);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (from === to) return setError("Choose different departure and arrival airports.");
    if (!isValidDate(date)) return setError("Please select a departure date.");
    if (minDate && date < minDate) return setError("Departure date can't be in the past.");
    setError("");
    router.push(`/flights?from=${from}&to=${to}&date=${date}&pax=${pax}`);
  };

  return (
    <form onSubmit={submit} className={`card ${compact ? "p-4 sm:p-5" : "p-5 sm:p-7"}`} id={compact ? undefined : "search-form"}>
      <div className={`grid items-end gap-4 ${compact ? "lg:grid-cols-[1fr_auto_1fr_11rem_9rem_auto]" : "lg:grid-cols-[1fr_auto_1fr_11rem_9rem]"} md:grid-cols-2`}>
        <AirportInput label="From" value={from} onChange={setFrom} exclude={to} />
        <button
          type="button"
          aria-label="Swap airports"
          onClick={() => {
            setFrom(to);
            setTo(from);
            setSwapped((s) => s + 1);
          }}
          className="mx-auto hidden h-11 w-11 place-items-center rounded-full border border-sand-300 bg-cream-100 text-taupe-600 transition hover:bg-cream-200 lg:grid"
        >
          <motion.svg animate={{ rotate: swapped * 180 }} width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h10m0 0-3-3m3 3-3 3M14 12H4m0 0 3-3m-3 3 3 3" />
          </motion.svg>
        </button>
        <AirportInput label="To" value={to} onChange={setTo} exclude={from} />
        <div>
          <label className="label" htmlFor={`date-${compact}`}>Departure</label>
          <input id={`date-${compact}`} type="date" className="field" value={date} min={minDate || undefined} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Travellers</label>
          <div className="field flex items-center justify-between !py-[0.45rem]">
            <button type="button" aria-label="Fewer travellers" onClick={() => setPax((p) => Math.max(1, p - 1))} className="grid h-8 w-8 place-items-center rounded-full border border-sand-300 hover:bg-cream-200">−</button>
            <span className="text-sm font-semibold">{pax}</span>
            <button type="button" aria-label="More travellers" onClick={() => setPax((p) => Math.min(MAX_PAX, p + 1))} className="grid h-8 w-8 place-items-center rounded-full border border-sand-300 hover:bg-cream-200">+</button>
          </div>
        </div>
        {compact && (
          <button type="submit" className="btn btn-primary w-full md:col-span-2 lg:col-span-1">
            Update
          </button>
        )}
      </div>
      {!compact && (
        <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-700">Simulated flights · one-way fares · taxes included in the final price</p>
          <button type="submit" className="btn btn-gold w-full sm:w-auto">
            Search flights
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8h10m0 0L9 4m4 4-4 4" /></svg>
          </button>
        </div>
      )}
      {error && <p role="alert" className="notice-danger-text mt-3 text-sm font-medium">{error}</p>}
    </form>
  );
}
