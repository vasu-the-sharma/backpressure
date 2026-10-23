/**
 * Back-of-the-envelope capacity planning: from daily users to requests per
 * second, to servers, with the headroom a queue needs. Pure functions, so the
 * planner page and (later) interview mode share the same arithmetic.
 */

export const SECONDS_PER_DAY = 86_400;

export interface CapacityInput {
  dailyActiveUsers: number;
  requestsPerUserPerDay: number;
  /** The busiest hour's rate as a multiple of the day's average. */
  peakFactor: number;
  /** Requests per second one server completes when it's fully busy. */
  serverRps: number;
  /** The most a server should be busy at the peak, 0..1. */
  targetUtilisation: number;
  /** Share of requests that write new data, 0..1. */
  writeShare: number;
  /** Bytes stored per write. */
  bytesPerWrite: number;
}

export interface CapacityPlan {
  averageRps: number;
  peakRps: number;
  /** Servers that would all be 100% busy at the peak: no headroom at all. */
  serversAtFull: number;
  /** Servers needed to stay at or under the target utilisation at the peak. */
  servers: number;
  /** How busy each server actually is at the peak, with that many. */
  utilisation: number;
  /** Time in the system as a multiple of an idle server's time (M/M/1). */
  slowdown: number;
  writesPerSecond: number;
  bytesPerDay: number;
  bytesPerYear: number;
}

/**
 * In a single queue with random arrivals and service times (M/M/1), a request
 * spends 1 / (1 − utilisation) times as long in the system as it would on an
 * idle server: 2× at 50%, 10× at 90%, 100× at 99%. Infinite at 100%.
 */
export function slowdownAt(utilisation: number): number {
  return utilisation >= 1 ? Number.POSITIVE_INFINITY : 1 / (1 - Math.max(0, utilisation));
}

export function planCapacity(i: CapacityInput): CapacityPlan {
  const averageRps = (i.dailyActiveUsers * i.requestsPerUserPerDay) / SECONDS_PER_DAY;
  const peakRps = averageRps * i.peakFactor;
  const serversAtFull = Math.max(1, Math.ceil(peakRps / i.serverRps));
  const servers = Math.max(1, Math.ceil(peakRps / (i.serverRps * i.targetUtilisation)));
  const utilisation = peakRps / (servers * i.serverRps);
  const writesPerSecond = averageRps * i.writeShare;
  const bytesPerDay = writesPerSecond * SECONDS_PER_DAY * i.bytesPerWrite;
  return {
    averageRps,
    peakRps,
    serversAtFull,
    servers,
    utilisation,
    slowdown: slowdownAt(utilisation),
    writesPerSecond,
    bytesPerDay,
    bytesPerYear: bytesPerDay * 365,
  };
}

export const DEFAULT_INPUT: CapacityInput = {
  dailyActiveUsers: 10_000_000,
  requestsPerUserPerDay: 20,
  peakFactor: 3,
  serverRps: 1_000,
  targetUtilisation: 0.7,
  writeShare: 0.1,
  bytesPerWrite: 1_000,
};
