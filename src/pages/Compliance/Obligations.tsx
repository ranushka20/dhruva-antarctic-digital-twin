// OWNER: Dev B
// Obligations — a season calendar strip plus the due list.
//
// The distinction that has to be visible (FR-2.6): an obligation whose
// evidence is sitting in a station outbox reads QUEUED OFFLINE, not OVERDUE.
// The station did its part; the link did not. Marking that station
// non-compliant would be wrong and an operator would rightly stop trusting
// the page.

import type { Obligation } from '@/shared/contracts';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE } from '@/state/stationScope';
import { formatDateIST, daysFromNow } from '@/lib/time';

const STATUS_STYLE: Record<Obligation['status'], { color: string; label: string; border: string }> = {
  submitted: { color: 'var(--ok-soft)', label: 'SUBMITTED', border: 'var(--ok)' },
  due_soon: { color: 'var(--watch-soft)', label: 'DUE SOON', border: 'var(--watch)' },
  overdue: { color: 'var(--act-soft)', label: 'OVERDUE', border: 'var(--act)' },
  queued_offline: { color: 'var(--watch-soft)', label: 'QUEUED OFFLINE', border: 'var(--watch)' },
  future: { color: 'var(--text-3)', label: 'FUTURE', border: 'var(--line-strong)' },
};

interface Props {
  obligations: Obligation[];
  onOpen: (id: string) => void;
  onOpenAction: (actionId: string) => void;
}

export function Obligations({ obligations, onOpen, onOpenAction }: Props) {
  const span = { from: -60, to: 120 };
  const width = 960;
  const pad = 18;
  const dayToX = (d: number) =>
    pad + ((Math.max(span.from, Math.min(d, span.to)) - span.from) / (span.to - span.from)) * (width - pad * 2);

  return (
    <div className="space-y-3.5">
      {/* ---- Season calendar strip (FR-2.1) ---- */}
      <section
        className="p-4 overflow-x-auto"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <h3 className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Season calendar</h3>
        <svg viewBox={`0 0 ${width} 76`} className="w-full min-w-[560px]" style={{ height: 76 }}
          role="img" aria-label="Obligations plotted on their due dates">
          <line x1={pad} y1={46} x2={width - pad} y2={46} stroke="var(--line-strong)" strokeWidth={1} />
          <line x1={dayToX(0)} y1={26} x2={dayToX(0)} y2={62} stroke="var(--text-3)" strokeWidth={1} strokeDasharray="3 3" />
          <text x={dayToX(0)} y={20} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="var(--text-3)">
            today
          </text>

          {[-60, -30, 30, 60, 90, 120].map((d) => (
            <text key={d} x={dayToX(d)} y={70} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={8.5} fill="var(--text-4)">
              {d > 0 ? '+' : ''}{d}d
            </text>
          ))}

          {obligations.map((o, i) => {
            const d = daysFromNow(o.dueDate);
            const style = STATUS_STYLE[o.status];
            const y = 46 + (i % 2 === 0 ? -12 : 12);
            return (
              <g key={o.id} onClick={() => onOpen(o.id)} style={{ cursor: 'pointer' }}>
                <title>{`${o.name} — ${STATION_CODE[o.stationId]} — ${style.label} — due ${formatDateIST(o.dueDate)}`}</title>
                <line x1={dayToX(d)} y1={46} x2={dayToX(d)} y2={y} stroke={style.border} strokeWidth={1} opacity={0.5} />
                <circle cx={dayToX(d)} cy={y} r={5} fill={style.color} />
              </g>
            );
          })}
        </svg>
      </section>

      {/* ---- Due list (FR-2.2) ---- */}
      <section
        className="p-4"
        style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      >
        <h3 className="text-[13.5px] font-semibold mb-3" style={{ color: 'var(--text)' }}>Obligations</h3>
        {obligations.length === 0 ? (
          <EmptyState reason="No obligations registered for this scope and period." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr>
                  {['Obligation', 'Stn', 'Category', 'Cadence', 'Due', 'Owner', 'Status', ''].map((h) => (
                    <th key={h} className="pb-2 px-1.5 text-left font-mono text-[9px] uppercase tracking-[0.12em] font-normal"
                      style={{ color: 'var(--text-4)', borderBottom: '1px solid var(--line-strong)' }}>
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
                      <td className="py-2 px-1.5 text-[12.5px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text)' }}>
                        {o.name}
                      </td>
                      <td className="py-2 px-1.5 font-mono text-[11px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                        {STATION_CODE[o.stationId]}
                      </td>
                      <td className="py-2 px-1.5 text-[11px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                        {o.category}
                      </td>
                      <td className="py-2 px-1.5 font-mono text-[10px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-4)' }}>
                        {o.cadence}
                      </td>
                      <td className="py-2 px-1.5 font-mono text-[11px] tabular-nums" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-2)' }}>
                        {formatDateIST(o.dueDate)}
                      </td>
                      <td className="py-2 px-1.5 text-[11px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                        {o.owner}
                      </td>
                      <td className="py-2 px-1.5" style={{ borderBottom: '1px solid var(--line)' }}>
                        <span className="font-mono text-[8.5px] tracking-[0.06em] px-1.5 py-0.5 rounded whitespace-nowrap"
                          style={{ border: `1px solid ${style.border}`, color: style.color }}>
                          {style.label}
                        </span>
                      </td>
                      <td className="py-2 px-1.5 text-right whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)' }}
                        onClick={(e) => e.stopPropagation()}>
                        {o.linkedActionId ? (
                          <button
                            type="button"
                            onClick={() => onOpenAction(o.linkedActionId!)}
                            className="text-[11px] font-medium px-2.5 py-1 rounded min-h-[30px]"
                            style={{ border: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
                          >
                            Open action
                          </button>
                        ) : overdueNoAction ? (
                          <span className="font-mono text-[9px] uppercase" style={{ color: 'var(--act-soft)' }}
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
        <p className="font-mono text-[9px] mt-3" style={{ color: 'var(--text-4)' }}>
          QUEUED OFFLINE is not OVERDUE: the record exists at the station and is waiting on the link,
          not on a person.
        </p>
      </section>
    </div>
  );
}

export { STATUS_STYLE };
