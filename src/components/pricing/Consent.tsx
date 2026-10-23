"use client";

import { CONSENT_COOKIE } from "@/content/pricing/consent";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The visitor's answer about the price test's cookie, kept for a year in a
 * cookie of its own. The middleware reads it on the next request.
 */
type Choice = "yes" | "no";

function remember(choice: Choice) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
}

function remembered(): Choice | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=(yes|no)(?:;|$)`));
  return (m?.[1] as Choice | undefined) ?? null;
}

/**
 * Shown where the law asks for agreement first (the EU, EEA, UK and
 * Switzerland). The page re-renders with the answer: a yes puts the visitor
 * in the test, a no keeps the middle price and sets nothing else.
 */
export function ConsentBanner() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const choose = (c: Choice) => {
    remember(c);
    setBusy(true);
    router.refresh();
  };

  return (
    <section
      aria-label="Price test cookie"
      className="panel mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="max-w-2xl text-sm leading-relaxed text-fg-2">
        Pro&apos;s price is still being tested, so visitors see one of three. May we keep a random
        ID in a cookie so you see the same price each visit? Nothing else is tracked.{" "}
        <Link
          href="/privacy#cookies"
          className="focus-ring rounded-sm text-fg underline decoration-line-strong underline-offset-2"
        >
          Details
        </Link>
      </p>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => choose("yes")}
          className="btn btn-primary btn-sm"
        >
          Allow
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => choose("no")}
          className="btn btn-secondary btn-sm"
        >
          No thanks
        </button>
      </div>
    </section>
  );
}

/** On the privacy page: see and change the answer at any time. */
export function PriceTestChoice() {
  const [choice, setChoice] = useState<Choice | null>(null);
  useEffect(() => setChoice(remembered()), []);
  const set = (c: Choice) => {
    remember(c);
    setChoice(c);
  };

  return (
    <fieldset className="inline-flex rounded-md border border-line-strong p-0.5">
      <legend className="sr-only">Price test cookie</legend>
      {(["yes", "no"] as Choice[]).map((c) => (
        <label
          key={c}
          className={`cursor-pointer rounded-[5px] px-2.5 py-1 text-xs transition-colors duration-150 ease-out has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
            choice === c ? "bg-fill-2 text-fg" : "text-fg-3 hover:text-fg"
          }`}
        >
          <input
            type="radio"
            name="price-test-cookie"
            value={c}
            checked={choice === c}
            onChange={() => set(c)}
            className="sr-only"
          />
          {c === "yes" ? "Allow" : "Don't allow"}
        </label>
      ))}
    </fieldset>
  );
}
