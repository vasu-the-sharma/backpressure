"use client";

import { CheckGlyph } from "@/components/ui";
import { useEffect, useState } from "react";

/**
 * The viewer's best score for a quiz (per-browser). Shows a skeleton until
 * storage has been read, so the row never claims the wrong state.
 */
export function QuizScoreBadge({ slug, total }: { slug: string; total: number }) {
  const [best, setBest] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`bp.quiz.${slug}`);
      setBest(v === null ? null : Number(v));
    } catch {
      setBest(null); // storage unavailable — scores are a convenience.
    }
  }, [slug]);

  if (best === undefined) return <span className="skeleton h-3 w-16" aria-hidden />;
  if (best === null) return <span className="text-xs text-fg-3">Not taken</span>;
  const full = best >= total;
  return (
    <span
      className={`tnum inline-flex items-center gap-1 text-xs ${full ? "text-ok-fg" : "text-fg-2"}`}
    >
      {full && <CheckGlyph size={11} />}
      Best {best}/{total}
    </span>
  );
}
