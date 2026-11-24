const SCROLL_KEY = "airlinesIntroScroll";

// The head script runs before the browser paints or restores scroll on a fresh intro.
export const INTRO_BOOTSTRAP = `(() => {
  if (location.pathname !== "/" || location.hash ||
      performance.getEntriesByType("navigation")[0]?.type === "back_forward") return;

  const root = document.documentElement;
  const previousRestoration = history.scrollRestoration;
  const restore = () => { history.scrollRestoration = previousRestoration; };
  let timeout;
  const finish = () => {
    if (root.dataset.intro !== "loading") return;
    clearTimeout(timeout);
    window.scrollTo(0, 0);
    root.dataset.intro = "ready";
  };

  timeout = setTimeout(finish, 5000);
  root.dataset.intro = "loading";
  window.finishCinematicIntro = finish;
  history.scrollRestoration = "manual";
  if (history.state?.[${JSON.stringify(SCROLL_KEY)}] != null) {
    try {
      const state = { ...history.state };
      delete state[${JSON.stringify(SCROLL_KEY)}];
      history.replaceState(state, "");
    } catch {}
  }
  window.scrollTo(0, 0);

  // The browser can attempt restoration during load, after hydration on a warm cache.
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) finish();
    requestAnimationFrame(restore);
  }, { once: true });
  window.addEventListener("pagehide", restore, { once: true });
})();`;

declare global {
  interface Window {
    finishCinematicIntro?: () => void;
  }
}

export function introIsLoading() {
  return document.documentElement.dataset.intro === "loading";
}

export async function prepareCinematicAssets(image: HTMLImageElement | null) {
  await Promise.allSettled([
    image?.decode?.(),
    document.fonts?.load('500 1em "Cormorant Garamond"', "Some journeys"),
    document.fonts?.load('italic 400 1em "Cormorant Garamond"', "begin quietly."),
    document.fonts?.load('600 1em "Manrope Variable"', "Airlines"),
  ]);
}

export function savedIntroScroll() {
  const saved = history.state?.[SCROLL_KEY] as { url?: string; top?: number } | undefined;
  return saved?.url === location.href && Number.isFinite(saved.top) ? saved.top : undefined;
}

export function rememberIntroScroll() {
  if (location.pathname !== "/" || introIsLoading()) return;
  const top = window.scrollY;
  if (savedIntroScroll() !== top) {
    try {
      // Keep the router's state and attach the offset to this history entry only.
      history.replaceState({ ...history.state, [SCROLL_KEY]: { url: location.href, top } }, "");
    } catch {
      // Native restoration still works when history writes are restricted.
    }
  }
}
