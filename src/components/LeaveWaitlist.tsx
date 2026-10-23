"use client";

import { type LeaveState, leaveWaitlistWithToken } from "@/server/actions";
import { useActionState } from "react";

/** The button on the leave page. The token in the form is what the server checks. */
export function LeaveWaitlist({ token }: { token: string }) {
  const [state, action, pending] = useActionState<LeaveState, FormData>(leaveWaitlistWithToken, {});

  if (state.done) {
    return (
      <p aria-live="polite" className="mt-8 text-sm text-ok-fg">
        Done. You&apos;re off the waitlist.
      </p>
    );
  }

  return (
    <form action={action} className="mt-8 flex w-full flex-col items-center gap-3">
      <input type="hidden" name="t" value={token} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Leaving…" : "Leave the waitlist"}
      </button>
      {state.error && (
        <p role="alert" className="text-xs text-bad-fg">
          {state.error}
        </p>
      )}
    </form>
  );
}
