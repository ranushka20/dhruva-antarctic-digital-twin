// OWNER: Dev B
// Chart primitives — a typed port of the ~/Temp-ui-comps chart kit
// (components/ui/chart.tsx + CHART_DEFAULTS), restyled on DHRUVA tokens.
//
//   ChartContainer       responsive Recharts host; styles come from styles/chart.css
//   ChartTooltipContent  one tooltip look for every chart (sans labels, mono values)
//   ChartLegend          a plain HTML legend, placed where the chart's reader looks first
//   CHART_DEFAULTS       the shared axis / grid / bar / line props
//
// Rules every chart follows: say one thing, title it with a sentence that
// says what the reader should take away, and keep status colours for
// statuses — data series use --chart-1/2/3.

import { type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';

export const CHART_DEFAULTS = {
  /** Horizontal-only hairline. */
  grid: { vertical: false, stroke: 'var(--line)' },
  axis: { tickLine: false, axisLine: false, tickMargin: 8 },
  /** Bars capped so the band keeps its air; rounded data end, square baseline. */
  bar: { maxBarSize: 24 },
  barRadius: [4, 4, 0, 0] as [number, number, number, number],
  line: { strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const },
  areaOpacity: 0.1,
};

export function ChartContainer({
  children, className = '', style, label,
}: {
  children: ReactElement;
  className?: string;
  style?: CSSProperties;
  /** Accessible summary of what the chart shows. */
  label: string;
}) {
  return (
    <div className={`chart w-full ${className}`} style={style} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 160 }}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

interface TooltipItem {
  name?: string | number;
  dataKey?: string | number | ((obj: unknown) => unknown);
  value?: number | string | (number | string)[];
  color?: string;
  payload?: Record<string, unknown>;
}

/** Pass as `<Tooltip content={<ChartTooltipContent … />} />`; Recharts fills in active/payload/label. */
export function ChartTooltipContent({
  active, payload, label, labelFormatter, valueFormatter, unit, hideZero = false,
}: {
  active?: boolean;
  payload?: TooltipItem[];
  label?: string | number;
  labelFormatter?: (label: string | number | undefined) => ReactNode;
  valueFormatter?: (value: number, name: string) => ReactNode;
  unit?: string;
  /** Skip series whose value is 0 (useful for stacked counts). */
  hideZero?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== null && !(hideZero && p.value === 0));
  if (!rows.length) return null;

  return (
    <div
      className="min-w-40 px-3.5 py-2.5 text-body-sm"
      style={{
        backgroundColor: 'var(--panel-alt)',
        border: '1px solid var(--line-strong)',
        borderRadius: 'var(--r-inner)',
        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
      }}
    >
      {label !== undefined && (
        <p className="font-medium mb-1.5" style={{ color: 'var(--text)' }}>
          {labelFormatter ? labelFormatter(label) : label}
        </p>
      )}
      <div className="grid gap-1">
        {rows.map((item, i) => {
          const name = String(item.name ?? item.dataKey ?? '');
          const v = typeof item.value === 'number' ? item.value : Number(item.value);
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} aria-hidden />
              <span className="flex-1" style={{ color: 'var(--text-3)' }}>{name}</span>
              <span className="font-mono tabular-nums" style={{ color: 'var(--text)' }}>
                {valueFormatter ? valueFormatter(v, name) : Number.isFinite(v) ? v.toLocaleString() : String(item.value)}
                {unit && !valueFormatter ? <span style={{ color: 'var(--text-3)' }}> {unit}</span> : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ChartLegend({
  items, className = '',
}: {
  items: { label: string; color: string; hint?: string; dashed?: boolean }[];
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-x-5 gap-y-1.5 flex-wrap text-body-sm ${className}`} style={{ color: 'var(--text-3)' }}>
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-2" title={it.hint}>
          {it.dashed ? (
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: it.color }} aria-hidden />
          ) : (
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: it.color }} aria-hidden />
          )}
          {it.label}
        </span>
      ))}
    </div>
  );
}
