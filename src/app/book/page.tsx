import { Suspense } from "react";
import { BookClient } from "./BookClient";

export const metadata = { title: "Book your flight" };

export default function BookPage() {
  return (
    <Suspense>
      <BookClient />
    </Suspense>
  );
}
