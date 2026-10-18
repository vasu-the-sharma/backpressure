"use client";

import { type RefObject, useEffect, useRef } from "react";

/** What one pipeline's canvas draws. The simulation updates it in place every frame. */
export interface Flow {
  /** Dots entering per second: offered load, scaled down. */
  rate: number;
  /** 0..1: how much of the last wire the database's queue fills. */
  queue: number;
  /** 0..1: the share of arrivals dropped at the back of that queue. */
  drop: number;
}

interface Dot {
  x: number;
  y: number;
  v: number;
  vx: number;
  vy: number;
  a: number;
  falling: boolean;
}

/** Seconds for a request to cross from the first node to the last. */
const TRAVEL_S = 2.2;
const MAX_DOTS = 260;
const SPRITE = 10;
const QUEUE_GAP = 4;

function rgb(hex: string): [number, number, number] {
  const v = Number.parseInt(hex.trim().replace("#", ""), 16);
  return Number.isNaN(v) ? [255, 255, 255] : [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** A soft dot with a bright core, drawn once and stamped many times. */
function sprite(hex: string, dpr: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  const px = Math.ceil(SPRITE * dpr);
  c.width = px;
  c.height = px;
  const g = c.getContext("2d");
  if (!g) return c;
  const [r, gr, b] = rgb(hex);
  const mid = px / 2;
  const grad = g.createRadialGradient(mid, mid, 0, mid, mid, mid);
  grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
  grad.addColorStop(0.28, `rgba(${r},${gr},${b},0.95)`);
  grad.addColorStop(0.45, `rgba(${r},${gr},${b},0.28)`);
  grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, px, px);
  return c;
}

/**
 * Requests as light moving down a pipeline. Dots enter at the offered rate,
 * pass under each node, and back up into a visible queue in front of the last
 * one; when that queue is full, the overflow pops off and falls away in red.
 * Drawn on a canvas behind the DOM nodes, which hide the dots as they pass.
 */
export function FlowCanvas({
  flow,
  anchors,
  running,
  reduced,
}: {
  flow: Flow;
  /** The node circles, in path order. */
  anchors: RefObject<(HTMLElement | null)[]>;
  running: boolean;
  reduced: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const flowRef = useRef(flow);
  flowRef.current = flow;
  const runningRef = useRef(running);
  runningRef.current = running;
  const kick = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const css = getComputedStyle(document.documentElement);
    const token = (name: string, fallback: string) => css.getPropertyValue(name).trim() || fallback;
    const line = token("--color-line-strong", "#2e2e2e");
    let dpr = 0;
    let sprites: Record<"dot" | "queue" | "drop", HTMLCanvasElement> | null = null;

    const geo = { w: 0, h: 0, xs: [] as number[], y: 0, r: 22 };
    const measure = () => {
      const box = canvas.getBoundingClientRect();
      const nextDpr = Math.min(2, window.devicePixelRatio || 1);
      if (nextDpr !== dpr) {
        dpr = nextDpr;
        sprites = {
          dot: sprite("#ffffff", dpr),
          queue: sprite(token("--color-warn", "#f59e0b"), dpr),
          drop: sprite(token("--color-bad", "#ef4444"), dpr),
        };
      }
      geo.w = box.width;
      geo.h = box.height;
      canvas.width = Math.round(box.width * dpr);
      canvas.height = Math.round(box.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const els = (anchors.current ?? []).filter((el): el is HTMLElement => el !== null);
      geo.xs = els.map((el) => {
        const r = el.getBoundingClientRect();
        return r.left + r.width / 2 - box.left;
      });
      const first = els[0]?.getBoundingClientRect();
      geo.y = first ? first.top + first.height / 2 - box.top : box.height / 2;
      geo.r = first ? first.width / 2 : 22;
    };
    measure();

    const dots: Dot[] = [];
    let spawn = 0;
    let queuePx = 0;
    let raf = 0;
    let last = performance.now();

    const draw = (now: number) => {
      const { xs, y, r } = geo;
      ctx.clearRect(0, 0, geo.w, geo.h);
      if (xs.length < 2 || !sprites) return;
      const end = (xs[xs.length - 1] ?? 0) - r;

      ctx.strokeStyle = line;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < xs.length - 1; i++) {
        ctx.moveTo((xs[i] ?? 0) + r + 2, y + 0.5);
        ctx.lineTo((xs[i + 1] ?? 0) - r - 2, y + 0.5);
      }
      ctx.stroke();

      // The queue: requests packed in front of the database, agitated, amber
      // while it fills and red once it overflows.
      const s = SPRITE;
      if (queuePx > 1) {
        const q = flowRef.current.drop > 0.002 ? sprites.drop : sprites.queue;
        const n = Math.floor(queuePx / QUEUE_GAP);
        for (let k = 0; k < n; k++) {
          const qx = end - 3 - k * QUEUE_GAP;
          for (let row = -1; row <= 1; row++) {
            const jitter = reduced ? 0 : Math.sin(now * 0.018 + k * 1.7 + row * 2.1) * 0.7;
            ctx.globalAlpha = 0.55 + 0.45 * (1 - k / Math.max(1, n));
            ctx.drawImage(q, qx - s / 2, y + row * 3.2 + jitter - s / 2, s, s);
          }
        }
        ctx.globalAlpha = 1;
      }

      for (const d of dots) {
        ctx.globalAlpha = d.a;
        ctx.drawImage(d.falling ? sprites.drop : sprites.dot, d.x - s / 2, d.y - s / 2, s, s);
      }
      ctx.globalAlpha = 1;
    };

    const queueTarget = () => {
      const { xs, r } = geo;
      if (xs.length < 2) return 0;
      const wire = (xs[xs.length - 1] ?? 0) - (xs[xs.length - 2] ?? 0) - 2 * r - 8;
      return Math.max(0, wire) * Math.min(1, flowRef.current.queue);
    };

    // Reduced motion: no travel. Dots sit evenly along the wires at the
    // current density, and the queue is drawn at its true length.
    const drawStill = () => {
      const { xs, y, r } = geo;
      dots.length = 0;
      queuePx = queueTarget();
      if (xs.length >= 2) {
        const start = (xs[0] ?? 0) + r;
        const tail = (xs[xs.length - 1] ?? 0) - r - queuePx;
        const gap = Math.max(
          6,
          Math.min(
            40,
            ((xs[xs.length - 1] ?? 0) - (xs[0] ?? 0)) /
              TRAVEL_S /
              Math.max(1, flowRef.current.rate),
          ),
        );
        for (let x = start + gap / 2; x < tail; x += gap)
          dots.push({ x, y, v: 0, vx: 0, vy: 0, a: 1, falling: false });
      }
      draw(0);
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { xs, y, r } = geo;
      const f = flowRef.current;
      if (xs.length >= 2) {
        const first = xs[0] ?? 0;
        const lastX = xs[xs.length - 1] ?? 0;
        const speed = (lastX - first) / TRAVEL_S;
        queuePx += (queueTarget() - queuePx) * (1 - Math.exp(-dt * 5));
        // With no queue, dots run on into the database and vanish under it.
        const tail = queuePx > 0.5 ? lastX - r - queuePx : lastX;

        spawn += f.rate * dt;
        while (spawn >= 1) {
          spawn -= 1;
          if (dots.length >= MAX_DOTS) continue;
          dots.push({
            x: first + r - Math.random() * speed * dt,
            y: y + (Math.random() - 0.5) * 5,
            v: speed * (0.9 + Math.random() * 0.2),
            vx: 0,
            vy: 0,
            a: 1,
            falling: false,
          });
        }

        for (let i = dots.length - 1; i >= 0; i--) {
          const d = dots[i];
          if (!d) continue;
          if (d.falling) {
            d.vy += 520 * dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.a -= dt * 1.4;
            if (d.a <= 0 || d.y > geo.h + SPRITE) dots.splice(i, 1);
            continue;
          }
          d.x += d.v * dt;
          if (d.x >= tail) {
            if (Math.random() < f.drop) {
              d.falling = true;
              d.x = tail;
              d.vx = -12 - Math.random() * 36;
              d.vy = -50 - Math.random() * 60;
            } else {
              dots.splice(i, 1);
            }
          }
        }
      }
      draw(now);
      if (runningRef.current) raf = requestAnimationFrame(step);
      else raf = 0;
    };

    const start = () => {
      if (reduced) {
        drawStill();
        return;
      }
      if (raf || !runningRef.current) return;
      last = performance.now();
      raf = requestAnimationFrame(step);
    };
    kick.current = start;

    const redraw = () => (reduced ? drawStill() : draw(performance.now()));
    const ro = new ResizeObserver(() => {
      measure();
      if (reduced || !raf) redraw();
    });
    ro.observe(canvas);
    start();
    if (!runningRef.current) redraw();

    // Reduced motion still reflects the simulation, a few times a second.
    const still = reduced ? setInterval(() => runningRef.current && drawStill(), 250) : undefined;

    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      ro.disconnect();
      if (still) clearInterval(still);
    };
  }, [anchors, reduced]);

  // Resume the loop when the demo starts running again.
  useEffect(() => {
    if (running) kick.current();
  }, [running]);

  return <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
