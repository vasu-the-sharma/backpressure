/**
 * Plans and the live price test. Pro isn't for sale yet: visitors see one of
 * three price levels (an "arm", assigned at random and kept), and joining the
 * waitlist at that price is the signal. Comparing join rates across arms,
 * plus a Van Westendorp survey of the people who join, is how the price gets
 * set. See /admin/pricing for results.
 *
 * Interview prep is bought in bursts, so monthly is the headline and annual
 * carries the deep discount the category uses (~57% off, the same ratio in
 * every arm so only the price level varies).
 */

export type Arm = "a" | "b" | "c";
export type Segment = "intl" | "in";
export type Currency = "USD" | "INR";
export type Period = "monthly" | "annual";

export const ARMS: Arm[] = ["a", "b", "c"];

export interface ProPrice {
  monthly: number;
  annual: number;
  currency: Currency;
}

/** Whole currency units. India is priced for purchasing power, like the category does. */
export const PRO_PRICES: Record<Segment, Record<Arm, ProPrice>> = {
  intl: {
    a: { monthly: 19, annual: 99, currency: "USD" },
    b: { monthly: 29, annual: 149, currency: "USD" },
    c: { monthly: 39, annual: 199, currency: "USD" },
  },
  in: {
    a: { monthly: 599, annual: 2999, currency: "INR" },
    b: { monthly: 999, annual: 4999, currency: "INR" },
    c: { monthly: 1499, annual: 7499, currency: "INR" },
  },
};

/** The arm a search engine or an AI agent sees: the middle, our current best guess. */
export const CONTROL_ARM: Arm = "b";

export const isArm = (v: unknown): v is Arm => v === "a" || v === "b" || v === "c";

export function segmentForCountry(country: string | null | undefined): Segment {
  return country?.toUpperCase() === "IN" ? "in" : "intl";
}

/** Stable id stored with each signup, e.g. `pro-intl-b-monthly`. */
export function variantId(segment: Segment, arm: Arm, period: Period): string {
  return `pro-${segment}-${arm}-${period}`;
}

export function priceFor(segment: Segment, arm: Arm, period: Period): number {
  return PRO_PRICES[segment][arm][period];
}

export function formatMoney(amount: number, currency: Currency): string {
  return currency === "INR"
    ? `₹${amount.toLocaleString("en-IN")}`
    : `$${amount.toLocaleString("en-US")}`;
}

/** Annual billing as a monthly figure, e.g. "$12.42". */
export function perMonthOfAnnual(p: ProPrice): string {
  const v = p.annual / 12;
  return formatMoney(
    Math.round(v * (p.currency === "INR" ? 1 : 100)) / (p.currency === "INR" ? 1 : 100),
    p.currency,
  );
}

/** Percent saved by paying annually instead of twelve months. */
export function annualSaving(p: ProPrice): number {
  return Math.round((1 - p.annual / (p.monthly * 12)) * 100);
}

export interface PlanFeature {
  label: string;
  soon?: boolean;
}

export const FREE_FEATURES: PlanFeature[] = [
  { label: "Every system in the catalog" },
  { label: "All Playground challenges" },
  { label: "Quizzes" },
  { label: "Today's daily puzzle, leaderboard and streak" },
];

export const PRO_FEATURES: PlanFeature[] = [
  { label: "Everything in Free" },
  { label: "Every past daily puzzle, with its par and leaderboard" },
  { label: "AI interview coach that checks your answers against the simulator", soon: true },
  { label: "Famous-outage replays: watch the cascade, then stop it", soon: true },
  { label: "Cost mode: meet the targets at the lowest monthly bill", soon: true },
  { label: "Certificates you can share", soon: true },
];

export const TEAMS_FEATURES: PlanFeature[] = [
  { label: "Interview mode: run live system design interviews", soon: true },
  { label: "Classrooms: assign challenges and follow progress", soon: true },
  { label: "Incident drills for on-call teams", soon: true },
];
