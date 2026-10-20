"use client";

import { type MailFormState, emailWaitlist } from "@/server/actions";
import { useActionState, useState } from "react";

type Plan = "pro" | "teams";

const field =
  "focus-ring w-full rounded-md border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-4";

/**
 * Write to one plan's waitlist: send yourself a test, then everyone. Subject
 * and message are kept between sends; the confirm box clears after each one.
 */
export function WaitlistMailer({
  counts,
  ready,
}: { counts: Record<Plan, number>; ready: boolean }) {
  const [state, action, pending] = useActionState<MailFormState, FormData>(emailWaitlist, {});
  const [plan, setPlan] = useState<Plan>("pro");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const n = counts[plan];

  return (
    <form action={action} aria-labelledby="mail" className="panel p-5">
      <h2 id="mail" className="text-base font-medium text-fg">
        Email the waitlist
      </h2>
      <p className="mt-1 text-xs text-fg-3">
        Plain text. <code className="text-fg-2">{"{price}"}</code> becomes the price each person was
        shown. Every email ends with why they got it and a link to leave.
      </p>
      {!ready && (
        <p className="mt-3 text-xs text-warn-fg">
          Email isn&apos;t set up yet. Add RESEND_API_KEY and EMAIL_FROM, then redeploy.
        </p>
      )}

      <fieldset className="mt-4 inline-flex rounded-md border border-line-strong p-0.5">
        <legend className="sr-only">Waitlist</legend>
        {(["pro", "teams"] as Plan[]).map((p) => (
          <label
            key={p}
            className={`cursor-pointer rounded-[5px] px-2.5 py-1 text-xs transition-colors duration-150 ease-out has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
              plan === p ? "bg-fill-2 text-fg" : "text-fg-3 hover:text-fg"
            }`}
          >
            <input
              type="radio"
              name="plan"
              value={p}
              checked={plan === p}
              onChange={() => setPlan(p)}
              className="sr-only"
            />
            {p === "pro" ? "Pro" : "Teams"} <span className="tnum">({counts[p]})</span>
          </label>
        ))}
      </fieldset>

      <label className="mt-4 block text-xs text-fg-3">
        Subject
        <input
          name="subject"
          required
          maxLength={200}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={`${field} mt-1 h-9`}
        />
      </label>
      <label className="mt-3 block text-xs text-fg-3">
        Message
        <textarea
          name="body"
          required
          rows={8}
          maxLength={20_000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={"Pro is open.\n\nYour price for the first year is {price}, as promised."}
          className={`${field} mt-1 py-2 leading-relaxed`}
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          name="mode"
          value="test"
          disabled={pending || !ready}
          className="btn btn-secondary btn-sm"
        >
          Send me a test
        </button>
        <label className="flex items-center gap-2 text-xs text-fg-2">
          <input type="checkbox" name="confirm" value="yes" className="accent-[var(--color-fg)]" />
          Send to all <span className="tnum">{n}</span>
        </label>
        <button
          type="submit"
          name="mode"
          value="all"
          disabled={pending || !ready || n === 0}
          className="btn btn-primary btn-sm"
        >
          {pending ? "Sending…" : `Send to ${n.toLocaleString("en-US")}`}
        </button>
      </div>

      {state.error && (
        <p role="alert" className="mt-3 text-xs text-bad-fg">
          {state.error}
        </p>
      )}
      {state.sent !== undefined && (
        <p aria-live="polite" className="mt-3 text-xs text-fg-2">
          {state.sent > 0 &&
            (state.test ? "Test sent to you. " : `Sent to ${state.sent.toLocaleString("en-US")}. `)}
          {state.failed ? (
            <span className="text-bad-fg">
              {state.test
                ? "The test didn't go out. Check the Resend settings."
                : `${state.failed.toLocaleString("en-US")} didn't go out.`}
            </span>
          ) : null}
        </p>
      )}
    </form>
  );
}
