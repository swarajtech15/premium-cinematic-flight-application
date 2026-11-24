"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useScroll, useTransform } from "motion/react";
import { SearchPanel } from "./SearchPanel";
import { BlurText, CountUp, Magnet, ShinyText, SpotlightCard, SplitText } from "./bits";
import { useScroller } from "./Providers";
import { addDays, todayStr } from "@/lib/flight-utils";

export function SearchSection() {
  return (
    <section id="search" className="relative z-10 mx-auto max-w-6xl scroll-mt-24 px-5 pb-10 pt-24 sm:px-8">
      <div className="mb-8 text-center">
        <p className="eyebrow mb-3">Plan your departure</p>
        <h2 className="serif text-4xl font-medium sm:text-6xl">
          <SplitText text="Where will you wake up next?" />
        </h2>
      </div>
      <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-80px" }} transition={{ duration: 0.8 }}>
        <SearchPanel />
      </motion.div>
    </section>
  );
}

const DESTS = [
  { code: "CDG", city: "Paris", country: "France", img: "paris", line: "Light, linen and long lunches." },
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", img: "dubai", line: "Where the desert meets the future." },
  { code: "HND", city: "Tokyo", country: "Japan", img: "tokyo", line: "Quiet precision, endless wonder." },
  { code: "JFK", city: "New York", country: "United States", img: "newyork", line: "The city that never sleeps." },
  { code: "SIN", city: "Singapore", country: "Singapore", img: "singapore", line: "A garden city on the equator." },
  { code: "SYD", city: "Sydney", country: "Australia", img: "sydney", line: "Harbour mornings, golden evenings." },
];

function DestCard({ d, i }: { d: (typeof DESTS)[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-10%", "10%"]);
  const go = () => {
    const from = d.code === "JFK" ? "LHR" : "JFK";
    router.push(`/flights?from=${from}&to=${d.code}&date=${addDays(todayStr(), 21)}&pax=1`);
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay: (i % 3) * 0.1 }}
      className={i % 3 === 1 ? "lg:translate-y-10" : ""}
    >
      <button
        ref={ref as unknown as React.RefObject<HTMLButtonElement>}
        onClick={go}
        className="group relative block h-[26rem] w-full overflow-hidden rounded-[1.75rem] text-left shadow-[0_24px_50px_-26px_rgba(90,66,40,0.5)]"
      >
        <motion.div style={{ y }} className="absolute -inset-x-0 -inset-y-[12%]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/images/${d.img}.png`} alt={d.city} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900/75 via-ink-900/5 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 text-cream-50">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-sand-300">{d.country}</p>
          <h3 className="serif mt-1 text-4xl font-medium">{d.city}</h3>
          <p className="mt-1 text-sm text-cream-100/80">{d.line}</p>
          <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold opacity-0 transition duration-500 group-hover:translate-x-1 group-hover:opacity-100">
            View flights →
          </span>
        </div>
      </button>
    </motion.div>
  );
}

export function Destinations() {
  return (
    <section id="destinations" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="mb-14 flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="eyebrow mb-3">Destinations</p>
          <h2 className="serif text-4xl font-medium sm:text-6xl">
            <SplitText text="Places worth the journey" />
          </h2>
        </div>
        <BlurText className="max-w-sm text-ink-700" text="Choose a destination and we'll show you the next available flights — priced in your currency." />
      </div>
      <div className="grid gap-6 pb-10 md:grid-cols-2 lg:grid-cols-3">
        {DESTS.map((d, i) => (
          <DestCard key={d.code} d={d} i={i} />
        ))}
      </div>
    </section>
  );
}

