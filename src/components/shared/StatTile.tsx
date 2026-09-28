// OWNER: Dev B
// StatTile — big-number tile for hero stats.
// Value renders in display font; always carries a provenance badge.

import { type Measurement } from '@/shared/contracts';
import { ProvenanceBadge } from './ProvenanceBadge';
import { RollingValue } from './RollingValue';

interface StatTileProps {
  label: string;
  value: string | number | null;
  unit: string;
  measurement: Measurement;
  className?: string;
}

export function StatTile({ label, value, unit, measurement, className = '' }: StatTileProps) {
  return (
    <div
      // min-w-0 is load-bearing: these tiles sit three-across in a 342px rail,
      // so the tile must be allowed to shrink below its content width instead
      // of pushing the badge out past the card edge. overflow-hidden is the
      // backstop for the same reason.
      className={`rounded-xl px-2 py-2.5 min-w-0 overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--panel-raised)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0">
        <span
          className="font-mono text-micro uppercase truncate min-w-0"
          style={{ color: 'var(--text-3)' }}
        >
          {label}
        </span>
        {/* Abbreviated + right-anchored: the full word and the hover card
            would both hang outside a third-of-a-rail tile. */}
        <ProvenanceBadge
          measurement={measurement}
          label={label}
          abbreviated
          align="right"
          className="shrink-0"
        />
      </div>
      <div className="flex items-baseline gap-1 min-w-0">
        <span
          className="text-headline font-semibold truncate"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          <RollingValue value={value} />
        </span>
        <span className="font-mono text-body-sm shrink-0" style={{ color: 'var(--text-3)' }}>
          {unit}
        </span>
      </div>
    </div>
  );
}
