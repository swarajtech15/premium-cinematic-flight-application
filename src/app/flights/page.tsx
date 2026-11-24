import { Suspense } from "react";
import { FlightsClient } from "./FlightsClient";

export const metadata = { title: "Flights" };

export default function FlightsPage() {
  return (
    <Suspense>
      <FlightsClient />
    </Suspense>
  );
}
