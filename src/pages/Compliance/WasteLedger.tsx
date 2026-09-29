// OWNER: Dev B
// Waste ledger — mass balance per stream, the monthly generation chart, and
// the balance check that is this page's most useful integrity feature.
//
// CHART COLOUR NOTE. This design system reserves orange, mint, amber, grey
// and violet for status meaning, and forbids any of them as a chart fill.
// Eight nominal hues cannot be minted without colliding with that contract,
// and the waste streams DO carry a real handling order under the
// Environmental Protocol (general -> hazardous), so the stack is encoded as
// an ORDINAL one-hue ramp rather than eight invented categorical hues.
// The ramp is validated for this dark surface: monotone lightness, every
// adjacent gap >= 0.06 L, light end 2.03:1 against #0F1413, hue spread 4 deg.
// Identity is never colour-alone — legend, hover tooltip and a table view all
// name the stream.
//
// Generation and cumulative stored mass are plotted as TWO PANELS SHARING ONE
// X AXIS, never a dual-axis chart: a monthly figure and a running total are
// different magnitudes and putting them on one scale would flatten one of them.

import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { CHART_DEFAULTS, ChartContainer, ChartLegend, ChartTooltipContent } from '@/components/shared/Chart';
import { AlertTriangle, Table2, BarChart3 } from 'lucide-react';
import type { WasteEvent } from '@/shared/contracts';
import type { WasteBalanceRow } from '@/state/data';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDateIST } from '@/lib/time';
import { synth } from '@/lib/provenance';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';

/** Streams in regulatory handling order — the ramp encodes that order. */
export const STREAM_ORDER: WasteEvent['stream'][] = [
  'general', 'recyclable', 'food', 'sewage', 'scientific', 'medical', 'fuel_oily', 'hazardous',
];

/** Validated ordinal ramp for surface #0F1413 (see the note above). */
const STREAM_RAMP: Record<WasteEvent['stream'], string> = {
  general: '#D6FBEE',
  recyclable: '#ACEDD7',
  food: '#82DCBE',
  sewage: '#5BC8A5',
  scientific: '#3AB18C',
  medical: '#248F71',
  fuel_oily: '#166F57',
  hazardous: '#0C523F',
};

const STREAM_LABEL: Record<WasteEvent['stream'], string> = {
  general: 'General',
  recyclable: 'Recyclable',
  food: 'Food',
  sewage: 'Sewage',
  scientific: 'Scientific',
  medical: 'Medical',
  fuel_oily: 'Fuel / oily',
  hazardous: 'Hazardous',
};

interface Props {
  balance: WasteBalanceRow[];
  series: { month: string; byStream: Record<string, number>; cumulativeStoredKg: number }[];
  events: WasteEvent[];
  toleranceKg: number;
  onRaiseBalanceAction: (row: WasteBalanceRow) => void;
  onOpenVoyage: (voyageId: string) => void;
  canRaise: boolean;
}

