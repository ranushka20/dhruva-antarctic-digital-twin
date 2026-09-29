// OWNER: Dev B
// Obligations — a season calendar strip plus the due list.
//
// The distinction that has to be visible (FR-2.6): an obligation whose
// evidence is sitting in a station outbox reads QUEUED OFFLINE, not OVERDUE.
// The station did its part; the link did not. Marking that station
// non-compliant would be wrong and an operator would rightly stop trusting
// the page.

import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import type { Obligation } from '@/shared/contracts';
import { CHART_DEFAULTS, ChartContainer, ChartLegend, ChartTooltipContent } from '@/components/shared/Chart';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDateIST, daysFromNow } from '@/lib/time';

const STATUS_STYLE: Record<Obligation['status'], { color: string; label: string; border: string; hint: string }> = {
  submitted: { color: 'var(--ok-soft)', label: 'Submitted', border: 'var(--ok)', hint: 'Evidence received at HQ.' },
  due_soon: { color: 'var(--watch-soft)', label: 'Due soon', border: 'var(--watch)', hint: 'Due within the next 30 days.' },
  overdue: { color: 'var(--act-soft)', label: 'Overdue', border: 'var(--act)', hint: 'Past its due date with no evidence received.' },
  queued_offline: {
    color: 'var(--watch-soft)', label: 'Queued offline', border: 'var(--watch)',
    hint: 'The record exists at the station and is waiting on the link, not on a person. Not overdue.',
  },
  future: { color: 'var(--text-3)', label: 'Upcoming', border: 'var(--line-strong)', hint: 'Due later in the season.' },
};

const STATUS_ORDER: Obligation['status'][] = ['overdue', 'due_soon', 'queued_offline', 'submitted', 'future'];

const CADENCE_LABEL: Record<Obligation['cadence'], string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  seasonal: 'Once a season',
  annual: 'Once a year',
  'event-driven': 'When an event occurs',
};

const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "in 11 days" / "3 days ago" / "today" — plain words next to the date. */
function relativeDays(iso: string): string {
  const d = Math.round(daysFromNow(iso));
  if (d === 0) return 'today';
  if (d === 1) return 'tomorrow';
  if (d === -1) return 'yesterday';
  return d > 0 ? `in ${d} days` : `${-d} days ago`;
}

interface Props {
  obligations: Obligation[];
  onOpen: (id: string) => void;
  onOpenAction: (actionId: string) => void;
}

