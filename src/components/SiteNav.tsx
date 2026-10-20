"use client";

import { liveVerticals } from "@/content/verticals";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

/**
 * Top-level navigation, rendered from the verticals registry. The highlight
 * behind the current section is one element that slides to the new section
 * (on the shared spring), so moving between sections reads as one motion
 * from where you were to where you are.
 */
const ITEMS = [
  ...liveVerticals.map((v) => ({ key: v.slug, name: v.name, href: v.href })),
  { key: "daily", name: "Daily", href: "/daily" },
  { key: "pricing", name: "Pricing", href: "/pricing" },
];

export function SiteNav() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const [pill, setPill] = useState<{ x: number; w: number; animate: boolean } | null>(null);

  const activeIndex = ITEMS.findIndex(
    (v) => pathname === v.href || pathname.startsWith(`${v.href}/`),
  );

  useLayoutEffect(() => {
    const measure = (animate: boolean) => {
      const link = navRef.current?.querySelectorAll<HTMLElement>("a")[activeIndex];
      setPill((prev) =>
        link
          ? { x: link.offsetLeft, w: link.offsetWidth, animate: animate && prev !== null }
          : null,
      );
    };
    measure(true);
    // Re-measure without animating when layout shifts under it: viewport
    // changes, or the web font arriving and changing the links' widths.
    const relayout = () => measure(false);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(relayout) : null;
    if (navRef.current) ro?.observe(navRef.current);
    document.fonts?.ready.then(relayout).catch(() => {});
    window.addEventListener("resize", relayout);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", relayout);
    };
  }, [activeIndex]);

  return (
    <nav
      ref={navRef}
      aria-label="Main"
      className="no-scrollbar relative -mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1"
    >
      {pill && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 rounded-md bg-fill"
          style={{
            width: pill.w,
            transform: `translateX(${pill.x}px)`,
            transition: pill.animate
              ? "transform var(--duration-spring) var(--ease-spring), width var(--duration-spring) var(--ease-spring)"
              : "none",
          }}
        />
      )}
      {ITEMS.map((v, i) => {
        const active = i === activeIndex;
        return (
          <Link
            key={v.key}
            href={v.href}
            aria-current={active ? "page" : undefined}
            className={`focus-ring pressable relative shrink-0 rounded-md px-2.5 py-1.5 text-sm ${
              active ? "font-medium text-fg" : "text-fg-2 hover:bg-fill/60 hover:text-fg"
            }`}
          >
            {v.name}
          </Link>
        );
      })}
    </nav>
  );
}
