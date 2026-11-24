"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCurrency } from "./Providers";
import { BRAND_NAME } from "@/lib/brand";
import { DEMO_PROFILE_NAME } from "@/lib/demo-profile";
import { CURRENCIES, currencyByCode } from "@/lib/data";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 sm:gap-2.5 ${className}`}>
      <svg width="30" height="30" className="h-6 w-6 shrink-0 sm:h-[30px] sm:w-[30px]" viewBox="0 0 32 32" fill="none" aria-hidden>
        <circle cx="16" cy="16" r="15" stroke="#a68b67" strokeWidth="1.2" />
        <path d="M6 18.5 24.5 9.5c1.2-.6 2.3.5 1.7 1.7L17 23l-2.2-4.6L6 18.5Z" fill="var(--color-ink-800)" />
        <path d="m14.8 18.4 4-4.2" stroke="var(--color-cream-100)" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
      <span className="serif brand-wordmark whitespace-nowrap text-[1.3rem] font-medium leading-none tracking-[0.035em] sm:text-[1.65rem]">{BRAND_NAME}</span>
    </span>
  );
}

function useOutside(ref: React.RefObject<HTMLElement | null>, onOut: () => void) {
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  });
}

function CurrencyMenu() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useOutside(ref, () => setOpen(false));
  const cur = currencyByCode(currency)!;
  return (
    <div ref={ref} className="relative" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button
        ref={trigger}
        type="button"
        aria-label={`Currency, ${cur.code}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-full border border-sand-300 bg-cream-50/70 px-2 py-2 text-xs sm:px-3.5 sm:text-sm font-semibold text-ink-800 transition hover:bg-cream-200"
      >
        <span className="text-taupe-600">{cur.symbol}</span>
        {cur.code}
        <svg width="10" height="10" viewBox="0 0 10 10" className={`transition ${open ? "rotate-180" : ""}`}>
          <path d="m2 3.5 3 3 3-3" stroke="currentColor" fill="none" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            data-lenis-prevent
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="card fixed right-5 top-[4.5rem] z-50 max-h-80 w-64 max-w-[calc(100vw-2.5rem)] overflow-y-auto p-2 sm:absolute sm:right-0 sm:top-12"
          >
            {CURRENCIES.map((c) => (
              <li key={c.code}>
                <button
                  role="option"
                  aria-selected={c.code === currency}
                  onClick={async () => {
                    setError("");
                    try {
                      await setCurrency(c.code);
                      setOpen(false);
                      trigger.current?.focus();
                    } catch (error) {
                      setError(error instanceof Error ? error.message : "Unable to save this currency.");
                    }
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-cream-200 ${
                    c.code === currency ? "bg-cream-200 font-semibold" : ""
                  }`}
                >
                  <span>
                    <span className="inline-block w-10 font-semibold">{c.code}</span>
                    <span className="text-ink-700">{c.name}</span>
                  </span>
                  <span className="text-taupe-600">{c.symbol}</span>
                </button>
              </li>
            ))}
            {error && <li role="alert" className="px-3 py-2 notice-danger-text text-xs">{error}</li>}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        trigger.current?.focus();
      }
    }}>
      <button
        ref={trigger}
        type="button"
        aria-label={DEMO_PROFILE_NAME}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-sand-300 bg-cream-50/70 py-1.5 pl-1.5 pr-1.5 transition hover:bg-cream-200 sm:pr-3.5"
      >
        <span aria-hidden="true" className="grid h-7 w-7 place-items-center rounded-full bg-ink-900 text-xs font-semibold text-cream-50 sm:h-8 sm:w-8">DP</span>
        <span className="hidden whitespace-nowrap text-sm font-semibold sm:block">{DEMO_PROFILE_NAME}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="card absolute right-0 top-12 z-50 w-52 p-2"
          >
            <Link href="/profile" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-cream-200">My trips</Link>
            <Link href="/profile/?tab=settings" onClick={() => setOpen(false)} className="block rounded-xl px-3 py-2 text-sm hover:bg-cream-200">Profile settings</Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const links = [
    { label: "Search", href: "/#search" },
    { label: "Destinations", href: "/#destinations" },
    { label: "Experience", href: "/#experience" },
    { label: "My trips", href: "/profile" },
  ];
  return (
    <header
      className={`no-print fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled || menu ? "border-b border-sand-300/60 bg-cream-100/85 backdrop-blur-xl" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between px-3 sm:px-8">
        <Link href="/" aria-label={`${BRAND_NAME} home`} onClick={() => setMenu(false)}>
          <Logo className="max-sm:[&_.brand-wordmark]:text-[clamp(0.78rem,4vw,1.3rem)]" />
        </Link>
        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="group relative text-sm font-medium text-ink-800">
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-taupe-600 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <CurrencyMenu />
          <ProfileMenu />
          <button
            className="grid h-9 w-9 place-items-center rounded-full border border-sand-300 sm:h-10 sm:w-10 lg:hidden"
            onClick={() => setMenu((m) => !m)}
            aria-label="Toggle menu"
            aria-expanded={menu}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {menu ? <path d="M3 3l10 10M13 3 3 13" /> : <path d="M2 4h12M2 8h12M2 12h12" />}
            </svg>
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden lg:hidden"
          >
            <div className="flex flex-col gap-1 px-5 pb-5">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={() => setMenu(false)} className="rounded-xl px-3 py-3 text-base font-medium hover:bg-cream-200">
                  {l.label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
