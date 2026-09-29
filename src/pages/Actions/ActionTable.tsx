// OWNER: Dev B
// Action table — the CONSEQUENCE column is mandatory (FR-3.2) and is what
// separates this from a ticket list. It carries the operational cost of
// inaction, straight from the coupling engine.
//
// Readability layout: each row leads with the full action title (wrapping,
// never truncated) and a spaced meta line for station, status, age, owner and
// location. Only the NEXT sensible step is an inline button; the other
// transitions sit behind "More" and in the drawer (row click).

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import type { Action } from '@/shared/contracts';
import type { DerivedAction } from '@/state/data';
import { TierChip } from '@/components/shared/TierChip';
import { StatusDot } from '@/components/shared/StatusDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { SYNC_OPACITY } from '@/lib/freshness';
import { usePresence } from '@/hooks/usePresence';
import { STATE_HINT, STATE_LABEL, TIER_META } from './TierRail';

export type SortKey = 'priority' | 'tier' | 'title' | 'station' | 'state' | 'age' | 'owner' | 'consequence';

const STATE_DOT: Record<Action['state'], 'ok' | 'watch' | 'warning' | 'unknown'> = {
  RAISED: 'warning', ACKNOWLEDGED: 'watch', ASSIGNED: 'watch',
  IN_PROGRESS: 'watch', RESOLVED: 'ok', DEFERRED: 'unknown',
};

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'priority', label: 'Priority (recommended)' },
  { key: 'tier', label: 'Tier' },
  { key: 'title', label: 'Action title' },
  { key: 'station', label: 'Station' },
  { key: 'state', label: 'Status' },
  { key: 'age', label: 'How long open' },
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

