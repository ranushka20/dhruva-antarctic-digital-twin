// OWNER: Dev B
// TierChip — T0–T3 priority chip. Colour encodes operational tier.

import { type Tier } from '@/shared/contracts';

interface TierChipProps {
  tier: Tier;
  className?: string;
}

const TIER_STYLES: Record<Tier, { bg: string; text: string }> = {
  T0: { bg: 'rgba(242,107,33,0.18)', text: 'var(--act-soft)' },
  T1: { bg: 'rgba(242,107,33,0.12)', text: 'var(--act-soft)' },
  T2: { bg: 'rgba(217,164,65,0.12)', text: 'var(--watch-soft)' },
  T3: { bg: 'rgba(139,154,148,0.12)', text: 'var(--text-3)' },
};

export function TierChip({ tier, className = '' }: TierChipProps) {
  const style = TIER_STYLES[tier];

  return (
    <span
      className={`inline-flex items-center font-mono text-micro tracking-[0.06em] font-medium px-1.5 py-0.5 rounded ${className}`}
      style={{
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {tier}
    </span>
  );
}
