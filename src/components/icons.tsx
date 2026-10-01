import type { NodeKind } from "@/sim/types";
import type { ReactNode } from "react";

/**
 * A small, consistent icon set. Every glyph is a 24x24, stroke-based mark using
 * currentColor, so icons inherit text color and sit on one visual system.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function Svg({ size = 18, className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {children}
    </svg>
  );
}

/* ---------------- Node-kind glyphs ---------------- */

const KIND_GLYPH: Record<NodeKind, ReactNode> = {
  client: (
    <>
      <rect x="3.5" y="5" width="17" height="12" rx="2" />
      <path d="M3.5 9h17" />
      <path d="M9 20h6M12 17v3" />
    </>
  ),
  cdn: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M4 12h16" />
      <ellipse cx="12" cy="12" rx="4" ry="8" />
    </>
  ),
  gateway: (
    <>
      <path d="M7 20V6a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v14" />
      <path d="M5 20h14" />
      <circle cx="14.4" cy="12.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  lb: (
    <>
      <circle cx="5" cy="12" r="2" />
      <circle cx="19" cy="6" r="1.8" />
      <circle cx="19" cy="12" r="1.8" />
      <circle cx="19" cy="18" r="1.8" />
      <path d="M7 11.2 16.9 6.6M7 12h10M7 12.8 16.9 17.4" />
    </>
  ),
  service: (
    <>
      <path d="M12 3.2 19.5 7.6v8.8L12 20.8 4.5 16.4V7.6Z" />
      <circle cx="12" cy="12" r="2.2" />
    </>
  ),
  cache: (
    <>
      <path d="M12.5 3 6 13h4.2l-1.2 8L18 11h-4.6Z" />
    </>
  ),
  queue: (
    <>
      <rect x="4" y="9" width="3.6" height="6" rx="1" />
      <rect x="10.2" y="9" width="3.6" height="6" rx="1" />
      <rect x="16.4" y="9" width="3.6" height="6" rx="1" />
    </>
  ),
  db: (
    <>
      <ellipse cx="12" cy="6" rx="7" ry="2.6" />
      <path d="M5 6v12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6V6" />
      <path d="M5 12c0 1.4 3.1 2.6 7 2.6s7-1.2 7-2.6" />
    </>
  ),
  storage: (
    <>
      <rect x="3.5" y="6.5" width="17" height="11" rx="2" />
      <path d="M3.5 12h17" />
      <circle cx="7" cy="9.3" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="7" cy="14.7" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
};

export function KindIcon({ kind, size, className }: { kind: NodeKind } & IconProps) {
  return (
    <Svg size={size} className={className}>
      {KIND_GLYPH[kind]}
    </Svg>
  );
}

/* ---------------- System glyphs ---------------- */

const SYSTEM_GLYPH: Record<string, ReactNode> = {
  car: (
    <>
      <path d="M3 15l1.7-4.8A2 2 0 0 1 6.6 9h10.8a2 2 0 0 1 1.9 1.2L21 15" />
      <path d="M2.5 15h19v1.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1Z" />
      <circle cx="7.5" cy="17.5" r="1.9" />
      <circle cx="16.5" cy="17.5" r="1.9" />
    </>
  ),
  link: (
    <>
      <path d="M9.6 14.4a3.5 3.5 0 0 1 0-5l2-2a3.5 3.5 0 0 1 5 5l-1 1" />
      <path d="M14.4 9.6a3.5 3.5 0 0 1 0 5l-2 2a3.5 3.5 0 0 1-5-5l1-1" />
    </>
  ),
  message: (
    <>
      <path d="M20 14a2 2 0 0 1-2 2H9.5L5 19.5V16H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" />
      <path d="M8 9.5h8M8 12h5" />
    </>
  ),
};

/** Generic fallback: stacked layers. */
const SYSTEM_FALLBACK: ReactNode = (
  <>
    <path d="M12 3 21 8l-9 5-9-5Z" />
    <path d="M3 13l9 5 9-5M3 8v5m18-5v5" />
  </>
);

export function SystemIcon({ name, size, className }: { name?: string } & IconProps) {
  return (
    <Svg size={size} className={className}>
      {(name && SYSTEM_GLYPH[name]) || SYSTEM_FALLBACK}
    </Svg>
  );
}
