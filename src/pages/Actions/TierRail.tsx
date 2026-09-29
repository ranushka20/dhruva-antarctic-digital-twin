// OWNER: Dev B
// Tier rail — live counts per tier plus the state and SLA filters.
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
  states: Set<Action['state']>;
  breachOnly: boolean;
  onToggleTier: (tier: Tier) => void;
  onToggleState: (state: Action['state']) => void;
  onToggleBreach: () => void;
}

export function TierRail({
  counts, tiers, states, breachOnly, onToggleTier, onToggleState, onToggleBreach,
}: Props) {
  return (
    <nav
      className="flex lg:flex-col gap-1.5 lg:w-[17rem] lg:shrink-0 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto pb-1 lg:pb-0 lg:pr-1"
      aria-label="Tier and state filters"
    >
      <p className="hidden lg:block text-body-sm font-medium mb-1 px-1" style={{ color: 'var(--text-3)' }}>
        Priority tier
      </p>

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
            className="flex items-center gap-2.5 px-3 py-2 text-left shrink-0 min-h-10 hover:bg-[var(--panel-raised)]"
            style={{
              backgroundColor: active ? 'var(--panel-raised)' : 'transparent',
              border: `1px solid ${active ? meta.color : 'var(--line)'}`,
              borderRadius: 'var(--r-inner)',
            }}
          >
            <span
              className="shrink-0"
              style={{
                width: 9, height: 9,
                backgroundColor: meta.color,
                borderRadius: meta.square ? 2 : 999,
              }}
              aria-hidden
            />
            <span className="font-mono text-body-sm font-medium shrink-0" style={{ color: 'var(--text)' }}>
              {tier}
            </span>
            <span className="text-body-sm hidden lg:block flex-1 min-w-0 leading-snug" style={{ color: 'var(--text-3)' }}>
              {meta.label}
            </span>
            <span className="font-mono text-body-sm tabular-nums ml-1 shrink-0" style={{ color: 'var(--text-2)' }}>
              {counts.byTier[tier]}
            </span>
          </button>
        );
      })}

      <div className="hidden lg:block h-px my-2.5" style={{ backgroundColor: 'var(--line)' }} />

      <p className="hidden lg:block text-body-sm font-medium mb-1 px-1" style={{ color: 'var(--text-3)' }}>
        Status
      </p>

      <div className="flex lg:flex-wrap gap-1.5 shrink-0">
        {STATES.map((state) => {
          const active = states.has(state);
          return (
            <button
              key={state}
              type="button"
              onClick={() => onToggleState(state)}
              aria-pressed={active}
              title={`${STATE_HINT[state]} (${state})`}
              className="inline-flex items-center gap-1.5 px-3 min-h-8 rounded-full text-body-sm shrink-0 hover:bg-[var(--panel-raised)]"
              style={{
                backgroundColor: active ? 'var(--panel-raised)' : 'transparent',
                border: `1px solid ${active ? 'var(--text-3)' : 'var(--line)'}`,
                color: active ? 'var(--text)' : 'var(--text-2)',
              }}
            >
              {STATE_LABEL[state]}
              <span className="font-mono tabular-nums" style={{ color: 'var(--text-3)' }}>
                {counts.byState[state]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="hidden lg:block h-px my-2.5" style={{ backgroundColor: 'var(--line)' }} />

      <button
        type="button"
        onClick={onToggleBreach}
        aria-pressed={breachOnly}
        title="Only show actions past their response-time target (SLA breach)"
        className="flex items-center gap-2.5 px-3 py-2 text-left shrink-0 min-h-10"
        style={{
          backgroundColor: breachOnly ? 'rgba(242,107,33,0.12)' : 'transparent',
          border: `1px solid ${breachOnly ? 'var(--act)' : 'var(--line)'}`,
          borderRadius: 'var(--r-inner)',
        }}
      >
        <span className="text-body-sm font-medium flex-1" style={{ color: counts.breaching > 0 ? 'var(--act-soft)' : 'var(--text-2)' }}>
          Overdue only
        </span>
        <span className="font-mono text-body-sm tabular-nums" style={{ color: counts.breaching > 0 ? 'var(--act-soft)' : 'var(--text-2)' }}>
          {counts.breaching}
        </span>
      </button>
    </nav>
  );
}

export { TIER_META, STATES, STATE_LABEL, STATE_HINT };
