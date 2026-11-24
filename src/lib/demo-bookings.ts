import { type BookingDTO } from "./bookings";
import { currencyByCode, fareById, GENDER_OPTIONS, MAX_PAX, type CabinId, type FareId } from "./data";
import { writeDemoState, type DemoState } from "./demo-storage";
import { scheduledFlight, scheduledRoute } from "./flight-schedule";
import {
  ALL_SEATS, SEAT_ROWS, addDays, arrival, computeTotals, departUtc, farePrices, isValidDate,
  priceUsd, seatFeeUsd, seatInfo, seededTaken, todayStr, type FlightBase, type FlightResult,
} from "./flight-utils";

export class SeatConflictError extends Error {}

type Reservations = Pick<DemoState, "bookings">;

function bookedSeats(state: Reservations | null, flightId: number, date: string, exclude?: string) {
  const taken = new Set(ALL_SEATS.filter((seat) => seededTaken(flightId, date, seat)));
  for (const booking of state?.bookings ?? []) {
    if (booking.status !== "confirmed" || booking.flight.id !== flightId ||
        booking.travelDate !== date || booking.reference === exclude) continue;
    for (const { seat } of booking.passengers) if (seat) taken.add(seat);
  }
  return taken;
}

function flightOption(state: Reservations | null, flight: FlightBase, date: string, now: number): FlightResult {
  const taken = bookedSeats(state, flight.id, date);
  const availableSeats: Record<CabinId, number> = { economy: 0, premium: 0, business: 0 };
  for (const row of SEAT_ROWS) {
    availableSeats[row.cabin] += row.letters.filter((letter) => !taken.has(`${row.row}${letter}`)).length;
  }
  return { ...flight, ...arrival(flight, date), fares: farePrices(flight, date, now), availableSeats };
}

export function searchDemoFlights(state: Reservations | null, from: string, to: string, date: string, pax: number, now: number) {
  const timetable = scheduledRoute(from, to);
  const onDate = (day: string) => timetable
    .filter((flight) => departUtc(day, flight.departMin, flight.origin) > now)
    .map((flight) => flightOption(state, flight, day, now))
    .filter((flight) => Object.values(flight.availableSeats).some((seats) => seats >= pax));
  return {
    flights: onDate(date),
    strip: [-3, -2, -1, 0, 1, 2, 3].map((offset) => addDays(date, offset))
      .filter(isValidDate)
      .flatMap((day) => {
        const flights = onDate(day);
        return flights.length ? [{ date: day, minUsd: Math.min(...flights.map((flight) => lowestFare(flight, pax))) }] : [];
      }),
  };
}

export function lowestFareId(flight: FlightResult, pax: number): FareId | undefined {
  return (["saver", "premium", "business"] as const).find((id) => flight.availableSeats[fareById(id)!.cabin] >= pax);
}

export function lowestFare(flight: FlightResult, pax: number) {
  const id = lowestFareId(flight, pax);
  return id ? flight.fares[id] : Infinity;
}

export function demoFlightDetails(state: Reservations | null, id: number, date: string, now: number) {
  const flight = scheduledFlight(id);
  if (!flight) return { error: "Flight not found." } as const;
  if (departUtc(date, flight.departMin, flight.origin) <= now) return { error: "This flight has already departed." } as const;
  return { flight: flightOption(state, flight, date, now), taken: bookedSeats(state, id, date) } as const;
}

export function demoBooking(state: DemoState, reference: string) {
  return state.bookings.find((booking) => booking.reference === reference);
}

export function clearDemoBookings() {
  return writeDemoState((state) => ({
    state: state.bookings.length ? { ...state, bookings: [] } : state,
    result: undefined,
  }));
}

export function demoTakenSeats(state: DemoState, booking: BookingDTO) {
  return bookedSeats(state, booking.flight.id, booking.travelDate, booking.reference);
}

type SeatDraft = { flightId: number; date: string; fareId: FareId; paxCount: number };

function draftKey({ flightId, date, fareId, paxCount }: SeatDraft) {
  return [flightId, date, fareId, paxCount].join("/");
}

export function savedSeatDraft(state: DemoState, input: SeatDraft) {
  const taken = bookedSeats(state, input.flightId, input.date);
  return (state.seatDrafts[draftKey(input)] ?? []).map((seat) => seat && !taken.has(seat) ? seat : null);
}

export function saveSeatDraft(input: SeatDraft, seats: (string | null)[]) {
  return writeDemoState((state) => {
    const key = draftKey(input);
    const seatDrafts = { ...state.seatDrafts };
    if (seats.some(Boolean)) seatDrafts[key] = seats;
    else delete seatDrafts[key];
    return { state: { ...state, seatDrafts }, result: undefined };
  });
}

type PassengerInput = Omit<BookingDTO["passengers"][number], "id" | "seatFeeCents">;

function validateSeats(seats: (string | null)[], cabin: CabinId, taken: Set<string>) {
  const used = new Set<string>();
  return seats.map((seat) => {
    if (!seat || seatInfo(seat)?.cabin !== cabin) {
      throw new Error("Choose a valid seat in your cabin for every passenger.");
    }
    if (taken.has(seat)) throw new SeatConflictError(`Seat ${seat} is now taken in this browser. Please choose another.`);
    if (used.has(seat)) throw new Error("Each passenger needs a different seat.");
    used.add(seat);
    return seat;
  });
}

