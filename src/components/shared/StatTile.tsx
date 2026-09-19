// OWNER: Dev B
// StatTile — big-number tile for hero stats.
// Value renders in display font; always carries a provenance badge.

import { type Provenance, type Measurement } from '@/shared/contracts';
import { ProvenanceBadge } from './ProvenanceBadge';

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
      className={`rounded-xl p-3 ${className}`}
      style={{
        backgroundColor: 'var(--panel-raised)',
        border: '1px solid var(--line)',
      }}
    >
      <div className="flex items-center gap-1.5 mb-1.5">
        <span
          className="font-mono text-[9.5px] uppercase tracking-[0.10em]"
          style={{ color: 'var(--text-3)' }}
        >
          {label}
        </span>
        <ProvenanceBadge measurement={measurement} />
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="text-[20px] font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}
        >
          {value ?? '—'}
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>
          {unit}
        </span>
      </div>
    </div>
  );
}
