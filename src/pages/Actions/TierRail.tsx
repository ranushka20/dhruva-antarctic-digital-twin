// OWNER: Dev B
// Tier filter — live open counts per tier, as one row of toggle chips.
// T0 is distinguished from T1 by a FILLED SQUARE marker, not only by colour
// (FR-2.3): the screen has to survive a bad projector and a colour-blind
// viewer, so tier is never carried by hue alone.

import type { Action, Tier } from '@/shared/contracts';
import type { ActionCounts } from '@/state/data';

const TIER_META: Record<Tier, { label: string; color: string; square: boolean }> = {
  T0: { label: 'Life safety / medical', color: 'var(--act)', square: true },
  T1: { label: 'Critical ops / power / fuel', color: 'var(--act-soft)', square: false },
  T2: { label: 'Logistics / compliance / records', color: 'var(--watch-soft)', square: false },
  T3: { label: 'Bulk science', color: 'var(--text-3)', square: false },
};

const STATES: Action['state'][] = [
  'RAISED', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'DEFERRED',
];

/** Plain-language state names. The raw state code stays available in `title`. */
const STATE_LABEL: Record<Action['state'], string> = {
  RAISED: 'Raised',
  ACKNOWLEDGED: 'Acknowledged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  DEFERRED: 'Deferred',
};

const STATE_HINT: Record<Action['state'], string> = {
  RAISED: 'New — nobody has acknowledged it yet',
  ACKNOWLEDGED: 'Seen by someone, not yet given an owner',
  ASSIGNED: 'Has a named owner',
  IN_PROGRESS: 'Work has started',
  RESOLVED: 'Closed with a resolution note',
  DEFERRED: 'Postponed with a reason and a review date',
};

interface Props {
  counts: ActionCounts;
  tiers: Set<Tier>;
  onToggleTier: (tier: Tier) => void;
}

/** Short names for the chip row; the full label stays in the tooltip. */
const TIER_SHORT: Record<Tier, string> = {
  T0: 'Life safety',
  T1: 'Critical ops',
  T2: 'Logistics',
  T3: 'Science',
};

/** Priority tier filter — one compact row of toggle chips with open counts. */
export function TierFilter({ counts, tiers, onToggleTier }: Props) {
  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Priority tier filter">
      <span className="text-body-sm mr-1" style={{ color: 'var(--text-3)' }}>Priority</span>
      {(Object.keys(TIER_META) as Tier[]).map((tier) => {
        const meta = TIER_META[tier];
        const active = tiers.has(tier);
        return (
          <button
            key={tier}
            type="button"
            onClick={() => onToggleTier(tier)}
            aria-pressed={active}
            title={`${tier} — ${meta.label}`}
            className="inline-flex items-center gap-2 px-3 min-h-9 rounded-full text-body-sm hover:bg-[var(--panel-raised)]"
            style={{
              backgroundColor: active ? 'var(--panel-raised)' : 'transparent',
              border: `1px solid ${active ? meta.color : 'var(--line)'}`,
              // An empty tier stays clickable but recedes, so the eye goes to tiers with work.
              opacity: counts.byTier[tier] === 0 && !active ? 0.5 : 1,
            }}
          >
            <span
              className="shrink-0"
              style={{ width: 8, height: 8, backgroundColor: meta.color, borderRadius: meta.square ? 2 : 999 }}
              aria-hidden
            />
            <span className="font-mono font-medium" style={{ color: 'var(--text)' }}>{tier}</span>
            <span className="hidden xl:inline" style={{ color: 'var(--text-3)' }}>{TIER_SHORT[tier]}</span>
            <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{counts.byTier[tier]}</span>
          </button>
        );
      })}
    </div>
  );
}

export { TIER_META, STATES, STATE_LABEL, STATE_HINT };
