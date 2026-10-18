/**
 * Motion physics, after Apple's "Designing Fluid Interfaces" (WWDC 2018).
 *
 * Springs are described the way Apple's designers describe them — a damping
 * ratio (1 = no overshoot, < 1 = bounce) and a response in seconds (how fast
 * it gets there) — rather than mass/stiffness/damping. They are solved
 * analytically, so a spring can be sampled at any time and re-targeted
 * mid-flight while keeping its current position and velocity: no jump, no
 * "brick wall" when a gesture reverses.
 *
 * Pure functions, no DOM: unit-tested in physics.test.ts.
 */

export interface SpringConfig {
  /** 1 = critically damped (no overshoot). < 1 bounces. */
  damping: number;
  /** Seconds to (roughly) reach the target. Not a duration: settle time emerges. */
  response: number;
}

/** House defaults. Bounce only where a gesture carried momentum into the motion. */
export const SPRING = {
  /** Most UI: smooth, no overshoot. */
  default: { damping: 1, response: 0.35 },
  /** Repositioning something the user let go of. */
  move: { damping: 1, response: 0.4 },
  /** A sheet or drawer released with a flick (Apple ships 0.8 / 0.3). */
  flick: { damping: 0.8, response: 0.3 },
} as const satisfies Record<string, SpringConfig>;

export interface SpringState {
  /** Current value. */
  x: number;
  /** Current velocity, units per second. */
  v: number;
}

/**
 * The spring's exact state `t` seconds after starting at `from` (with velocity
 * `from.v`) toward `target`. Closed-form, so it is stable at any frame rate.
 */
export function springAt(
  from: SpringState,
  target: number,
  cfg: SpringConfig,
  t: number,
): SpringState {
  const w0 = (2 * Math.PI) / cfg.response;
  const z = Math.max(0, cfg.damping);
  const d0 = from.x - target;
  const v0 = from.v;

  if (z < 1) {
    const wd = w0 * Math.sqrt(1 - z * z);
    const a = z * w0;
    const c = (v0 + a * d0) / wd;
    const e = Math.exp(-a * t);
    const cos = Math.cos(wd * t);
    const sin = Math.sin(wd * t);
    return {
      x: target + e * (d0 * cos + c * sin),
      v: e * (v0 * cos + (-a * c - d0 * wd) * sin),
    };
  }
  // Critically damped (over-damped configs are treated as critical: no overshoot either way).
  const b = v0 + w0 * d0;
  const e = Math.exp(-w0 * t);
  return { x: target + e * (d0 + b * t), v: e * (v0 - w0 * b * t) };
}

/** Whether a spring has visibly settled (default thresholds suit pixel units). */
export function isAtRest(
  s: SpringState,
  target: number,
  precision = 0.5,
  restVelocity = 5,
): boolean {
  return Math.abs(s.x - target) < precision && Math.abs(s.v) < restVelocity;
}

/**
 * Where a flick would come to rest if it decelerated like a scroll view —
 * Apple's projection function. `decelerationRate` 0.998 = normal, 0.99 = fast.
 * Choose a snap target from `position + project(velocity)`, not from the
 * release point, so a small fast flick travels as far as it feels like it should.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Progressive resistance past a boundary: the further past, the less the
 * element follows. Never stops dead, never exceeds `dimension`.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  if (dimension <= 0) return 0;
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** The snap point nearest to `value`. */
export function nearest(points: readonly number[], value: number): number {
  let best = points[0] ?? value;
  for (const p of points) if (Math.abs(p - value) < Math.abs(best - value)) best = p;
  return best;
}

/**
 * Pointer velocity from recent samples (units/s). Uses only the last ~100 ms,
 * so a drag that paused before release reads as slow, not as its old speed.
 */
export class VelocityTracker {
  private samples: Array<{ t: number; x: number }> = [];

  constructor(private readonly windowMs = 100) {}

  reset(): void {
    this.samples = [];
  }

  add(t: number, x: number): void {
    this.samples.push({ t, x });
    const cutoff = t - this.windowMs;
    while (this.samples.length > 2 && (this.samples[0]?.t ?? t) < cutoff) this.samples.shift();
  }

  velocity(): number {
    const first = this.samples[0];
    const last = this.samples[this.samples.length - 1];
    if (!first || !last || last.t === first.t) return 0;
    return ((last.x - first.x) / (last.t - first.t)) * 1000;
  }
}
