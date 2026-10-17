"use client";

import type { Role } from "@/db/schema";
import { type RoleFormState, changeRole } from "@/server/actions";
import { useActionState } from "react";

/** Admin control for a person's role. Server-checked: admins only, never the last admin. */
export function RoleForm({
  userId,
  role,
  isSelf,
}: { userId: string; role: Role; isSelf: boolean }) {
  const [state, action, pending] = useActionState<RoleFormState, FormData>(changeRole, {});
  const next: Role = role === "admin" ? "client" : "admin";

  return (
    <form action={action} className="flex flex-col items-start gap-2 sm:items-end">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="role" value={next} />
      <p className="text-xs text-fg-3">
        Role:{" "}
        <span className={role === "admin" ? "text-warn-fg" : "text-fg"}>
          {role === "admin" ? "Admin" : "Client"}
        </span>
      </p>
      <button type="submit" disabled={pending} className="btn btn-secondary btn-sm">
        {pending
          ? "Saving…"
          : next === "admin"
            ? "Make admin"
            : isSelf
              ? "Remove my admin access"
              : "Make client"}
      </button>
      {state.error && (
        <p role="alert" className="max-w-xs text-xs text-bad-fg sm:text-right">
          {state.error}
        </p>
      )}
    </form>
  );
}
