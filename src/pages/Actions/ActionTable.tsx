// OWNER: Dev B
// Action table — the CONSEQUENCE column is mandatory (FR-3.2) and is what
// separates this from a ticket list. It carries the operational cost of
// inaction, straight from the coupling engine.

import { useMemo, useState } from 'react';
import type { Action } from '@/shared/contracts';
import type { DerivedAction } from '@/state/data';
import { TierChip } from '@/components/shared/TierChip';
import { StatusDot } from '@/components/shared/StatusDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { SYNC_OPACITY } from '@/lib/freshness';

export type SortKey = 'priority' | 'tier' | 'title' | 'station' | 'state' | 'age' | 'owner' | 'consequence';

const STATE_DOT: Record<Action['state'], 'ok' | 'watch' | 'warning' | 'unknown'> = {
  RAISED: 'warning', ACKNOWLEDGED: 'watch', ASSIGNED: 'watch',
  IN_PROGRESS: 'watch', RESOLVED: 'ok', DEFERRED: 'unknown',
};

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: 'tier', label: 'Tier' },
  { key: 'title', label: 'Action' },
  { key: 'station', label: 'Station' },
  { key: 'state', label: 'State' },
  { key: 'age', label: 'Age' },
  { key: 'owner', label: 'Owner' },
  { key: 'consequence', label: 'Consequence' },
];

interface Props {
  actions: DerivedAction[];
  selectedIds: Set<string>;
  cursorId: string | null;
  canWrite: boolean;
  onToggleSelect: (id: string) => void;
  onToggleAll: () => void;
  onOpen: (id: string) => void;
  onAck: (id: string) => void;
  onAssign: (id: string) => void;
  onDefer: (id: string) => void;
  onResolve: (id: string) => void;
}

/** NFR-3.1 — above this many rows the table windows rather than mounting all. */
const WINDOW_THRESHOLD = 200;
const WINDOW_SIZE = 120;

