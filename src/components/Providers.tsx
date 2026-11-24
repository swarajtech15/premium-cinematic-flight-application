"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { savePreferences, upgradeDemoStorage, useDemoState } from "@/lib/demo-storage";
import { DEFAULT_PREFERENCES } from "@/lib/demo-profile";
import { currencyByCode, formatCurrency } from "@/lib/data";

type CurrencyCtx = {
  currency: string;
  setCurrency: (c: string) => Promise<void>;
  /** Format an amount given in USD in the selected currency. */
  fmt: (usd: number, exact?: boolean) => string;
};
type LenisCtx = { scrollTo: (target: string | number | HTMLElement) => void };

const CurrencyContext = createContext<CurrencyCtx>({ currency: "USD", setCurrency: async () => {}, fmt: (n) => `$${n}` });
const LenisContext = createContext<LenisCtx>({ scrollTo: () => {} });

export const useCurrency = () => useContext(CurrencyContext);
export const useScroller = () => useContext(LenisContext);

export function Providers({ children }: { children: ReactNode }) {
  const { data } = useDemoState();
  const { theme, currency } = data?.preferences ?? DEFAULT_PREFERENCES;
  const loaded = data !== null;
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    // Existing local reservations are retained while obsolete account fields are removed.
    void upgradeDemoStorage().catch(() => {});
  }, []);

  useEffect(() => {
    if (!loaded) return;
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      document.documentElement.dataset.theme = theme === "system" ? (system.matches ? "dark" : "light") : theme;
    };
    apply();
    if (theme === "system") {
      system.addEventListener("change", apply);
      return () => system.removeEventListener("change", apply);
    }
  }, [theme, loaded]);

  const setCurrency = useCallback(async (code: string) => {
    if (currencyByCode(code)) await savePreferences({ currency: code });
  }, []);

  const fmt = useCallback(
    (usd: number, exact = false) => formatCurrency(usd * (currencyByCode(currency)?.rate ?? 1), currency, exact),
    [currency],
  );

  // Let native history restoration manage offsets. Lenis only handles live scrolling.
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const tick = (time: number) => lenisRef.current?.raf(time * 1000);
    const configure = () => {
      gsap.ticker.remove(tick);
      lenisRef.current?.destroy();
      lenisRef.current = null;
      if (motion.matches) return;
      const lenis = new Lenis({ lerp: 0.09, smoothWheel: true, anchors: true });
      lenisRef.current = lenis;
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
    };
    configure();
    motion.addEventListener("change", configure);
    return () => {
      motion.removeEventListener("change", configure);
      gsap.ticker.remove(tick);
      lenisRef.current?.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scroller = useMemo<LenisCtx>(
    () => ({
      scrollTo: (target) => {
        const lenis = lenisRef.current;
        if (lenis) lenis.scrollTo(target, { offset: typeof target === "number" ? 0 : -90 });
        else if (typeof target === "number") window.scrollTo({ top: target, behavior: "instant" });
        else {
          const element = typeof target === "string" ? document.querySelector(target) : target;
          element?.scrollIntoView({ behavior: "instant" });
        }
      },
    }),
    [],
  );

  const curValue = useMemo(() => ({ currency, setCurrency, fmt }), [currency, setCurrency, fmt]);

  return (
    <CurrencyContext.Provider value={curValue}>
      <LenisContext.Provider value={scroller}>{children}</LenisContext.Provider>
    </CurrencyContext.Provider>
  );
}
