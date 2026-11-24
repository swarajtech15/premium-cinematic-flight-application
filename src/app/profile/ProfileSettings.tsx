"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { Modal } from "@/components/Modal";
import { CURRENCIES } from "@/lib/data";
import { clearDemoBookings } from "@/lib/demo-bookings";
import { THEMES, type DemoPreferences } from "@/lib/demo-profile";
import { savePreferences, saveTraveller, type DemoState } from "@/lib/demo-storage";
import { isValidDate, todayStr } from "@/lib/flight-utils";

const THEME_LABELS = { light: "Light", dark: "Dark", system: "System" };
const TRAVELLER_FIELDS = [
  { key: "name", label: "Traveller name", type: "text", required: true },
  { key: "email", label: "Contact email", type: "email", required: true },
  { key: "phone", label: "Phone", type: "tel" },
  { key: "dob", label: "Date of birth", type: "date" },
  { key: "nationality", label: "Nationality", type: "text" },
  { key: "passportNumber", label: "Passport number", type: "text" },
] as const;

export function ProfileSettings({ data }: { data: DemoState }) {
  const id = useId();
  const [pending, setPending] = useState<Partial<DemoPreferences>>({});
  const saves = useRef<Partial<Record<keyof DemoPreferences, symbol>>>({});
  const preferences = { ...data.preferences, ...pending };
  const [settingsError, setSettingsError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [clearError, setClearError] = useState("");
  const [cleared, setCleared] = useState(false);

  const update = async <Key extends keyof DemoPreferences>(key: Key, value: DemoPreferences[Key]) => {
    const request = Symbol();
    saves.current[key] = request;
    setSettingsError("");
    setPending((previous) => ({ ...previous, [key]: value }));
    try {
      await savePreferences({ [key]: value });
    } catch (error) {
      if (saves.current[key] === request) setSettingsError((error as Error).message);
    } finally {
      if (saves.current[key] === request) {
        delete saves.current[key];
        setPending((previous) => {
          const next = { ...previous };
          delete next[key];
          return next;
        });
      }
    }
  };

  const clear = async () => {
    if (clearing) return;
    setClearing(true);
    setClearError("");
    try {
      await clearDemoBookings();
      setConfirmOpen(false);
      setCleared(true);
    } catch (error) {
      setClearError((error as Error).message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1.35fr_1fr]">
      <div className="space-y-6">
        <section className="card space-y-6 p-6 sm:p-8">
          <div>
            <h2 className="serif text-3xl font-medium">Appearance & currency</h2>
          </div>
          <fieldset>
            <legend className="label">Theme</legend>
            <div className="grid grid-cols-3 gap-2">
              {THEMES.map((theme) => (
                <label key={theme} className="relative cursor-pointer">
                  <input type="radio" name={`${id}-theme`} className="peer sr-only" value={theme} checked={preferences.theme === theme} onChange={() => void update("theme", theme)} />
                  <span className="block rounded-xl border border-sand-300 px-2 py-3 text-center text-sm font-semibold transition hover:bg-cream-200 peer-checked:border-ink-900 peer-checked:bg-ink-900 peer-checked:text-cream-50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-taupe-600">
                    {THEME_LABELS[theme]}
                  </span>
                </label>
              ))}
            </div>
            <p className="mt-2 text-sm text-ink-700">System follows your device’s appearance.</p>
          </fieldset>
          <div>
            <label className="label" htmlFor={`${id}-currency`}>Preferred currency</label>
            <select id={`${id}-currency`} className="field" value={preferences.currency} onChange={(event) => void update("currency", event.target.value)}>
              {CURRENCIES.map((currency) => <option key={currency.code} value={currency.code}>{currency.code} — {currency.name}</option>)}
            </select>
          </div>
          {settingsError && <p role="alert" className="notice-danger-text text-sm">{settingsError}</p>}
        </section>
        <section className="card space-y-4 p-6 sm:p-8">
          <div>
            <h2 className="serif text-3xl font-medium">Notifications</h2>
            <p className="mt-1 text-sm text-ink-700">Control which updates appear inside the demo.</p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-sand-300 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold">Booking updates</span>
              <span className="block text-xs text-ink-700">Show alerts for seat changes and cancellations.</span>
            </span>
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-taupe-600" checked={preferences.bookingUpdates} onChange={(event) => void update("bookingUpdates", event.target.checked)} />
          </label>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-sand-300 px-4 py-3">
            <span>
              <span className="block text-sm font-semibold">Trip reminders</span>
              <span className="block text-xs text-ink-700">Show a reminder on your profile within 24 hours of departure.</span>
            </span>
            <input type="checkbox" className="h-5 w-5 shrink-0 accent-taupe-600" checked={preferences.tripReminders} onChange={(event) => void update("tripReminders", event.target.checked)} />
          </label>
        </section>
      </div>

      <div className="space-y-6">
        <TravellerSettings traveller={data.traveller} />
        <section className="card space-y-3 p-6 sm:p-8">
          <h2 className="serif text-3xl font-medium">Booking history</h2>
          <p className="text-sm text-ink-700">Clearing history removes local trips and boarding passes and releases their seats. Your preferences are kept.</p>
          <button type="button" className="btn btn-ghost notice-danger-text max-w-full !whitespace-normal" disabled={!data.bookings.length}
            onClick={() => { setCleared(false); setClearError(""); setConfirmOpen(true); }}>
            Clear booking history
          </button>
          {cleared && <p role="status" className="text-sm text-ink-700">Booking history cleared.</p>}
        </section>
      </div>

      <Modal open={confirmOpen} onClose={() => { if (!clearing) setConfirmOpen(false); }} title="Clear booking history?">
        <p className="text-sm text-ink-700">This permanently removes your upcoming, completed, and cancelled bookings from this browser.</p>
        {clearError && <p role="alert" className="notice-danger-text mt-4 text-sm">{clearError}</p>}
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" className="btn btn-ghost" disabled={clearing} onClick={() => setConfirmOpen(false)}>Keep history</button>
          <button type="button" className="btn bg-[#91472e] text-[#fffaf0] hover:bg-[#773b28]" disabled={clearing} onClick={clear}>
            {clearing ? "Clearing…" : "Clear history"}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function TravellerSettings({ traveller }: { traveller: DemoState["traveller"] }) {
  const id = useId();
  const [draft, setDraft] = useState<Partial<DemoState["traveller"]>>({});
  const form = { ...traveller, ...draft };
  const [feedback, setFeedback] = useState<{ text: string; error: boolean }>();
  const [saving, setSaving] = useState(false);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(undefined);
    const next = {
      name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(), dob: form.dob,
      nationality: form.nationality.trim(), passportNumber: form.passportNumber.trim(),
    };
    if (next.name.split(/\s+/).length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email) ||
        (next.dob && (!isValidDate(next.dob) || next.dob > todayStr()))) {
      setFeedback({ text: "Enter a first and last name, a valid email, and a valid date of birth if provided.", error: true });
      return;
    }
    setSaving(true);
    try {
      await saveTraveller(next);
      setDraft({});
      setFeedback({ text: "Traveller details saved.", error: false });
    } catch (error) {
      setFeedback({ text: (error as Error).message, error: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="card space-y-4 p-6 sm:p-8">
      <div>
        <h2 className="serif text-3xl font-medium">Traveller details</h2>
        <p className="mt-1 text-sm text-ink-700">Save fictional details to prefill your next booking.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {TRAVELLER_FIELDS.map(({ key, label, type, ...options }) => (
          <div key={key} className={key === "name" || key === "email" ? "sm:col-span-2" : undefined}>
            <label className="label" htmlFor={`${id}-${key}`}>{label}</label>
            <input className="field" id={`${id}-${key}`} type={type} value={form[key]}
              maxLength={type === "date" ? undefined : 100} {...options}
              onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} />
          </div>
        ))}
      </div>
      {feedback && <p role={feedback.error ? "alert" : "status"} className={`text-sm ${feedback.error ? "notice-danger-text" : "text-ink-700"}`}>{feedback.text}</p>}
      <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving…" : "Save traveller details"}</button>
    </form>
  );
}
