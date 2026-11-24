import { Suspense } from "react";
import { BookingClient } from "./BookingClient";

export const metadata = { title: "Your booking" };

export default function BookingPage() {
  return (
    <Suspense>
      <BookingClient />
    </Suspense>
  );
}
