import type { CabinId, FareId } from "./data";
import { departUtc, type FlightBase } from "./flight-utils";

export type BookingDTO = {
  reference: string;
  status: "confirmed" | "cancelled";
  fareId: FareId;
  cabin: CabinId;
  travelDate: string;
  currency: string;
  rate: number;
  subtotalCents: number;
  taxCents: number;
  seatFeesCents: number;
  totalCents: number;
  displayTotal: number;
  refundCents: number;
  contactEmail: string;
  contactPhone: string;
  createdAt: string;
  cancelledAt: string | null;
  flight: FlightBase;
  passengers: {
    id: number;
    firstName: string;
    lastName: string;
    dob: string;
    gender: string;
    passportNumber: string;
    seat: string | null;
    seatFeeCents: number;
  }[];
};

export function bookingHref(reference: string, isNew = false) {
  return `/booking/?ref=${encodeURIComponent(reference)}${isNew ? "&new=1" : ""}`;
}

export function bookingDeparture(booking: BookingDTO) {
  const { flight, travelDate } = booking;
  return departUtc(travelDate, flight.departMin, flight.origin);
}

export function bookingPhase(booking: BookingDTO, now: number) {
  if (booking.status === "cancelled") return "cancelled";
  const departure = bookingDeparture(booking);
  if (departure > now) return "upcoming";
  return departure + booking.flight.durationMin * 60_000 > now ? "inFlight" : "completed";
}
