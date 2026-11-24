"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { BoardingPass } from "@/components/BoardingPass";
import { Modal } from "@/components/Modal";
import { SeatMap } from "@/components/SeatMap";
import { AirlineBadge } from "@/components/FlightCard";
import { BRAND_NAME, BRAND_SLUG } from "@/lib/brand";
import { AIRLINES, airportByCode, fareById, formatCurrency } from "@/lib/data";
import { addDays, arrival, departUtc, fmtDate, fmtDuration, fmtTime } from "@/lib/flight-utils";
import { cancelDemoBooking, changeDemoSeats, demoBooking, demoTakenSeats } from "@/lib/demo-bookings";
import { useDemoState } from "@/lib/demo-storage";
import { useClientTime } from "@/lib/use-client-time";
import { bookingPhase, type BookingDTO } from "@/lib/bookings";

function icsDate(ms: number) {
  return new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function BookingClient() {
  const sp = useSearchParams();
  const ref = (sp.get("ref") ?? "").trim().toUpperCase();
  const isNew = sp.get("new") === "1";
  const { data, error } = useDemoState();
  const valid = /^[A-Z2-9]{6}$/.test(ref);
  const booking = valid && data ? demoBooking(data, ref) : undefined;
  const message = error || (!valid ? "This booking link is incomplete." :
    data && !booking ? "This booking could not be found in this browser." : "");
  if (message) {
    return (
      <div className="mx-auto max-w-xl px-5 pb-24 pt-40 text-center">
        <h1 className="serif text-5xl">We couldn&apos;t load this booking</h1>
        <p role="alert" className="mt-3 text-ink-700">{message}</p>
        <Link href="/profile" className="btn btn-primary mt-8">Go to my trips</Link>
      </div>
    );
  }
  if (!booking || !data) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-5 pb-24 pt-32">
        <div className="skeleton h-14 w-80" />
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
    );
  }
  return <BookingDetails key={ref} booking={booking} pickerTaken={demoTakenSeats(data, booking)} notifyUpdates={data.preferences.bookingUpdates} isNew={isNew} />;
}

