"use client";

import { useEffect, useState } from "react";

/** Shows a "Solved" marker for a challenge the viewer has passed (per-browser). */
export function SolvedBadge({ slug }: { slug: string }) {
  const [solved, setSolved] = useState(false);

  useEffect(() => {
    try {
      setSolved(localStorage.getItem(`bp.solved.${slug}`) === "1");
    } catch {
      // storage unavailable — show nothing.
    }
  }, [slug]);

  if (!solved) return null;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium"
      style={{
        color: "var(--color-healthy)",
        borderColor: "color-mix(in srgb, var(--color-healthy) 45%, transparent)",
        background: "color-mix(in srgb, var(--color-healthy) 10%, transparent)",
      }}
    >
      ✓ Solved
    </span>
  );
}
