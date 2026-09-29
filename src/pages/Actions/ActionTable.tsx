// OWNER: Dev B
// Action table — the CONSEQUENCE column is mandatory (FR-3.2) and is what
// separates this from a ticket list. It carries the operational cost of
// inaction, straight from the coupling engine.
//
// The list is split by station — a Bharati section and a Maitri section, each
// with its own heading, count, contact state and "Raise action" — because
// every action belongs to one station's crew. Inside a section each row is the
// title, one meta line (age, where it stands) and the cost of inaction. Only the NEXT step is an inline
// button, from the shared ActionSteps; the other legal moves sit behind the
// "…" menu and in the drawer (row click). Zone, asset and trigger detail live
// in the drawer, not here.

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, MoreHorizontal, Plus } from 'lucide-react';
import { canTransition } from '@/shared/contracts';
import type { DerivedAction } from '@/state/data';
import { TierChip } from '@/components/shared/TierChip';
import { STEPS, StepBars, consequenceText, describeStanding, nextStep } from '@/components/shared/ActionSteps';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { SYNC_OPACITY } from '@/lib/freshness';
import { usePresence } from '@/hooks/usePresence';
import { STATE_HINT, TIER_META } from './TierRail';

export type SortKey = 'priority' | 'tier' | 'title' | 'state' | 'age' | 'owner' | 'consequence';

type StationId = DerivedAction['stationId'];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'priority', label: 'Priority (recommended)' },
  { key: 'tier', label: 'Tier' },
  { key: 'title', label: 'Action title' },
  { key: 'state', label: 'Status' },
  { key: 'age', label: 'How long open' },
  { key: 'owner', label: 'Owner' },
  { key: 'consequence', label: 'Consequence' },
];