const REFERENCE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newReference(state: DemoState) {
  let reference: string;
  do {
    reference = Array.from(crypto.getRandomValues(new Uint8Array(6)), (n) => REFERENCE_CHARS[n % REFERENCE_CHARS.length]).join("");
  } while (state.bookings.some((booking) => booking.reference === reference));
  return reference;
}

function displayPrice(total: number, currency: string, rate: number) {
  return Number((total / 100 * rate).toFixed(currency === "JPY" ? 0 : 2));
}

export function confirmDemoBooking(input: Omit<SeatDraft, "paxCount"> & {
  currency: string; contactEmail: string; contactPhone: string; passengers: PassengerInput[];
}) {
  return writeDemoState((state) => {
    const now = Date.now();
    const flight = scheduledFlight(input.flightId);
    const fare = fareById(input.fareId);
    const currency = currencyByCode(input.currency);
    if (!flight || !fare || !currency || !isValidDate(input.date)) throw new Error("Invalid demo booking details.");
    if (departUtc(input.date, flight.departMin, flight.origin) <= now) throw new Error("This flight has already departed.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail.trim())) throw new Error("Enter a valid contact email.");
    if (input.passengers.length < 1 || input.passengers.length > MAX_PAX) throw new Error(`Book between 1 and ${MAX_PAX} passengers.`);

    const seats = validateSeats(input.passengers.map((p) => p.seat), fare.cabin, bookedSeats(state, flight.id, input.date));
    const passengers = input.passengers.map((p, i) => {
      const firstName = p.firstName.trim();
      const lastName = p.lastName.trim();
      if (!firstName || !lastName || !isValidDate(p.dob) || p.dob > todayStr(now) ||
          !GENDER_OPTIONS.some((gender) => gender === p.gender)) throw new Error("Complete each passenger's details.");
      return {
        ...p,
        id: i + 1, firstName, lastName, seat: seats[i], seatFeeCents: seatFeeUsd(seats[i]) * 100,
        passportNumber: p.passportNumber.trim().slice(0, 60),
      };
    });
    const total = computeTotals(priceUsd(flight.basePriceUsd, flight.flightNumber, input.date, fare.id, now), passengers.length, seats);
    const reference = newReference(state);
    const booking: BookingDTO = {
      reference, flight, passengers, status: "confirmed", travelDate: input.date,
      fareId: fare.id, cabin: fare.cabin, currency: currency.code, rate: currency.rate, ...total,
      displayTotal: displayPrice(total.totalCents, currency.code, currency.rate),
      refundCents: 0, createdAt: new Date(now).toISOString(), cancelledAt: null,
      contactEmail: input.contactEmail.trim(), contactPhone: input.contactPhone.trim(),
    };
    const seatDrafts = { ...state.seatDrafts };
    delete seatDrafts[draftKey({ ...input, paxCount: passengers.length })];
    return { state: { ...state, bookings: [...state.bookings, booking], seatDrafts }, result: reference };
  });
}

function updateDemoBooking(reference: string, update: (booking: BookingDTO, state: DemoState) => BookingDTO) {
  return writeDemoState((state) => {
    const booking = demoBooking(state, reference);
    if (!booking) throw new Error("Booking not found in this browser.");
    const details = update(booking, state);
    const bookings = state.bookings.map((item) => item === booking ? details : item);
    return { state: { ...state, bookings }, result: undefined };
  });
}

function requireUpcoming(booking: BookingDTO) {
  if (booking.status !== "confirmed") throw new Error("This booking is no longer active.");
  if (departUtc(booking.travelDate, booking.flight.departMin, booking.flight.origin) <= Date.now()) {
    throw new Error("This flight has already departed.");
  }
}

export function changeDemoSeats(reference: string, selection: (string | null)[]) {
  return updateDemoBooking(reference, (booking, state) => {
    requireUpcoming(booking);
    if (selection.length !== booking.passengers.length) throw new Error("Choose one seat per passenger.");
    const seats = validateSeats(selection, booking.cabin, demoTakenSeats(state, booking));
    const passengers = booking.passengers.map((passenger, i) =>
      ({ ...passenger, seat: seats[i], seatFeeCents: seatFeeUsd(seats[i]) * 100 }));
    const seatFeesCents = passengers.reduce((sum, passenger) => sum + passenger.seatFeeCents, 0);
    const totalCents = booking.subtotalCents + booking.taxCents + seatFeesCents;
    return {
      ...booking, passengers, seatFeesCents, totalCents,
      displayTotal: displayPrice(totalCents, booking.currency, booking.rate),
    };
  });
}

export function cancelDemoBooking(reference: string) {
  return updateDemoBooking(reference, (booking) => {
    if (booking.status === "cancelled") return booking;
    requireUpcoming(booking);
    const refundCents = fareById(booking.fareId)?.refund ? booking.totalCents : booking.taxCents + booking.seatFeesCents;
    return { ...booking, status: "cancelled", refundCents, cancelledAt: new Date().toISOString() };
  });
}

