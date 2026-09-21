// OWNER: Dev B
// MetricRow — label / value / badge row. Every numeric value renders in the
// mono typeface; the badge sits adjacent to the value it describes.

import type { Measurement } from '@/shared/contracts';
import { ProvenanceBadge } from './ProvenanceBadge';
import { formatValue } from '@/lib/provenance';

interface MetricRowProps {
  label: string;
  measurement: Measurement;
  digits?: number;
  tone?: 'default' | 'act' | 'watch' | 'ok';
  className?: string;
}

const TONE: Record<NonNullable<MetricRowProps['tone']>, string> = {
  default: 'var(--text)',
  act: 'var(--act-soft)',
  watch: 'var(--watch-soft)',
  ok: 'var(--ok-soft)',
};

export function MetricRow({ label, measurement, digits = 1, tone = 'default', className = '' }: MetricRowProps) {
  return (
    <div className={'flex items-center gap-2 py-1 ' + className}>
      <span
        className="font-mono text-[9.5px] uppercase tracking-[0.10em] shrink-0"
        style={{ color: 'var(--text-3)' }}
      >
        {label}
      </span>
      <span className="flex-1 border-b border-dotted" style={{ borderColor: 'var(--line)' }} />
      <span className="font-mono text-[12px] tabular-nums" style={{ color: TONE[tone] }}>
        {formatValue(measurement, digits)}
        {measurement.unit ? <span style={{ color: 'var(--text-3)' }}> {measurement.unit}</span> : null}
      </span>
      <ProvenanceBadge measurement={measurement} label={label} />
    </div>
  );
}
