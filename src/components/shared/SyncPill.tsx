// OWNER: Dev B
// SyncPill — shows connectivity state (LIVE / LAGGING / DARK) with age.
// See FRONTEND.md §7.

import { type SyncState } from '@/shared/contracts';

interface SyncPillProps {
  state: SyncState;
  ageSeconds: number;
  className?: string;
}

function formatAge(seconds: number): string {
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

const STATE_STYLES: Record<SyncState, { dotColor: string; borderStyle: string; label: string }> = {
  LIVE: { dotColor: 'var(--ok)', borderStyle: 'solid', label: 'LIVE' },
  LAGGING: { dotColor: 'var(--watch)', borderStyle: 'dashed', label: 'LAGGING' },
  DARK: { dotColor: 'var(--text-3)', borderStyle: 'dashed', label: 'DARK' },
};

export function SyncPill({ state, ageSeconds, className = '' }: SyncPillProps) {
  const style = STATE_STYLES[state];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono text-[9.5px] tracking-[0.06em] px-2 py-1 rounded-full ${className}`}
      style={{
        border: `1px ${style.borderStyle} var(--line-strong)`,
        color: 'var(--text-2)',
        backgroundColor: 'var(--panel-raised)',
      }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: style.dotColor }}
      />
      {style.label}
      <span style={{ color: 'var(--text-3)' }}>·</span>
      <span style={{ color: 'var(--text-3)' }}>{formatAge(ageSeconds)}</span>
    </span>
  );
}
