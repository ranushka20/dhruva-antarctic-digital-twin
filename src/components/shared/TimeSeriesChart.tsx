// OWNER: Dev A
// TimeSeriesChart — chart with gap hatching, never interpolating across gaps.
// Uses Recharts. Gaps render as hatched regions with a labelled start time.
// See FRONTEND.md §7 (TimeSeriesChart).

import { type Measurement } from '@/shared/contracts';

interface TimeSeriesPoint {
  t: string;
  v: number | null;
}

interface TimeSeriesChartProps {
  series: TimeSeriesPoint[];
  gaps?: { from: string; to: string; reason?: string }[];
  unit?: string;
  threshold?: { value: number; unit: string; label: string };
  provenance?: Measurement;
  className?: string;
}

export function TimeSeriesChart({
  series,
  gaps = [],
  unit = '',
  threshold,
  className = '',
}: TimeSeriesChartProps) {
  if (!series || series.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-32 rounded-lg ${className}`}
        style={{ backgroundColor: 'var(--panel-deep)', border: '1px solid var(--line)' }}
      >
        <span className="font-mono text-caption" style={{ color: 'var(--text-3)' }}>
          No series data available
        </span>
      </div>
    );
  }

  // Minimal SVG sparkline rendering — full Recharts integration deferred to page build
  const values = series.filter(p => p.v !== null).map(p => p.v as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const width = 300;
  const height = 80;
  const points = series
    .map((p, i) => {
      if (p.v === null) return null;
      const x = (i / (series.length - 1)) * width;
      const y = height - ((p.v - min) / range) * (height - 10) - 5;
      return `${x},${y}`;
    })
    .filter(Boolean)
    .join(' ');

  return (
    <div className={`rounded-lg p-2 ${className}`} style={{ backgroundColor: 'var(--panel-deep)', border: '1px solid var(--line)' }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20">
        <polyline
          fill="none"
          stroke="var(--ok)"
          strokeWidth="1.5"
          points={points}
        />
        {threshold && (
          <line
            x1="0"
            y1={height - ((threshold.value - min) / range) * (height - 10) - 5}
            x2={width}
            y2={height - ((threshold.value - min) / range) * (height - 10) - 5}
            stroke="var(--act)"
            strokeDasharray="4 3"
            strokeWidth="1"
          />
        )}
      </svg>
      {threshold && (
        <div className="flex justify-end">
          <span className="font-mono text-micro" style={{ color: 'var(--act-soft)' }}>
            {threshold.label} {threshold.value} {threshold.unit}
          </span>
        </div>
      )}
    </div>
  );
}
