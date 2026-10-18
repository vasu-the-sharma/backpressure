import { Fragment } from "react";

/**
 * Small, CSS-driven motion pieces for the landing page. None of them needs
 * JavaScript; all of them hold still under reduced motion.
 */

/** Words that rise into place one after another. */
export function RiseWords({ text, from = 0 }: { text: string; from?: number }) {
  return text.split(" ").map((word, i) => (
    <Fragment key={`${word}-${from + i}`}>
      {i > 0 && " "}
      <span className="word-rise" style={{ animationDelay: `${(from + i) * 90}ms` }}>
        {word}
      </span>
    </Fragment>
  ));
}

/** An endless, edge-faded row of names. Hovering pauses it. */
export function Marquee({ items }: { items: string[] }) {
  const run = [...items, ...items, ...items];
  return (
    <>
      <ul className="marquee-static">
        {items.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <div aria-hidden="true" className="marquee">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <ul key={copy} className="marquee-copy">
              {run.map((name, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: names repeat by design
                <li key={i}>{name}</li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </>
  );
}

const TRACE =
  "M0,20 L8,18 L14,22 L22,10 L30,14 L38,6 L46,12 L54,8 L62,16 L70,4 L78,10 L86,7 L94,13 L102,2 L110,8 L118,5";

/** Deterministic: two runs with the same seed draw the same line, in step. */
export function SeedReplay() {
  return (
    <svg viewBox="0 0 160 60" className="h-full w-full max-w-[18rem]" aria-hidden="true">
      {[6, 36].map((dy) => (
        <g key={dy}>
          <text x="0" y={dy + 14} className="visual-label">
            seed 7
          </text>
          <path
            d={TRACE}
            transform={`translate(38 ${dy})`}
            pathLength={1}
            className="replay-trace"
            fill="none"
            stroke="var(--color-fg)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  );
}

/** Bounded queues: slots fill in order, the next arrival bounces off and drops, the queue drains. */
export function QueueOverflow() {
  const slots = [112, 96, 80, 64, 48];
  return (
    <svg viewBox="0 0 160 60" className="h-full w-full max-w-[18rem]" aria-hidden="true">
      <line x1="0" y1="30" x2="38" y2="30" stroke="var(--color-line-strong)" />
      <rect
        x="39.5"
        y="20.5"
        width="81"
        height="19"
        rx="5"
        fill="none"
        stroke="var(--color-line-strong)"
      />
      <line x1="121" y1="30" x2="132" y2="30" stroke="var(--color-line-strong)" />
      <circle
        cx="144"
        cy="30"
        r="11"
        fill="var(--color-surface-2)"
        stroke="var(--color-line-strong)"
      />
      <circle
        cx="144"
        cy="30"
        r="11"
        fill="none"
        stroke="var(--color-warn)"
        strokeWidth="1.5"
        pathLength={1}
        className="queue-server"
      />
      {slots.map((x, i) => (
        <circle
          key={x}
          cx={x}
          cy="30"
          r="4.5"
          fill="var(--color-fg)"
          className="queue-slot"
          style={{ animationDelay: `${i * 0.45}s` }}
        />
      ))}
      <circle cx="30" cy="30" r="4.5" className="queue-overflow" />
    </svg>
  );
}

/** Directionally honest: latency stays flat, then climbs steeply as load nears capacity. */
export function LatencyCurve() {
  const points: string[] = [];
  for (let i = 0; i <= 40; i++) {
    const rho = (i / 40) * 0.93;
    const x = 14 + (rho / 0.95) * 136;
    const y = 52 - Math.min(48, (1 / (1 - rho) - 1) * 3.4);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  const curve = `M${points.join("L")}`;
  const hot = `M${points.slice(30).join("L")}`;
  return (
    <svg viewBox="0 0 160 60" className="h-full w-full max-w-[18rem]" aria-hidden="true">
      <line x1="14" y1="52.5" x2="156" y2="52.5" stroke="var(--color-line-strong)" />
      <line
        x1="147"
        y1="2"
        x2="147"
        y2="52"
        stroke="var(--color-warn)"
        strokeOpacity="0.5"
        strokeDasharray="2 2"
      />
      <text x="0" y="10" className="visual-label">
        p99
      </text>
      <text x="156" y="60" textAnchor="end" className="visual-label">
        load
      </text>
      <path d={curve} fill="none" stroke="var(--color-fg-3)" strokeWidth="1.5" />
      <path d={hot} fill="none" stroke="var(--color-bad)" strokeWidth="1.75" />
      <circle r="3.2" className="curve-dot" fill="var(--color-fg)">
        <animateMotion dur="4.5s" repeatCount="indefinite" path={curve} />
        <animate
          attributeName="fill"
          dur="4.5s"
          repeatCount="indefinite"
          values="#ffffff;#ffffff;#f59e0b;#ef4444;#ef4444"
          keyTimes="0;0.35;0.55;0.75;1"
        />
      </circle>
      <circle
        cx={points[40]?.split(",")[0]}
        cy={points[40]?.split(",")[1]}
        r="3.2"
        className="curve-dot-still"
        fill="var(--color-bad)"
      />
    </svg>
  );
}
