"use client";

import { type DeleteFormState, deleteMyAccount } from "@/server/account-actions";
import { useActionState, useState } from "react";

/** Download everything we store about you, or delete the account and all of it. */
export function AccountData() {
  const [state, action, pending] = useActionState<DeleteFormState, FormData>(deleteMyAccount, {});
  const [confirm, setConfirm] = useState("");
  const armed = confirm.trim().toLowerCase() === "delete";

  return (
    <div className="panel divide-y divide-line">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-fg">Download your data</p>
          <p className="mt-0.5 text-xs text-fg-3">Everything we store about you, as a JSON file.</p>
        </div>
        {/* A file download, so a plain link rather than client-side navigation. */}
        <a
          href="/account/export"
          download
          className="btn btn-secondary btn-sm self-start sm:self-auto"
        >
          Download
        </a>
      </div>
      <form action={action} className="flex flex-col gap-3 p-4">
        <div>
          <p className="text-sm font-medium text-fg">Delete account</p>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-fg-3">
            Removes your account, saved runs, quiz scores, daily results and waitlist entries. This
            can&apos;t be undone.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="confirm-delete" className="sr-only">
            Type delete to confirm
          </label>
          <input
            id="confirm-delete"
            name="confirm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type delete to confirm"
            autoComplete="off"
            className="focus-ring h-8 rounded-md border border-line-strong bg-surface px-3 text-sm text-fg placeholder:text-fg-4 sm:w-56"
          />
          <button
            type="submit"
            disabled={!armed || pending}
            className="btn btn-secondary btn-sm btn-danger-hover self-start sm:self-auto"
          >
            {pending ? "Deleting…" : "Delete my account"}
          </button>
        </div>
        {state.error && (
          <p role="alert" className="text-xs text-bad-fg">
            {state.error}
          </p>
        )}
      </form>
    </div>
  );
}
