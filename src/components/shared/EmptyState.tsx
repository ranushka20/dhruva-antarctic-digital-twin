// OWNER: Dev B
// EmptyState — never a blank panel. Always shows a reason for empty content.
// See FRONTEND.md §7.

import { type ReactNode } from 'react';

interface EmptyStateProps {
  reason: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ reason, icon, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-8 px-4 rounded-xl ${className}`}
      style={{
        backgroundColor: 'var(--panel-raised)',
        border: '1px dashed var(--line-strong)',
      }}
    >
      {icon && (
        <div className="mb-3" style={{ color: 'var(--text-4)' }}>
          {icon}
        </div>
      )}
      <p
        className="text-center text-body max-w-xs"
        style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}
      >
        {reason}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
