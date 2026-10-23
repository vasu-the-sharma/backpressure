"use client";

import { PriceSurvey } from "@/components/pricing/PriceSurvey";
import type { Currency } from "@/content/pricing/plans";
import { type WaitlistInput, joinWaitlist } from "@/server/actions";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type State = "idle" | "saving" | "joined" | "already" | "invalid" | "limited" | "failed";

const ERRORS: Partial<Record<State, string>> = {
  invalid: "Enter a valid email.",
  limited: "Too many sign-ups from your network just now. Try again in an hour.",
  failed: "Couldn't join just now. Try again.",
};

/**
 * Join a paid plan's waitlist: one click when signed in, an email otherwise.
 * When a Pro price is on screen, `period` records the billing the person
 * chose (the server records the price itself), and `survey` then asks the
 * four Van Westendorp questions in their currency.
 *
 * Signed-out sign-ups carry two bot checks the server reads: a hidden field
 * people never fill, and how long the form was on screen.
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
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const trap = String(new FormData(e.currentTarget).get("bp-hp") ?? "");
    setState("saving");
    try {
      const r = await joinWaitlist({
        plan,
        source,
        period,
        email: signedIn ? undefined : email,
        trap,
        elapsedMs: shownAt.current ? Date.now() - shownAt.current : undefined,
      });
      setState(
        r.joined
          ? r.already
            ? "already"
            : "joined"
          : r.reason === "invalid-email"
            ? "invalid"
            : r.reason === "rate-limited"
              ? "limited"
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

  const error = ERRORS[state];
  return (
    <div>
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
              className="focus-ring h-9 min-w-0 rounded-md sm:flex-1 border border-line-strong bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-4"
            />
            {/* Left empty by people: it's off screen and out of the tab order. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <input type="text" name="bp-hp" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>
          </>
        )}
        <button type="submit" disabled={state === "saving"} className="btn btn-primary h-9">
          {state === "saving" ? "Joining…" : cta}
        </button>
      </form>
      {error && (
        <p aria-live="polite" className="mt-2 text-xs text-bad-fg">
          {error}
        </p>
      )}
      {!signedIn && (
        <p className="mt-2 text-xs text-fg-3">
          We&apos;ll only use it to email you about this.{" "}
          <Link
            href="/privacy"
            className="focus-ring rounded-sm underline decoration-line-strong underline-offset-2 hover:text-fg"
          >
            Privacy
          </Link>
        </p>
      )}
    </div>
  );
}
