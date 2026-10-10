"use client";

import { CheckGlyph } from "@/components/ui";
import { useEffect, useState } from "react";

/**
 * Whether the viewer has passed a challenge (per-browser). Shows a skeleton
 * until storage has been read, so the row never claims the wrong state.
 */
export function SolvedBadge({ slug }: { slug: string }) {
  const [solved, setSolved] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setSolved(localStorage.getItem(`bp.solved.${slug}`) === "1");
    } catch {
      setSolved(false); // storage unavailable — progress is a convenience.
    }
  }, [slug]);

  if (solved === null) return <span className="skeleton h-3 w-14" aria-hidden />;
  return solved ? (
    <span className="inline-flex items-center gap-1 text-xs text-ok-fg">
      <CheckGlyph size={11} />
      Solved
    </span>
  ) : (
    <span className="text-xs text-fg-3">Not solved</span>
  );
}
