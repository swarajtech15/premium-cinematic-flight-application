"use client";

import { useSyncExternalStore } from "react";
import type { BookingDTO } from "./bookings";
import { currencyByCode } from "./data";
import {
  DEFAULT_PREFERENCES, DEFAULT_TRAVELLER, DEMO_STORAGE_KEY, THEMES,
  type DemoPreferences, type TravellerProfile,
} from "./demo-profile";

const STORAGE_ERROR = "Browser storage is unavailable. Enable site storage to save demo trips and preferences.";

export type DemoState = {
  version: 2;
  traveller: TravellerProfile;
  preferences: DemoPreferences;
  bookings: BookingDTO[];
  seatDrafts: Record<string, (string | null)[]>;
};

type LegacyState = {
  version: 1;
  session: string | null;
  accounts: { user: TravellerProfile & { id: string; preferredCurrency: string } }[];
  bookings: (BookingDTO & { userId?: string })[];
  seatDrafts: DemoState["seatDrafts"];
  guestCurrency: string;
};

const EMPTY: DemoState = {
  version: 2, traveller: DEFAULT_TRAVELLER, preferences: DEFAULT_PREFERENCES, bookings: [], seatDrafts: {},
};
type Snapshot = { data: DemoState | null; error: string };
const initial: Snapshot = { data: null, error: "" };
const blocked: Snapshot = { data: null, error: STORAGE_ERROR };

let lastRaw: string | null | undefined;
let lastSnapshot: Snapshot = initial;
const listeners = new Set<() => void>();

function upgrade(data: LegacyState): DemoState {
  const user = data.accounts.find((entry) => entry.user.id === data.session)?.user;
  const { name, email, phone, dob, nationality, passportNumber } = user ?? DEFAULT_TRAVELLER;
  const seatDrafts: DemoState["seatDrafts"] = {};
  if (data.session) {
    const prefix = `${data.session}/`;
    for (const [key, seats] of Object.entries(data.seatDrafts)) {
      if (key.startsWith(prefix)) seatDrafts[key.slice(prefix.length)] = seats;
    }
  }
  const bookings = data.bookings.map((old) => {
    const booking = { ...old };
    delete booking.userId;
    return booking;
  });
  return {
    version: 2,
    traveller: { name, email, phone, dob, nationality, passportNumber },
    preferences: { ...DEFAULT_PREFERENCES, currency: currencyByCode(user?.preferredCurrency ?? data.guestCurrency)?.code ?? "USD" },
    bookings, seatDrafts,
  };
}

function decode(raw: string | null): { data: DemoState; migrated: boolean } {
  if (raw === null) return { data: EMPTY, migrated: false };
  try {
    const data = JSON.parse(raw) as DemoState | LegacyState;
    if (data && Array.isArray(data.bookings) && data.seatDrafts && !Array.isArray(data.seatDrafts) &&
        typeof data.seatDrafts === "object") {
      if (data.version === 1 && Array.isArray(data.accounts)) return { data: upgrade(data), migrated: true };
      if (data.version === 2 && data.traveller && data.preferences &&
          THEMES.includes(data.preferences.theme) && currencyByCode(data.preferences.currency) &&
          typeof data.preferences.bookingUpdates === "boolean" && typeof data.preferences.tripReminders === "boolean") {
        return { data, migrated: false };
      }
    }
  } catch {
    // Preserve unreadable records instead of overwriting them with an empty history.
  }
  throw new Error("The saved demo data could not be read. Clear this site's data to start a new demo.");
}

function readRaw() {
  try {
    return window.localStorage.getItem(DEMO_STORAGE_KEY);
  } catch {
    throw new Error(STORAGE_ERROR);
  }
}

function getSnapshot(): Snapshot {
  let raw: string | null;
  try {
    raw = readRaw();
  } catch {
    return blocked;
  }
  if (raw !== lastRaw) {
    lastRaw = raw;
    try {
      lastSnapshot = { data: decode(raw).data, error: "" };
    } catch (error) {
      lastSnapshot = { data: null, error: (error as Error).message };
    }
  }
  return lastSnapshot;
}

function notify() {
  for (const listener of listeners) listener();
}

function onStorage(event: StorageEvent) {
  if (event.key === null || event.key === DEMO_STORAGE_KEY) notify();
}

function subscribe(listener: () => void) {
  if (!listeners.size) {
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", notify);
    }
  };
}

export function useDemoState() {
  return useSyncExternalStore(subscribe, getSnapshot, () => initial);
}

/** Read and commit under the same lock so tabs cannot reserve the same seat. */
export async function writeDemoState<Result>(
  update: (state: DemoState) => { state: DemoState; result: Result },
) {
  const commit = () => {
    const { data: previous, migrated } = decode(readRaw());
    const { state, result } = update(previous);
    if (state !== previous || migrated) {
      try {
        window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
      } catch {
        throw new Error("Unable to save demo data. Check that browser storage is enabled and has enough space.");
      }
      notify();
    }
    return result;
  };
  return navigator.locks ? navigator.locks.request(DEMO_STORAGE_KEY, commit) : commit();
}

export function upgradeDemoStorage() {
  return writeDemoState((state) => ({ state, result: undefined }));
}

export function savePreferences(preferences: Partial<DemoPreferences>) {
  return writeDemoState((state) => ({ state: { ...state, preferences: { ...state.preferences, ...preferences } }, result: undefined }));
}

export function saveTraveller(traveller: TravellerProfile) {
  return writeDemoState((state) => ({ state: { ...state, traveller }, result: undefined }));
}