export function Obligations({ obligations, onOpen, onOpenAction }: Props) {
  const cell = { borderBottom: '1px solid var(--line)' } as const;

  return (
    <div className="flex flex-col gap-5">
      {/* ---- Season calendar (FR-2.1): how much falls due each month ---- */}
      <SeasonCalendar obligations={obligations} />

      {/* ---- Due list (FR-2.2) ---- */}
      <section
        className="p-5"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap mb-4">
          <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Obligations</h3>
          <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
            Select a row to see the full record.
          </p>
        </div>
        {obligations.length === 0 ? (
          <EmptyState reason="No obligations registered for this scope and period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] border-collapse">
              <thead>
                <tr>
                  {['Obligation', 'Station', 'Due', 'Owner', 'Status', ''].map((h, i) => (
                    <th key={h || 'action-' + i} className="pb-3 px-4 text-left text-body-sm font-medium"
                      style={{ color: 'var(--text-3)', borderBottom: '1px solid var(--line-strong)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {obligations.map((o) => {
                  const style = STATUS_STYLE[o.status];
                  const overdueNoAction = o.status === 'overdue' && !o.linkedActionId;
                  return (
                    <tr key={o.id} onClick={() => onOpen(o.id)} className="cursor-pointer hover:bg-[var(--panel-raised)]">
                      <td className="py-3 px-4 align-top" style={cell}>
                        <span className="block text-body font-medium" style={{ color: 'var(--text)' }}>
                          {o.name}
                        </span>
                        <span className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
                          <span>{sentence(o.category)}</span>
                          <span title={`Cadence: ${o.cadence}`}>{CADENCE_LABEL[o.cadence] ?? o.cadence}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top" style={cell}>
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-body-sm whitespace-nowrap"
                          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                          title={STATION_CODE[o.stationId]}
                        >
                          {STATION_LABEL[o.stationId]}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top whitespace-nowrap" style={cell}>
                        <span className="block font-mono text-body tabular-nums" style={{ color: 'var(--text)' }}>
                          {formatDateIST(o.dueDate)}
                        </span>
                        <span className="block text-body-sm mt-1" style={{ color: 'var(--text-3)' }}>
                          {relativeDays(o.dueDate)}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-body" style={{ ...cell, color: 'var(--text-2)' }}>
                        {o.owner}
                      </td>
                      <td className="py-3 px-4 align-top" style={cell}>
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-body-sm font-medium whitespace-nowrap"
                          style={{ border: `1px ${o.status === 'queued_offline' ? 'dashed' : 'solid'} ${style.border}`, color: style.color }}
                          title={style.hint}
                        >
                          {style.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top text-right whitespace-nowrap" style={cell}
                        onClick={(e) => e.stopPropagation()}>
                        {o.linkedActionId ? (
                          <button
                            type="button"
                            onClick={() => onOpenAction(o.linkedActionId!)}
                            className="text-body-sm font-medium px-4 min-h-9 rounded-full hover:bg-[var(--panel-alt)]"
                            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
                          >
                            Open action
                          </button>
                        ) : overdueNoAction ? (
                          <span className="text-body-sm font-medium" style={{ color: 'var(--act-soft)' }}
                            title="An overdue obligation must carry a T2 action — a missing link is a data-integrity error">
                            No linked action
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-body-sm mt-5 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          <span className="font-medium" style={{ color: 'var(--text-2)' }}>Queued offline is not overdue.</span>{' '}
          The record exists at the station and is waiting on the link, not on a person.
        </p>
      </section>
    </div>
  );
}

export { STATUS_STYLE };

// ---------------------------------------------------------------------------
// Season calendar — one bar per month, stacked by status. The one thing it
// says: how much falls due when, and how much of it is late. Individual
// obligations are opened from the list below, not from the chart.

const CAL_SERIES: { key: Obligation['status']; label: string; fill: string; legend: string }[] = [
  { key: 'overdue', label: 'Overdue', fill: 'var(--act)', legend: 'var(--act)' },
  { key: 'due_soon', label: 'Due soon', fill: 'var(--watch)', legend: 'var(--watch)' },
  { key: 'queued_offline', label: 'Waiting to sync', fill: 'url(#obl-queued)', legend: 'var(--watch-soft)' },
  { key: 'submitted', label: 'Submitted', fill: 'var(--ok)', legend: 'var(--ok)' },
  { key: 'future', label: 'Upcoming', fill: 'var(--unknown)', legend: 'var(--unknown)' },
];

const monthFmt = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'Asia/Kolkata' });
const monthLongFmt = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

function SeasonCalendar({ obligations }: { obligations: Obligation[] }) {
  const { rows, overdue, next30 } = useMemo(() => {
    const now = new Date();
    // Two months back, the current month, four ahead.
    const months = Array.from({ length: 7 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 2 + i, 1));
    const rows = months.map((m, i) => {
      const row: Record<string, string | number> = {
        month: i === 2 ? 'This month' : monthFmt.format(m),
        full: monthLongFmt.format(m),
      };
      for (const sk of CAL_SERIES) row[sk.key] = 0;
      for (const o of obligations) {
        const d = new Date(o.dueDate);
        if (d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth()) {
          row[o.status] = (row[o.status] as number) + 1;
        }
      }
      return row;
    });
    return {
      rows,
      overdue: obligations.filter((o) => o.status === 'overdue').length,
      next30: obligations.filter((o) => { const d = daysFromNow(o.dueDate); return d >= 0 && d <= 30; }).length,
    };
  }, [obligations]);

  return (
    <section
      className="p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
    >
      <div className="flex items-baseline gap-x-4 gap-y-1 flex-wrap mb-1">
        <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }}>What falls due each month</h3>
      </div>
      <p className="text-body-sm mb-4" style={{ color: 'var(--text-3)' }}>
        <span className="font-mono" style={{ color: overdue > 0 ? 'var(--act-soft)' : 'var(--text-2)' }}>{overdue}</span> overdue ·{' '}
        <span className="font-mono" style={{ color: 'var(--text-2)' }}>{next30}</span> due in the next 30 days.
        Hover a month for its breakdown.
      </p>

      <ChartLegend
        className="mb-3"
        items={CAL_SERIES.map((sk) => ({ label: sk.label, color: sk.legend, hint: STATUS_STYLE[sk.key].hint }))}
      />

      <ChartContainer className="h-52" label="Obligations due per month, stacked by status">
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="28%">
          <defs>
            <pattern id="obl-queued" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill="var(--watch)" opacity="0.35" />
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--watch)" strokeWidth="3" />
            </pattern>
          </defs>
          <CartesianGrid {...CHART_DEFAULTS.grid} />
          <XAxis dataKey="month" {...CHART_DEFAULTS.axis} interval={0} />
          <YAxis {...CHART_DEFAULTS.axis} width={28} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--panel-raised)' }}
            content={
              <ChartTooltipContent
                hideZero
                labelFormatter={(l) => rows.find((r) => r.month === l)?.full ?? String(l)}
              />
            }
          />
          {CAL_SERIES.map((sk) => (
            <Bar
              key={sk.key}
              dataKey={sk.key}
              name={sk.label}
              stackId="due"
              fill={sk.fill}
              maxBarSize={36}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ChartContainer>
    </section>
  );
}
