"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { useCurrency } from "@/components/Providers";
import { AirlineBadge } from "@/components/FlightCard";
import { AIRLINES, airportByCode, fareById, formatCurrency } from "@/lib/data";
import { arrival, fmtDate, fmtTime } from "@/lib/flight-utils";
import { bookingDeparture, bookingHref, bookingPhase, type BookingDTO } from "@/lib/bookings";
import { DEMO_PROFILE_NAME } from "@/lib/demo-profile";
import { ProfileSettings } from "./ProfileSettings";
import { useDemoState } from "@/lib/demo-storage";
import { useClientTime } from "@/lib/use-client-time";

type Tab = "upcoming" | "completed" | "cancelled" | "history" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "completed", label: "Completed trips" },
  { id: "cancelled", label: "Cancelled" },
  { id: "history", label: "Booking history" },
  { id: "settings", label: "Settings" },
];

function Countdown({ diff }: { diff: number }) {
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return (
    <div className="flex gap-3">
      {[["Days", days], ["Hours", hours], ["Mins", mins]].map(([l, v]) => (
        <div key={l} className="min-w-[4.2rem] rounded-2xl bg-cream-50/10 px-3 py-2 text-center backdrop-blur">
          <p className="serif text-4xl font-medium leading-none">{String(v).padStart(2, "0")}</p>
          <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-sand-300">{l}</p>
        </div>
      ))}
    </div>
  );
}

function TripCard({ b, index, now }: { b: BookingDTO; index: number; now: number }) {
  const f = b.flight;
  const o = airportByCode(f.origin)!;
  const d = airportByCode(f.destination)!;
  const arr = arrival(f, b.travelDate);
  const phase = bookingPhase(b, now);
  const cancelled = phase === "cancelled";
  return (
    <motion.article initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }} className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-sm">
          <AirlineBadge code={f.airline} size={34} />
          <div>
            <p className="font-semibold">{AIRLINES[f.airline]?.name} · {f.flightNumber}</p>
            <p className="text-xs text-ink-700">{fareById(b.fareId)?.name} · {b.passengers.length} traveller{b.passengers.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <span className="rounded-full bg-sand-300/50 px-3 py-1 text-xs font-bold tracking-[0.2em] text-taupe-600">{b.reference}</span>
      </div>
      <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-4">
        <div>
          <p className="serif text-4xl font-medium leading-none">{o.code}</p>
          <p className="mt-1 text-xs text-ink-700">{fmtTime(f.departMin)} · {o.city}</p>
        </div>
        <div className="flex items-center"><span className="h-px flex-1 bg-sand-400" /><span className="mx-2 text-taupe-600">✈</span><span className="h-px flex-1 bg-sand-400" /></div>
        <div className="text-right">
          <p className="serif text-4xl font-medium leading-none">{d.code}</p>
          <p className="mt-1 text-xs text-ink-700">{fmtTime(arr.arrMin)} · {d.city}</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-sand-300/60 pt-4">
        <div className="text-sm">
          <p className="font-semibold">{fmtDate(b.travelDate, true)}</p>
          <p className="text-xs text-ink-700">
            Seats {b.passengers.map((p) => p.seat ?? "—").join(", ")} · {formatCurrency(b.displayTotal, b.currency, true)}
            {cancelled && <span className="notice-danger-text ml-2 font-semibold">Cancelled</span>}
            {phase === "completed" && <span className="ml-2 font-semibold">Completed</span>}
            {phase === "inFlight" && <span className="ml-2 font-semibold">In flight</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={bookingHref(b.reference)} className="btn btn-primary !px-5 !py-2.5">{cancelled ? "View" : "Manage & boarding passes"}</Link>
        </div>
      </div>
    </motion.article>
  );
}

