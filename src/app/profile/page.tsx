import { Suspense } from "react";
import { ProfileClient } from "./ProfileClient";

export const metadata = { title: "Demo Profile" };

export default function ProfilePage() {
  return (
    <Suspense>
      <ProfileClient />
    </Suspense>
  );
}