export function WasteLedger({
  balance, series, events, toleranceKg, onRaiseBalanceAction, onOpenVoyage, canRaise,
}: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const failing = balance.filter((r) => !r.withinTolerance);

  const th = 'pb-3 px-3 text-left text-body-sm font-medium whitespace-nowrap';
  const thStyle = { color: 'var(--text-3)', borderBottom: '1px solid var(--line-strong)' } as const;
  const cell = { borderBottom: '1px solid var(--line)' } as const;

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Balance check (FR-3.4) ---- */}
      {failing.length > 0 && (
        <div
          className="flex items-start gap-3 px-5 py-4"
          role="alert"
          style={{
            backgroundColor: 'rgba(242,107,33,0.10)',
            border: '1px solid var(--act)',
            borderRadius: 'var(--r-card)',
          }}
        >
          <AlertTriangle size={20} style={{ color: 'var(--act)' }} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <p className="text-body font-medium" style={{ color: 'var(--act-soft)' }}>
              The waste books do not balance for{' '}
              <span className="font-mono tabular-nums">{failing.length}</span> stream{failing.length === 1 ? '' : 's'}.
            </p>
            <p className="text-body-sm mt-1 mb-3 max-w-[70ch]" style={{ color: 'var(--text-2)' }}>
              Generated minus shipped out should equal what is stored, within{' '}
              <span className="font-mono tabular-nums">{toleranceKg}</span> kg. Raise an action for each gap.
            </p>
            <div className="flex flex-wrap gap-2.5">
              {failing.map((row) => (
                <button
                  key={row.stationId + row.stream}
                  type="button"
                  disabled={!canRaise}
                  onClick={() => onRaiseBalanceAction(row)}
                  className="inline-flex items-center gap-2 text-body-sm font-medium px-4 min-h-9 rounded-full"
                  style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', fontFamily: 'var(--font-body)', opacity: canRaise ? 1 : 0.4 }}
                  title={`Raise a Tier 2 (T2) action · ${STATION_CODE[row.stationId]}`}
                >
                  Raise action — {STATION_LABEL[row.stationId]} {STREAM_LABEL[row.stream]}
                  <span className="font-mono tabular-nums">
                    {row.discrepancyKg > 0 ? '+' : ''}{row.discrepancyKg} kg
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Chart / table ---- */}
      <section
        className="p-5"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
            Waste produced each month
          </h3>
          <ProvenanceBadge
            measurement={synth(0, 'kg', 'station waste record feed')}
            label="All waste masses"
          />
          <div
            data-segmented
            role="group"
            aria-label="Chart or table view"
            className="relative isolate flex items-center gap-1 p-1 rounded-full ml-auto"
            style={{ border: '1px solid var(--line-strong)' }}
          >
            <button
              type="button"
              onClick={() => setView('chart')}
              aria-pressed={view === 'chart'}
              className="flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-medium"
              style={{ color: view === 'chart' ? 'var(--text)' : 'var(--text-3)' }}
            >
              <BarChart3 size={16} aria-hidden /> Chart
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
              className="flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-medium"
              style={{ color: view === 'table' ? 'var(--text)' : 'var(--text-3)' }}
            >
              <Table2 size={16} aria-hidden /> Table
            </button>
            <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--panel-raised)' }} />
          </div>
        </div>

        {series.length === 0 ? (
          <EmptyState reason="No waste events recorded for this scope and period." />
        ) : view === 'chart' ? (
          <WasteChart series={series} />
        ) : (
          <WasteTable series={series} />
        )}

        {/* Stream legend for the table view; the chart carries its own. */}
        {view === 'table' && series.length > 0 && (
          <ul className="flex flex-wrap gap-x-6 gap-y-2.5 mt-5 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
            {STREAM_ORDER.map((stream) => (
              <li key={stream} className="flex items-center gap-2">
                <span className="shrink-0" style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: STREAM_RAMP[stream] }} aria-hidden />
                <span className="text-body-sm" style={{ color: 'var(--text-2)' }}>{STREAM_LABEL[stream]}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- Mass balance table (FR-3.1) ---- */}
      <section
        className="p-5"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap mb-4">
          <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Mass balance</h3>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            Generated − shipped out should equal stored.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[44rem] border-collapse">
            <thead>
              <tr>
                {['Waste stream', 'Station', 'Generated', 'Shipped out', 'Stored', 'Balance check'].map((h) => (
                  <th key={h} className={th} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balance.map((row) => (
                <tr key={row.stationId + row.stream}>
                  <td className="py-3 px-3" style={cell}>
                    <span className="flex items-center gap-2.5">
                      <span className="shrink-0" style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: STREAM_RAMP[row.stream] }} aria-hidden />
                      <span className="text-body font-medium" style={{ color: 'var(--text)' }}>{STREAM_LABEL[row.stream]}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-body" style={{ ...cell, color: 'var(--text-2)' }} title={STATION_CODE[row.stationId]}>
                    {STATION_LABEL[row.stationId]}
                  </td>
                  <td className="py-3 px-3 font-mono text-body tabular-nums whitespace-nowrap" style={{ ...cell, color: 'var(--text-2)' }}>
                    {row.generatedKg.toLocaleString()} kg
                  </td>
                  <td className="py-3 px-3 font-mono text-body tabular-nums whitespace-nowrap" style={{ ...cell, color: 'var(--text-2)' }}>
                    {row.shippedKg.toLocaleString()} kg
                  </td>
                  <td className="py-3 px-3 font-mono text-body tabular-nums whitespace-nowrap" style={{ ...cell, color: 'var(--text-2)' }}>
                    {row.storedKg.toLocaleString()} kg
                  </td>
                  <td className="py-3 px-3" style={cell}>
                    {row.withinTolerance ? (
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium"
                        style={{ border: '1px solid var(--ok)', color: 'var(--ok-soft)' }}
                      >
                        Balanced
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-body-sm font-medium whitespace-nowrap"
                        style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}
                      >
                        Off by
                        <span className="font-mono tabular-nums">{row.discrepancyKg > 0 ? '+' : ''}{row.discrepancyKg} kg</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Event rows (FR-3.5, FR-3.6) ---- */}
      <section
        className="p-5"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap mb-4">
          <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Waste events</h3>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            Most recent first. Shipments link to their voyage manifest.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[32rem] overflow-y-auto">
          <table className="w-full min-w-[54rem] border-collapse">
            <thead className="sticky top-0 z-[1]" style={{ backgroundColor: 'var(--panel)' }}>
              <tr>
                {['Date', 'Waste stream', 'Movement', 'Mass', 'Handled by', 'Destination', 'Sync'].map((h) => (
                  <th key={h} className={th} style={thStyle}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 60).map((e) => (
                <tr key={e.id}>
                  <td className="py-3 px-3 font-mono text-body-sm tabular-nums whitespace-nowrap align-top" style={{ ...cell, color: 'var(--text-2)' }}>
                    {formatDateIST(e.at)}
                  </td>
                  <td className="py-3 px-3 align-top" style={cell}>
                    <span className="flex items-center gap-2">
                      <span className="shrink-0" style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: STREAM_RAMP[e.stream] }} aria-hidden />
                      <span className="text-body" style={{ color: 'var(--text)' }}>{STREAM_LABEL[e.stream]}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-body-sm align-top whitespace-nowrap" style={{ ...cell, color: 'var(--text-3)' }}
                    title={e.direction === 'generated' ? 'GEN' : 'SHIP'}>
                    {e.direction === 'generated' ? 'Generated' : 'Shipped out'}
                  </td>
                  <td className="py-3 px-3 align-top" style={cell}>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-body tabular-nums whitespace-nowrap" style={{ color: 'var(--text)' }}>
                        {typeof e.massKg.value === 'number' ? e.massKg.value.toLocaleString() : '—'} kg
                      </span>
                      <ProvenanceBadge measurement={e.massKg} label={STREAM_LABEL[e.stream] + ' mass'} />
                    </span>
                  </td>
                  <td className="py-3 px-3 align-top" style={cell}>
                    <span className="block text-body-sm" style={{ color: 'var(--text-2)' }}>{e.handler}</span>
                    <span className="block text-caption mt-0.5" style={{ color: 'var(--text-3)' }}>
                      Container <span className="font-mono">{e.containerId ?? '—'}</span>
                    </span>
                  </td>
                  <td className="py-3 px-3 text-body-sm align-top" style={{ ...cell, color: 'var(--text-3)' }}>
                    {e.voyageId ? (
                      <button
                        type="button"
                        onClick={() => onOpenVoyage(e.voyageId!)}
                        className="inline-flex items-center text-left underline underline-offset-4 min-h-9"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {e.destination ?? e.voyageId}
                      </button>
                    ) : (
                      e.destination ?? '—'
                    )}
                  </td>
                  <td className="py-3 px-3 align-top" style={cell}>
                    {e.pendingSync && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-body-sm whitespace-nowrap"
                        style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}
                        title="Recorded at the station; waiting on the link to reach HQ">
                        Waiting to sync
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Chart — one question: how much waste was produced each month, and of what
// kind. Eight near-identical greens could not be told apart, so the chart
// stacks three plain groups; the table view keeps all eight streams. The
// running total stored is a single number, so it is a headline, not a panel.
// ---------------------------------------------------------------------------

const WASTE_GROUPS = [
  { key: 'everyday', label: 'Everyday', streams: ['general', 'recyclable', 'food'], color: 'var(--chart-1)',
    hint: 'General, recyclable and food waste' },
  { key: 'sewage_lab', label: 'Sewage & lab', streams: ['sewage', 'scientific'], color: 'var(--chart-3)',
    hint: 'Sewage and scientific waste' },
  { key: 'hazardous', label: 'Hazardous', streams: ['medical', 'fuel_oily', 'hazardous'], color: 'var(--chart-2)',
    hint: 'Medical, fuel / oily and hazardous waste' },
] as const;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function WasteChart({ series }: { series: Props['series'] }) {
  const rows = useMemo(
    () => series.map((m) => {
      const [yy, mm] = m.month.split('-');
      const row: Record<string, string | number> = {
        month: MONTHS[Number(mm) - 1] ?? m.month,
        full: `${MONTHS[Number(mm) - 1] ?? ''} ${yy}`,
      };
      for (const g of WASTE_GROUPS) {
        row[g.key] = g.streams.reduce((sum, st) => sum + (m.byStream[st] ?? 0), 0);
      }
      return row;
    }),
    [series],
  );
  const stored = series[series.length - 1]?.cumulativeStoredKg ?? 0;
  const lastMonth = rows[rows.length - 1];
  const lastTotal = lastMonth ? WASTE_GROUPS.reduce((s, g) => s + Number(lastMonth[g.key] ?? 0), 0) : 0;

  return (
    <div>
      <div className="flex items-end gap-x-10 gap-y-2 flex-wrap mb-4">
        <div>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>Stored at stations now</p>
          <p className="font-mono text-headline font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {stored.toLocaleString()} <span className="text-body-sm font-normal" style={{ color: 'var(--text-3)' }}>kg</span>
          </p>
        </div>
        <div>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>Produced last month</p>
          <p className="font-mono text-headline font-medium tabular-nums" style={{ color: 'var(--text)' }}>
            {lastTotal.toLocaleString()} <span className="text-body-sm font-normal" style={{ color: 'var(--text-3)' }}>kg</span>
          </p>
        </div>
        <ChartLegend
          className="ml-auto"
          items={WASTE_GROUPS.map((g) => ({ label: g.label, color: g.color, hint: g.hint }))}
        />
      </div>

      <ChartContainer className="h-60" label="Waste produced per month in kilograms, stacked by type">
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
          <CartesianGrid {...CHART_DEFAULTS.grid} />
          <XAxis dataKey="month" {...CHART_DEFAULTS.axis} interval={0} />
          <YAxis
            {...CHART_DEFAULTS.axis}
            width={44}
            tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 100) / 10}k` : String(v))}
          />
          <Tooltip
            cursor={{ fill: 'var(--panel-raised)' }}
            content={
              <ChartTooltipContent
                unit="kg"
                hideZero
                labelFormatter={(l) => rows.find((r) => r.month === l)?.full ?? String(l)}
              />
            }
          />
          {WASTE_GROUPS.map((g) => (
            <Bar key={g.key} dataKey={g.key} name={g.label} stackId="waste" fill={g.color} maxBarSize={32} isAnimationActive={false} />
          ))}
        </BarChart>
      </ChartContainer>
    </div>
  );
}

/** The table view the accessibility pass requires. */
function WasteTable({ series }: { series: Props['series'] }) {
  const rows = useMemo(() => series.slice().reverse(), [series]);
  return (
    <div className="overflow-x-auto max-h-[24rem] overflow-y-auto">
      <table className="w-full min-w-[48rem] border-collapse">
        <thead className="sticky top-0 z-[1]" style={{ backgroundColor: 'var(--panel)' }}>
          <tr>
            <th className="pb-3 px-3 text-left text-body-sm font-medium"
              style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--line-strong)' }}>Month</th>
            {STREAM_ORDER.map((s) => (
              <th key={s} className="pb-3 px-3 text-right text-body-sm font-medium whitespace-nowrap"
                style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--line-strong)' }}>
                {STREAM_LABEL[s]}
              </th>
            ))}
            <th className="pb-3 px-3 text-right text-body-sm font-medium whitespace-nowrap"
              style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--line-strong)' }}>Stored (kg)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.month}>
              <td className="py-3 px-3 font-mono text-body-sm tabular-nums" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)' }}>
                {m.month}
              </td>
              {STREAM_ORDER.map((s) => (
                <td key={s} className="py-3 px-3 text-right font-mono text-body-sm tabular-nums"
                  style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)' }}>
                  {(m.byStream[s] ?? 0).toLocaleString()}
                </td>
              ))}
              <td className="py-3 px-3 text-right font-mono text-body-sm tabular-nums"
                style={{ borderBottom: '1px solid var(--line)', color: 'var(--text)' }}>
                {m.cumulativeStoredKg.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export { STREAM_LABEL, STREAM_RAMP };
