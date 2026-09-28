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
      className="flex lg:flex-col gap-1.5 lg:w-[190px] lg:shrink-0 overflow-x-auto lg:overflow-visible"
      aria-label="Tier and state filters"
    >
      {(Object.keys(TIER_META) as Tier[]).map((tier) => {
        const meta = TIER_META[tier];
        const active = tiers.has(tier);
        return (
          <button
            key={tier}
            type="button"
            onClick={() => onToggleTier(tier)}
            aria-pressed={active}
            className="flex items-center gap-2 px-2.5 py-2 text-left shrink-0 min-h-[40px]"
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
                borderRadius: meta.square ? 1 : 999,
              }}
              aria-hidden
            />
            <span className="min-w-0 lg:flex-1">
              <span className="font-mono text-caption tracking-[0.06em] block" style={{ color: 'var(--text)' }}>
                {tier}
              </span>
              <span className="text-caption hidden lg:block truncate" style={{ color: 'var(--text-3)' }}>
                {meta.label}
              </span>
            </span>
            <span className="font-mono text-body tabular-nums ml-2" style={{ color: 'var(--text-2)' }}>
              {counts.byTier[tier]}
            </span>
          </button>
        );
      })}

      <div className="hidden lg:block h-px my-2" style={{ backgroundColor: 'var(--line)' }} />

      <p className="hidden lg:block font-mono text-micro uppercase tracking-label mb-1" style={{ color: 'var(--text-4)' }}>
        State
      </p>

      {STATES.map((state) => {
        const active = states.has(state);
        return (
          <button
            key={state}
            type="button"
            onClick={() => onToggleState(state)}
            aria-pressed={active}
            className="flex items-center gap-2 px-2.5 py-1.5 text-left shrink-0 min-h-[34px]"
            style={{
              backgroundColor: active ? 'var(--panel-raised)' : 'transparent',
              border: `1px solid ${active ? 'var(--line-strong)' : 'transparent'}`,
              borderRadius: 'var(--r-inner)',
            }}
          >
            <span className="font-mono text-caption flex-1" style={{ color: active ? 'var(--text)' : 'var(--text-3)' }}>
              {state.replace('_', ' ')}
            </span>
            <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-3)' }}>
              {counts.byState[state]}
            </span>
          </button>
        );
      })}

      <button
        type="button"
        onClick={onToggleBreach}
        aria-pressed={breachOnly}
        className="flex items-center gap-2 px-2.5 py-2 mt-1 text-left shrink-0 min-h-[40px]"
        style={{
          backgroundColor: breachOnly ? 'rgba(242,107,33,0.12)' : 'transparent',
          border: `1px solid ${breachOnly ? 'var(--act)' : 'var(--line)'}`,
          borderRadius: 'var(--r-inner)',
        }}
      >
        <span className="font-mono text-caption uppercase tracking-[0.06em] flex-1" style={{ color: counts.breaching > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
          SLA breach
        </span>
        <span className="font-mono text-body tabular-nums" style={{ color: counts.breaching > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
          {counts.breaching}
        </span>
      </button>
    </nav>
  );
}

export { TIER_META, STATES };
