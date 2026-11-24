import Link from "next/link";
import { Logo } from "./Navbar";

export function Footer() {
  return (
    <footer className="no-print border-t border-sand-300/70 bg-cream-200/60">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-700">
            Have your journey starting here. Quiet cabins, considered service and a booking experience as calm as the
            sky above the clouds.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-4">Explore</p>
          <ul className="space-y-2 text-sm text-ink-800">
            <li><Link href="/#search" className="hover:text-taupe-600">Search flights</Link></li>
            <li><Link href="/#destinations" className="hover:text-taupe-600">Destinations</Link></li>
            <li><Link href="/#experience" className="hover:text-taupe-600">The experience</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Demo Profile</p>
          <ul className="space-y-2 text-sm text-ink-800">
            <li><Link href="/profile" className="hover:text-taupe-600">My trips</Link></li>
            <li><Link href="/profile/?tab=settings" className="hover:text-taupe-600">Profile settings</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand-300/60 py-5 text-center text-xs text-ink-700">
        © {new Date().getFullYear()} Airlines. A demonstration booking experience — flights, fares and payments are simulated.
      </div>
    </footer>
  );
}
