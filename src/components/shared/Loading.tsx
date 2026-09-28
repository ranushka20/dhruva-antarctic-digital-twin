// OWNER: Dev B
// Loading primitives — one vocabulary for "waiting" across the app.
//   PixelLoader   3×3 pixel grid with a chevron wavefront + shimmering label
//                 + elapsed timer in mono. For work the operator is waiting on.
//   Skeleton      a placeholder block; all blocks shimmer in sync.
//   PageSkeleton  a generic page silhouette for route-level Suspense.
// All three wait 150ms before appearing, so a fast load never flashes.

import { useEffect, useState, type CSSProperties } from 'react';

// Chevron wavefront: each cell's delay grows with its distance from the
// left-middle, so a ">" shape sweeps right. The 650ms cycle is shorter than
// the sweep, so two fronts are always in flight.
const CHEVRON = Array.from({ length: 9 }, (_, i) => {
  const r = Math.floor(i / 3);
  const c = i % 3;
  return (c + Math.abs(r - 1)) * 90;
});

function useElapsedTenths() {
  const [tenths, setTenths] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTenths((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, []);
  return tenths;
}

export function PixelLoader({ label = 'Loading', showElapsed = true, className = '' }: {
  label?: string;
  showElapsed?: boolean;
  className?: string;
}) {
  const tenths = useElapsedTenths();
  return (
    <div role="status" aria-live="polite" className={`m-delay-show inline-flex items-center gap-2.5 ${className}`}>
      <span aria-hidden className="grid shrink-0 gap-[1.5px]" style={{ gridTemplateColumns: 'repeat(3, 4px)' }}>
        {CHEVRON.map((delay, i) => (
          <span key={i} className="m-pixel" style={{ animation: `m-pixel-on 650ms ease-in-out ${delay}ms infinite` }} />
        ))}
      </span>
      <span className="m-shimmer-text text-body font-medium" style={{ fontFamily: 'var(--font-body)' }}>
        {label}
      </span>
      {showElapsed && (
        <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-4)' }} aria-hidden>
          {(tenths / 10).toFixed(1)}s
        </span>
      )}
    </div>
  );
}

export function Skeleton({ className = '', style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden className={`m-skeleton ${className}`} style={style} />;
}

/** Route-level fallback: header row, a stat strip, two panels. */
export function PageSkeleton({ label = 'Loading page' }: { label?: string }) {
  return (
    <div className="m-delay-show flex flex-col h-full min-h-0" aria-busy="true">
      <div className="flex items-center gap-3 h-[48px] px-5 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-6 w-20 !rounded-full" />
        <div className="flex-1" />
        <PixelLoader label={label} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 px-5 pt-5">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[74px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3.5 p-5 flex-1 min-h-0">
        <Skeleton className="min-h-[260px] !rounded-[var(--r-card)]" />
        <div className="flex flex-col gap-3.5">
          <Skeleton className="h-[120px] !rounded-[var(--r-card)]" />
          <Skeleton className="flex-1 min-h-[120px] !rounded-[var(--r-card)]" />
        </div>
      </div>
    </div>
  );
}

/** Centred loader for a panel or page body that is fetching its own data. */
export function PanelLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-full min-h-[160px] p-5">
      <PixelLoader label={label} />
    </div>
  );
}
