// OWNER: Dev B
// Needs attention — the top-left region, the position the eye reads first.
// Actions come first, readings second (Page 1, "critical design principle").

import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { DerivedAction } from '@/state/data';
import { TierChip } from '@/components/shared/TierChip';
import { StatusDot } from '@/components/shared/StatusDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { useActionTransitions } from '@/shared/contracts';
import { currentActor } from '@/state/auth';

interface Props {
  actions: DerivedAction[];
  deferred: number;
  resolved: number;
}

const STATE_DOT: Record<string, 'ok' | 'watch' | 'warning' | 'unknown'> = {
  RAISED: 'warning',
  ACKNOWLEDGED: 'watch',
  ASSIGNED: 'watch',
  IN_PROGRESS: 'watch',
  RESOLVED: 'ok',
  DEFERRED: 'unknown',
};

/** Plain words for the lifecycle state; the raw state stays in the tooltip. */
const STATE_WORD: Record<string, string> = {
  RAISED: 'New',
  ACKNOWLEDGED: 'Acknowledged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  DEFERRED: 'Deferred',
};

export function NeedsAttention({ actions, deferred, resolved }: Props) {
  const top = actions.slice(0, 3);

  return (
    <section
      // w-full + min-w-0 so the card fills its flex track rather than shrinking
      // to the width of its widest row.
      className="flex flex-col min-h-0 w-full min-w-0 p-5"
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-card)',
      }}
      aria-label="Needs attention"
    >
      <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-4">
        <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
          Needs attention
        </h2>
        <Link
          to="/actions"
          className="ml-auto inline-flex items-center min-h-9 px-4 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
          style={{ color: 'var(--text-2)', border: '1px solid var(--line-strong)', fontFamily: 'var(--font-body)' }}
        >
          View all →
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-3">
        {top.length === 0 ? (
          <EmptyState reason="No open actions on either station. Anything raised by the rule engine or the station console appears here first." />
        ) : (
          top.map((action) => <AttentionCard key={action.id} action={action} />)
        )}
      </div>

      <div
        className="flex items-center flex-wrap gap-x-5 gap-y-2 mt-4 pt-3.5 text-body-sm"
        style={{ borderTop: '1px solid var(--line)', color: 'var(--text-3)' }}
      >
        <span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{deferred}</span> deferred
        </span>
        <span>
          <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{resolved}</span> resolved
        </span>
        <Link
          to="/compliance?tab=audit"
          className="ml-auto inline-flex items-center min-h-9 px-2 font-medium hover:underline"
          style={{ color: 'var(--text-2)', fontFamily: 'var(--font-body)' }}
        >
          Full log →
        </Link>
      </div>
    </section>
  );
}

function AttentionCard({ action }: { action: DerivedAction }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const actor = currentActor();
  const transitions = useActionTransitions('hq', { name: actor.name, role: actor.role });

  const urgentUnacked = (action.tier === 'T0' || action.tier === 'T1') && action.isUnacked;
  const acked = !action.isUnacked;

  const onAck = async () => {
    setBusy(true);
    setError(null);
    try {
      await transitions.acknowledge(action.id, actor.name);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Acknowledge failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article
      className="p-4"
      style={{
        backgroundColor: 'var(--panel-raised)',
        borderRadius: 'var(--r-inner)',
        border: `1px solid ${urgentUnacked ? 'rgba(242,107,33,0.30)' : 'var(--line)'}`,
      }}
    >
      <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mb-2.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
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
        <span className="ml-auto flex items-center gap-2" title={`State: ${action.state}`}>
          <StatusDot status={STATE_DOT[action.state] ?? 'unknown'} size={9} />
          <span style={{ color: 'var(--text-2)' }}>{STATE_WORD[action.state] ?? action.state}</span>
        </span>
      </div>

      <Link to={'/actions/' + action.id} className="block hover:underline underline-offset-4">
        <p className="text-body font-medium leading-snug mb-1" style={{ color: 'var(--text)' }}>
          {action.title}
        </p>
      </Link>

      <p className="text-body-sm max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        {action.consequenceLabel ?? action.reason}
      </p>
      {action.assignee && (
        <p className="text-body-sm mt-1" style={{ color: 'var(--text-3)' }}>
          Assigned to <span style={{ color: 'var(--text-2)' }}>{action.assignee.name}</span>
        </p>
      )}

      {error && (
        <p className="text-body-sm mt-2" role="alert" style={{ color: 'var(--act-soft)' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={onAck}
        disabled={acked || busy}
        title={acked ? 'Already acknowledged — the timeline records who and when' : 'Acknowledge this action'}
        className="mt-3.5 px-4 rounded-full text-body-sm font-semibold min-h-9"
        style={{
          backgroundColor: acked ? 'transparent' : 'var(--act)',
          color: acked ? 'var(--text-3)' : 'var(--bg)',
          border: acked ? '1px solid var(--line)' : 'none',
          cursor: acked ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {acked ? 'Acknowledged' : busy ? 'Recording…' : 'Acknowledge'}
      </button>
    </article>
  );
}