const CELL_BORDER = { borderBottom: '1px solid var(--line)' } as const;

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

  const sortBy = (key: SortKey) =>
    setSort((s) => ({ key, dir: s.key === key && s.dir === 1 ? -1 : 1 }));

  if (actions.length === 0) {
    return (
      <EmptyState reason="No actions match these filters. Clear a tier or state filter, or widen the station scope to All — a Maitri action can outrank a Bharati one, so scope matters." />
    );
  }

  const headerButton = (key: SortKey, label: string) => (
    <button
      type="button"
      onClick={() => sortBy(key)}
      className="inline-flex items-center gap-1.5 text-body-sm font-medium min-h-8"
      style={{ color: sort.key === key ? 'var(--text)' : 'var(--text-3)' }}
      aria-label={`Sort by ${label}`}
    >
      {label}
      {sort.key === key && (sort.dir === 1 ? <ArrowUp size={14} aria-hidden /> : <ArrowDown size={14} aria-hidden />)}
    </button>
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Sort toolbar ---- */}
      <div className="flex items-center gap-x-3 gap-y-2 flex-wrap px-2 pb-3 shrink-0">
        <p className="text-body-sm" style={{ color: 'var(--text-3)' }}>
          <span className="font-mono tabular-nums" style={{ color: 'var(--text)' }}>{actions.length}</span>{' '}
          action{actions.length === 1 ? '' : 's'}
        </p>
        <label className="flex items-center gap-2 ml-auto">
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Sort by</span>
          <span className="relative">
            <select
              value={sort.key}
              onChange={(e) => setSort({ key: e.target.value as SortKey, dir: 1 })}
              className="appearance-none min-h-8 pl-3.5 pr-8 rounded-full text-body-sm outline-none cursor-pointer"
              style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line-strong)', color: 'var(--text)' }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-3)' }}
              aria-hidden
            />
          </span>
        </label>
        {sort.key !== 'priority' && (
          <button
            type="button"
            onClick={() => setSort((s) => ({ ...s, dir: s.dir === 1 ? -1 : 1 }))}
            className="inline-flex items-center gap-1.5 px-3 min-h-8 rounded-full text-body-sm hover:bg-[var(--panel-raised)]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
            aria-label={sort.dir === 1 ? 'Sorted ascending — switch to descending' : 'Sorted descending — switch to ascending'}
          >
            {sort.dir === 1 ? <ArrowUp size={13} aria-hidden /> : <ArrowDown size={13} aria-hidden />}
            {sort.dir === 1 ? 'Ascending' : 'Descending'}
          </button>
        )}
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full min-w-[36rem] border-collapse">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: 'var(--panel)' }}>
            <tr>
              <th className="w-11 pl-4 pr-2 pb-2 text-left align-bottom" style={{ borderBottom: '1px solid var(--line-strong)' }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={onToggleAll}
                  aria-label="Select all visible actions"
                  disabled={!canWrite}
                  className="w-4 h-4 align-middle cursor-pointer"
                  style={{ accentColor: 'var(--text-2)' }}
                />
              </th>
              <th className="pb-2 pr-4 text-left font-normal align-bottom" style={{ borderBottom: '1px solid var(--line-strong)' }}>
                {headerButton('title', 'Action')}
              </th>
              <th className="hidden 2xl:table-cell w-[15rem] pb-2 pr-4 text-left font-normal align-bottom" style={{ borderBottom: '1px solid var(--line-strong)' }}>
                {headerButton('consequence', 'If nobody acts')}
              </th>
              <th className="pb-2 pr-4 text-right font-normal align-bottom" style={{ borderBottom: '1px solid var(--line-strong)' }}>
                <span className="text-body-sm font-medium" style={{ color: 'var(--text-3)' }}>Next step</span>
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
                <td className="pl-4 pr-2 py-3 align-top" style={CELL_BORDER} onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(a.id)}
                    onChange={() => onToggleSelect(a.id)}
                    aria-label={'Select ' + a.title}
                    disabled={!canWrite}
                    className="w-4 h-4 mt-1 cursor-pointer"
                    style={{ accentColor: 'var(--text-2)' }}
                  />
                </td>

                <td className="py-3 pr-4 align-top" style={CELL_BORDER}>
                  <div className="flex items-start gap-3">
                    <span
                      className="flex items-center gap-1.5 shrink-0 mt-0.5"
                      title={`${a.tier} — ${TIER_META[a.tier].label}`}
                    >
                      {a.tier === 'T0' && (
                        <span style={{ width: 9, height: 9, backgroundColor: 'var(--act)', borderRadius: 2 }} aria-hidden />
                      )}
                      <TierChip tier={a.tier} />
                    </span>

                    <div className="flex-1 min-w-0">
                      <p
                        className="text-body font-medium line-clamp-2 max-w-[70ch]"
                        style={{ color: 'var(--text)' }}
                        title={a.title}
                      >
                        {a.title}
                      </p>

                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap mt-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-medium"
                          style={{ backgroundColor: 'var(--panel-alt)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                          title={STATION_CODE[a.stationId]}
                        >
                          {STATION_LABEL[a.stationId]}
                        </span>

                        <span className="inline-flex items-center gap-2" title={`${STATE_HINT[a.state]} (${a.state})`}>
                          <StatusDot status={STATE_DOT[a.state]} size={8} />
                          <span style={{ color: 'var(--text-2)' }}>{STATE_LABEL[a.state]}</span>
                        </span>

                        {a.sla.breached && (
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-medium"
                            style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.45)' }}
                            title={`SLA target ${formatDuration(a.sla.targetSeconds)} — over by ${formatDuration(a.sla.elapsedSeconds - a.sla.targetSeconds)}`}
                          >
                            Overdue by&nbsp;<span className="font-mono tabular-nums">{formatDuration(a.sla.elapsedSeconds - a.sla.targetSeconds)}</span>
                          </span>
                        )}

                        <span>
                          Open{' '}
                          <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
                            {formatDuration(a.ageSeconds)}
                          </span>
                          {a.syncState !== 'LIVE' && <span> (as of last sync)</span>}
                        </span>

                        <span>
                          {a.assignee ? (
                            <>Owner <span style={{ color: 'var(--text-2)' }}>{a.assignee.name}</span></>
                          ) : (
                            'No owner yet'
                          )}
                        </span>

                        {(a.zoneCode || a.assetId || a.trigger.metricName) && (
                          <span className="inline-flex items-center gap-2 min-w-0" title="Zone and asset (or the metric that raised it)" style={{ color: 'var(--text-3)' }}>
                            {a.zoneCode && <span className="font-mono">{a.zoneCode}</span>}
                            {a.assetId ? (
                              <span className="font-mono">{a.assetId}</span>
                            ) : (
                              <span>{a.trigger.metricName}</span>
                            )}
                          </span>
                        )}

                        {/* Consequence joins the meta line below 2xl, where it has no column. */}
                        <span className="2xl:hidden">
                          <Consequence action={a} inline />
                        </span>
                      </div>
                    </div>
                  </div>
                </td>

                <td className="hidden 2xl:table-cell py-3 pr-4 align-top" style={CELL_BORDER}>
                  <Consequence action={a} />
                </td>

                <td className="py-3 pr-4 align-top text-right whitespace-nowrap" style={CELL_BORDER} onClick={(e) => e.stopPropagation()}>
                  <RowActions
                    action={a}
                    canWrite={canWrite}
                    onOpen={onOpen}
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
          <div className="py-4 text-center">
            <button
              type="button"
              onClick={() => setWindowEnd((e) => e + WINDOW_SIZE)}
              className="text-body-sm font-medium px-4 min-h-9 rounded-full hover:bg-[var(--panel-raised)]"
              style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
            >
              Show <span className="font-mono tabular-nums">{Math.min(WINDOW_SIZE, sorted.length - windowed.length)}</span> more
              <span className="mx-2" aria-hidden>—</span>
              <span className="font-mono tabular-nums">{sorted.length - windowed.length}</span> remaining
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Consequence({ action: a, inline = false }: { action: DerivedAction; inline?: boolean }) {
  if (a.consequenceLabel) {
    return (
      <span className={inline ? 'inline-flex items-baseline gap-2 flex-wrap' : 'block'}>
        {inline && <span style={{ color: 'var(--text-3)' }}>If nobody acts:</span>}
        <span
          className="font-mono text-body-sm"
          style={{ color: a.consequence?.kind === 'safety' ? 'var(--act-soft)' : 'var(--watch-soft)' }}
        >
          {a.consequenceLabel}
        </span>
      </span>
    );
  }
  return (
    <span
      className="text-body-sm"
      style={{ color: 'var(--text-3)' }}
      title="The coupling engine produces no consequence for this trigger"
    >
      {inline ? 'If nobody acts: no consequence modelled' : 'No consequence modelled'}
    </span>
  );
}

type Step = { label: string; run: () => void; enabled: boolean };

function RowActions({
  action, canWrite, onOpen, onAck, onAssign, onDefer, onResolve,
}: {
  action: DerivedAction; canWrite: boolean;
  onOpen: (id: string) => void;
  onAck: (id: string) => void; onAssign: (id: string) => void;
  onDefer: (id: string) => void; onResolve: (id: string) => void;
}) {
  const open = action.state !== 'RESOLVED';
  // Same enablement rules as before the redesign — only the presentation changed.
  const steps: Record<'ack' | 'assign' | 'defer' | 'resolve', Step> = {
    ack: { label: 'Acknowledge', run: () => onAck(action.id), enabled: action.state === 'RAISED' },
    assign: { label: 'Assign', run: () => onAssign(action.id), enabled: open },
    defer: { label: 'Defer', run: () => onDefer(action.id), enabled: open && action.state !== 'DEFERRED' },
    resolve: { label: 'Resolve', run: () => onResolve(action.id), enabled: action.state === 'ASSIGNED' || action.state === 'IN_PROGRESS' },
  };

  // The one inline step: what this action most plausibly needs next.
  const primaryKey: keyof typeof steps | null =
    action.state === 'RAISED' ? 'ack'
    : action.state === 'ACKNOWLEDGED' || action.state === 'DEFERRED' ? 'assign'
    : action.state === 'ASSIGNED' || action.state === 'IN_PROGRESS' ? 'resolve'
    : null;
  const primary = primaryKey ? steps[primaryKey] : null;
  const rest = (Object.keys(steps) as (keyof typeof steps)[])
    .filter((k) => k !== primaryKey && steps[k].enabled)
    .map((k) => steps[k]);

  // Orange only when the action is waiting on a human: unacknowledged.
  const urgent = primaryKey === 'ack';
  const noWrite = 'Your role cannot change action state';

  return (
    <div className="inline-flex items-center gap-2">
      {primary ? (
        <button
          type="button"
          onClick={primary.run}
          disabled={!primary.enabled || !canWrite}
          title={!canWrite ? noWrite : undefined}
          className={`px-4 min-h-9 rounded-full text-body-sm font-medium ${urgent ? '' : 'hover:bg-[var(--panel-alt)]'}`}
          style={{
            fontFamily: 'var(--font-body)',
            border: `1px solid ${urgent ? 'var(--act)' : 'var(--line-strong)'}`,
            backgroundColor: urgent ? 'rgba(242,107,33,0.10)' : 'transparent',
            color: urgent ? 'var(--act-soft)' : 'var(--text)',
            opacity: primary.enabled && canWrite ? 1 : 0.4,
            cursor: primary.enabled && canWrite ? 'pointer' : 'not-allowed',
          }}
        >
          {primary.label}
        </button>
      ) : (
        <span className="text-body-sm px-2" style={{ color: 'var(--text-3)' }}>Closed</span>
      )}

      <MoreMenu
        title={action.title}
        items={rest}
        canWrite={canWrite}
        noWrite={noWrite}
        onOpenDetails={() => onOpen(action.id)}
      />
    </div>
  );
}

function MoreMenu({
  title, items, canWrite, noWrite, onOpenDetails,
}: {
  title: string; items: Step[]; canWrite: boolean; noWrite: string; onOpenDetails: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const presence = usePresence(open, 120);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (fn: () => void) => { setOpen(false); fn(); };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More options for ${title}`}
        title="More options"
        className="inline-flex items-center justify-center gap-1.5 px-3 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
        style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
      >
        <MoreHorizontal size={16} aria-hidden />
        <span className="hidden xl:inline">More</span>
      </button>

      {presence.mounted && (
        <div
          role="menu"
          data-state={presence.state}
          className="m-pop absolute right-0 top-full mt-2 z-30 w-56 p-1.5 text-left whitespace-normal"
          style={{
            backgroundColor: 'var(--panel-alt)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-inner)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.40)',
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              onClick={() => choose(item.run)}
              disabled={!canWrite}
              title={!canWrite ? noWrite : undefined}
              className="w-full text-left px-3.5 min-h-9 rounded-md text-body-sm hover:bg-[var(--panel-raised)]"
              style={{
                color: 'var(--text)',
                opacity: canWrite ? 1 : 0.4,
                cursor: canWrite ? 'pointer' : 'not-allowed',
              }}
            >
              {item.label}…
            </button>
          ))}
          {items.length > 0 && <div className="h-px my-1.5" style={{ backgroundColor: 'var(--line)' }} />}
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onOpenDetails)}
            className="w-full text-left px-3.5 min-h-9 rounded-md text-body-sm hover:bg-[var(--panel-raised)]"
            style={{ color: 'var(--text-2)' }}
          >
            Open full details
          </button>
        </div>
      )}
    </div>
  );
}
