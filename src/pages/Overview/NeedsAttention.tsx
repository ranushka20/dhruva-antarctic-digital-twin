// OWNER: Dev B
// Needs attention — the top-left region, the position the eye reads first.
// Actions come first, readings second (Page 1, "critical design principle").

import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { DerivedAction } from '@/state/data';
import { TierChip } from '@/components/shared/TierChip';
import { StatusDot } from '@/components/shared/StatusDot';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE } from '@/state/stationScope';
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

export function NeedsAttention({ actions, deferred, resolved }: Props) {
  const top = actions.slice(0, 3);

  return (
    <section
      className="flex flex-col min-h-0 p-4"
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-card)',
      }}
      aria-label="Needs attention"
    >
      <div className="flex items-center mb-3">
        <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>
          Needs attention
        </h2>
        <Link
          to="/actions"
          className="ml-auto font-mono text-[9.5px] tracking-[0.08em]"
          style={{ color: 'var(--text-3)' }}
        >
          VIEW ALL →
        </Link>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
        {top.length === 0 ? (
          <EmptyState reason="No open actions on either station. Anything raised by the rule engine or the station console appears here first." />
        ) : (
          top.map((action) => <AttentionCard key={action.id} action={action} />)
        )}
      </div>

      <div
        className="flex items-center gap-4 mt-3 pt-2.5 font-mono text-[9.5px] tracking-[0.06em]"
        style={{ borderTop: '1px solid var(--line)', color: 'var(--text-3)' }}
      >
        <span>{deferred} DEFERRED</span>
        <span>{resolved} RESOLVED</span>
        <Link to="/compliance?tab=audit" className="ml-auto" style={{ color: 'var(--text-3)' }}>
          FULL LOG →
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
      className="p-3"
      style={{
        backgroundColor: 'var(--panel-raised)',
        borderRadius: 'var(--r-inner)',
        border: `1px solid ${urgentUnacked ? 'rgba(242,107,33,0.30)' : 'var(--line)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <TierChip tier={action.tier} />
        <span className="font-mono text-[9.5px] tracking-[0.06em]" style={{ color: 'var(--text-3)' }}>
          {STATION_CODE[action.stationId]} · {formatDuration(action.ageSeconds)}
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <StatusDot status={STATE_DOT[action.state] ?? 'unknown'} size={6} />
          <span className="font-mono text-[8.5px]" style={{ color: 'var(--text-3)' }}>
            {action.state}
          </span>
        </span>
      </div>

      <Link to={'/actions/' + action.id} className="block">
        <p className="text-[12.5px] font-medium mb-1" style={{ color: 'var(--text)' }}>
          {action.title}
        </p>
      </Link>

      <p className="text-[11px] mb-2" style={{ color: 'var(--text-3)' }}>
        {action.consequenceLabel ?? action.reason}
        {action.assignee ? ' · ' + action.assignee.name : ''}
      </p>

      {error && (
        <p className="font-mono text-[9.5px] mb-1.5" style={{ color: 'var(--act-soft)' }}>{error}</p>
      )}

      <button
        type="button"
        onClick={onAck}
        disabled={acked || busy}
        title={acked ? 'Already acknowledged — the timeline records who and when' : 'Acknowledge this action'}
        className="px-3 py-1.5 rounded-full text-[11px] font-medium min-h-[32px]"
        style={{
          backgroundColor: acked ? 'transparent' : 'var(--act)',
          color: acked ? 'var(--text-3)' : 'var(--bg)',
          border: acked ? '1px solid var(--line)' : 'none',
          cursor: acked ? 'not-allowed' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {acked ? 'ACKNOWLEDGED' : busy ? 'RECORDING…' : 'ACK'}
      </button>
    </article>
  );
}
