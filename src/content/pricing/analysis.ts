/**
 * The maths behind the price test: confidence intervals for join rates, and
 * the Van Westendorp price-sensitivity meter.
 */

/** 95% Wilson score interval for a proportion: honest at small n, never outside [0, 1]. */
export function wilson(successes: number, trials: number, z = 1.96): { low: number; high: number } {
  if (trials <= 0) return { low: 0, high: 1 };
  const p = successes / trials;
  const z2 = z * z;
  const denom = 1 + z2 / trials;
  const centre = (p + z2 / (2 * trials)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / trials + z2 / (4 * trials * trials))) / denom;
  return { low: Math.max(0, centre - half), high: Math.min(1, centre + half) };
}

export interface VwResponse {
  tooCheap: number;
  cheap: number;
  expensive: number;
  tooExpensive: number;
}

/** The thresholds must not contradict each other (too cheap ≤ cheap ≤ expensive ≤ too expensive). */
export function isConsistent(r: VwResponse): boolean {
  return (
    [r.tooCheap, r.cheap, r.expensive, r.tooExpensive].every((v) => Number.isFinite(v) && v >= 0) &&
    r.tooCheap <= r.cheap &&
    r.cheap <= r.expensive &&
    r.expensive <= r.tooExpensive
  );
}

export interface VwCurvePoint {
  price: number;
  tooCheap: number;
  cheap: number;
  expensive: number;
  tooExpensive: number;
}

export interface VwResult {
  /** Responses used and set aside for contradicting themselves (reported, never silently fixed). */
  used: number;
  excluded: number;
  curves: VwCurvePoint[];
  /** Point of marginal cheapness: "too cheap" crosses "expensive". Bottom of the acceptable range. */
  pmc: number | null;
  /** Optimal price point: "too cheap" crosses "too expensive". A candidate to test, not a profit maximum. */
  opp: number | null;
  /** Indifference price point: "expensive" crosses "cheap". Another candidate to test. */
  idp: number | null;
  /** Point of marginal expensiveness: "too expensive" crosses "cheap". Top of the acceptable range. */
  pme: number | null;
}

/**
 * Van Westendorp, with the curve directions the method requires: the two
 * cheap curves fall as price rises (share whose threshold is at or above the
 * price), the two expensive curves rise (share whose threshold is at or below
 * it). Ties are inclusive on both sides. Crossings are linear between the
 * answered prices.
 */
export function vanWestendorp(responses: VwResponse[]): VwResult {
  const valid = responses.filter(isConsistent);
  const n = valid.length;
  const empty = {
    used: n,
    excluded: responses.length - n,
    curves: [],
    pmc: null,
    opp: null,
    idp: null,
    pme: null,
  };
  if (n === 0) return empty;

  const prices = [
    ...new Set(valid.flatMap((r) => [r.tooCheap, r.cheap, r.expensive, r.tooExpensive])),
  ].sort((a, b) => a - b);
  const share = (pred: (r: VwResponse) => boolean) => valid.filter(pred).length / n;
  const curves = prices.map((price) => ({
    price,
    tooCheap: share((r) => r.tooCheap >= price),
    cheap: share((r) => r.cheap >= price),
    expensive: share((r) => r.expensive <= price),
    tooExpensive: share((r) => r.tooExpensive <= price),
  }));

  /** First price where a falling curve meets or drops below a rising one. */
  const cross = (falling: keyof VwCurvePoint, rising: keyof VwCurvePoint): number | null => {
    let prev: VwCurvePoint | null = null;
    for (const c of curves) {
      const d = c[falling] - c[rising];
      if (d <= 0) {
        if (!prev) return c.price;
        const dPrev = prev[falling] - prev[rising];
        return prev.price + ((c.price - prev.price) * dPrev) / (dPrev - d);
      }
      prev = c;
    }
    return null;
  };

  return {
    used: n,
    excluded: responses.length - n,
    curves,
    pmc: cross("tooCheap", "expensive"),
    opp: cross("tooCheap", "tooExpensive"),
    idp: cross("cheap", "expensive"),
    pme: cross("cheap", "tooExpensive"),
  };
}

/**
 * How many visitors each arm needs to tell two join rates apart (two-sided,
 * 95% confidence, 80% power). Shown on the dashboard so a thin early read
 * isn't mistaken for a result.
 */
export function visitorsPerArm(p1: number, p2: number): number {
  const za = 1.96;
  const zb = 0.8416;
  const pBar = (p1 + p2) / 2;
  const a = za * Math.sqrt(2 * pBar * (1 - pBar));
  const b = zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  return Math.ceil(((a + b) * (a + b)) / ((p1 - p2) * (p1 - p2)));
}
