/**
 * Where the price test's cookies need the visitor's agreement first: the EU,
 * the rest of the EEA, the UK and Switzerland. Elsewhere the test runs and is
 * disclosed in the privacy policy. Countries are ISO codes from Vercel's
 * geolocation header.
 */
const ASK_FIRST = new Set([
  // EU
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  // Rest of the EEA, the UK and Switzerland
  "IS",
  "LI",
  "NO",
  "GB",
  "CH",
]);

/** The visitor's answer, remembered for a year: "yes" or "no". */
export const CONSENT_COOKIE = "bp_consent";

export function mustAsk(country: string | null | undefined): boolean {
  return Boolean(country && ASK_FIRST.has(country.toUpperCase()));
}