export function ActionTable({
  actions, selectedIds, cursorId, canWrite,
  onToggleSelect, onToggleAll, onOpen, onAck, onAssign, onDefer, onResolve,
}: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'priority', dir: 1 });
  const [windowEnd, setWindowEnd] = useState(WINDOW_SIZE);

  const sorted = useMemo(() => {
    if (sort.key === 'priority') return actions;
    const value = (a: DerivedAction): string | number => {
      switch (sort.key) {
        case 'tier': return a.tier;
        case 'title': return a.title.toLowerCase();
        case 'station': return a.stationId;
        case 'state': return a.state;
        case 'age': return a.ageSeconds;
        case 'owner': return a.assignee?.name.toLowerCase() ?? '￿';
        case 'consequence': return a.consequenceLabel ?? '￿';
        default: return 0;
      }
    };
    return [...actions].sort((a, b) => {
      const av = value(a), bv = value(b);
      if (av === bv) return 0;
      return (av < bv ? -1 : 1) * sort.dir;
    });
  }, [actions, sort]);

  const windowed = sorted.length > WINDOW_THRESHOLD ? sorted.slice(0, windowEnd) : sorted;
  const allSelected = actions.length > 0 && actions.every((a) => selectedIds.has(a.id));

  if (actions.length === 0) {
    return (
      <EmptyState reason="No actions match these filters. Clear a tier or state filter, or widen the station scope to All — a Maitri action can outrank a Bharati one, so scope matters." />
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full min-w-[880px] border-collapse">
        <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--panel)' }}>
          <tr>
            <th className="w-8 pb-2 px-2" style={{ borderBottom: '1px solid var(--line-strong)' }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onToggleAll}
                aria-label="Select all visible actions"
                disabled={!canWrite}
              />
            </th>
            <th className="w-6 pb-2" style={{ borderBottom: '1px solid var(--line-strong)' }}>
              <span className="sr-only">Status</span>
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                className="pb-2 px-2 text-left font-normal"
                style={{ borderBottom: '1px solid var(--line-strong)' }}
              >
                <button
                  type="button"
                  onClick={() => setSort((s) => ({ key: col.key, dir: s.key === col.key && s.dir === 1 ? -1 : 1 }))}
                  className="font-mono text-micro uppercase tracking-label"
                  style={{ color: sort.key === col.key ? 'var(--text-2)' : 'var(--text-4)' }}
                >
                  {col.label}{sort.key === col.key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
                </button>
              </th>
            ))}
            <th className="pb-2 px-2 text-right" style={{ borderBottom: '1px solid var(--line-strong)' }}>
              <span className="font-mono text-micro uppercase tracking-label" style={{ color: 'var(--text-4)' }}>
                Actions
              </span>
            </th>
          </tr>
        </thead>

        <tbody>
          {windowed.map((a) => (
            <tr
              key={a.id}
              onClick={() => onOpen(a.id)}
              className="cursor-pointer hover:bg-[var(--panel-raised)]"
              style={{
                opacity: SYNC_OPACITY[a.syncState],
                backgroundColor: a.id === cursorId ? 'var(--panel-raised)' : undefined,
                outline: a.id === cursorId ? '1px solid var(--ok-soft)' : undefined,
              }}
            >
              <td className="px-2 py-2" style={{ borderBottom: '1px solid var(--line)' }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(a.id)}
                  onChange={() => onToggleSelect(a.id)}
                  aria-label={'Select ' + a.title}
                  disabled={!canWrite}
                />
              </td>
              <td className="py-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <StatusDot status={STATE_DOT[a.state]} size={7} />
              </td>
              <td className="px-2 py-2" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="flex items-center gap-1.5">
                  {a.tier === 'T0' && (
                    <span style={{ width: 8, height: 8, backgroundColor: 'var(--act)', borderRadius: 1 }} aria-hidden />
                  )}
                  <TierChip tier={a.tier} />
                </span>
              </td>
              <td className="px-2 py-2 max-w-[220px]" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="block text-body truncate" style={{ color: 'var(--text)' }}>{a.title}</span>
                <span className="block font-mono text-micro truncate" style={{ color: 'var(--text-4)' }}>
                  {a.zoneCode ? a.zoneCode + ' · ' : ''}{a.assetId ?? a.trigger.metricName}
                </span>
              </td>
              <td className="px-2 py-2 font-mono text-body-sm" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                {STATION_CODE[a.stationId]}
              </td>
              <td className="px-2 py-2 whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)' }}>
                <span className="font-mono text-caption" style={{ color: 'var(--text-2)' }}>
                  {a.state.replace('_', ' ')}
                </span>
                {a.sla.breached && (
                  <span
                    className="ml-1.5 font-mono text-micro px-1 py-0.5 rounded"
                    style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.45)' }}
                    title={`SLA target ${formatDuration(a.sla.targetSeconds)} — over by ${formatDuration(a.sla.elapsedSeconds - a.sla.targetSeconds)}`}
                  >
                    SLA +{formatDuration(a.sla.elapsedSeconds - a.sla.targetSeconds)}
                  </span>
                )}
              </td>
              <td className="px-2 py-2 font-mono text-body-sm tabular-nums min-w-[88px]" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                <span className="whitespace-nowrap">{formatDuration(a.ageSeconds)}</span>
                {a.syncState !== 'LIVE' && (
                  <span className="block text-micro" style={{ color: 'var(--text-4)' }}>as of last sync</span>
                )}
              </td>
              <td className="px-2 py-2 text-body-sm whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)', color: 'var(--text-3)' }}>
                {a.assignee?.name ?? '—'}
              </td>
              <td className="px-2 py-2 min-w-[132px]" style={{ borderBottom: '1px solid var(--line)' }}>
                {a.consequenceLabel ? (
                  <span
                    className="font-mono text-caption"
                    style={{ color: a.consequence?.kind === 'safety' ? 'var(--act-soft)' : 'var(--watch-soft)' }}
                  >
                    {a.consequenceLabel}
                  </span>
                ) : (
                  <span className="font-mono text-caption" style={{ color: 'var(--text-4)' }} title="The coupling engine produces no consequence for this trigger">
                    none modelled
                  </span>
                )}
              </td>
              <td className="px-2 py-2 text-right whitespace-nowrap" style={{ borderBottom: '1px solid var(--line)' }} onClick={(e) => e.stopPropagation()}>
                <RowActions
                  action={a}
                  canWrite={canWrite}
                  onAck={onAck}
                  onAssign={onAssign}
                  onDefer={onDefer}
                  onResolve={onResolve}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {sorted.length > windowed.length && (
        <div className="py-3 text-center">
          <button
            type="button"
            onClick={() => setWindowEnd((e) => e + WINDOW_SIZE)}
            className="text-body-sm font-medium px-3 py-1.5 rounded-full"
            style={{ border: '1px solid var(--line)', color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
          >
            Show {Math.min(WINDOW_SIZE, sorted.length - windowed.length)} more ·{' '}
            {sorted.length - windowed.length} remaining
          </button>
        </div>
      )}
    </div>
  );
}

function RowActions({
  action, canWrite, onAck, onAssign, onDefer, onResolve,
}: {
  action: DerivedAction; canWrite: boolean;
  onAck: (id: string) => void; onAssign: (id: string) => void;
  onDefer: (id: string) => void; onResolve: (id: string) => void;
}) {
  const btn = (label: string, fn: () => void, enabled: boolean, primary = false) => (
    <button
      key={label}
      type="button"
      onClick={fn}
      disabled={!enabled || !canWrite}
      title={!canWrite ? 'Your role cannot change action state' : undefined}
      className="text-body-sm font-medium px-2.5 py-1 rounded ml-1"
      style={{
        fontFamily: 'var(--font-body)',
        border: `1px solid ${primary ? 'var(--act)' : 'var(--line)'}`,
        color: primary ? 'var(--act-soft)' : 'var(--text-3)',
        opacity: enabled && canWrite ? 1 : 0.35,
        cursor: enabled && canWrite ? 'pointer' : 'not-allowed',
      }}
    >
      {label}
    </button>
  );

  const open = action.state !== 'RESOLVED';
  return (
    <>
      {btn('Acknowledge', () => onAck(action.id), action.state === 'RAISED', action.state === 'RAISED')}
      {btn('Assign', () => onAssign(action.id), open && action.state !== 'RESOLVED')}
      {btn('Defer', () => onDefer(action.id), open && action.state !== 'DEFERRED')}
      {btn('Resolve', () => onResolve(action.id), action.state === 'ASSIGNED' || action.state === 'IN_PROGRESS')}
    </>
  );
}
