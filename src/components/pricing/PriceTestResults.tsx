import type { VwResult } from "@/content/pricing/analysis";
import { type Currency, formatMoney } from "@/content/pricing/plans";
import type { SegmentResult } from "@/server/pricing";

/** One region of the price test: join rates per arm, then the Van Westendorp read. */

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export function PriceTestSegment({
  label,
  currency,
  result,
}: {
  label: string;
  currency: Currency;
  result: SegmentResult;
}) {
  const visitors = result.arms.reduce((n, a) => n + a.visitors, 0);
  const joins = result.arms.reduce((n, a) => n + a.joins, 0);
  return (
    <section className="panel overflow-hidden">
      <header className="flex items-baseline justify-between gap-3 border-b border-line px-5 py-3">
        <h2 className="text-base font-medium text-fg">{label}</h2>
        <p className="text-xs text-fg-3">
          <span className="tnum text-fg-2">{visitors}</span> visitors ·{" "}
          <span className="tnum text-fg-2">{joins}</span> joined
        </p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="text-left text-xs text-fg-3">
              <th className="px-5 py-2 font-normal">Arm</th>
              <th className="px-3 py-2 font-normal">Price</th>
              <th className="px-3 py-2 text-right font-normal">Visitors</th>
              <th className="px-3 py-2 text-right font-normal">Joined</th>
              <th className="px-3 py-2 font-normal">Join rate (95% range)</th>
              <th className="px-3 py-2 text-right font-normal">Annual</th>
              <th className="px-5 py-2 font-normal">Revenue index</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {result.arms.map((a) => (
              <tr key={a.arm}>
                <td className="px-5 py-2.5 uppercase text-fg">{a.arm}</td>
                <td className="tnum px-3 py-2.5 text-fg">
                  {formatMoney(a.price.monthly, currency)}
                  <span className="text-fg-3"> / {formatMoney(a.price.annual, currency)}</span>
                </td>
                <td className="tnum px-3 py-2.5 text-right text-fg-2">{a.visitors}</td>
                <td className="tnum px-3 py-2.5 text-right text-fg-2">{a.joins}</td>
                <td className="tnum px-3 py-2.5 text-fg-2">
                  {a.visitors > 0 ? (
                    <>
                      <span className="text-fg">{pct(a.rate)}</span>{" "}
                      <span className="text-fg-3">
                        ({pct(a.low)}–{pct(a.high)})
                      </span>
                    </>
                  ) : (
                    "–"
                  )}
                </td>
                <td className="tnum px-3 py-2.5 text-right text-fg-2">
                  {a.joins > 0 ? pct(a.annualShare) : "–"}
                </td>
                <td className="px-5 py-2.5">
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-24 overflow-hidden rounded-full bg-fill-2">
                      <span
                        className="block h-full rounded-full bg-fg"
                        style={{ width: `${a.revenueIndex}%` }}
                      />
                    </span>
                    <span className="tnum text-xs text-fg-3">{a.revenueIndex}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <VanWestendorp result={result.survey} currency={currency} />
    </section>
  );
}

function VanWestendorp({ result, currency }: { result: VwResult; currency: Currency }) {
  const money = (v: number | null) => (v === null ? "–" : formatMoney(Math.round(v), currency));
  const points: Array<[string, number | null, string]> = [
    ["Too cheap below", result.pmc, "point of marginal cheapness"],
    ["Optimal", result.opp, "too cheap meets too expensive"],
    ["Indifference", result.idp, "cheap meets expensive"],
    ["Too expensive above", result.pme, "point of marginal expensiveness"],
  ];
  return (
    <div className="border-t border-line px-5 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-medium text-fg">What people say the monthly price should be</h3>
        <p className="text-xs text-fg-3">
          <span className="tnum text-fg-2">{result.used}</span> answers
          {result.excluded > 0 && (
            <>
              {" "}
              · <span className="tnum">{result.excluded}</span> set aside as contradictory
            </>
          )}
        </p>
      </div>
      {result.used === 0 ? (
        <p className="mt-2 text-sm text-fg-3">No answers yet.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {points.map(([name, value, hint]) => (
              <div key={name} className="rounded-md border border-line bg-surface-2 px-3 py-2">
                <dt className="text-[11px] text-fg-3" title={hint}>
                  {name}
                </dt>
                <dd className="tnum text-base text-fg">{money(value)}</dd>
              </div>
            ))}
          </dl>
          <VwChart result={result} />
        </>
      )}
    </div>
  );
}

function VwChart({ result }: { result: VwResult }) {
  const c = result.curves;
  if (c.length < 2) return null;
  const W = 600;
  const H = 160;
  const lo = c[0]?.price ?? 0;
  const hi = c[c.length - 1]?.price ?? 1;
  const x = (p: number) => ((p - lo) / Math.max(1, hi - lo)) * W;
  const y = (v: number) => H - v * H;
  const path = (k: "tooCheap" | "cheap" | "expensive" | "tooExpensive") =>
    c.map((pt, i) => `${i ? "L" : "M"}${x(pt.price).toFixed(1)},${y(pt[k]).toFixed(1)}`).join("");
  const lines: Array<
    [string, "tooCheap" | "cheap" | "expensive" | "tooExpensive", string, string]
  > = [
    ["Too cheap", "tooCheap", "var(--color-fg-3)", "4 3"],
    ["Bargain", "cheap", "var(--color-fg-2)", ""],
    ["Expensive", "expensive", "var(--color-fg)", ""],
    ["Too expensive", "tooExpensive", "var(--color-fg)", "4 3"],
  ];
  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-40 w-full"
        aria-hidden="true"
      >
        {lines.map(([name, key, color, dash]) => (
          <path
            key={name}
            d={path(key)}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeDasharray={dash || undefined}
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {[result.pmc, result.pme].map((p, i) =>
          p === null ? null : (
            <line
              // biome-ignore lint/suspicious/noArrayIndexKey: two fixed markers
              key={i}
              x1={x(p)}
              x2={x(p)}
              y1={0}
              y2={H}
              stroke="var(--color-accent)"
              strokeOpacity="0.6"
              strokeDasharray="2 3"
              vectorEffect="non-scaling-stroke"
            />
          ),
        )}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-3">
        {lines.map(([name]) => (
          <span key={name}>{name}</span>
        ))}
        <span className="text-accent">Acceptable range between the dotted lines</span>
      </figcaption>
    </figure>
  );
}