interface Props {
  actions: DerivedAction[];
  cursorId: string | null;
  canWrite: boolean;
  /** Shown in a station's section when the tab and filters leave it empty. */
  emptyReason: string;
  /** Sections to show, in order — both stations for "All", or just the one in scope. */
  stations: StationId[];
  /** Opens the raise form for one station; omitted when the viewer cannot raise. */
  onRaise?: (stationId: StationId) => void;
  /** The page's filters, placed on the same row as the sort control. */
  toolbar?: ReactNode;
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
  actions, cursorId, canWrite, emptyReason, stations, onRaise, toolbar, onOpen, onAck, onAssign, onDefer, onResolve,
}: Props) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'priority', dir: 1 });
  const [windowEnd, setWindowEnd] = useState(WINDOW_SIZE);

  const sorted = useMemo(() => {
    if (sort.key === 'priority') return actions;
    const value = (a: DerivedAction): string | number => {
      switch (sort.key) {
        case 'tier': return a.tier;
        case 'title': return a.title.toLowerCase();
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- One toolbar row: the page's filters, then sort on the right ---- */}
      <div className="flex items-center gap-x-4 gap-y-2.5 flex-wrap px-2 pb-4 shrink-0">
        {toolbar}
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
        <div className="flex flex-col gap-6">
          {stations.map((stationId) => {
            const rows = windowed.filter((a) => a.stationId === stationId);
            // Every row of a station shares its contact state, so it is said once, here.
            const sync = actions.find((a) => a.stationId === stationId)?.syncState;
            return (
              <section key={stationId} aria-label={`${STATION_LABEL[stationId]} actions`}>
                <div
                  className="flex items-center gap-x-4 gap-y-2 flex-wrap px-3 pb-2.5"
                  style={{ borderBottom: '1px solid var(--line-strong)' }}
                >
                  <h3 className="text-title font-semibold" style={{ color: 'var(--text)' }} title={STATION_CODE[stationId]}>
                    {STATION_LABEL[stationId]}
                  </h3>
                  <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>
                    <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{rows.length}</span>{' '}
                    {rows.length === 1 ? 'action' : 'actions'}
                  </span>
                  {sync && sync !== 'LIVE' && (
                    <span className="text-body-sm" style={{ color: 'var(--watch-soft)' }}>
                      Out of contact — times shown are as of the last sync
                    </span>
                  )}
                  {onRaise && (
                    <button
                      type="button"
                      onClick={() => onRaise(stationId)}
                      disabled={!canWrite}
                      title={canWrite ? `Log a problem at ${STATION_LABEL[stationId]} that no rule has raised` : 'Your role cannot raise actions'}
                      className="ml-auto inline-flex items-center gap-2 px-4 min-h-10 rounded-full text-body-sm font-medium hover:bg-[var(--panel-raised)]"
                      style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)', opacity: canWrite ? 1 : 0.4 }}
                    >
                      <Plus size={16} aria-hidden /> Raise action
                    </button>
                  )}
                </div>

                {rows.length === 0 ? (
                  <p className="px-3 py-4 text-body-sm" style={{ color: 'var(--text-3)' }}>{emptyReason}</p>
                ) : (
                  <ul className="flex flex-col">
                    {rows.map((a) => (
                      <ActionRow
                        key={a.id}
                        action={a}
                        cursor={a.id === cursorId}
                        canWrite={canWrite}
                        onOpen={onOpen}
                        onAck={onAck}
                        onAssign={onAssign}
                        onDefer={onDefer}
                        onResolve={onResolve}
                      />
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

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

function ActionRow({
  action: a, cursor, canWrite, onOpen, onAck, onAssign, onDefer, onResolve,
}: {
  action: DerivedAction; cursor: boolean; canWrite: boolean;
  onOpen: (id: string) => void;
  onAck: (id: string) => void; onAssign: (id: string) => void;
  onDefer: (id: string) => void; onResolve: (id: string) => void;
}) {
  const standing = describeStanding(a);
  const consequence = consequenceText(a);
  const overdueBy = a.sla.elapsedSeconds - a.sla.targetSeconds;
  return (
    <li
      onClick={() => onOpen(a.id)}
      className="flex items-start gap-4 px-3 py-3.5 cursor-pointer rounded-lg hover:bg-[var(--panel-raised)]"
      style={{
        borderBottom: '1px solid var(--line)',
        opacity: SYNC_OPACITY[a.syncState],
        backgroundColor: cursor ? 'var(--panel-raised)' : undefined,
        outline: cursor ? '1px solid var(--ok-soft)' : undefined,
      }}
    >
      <span className="shrink-0 mt-0.5" title={`${a.tier} — ${TIER_META[a.tier].label}`}>
        <TierChip tier={a.tier} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-body font-medium line-clamp-2 max-w-[70ch]" style={{ color: 'var(--text)' }} title={a.title}>
          {a.title}
        </p>

        <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
          <span>
            open{' '}
            <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{formatDuration(a.ageSeconds)}</span>
          </span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-2" title={`${STATE_HINT[a.state]} (${a.state})`}>
            <StepBars action={a} />
            <span style={{ color: a.state === 'RAISED' ? 'var(--act-soft)' : 'var(--text-2)' }}>{standing.now}</span>
          </span>
          {a.sla.breached && (
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-medium"
              style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.45)' }}
              title={`Response target ${formatDuration(a.sla.targetSeconds)} (SLA)`}
            >
              Overdue by&nbsp;<span className="font-mono tabular-nums">{formatDuration(overdueBy)}</span>
            </span>
          )}
        </div>

        {consequence && (
          <p className="text-body-sm mt-1" style={{ color: 'var(--text-3)' }}>
            If nobody acts:{' '}
            <span
              className="font-mono"
              style={{ color: a.consequence?.kind === 'safety' ? 'var(--act-soft)' : 'var(--watch-soft)' }}
            >
              {consequence}
            </span>
          </p>
        )}
      </div>

      <div className="shrink-0 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
        <RowActions
          action={a}
          canWrite={canWrite}
          onOpen={onOpen}
          onAck={onAck}
          onAssign={onAssign}
          onDefer={onDefer}
          onResolve={onResolve}
        />
      </div>
    </li>
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
  // Enablement comes from the state machine itself, so the menu never offers
  // a move it would reject (e.g. re-assigning an ASSIGNED action).
  const legal = (to: Parameters<typeof canTransition>[1]) => canTransition(action.state, to).ok;
  const verb = (key: 'ack' | 'assign' | 'resolve') => STEPS.find((s) => s.key === key)!.verb;
  const steps: Record<'ack' | 'assign' | 'defer' | 'resolve', Step> = {
    ack: { label: verb('ack'), run: () => onAck(action.id), enabled: legal('ACKNOWLEDGED') && action.state === 'RAISED' },
    assign: { label: verb('assign'), run: () => onAssign(action.id), enabled: legal('ASSIGNED') },
    defer: { label: 'Defer', run: () => onDefer(action.id), enabled: legal('DEFERRED') },
    resolve: { label: verb('resolve'), run: () => onResolve(action.id), enabled: legal('RESOLVED') },
  };

  // The one inline step — the same next step the drawer and Overview show.
  const primaryKey = nextStep(action.state);
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
        <span className="text-body-sm px-2" style={{ color: 'var(--text-3)' }}>Resolved</span>
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
        className="inline-flex items-center justify-center w-9 min-h-9 rounded-full hover:bg-[var(--panel-alt)]"
        style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
      >
        <MoreHorizontal size={16} aria-hidden />
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
