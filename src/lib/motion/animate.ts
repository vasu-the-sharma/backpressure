import { type SpringConfig, type SpringState, isAtRest, springAt } from "./physics";

/**
 * Drives a spring on requestAnimationFrame. The live state can be read at any
 * moment (to grab the element mid-flight), and `retarget` redirects the motion
 * from its current position and velocity rather than restarting it.
 */
export class SpringAnimation {
  private origin: SpringState;
  private target: number;
  private config: SpringConfig;
  private startedAt = 0;
  private frame = 0;
  private current: SpringState;

  constructor(
    from: SpringState,
    to: number,
    config: SpringConfig,
    private readonly onUpdate: (x: number) => void,
    private readonly onRest?: () => void,
  ) {
    this.origin = from;
    this.current = from;
    this.target = to;
    this.config = config;
    this.startedAt = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  /** The presentation value: where the element is on screen right now. */
  get state(): SpringState {
    return this.sample(performance.now());
  }

  retarget(to: number, config: SpringConfig = this.config): void {
    const now = performance.now();
    this.origin = this.sample(now);
    this.startedAt = now;
    this.target = to;
    this.config = config;
    if (!this.frame) this.frame = requestAnimationFrame(this.tick);
  }

  stop(): SpringState {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
    this.current = this.sample(performance.now());
    return this.current;
  }

  private sample(now: number): SpringState {
    if (!this.frame) return this.current;
    return springAt(this.origin, this.target, this.config, (now - this.startedAt) / 1000);
  }

  private tick = (now: number) => {
    const s = springAt(this.origin, this.target, this.config, (now - this.startedAt) / 1000);
    if (isAtRest(s, this.target)) {
      this.current = { x: this.target, v: 0 };
      this.frame = 0;
      this.onUpdate(this.target);
      this.onRest?.();
      return;
    }
    this.current = s;
    this.onUpdate(s.x);
    this.frame = requestAnimationFrame(this.tick);
  };
}

/** Whether the viewer asked for less motion (checked live, not cached). */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}
