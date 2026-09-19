// OWNER: Dev B
// DegradableSurface — wrapper applying visual degradation by sync state.
// LIVE: 100% opacity, solid borders.
// LAGGING: 62% opacity, dashed borders, stale note.
// DARK: 40% opacity, dashed borders, hatched gap.
// See FRONTEND.md §7.2.

import { type SyncState } from '@/shared/contracts';
import { type ReactNode } from 'react';

interface DegradableSurfaceProps {
  syncState: SyncState;
  children: ReactNode;
  className?: string;
}

const DEGRADATION: Record<SyncState, { opacity: number; borderStyle: string; note?: string }> = {
  LIVE: { opacity: 1, borderStyle: 'solid' },
  LAGGING: { opacity: 0.62, borderStyle: 'dashed', note: 'View may be stale' },
  DARK: { opacity: 0.40, borderStyle: 'dashed', note: 'Station link down — showing last known state' },
};

export function DegradableSurface({ syncState, children, className = '' }: DegradableSurfaceProps) {
  const treatment = DEGRADATION[syncState];

  return (
    <div
      className={`relative ${className}`}
      style={{
        opacity: treatment.opacity,
        borderStyle: treatment.borderStyle,
        transition: 'opacity 300ms ease',
      }}
    >
      {children}
      {treatment.note && (
        <div
          className="absolute bottom-0 left-0 right-0 px-2 py-1 text-center font-mono text-[9px] tracking-[0.06em]"
          style={{
            backgroundColor: 'rgba(10,13,12,0.85)',
            color: 'var(--watch-soft)',
            borderTop: '1px dashed var(--line-strong)',
          }}
        >
          {treatment.note}
        </div>
      )}
    </div>
  );
}
