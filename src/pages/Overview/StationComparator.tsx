// OWNER: Dev B
// Station comparator — the most important structural decision on Page 1:
// both stations in ONE card, symmetrically. Bharati and Maitri are equals,
// so the comparison station is dimmed, never hidden (FR-3.5).

import { ArrowLeftRight, FileText } from 'lucide-react';
import type { StationSummary } from '@/shared/contracts';
import { useStationScope } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { SYNC_COLOR } from '@/lib/freshness';

interface Props {
  primary: StationSummary;
  compare: StationSummary;
  onBrief: () => void;
}

/** Plain words for the link state; the raw state stays in the tooltip. */
const SYNC_WORD: Record<string, string> = {
  LIVE: 'Live',
  LAGGING: 'Delayed',
  DARK: 'Offline',
};

export function StationComparator({ primary, compare, onBrief }: Props) {
  const swap = useStationScope((s) => s.swap);
  const openCount = primary.openActions.length;

  return (
    <section
      className="p-5"
      style={{
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--r-card)',
      }}
      aria-label="Station comparator"
    >
      <div className="flex items-start justify-between gap-3">
        <StationColumn station={primary} active />
        <button
          type="button"
          onClick={swap}
          className="mt-1.5 w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-colors hover:bg-[var(--panel-alt)]"
          style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
          aria-label={`Make ${compare.name} the primary station`}
          title={`Swap — make ${compare.name} the primary station`}
        >
          <ArrowLeftRight size={16} />
        </button>
        <StationColumn station={compare} active={false} align="right" />
      </div>

      <div className="mt-4" style={{ borderTop: '1px solid var(--line)' }}>
        <SplitStat
          label="Last sync"
          left={formatDuration(primary.sync.ageSeconds)}
          leftColor={SYNC_COLOR[primary.sync.state]}
          leftSub={SYNC_WORD[primary.sync.state] ?? primary.sync.state}
          leftSubTitle={`Link state: ${primary.sync.state}`}
          right={formatDuration(compare.sync.ageSeconds)}
          rightColor={SYNC_COLOR[compare.sync.state]}
          rightSub={SYNC_WORD[compare.sync.state] ?? compare.sync.state}
          rightSubTitle={`Link state: ${compare.sync.state}`}
        />
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <SplitStat
          label="Crew on station"
          left={String(primary.crew)}
          leftColor="var(--text)"
          right={String(compare.crew)}
          rightColor="var(--text-2)"
        />
      </div>
      <div style={{ borderTop: '1px solid var(--line)' }}>
        <SplitStat
          label="Open actions"
          left={String(primary.openActions.length)}
          leftColor="var(--text)"
          right={String(compare.openActions.length)}
          rightColor="var(--text-2)"
        />
      </div>

      <button
        type="button"
        onClick={onBrief}
        className="mt-4 w-full min-h-10 flex items-center justify-center gap-2.5 px-5 text-body font-semibold rounded-full"
        style={{ backgroundColor: 'var(--text)', color: 'var(--bg)' }}
        title={`Handover brief for ${primary.name} — ${openCount} open action${openCount === 1 ? '' : 's'}`}
      >
        <FileText size={16} aria-hidden />
        Station brief
        <span
          className="font-mono text-body-sm tabular-nums px-2 rounded-full"
          style={{ border: '1px solid currentColor' }}
          aria-label={`${openCount} open actions`}
        >
          {openCount}
        </span>
      </button>
    </section>
  );
}

function StationColumn({
  station, active, align = 'left',
}: { station: StationSummary; active: boolean; align?: 'left' | 'right' }) {
  return (
    <div className={`min-w-0 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <p
        className="text-hero font-semibold leading-none"
        style={{ fontFamily: 'var(--font-display)', color: active ? 'var(--text)' : 'var(--text-3)' }}
      >
        {station.code}
      </p>
      <p
        className="text-body font-medium mt-2"
        style={{ color: active ? 'var(--text)' : 'var(--text-2)' }}
      >
        {station.name}
      </p>
      <p className="text-body-sm mt-0.5" style={{ color: 'var(--text-3)' }}>
        {active ? 'Primary' : 'Comparing'}
      </p>
    </div>
  );
}

function SplitStat({
  label, left, leftColor, leftSub, leftSubTitle, right, rightColor, rightSub, rightSubTitle,
}: {
  label: string;
  left: string; leftColor: string; leftSub?: string; leftSubTitle?: string;
  right: string; rightColor: string; rightSub?: string; rightSubTitle?: string;
}) {
  return (
    <div className="py-3">
      <p className="text-body-sm mb-1.5" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <div className="flex">
        <div className="flex-1 min-w-0 flex items-baseline flex-wrap gap-x-2.5">
          <span className="font-mono text-body tabular-nums" style={{ color: leftColor }}>{left}</span>
          {leftSub && (
            <span className="text-body-sm" style={{ color: 'var(--text-3)' }} title={leftSubTitle}>{leftSub}</span>
          )}
        </div>
        <div className="mx-4" style={{ width: 1, backgroundColor: 'var(--line)' }} aria-hidden />
        <div className="flex-1 min-w-0 flex items-baseline flex-wrap gap-x-2.5 justify-end">
          <span className="font-mono text-body tabular-nums" style={{ color: rightColor }}>{right}</span>
          {rightSub && (
            <span className="text-body-sm" style={{ color: 'var(--text-3)' }} title={rightSubTitle}>{rightSub}</span>
          )}
        </div>
      </div>
    </div>
  );
}
