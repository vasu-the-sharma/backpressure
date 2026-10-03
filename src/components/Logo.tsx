/**
 * Backpressure logo — the "queue depth" mark.
 *
 * Four bars rise toward capacity; the tallest (the hero) is tipped into an
 * amber stress cap: a stage that has filled up and begun pushing back on
 * everything upstream. This is the exact grammar of the in-app utilization
 * meters and the section glyphs, so the brand and the data-viz read as one
 * instrument.
 */

interface LogoMarkProps {
  size?: number;
  /** Unique gradient id — pass distinct values when rendering more than one on a page. */
  id?: string;
  className?: string;
}

export function LogoMark({ size = 28, id = "bp", className }: LogoMarkProps) {
  const grad = `${id}-grad`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="28" x2="0" y2="4" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6E56F7" />
          <stop offset="1" stopColor="#8E7BFF" />
        </linearGradient>
      </defs>
      {/* queue bars rising left -> right */}
      <rect x="3.5" y="19" width="4" height="9" rx="1.5" fill={`url(#${grad})`} />
      <rect x="10.5" y="14" width="4" height="14" rx="1.5" fill={`url(#${grad})`} />
      <rect x="17.5" y="9" width="4" height="19" rx="1.5" fill={`url(#${grad})`} />
      {/* hero bar — maxed out */}
      <rect x="24.5" y="7" width="4" height="21" rx="1.5" fill={`url(#${grad})`} />
      {/* amber stress cap: backpressure has begun */}
      <rect x="24.5" y="5" width="4" height="4.6" rx="1.5" fill="#F5A524" />
    </svg>
  );
}

interface LogoProps {
  size?: number;
  id?: string;
  className?: string;
  /** Hide the wordmark below the `sm` breakpoint. */
  responsive?: boolean;
}

export function Logo({ size = 26, id = "bp", className, responsive = false }: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <LogoMark size={size} id={id} />
      <span
        className={`font-display text-[17px] font-semibold tracking-[-0.02em] text-fg ${
          responsive ? "hidden sm:inline" : ""
        }`}
      >
        Backpressure
      </span>
    </span>
  );
}

/** Tiny 3-bar echo of the mark, used as a section-header glyph. */
export function SectionGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect x="1.5" y="9" width="3" height="5.5" rx="1" fill="currentColor" />
      <rect x="6.5" y="5.5" width="3" height="9" rx="1" fill="currentColor" />
      <rect x="11.5" y="2" width="3" height="12.5" rx="1" fill="currentColor" />
    </svg>
  );
}