function BookingDetails({ booking, pickerTaken, notifyUpdates, isNew }: {
  booking: BookingDTO; pickerTaken: Set<string>; notifyUpdates: boolean; isNew: boolean;
}) {
  const [seatModal, setSeatModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [editSeats, setEditSeats] = useState<(string | null)[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [toast, setToast] = useState("");

  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const flash = (m: string) => {
    if (!notifyUpdates) return;
    clearTimeout(toastTimer.current);
    setToast(m);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  };

  const now = useClientTime();
  const phase = now === null ? booking.status : bookingPhase(booking, now);
  const upcoming = phase === "upcoming";
  const f = booking.flight;
  const o = airportByCode(f.origin)!;
  const d = airportByCode(f.destination)!;
  const arr = arrival(f, booking.travelDate);
  const fare = fareById(booking.fareId);
  const cancelled = booking.status === "cancelled";
  const money = (cents: number) => formatCurrency((cents / 100) * booking.rate, booking.currency, true);
  const refundCents = fare?.refund ? booking.totalCents : booking.taxCents + booking.seatFeesCents;

  const addToCalendar = () => {
    const start = departUtc(booking.travelDate, f.departMin, f.origin);
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      `PRODID:-//${BRAND_NAME}//Booking//EN`,
      "BEGIN:VEVENT",
      // Keep the original UID namespace so existing calendar imports still match.
      `UID:${booking.reference}@airlines.demo`,
      `DTSTAMP:${icsDate(Date.now())}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(start + f.durationMin * 60000)}`,
      `SUMMARY:Demo flight ${f.flightNumber} ${f.origin} → ${f.destination}`,
      `DESCRIPTION:Booking reference ${booking.reference}. ${o.city} to ${d.city}.`,
      `LOCATION:${o.name}`,
      "END:VEVENT",
      "END:VCALENDAR",
      "",
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${BRAND_SLUG}-${booking.reference}.ics`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openSeats = () => {
    setEditSeats(booking.passengers.map((p) => p.seat));
    setActive(0);
    setActionError("");
    setSeatModal(true);
  };

  const pick = (seat: string) => {
    const holder = editSeats.findIndex((s) => s === seat);
    if (holder >= 0 && holder !== active) return setActive(holder);
    if (holder === active) return;
    setEditSeats((s) => s.map((x, i) => (i === active ? seat : x)));
    const next = booking.passengers.findIndex((_, i) => i > active);
    if (next >= 0) setActive(next);
  };

  const updateBooking = async (action: () => Promise<void>, onSuccess: () => void) => {
    if (busy) return;
    setBusy(true);
    setActionError("");
    try {
      await action();
      onSuccess();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Couldn't update this booking.");
    } finally {
      setBusy(false);
    }
  };

  const saveSeats = () => updateBooking(() => changeDemoSeats(booking.reference, editSeats), () => {
    setSeatModal(false);
    flash("Your seats have been updated.");
  });

  const cancel = () => updateBooking(() => cancelDemoBooking(booking.reference), () => {
    setCancelModal(false);
    flash("Your booking has been cancelled.");
  });

  const dayAfter = addDays(booking.travelDate, arr.dayOffset);

  return (
    <div className="booking-details mx-auto max-w-5xl px-5 pb-24 pt-28 sm:px-8">
      {isNew && !cancelled && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center gap-5 rounded-3xl border border-gold/40 bg-gradient-to-r from-cream-200 to-cream-50 p-6 no-print">
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2, stiffness: 200 }} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gold text-2xl text-cream-50">✓</motion.span>
          <div>
            <p className="serif text-3xl font-medium">Your journey is confirmed</p>
            <p className="text-sm text-ink-700">Demo payment approved. Booking <b>{booking.reference}</b> is saved in this browser.</p>
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Booking reference</p>
          <h1 className="serif text-6xl font-medium tracking-[0.12em] sm:text-7xl">{booking.reference}</h1>
        </div>
        <span className={`rounded-full px-4 py-2 text-xs font-bold uppercase tracking-widest ${cancelled ? "bg-[#f3ddd2] text-[#8a3f27]" : upcoming ? "bg-[#dfe9d8] text-[#3f6a45]" : "bg-sand-300/60 text-taupe-600"}`}>
          {cancelled ? "Cancelled" : phase === "inFlight" ? "In flight" : phase === "completed" ? "Completed" : "Confirmed"}
        </span>
      </div>

      {/* Itinerary */}
      <section className="card mt-8 p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <AirlineBadge code={f.airline} size={36} />
          <span className="font-semibold">{AIRLINES[f.airline]?.name}</span>
          <span className="text-ink-700">{f.flightNumber} · {f.aircraft} · {fare?.name}</span>
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
          <div>
            <p className="serif text-5xl font-medium leading-none sm:text-6xl">{fmtTime(f.departMin)}</p>
            <p className="mt-2 font-semibold">{o.city} ({o.code})</p>
            <p className="text-sm text-ink-700">{o.name}</p>
            <p className="text-sm text-ink-700">{fmtDate(booking.travelDate, true)}</p>
          </div>
          <div className="text-center text-xs text-ink-700">
            <p>{fmtDuration(f.durationMin)}</p>
            <div className="my-2 h-px w-16 bg-sand-400 sm:w-32" />
            <p>{f.stops ? `1 stop · ${f.stopCode}` : "Nonstop"}</p>
          </div>
          <div className="text-right">
            <p className="serif text-5xl font-medium leading-none sm:text-6xl">{fmtTime(arr.arrMin)}</p>
            <p className="mt-2 font-semibold">{d.city} ({d.code})</p>
            <p className="text-sm text-ink-700">{d.name}</p>
            <p className="text-sm text-ink-700">{fmtDate(dayAfter, true)}</p>
          </div>
        </div>
        <p className="mt-5 text-xs text-ink-700">All times are local to each airport.</p>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="card p-6 sm:p-8">
          <p className="serif mb-4 text-2xl font-medium">Passengers</p>
          <ul className="divide-y divide-sand-300/60">
            {booking.passengers.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3 text-sm">
                <span className="font-semibold">{p.firstName} {p.lastName}</span>
                <span className="rounded-full bg-sand-300/50 px-3 py-1 text-xs font-bold text-taupe-600">Seat {p.seat ?? "—"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-ink-700">Contact: {booking.contactEmail}{booking.contactPhone && ` · ${booking.contactPhone}`}</p>
        </section>
        <section className="card p-6 sm:p-8">
          <p className="serif mb-4 text-2xl font-medium">Payment summary</p>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-700">Fare</dt><dd className="font-semibold">{money(booking.subtotalCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-700">Taxes & fees</dt><dd className="font-semibold">{money(booking.taxCents)}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-700">Seat selection</dt><dd className="font-semibold">{booking.seatFeesCents ? money(booking.seatFeesCents) : "Included"}</dd></div>
          </dl>
          <div className="my-4 h-px bg-sand-300/70" />
          <div className="flex items-baseline justify-between">
            <span className="eyebrow">Simulated total</span>
            <span className="serif text-4xl font-medium">{formatCurrency(booking.displayTotal, booking.currency, true)}</span>
          </div>
          <p className="mt-2 text-xs text-ink-700">Demo payment · {booking.currency}</p>
          {cancelled && <p className="mt-3 rounded-xl bg-[#f3ddd2] px-4 py-2 text-sm font-medium text-[#8a3f27]">Cancelled · {money(booking.refundCents)} simulated refund.</p>}
        </section>
      </div>

      {/* Actions */}
      <div className="no-print mt-6 flex flex-wrap gap-3">
        {!cancelled && (
          <>
            <button className="btn btn-primary" onClick={() => window.print()}>Print Boarding Pass</button>
            <button className="btn btn-ghost" onClick={addToCalendar}>Add to calendar</button>
          </>
        )}
        {!cancelled && upcoming && (
          <>
            <button className="btn btn-ghost" onClick={openSeats}>Change seats</button>
            <button className="btn btn-ghost !border-[#d3a090] notice-danger-text" onClick={() => { setActionError(""); setCancelModal(true); }}>Cancel booking</button>
          </>
        )}
        <Link href="/profile/?tab=history" className="btn btn-ghost">All trips</Link>
        {!cancelled && (
          <Link href={`/flights?from=${f.destination}&to=${f.origin}&date=${addDays(booking.travelDate, 7)}&pax=${booking.passengers.length}`} className="btn btn-gold">
            Book return flight
          </Link>
        )}
      </div>

      {/* Boarding passes */}
      <section className="mt-14">
        <div className="no-print mb-6">
          <p className="eyebrow mb-2">Digital boarding passes</p>
          <h2 className="serif text-4xl font-medium">Ready when you are</h2>
        </div>
        <div className="print-area space-y-6">
          {booking.passengers.map((p, i) => (
            <BoardingPass key={p.id} booking={booking} passenger={p} index={i} />
          ))}
        </div>
        {!cancelled && <p className="no-print serif mt-8 text-center text-3xl font-medium text-taupe-600">Wishing You a Happy Journey!</p>}
      </section>

      {/* Modals */}
      <Modal open={seatModal} onClose={() => { if (!busy) setSeatModal(false); }} title="Change your seats" wide>
        <div className="mb-4 flex flex-wrap gap-2">
          {booking.passengers.map((p, i) => (
            <button key={p.id} onClick={() => setActive(i)} className={`rounded-2xl border px-4 py-2 text-left text-sm transition ${active === i ? "border-ink-900 bg-ink-900 text-cream-50" : "border-sand-300 hover:bg-cream-200"}`}>
              <span className="block text-xs opacity-70">{p.firstName} {p.lastName}</span>
              <span className="font-semibold">{editSeats[i] ?? "—"}</span>
            </button>
          ))}
        </div>
        <SeatMap
          taken={pickerTaken}
          cabin={booking.cabin}
          selected={editSeats}
          active={active}
          onPick={pick}
          fmt={(usd) => formatCurrency(usd * booking.rate, booking.currency)}
        />
        {actionError && <p role="alert" className="mt-4 rounded-xl bg-[#f3ddd2] px-4 py-3 text-sm font-medium text-[#8a3f27]">{actionError}</p>}
        <div className="mt-5 flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={() => setSeatModal(false)} disabled={busy}>Close</button>
          <button className="btn btn-primary" onClick={saveSeats} disabled={busy}>{busy ? "Saving…" : "Save seats"}</button>
        </div>
      </Modal>

      <Modal open={cancelModal} onClose={() => { if (!busy) setCancelModal(false); }} title="Cancel this booking?">
        <p className="text-sm leading-relaxed text-ink-800">
          Your {fare?.name} fare is <b>{fare?.refundText.toLowerCase()}</b>. The simulated refund is <b>{money(refundCents)}</b>. Your seats will be released and boarding passes voided.
        </p>
        {actionError && <p role="alert" className="mt-4 rounded-xl bg-[#f3ddd2] px-4 py-3 text-sm font-medium text-[#8a3f27]">{actionError}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="btn btn-ghost" onClick={() => setCancelModal(false)} disabled={busy}>Keep booking</button>
          <button className="btn !bg-[#9a4b32] text-[#fffaf0] hover:!bg-[#853d27]" onClick={cancel} disabled={busy}>{busy ? "Cancelling…" : "Yes, cancel booking"}</button>
        </div>
      </Modal>

      {notifyUpdates && toast && (
        <motion.div role="status" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="no-print fixed bottom-6 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-ink-900 px-6 py-3 text-sm font-semibold text-cream-50 shadow-xl">
          {toast}
        </motion.div>
      )}
    </div>
  );
}
