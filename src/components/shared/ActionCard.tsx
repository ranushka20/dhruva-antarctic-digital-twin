// OWNER: Dev B
// ActionCard — action row used on /, /actions, /station.
// Renders tier chip, station + age, status dot, title, sub-status, ACK button.

import { type Action } from '@/shared/contracts';
import { TierChip } from './TierChip';
import { StatusDot } from './StatusDot';

interface ActionCardProps {
  action: Action;
  variant?: 'compact' | 'full';
  onAcknowledge?: (actionId: string) => void;
  className?: string;
}

function formatAge(seconds: number): string {
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function ActionCard({ action, variant = 'compact', onAcknowledge, className = '' }: ActionCardProps) {
  const isUrgent = (action.tier === 'T0' || action.tier === 'T1') && action.state === 'RAISED';

  return (
    <div
      className={`rounded-lg p-3 ${className}`}
      style={{
        backgroundColor: 'var(--panel-raised)',
        border: `1px solid ${isUrgent ? 'rgba(242,107,33,0.30)' : 'var(--line)'}`,
      }}
    >
      <div className="flex items-center gap-2 mb-1.5">
        <TierChip tier={action.tier} />
        <span className="font-mono text-[9.5px] uppercase tracking-[0.08em]" style={{ color: 'var(--text-3)' }}>
          {action.stationId.toUpperCase()} · {formatAge(action.ageSeconds)}
        </span>
        <span className="ml-auto">
          <StatusDot status={action.state === 'RESOLVED' ? 'ok' : action.state === 'DEFERRED' ? 'watch' : 'warning'} />
        </span>
      </div>

      <p className="text-[12.5px] font-medium mb-1" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
        {action.title}
      </p>

      <p className="text-[11px]" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}>
        {action.state}
        {action.assignee ? ` · ${action.assignee.name}` : ''}
      </p>

      {variant === 'full' && action.state === 'RAISED' && onAcknowledge && (
        <button
          onClick={() => onAcknowledge(action.id)}
          className="mt-2 px-3 py-1 rounded text-[11px] font-medium"
          style={{
            backgroundColor: 'var(--act)',
            color: 'var(--bg)',
            fontFamily: 'var(--font-body)',
          }}
        >
          Acknowledge
        </button>
      )}
    </div>
  );
}
