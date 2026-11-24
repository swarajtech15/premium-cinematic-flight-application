"use client";

import { useId, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { useCurrency, useScroller } from "@/components/Providers";
import { SeatMap } from "@/components/SeatMap";
import { AirlineBadge } from "@/components/FlightCard";
import { bookingHref } from "@/lib/bookings";
import { confirmDemoBooking, demoFlightDetails, savedSeatDraft, saveSeatDraft, SeatConflictError } from "@/lib/demo-bookings";
import { useDemoState, type DemoState } from "@/lib/demo-storage";
import { useClientTime } from "@/lib/use-client-time";
import { AIRLINES, GENDER_OPTIONS, FARES, airportByCode, fareById, MAX_PAX, type FareId } from "@/lib/data";
import { computeTotals, fmtDate, fmtDuration, fmtTime, isFlightId, isValidDate, todayStr, seatFeeUsd } from "@/lib/flight-utils";

type Pax = { firstName: string; lastName: string; dob: string; gender: string; passportNumber: string; seat: string | null };
const emptyPax = (): Pax => ({ firstName: "", lastName: "", dob: "", gender: "", passportNumber: "", seat: null });
const STEPS = ["Passengers", "Seats", "Review & pay"];

export function BookClient() {
  const sp = useSearchParams();
  const { data, error } = useDemoState();
  const now = useClientTime();
  const rawId = sp.get("flight") ?? "";
  const flightId = /^\d+$/.test(rawId) ? Number(rawId) : NaN;
  const date = sp.get("date") ?? "";
  const paxCount = Math.min(MAX_PAX, Math.max(1, parseInt(sp.get("pax") ?? "1", 10) || 1));
  const fare = fareById(sp.get("fare") ?? "")?.id ?? "saver";

  if (error) return <BookingLoadError message={error} />;
  if (!isFlightId(flightId) || !isValidDate(date)) return <BookingLoadError message="This booking link is incomplete." />;
  if (!data || now === null) return <BookingLoading />;
  return <BookingForm key={`${flightId}/${date}/${paxCount}`} {...{ flightId, date, paxCount, data, now, fareId: fare }} />;
}

function BookingForm({ flightId, date, paxCount, data, now, fareId }: {
  flightId: number; date: string; paxCount: number; data: DemoState; now: number; fareId: FareId;
}) {
  const router = useRouter();
  const scroller = useScroller();
  const { currency, fmt } = useCurrency();
  const fare = fareById(fareId)!;
  const formId = useId();
  const draft = { flightId, date, fareId, paxCount };
  const details = useMemo(() => demoFlightDetails(data, flightId, date, now), [data, flightId, date, now]);
  const { flight, taken } = details;
  const [step, setStep] = useState(0);
  const [pax, setPax] = useState<Pax[]>(() => {
    const [firstName, ...lastName] = data.traveller.name.trim().split(/\s+/);
    const seats = savedSeatDraft(data, draft);
    return Array.from({ length: paxCount }, (_, i) => ({
      ...emptyPax(),
      ...(i === 0 ? { firstName, lastName: lastName.join(" "), dob: data.traveller.dob, passportNumber: data.traveller.passportNumber } : {}),
      seat: seats[i] ?? null,
    }));
  });
  const [active, setActive] = useState(0);
  const [email, setEmail] = useState(data.traveller.email);
  const [phone, setPhone] = useState(data.traveller.phone);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const seats = pax.map((p) => p.seat && !taken?.has(p.seat) ? p.seat : null);
  const unit = flight?.fares[fareId] ?? 0;
  const totals = computeTotals(unit, pax.length, seats);

  const updatePax = (i: number, patch: Partial<Pax>) => setPax((p) => p.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  const goto = (s: number) => {
    setStep(s);
    setError("");
    const el = document.getElementById("book-top");
    if (el) scroller.scrollTo(el);
  };

  const validatePassengers = () => {
    for (let i = 0; i < pax.length; i++) {
      const p = pax[i];
      if (!p.firstName.trim() || !p.lastName.trim()) return `Please enter the full name of passenger ${i + 1}.`;
      if (!isValidDate(p.dob) || p.dob > todayStr()) return `Please enter a valid date of birth of passenger ${i + 1}.`;
      if (!p.gender) return `Please select the gender of passenger ${i + 1}.`;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return "Please enter a valid contact email.";
    return "";
  };

  const next = () => {
    if (step === 0) {
      const e = validatePassengers();
      if (e) return setError(e);
      if (flight && flight.availableSeats[fare.cabin] < paxCount) return setError("Choose a fare with enough seats for your group.");
      setActive(Math.max(0, seats.findIndex((seat) => !seat)));
      goto(1);
    } else if (step === 1) {
      const miss = seats.findIndex((seat) => !seat);
      if (miss >= 0) {
        setActive(miss);
        return setError(`Please choose a seat for passenger ${miss + 1}.`);
      }
      goto(2);
    }
  };

  const pick = (seat: string) => {
    setError("");
    const holder = seats.indexOf(seat);
    if (holder >= 0 && holder !== active) return setActive(holder);
    const updated = seats.map((value, i) => i === active ? holder === active ? null : seat : value);
    setPax((passengers) => passengers.map((passenger, i) => ({ ...passenger, seat: updated[i] })));
    void saveSeatDraft(draft, updated).catch((error: Error) => setError(error.message));
    if (holder !== active) {
      const nextEmpty = updated.findIndex((value) => !value);
      if (nextEmpty >= 0) setActive(nextEmpty);
    }
  };

  const changeFare = (id: FareId) => {
    if (id === fareId) return;
    const saved = savedSeatDraft(data, { ...draft, fareId: id });
    setPax((passengers) => passengers.map((passenger, i) => ({ ...passenger, seat: saved[i] ?? null })));
    setError("");
    setAgree(false);
    const url = new URL(window.location.href);
    url.searchParams.set("fare", id);
    window.history.replaceState(null, "", url.toString());
  };

  const pay = async () => {
    if (busy) return;
    if (!agree) return setError("Please accept the fare conditions to continue.");
    if (seats.some((seat) => !seat)) {
      setStep(1);
      return setError("Seat availability changed. Please choose a seat for each passenger.");
    }
    setBusy(true);
    setError("");
    try {
      const reference = await confirmDemoBooking({
        ...draft, currency, contactEmail: email, contactPhone: phone, passengers: pax,
      });
      router.replace(bookingHref(reference, true));
    } catch (error) {
      if (error instanceof SeatConflictError) {
        setActive(0);
        setStep(1);
      }
      setError(error instanceof Error ? error.message : "Booking failed.");
      setBusy(false);
    }
  };

  if (!flight || !taken) return <BookingLoadError message={details.error ?? "Unable to load this flight."} />;

  const o = airportByCode(flight.origin)!;
  const d = airportByCode(flight.destination)!;
  const al = AIRLINES[flight.airline];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8">
      <div id="book-top" className="scroll-mt-28" />
      <Link href={`/flights?from=${flight.origin}&to=${flight.destination}&date=${date}&pax=${paxCount}`} className="text-sm font-semibold text-taupe-600 hover:underline">
        ← Back to results
      </Link>
      <h1 className="serif mt-3 text-4xl font-medium sm:text-6xl">Complete your booking</h1>

      {/* Stepper */}
      <ol className="mt-8 flex items-center gap-2 sm:gap-4">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-3">
            <button
              onClick={() => !busy && i < step && goto(i)}
              disabled={busy || i >= step}
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold transition ${i <= step ? "bg-ink-900 text-cream-50" : "border border-sand-400 text-taupe-600"}`}
            >
              {i < step ? "✓" : i + 1}
            </button>
            <span className={`hidden text-sm font-semibold sm:block ${i === step ? "text-ink-900" : "text-ink-700"}`}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-sand-300"><motion.span className="block h-full bg-taupe-600" animate={{ width: i < step ? "100%" : "0%" }} /></span>}
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_24rem]">
        <div>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.3 }}>
              {step === 0 && (
                <div className="space-y-6">
                  <div className="card p-5 sm:p-7">
                    <p className="label">Your fare</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {FARES.map((f) => (
                        <button
                          key={f.id}
                          disabled={flight.availableSeats[f.cabin] < paxCount}
                          onClick={() => changeFare(f.id)}
                          className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${f.id === fareId ? "border-ink-900 bg-cream-200/70 shadow-sm" : "border-sand-300 hover:bg-cream-200/50"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">{f.name}</span>
                            <span className="serif text-xl">{fmt(flight.fares[f.id])}</span>
                          </div>
                          <p className="mt-1 text-xs text-ink-700">
                            {f.checked === "Not included" ? "Cabin bag only" : `Bags: ${f.checked}`} · {f.refund ? "Refundable" : "Non-refundable"}
                            {flight.availableSeats[f.cabin] < paxCount && " · Unavailable for this group"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {pax.map((p, i) => (
                    <div key={i} className="card p-5 sm:p-7">
                      <p className="serif mb-5 text-2xl font-medium">Passenger {i + 1}{i === 0 && <span className="ml-2 text-sm font-sans font-medium text-taupe-600">(you)</span>}</p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="First name" value={p.firstName} onChange={(v) => updatePax(i, { firstName: v })} placeholder="As on passport" autoComplete="given-name" />
                        <Field label="Last name" value={p.lastName} onChange={(v) => updatePax(i, { lastName: v })} placeholder="As on passport" autoComplete="family-name" />
                        <Field label="Date of birth" type="date" value={p.dob} onChange={(v) => updatePax(i, { dob: v })} max={todayStr(now)} />
                        <div>
                          <label className="label" htmlFor={`${formId}-gender-${i}`}>Gender</label>
                          <select id={`${formId}-gender-${i}`} className="field" value={p.gender} onChange={(e) => updatePax(i, { gender: e.target.value })}>
                            <option value="">Select…</option>
                            {GENDER_OPTIONS.map((option) => <option key={option}>{option}</option>)}
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <Field label="Passport number (optional)" value={p.passportNumber} onChange={(v) => updatePax(i, { passportNumber: v })} placeholder="e.g. P1234567" />
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="card p-5 sm:p-7">
                    <p className="serif mb-5 text-2xl font-medium">Contact details</p>
                    <p className="mb-4 text-sm text-ink-700">Use fictional passenger and contact details for this demo.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
                      <Field label="Phone (optional)" type="tel" value={phone} onChange={setPhone} placeholder="+1 555 0100" autoComplete="tel" />
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="card p-5 sm:p-7">
                  <p className="serif text-3xl font-medium">Choose your seats</p>
                  <p className="mb-5 mt-1 text-sm text-ink-700">
                    Your {fare.name} fare is seated in the <b>{fare.cabin === "premium" ? "Premium Economy" : fare.cabin === "business" ? "Business" : "Economy"}</b> cabin.
                  </p>
                  <div className="mb-5 flex flex-wrap gap-2">
                    {pax.map((p, i) => (
                      <button
                        key={i}
                        onClick={() => setActive(i)}
                        className={`rounded-2xl border px-4 py-2 text-left text-sm transition ${active === i ? "border-ink-900 bg-ink-900 text-cream-50" : "border-sand-300 hover:bg-cream-200"}`}
                      >
                        <span className="block text-xs opacity-70">Passenger {i + 1}</span>
                        <span className="font-semibold">{p.firstName || "Traveller"} · {seats[i] ?? "No seat"}</span>
                      </button>
                    ))}
                  </div>
                  <SeatMap taken={taken} cabin={fare.cabin} selected={seats} active={active} onPick={pick} fmt={fmt} />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="card p-5 sm:p-7">
                    <p className="serif mb-4 text-2xl font-medium">Travellers & seats</p>
                    <ul className="divide-y divide-sand-300/60">
                      {pax.map((p, i) => (
                        <li key={i} className="flex items-center justify-between py-3 text-sm">
                          <span><b>{p.firstName} {p.lastName}</b> <span className="text-ink-700">· {p.gender}</span></span>
                          <span className="rounded-full bg-sand-300/50 px-3 py-1 text-xs font-bold text-taupe-600">Seat {seats[i] ?? "unavailable"}</span>
                        </li>
                      ))}
                    </ul>
                    <button className="mt-3 text-sm font-semibold text-taupe-600 hover:underline" disabled={busy} onClick={() => goto(0)}>Edit details</button>
                    <span className="mx-2 text-sand-400">·</span>
                    <button className="text-sm font-semibold text-taupe-600 hover:underline" disabled={busy} onClick={() => goto(1)}>Change seats</button>
                  </div>
                  <div className="card p-5 sm:p-7">
                    <div className="mb-5 flex items-center justify-between">
                      <p className="serif text-2xl font-medium">Payment</p>
                      <span className="rounded-full bg-sand-300/50 px-3 py-1 text-xs font-semibold text-taupe-600">Simulated checkout</span>
                    </div>
                    <dl className="grid gap-4 sm:grid-cols-2">
                      <div><dt className="label">Payment method</dt><dd className="field">Demo payment</dd></div>
                      <div><dt className="label">Simulated total</dt><dd className="field">{fmt(totals.totalCents / 100, true)}</dd></div>
                    </dl>
                    <p className="mt-4 text-xs text-ink-700">Confirm to simulate an approved payment and issue your demo boarding pass. No money is charged or card details collected.</p>
                    <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm">
                      <input type="checkbox" className="mt-1 h-4 w-4 accent-[#85694a]" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                      <span>I accept the {fare.name} fare conditions — {fare.refundText.toLowerCase()}; {fare.change.toLowerCase()}.</span>
                    </label>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {error && <p role="alert" className="mt-5 rounded-xl bg-[#f3ddd2] px-4 py-3 text-sm font-medium text-[#8a3f27]">{error}</p>}

          <div className="mt-6 flex items-center justify-between">
            {step > 0 ? <button className="btn btn-ghost" disabled={busy} onClick={() => goto(step - 1)}>Back</button> : <span />}
            {step < 2 ? (
              <button className="btn btn-primary !px-9" onClick={next}>Continue</button>
            ) : (
              <button className="btn btn-gold !px-9 !py-4" onClick={pay} disabled={busy}>
                {busy ? "Confirming…" : `Simulate payment ${fmt(totals.totalCents / 100, true)}`}
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <aside>
          <div className="card p-6 lg:sticky lg:top-24">
            <div className="flex items-center gap-3">
              <AirlineBadge code={flight.airline} size={38} />
              <div className="text-sm">
                <p className="font-semibold">{al?.name}</p>
                <p className="text-ink-700">{flight.flightNumber} · {fare.name}</p>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-[auto_1fr_auto] items-center gap-3">
              <div>
                <p className="serif text-3xl leading-none">{fmtTime(flight.departMin)}</p>
                <p className="mt-1 text-sm font-semibold">{o.code}</p>
              </div>
              <div className="text-center text-xs text-ink-700">
                <p>{fmtDuration(flight.durationMin)}</p>
                <div className="my-1.5 h-px bg-sand-400" />
                <p>{flight.stops ? `1 stop · ${flight.stopCode}` : "Nonstop"}</p>
              </div>
              <div className="text-right">
                <p className="serif text-3xl leading-none">{fmtTime(flight.arrMin)}{flight.dayOffset > 0 && <sup className="text-xs text-taupe-600"> +{flight.dayOffset}</sup>}</p>
                <p className="mt-1 text-sm font-semibold">{d.code}</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-ink-700">{fmtDate(date, true)} · {o.city} → {d.city}</p>

            <div className="my-5 h-px bg-sand-300/70" />
            <dl className="space-y-2 text-sm">
              <Row label={`Fare × ${pax.length}`} value={fmt(totals.subtotalCents / 100, true)} />
              <Row label="Taxes & airport fees" value={fmt(totals.taxCents / 100, true)} />
              {pax.some((p) => p.seat) && (
                <Row label="Seat selection" value={totals.seatFeesCents ? fmt(totals.seatFeesCents / 100, true) : "Included"} />
              )}
            </dl>
            {pax.filter((p) => p.seat && seatFeeUsd(p.seat) > 0).length > 0 && (
              <p className="mt-2 text-xs text-ink-700">Includes extra-legroom seats.</p>
            )}
            <div className="my-5 h-px bg-sand-300/70" />
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Total</span>
              <span className="serif text-4xl font-medium">{fmt(totals.totalCents / 100, true)}</span>
            </div>
            <p className="mt-2 text-xs text-ink-700">Prices shown in {currency}. Change currency from the top menu.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-700">{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}

function BookingLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-xl px-5 pb-24 pt-40 text-center">
      <h1 className="serif text-5xl">We couldn&apos;t load this flight</h1>
      <p role="alert" className="mt-3 text-ink-700">{message}</p>
      <Link href="/#search" className="btn btn-primary mt-8">Search again</Link>
    </div>
  );
}

function BookingLoading() {
  return (
    <div className="mx-auto max-w-5xl space-y-4 px-5 pb-24 pt-32">
      <div className="skeleton h-12 w-64" />
      <div className="skeleton h-96" />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  max?: string;
}) {
  const id = useId();
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="field" type={type} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
    </div>
  );
}
