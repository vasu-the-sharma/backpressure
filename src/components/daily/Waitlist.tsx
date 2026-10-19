"use client";

import { type WaitlistInput, joinWaitlist } from "@/server/actions";
import { useState } from "react";

type State = "idle" | "saving" | "joined" | "already" | "invalid" | "failed";

/**
 * Join a paid plan's waitlist: one click when signed in, an email otherwise.
 * `price` records what the person was shown, for the price test.
 */
export function Waitlist({
  source,
  signedIn,
  plan = "pro",
  price,
  cta = "Join the Pro waitlist",
}: {
  source: string;
  signedIn: boolean;
  plan?: WaitlistInput["plan"];
  price?: { variant: string; cents: number };
  cta?: string;
}) {
  const [state, setState] = useState<State>("idle");
  const [email, setEmail] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("saving");
    try {
      const r = await joinWaitlist({
        plan,
        source,
        email: signedIn ? undefined : email,
        priceVariant: price?.variant,
        priceCents: price?.cents,
      });
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
      <p aria-live="polite" className="text-sm text-ok-fg">
        {state === "joined"
          ? "You're on the list. We'll email you when it opens."
          : "You're already on the list."}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row">
      {!signedIn && (
        <>
          <label htmlFor={`wl-${source}`} className="sr-only">
            Email
          </label>
          <input
            id={`wl-${source}`}
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
