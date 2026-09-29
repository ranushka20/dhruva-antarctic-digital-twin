// OWNER: Dev B
// Needs attention — a FLAG in the Overview title row, not a panel on the page.
// The flag carries the open count (orange while a T0/T1 is unacknowledged);
// opening it shows the top three open actions across both stations (FR-4.2).
// Each item is information only and opens the action in the Action Centre,
// where acknowledge / assign / resolve actually happen — one place to act.

import { Link } from 'react-router-dom';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown, ChevronRight, Flag } from 'lucide-react';
import type { DerivedAction } from '@/state/data';
import { TierChip } from '@/components/shared/TierChip';
import { EmptyState } from '@/components/shared/EmptyState';
import { StepBars, consequenceText, describeStanding } from '@/components/shared/ActionSteps';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { usePresence } from '@/hooks/usePresence';

interface Props {
  /** Open actions, already in priority order. */
  actions: DerivedAction[];
  unacked: number;
}

export function NeedsAttention({ actions, unacked }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const presence = usePresence(open, 120);
  const top = actions.slice(0, 3);
  const urgent = actions.some((a) => a.isUnacked && (a.tier === 'T0' || a.tier === 'T1'));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); buttonRef.current?.focus(); }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex items-center gap-2 px-4 min-h-10 rounded-full text-body-sm font-medium"
        style={{
          backgroundColor: urgent ? 'rgba(242,107,33,0.10)' : 'var(--panel)',
          border: `1px solid ${urgent ? 'var(--act)' : 'var(--line-strong)'}`,
          color: urgent ? 'var(--act-soft)' : 'var(--text-2)',
        }}
        title={urgent ? 'A T0/T1 action has not been acknowledged yet' : 'Open actions across both stations'}
      >
        <Flag size={15} aria-hidden />
        Needs attention
        <span className="font-mono tabular-nums">{actions.length}</span>
        <ChevronDown
          size={15}
          aria-hidden
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined }}
        />
      </button>

      {presence.mounted && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Needs attention"
          data-state={presence.state}
          className="m-pop absolute left-0 top-full mt-2 z-40 w-[26rem] max-w-[calc(100vw-2rem)] p-4 flex flex-col gap-3"
          style={{
            backgroundColor: 'var(--panel)',
            border: '1px solid var(--line-strong)',
            borderRadius: 'var(--r-card)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
          }}
        >
          <div>
            <p className="text-body font-semibold" style={{ color: 'var(--text)' }}>Needs attention</p>
            <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
              <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{actions.length}</span> open
              {' · '}
              <span className="font-mono tabular-nums" style={{ color: unacked > 0 ? 'var(--act-soft)' : 'var(--text-2)' }}>
                {unacked}
              </span>{' '}
              not acknowledged. Open one to act on it.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[60vh] overflow-y-auto">
            {top.length === 0 ? (
              <EmptyState reason="No open actions on either station. Anything raised by the rule engine or the station console shows up here first." />
            ) : (
              top.map((action) => <AttentionCard key={action.id} action={action} />)
            )}
          </div>

          <Link
            to="/actions"
            className="flex items-center justify-center gap-2 min-h-10 rounded-full text-body-sm font-semibold hover:bg-[var(--panel-alt)]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text)' }}
          >
            Open Action Centre
            {actions.length > top.length && (
              <span style={{ color: 'var(--text-3)' }}>
                · <span className="font-mono tabular-nums">{actions.length - top.length}</span> more
              </span>
            )}
            <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}

function AttentionCard({ action }: { action: DerivedAction }) {
  const urgentUnacked = (action.tier === 'T0' || action.tier === 'T1') && action.isUnacked;
  const standing = describeStanding(action);
  const consequence = consequenceText(action);

  return (
    <Link
      to={'/actions/' + action.id}
      className="group block p-4 hover:bg-[var(--panel-alt)]"
      style={{
        backgroundColor: 'var(--panel-raised)',
        borderRadius: 'var(--r-inner)',
        border: `1px solid ${urgentUnacked ? 'rgba(242,107,33,0.30)' : 'var(--line)'}`,
      }}
    >
      <div className="flex items-center flex-wrap gap-x-3 gap-y-1.5 mb-2 text-body-sm" style={{ color: 'var(--text-3)' }}>
        <span title="Priority tier — T0 is the most urgent, T3 the least">
          <TierChip tier={action.tier} />
        </span>
        <span title={STATION_CODE[action.stationId]}>{STATION_LABEL[action.stationId]}</span>
        <span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>
            {formatDuration(action.ageSeconds)}
          </span>{' '}
          ago
        </span>
        <ChevronRight
          size={18}
          className="ml-auto transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--text-3)' }}
          aria-hidden
        />
      </div>

      <p className="text-body font-medium leading-snug" style={{ color: 'var(--text)' }}>
        {action.title}
      </p>
      {consequence ? (
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-3)' }}>
          If nobody acts:{' '}
          <span className="font-mono" style={{ color: 'var(--text-2)' }}>{consequence}</span>
        </p>
      ) : (
        <p className="text-body-sm mt-1 max-w-[70ch] line-clamp-2" style={{ color: 'var(--text-3)' }}>
          {action.reason}
        </p>
      )}

      <div className="flex items-center gap-3 mt-3 pt-3 text-body-sm" style={{ borderTop: '1px solid var(--line)' }}>
        <StepBars action={action} />
        <span className="min-w-0" style={{ color: urgentUnacked ? 'var(--act-soft)' : 'var(--text-2)' }}>
          {standing.now}
          {standing.next && (
            <span style={{ color: 'var(--text-3)' }}> · next: {standing.next.toLowerCase()}</span>
          )}
        </span>
      </div>
    </Link>
  );
}
