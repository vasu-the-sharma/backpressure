"use client";

import { useEffect } from "react";

/**
 * One listener for every `[data-light]` surface on the page: it writes the
 * mouse position inside the nearest one to --mx/--my, so CSS can light that
 * surface where the pointer is. Touch input is ignored; lit surfaces fall
 * back to their resting light.
 */
export function PointerLight() {
  useEffect(() => {
    let frame = 0;
    let last: PointerEvent | null = null;
    const apply = () => {
      frame = 0;
      const target = last?.target;
      if (!last || !(target instanceof Element)) return;
      const el = target.closest<HTMLElement>("[data-light]");
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${last.clientX - r.left}px`);
      el.style.setProperty("--my", `${last.clientY - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
