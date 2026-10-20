"use client";

import { PriceSurvey } from "@/components/pricing/PriceSurvey";
import type { Currency } from "@/content/pricing/plans";
import { type WaitlistInput, joinWaitlist } from "@/server/actions";
import { useState } from "react";

type State = "idle" | "saving" | "joined" | "already" | "invalid" | "failed";

/**
 * Join a paid plan's waitlist: one click when signed in, an email otherwise.
 * When a Pro price is on screen, `period` records the billing the person
 * chose (the server records the price itself), and `survey` then asks the
 * four Van Westendorp questions in their currency.
 */
export function Waitlist({
  source,
  signedIn,
  plan = "pro",
  period,
  survey,
  cta = "Join the Pro waitlist",
}: {
  source: string;
  signedIn: boolean;
  plan?: WaitlistInput["plan"];
  period?: WaitlistInput["period"];
  survey?: { currency: Currency };
  cta?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    try {
      const r = await joinWaitlist({ plan, source, period, email: signedIn ? undefined : email });
      setState(
        r.joined
          ? r.already
            ? "already"
            : "joined"
          : r.reason === "invalid-email"
            ? "invalid"
            : "failed",
      );
    } catch {
      setState("failed");
    }
  };

  if (state === "joined" || state === "already") {
    return (
      <div className="flex flex-col gap-4">
        <p aria-live="polite" className="text-sm text-ok-fg">
          {state === "joined"
            ? "You're on the list. We'll email you when it opens."
            : "You're already on the list."}
        </p>
        {survey && <PriceSurvey currency={survey.currency} />}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      {!signedIn && (
        <>
          <label htmlFor={`wl-${source}-${plan}`} className="sr-only">
            Email
          </label>
          <input
            id={`wl-${source}-${plan}`}
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="focus-ring h-9 min-w-0 flex-1 rounded-md border border-line-strong bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-4"
          />
        </>
      )}
      <button type="submit" disabled={state === "saving"} className="btn btn-primary h-9">
        {state === "saving" ? "Joining…" : cta}
      </button>
      {(state === "invalid" || state === "failed") && (
        <p aria-live="polite" className="text-xs text-bad-fg sm:self-center">
          {state === "invalid" ? "Enter a valid email." : "Couldn't join just now. Try again."}
        </p>
      )}
    </form>
  );
}
