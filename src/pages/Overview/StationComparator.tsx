// OWNER: Dev B
// Station comparator — the most important structural decision on Page 1:
// both stations in ONE card, symmetrically. Bharati and Maitri are equals,
// so the comparison station is dimmed, never hidden (FR-3.5).

import { ArrowLeftRight } from 'lucide-react';
import type { StationSummary } from '@/shared/contracts';
import { useStationScope } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { SYNC_COLOR } from '@/lib/freshness';

interface Props {
  primary: StationSummary;
  compare: StationSummary;
  onBrief: () => void;
}

export function StationComparator({ primary, compare, onBrief }: Props) {
  const swap = useStationScope((s) => s.swap);
  const openCount = primary.openActions.length;

  return (
    <section
      className="p-4"
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-card)',
      }}
      aria-label="Station comparator"
    >
      <div className="flex items-start justify-between gap-2">
        <StationColumn station={primary} active />
        <button
          type="button"
          onClick={swap}
          className="mt-2 w-9 h-9 shrink-0 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
          aria-label={`Make ${compare.name} the primary station`}
        >
          <ArrowLeftRight size={14} />
        </button>
        <StationColumn station={compare} active={false} align="right" />
      </div>

      <div className="mt-4 flex" style={{ borderTop: '1px solid var(--line)' }}>
        <SplitStat
          label="LAST SYNC"
          left={formatDuration(primary.sync.ageSeconds)}
          leftColor={SYNC_COLOR[primary.sync.state]}
          leftSub={primary.sync.state}
          right={formatDuration(compare.sync.ageSeconds)}
          rightColor={SYNC_COLOR[compare.sync.state]}
          rightSub={compare.sync.state}
        />
      </div>
      <div className="flex" style={{ borderTop: '1px solid var(--line)' }}>
        <SplitStat
          label="CREW · OPEN"
          left={`${primary.crew} · ${primary.openActions.length}`}
          leftColor="var(--text)"
          leftSub="on station"
          right={`${compare.crew} · ${compare.openActions.length}`}
          rightColor="var(--text-3)"
          rightSub="on station"
        />
      </div>

      <button
        type="button"
        onClick={onBrief}
        className="mt-4 w-full py-2.5 text-body font-medium rounded-full"
        style={{ backgroundColor: 'var(--text)', color: 'var(--bg)' }}
      >
        Station brief ({openCount})
      </button>
    </section>
  );
}

function StationColumn({
  station, active, align = 'left',
}: { station: StationSummary; active: boolean; align?: 'left' | 'right' }) {
  return (
    <div className={align === 'right' ? 'text-right' : 'text-left'}>
      <p
        className="text-hero font-semibold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: active ? 'var(--text)' : 'var(--text-3)' }}
      >
        {station.code}
      </p>
      <p
        className="text-body-sm mt-1"
        style={{ color: active ? 'var(--text-2)' : 'var(--text-3)' }}
      >
        {station.name}
      </p>
      <p className="font-mono text-micro tracking-label mt-0.5" style={{ color: 'var(--text-4)' }}>
        {active ? 'PRIMARY' : 'COMPARISON'}
      </p>
    </div>
  );
}

function SplitStat({
  label, left, leftColor, leftSub, right, rightColor, rightSub,
}: {
  label: string;
  left: string; leftColor: string; leftSub: string;
  right: string; rightColor: string; rightSub: string;
}) {
  return (
    <div className="flex-1 pt-2.5 pb-1">
      <p className="font-mono text-micro uppercase tracking-label mb-1.5" style={{ color: 'var(--text-4)' }}>
        {label}
      </p>
      <div className="flex">
        <div className="flex-1">
          <p className="font-mono text-body tabular-nums" style={{ color: leftColor }}>{left}</p>
          <p className="font-mono text-micro tracking-[0.06em]" style={{ color: 'var(--text-4)' }}>{leftSub}</p>
        </div>
        <div style={{ width: 1, backgroundColor: 'var(--line)' }} />
        <div className="flex-1 pl-3">
          <p className="font-mono text-body tabular-nums" style={{ color: rightColor }}>{right}</p>
          <p className="font-mono text-micro tracking-[0.06em]" style={{ color: 'var(--text-4)' }}>{rightSub}</p>
        </div>
      </div>
    </div>
  );
}
