// OWNER: Dev B
// ProvenanceBadge — the trust primitive.
// LIVE / MODELED / SYNTH / SIM badge with hover popover showing derivation info.
// See FRONTEND.md §7.1 for full spec.

import { type Provenance, type Measurement } from '@/shared/contracts';

interface ProvenanceBadgeProps {
  measurement: Measurement;
  className?: string;
}

const BADGE_STYLES: Record<Provenance, { bg: string; border: string; text: string; label: string }> = {
  LIVE: {
    bg: 'rgba(79,174,133,0.12)',
    border: '1px solid var(--ok)',
    text: 'var(--ok-soft)',
    label: 'LIVE',
  },
  MODELED: {
    bg: 'rgba(139,154,148,0.12)',
    border: '1px solid var(--unknown)',
    text: 'var(--text-2)',
    label: 'MODELED',
  },
  SYNTH: {
    bg: 'transparent',
    border: '1px dashed var(--unknown)',
    text: 'var(--text-3)',
    label: 'SYNTH',
  },
  SIM: {
    bg: 'rgba(155,132,196,0.12)',
    border: '1px solid var(--sim)',
    text: 'var(--sim-soft)',
    label: 'SIM',
  },
};

export function ProvenanceBadge({ measurement, className = '' }: ProvenanceBadgeProps) {
  const style = BADGE_STYLES[measurement.provenance] ?? BADGE_STYLES.SYNTH;

  return (
    <span
      className={`inline-flex items-center font-mono text-[8.5px] tracking-[0.06em] px-1.5 py-0.5 rounded ${className}`}
      style={{
        backgroundColor: style.bg,
        border: style.border,
        color: style.text,
      }}
      title={`${style.label} — ${measurement.source ?? 'unknown source'}`}
    >
      {style.label}
    </span>
  );
}
