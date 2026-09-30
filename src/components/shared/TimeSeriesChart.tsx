// OWNER: Dev A
// TimeSeriesChart — one or more measured series over time (FRONTEND.md §7).
// Recharts area chart on the shared chart spec (components/shared/Chart.tsx).
//
// Gaps are never interpolated: a missing reading is a null, the line breaks
// there (connectNulls=false), and any declared gap window is shaded and
// labelled so the reader sees "no data" rather than a guessed line.
//
// Accepts either a single series (points) or several named series, because
// both call shapes exist in the app.

import { useId, useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { type Measurement } from '@/shared/contracts';
import { CHART_DEFAULTS, ChartContainer, ChartLegend, ChartTooltipContent } from './Chart';

export interface TimeSeriesPoint {
  t: string;
  v: number | null;
}

export interface TimeSeriesLine {
  id: string;
  name: string;
  data: TimeSeriesPoint[];
  color?: string;
}

interface TimeSeriesChartProps {
  series: TimeSeriesPoint[] | TimeSeriesLine[];
  gaps?: { from: string; to: string; reason?: string }[];
  unit?: string;
  /** A limit to draw as a dashed line — a bare number or a labelled value. */
  threshold?: number | { value: number; unit?: string; label?: string };
  provenance?: Measurement;
  className?: string;
}

const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)'];

function isLines(s: TimeSeriesPoint[] | TimeSeriesLine[]): s is TimeSeriesLine[] {
  return s.length > 0 && 'data' in s[0];
}

const hourFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const dayFmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });

export function TimeSeriesChart({
  series, gaps = [], unit = '', threshold, className = '',
}: TimeSeriesChartProps) {
  const patternId = 'ts-gap-' + useId().replace(/:/g, '');

  const lines: TimeSeriesLine[] = useMemo(() => {
    if (!series || series.length === 0) return [];
    if (isLines(series)) return series.filter((l) => l.data?.length);
    return [{ id: 'v', name: 'Value', data: series }];
  }, [series]);

  // One row per timestamp, one column per series.
  const rows = useMemo(() => {
    const byT = new Map<string, Record<string, number | string | null>>();
    for (const line of lines) {
      for (const p of line.data) {
        const row = byT.get(p.t) ?? { t: p.t };
        row[line.id] = p.v;
        byT.set(p.t, row);
      }
    }
    return [...byT.values()].sort((a, b) => String(a.t).localeCompare(String(b.t)));
  }, [lines]);

  if (rows.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-32 rounded-xl ${className}`}
        style={{ backgroundColor: 'var(--panel-deep)', border: '1px dashed var(--line-strong)' }}
      >
        <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>No readings for this period</span>
      </div>
    );
  }

  const limit = typeof threshold === 'number' ? { value: threshold } : threshold;
  const limitText = limit ? `${limit.label ?? 'Limit'} ${limit.value}${limit.unit ?? unit ? ' ' + (limit.unit ?? unit) : ''}` : '';
  const colorOf = (l: TimeSeriesLine, i: number) => l.color ?? PALETTE[i % PALETTE.length];

  return (
    <div className={`flex flex-col gap-2 h-full min-h-[8rem] ${className}`}>
      {(lines.length > 1 || limit) && (
        <ChartLegend
          items={[
            ...(lines.length > 1 ? lines.map((l, i) => ({ label: l.name, color: colorOf(l, i) })) : []),
            ...(limit ? [{ label: limitText, color: 'var(--act)', dashed: true }] : []),
          ]}
        />
      )}
      <ChartContainer
        className="flex-1 min-h-[7rem]"
        label={`${lines.map((l) => l.name).join(', ')} over time${unit ? ' in ' + unit : ''}`}
      >
        <AreaChart data={rows} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <pattern id={patternId} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--line-strong)" strokeWidth="2" />
            </pattern>
          </defs>
          <CartesianGrid {...CHART_DEFAULTS.grid} />
          <XAxis
            dataKey="t"
            {...CHART_DEFAULTS.axis}
            minTickGap={48}
            tickFormatter={(t: string) => hourFmt.format(new Date(t))}
          />
          <YAxis
            {...CHART_DEFAULTS.axis}
            width={44}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => (Math.abs(v) >= 1000 ? `${Math.round(v / 100) / 10}k` : String(Math.round(v * 10) / 10))}
          />
          <Tooltip
            content={
              <ChartTooltipContent
                unit={unit}
                labelFormatter={(t) => (t ? dayFmt.format(new Date(String(t))) + ' IST' : '')}
              />
            }
          />
          {gaps.map((g) => (
            <ReferenceArea
              key={g.from}
              x1={g.from}
              x2={g.to}
              fill={`url(#${patternId})`}
              fillOpacity={1}
              ifOverflow="extendDomain"
              label={{ value: g.reason ?? 'No data', position: 'insideTop', fill: 'var(--text-3)' }}
            />
          ))}
          {limit && (
            <ReferenceLine y={limit.value} stroke="var(--act)" strokeDasharray="5 4" ifOverflow="extendDomain" />
          )}
          {lines.map((l, i) => (
            <Area
              key={l.id}
              dataKey={l.id}
              name={l.name}
              type="monotone"
              connectNulls={false}
              stroke={colorOf(l, i)}
              fill={colorOf(l, i)}
              fillOpacity={CHART_DEFAULTS.areaOpacity}
              {...CHART_DEFAULTS.line}
              dot={false}
              activeDot={{ r: 4, stroke: 'var(--panel)', strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ChartContainer>
    </div>
  );
}
