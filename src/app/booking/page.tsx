import { Suspense } from "react";
import { BookingClient } from "./BookingClient";

export const metadata = { title: "Your booking — Airlines" };

export default function BookingPage() {
  return (
    <Suspense>
      <BookingClient />
    </Suspense>
  );
}
