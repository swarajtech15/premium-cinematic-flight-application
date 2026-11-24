"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCurrency } from "./Providers";
import { AIRLINES, FARES, airportByCode, fareById, type FareId } from "@/lib/data";
import { lowestFareId } from "@/lib/demo-bookings";
import { fmtDuration, fmtTime, type FlightResult } from "@/lib/flight-utils";

export function AirlineBadge({ code, size = 44 }: { code: string; size?: number }) {
  const a = AIRLINES[code];
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold tracking-wider text-cream-50"
      style={{ width: size, height: size, background: a?.color ?? "#85694a", fontSize: size * 0.3 }}
    >
      {code}
    </span>
  );
}

export function Check({ ok }: { ok: boolean }) {
  return ok ? (
    <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-taupe-600"><path d="m3 7.5 2.5 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-sand-400"><path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
  );
}

export function FlightCard({
  flight,
  pax,
  index,
  badge,
  onSelect,
}: {
  flight: FlightResult;
  pax: number;
  index: number;
  badge?: string;
  onSelect: (fare: FareId) => void;
}) {
  const [open, setOpen] = useState(false);
  const { fmt } = useCurrency();
  const al = AIRLINES[flight.airline];
  const o = airportByCode(flight.origin)!;
  const d = airportByCode(flight.destination)!;
  const lowest = lowestFareId(flight, pax);
  if (!lowest) return null;
  const seatsLeft = flight.availableSeats[fareById(lowest)!.cabin];

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: Math.min(index, 8) * 0.05 }}
      className="card overflow-hidden"
    >
      <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-[1fr_auto] md:items-center">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <AirlineBadge code={flight.airline} size={36} />
            <div className="text-sm">
              <span className="font-semibold">{al?.name}</span>
              <span className="ml-2 text-ink-700">{flight.flightNumber} · {flight.aircraft}</span>
            </div>
            {badge && <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-taupe-600">{badge}</span>}
            {seatsLeft <= 6 && <span className="rounded-full bg-[#f3ddd2] px-3 py-1 text-xs font-semibold text-[#8a3f27]">Only {seatsLeft} left at this fare</span>}
          </div>
          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
            <div>
              <p className="serif text-4xl font-medium leading-none">{fmtTime(flight.departMin)}</p>
              <p className="mt-1 text-sm font-semibold">{o.code}</p>
              <p className="text-xs text-ink-700">{o.city}</p>
            </div>
            <div className="px-1 text-center">
              <p className="text-xs font-medium text-ink-700">{fmtDuration(flight.durationMin)}</p>
              <div className="relative my-2 h-px bg-sand-400">
                <span className="absolute -left-0.5 -top-[3px] h-[7px] w-[7px] rounded-full bg-taupe-600" />
                {flight.stops > 0 && <span className="absolute left-1/2 -top-[4px] h-[9px] w-[9px] -translate-x-1/2 rounded-full border-2 border-taupe-600 bg-cream-50" />}
                <span className="absolute -right-0.5 -top-[3px] h-[7px] w-[7px] rounded-full bg-taupe-600" />
              </div>
              <p className={`text-xs font-semibold ${flight.stops ? "notice-accent-text" : "notice-success-text"}`}>
                {flight.stops ? `1 stop · ${flight.stopCode}` : "Nonstop"}
              </p>
            </div>
            <div className="text-right">
              <p className="serif text-4xl font-medium leading-none">
                {fmtTime(flight.arrMin)}
                {flight.dayOffset !== 0 && <sup className="ml-1 text-xs font-semibold text-taupe-600">{flight.dayOffset > 0 ? "+" : ""}{flight.dayOffset}</sup>}
              </p>
              <p className="mt-1 text-sm font-semibold">{d.code}</p>
              <p className="text-xs text-ink-700">{d.city}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-sand-300/60 pt-4 md:flex-col md:items-end md:border-l md:border-t-0 md:pl-6 md:pt-0">
          <div className="md:text-right">
            <p className="eyebrow !text-[0.62rem]">From, per traveller</p>
            <p className="serif text-4xl font-medium">{fmt(flight.fares[lowest])}</p>
            {pax > 1 && <p className="text-xs text-ink-700">{fmt(flight.fares[lowest] * pax)} for {pax}</p>}
          </div>
          <div className="flex flex-wrap justify-end gap-2 md:flex-col md:items-stretch">
            <button className="btn btn-primary !px-6 !py-2.5" onClick={() => onSelect(lowest)}>Select</button>
            <button className="btn btn-ghost !px-6 !py-2.5" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
              {open ? "Hide fares" : "Compare fares"}
            </button>
          </div>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} className="overflow-hidden">
            <div className="grid gap-3 border-t border-sand-300/60 bg-cream-100/60 p-4 sm:grid-cols-2 sm:p-6 xl:grid-cols-4">
              {FARES.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className={`flex flex-col rounded-2xl border p-4 ${f.id === "flex" ? "border-gold bg-cream-50 shadow-[0_10px_30px_-18px_rgba(176,141,87,0.8)]" : "border-sand-300 bg-cream-50"}`}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{f.name}</p>
                      <p className="text-xs text-ink-700">{f.tagline}</p>
                    </div>
                    {f.id === "flex" && <span className="rounded-full bg-gold px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-cream-50">Popular</span>}
                  </div>
                  <p className="serif text-3xl font-medium">{fmt(flight.fares[f.id])}</p>
                  {pax > 1 && <p className="text-xs text-ink-700">{fmt(flight.fares[f.id] * pax)} total</p>}
                  <ul className="my-4 flex-1 space-y-2 text-xs text-ink-800">
                    <li className="flex gap-2"><Check ok />Cabin bag {f.carryOn}</li>
                    <li className="flex gap-2"><Check ok={f.checked !== "Not included"} />Checked bag: {f.checked}</li>
                    <li className="flex gap-2"><Check ok />{f.seat}</li>
                    <li className="flex gap-2"><Check ok={f.change === "Free changes"} />{f.change}</li>
                    <li className="flex gap-2"><Check ok={f.refund} />{f.refundText}</li>
                    <li className="flex gap-2"><Check ok />{f.meal}</li>
                    <li className="flex gap-2"><Check ok={f.lounge} />{f.lounge ? "Lounge access" : "No lounge access"}</li>
                    <li className="flex gap-2"><Check ok />{f.miles}</li>
                  </ul>
                  <button className={`btn w-full !py-2.5 ${f.id === "flex" ? "btn-gold" : "btn-primary"}`} disabled={flight.availableSeats[f.cabin] < pax} onClick={() => onSelect(f.id)}>
                    {flight.availableSeats[f.cabin] < pax ? "Unavailable for this group" : `Choose ${f.name.split(" ").pop()}`}
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}
