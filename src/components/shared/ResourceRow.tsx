// OWNER: Dev B
// ResourceRow — resource row with autonomy ± band and LSOD.
// Autonomy ALWAYS renders with uncertainty band. A point estimate is a spec violation.

import { type Resource } from '@/shared/contracts';
import { StatusDot } from './StatusDot';
import { lsodColor } from '@/lib/risk';

interface ResourceRowProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export function ResourceRow({ resource, onClick, className = '' }: ResourceRowProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full text-left py-2 px-3 rounded-lg transition-colors hover:bg-[var(--panel-alt)] ${className}`}
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <StatusDot status={resource.risk === 'critical' ? 'warning' : resource.risk} />

      <span className="flex-1 text-body" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
        {resource.name}
      </span>

      <span className="font-mono text-body tabular-nums" style={{ color: 'var(--text-2)' }}>
        {Math.round(resource.autonomyDays)} ±{Math.round(resource.autonomyBandDays)} d
      </span>

      <span className="font-mono text-body-sm w-16 text-right" style={{ color: lsodColor(resource.lsodDays) }}>
        {resource.lsodDays === null ? 'stale' : `${Math.round(resource.lsodDays)} d`}
      </span>
    </button>
  );
}
