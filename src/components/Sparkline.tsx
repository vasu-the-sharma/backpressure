/**
 * A minimal inline trend line. No axes, no fill: it shows direction and
 * volatility next to a number, which is all a KPI needs. Scales to the
 * series' own max (or `max` when given, so related series share a scale).
 */
export function Sparkline({
  values,
  max,
  width = 120,
  height = 28,
  color = "var(--color-fg-3)",
  className,
}: {
  values: number[];
  max?: number;
  width?: number;
  height?: number;
  color?: string;
  className?: string;
}) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} className={className} aria-hidden="true">
        <line
          x1={0}
          x2={width}
          y1={height - 1}
          y2={height - 1}
          stroke="var(--color-line-strong)"
          strokeDasharray="2 3"
        />
      </svg>
    );
  }

  const top = Math.max(max ?? 0, ...values, 1e-9);
  const stepX = width / (values.length - 1);
  const pad = 1.5;
  const points = values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - pad - (Math.max(0, v) / top) * (height - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
