import { LOCKUP, MARK_BARS, MARK_BAR_RADIUS, MARK_BAR_WIDTH } from "@/lib/brand";

/**
 * Backpressure logo — the "queue depth" mark (geometry in src/lib/brand.ts).
 * Bars take the current text color; the overflow cap is always amber.
 */
export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {MARK_BARS.map((b) => (
        <rect
          key={`${b.x}-${b.y}`}
          x={b.x}
          y={b.y}
          width={MARK_BAR_WIDTH}
          height={b.height}
          rx={MARK_BAR_RADIUS}
          fill={b.overflow ? "var(--color-warn)" : "currentColor"}
        />
      ))}
    </svg>
  );
}

/**
 * Mark + wordmark, in the brand's fixed proportions. `size` is the mark's box;
 * the wordmark is 0.46× it. `compact` hides the wordmark below the sm breakpoint.
 */
export function Logo({
  size = 30,
  className,
  compact = false,
}: {
  size?: number;
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center text-fg ${className ?? ""}`}
      style={{ gap: size * LOCKUP.gapScale }}
    >
      <LogoMark size={size} className="shrink-0" />
      <span
        className={`font-semibold leading-none ${compact ? "hidden sm:inline" : ""}`}
        style={{ fontSize: size * LOCKUP.wordScale, letterSpacing: LOCKUP.tracking }}
      >
        Backpressure
      </span>
    </span>
  );
}
