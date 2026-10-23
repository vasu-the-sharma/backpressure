"use client";

import { shortDate } from "@/lib/format";
import { type ProFormState, changeProAccess } from "@/server/actions";
import { useActionState } from "react";

/**
 * Admin control for someone's Pro access: grant 30 days or a year (grants add
 * up), or remove it. Admins have Pro anyway, so there's nothing to change.
 */
export function ProForm({
  userId,
  isAdmin,
  proUntil,
}: {
  userId: string;
  isAdmin: boolean;
  proUntil: Date | null;
}) {
  const [state, action, pending] = useActionState<ProFormState, FormData>(changeProAccess, {});
  const active = proUntil !== null && proUntil.getTime() > Date.now();

  if (isAdmin) return <p className="text-xs text-fg-3">Pro: included for admins</p>;

  return (
    <form action={action} className="flex flex-col items-start gap-2 sm:items-end">
      <input type="hidden" name="userId" value={userId} />
      <p className="text-xs text-fg-3">
        Pro:{" "}
        <span className={active ? "text-fg" : "text-fg-2"}>
          {active && proUntil ? `until ${shortDate(proUntil)}` : "none"}
        </span>
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          name="days"
          value="30"
          disabled={pending}
          className="btn btn-secondary btn-sm"
        >
          + 30 days
        </button>
        <button
          type="submit"
          name="days"
          value="365"
          disabled={pending}
          className="btn btn-secondary btn-sm"
        >
          + 1 year
        </button>
        {active && (
          <button
            type="submit"
            name="days"
            value="0"
            disabled={pending}
            className="btn btn-ghost btn-sm btn-danger-hover"
          >
            Remove
          </button>
        )}
      </div>
      {state.error && (
        <p role="alert" className="max-w-xs text-xs text-bad-fg sm:text-right">
          {state.error}
        </p>
      )}
    </form>
  );
}
