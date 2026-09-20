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
import { AlertTriangle, Table2, BarChart3 } from 'lucide-react';
import type { WasteEvent } from '@/shared/contracts';
import type { WasteBalanceRow } from '@/state/data';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE } from '@/state/stationScope';
import { formatDateIST } from '@/lib/time';
import { synth } from '@/lib/provenance';

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

  return (
    <div className="space-y-3.5">
      {/* ---- Balance check (FR-3.4) ---- */}
      {failing.length > 0 && (
        <div
          className="flex items-start gap-2.5 px-4 py-3"
          role="alert"
          style={{
            backgroundColor: 'rgba(242,107,33,0.10)',
            border: '1px solid var(--act)',
            borderRadius: 'var(--r-inner)',
          }}
        >
          <AlertTriangle size={15} style={{ color: 'var(--act)' }} className="mt-0.5 shrink-0" aria-hidden />
          <div className="flex-1">
            <p className="text-[12.5px] mb-1" style={{ color: 'var(--act-soft)' }}>
              Mass balance fails on {failing.length} stream{failing.length === 1 ? '' : 's'}:{' '}
              generated − shipped ≠ stored beyond the {toleranceKg} kg tolerance.
            </p>
            <div className="flex flex-wrap gap-2">
              {failing.map((row) => (
                <button
                  key={row.stationId + row.stream}
                  type="button"
                  disabled={!canRaise}
                  onClick={() => onRaiseBalanceAction(row)}
                  className="font-mono text-[9.5px] tracking-[0.06em] px-2.5 py-1.5 rounded min-h-[32px]"
                  style={{ border: '1px solid var(--act)', color: 'var(--act-soft)', opacity: canRaise ? 1 : 0.4 }}
                >
                  RAISE T2 · {STATION_CODE[row.stationId]} {STREAM_LABEL[row.stream]} ·{' '}
                  {row.discrepancyKg > 0 ? '+' : ''}{row.discrepancyKg} kg
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---- Chart / table ---- */}
      <section
        className="p-4"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <h3 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
            Monthly generation by stream
          </h3>
          <ProvenanceBadge
            measurement={synth(0, 'kg', 'station waste record feed')}
            label="All waste masses"
          />
          <div className="flex items-center gap-0.5 p-0.5 rounded-full ml-auto" style={{ border: '1px solid var(--line)' }}>
            <button
              type="button"
              onClick={() => setView('chart')}
              aria-pressed={view === 'chart'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-[10px]"
              style={{ backgroundColor: view === 'chart' ? 'var(--panel-raised)' : 'transparent', color: view === 'chart' ? 'var(--text)' : 'var(--text-3)' }}
            >
              <BarChart3 size={11} /> CHART
            </button>
            <button
              type="button"
              onClick={() => setView('table')}
              aria-pressed={view === 'table'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-[10px]"
              style={{ backgroundColor: view === 'table' ? 'var(--panel-raised)' : 'transparent', color: view === 'table' ? 'var(--text)' : 'var(--text-3)' }}
            >
              <Table2 size={11} /> TABLE
            </button>
          </div>
        </div>

        {series.length === 0 ? (
          <EmptyState reason="No waste events recorded for this scope and period." />
        ) : view === 'chart' ? (
          <WasteChart series={series} />
        ) : (
          <WasteTable series={series} />
        )}

        {/* Legend — always present for >= 2 series */}
        <ul className="flex flex-wrap gap-x-3.5 gap-y-1.5 mt-3">
          {STREAM_ORDER.map((stream) => (
            <li key={stream} className="flex items-center gap-1.5">
              <span style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: STREAM_RAMP[stream] }} aria-hidden />
              <span className="font-mono text-[9px] tracking-[0.04em]" style={{ color: 'var(--text-3)' }}>
                {STREAM_LABEL[stream]}
              </span>
            </li>
          ))}
          <li className="flex items-center gap-1.5">
            <span style={{ width: 12, height: 2, backgroundColor: 'var(--text-2)' }} aria-hidden />
            <span className="font-mono text-[9px] tracking-[0.04em]" style={{ color: 'var(--text-3)' }}>
              Cumulative stored
            </span>
          </li>
        </ul>
      </section>

      {/* ---- Mass balance table (FR-3.1) ---- */}
      <section
        className="p-4"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <h3 className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Mass balance</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse">
            <thead>
              <tr>
                {['Stream', 'Stn', 'Generated', 'Shipped out', 'Stored', 'Check'].map((h) => (
                  <th key={h} className="pb-2 px-1.5 text-left font-mono text-[9px] uppercase tracking-[0.12em] font-normal"
                    style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line-strong)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {balance.map((row) => (
                <tr key={row.stationId + row.stream}>
                  <td className="py-2 px-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="flex items-center gap-2">
                      <span style={{ width: 9, height: 9, borderRadius: 2, backgroundColor: STREAM_RAMP[row.stream] }} aria-hidden />
                      <span className="text-[12px]" style={{ color: 'var(--text)' }}>{STREAM_LABEL[row.stream]}</span>
                    </span>
                  </td>
                  <td className="py-2 px-1.5 font-mono text-[11px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                    {STATION_CODE[row.stationId]}
                  </td>
                  <td className="py-2 px-1.5 font-mono text-[11.5px] tabular-nums" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)' }}>
                    {row.generatedKg.toLocaleString()} kg
                  </td>
                  <td className="py-2 px-1.5 font-mono text-[11.5px] tabular-nums" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)' }}>
                    {row.shippedKg.toLocaleString()} kg
                  </td>
                  <td className="py-2 px-1.5 font-mono text-[11.5px] tabular-nums" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)' }}>
                    {row.storedKg.toLocaleString()} kg
                  </td>
                  <td className="py-2 px-1.5 font-mono text-[11px] tabular-nums" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span style={{ color: row.withinTolerance ? 'var(--ok-soft)' : 'var(--act-soft)' }}>
                      {row.withinTolerance ? 'balanced' : `${row.discrepancyKg > 0 ? '+' : ''}${row.discrepancyKg} kg`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- Event rows (FR-3.5, FR-3.6) ---- */}
      <section
        className="p-4"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <h3 className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Waste events</h3>
        <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
          <table className="w-full min-w-[760px] border-collapse">
            <thead className="sticky top-0" style={{ backgroundColor: 'var(--panel)' }}>
              <tr>
                {['Date', 'Stream', 'Dir', 'Mass', 'Container', 'Handler', 'Destination', 'Class'].map((h) => (
                  <th key={h} className="pb-2 px-1.5 text-left font-mono text-[9px] uppercase tracking-[0.12em] font-normal"
                    style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line-strong)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 60).map((e) => (
                <tr key={e.id}>
                  <td className="py-1.5 px-1.5 font-mono text-[10.5px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                    {formatDateIST(e.at)}
                  </td>
                  <td className="py-1.5 px-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="flex items-center gap-1.5">
                      <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: STREAM_RAMP[e.stream] }} aria-hidden />
                      <span className="text-[11.5px]" style={{ color: 'var(--text-2)' }}>{STREAM_LABEL[e.stream]}</span>
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 font-mono text-[10px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-4)' }}>
                    {e.direction === 'generated' ? 'GEN' : 'SHIP'}
                  </td>
                  <td className="py-1.5 px-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    <span className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--text-2)' }}>
                        {typeof e.massKg.value === 'number' ? e.massKg.value.toLocaleString() : '—'} kg
                      </span>
                      <ProvenanceBadge measurement={e.massKg} label={STREAM_LABEL[e.stream] + ' mass'} />
                    </span>
                  </td>
                  <td className="py-1.5 px-1.5 font-mono text-[10px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-4)' }}>
                    {e.containerId ?? '—'}
                  </td>
                  <td className="py-1.5 px-1.5 text-[11px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                    {e.handler}
                  </td>
                  <td className="py-1.5 px-1.5 text-[11px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                    {e.voyageId ? (
                      <button
                        type="button"
                        onClick={() => onOpenVoyage(e.voyageId!)}
                        className="underline underline-offset-2"
                        style={{ color: 'var(--text-2)' }}
                      >
                        {e.destination ?? e.voyageId}
                      </button>
                    ) : (
                      e.destination ?? '—'
                    )}
                  </td>
                  <td className="py-1.5 px-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                    {e.pendingSync && (
                      <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded"
                        style={{ border: '1px dashed var(--watch)', color: 'var(--watch-soft)' }}>
                        PENDING SYNC
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
// Chart — two panels, one shared x axis. Never two y scales.
// ---------------------------------------------------------------------------

const W = 760;
const BAR_H = 180;
const LINE_H = 84;
const GAP = 26;
const PAD_L = 52;
const PAD_R = 14;
const AXIS_H = 20;

function WasteChart({ series }: { series: Props['series'] }) {
  const [hover, setHover] = useState<number | null>(null);

  const monthTotals = series.map((m) => Object.values(m.byStream).reduce((s, v) => s + v, 0));
  const maxMonth = Math.max(1, ...monthTotals);
  const maxCumulative = Math.max(1, ...series.map((m) => m.cumulativeStoredKg));

  const plotW = W - PAD_L - PAD_R;
  const slot = plotW / Math.max(1, series.length);
  const barW = Math.min(46, slot * 0.62);
  const totalH = BAR_H + GAP + LINE_H + AXIS_H;

  const linePoints = series.map((m, i) => {
    const x = PAD_L + slot * i + slot / 2;
    const y = BAR_H + GAP + LINE_H - (m.cumulativeStoredKg / maxCumulative) * (LINE_H - 8);
    return [x, y] as const;
  });

  const labelFor = (month: string) => {
    const [, mm] = month.split('-');
    return ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][Number(mm) - 1] ?? month;
  };

  return (
    <div className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full min-w-[560px]" style={{ height: totalH }}
        role="img" aria-label="Monthly waste generation by stream, with cumulative stored mass below">

        {/* y grid — generation panel */}
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={PAD_L} y1={BAR_H - f * (BAR_H - 10)} x2={W - PAD_R} y2={BAR_H - f * (BAR_H - 10)}
              stroke="var(--line)" strokeWidth={1} />
            <text x={PAD_L - 6} y={BAR_H - f * (BAR_H - 10) + 3}
              textAnchor="end" fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--text-4)">
              {Math.round((maxMonth * f) / 100) * 100}
            </text>
          </g>
        ))}
        <text x={4} y={12} fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--text-4)">kg / month</text>

        {/* Stacked bars — 2px surface gap between segments */}
        {series.map((m, i) => {
          const x = PAD_L + slot * i + (slot - barW) / 2;
          let cursor = BAR_H;
          // The topmost visible segment gets the 4px rounded data-end; every
          // other segment stays square so the stack reads as one bar.
          const visible = STREAM_ORDER.filter((s) => (m.byStream[s] ?? 0) > 0);
          const topStream = visible[visible.length - 1];
          return (
            <g key={m.month}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}>
              <rect x={PAD_L + slot * i} y={0} width={slot} height={BAR_H} fill="transparent" />
              {STREAM_ORDER.map((stream) => {
                const value = m.byStream[stream] ?? 0;
                if (value <= 0) return null;
                const h = (value / maxMonth) * (BAR_H - 10);
                cursor -= h;
                const isTop = stream === topStream;
                return (
                  <rect
                    key={stream}
                    x={x}
                    y={cursor + 1}
                    width={barW}
                    height={Math.max(1, h - 2)}
                    fill={STREAM_RAMP[stream]}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                    rx={isTop ? 4 : 1.5}
                  />
                );
              })}
            </g>
          );
        })}

        {/* Cumulative stored mass — its OWN panel, its own scale, same x axis */}
        <text x={4} y={BAR_H + GAP + 10} fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--text-4)">
          kg stored
        </text>
        <line x1={PAD_L} y1={BAR_H + GAP + LINE_H} x2={W - PAD_R} y2={BAR_H + GAP + LINE_H}
          stroke="var(--line)" strokeWidth={1} />
        <polyline
          fill="none"
          stroke="var(--text-2)"
          strokeWidth={2}
          points={linePoints.map(([x, y]) => `${x},${y}`).join(' ')}
        />
        {linePoints.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={hover === i ? 4.5 : 3}
            fill="var(--panel)" stroke="var(--text-2)" strokeWidth={2} />
        ))}
        {linePoints.length > 0 && (
          <text
            x={linePoints[linePoints.length - 1][0] - 4}
            y={linePoints[linePoints.length - 1][1] - 8}
            textAnchor="end"
            fontFamily="var(--font-mono)" fontSize={9} fill="var(--text-2)"
          >
            {series[series.length - 1].cumulativeStoredKg.toLocaleString()} kg
          </text>
        )}

        {/* Shared x axis */}
        {series.map((m, i) => (
          <text
            key={m.month}
            x={PAD_L + slot * i + slot / 2}
            y={totalH - 5}
            textAnchor="middle"
            fontFamily="var(--font-mono)" fontSize={9}
            fill={hover === i ? 'var(--text-2)' : 'var(--text-4)'}
          >
            {labelFor(m.month)}
          </text>
        ))}
      </svg>

      {hover !== null && series[hover] && (
        <div
          className="absolute top-2 right-2 p-2.5 pointer-events-none w-52"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-inner)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
          }}
        >
          <p className="font-mono text-[10px] mb-1.5" style={{ color: 'var(--text-2)' }}>
            {series[hover].month}
          </p>
          {STREAM_ORDER.map((stream) => {
            const v = series[hover].byStream[stream] ?? 0;
            if (v <= 0) return null;
            return (
              <div key={stream} className="flex items-center gap-1.5 py-0.5">
                <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: STREAM_RAMP[stream] }} />
                <span className="font-mono text-[9px] flex-1" style={{ color: 'var(--text-3)' }}>
                  {STREAM_LABEL[stream]}
                </span>
                <span className="font-mono text-[9.5px] tabular-nums" style={{ color: 'var(--text-2)' }}>
                  {v.toLocaleString()}
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-1.5 pt-1.5 mt-1" style={{ borderTop: '1px solid var(--line)' }}>
            <span className="font-mono text-[9px] flex-1" style={{ color: 'var(--text-3)' }}>Stored</span>
            <span className="font-mono text-[9.5px] tabular-nums" style={{ color: 'var(--text-2)' }}>
              {series[hover].cumulativeStoredKg.toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/** The table view the accessibility pass requires. */
function WasteTable({ series }: { series: Props['series'] }) {
  const rows = useMemo(() => series.slice().reverse(), [series]);
  return (
    <div className="overflow-x-auto max-h-[280px] overflow-y-auto">
      <table className="w-full min-w-[640px] border-collapse">
        <thead className="sticky top-0" style={{ backgroundColor: 'var(--panel)' }}>
          <tr>
            <th className="pb-2 px-1.5 text-left font-mono text-[9px] uppercase tracking-[0.12em] font-normal"
              style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line-strong)' }}>Month</th>
            {STREAM_ORDER.map((s) => (
              <th key={s} className="pb-2 px-1.5 text-right font-mono text-[9px] uppercase tracking-[0.1em] font-normal"
                style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line-strong)' }}>
                {STREAM_LABEL[s]}
              </th>
            ))}
            <th className="pb-2 px-1.5 text-right font-mono text-[9px] uppercase tracking-[0.1em] font-normal"
              style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line-strong)' }}>Stored</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.month}>
              <td className="py-1.5 px-1.5 font-mono text-[10.5px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                {m.month}
              </td>
              {STREAM_ORDER.map((s) => (
                <td key={s} className="py-1.5 px-1.5 text-right font-mono text-[10.5px] tabular-nums"
                  style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)' }}>
                  {(m.byStream[s] ?? 0).toLocaleString()}
                </td>
              ))}
              <td className="py-1.5 px-1.5 text-right font-mono text-[10.5px] tabular-nums"
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
