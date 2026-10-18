import { describe, expect, it } from "vitest";
import {
  SPRING,
  type SpringConfig,
  VelocityTracker,
  isAtRest,
  nearest,
  project,
  rubberband,
  springAt,
} from "./physics";

function trajectory(
  from: { x: number; v: number },
  target: number,
  cfg: SpringConfig = SPRING.default,
) {
  const out: number[] = [];
  for (let t = 0; t <= 2; t += 1 / 120) out.push(springAt(from, target, cfg, t).x);
  return out;
}

describe("springAt", () => {
  it("starts exactly where it is, with the velocity it has", () => {
    const s = springAt({ x: 40, v: 900 }, 300, SPRING.flick, 0);
    expect(s.x).toBeCloseTo(40);
    expect(s.v).toBeCloseTo(900);
  });

  it("settles on the target", () => {
    for (const cfg of Object.values(SPRING)) {
      const end = springAt({ x: 0, v: 0 }, 500, cfg, 3);
      expect(isAtRest(end, 500)).toBe(true);
    }
  });

  it("critically damped never overshoots; under-damped does", () => {
    expect(Math.max(...trajectory({ x: 0, v: 0 }, 100, SPRING.default))).toBeLessThanOrEqual(
      100.0001,
    );
    expect(Math.max(...trajectory({ x: 0, v: 0 }, 100, SPRING.flick))).toBeGreaterThan(100.5);
  });

  it("response sets the pace: a smaller response arrives sooner", () => {
    const fast = springAt({ x: 0, v: 0 }, 100, { damping: 1, response: 0.2 }, 0.15).x;
    const slow = springAt({ x: 0, v: 0 }, 100, { damping: 1, response: 0.6 }, 0.15).x;
    expect(fast).toBeGreaterThan(slow);
  });

  it("velocity is the derivative of position", () => {
    const from = { x: 10, v: -300 };
    for (const cfg of [SPRING.default, SPRING.flick]) {
      const t = 0.12;
      const h = 1e-5;
      const numeric =
        (springAt(from, 200, cfg, t + h).x - springAt(from, 200, cfg, t - h).x) / (2 * h);
      expect(springAt(from, 200, cfg, t).v).toBeCloseTo(numeric, 2);
    }
  });

  it("re-targeting mid-flight is continuous in position and velocity", () => {
    const mid = springAt({ x: 0, v: 0 }, 100, SPRING.default, 0.1);
    const retargeted = springAt(mid, -50, SPRING.default, 0);
    expect(retargeted.x).toBeCloseTo(mid.x);
    expect(retargeted.v).toBeCloseTo(mid.v);
  });
});

describe("gesture helpers", () => {
  it("project matches Apple's scroll-deceleration formula", () => {
    expect(project(1000)).toBeCloseTo(499); // (1000/1000)*0.998/0.002
    expect(project(-1000)).toBeCloseTo(-499);
    expect(project(0)).toBe(0);
  });

  it("rubberband resists progressively and stays bounded", () => {
    const dim = 600;
    const a = rubberband(50, dim);
    const b = rubberband(200, dim);
    const c = rubberband(10_000, dim);
    expect(a).toBeLessThan(50);
    expect(b - a).toBeLessThan(150); // each extra pixel moves it less
    expect(c).toBeLessThan(dim);
    expect(rubberband(-200, dim)).toBeCloseTo(-b);
  });

  it("nearest picks the closest snap point", () => {
    expect(nearest([0, 300, 700], 420)).toBe(300);
    expect(nearest([0, 300, 700], 600)).toBe(700);
  });

  it("velocity tracker uses only recent motion", () => {
    const vt = new VelocityTracker(100);
    vt.add(0, 0);
    vt.add(50, 50); // 1000 px/s
    vt.add(100, 100);
    expect(vt.velocity()).toBeCloseTo(1000);
    // The finger then holds still for 200 ms before letting go.
    vt.add(300, 100);
    vt.add(310, 100);
    expect(Math.abs(vt.velocity())).toBeLessThan(1);
  });
});
