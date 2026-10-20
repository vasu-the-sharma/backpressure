"use client";

import type { Currency } from "@/content/pricing/plans";
import { submitPriceSurvey } from "@/server/actions";
import { useState } from "react";

/** The four Van Westendorp questions, in the order the method asks them. */
const QUESTIONS = [
  { key: "tooExpensive", text: "So expensive you wouldn't consider it" },
  { key: "tooCheap", text: "So cheap you'd doubt the quality" },
  { key: "expensive", text: "Getting expensive, but you'd still consider it" },
  { key: "cheap", text: "A bargain: a great buy for what you get" },
] as const;

type Key = (typeof QUESTIONS)[number]["key"];

/**
 * Asked right after someone joins the Pro waitlist: at what monthly price
 * does Pro feel too cheap, a bargain, expensive, too expensive? Answers are
 * stored as given; the analysis sets contradictory ones aside and counts them.
 */
export function PriceSurvey({ currency }: { currency: Currency }) {
  const [values, setValues] = useState<Record<Key, string>>({
    tooExpensive: "",
    tooCheap: "",
    expensive: "",
    cheap: "",
  });
  const [state, setState] = useState<"idle" | "saving" | "done" | "failed">("idle");
  const symbol = currency === "INR" ? "₹" : "$";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    const n = (k: Key) => Math.round(Number(values[k]));
    try {
      const r = await submitPriceSurvey({
        tooCheap: n("tooCheap"),
        cheap: n("cheap"),
        expensive: n("expensive"),
        tooExpensive: n("tooExpensive"),
      });
      setState(r.saved ? "done" : "failed");
    } catch {
      setState("failed");
    }
  };

  if (state === "done") {
    return (
      <p aria-live="polite" className="text-sm text-fg-2">
        Thank you. Your answers help set the price.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-line bg-surface-2 p-4 text-left">
      <p className="text-sm font-medium text-fg">Help us price Pro (30 seconds)</p>
      <p className="mt-1 text-xs text-fg-3">At what monthly price would Pro feel…</p>
      <div className="mt-3 grid gap-2">
        {QUESTIONS.map((q) => (
          <label key={q.key} className="flex items-center justify-between gap-3 text-sm text-fg-2">
            <span>{q.text}</span>
            <span className="flex shrink-0 items-center rounded-md border border-line-strong bg-surface focus-within:border-accent">
              <span className="pl-2 text-xs text-fg-3">{symbol}</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={1_000_000}
                required
                value={values[q.key]}
                onChange={(e) => setValues((v) => ({ ...v, [q.key]: e.target.value }))}
                className="tnum h-8 w-20 bg-transparent px-2 text-right text-sm text-fg outline-none"
              />
            </span>
          </label>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button type="submit" disabled={state === "saving"} className="btn btn-secondary btn-sm">
          {state === "saving" ? "Sending…" : "Send answers"}
        </button>
        {state === "failed" && (
          <span aria-live="polite" className="text-xs text-bad-fg">
            Couldn&apos;t send. Try again.
          </span>
        )}
      </div>
    </form>
  );
}
