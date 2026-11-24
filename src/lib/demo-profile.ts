export const DEMO_STORAGE_KEY = "airlines_demo_v1";
export const DEMO_PROFILE_NAME = "Demo Profile";

export const THEMES = ["light", "dark", "system"] as const;
export type ThemePreference = (typeof THEMES)[number];

export type TravellerProfile = {
  name: string;
  email: string;
  phone: string;
  dob: string;
  nationality: string;
  passportNumber: string;
};

export type DemoPreferences = {
  theme: ThemePreference;
  currency: string;
  bookingUpdates: boolean;
  tripReminders: boolean;
};

export const DEFAULT_TRAVELLER: TravellerProfile = {
  name: "Demo Traveller", email: "traveller@example.test", phone: "",
  dob: "", nationality: "", passportNumber: "",
};

export const DEFAULT_PREFERENCES: DemoPreferences = {
  theme: "light", currency: "USD", bookingUpdates: true, tripReminders: true,
};

// Resolve the stored theme before the first paint of the static page.
export const THEME_BOOTSTRAP = `try {
  const theme = JSON.parse(localStorage.getItem(${JSON.stringify(DEMO_STORAGE_KEY)}))?.preferences?.theme;
  document.documentElement.dataset.theme = theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
} catch {}`;
