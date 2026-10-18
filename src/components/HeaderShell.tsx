"use client";

import { type ReactNode, useEffect, useRef } from "react";

/**
 * The site header as a translucent material. No hard divider at rest: the
 * edge appears only once page content is actually scrolling underneath it.
 */
export function HeaderShell({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      ref.current?.setAttribute("data-scrolled", String(window.scrollY > 2));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <header ref={ref} data-scrolled="false" className="material-chrome sticky top-0 z-30">
      {children}
    </header>
  );
}
