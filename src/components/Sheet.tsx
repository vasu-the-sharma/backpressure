"use client";

import { SpringAnimation, prefersReducedMotion } from "@/lib/motion/animate";
import {
  SPRING,
  type SpringConfig,
  VelocityTracker,
  nearest,
  project,
  rubberband,
} from "@/lib/motion/physics";
import { type ReactNode, useCallback, useEffect, useId, useLayoutEffect, useRef } from "react";

export type SheetSnap = "peek" | "half" | "full";
const ORDER: SheetSnap[] = ["peek", "half", "full"];

/** Pixels of movement before a press becomes a drag (taps on buttons inside stay taps). */
const DRAG_THRESHOLD = 10;
/** Release speed (px/s) above which the release counts as a flick and may bounce. */
const FLICK_VELOCITY = 500;

/**
 * A bottom sheet for phones, built on Apple's fluid-interface rules:
 * it tracks the finger 1:1 from where it was grabbed, can be caught
 * mid-animation, resists past its ends (rubber-banding), and on release
 * projects the flick's momentum to pick a resting point, then springs there
 * at the finger's velocity. Non-modal: no scrim, the canvas stays usable.
 *
 * `header` is always visible (the peek); `children` scroll inside.
 */
export function Sheet({
  snap,
  onSnapChange,
  header,
  children,
  label,
  className,
}: {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  header: ReactNode;
  children: ReactNode;
  label: string;
  className?: string;
}) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const contentId = useId();
  const y = useRef(0); // translateY; 0 = fully open
  const anim = useRef<SpringAnimation | null>(null);
  const snaps = useRef<Record<SheetSnap, number>>({ peek: 0, half: 0, full: 0 });
  const drag = useRef<{
    id: number;
    startY: number;
    startOffset: number;
    active: boolean;
    tracker: VelocityTracker;
  } | null>(null);
  /**
   * When the last drag ended. A mouse drag that ends over a button fires a
   * click there, which must not count as a tap. Touch drags usually fire no
   * click at all, so this is time-bound and cleared by the next press rather
   * than a flag that could linger and swallow a later, real tap.
   */
  const dragEndedAt = useRef(Number.NEGATIVE_INFINITY);
  const snapRef = useRef(snap);
  snapRef.current = snap;

  const apply = useCallback((value: number) => {
    y.current = value;
    const el = sheetRef.current;
    if (el) el.style.transform = `translate3d(0, ${value}px, 0)`;
  }, []);

  const measure = useCallback(() => {
    const el = sheetRef.current;
    const head = headerRef.current;
    if (!el || !head) return;
    const height = el.offsetHeight;
    const peekVisible = head.offsetHeight;
    const halfVisible = Math.max(peekVisible, Math.round(window.innerHeight * 0.5));
    snaps.current = { peek: height - peekVisible, half: height - halfVisible, full: 0 };
  }, []);

  /**
   * Spring to `target`. With a release `velocity`, the motion starts at the
   * finger's speed. Without one, a running animation is re-targeted so it
   * keeps its current velocity instead of stopping and restarting.
   */
  const springTo = useCallback(
    (target: number, velocity?: number, config: SpringConfig = SPRING.default) => {
      if (prefersReducedMotion()) {
        anim.current?.stop();
        anim.current = null;
        apply(target);
        return;
      }
      if (anim.current && velocity === undefined) {
        anim.current.retarget(target, config);
        return;
      }
      anim.current?.stop();
      anim.current = new SpringAnimation(
        { x: y.current, v: velocity ?? 0 },
        target,
        config,
        apply,
        () => {
          anim.current = null;
        },
      );
    },
    [apply],
  );

  // Initial position and on resize: sit at the current snap without animating.
  useLayoutEffect(() => {
    measure();
    apply(snaps.current[snapRef.current]);
    const onResize = () => {
      measure();
      anim.current?.stop();
      apply(snaps.current[snapRef.current]);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure, apply]);

  // The parent changed the snap (e.g. raise the sheet to show a result).
  useEffect(() => {
    if (drag.current?.active) return;
    measure();
    const target = snaps.current[snap];
    if (Math.abs(target - y.current) > 0.5) springTo(target);
  }, [snap, measure, springTo]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragEndedAt.current = Number.NEGATIVE_INFINITY; // a new press starts fresh
    // Catch it mid-flight: continue from where it is on screen right now.
    const live = anim.current?.stop();
    anim.current = null;
    if (live) apply(live.x);
    const tracker = new VelocityTracker();
    tracker.add(e.timeStamp, e.clientY);
    drag.current = {
      id: e.pointerId,
      startY: e.clientY,
      startOffset: y.current,
      active: false,
      tracker,
    };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.startY;
    if (!d.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      d.active = true;
      // Re-base so the sheet doesn't jump by the threshold distance.
      d.startY = e.clientY;
      try {
        headerRef.current?.setPointerCapture(e.pointerId); // keep tracking outside the header
      } catch {
        // Capture can fail for synthetic or already-released pointers; tracking still works.
      }
    }
    d.tracker.add(e.timeStamp, e.clientY);
    const raw = d.startOffset + (e.clientY - d.startY);
    const { full, peek } = snaps.current;
    const height = sheetRef.current?.offsetHeight ?? window.innerHeight;
    const next =
      raw < full
        ? full + rubberband(raw - full, height)
        : raw > peek
          ? peek + rubberband(raw - peek, height)
          : raw;
    apply(next);
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    drag.current = null;
    if (!d || d.id !== e.pointerId || !d.active) return;
    dragEndedAt.current = performance.now(); // a drag that ends over a button is not a tap
    const velocity = d.tracker.velocity();
    const points = ORDER.map((s) => snaps.current[s]);
    const target = nearest(points, y.current + project(velocity));
    const next = ORDER[points.indexOf(target)] ?? "peek";
    springTo(target, velocity, Math.abs(velocity) > FLICK_VELOCITY ? SPRING.flick : SPRING.move);
    if (next !== snapRef.current) onSnapChange(next);
  };

  const step = (dir: 1 | -1) => {
    const i = ORDER.indexOf(snapRef.current);
    const next = ORDER[Math.min(ORDER.length - 1, Math.max(0, i + dir))] ?? "peek";
    onSnapChange(next);
  };

  return (
    <section
      ref={sheetRef}
      aria-label={label}
      className={`material-sheet fixed inset-x-0 bottom-0 z-40 flex h-[88dvh] flex-col rounded-t-[14px] will-change-transform ${className ?? ""}`}
      style={{ transform: "translate3d(0, 100%, 0)" }}
    >
      <div
        ref={headerRef}
        className="shrink-0 touch-none select-none px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={(e) => {
          // Keyboard activation (detail 0) is never the tail of a drag.
          if (e.detail !== 0 && performance.now() - dragEndedAt.current < 400) {
            dragEndedAt.current = Number.NEGATIVE_INFINITY;
            e.stopPropagation();
            e.preventDefault();
          }
        }}
      >
        <button
          type="button"
          aria-expanded={snap !== "peek"}
          aria-controls={contentId}
          onClick={() => onSnapChange(snap === "peek" ? "half" : "peek")}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              step(1);
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              step(-1);
            }
          }}
          className="focus-ring mx-auto flex h-6 w-full items-center justify-center rounded-md"
        >
          <span aria-hidden className="h-1 w-9 rounded-full bg-fg-3/70" />
          <span className="sr-only">{snap === "peek" ? "Expand brief" : "Collapse brief"}</span>
        </button>
        {header}
      </div>
      <div
        id={contentId}
        inert={snap === "peek"}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-white/[0.06]"
      >
        {children}
      </div>
    </section>
  );
}
