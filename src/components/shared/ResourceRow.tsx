// OWNER: Dev B
// ResourceRow — resource row with autonomy ± band and LSOD.
// Autonomy ALWAYS renders with uncertainty band. A point estimate is a spec violation.

import { type Resource } from '@/shared/contracts';
import { StatusDot } from './StatusDot';

interface ResourceRowProps {
  resource: Resource;
  onClick?: () => void;
  className?: string;
}

export function ResourceRow({ resource, onClick, className = '' }: ResourceRowProps) {
  const lsodColor = resource.lsodDays === null
    ? 'var(--text-3)'
    : resource.lsodDays <= 14
      ? 'var(--act-soft)'
      : resource.lsodDays <= 45
        ? 'var(--watch-soft)'
        : 'var(--text-3)';

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full text-left py-2 px-3 rounded-lg transition-colors hover:bg-[var(--panel-alt)] ${className}`}
      style={{ borderBottom: '1px solid var(--line)' }}
    >
      <StatusDot status={resource.risk === 'critical' ? 'warning' : resource.risk} />

      <span className="flex-1 text-[12.5px]" style={{ color: 'var(--text)', fontFamily: 'var(--font-body)' }}>
        {resource.name}
      </span>

      <span className="font-mono text-[12px] tabular-nums" style={{ color: 'var(--text-2)' }}>
        {Math.round(resource.autonomyDays)} ±{Math.round(resource.autonomyBandDays)} d
      </span>

      <span className="font-mono text-[11px] w-16 text-right" style={{ color: lsodColor }}>
        {resource.lsodDays === null ? 'stale' : `${Math.round(resource.lsodDays)} d`}
      </span>
    </button>
  );
}
