// Shared (client + server) static reference data.

export type Airport = {
  code: string;
  city: string;
  name: string;
  country: string;
  timeZone: string;
  lat: number;
  lon: number;
};

export const AIRPORTS: Airport[] = [
  { code: "JFK", city: "New York", name: "John F. Kennedy Intl", country: "United States", timeZone: "America/New_York", lat: 40.64, lon: -73.78 },
  { code: "LAX", city: "Los Angeles", name: "Los Angeles Intl", country: "United States", timeZone: "America/Los_Angeles", lat: 33.94, lon: -118.41 },
  { code: "SFO", city: "San Francisco", name: "San Francisco Intl", country: "United States", timeZone: "America/Los_Angeles", lat: 37.62, lon: -122.38 },
  { code: "ORD", city: "Chicago", name: "O'Hare Intl", country: "United States", timeZone: "America/Chicago", lat: 41.98, lon: -87.9 },
  { code: "MIA", city: "Miami", name: "Miami Intl", country: "United States", timeZone: "America/New_York", lat: 25.79, lon: -80.29 },
  { code: "YYZ", city: "Toronto", name: "Pearson Intl", country: "Canada", timeZone: "America/Toronto", lat: 43.68, lon: -79.63 },
  { code: "LHR", city: "London", name: "Heathrow", country: "United Kingdom", timeZone: "Europe/London", lat: 51.47, lon: -0.45 },
  { code: "CDG", city: "Paris", name: "Charles de Gaulle", country: "France", timeZone: "Europe/Paris", lat: 49.01, lon: 2.55 },
  { code: "FRA", city: "Frankfurt", name: "Frankfurt Airport", country: "Germany", timeZone: "Europe/Berlin", lat: 50.04, lon: 8.56 },
  { code: "AMS", city: "Amsterdam", name: "Schiphol", country: "Netherlands", timeZone: "Europe/Amsterdam", lat: 52.31, lon: 4.76 },
  { code: "FCO", city: "Rome", name: "Fiumicino", country: "Italy", timeZone: "Europe/Rome", lat: 41.8, lon: 12.25 },
  { code: "DXB", city: "Dubai", name: "Dubai Intl", country: "United Arab Emirates", timeZone: "Asia/Dubai", lat: 25.25, lon: 55.36 },
  { code: "DEL", city: "Delhi", name: "Indira Gandhi Intl", country: "India", timeZone: "Asia/Kolkata", lat: 28.56, lon: 77.1 },
  { code: "BOM", city: "Mumbai", name: "Chhatrapati Shivaji Intl", country: "India", timeZone: "Asia/Kolkata", lat: 19.09, lon: 72.87 },
  { code: "BLR", city: "Bengaluru", name: "Kempegowda Intl", country: "India", timeZone: "Asia/Kolkata", lat: 13.2, lon: 77.71 },
  { code: "SIN", city: "Singapore", name: "Changi", country: "Singapore", timeZone: "Asia/Singapore", lat: 1.36, lon: 103.99 },
  { code: "HKG", city: "Hong Kong", name: "Hong Kong Intl", country: "Hong Kong SAR", timeZone: "Asia/Hong_Kong", lat: 22.31, lon: 113.91 },
  { code: "HND", city: "Tokyo", name: "Haneda", country: "Japan", timeZone: "Asia/Tokyo", lat: 35.55, lon: 139.78 },
  { code: "SYD", city: "Sydney", name: "Kingsford Smith", country: "Australia", timeZone: "Australia/Sydney", lat: -33.95, lon: 151.18 },
];

export const airportByCode = (code: string) => AIRPORTS.find((a) => a.code === code);

export type Airline = { code: string; name: string; color: string };
export const AIRLINES: Record<string, Airline> = {
  AL: { code: "AL", name: "Airlines", color: "#85694a" },
  AR: { code: "AR", name: "Aurora Air", color: "#b5703f" },
  MR: { code: "MR", name: "Meridian Airways", color: "#5f7a68" },
  SL: { code: "SL", name: "Solstice Air", color: "#a8864a" },
  KS: { code: "KS", name: "Kestrel Airlines", color: "#6b6a86" },
};

export type CabinId = "economy" | "premium" | "business";
export type FareId = "saver" | "flex" | "premium" | "business";

export type Fare = {
  id: FareId;
  name: string;
  cabin: CabinId;
  mult: number;
  carryOn: string;
  checked: string;
  seat: string;
  change: string;
  refund: boolean;
  refundText: string;
  meal: string;
  miles: string;
  lounge: boolean;
  tagline: string;
};

export const FARES: Fare[] = [
  {
    id: "saver", name: "Economy Saver", cabin: "economy", mult: 1,
    carryOn: "1 × 7 kg", checked: "Not included", seat: "Standard seats free", change: "Change fee $75",
    refund: false, refundText: "Non-refundable (taxes returned)", meal: "Snack & drink", miles: "50% miles", lounge: false,
    tagline: "Simply the lowest fare",
  },
  {
    id: "flex", name: "Economy Flex", cabin: "economy", mult: 1.28,
    carryOn: "1 × 10 kg", checked: "1 × 23 kg", seat: "Standard seats free", change: "Free changes",
    refund: true, refundText: "Fully refundable", meal: "Meal & drinks", miles: "100% miles", lounge: false,
    tagline: "Flexibility, fully refundable",
  },
  {
    id: "premium", name: "Premium Economy", cabin: "premium", mult: 2.05,
    carryOn: "2 × 10 kg", checked: "2 × 23 kg", seat: "Wide seat, all free", change: "Free changes",
    refund: true, refundText: "Fully refundable", meal: "Chef's menu", miles: "150% miles", lounge: false,
    tagline: "Room to breathe",
  },
  {
    id: "business", name: "Business", cabin: "business", mult: 3.5,
    carryOn: "2 × 12 kg", checked: "2 × 32 kg", seat: "Lie-flat suite", change: "Free changes",
    refund: true, refundText: "Fully refundable", meal: "Fine dining", miles: "200% miles", lounge: true,
    tagline: "The finest way to fly",
  },
];
export const fareById = (id: string) => FARES.find((f) => f.id === id);

export type CurrencyInfo = { code: string; name: string; symbol: string; rate: number };
// Indicative exchange rates against 1 USD.
export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", name: "US Dollar", symbol: "$", rate: 1 },
  { code: "INR", name: "Indian Rupee", symbol: "₹", rate: 83.5 },
  { code: "EUR", name: "Euro", symbol: "€", rate: 0.92 },
  { code: "GBP", name: "British Pound", symbol: "£", rate: 0.79 },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", rate: 3.6725 },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", rate: 1.52 },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", rate: 1.37 },
  { code: "SGD", name: "Singapore Dollar", symbol: "S$", rate: 1.34 },
  { code: "JPY", name: "Japanese Yen", symbol: "¥", rate: 155 },
  { code: "CHF", name: "Swiss Franc", symbol: "CHF", rate: 0.89 },
  { code: "CNY", name: "Chinese Yuan", symbol: "CN¥", rate: 7.24 },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", rate: 3.75 },
];
export const currencyByCode = (code: string) => CURRENCIES.find((c) => c.code === code);

const ZERO_DECIMAL = new Set(["JPY"]);
export function formatCurrency(amount: number, currency: string, exact = false) {
  const digits = ZERO_DECIMAL.has(currency) || !exact ? 0 : 2;
  try {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(digits)}`;
  }
}

export const TAX_RATE = 0.12;
export const MAX_PAX = 6;
export const GENDER_OPTIONS = ["Female", "Male", "Unspecified"] as const;
