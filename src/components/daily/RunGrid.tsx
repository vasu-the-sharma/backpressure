import { type RunRow, SHARE_ROWS } from "@/content/daily/share";

const COLUMNS = ["Latency", "Errors", "Throughput"];

/**
 * One row per run, one square per target: green when met. The same grid the
 * share text uses, so what you see is what you post.
 */
export function RunGrid({ runs, size = 14 }: { runs: RunRow[]; size?: number }) {
  const shown = runs.slice(-SHARE_ROWS);
  if (shown.length === 0) return null;
  return (
    <figure className="inline-flex flex-col gap-1">
      <div
        role="img"
        aria-label={`${runs.length} run${runs.length === 1 ? "" : "s"}; ${
          runs.filter((r) => r.every(Boolean)).length
        } met every target`}
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(3, ${size}px)` }}
      >
        {shown.flatMap((row, i) =>
          row.map((ok, j) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: a fixed grid of cells
              key={`${i}-${j}`}
              title={`${COLUMNS[j]}: ${ok ? "met" : "missed"}`}
              className="run-cell"
              data-ok={ok}
              style={{ width: size, height: size, animationDelay: `${(i * 3 + j) * 30}ms` }}
            />
          )),
        )}
      </div>
      {runs.length > SHARE_ROWS && (
        <figcaption className="text-[10px] text-fg-3">
          Last {SHARE_ROWS} of {runs.length} runs
        </figcaption>
      )}
    </figure>
  );
}
