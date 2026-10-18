"use client";

import Link from "next/link";
import type { PointerEvent, ReactNode } from "react";

/** Puts a secondary CTA's light where the pointer is, in the button's own coordinates. */
function aimLight(e: PointerEvent<HTMLAnchorElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

/**
 * A landing-page call to action: icon, label, and a chevron that grows into an
 * arrow on hover. `primary` is the one white, glowing action in a group; a
 * `secondary` catches a light that follows the pointer, or lands under a
 * finger on press.
 */
export function CtaLink({
  href,
  icon,
  variant = "secondary",
  children,
}: {
  href: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary";
  children: ReactNode;
}) {
  const lit = variant === "secondary";
  return (
    <Link
      href={href}
      onPointerMove={lit ? aimLight : undefined}
      onPointerDown={lit ? aimLight : undefined}
      className={`cta cta-${variant}`}
    >
      {icon && <span className="cta-icon">{icon}</span>}
      {children}
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className="cta-arrow"
      >
        <path className="cta-arrow-stem" d="M1 5h7" />
        <path className="cta-arrow-tip" d="M1.5 1.5 5 5 1.5 8.5" />
      </svg>
    </Link>
  );
}
