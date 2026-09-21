// OWNER: Dev A
// Sparkline — inline SVG series with optional threshold line.
// Compact variant of TimeSeriesChart for use in tables and cards.

interface SparklineProps {
  series: { t: string; v: number }[];
  threshold?: number;
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  series,
  threshold,
  width = 80,
  height = 24,
  className = '',
}: SparklineProps) {
  if (!series || series.length < 2) {
    return <span className="inline-block" style={{ width, height }} />;
  }

  const values = series.map(p => p.v);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = series
    .map((p, i) => {
      const x = (i / (series.length - 1)) * width;
      const y = height - ((p.v - min) / range) * (height - 4) - 2;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`inline-block ${className}`}
    >
      <polyline
        fill="none"
        stroke="var(--ok)"
        strokeWidth="1.2"
        points={points}
      />
      {threshold !== undefined && (
        <line
          x1="0"
          y1={height - ((threshold - min) / range) * (height - 4) - 2}
          x2={width}
          y2={height - ((threshold - min) / range) * (height - 4) - 2}
          stroke="var(--act)"
          strokeDasharray="3 2"
          strokeWidth="0.8"
        />
      )}
      {/* Latest point dot */}
      <circle
        cx={width}
        cy={height - ((values[values.length - 1] - min) / range) * (height - 4) - 2}
        r="2"
        fill="var(--ok)"
      />
    </svg>
  );
}
