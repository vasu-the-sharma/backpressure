/**
 * Pure metric helpers kept separate from the engine so they can be tested and
 * reasoned about on their own.
 */

/** Nearest-rank percentile over an already-sorted ascending array. */
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  const rank = Math.ceil((p / 100) * sortedAsc.length);
  const idx = Math.min(sortedAsc.length - 1, Math.max(0, rank - 1));
  return sortedAsc[idx] ?? 0;
}

export interface TickSample {
  completedLatenciesMs: number[];
  completed: number;
  dropped: number;
}

/**
 * Fixed-size ring of per-tick samples used to compute live QPS, latency
 * percentiles, and error rate over a trailing window.
 */
export class RollingWindow {
  private readonly samples: TickSample[] = [];

  constructor(private readonly maxTicks: number) {}

  push(sample: TickSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.maxTicks) {
      this.samples.shift();
    }
  }

  reset(): void {
    this.samples.length = 0;
  }

  ticks(): number {
    return this.samples.length;
  }

  completed(): number {
    let total = 0;
    for (const s of this.samples) total += s.completed;
    return total;
  }

  dropped(): number {
    let total = 0;
    for (const s of this.samples) total += s.dropped;
    return total;
  }

  /** All completed-request latencies in the window, sorted ascending. */
  sortedLatencies(): number[] {
    const out: number[] = [];
    for (const s of this.samples) {
      for (const l of s.completedLatenciesMs) out.push(l);
    }
    out.sort((a, b) => a - b);
    return out;
  }
}