export function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const x = useTransform(scrollYProgress, [0, 1], ["5%", "-35%"]);
  return (
    <div ref={ref} className="overflow-hidden border-y border-sand-300/70 bg-cream-200/50 py-8">
      <motion.div style={{ x }} className="serif flex w-max gap-12 whitespace-nowrap text-[clamp(3rem,8vw,7rem)] italic text-taupe-500/80">
        {Array.from({ length: 3 }).map((_, i) => (
          <span key={i} className="flex gap-12">
            <span>Fly beautifully</span>
            <span className="text-gold">✦</span>
            <span>Arrive rested</span>
            <span className="text-gold">✦</span>
            <span>Travel well</span>
            <span className="text-gold">✦</span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}

const FEATURES = [
  { title: "Fares, side by side", text: "Compare Saver, Flex, Premium and Business on one card — baggage, changes and refunds laid out plainly.", icon: "M4 6h16M4 12h16M4 18h10" },
  { title: "Choose your exact seat", text: "An interactive cabin map shows every seat in real time, from lie-flat suites to extra-legroom exit rows.", icon: "M7 4h6a3 3 0 0 1 3 3v6H7zM5 20h14M9 13v7M15 13v7" },
  { title: "Your currency, always", text: "Switch between twelve major currencies and every fare, tax and total updates instantly.", icon: "M12 3v18M16 7.5c0-1.7-1.8-3-4-3s-4 1.1-4 2.8c0 4 8 2 8 6 0 1.800-1.800 3-4 3s-4-1.300-4-3" },
];

export function Experience() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["-8%", "8%"]);
  return (
    <section id="experience" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 sm:px-8">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div ref={ref} className="relative h-[34rem] overflow-hidden rounded-[2rem] shadow-[0_30px_70px_-30px_rgba(90,66,40,0.55)]">
          <motion.div style={{ y }} className="absolute -inset-y-[10%] inset-x-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/cabin.png" alt="Airlines cabin" className="h-full w-full object-cover" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900/50 to-transparent" />
          <p className="serif absolute bottom-7 left-7 max-w-[16rem] text-3xl italic text-cream-50">Stillness, at thirty-eight thousand feet.</p>
        </div>
        <div>
          <p className="eyebrow mb-3">The experience</p>
          <h2 className="serif mb-8 text-4xl font-medium leading-tight sm:text-6xl">
            <SplitText text="Booking, as considered as the cabin." />
          </h2>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12, duration: 0.7 }}>
                <SpotlightCard className="card !rounded-2xl p-5">
                  <div className="flex gap-4">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-sand-300/50 text-taupe-600">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d={f.icon} /></svg>
                    </span>
                    <div>
                      <h3 className="font-semibold">{f.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-ink-700">{f.text}</p>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-2 gap-6 border-t border-sand-300/70 pt-12 text-center md:grid-cols-4">
        {[
          { n: 19, s: "", l: "Destinations" },
          { n: 342, s: "", l: "Routes" },
          { n: 12, s: "", l: "Currencies" },
          { n: 4, s: "", l: "Fare classes" },
        ].map((s) => (
          <div key={s.l}>
            <p className="serif text-6xl font-medium text-ink-900">
              <CountUp to={s.n} suffix={s.s} />
            </p>
            <p className="eyebrow mt-2">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ClosingCta() {
  const scroller = useScroller();
  return (
    <section className="px-5 pb-24 sm:px-8">
      <div className="inverse-panel relative mx-auto max-w-5xl overflow-hidden rounded-[2.2rem] bg-ink-900 px-8 py-16 text-center text-cream-50 sm:py-24">
        <div className="pointer-events-none absolute -left-20 -top-20 h-80 w-80 rounded-full bg-gold/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-10 h-80 w-80 rounded-full bg-sand-300/20 blur-3xl" />
        <p className="eyebrow !text-sand-400">Ready when you are</p>
        <h2 className="serif mx-auto mt-4 max-w-2xl text-4xl font-medium leading-tight sm:text-6xl">
          <ShinyText className="italic" text="The sky is waiting." /> <span className="block">Shall we?</span>
        </h2>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Magnet>
            <button className="btn btn-gold !px-8 !py-4" onClick={() => { const el = document.getElementById("search"); if (el) scroller.scrollTo(el); }}>
              Search flights
            </button>
          </Magnet>
          <Magnet>
            <Link href="/profile" className="btn !border !border-sand-400/50 !px-8 !py-4 text-cream-50 hover:!bg-white/10">
              View Demo Profile
            </Link>
          </Magnet>
        </div>
      </div>
    </section>
  );
}
