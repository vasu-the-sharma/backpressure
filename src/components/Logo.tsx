/**
 * Backpressure logo — the "queue depth" mark.
 *
 * Four queue bars rise toward capacity; the last one has filled and its cap is
 * amber, the same color the app uses for a bottleneck. It is the one place the
 * brand borrows a data-state color, because the mark *is* a queue backing up.
 */

interface LogoMarkProps {
  size?: number;
  className?: string;
}

export function LogoMark({ size = 20, className }: LogoMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="1" y="12" width="3" height="7" rx="0.75" fill="currentColor" />
      <rect x="6" y="9" width="3" height="10" rx="0.75" fill="currentColor" />
      <rect x="11" y="6" width="3" height="13" rx="0.75" fill="currentColor" />
      <rect x="16" y="4.5" width="3" height="14.5" rx="0.75" fill="currentColor" />
      <rect x="16" y="1" width="3" height="2.5" rx="0.75" fill="var(--color-warn)" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 text-fg ${className ?? ""}`}>
      <LogoMark />
      <span className={`text-sm font-semibold tracking-tight ${compact ? "hidden sm:inline" : ""}`}>
        Backpressure
      </span>
    </span>
  );
}
