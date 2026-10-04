"use client";

import { useEffect, useState } from "react";

/** Shows the viewer's best score for a quiz (per-browser). */
export function QuizScoreBadge({ slug, total }: { slug: string; total: number }) {
  const [best, setBest] = useState<number | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(`bp.quiz.${slug}`);
      if (v !== null) setBest(Number(v));
    } catch {
      // storage unavailable — show nothing.
    }
  }, [slug]);

  if (best === null) return null;
  const full = best >= total;
  const color = full ? "var(--color-healthy)" : "var(--color-fg-subtle)";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium"
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 45%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {full ? "✓ " : ""}
      Best {best}/{total}
    </span>
  );
}
