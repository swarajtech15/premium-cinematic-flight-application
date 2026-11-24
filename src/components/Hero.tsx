"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_WELCOME_LINE } from "@/lib/brand";
import { introIsLoading, prepareCinematicAssets, rememberIntroScroll, savedIntroScroll } from "@/lib/cinematic-entry";
import { useScroller } from "./Providers";

function Chars({ text, className = "" }: { text: string; className?: string }) {
  return (
    <span className={className} aria-label={text}>
      {text.split(" ").map((w, i) => (
        <span key={i} className="inline-block whitespace-nowrap" aria-hidden>
          {w.split("").map((c, j) => (
            <span key={j} className="inline-block overflow-hidden align-bottom pb-[0.12em] -mb-[0.12em]">
              <span className="ch inline-block will-change-transform">{c}</span>
            </span>
          ))}
          {"\u00A0"}
        </span>
      ))}
    </span>
  );
}

function Plane() {
  return (
    <svg viewBox="0 0 420 130" className="w-full drop-shadow-[0_18px_22px_rgba(90,66,40,0.25)]" aria-hidden>
      <defs>
        <linearGradient id="fus" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#e6d7ba" />
        </linearGradient>
      </defs>
      {/* tail */}
      <path d="M52 56 24 8h38l46 48Z" fill="#a68b67" />
      <path d="M70 62 40 30h22l30 32Z" fill="#85694a" opacity=".5" />
      {/* far wing */}
      <path d="M190 74 150 108h38l62-34Z" fill="#cdb994" />
      {/* fuselage */}
      <path d="M18 70c0-14 38-22 104-22h208c50 0 84 12 84 22s-34 22-84 22H122C56 92 18 84 18 70Z" fill="url(#fus)" stroke="#c9b48e" strokeWidth="1.5" />
      <path d="M20 74c40 8 90 10 150 10h160c40 0 70-4 82-10-10 12-40 18-82 18H122C64 92 28 86 20 74Z" fill="#cdb994" opacity=".35" />
      {/* cockpit */}
      <path d="M352 56c16 2 30 6 38 12-12-2-26-4-42-4l4-8Z" fill="#6a563f" opacity=".75" />
      {/* windows */}
      {Array.from({ length: 16 }).map((_, i) => (
        <circle key={i} cx={105 + i * 14.5} cy="66" r="3.2" fill="#85694a" opacity=".75" />
      ))}
      {/* near wing + engine */}
      <path d="M205 78 138 124h46l102-44Z" fill="#b99f78" />
      <rect x="206" y="88" width="56" height="18" rx="9" fill="#e6d7ba" stroke="#a68b67" strokeWidth="1.2" />
      <rect x="206" y="92" width="10" height="10" rx="5" fill="#85694a" />
    </svg>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const scroller = useScroller();

  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let scene: ReturnType<typeof gsap.context> | undefined;
    let entrance: ReturnType<typeof gsap.context> | undefined;
    let trigger: ScrollTrigger | undefined;
    let frame = 0;
    let revealFrame = 0;
    let disposed = false;

    function syncScene(alignHash = false, top?: number) {
      ScrollTrigger.refresh();
      const hash = window.location.hash.slice(1);
      if (top !== undefined) window.scrollTo({ top, behavior: "instant" });
      else if (alignHash && hash) document.getElementById(hash)?.scrollIntoView({ behavior: "instant" });
      ScrollTrigger.update();
      // Restoration can jump over several chapters. Synchronize without a scrub catch-up.
      trigger?.getTween()?.progress(1);
    }

    const buildScene = () => {
      entrance?.revert();
      scene?.revert();
      trigger = undefined;
      if (motion.matches) return;

      scene = gsap.context(() => {
        gsap.set(".s2, .s3", { autoAlpha: 0 });
        gsap.set(".plane", { xPercent: -140, yPercent: 40, rotation: 4, autoAlpha: 1 });
        gsap.set(".w-line", { scaleX: 0, transformOrigin: "50% 50%" });
        gsap.set(".h-progress", { scaleY: 0, transformOrigin: "50% 0%" });
        gsap.set(".welcome-wrap", { autoAlpha: 0 });
        gsap.set(".welcome .ch", { yPercent: 115 });
        gsap.set(".w-sub, .w-cta", { opacity: 0, y: 24 });

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: root.current,
            start: "top top",
            end: "+=520%",
            scrub: 1,
            pin: true,
            anticipatePin: 1,
          },
        });

        trigger = tl.scrollTrigger;

        // Continuous layers
        tl.to(".h-bg", { scale: 1.45, yPercent: -6, duration: 10 }, 0)
          .to(".h-sun", { yPercent: -60, scale: 1.8, opacity: 0.9, duration: 10 }, 0)
          .to(".cloud-a", { xPercent: -45, scale: 1.3, duration: 10 }, 0)
          .to(".cloud-b", { xPercent: 40, scale: 1.4, duration: 10 }, 0)
          .to(".cloud-c", { yPercent: -35, scale: 1.6, duration: 10 }, 0)
          .to(".h-progress", { scaleY: 1, duration: 10 }, 0)
          .fromTo(".plane", { xPercent: -140, yPercent: 40, rotate: 4 }, { xPercent: 330, yPercent: -230, rotate: -9, duration: 7.5, ease: "power1.inOut" }, 0.2)
          .fromTo(".plane", { opacity: 1 }, { opacity: 0, duration: 0.8 }, 7);

        // Stage 1 → 2
        tl.to(".s1", { yPercent: -30, opacity: 0, filter: "blur(14px)", letterSpacing: "0.12em", duration: 1.4 }, 1.3)
          .to(".s1-eyebrow, .scroll-hint", { opacity: 0, duration: 0.6 }, 1.0)
          .fromTo(".s2", { autoAlpha: 0, y: 70, filter: "blur(14px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 1.4 }, 2.3)
          // 2 → 3
          .to(".s2", { autoAlpha: 0, y: -60, filter: "blur(14px)", duration: 1.2 }, 4.4)
          .fromTo(".s3", { autoAlpha: 0, scale: 0.9, filter: "blur(14px)" }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1.3 }, 5.3)
          // 3 → whiteout
          .to(".s3", { autoAlpha: 0, scale: 1.12, filter: "blur(16px)", duration: 1.1 }, 7.1)
          .to(".h-white", { opacity: 1, duration: 1.4 }, 7.2)
          // Welcome reveal
          .set(".welcome-wrap", { autoAlpha: 1 }, 8.2)
          .to(".welcome .ch", { yPercent: 0, duration: 1.1, stagger: 0.05, ease: "power3.out" }, 8.3)
          .to(".w-line", { scaleX: 1, duration: 1.2, ease: "power2.out" }, 8.8)
          .to(".w-sub", { opacity: 1, y: 0, duration: 1.1, ease: "power2.out" }, 9.1)
          .to(".w-cta", { opacity: 1, y: 0, duration: 1.0, ease: "power2.out" }, 9.5)
          .to({}, { duration: 1.2 }, 10.3);
      }, root);
    };

    const playEntrance = () => {
      if (motion.matches || window.scrollY > 1 || window.location.hash) return;
      entrance = gsap.context(() => {
        gsap.from(".s1 .ch", { yPercent: 115, duration: 1.4, stagger: 0.025, ease: "power4.out", delay: 0.25 });
        gsap.from(".s1-eyebrow, .scroll-hint", { opacity: 0, y: 14, duration: 1.2, delay: 1, stagger: 0.2, ease: "power2.out" });
      }, root);
    };

    const waiting = introIsLoading();
    const savedTop = waiting ? undefined : savedIntroScroll();
    if (waiting) window.scrollTo(0, 0);
    buildScene();

    const queueSync = (alignEntry = false, top?: number) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => syncScene(alignEntry, top));
    };

    if (waiting) {
      const reveal = () => {
        if (disposed || !introIsLoading()) return;
        // Give a warm-cache load a paint of the loader before the handoff.
        revealFrame = requestAnimationFrame(() => {
          revealFrame = requestAnimationFrame(() => {
            if (!introIsLoading()) return;
            window.finishCinematicIntro?.();
            syncScene();
            playEntrance();
          });
        });
      };
      void prepareCinematicAssets(image.current).then(reveal, reveal);
    } else {
      // Hash links and history entries keep their own destinations.
      queueSync(true, savedTop);
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (savedTop === undefined && navigation?.type !== "back_forward" && document.documentElement.dataset.intro !== "ready") playEntrance();
    }

    const changeMotion = () => {
      const resetToChapterOne = motion.matches && trigger?.isActive && !window.location.hash;
      buildScene();
      queueSync(!!window.location.hash, resetToChapterOne ? 0 : undefined);
    };
    const restoreScene = (event: PageTransitionEvent) => {
      if (event.persisted) queueSync();
    };
    const restoreHistory = () => {
      if (location.pathname === "/" && !introIsLoading()) queueSync(true, savedIntroScroll());
    };
    const rememberLink = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (link && link.origin === window.location.origin && link.href !== window.location.href) rememberIntroScroll();
    };
    motion.addEventListener("change", changeMotion);
    window.addEventListener("pageshow", restoreScene);
    window.addEventListener("popstate", restoreHistory);
    window.addEventListener("pagehide", rememberIntroScroll);
    window.addEventListener("scrollend", rememberIntroScroll);
    document.addEventListener("click", rememberLink, true);
    document.addEventListener("submit", rememberIntroScroll, true);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cancelAnimationFrame(revealFrame);
      motion.removeEventListener("change", changeMotion);
      window.removeEventListener("pageshow", restoreScene);
      window.removeEventListener("popstate", restoreHistory);
      window.removeEventListener("pagehide", rememberIntroScroll);
      window.removeEventListener("scrollend", rememberIntroScroll);
      document.removeEventListener("click", rememberLink, true);
      document.removeEventListener("submit", rememberIntroScroll, true);
      entrance?.revert();
      scene?.revert();
    };
  }, []);

  return (
    <section ref={root} className="cinematic-hero relative h-screen w-full overflow-hidden bg-cream-100">
      {/* Backdrop */}
      <div className="h-bg absolute inset-0 will-change-transform">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={image} src="/images/hero.png" fetchPriority="high" alt="" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-b from-cream-100/80 via-cream-100/20 to-cream-100/85" />
      <div className="pointer-events-none absolute inset-x-0 top-[48%] flex justify-center">
        <div className="h-sun h-[60vmin] w-[60vmin] rounded-full bg-[radial-gradient(circle,rgba(255,236,196,0.95),rgba(255,236,196,0)_65%)] opacity-60" />
      </div>

      {/* Clouds */}
      <div className="cloud-a pointer-events-none absolute -left-[10%] bottom-[8%] h-[34vh] w-[70vw] rounded-full bg-[radial-gradient(ellipse,rgba(253,250,244,0.95),rgba(253,250,244,0)_70%)] blur-xl" />
      <div className="cloud-b pointer-events-none absolute -right-[15%] bottom-[22%] h-[30vh] w-[65vw] rounded-full bg-[radial-gradient(ellipse,rgba(248,242,230,0.9),rgba(248,242,230,0)_70%)] blur-xl" />
      <div className="cloud-c pointer-events-none absolute left-[15%] -bottom-[12%] h-[40vh] w-[80vw] rounded-full bg-[radial-gradient(ellipse,rgba(253,250,244,1),rgba(253,250,244,0)_70%)] blur-2xl" />

      {/* Plane */}
      <div className="plane pointer-events-none absolute bottom-[14%] left-0 z-10 w-[min(46vw,340px)] min-w-[170px]">
        <div className="absolute right-[88%] top-[52%] h-[3px] w-[60vw] -translate-y-1/2 bg-gradient-to-l from-white/90 to-transparent blur-[1.5px]" />
        <Plane />
      </div>

      {/* Stage 1 */}
      <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center">
        <p className="s1-eyebrow eyebrow mb-6">{BRAND_NAME} · {BRAND_TAGLINE}</p>
        <h1 className="s1 serif text-[clamp(3rem,9.5vw,8.5rem)] font-medium leading-[0.95] tracking-tight text-ink-900">
          <Chars text="Some journeys" />
          <br />
          <Chars text="begin quietly." className="italic text-taupe-600" />
        </h1>
        <div className="s2 absolute inset-0 flex flex-col items-center justify-center px-6">
          <p className="eyebrow mb-5">Chapter I — Ascent</p>
          <h2 className="serif text-[clamp(2.4rem,7vw,6rem)] font-medium leading-[1.02] text-ink-900">
            Light spills over the wing,
            <br />
            <span className="italic text-taupe-600">and the world falls away.</span>
          </h2>
        </div>
        <div className="s3 absolute inset-0 flex flex-col items-center justify-center px-6">
          <p className="eyebrow mb-5">Chapter II — Altitude</p>
          <h2 className="serif text-[clamp(2.4rem,7vw,6rem)] font-medium leading-[1.02] text-ink-900">
            Above the clouds,
            <br />
            <span className="italic text-taupe-600">a calmer horizon.</span>
          </h2>
        </div>
      </div>

      {/* Whiteout */}
      <div className="h-white pointer-events-none absolute inset-0 z-30 bg-[radial-gradient(circle_at_50%_45%,#fdfaf4,#f3ead8_70%)] opacity-0" />

      {/* Final reveal */}
      <div className="welcome-wrap absolute inset-0 z-40 flex flex-col items-center justify-center px-6 text-center">
        <p className="w-sub mb-6 eyebrow">Your journey awaits</p>
        <h2 aria-label={`WELCOME TO ${BRAND_NAME}`} className="welcome serif whitespace-nowrap text-[clamp(2.3rem,9.5vw,9rem)] font-medium leading-[0.95] text-ink-900 sm:text-[clamp(3.2rem,10vw,9rem)]">
          <Chars text="WELCOME TO" />
          <br />
          <Chars text={BRAND_NAME} className="italic text-taupe-600" />
        </h2>
        <div className="w-line mx-auto my-8 h-px w-40 bg-gradient-to-r from-transparent via-gold to-transparent" />
        <p className="w-sub serif text-[clamp(1.4rem,3vw,2.3rem)] italic text-ink-800">{BRAND_WELCOME_LINE}</p>
        <div className="w-cta mt-10">
          <button
            className="btn btn-gold !px-9 !py-4 text-base"
            onClick={() => {
              const el = document.getElementById("search");
              if (el) scroller.scrollTo(el);
            }}
          >
            Begin your journey
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3v10m0 0 4-4m-4 4L4 9" /></svg>
          </button>
        </div>
      </div>

      {/* Scroll hint + progress */}
      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-20 flex justify-center"><div className="scroll-hint flex flex-col items-center gap-3">
        <span className="eyebrow !text-[0.65rem]">Scroll</span>
        <span className="block h-12 w-px bg-taupe-500/60" style={{ animation: "scrollline 2s ease-in-out infinite" }} />
      </div></div>
      <div className="absolute right-6 top-1/2 z-40 hidden h-40 w-px -translate-y-1/2 bg-sand-400/50 sm:block">
        <div className="h-progress h-full w-full bg-taupe-600" />
      </div>
    </section>
  );
}
