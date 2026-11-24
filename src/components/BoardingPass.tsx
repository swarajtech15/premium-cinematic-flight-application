"use client";

import qrcode from "qrcode-generator";
import { motion } from "motion/react";
import { BRAND_NAME } from "@/lib/brand";
import { AIRLINES, airportByCode, fareById } from "@/lib/data";
import { fmtDate, fmtTime, gateFor, hash, seatInfo, type FlightBase } from "@/lib/flight-utils";
import type { BookingDTO } from "@/lib/bookings";
import { AirlineBadge } from "./FlightCard";

function Barcode({ seed }: { seed: string }) {
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  let h = hash(seed);
  while (x < 190) {
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    const w = 1 + (h % 4);
    bars.push({ x, w });
    x += w + 1 + ((h >>> 5) % 3);
  }
  return (
    <svg viewBox="0 0 200 46" className="h-11 w-full" preserveAspectRatio="none" aria-label="Decorative demo barcode">
      {bars.map((b, i) => (
        <rect key={i} x={b.x} y="0" width={b.w} height="46" fill="#2f2419" />
      ))}
    </svg>
  );
}

function BoardingQr({ value }: { value: string }) {
  const qr = qrcode(0, "M");
  qr.addData(value);
  qr.make();

  const size = qr.getModuleCount();
  const quietZone = 4;
  const dimension = size + 2 * quietZone;
  const modules: string[] = [];
  for (let row = 0; row < size; row++) {
    for (let column = 0; column < size; column++) {
      if (qr.isDark(row, column)) modules.push(`M${column + quietZone} ${row + quietZone}h1v1h-1z`);
    }
  }

  return (
    <svg viewBox={`0 0 ${dimension} ${dimension}`} className="h-24 w-24" shapeRendering="crispEdges" role="img" aria-label="Demo boarding pass QR code">
      <rect width={dimension} height={dimension} fill="#fdfaf4" />
      <path d={modules.join("")} fill="#2f2419" />
    </svg>
  );
}

export function BoardingPass({
  booking,
  passenger,
  index,
}: {
  booking: Pick<BookingDTO, "reference" | "travelDate" | "fareId" | "status"> & { flight: FlightBase };
  passenger: { firstName: string; lastName: string; seat: string | null };
  index: number;
}) {
  const f = booking.flight;
  const o = airportByCode(f.origin)!;
  const d = airportByCode(f.destination)!;
  const al = AIRLINES[f.airline];
  const fare = fareById(booking.fareId);
  const cabin = passenger.seat ? seatInfo(passenger.seat)?.cabin : fare?.cabin;
  const zone = cabin === "business" ? "1" : cabin === "premium" ? "2" : String(3 + (hash(passenger.seat ?? "") % 2));
  const gate = gateFor(booking.reference, f.flightNumber);
  const boarding = fmtTime(f.departMin - 40);
  const seq = String(((hash(booking.reference) + index) % 180) + 1).padStart(3, "0");
  const void_ = booking.status === "cancelled";
  const name = `${passenger.lastName}/${passenger.firstName}`.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateX: -8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: 0.15 * index, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className={`relative flex flex-col overflow-hidden rounded-[1.6rem] border border-sand-300 bg-cream-50 shadow-[0_24px_50px_-26px_rgba(90,66,40,0.5)] md:flex-row ${void_ ? "grayscale" : ""}`}
    >
      {/* Notches */}
      <span className="absolute -top-3 left-[calc(100%-13.5rem)] hidden h-6 w-6 rounded-full bg-cream-100 md:block" />
      <span className="absolute -bottom-3 left-[calc(100%-13.5rem)] hidden h-6 w-6 rounded-full bg-cream-100 md:block" />

      <div className="flex-1 p-5 sm:p-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AirlineBadge code={f.airline} size={34} />
            <div>
              <p className="text-sm font-semibold leading-tight">{al?.name}</p>
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-taupe-600">Demo boarding pass</p>
            </div>
          </div>
          <span className="rounded-full bg-ink-900 px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest text-cream-50">
            {cabin === "premium" ? "Premium Economy" : cabin ?? "economy"}
          </span>
        </div>

        <div className="my-6 grid grid-cols-[auto_1fr_auto] items-center gap-4">
          <div>
            <p className="serif text-6xl font-medium leading-none">{o.code}</p>
            <p className="mt-1 text-xs text-ink-700">{o.city}</p>
          </div>
          <div className="relative flex items-center">
            <span className="h-px flex-1 border-t border-dashed border-sand-400" />
            <svg width="26" height="26" viewBox="0 0 32 32" className="mx-2 text-taupe-600" fill="currentColor"><path d="M6 18.5 24.5 9.5c1.2-.6 2.3.5 1.7 1.7L17 23l-2.2-4.6L6 18.5Z" /></svg>
            <span className="h-px flex-1 border-t border-dashed border-sand-400" />
          </div>
          <div className="text-right">
            <p className="serif text-6xl font-medium leading-none">{d.code}</p>
            <p className="mt-1 text-xs text-ink-700">{d.city}</p>
          </div>
        </div>

        <div className="mb-5">
          <p className="label !mb-0.5">Passenger</p>
          <p className="text-lg font-bold tracking-wide">{name}</p>
        </div>

        <dl className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {[
            ["Flight", f.flightNumber],
            ["Date", fmtDate(booking.travelDate, true)],
            ["Departs", fmtTime(f.departMin)],
            ["Boards", boarding],
            ["Gate", gate],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="label !mb-0.5 !text-[0.6rem]">{k}</dt>
              <dd className="text-sm font-bold">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Perforation */}
      <div className="mx-6 border-t-2 border-dashed border-sand-300 md:mx-0 md:my-6 md:border-l-2 md:border-t-0" />

      <div className="flex w-full shrink-0 items-center justify-between gap-5 p-5 md:w-[13.5rem] md:flex-col md:justify-between md:py-7">
        <div className="grid grid-cols-3 gap-3 text-center md:w-full">
          <div>
            <p className="label !mb-0.5 !text-[0.6rem]">Seat</p>
            <p className="serif text-4xl font-medium leading-none text-ink-900">{passenger.seat ?? "—"}</p>
          </div>
          <div>
            <p className="label !mb-0.5 !text-[0.6rem]">Zone</p>
            <p className="serif text-4xl font-medium leading-none">{zone}</p>
          </div>
          <div>
            <p className="label !mb-0.5 !text-[0.6rem]">Seq</p>
            <p className="serif text-4xl font-medium leading-none">{seq}</p>
          </div>
        </div>
        <div className="hidden w-full md:block"><Barcode seed={`${booking.reference}${seq}`} /></div>
        <div className="flex flex-col items-center gap-1">
          <BoardingQr value={`${BRAND_NAME} DEMO${void_ ? " VOID" : ""}\n${booking.reference} ${f.flightNumber} ${f.origin}-${f.destination}\n${booking.travelDate} ${fmtTime(f.departMin)} ${passenger.seat ?? "-"}`} />
          <p className="text-[0.6rem] font-bold tracking-[0.3em] text-taupe-600">{booking.reference}</p>
        </div>
      </div>

      {void_ && (
        <div className="absolute inset-0 grid place-items-center bg-cream-50/60">
          <span className="-rotate-12 rounded-xl border-4 border-[#9a4b32] px-8 py-2 text-5xl font-black tracking-widest text-[#9a4b32]">VOID</span>
        </div>
      )}
    </motion.div>
  );
}
