"use client";

import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
  const timer = setInterval(callback, 30_000);
  return () => clearInterval(timer);
}

// A stable snapshot allows server rendering to hydrate before reading the client clock.
const minute = () => Math.floor(Date.now() / 60000) * 60000;
const serverSnapshot = () => null;

export function useClientTime() {
  return useSyncExternalStore(subscribe, minute, serverSnapshot);
}
