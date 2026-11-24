"use client";

import { Fragment, useEffect, useRef } from "react";
import { motion } from "motion/react";
import type { CabinId } from "@/lib/data";
import { SEAT_ROWS, seatFeeUsd } from "@/lib/flight-utils";

const CABIN_LABEL: Record<CabinId, string> = { business: "Business", premium: "Premium Economy", economy: "Economy" };

export function SeatMap({
  taken,
  cabin,
  selected,
  active,
  onPick,
  fmt,
}: {
  taken: Set<string>;
  cabin: CabinId;
  /** seat held by each passenger (index = passenger) */
  selected: (string | null)[];
  active: number;
  onPick: (seat: string) => void;
  fmt: (usd: number) => string;
}) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = scroller.current;
    const target = box?.querySelector<HTMLElement>(`[data-cabin="${cabin}"]`);
    if (box && target) box.scrollTo({ top: Math.max(0, target.offsetTop - 70), behavior: "smooth" });
  }, [cabin]);

  const heldBy = (seat: string) => selected.findIndex((s) => s === seat);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-ink-800">
        <Legend cls="border-sand-400 bg-cream-50" label="Available" />
        <Legend cls="border-gold bg-gold/20" label={`Extra legroom (+${fmt(25)})`} />
        <Legend cls="border-ink-900 bg-ink-900" label="Your selection" />
        <Legend cls="border-sand-300 bg-sand-300/70" label="Taken" />
      </div>
      <div ref={scroller} role="region" aria-label="Aircraft seat map" data-lenis-prevent className="relative max-h-[36rem] overflow-y-auto rounded-3xl border border-sand-300 bg-cream-200/50 py-6">
        <div className="mx-auto w-full max-w-[19.5rem] rounded-t-[9rem] rounded-b-[2.5rem] border-2 border-sand-400 bg-cream-50 px-2 pb-8 pt-20 shadow-inner sm:max-w-[21rem] sm:px-5">
          <div className="mx-auto -mt-10 mb-8 h-10 w-24 rounded-t-full border border-sand-300 bg-cream-200/80 text-center text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-taupe-600">
            <span className="relative top-4">Cockpit</span>
          </div>
          {SEAT_ROWS.map((r, i) => {
            const header = r.cabin !== SEAT_ROWS[i - 1]?.cabin;
            const half = r.letters.length / 2;
            const left = r.letters.slice(0, half);
            const right = r.letters.slice(half);
            const big = r.cabin === "business";
            const size = big ? "h-9 w-9 sm:h-11 sm:w-11" : r.cabin === "premium" ? "h-7 w-7 sm:h-9 sm:w-9" : "h-7 w-7 sm:h-8 sm:w-8";
            const locked = r.cabin !== cabin;
            return (
              <Fragment key={r.row}>
                {header && (
                  <div data-cabin={r.cabin} className="mb-3 mt-6 flex items-center gap-3 first:mt-0">
                    <span className="h-px flex-1 bg-sand-300" />
                    <span className={`text-[0.65rem] font-bold uppercase tracking-[0.2em] ${r.cabin === cabin ? "text-taupe-600" : "text-sand-400"}`}>
                      {CABIN_LABEL[r.cabin]}
                      {r.cabin !== cabin ? " · other fare" : ""}
                    </span>
                    <span className="h-px flex-1 bg-sand-300" />
                  </div>
                )}
                {r.legroom && (
                  <div className="mb-1 flex justify-between px-1 text-[0.55rem] font-bold uppercase tracking-widest notice-accent-text">
                    <span>◄ Exit</span>
                    <span>Exit ►</span>
                  </div>
                )}
                <div className={`mb-1.5 flex items-center justify-center ${big ? "gap-2" : "gap-1.5"}`}>
                  {[left, right].map((group, gi) => (
                    <Fragment key={gi}>
                      <div className="flex gap-1 sm:gap-1.5">
                        {group.map((l) => {
                          const seat = `${r.row}${l}`;
                          const holder = heldBy(seat);
                          const isTaken = taken.has(seat);
                          const mine = holder === active;
                          const fee = seatFeeUsd(seat);
                          const disabled = locked || (isTaken && holder < 0);
                          return (
                            <motion.button
                              key={seat}
                              type="button"
                              whileTap={disabled ? undefined : { scale: 0.88 }}
                              whileHover={disabled ? undefined : { y: -2 }}
                              disabled={disabled}
                              aria-label={`Seat ${seat}${isTaken && holder < 0 ? ", taken" : ""}${fee ? `, extra legroom` : ""}`}
                              aria-pressed={holder >= 0}
                              onClick={() => onPick(seat)}
                              title={`${seat}${fee ? ` · extra legroom +${fmt(fee)}` : ""}`}
                              className={`${size} relative rounded-t-lg rounded-b-[0.3rem] border text-[0.6rem] font-bold transition-colors ${
                                holder >= 0
                                  ? `border-ink-900 bg-ink-900 text-cream-50 ${mine ? "ring-2 ring-gold ring-offset-2 ring-offset-cream-50" : "opacity-80"}`
                                  : locked
                                    ? "cursor-not-allowed border-sand-300/60 bg-cream-100 text-transparent opacity-40"
                                    : isTaken
                                      ? "cursor-not-allowed border-sand-300 bg-sand-300/70 text-taupe-500"
                                      : fee
                                        ? "border-gold bg-gold/20 text-taupe-600 hover:bg-gold/40"
                                        : "border-sand-400 bg-cream-50 text-taupe-600 hover:bg-sand-300/60"
                              }`}
                            >
                              {holder >= 0 ? `P${holder + 1}` : isTaken && !locked ? "×" : l}
                            </motion.button>
                          );
                        })}
                      </div>
                      {gi === 0 && <span className="w-5 text-center sm:w-6 text-[0.65rem] font-semibold text-taupe-500">{r.row}</span>}
                    </Fragment>
                  ))}
                </div>
              </Fragment>
            );
          })}
          <div className="mt-8 text-center text-[0.6rem] font-semibold uppercase tracking-[0.25em] text-sand-400">Rear</div>
        </div>
      </div>
    </div>
  );
}

function Legend({ cls, label }: { cls: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-4 w-4 rounded-t-md rounded-b-[0.2rem] border ${cls}`} />
      {label}
    </span>
  );
}