export function ProfileClient() {
  const sp = useSearchParams();
  const { fmt } = useCurrency();
  const { data, error } = useDemoState();
  const now = useClientTime();
  const queryTab = sp.get("tab");
  const tab = queryTab === "profile" ? "settings" : queryTab === "past" ? "completed" :
    TABS.find((item) => item.id === queryTab)?.id ?? "upcoming";
  const bookings = data?.bookings;
  const tabStrip = useRef<HTMLDivElement>(null);
  const ready = !!data && now !== null;
  useEffect(() => {
    const strip = tabStrip.current;
    const active = strip?.querySelector('[aria-current="page"]');
    if (!strip || !active) return;
    const stripBounds = strip.getBoundingClientRect();
    const bounds = active.getBoundingClientRect();
    if (bounds.left < stripBounds.left) strip.scrollLeft += bounds.left - stripBounds.left;
    else if (bounds.right > stripBounds.right) strip.scrollLeft += bounds.right - stripBounds.right;
  }, [tab, ready]);
  const groups = useMemo(() => {
    if (now === null || !bookings) return { upcoming: [], completed: [], cancelled: [], history: [] };
    const history = bookings.slice().reverse();
    return {
      upcoming: history.filter((b) => bookingPhase(b, now) === "upcoming").sort((a, b) => bookingDeparture(a) - bookingDeparture(b)),
      completed: history.filter((b) => bookingPhase(b, now) === "completed").sort((a, b) => bookingDeparture(b) - bookingDeparture(a)),
      cancelled: history.filter((b) => b.status === "cancelled"),
      history,
    };
  }, [bookings, now]);

  if (error) return <p role="alert" className="notice-danger-text mx-auto max-w-5xl px-5 pb-24 pt-32">{error}</p>;
  if (!data || now === null) return <div className="mx-auto max-w-5xl px-5 pb-24 pt-32"><div className="skeleton h-72" /></div>;

  const nextTrip = groups.upcoming[0];
  const nextTripIn = nextTrip ? bookingDeparture(nextTrip) - now : Infinity;
  const spent = data.bookings.filter((b) => b.status === "confirmed").reduce((sum, b) => sum + b.totalCents, 0);

  const changeTab = (value: Tab) => {
    window.history.replaceState(null, "", value === "upcoming" ? "/profile/" : `/profile/?tab=${value}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-28 sm:px-8">
      <div className="flex items-center gap-4 sm:gap-6">
        <span aria-hidden="true" className="serif grid h-14 w-14 shrink-0 place-items-center rounded-full border border-sand-400 bg-cream-200 text-2xl font-semibold text-taupe-600 sm:h-20 sm:w-20 sm:text-4xl">DP</span>
        <div>
          <h1 className="serif text-5xl font-medium sm:text-6xl">{DEMO_PROFILE_NAME}</h1>
          <p className="mt-2 text-sm text-ink-700">Your trips and preferences are saved in this browser.</p>
        </div>
      </div>

      {/* Next trip hero */}
      {nextTrip ? (
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="inverse-panel relative mt-8 overflow-hidden rounded-[2rem] bg-ink-900 p-7 text-cream-50 sm:p-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/hero.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/80 to-transparent" />
          <div className="relative flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow !text-sand-400">Your next journey</p>
              <p className="serif mt-2 text-5xl font-medium sm:text-6xl">
                {airportByCode(nextTrip.flight.origin)?.city} <span className="text-gold">→</span> {airportByCode(nextTrip.flight.destination)?.city}
              </p>
              <p className="mt-2 text-sm text-sand-300">{fmtDate(nextTrip.travelDate, true)} · {fmtTime(nextTrip.flight.departMin)} · {nextTrip.flight.flightNumber}</p>
              {data.preferences.tripReminders && nextTripIn <= 86400000 && (
                <p className="mt-3 font-semibold" role="status">Your demo flight departs within 24 hours.</p>
              )}
              <Link href={bookingHref(nextTrip.reference)} className="btn btn-gold mt-6 !py-3">View boarding passes</Link>
            </div>
            <Countdown diff={nextTripIn} />
          </div>
        </motion.div>
      ) : (
        <div className="card mt-8 flex flex-wrap items-center justify-between gap-4 p-7">
          <div>
            <p className="serif text-3xl font-medium">No upcoming trips</p>
            <p className="text-sm text-ink-700">Your next adventure is just a search away.</p>
          </div>
          <Link href="/#search" className="btn btn-gold">Search flights</Link>
        </div>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { l: "Trips booked", v: String(data.bookings.length) },
          { l: "Upcoming", v: String(groups.upcoming.length) },
          { l: "Demo total", v: fmt(spent / 100) },
        ].map((s) => (
          <div key={s.l} className="card min-w-0 px-2 py-4 text-center sm:p-5">
            <p className="serif break-words text-2xl font-medium sm:text-4xl">{s.v}</p>
            <p className="eyebrow mt-1 !text-[0.62rem]">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div ref={tabStrip} data-lenis-prevent className="mt-10 flex gap-1 overflow-x-auto border-b border-sand-300">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-current={tab === t.id ? "page" : undefined} onClick={() => changeTab(t.id)} className={`relative whitespace-nowrap px-3.5 py-3 text-sm font-semibold transition lg:px-5 ${tab === t.id ? "text-ink-900" : "text-ink-700 hover:text-ink-900"}`}>
            {t.label}
            {t.id !== "settings" && <span className="ml-2 rounded-full bg-sand-300/60 px-2 py-0.5 text-[0.65rem]">{groups[t.id].length}</span>}
            {tab === t.id && <motion.span layoutId="tab-underline" className="absolute inset-x-3 -bottom-px h-0.5 bg-ink-900" />}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "settings" ? <ProfileSettings data={data} /> : (
          <div className="space-y-4">
            {groups[tab].length === 0 ? (
              <div className="card p-8 text-center sm:p-12">
                <p className="serif text-3xl">{
                  { upcoming: "Nothing booked yet", completed: "No completed trips", cancelled: "No cancelled bookings", history: "No booking history" }[tab]
                }</p>
                {tab === "upcoming" && <Link href="/#search" className="btn btn-primary mt-5">Find a flight</Link>}
              </div>
            ) : (
              groups[tab].map((booking, i) => <TripCard key={booking.reference} b={booking} index={i} now={now} />)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
