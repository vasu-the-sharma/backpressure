"use client";

import { useAuthEnabled } from "@/components/AuthProvider";
import type { SaveResult } from "@/server/actions";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "failed" | "signed-out";

/** Save a result to the signed-in client's account; signed-out visitors just get a nudge. */
export function useSaveProgress() {
  const enabled = useAuthEnabled();
  const { status } = useSession();
  const [state, setState] = useState<SaveState>("idle");

  const save = useCallback(
    async (send: () => Promise<SaveResult>) => {
      if (!enabled) return; // accounts not set up here: nothing to save to, nothing to nag about
      if (status !== "authenticated") {
        setState("signed-out");
        return;
      }
      setState("saving");
      try {
        const r = await send();
        setState(r.saved ? "saved" : r.reason === "signed-out" ? "signed-out" : "failed");
      } catch {
        setState("failed");
      }
    },
    [enabled, status],
  );

  return { state, save };
}

/** One quiet line under a result saying whether it reached the account. */
export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  const pathname = usePathname();
  if (state === "idle") return null;
  const text =
    state === "saving" ? (
      "Saving to your account…"
    ) : state === "saved" ? (
      "Saved to your account."
    ) : state === "failed" ? (
      <span className="text-bad-fg">Couldn&apos;t save this to your account. Try again.</span>
    ) : (
      <>
        <Link
          href={`/signin?callbackUrl=${encodeURIComponent(pathname)}`}
          className="focus-ring rounded-sm text-fg underline decoration-line-strong underline-offset-2 hover:decoration-fg"
        >
          Sign in
        </Link>{" "}
        to save your progress.
      </>
    );
  return (
    <p aria-live="polite" className={`text-xs text-fg-3 ${className ?? ""}`}>
      {text}
    </p>
  );
}
