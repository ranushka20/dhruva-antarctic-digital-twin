// OWNER: Dev B
// StatusDot — 6–9px semantic status dot. Always accompanied by a text label.
// Status is never colour alone per FRONTEND.md §3.

import { type ZoneStatus } from '@/shared/contracts';

interface StatusDotProps {
  status: ZoneStatus | 'critical';
  size?: number;
  className?: string;
}

const DOT_COLORS: Record<string, string> = {
  ok: 'var(--ok)',
  watch: 'var(--watch)',
  warning: 'var(--act)',
  critical: 'var(--act)',
  unknown: 'var(--unknown)',
};

export function StatusDot({ status, size = 7, className = '' }: StatusDotProps) {
  return (
    <span
      className={`inline-block rounded-full shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: DOT_COLORS[status] ?? DOT_COLORS.unknown,
      }}
      role="img"
      aria-label={`Status: ${status}`}
    />
  );
}
