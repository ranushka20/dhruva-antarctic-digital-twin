// OWNER: Dev B
// "What we missed" — the station's event log for a dark period, rebuilt from
// the records that have since drained, in STATION-timestamp order.
//
// The distinction this panel exists to make (FR-3.3): "the station reported
// nothing in this window" is a different claim from "we have no data". One
// means the station was quiet; the other means we are blind. Conflating them
// is how an operator ends up trusting a gap.

import { Link } from 'react-router-dom';
import type { MissedWindow } from '@/state/sync';
import { missedSummary } from '@/state/sync';
import { TierChip } from '@/components/shared/TierChip';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatShortIST, formatDuration, clockSkewSeconds } from '@/lib/time';

export function MissedLog({ windows }: { windows: MissedWindow[] }) {
  const summary = missedSummary(windows);

  return (
    <section
      className="flex flex-col min-h-0 p-4"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="What we missed"
    >
      <div className="flex items-baseline gap-2 mb-1">
        <h2 className="text-[13.5px] font-semibold" style={{ color: 'var(--text)' }}>What we missed</h2>
      </div>

      <p className="font-mono text-[10px] mb-3" style={{ color: 'var(--text-3)' }}>
        {summary.records} record{summary.records === 1 ? '' : 's'} recovered across{' '}
        {formatDuration(summary.gapSeconds)} of gap · {summary.actions} action
        {summary.actions === 1 ? '' : 's'} · {summary.faults} fault
        {summary.faults === 1 ? '' : 's'} · {summary.inventory} inventory change
        {summary.inventory === 1 ? '' : 's'}
      </p>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-3">
        {windows.length === 0 ? (
          <EmptyState reason="No gaps in this window — the link has been continuous, so there is nothing to reconstruct." />
        ) : (
          windows.map((w, i) => <WindowBlock key={i} window={w} />)
        )}
      </div>
    </section>
  );
}

function WindowBlock({ window: w }: { window: MissedWindow }) {
  return (
    <div style={{ border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-inner)' }} className="p-3">
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="font-mono text-[10px]" style={{ color: 'var(--text-2)' }}>
          {formatShortIST(new Date(w.fromMs).toISOString())} → {formatShortIST(new Date(w.toMs).toISOString())}
        </span>
        <span className="font-mono text-[9.5px]" style={{ color: 'var(--text-4)' }}>
          {formatDuration(w.durationSeconds)}
        </span>
        {w.cause && (
          <span className="font-mono text-[9px] ml-auto" style={{ color: 'var(--text-4)' }}>
            {w.cause}
          </span>
        )}
      </div>

      {w.stationReportedNothing ? (
        <p className="text-[11.5px]" style={{ color: 'var(--watch-soft)' }}>
          No records — the station reported nothing in this window. That is not the same as “no
          data available”: nothing was queued locally either, so there is nothing still to arrive.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {w.entries.map((entry) => {
            const skew = clockSkewSeconds(entry.stationTime, entry.hqReceiptTime);
            return (
              <li key={entry.recordId} className="flex items-center gap-2">
                <span className="font-mono text-[9.5px] w-24 shrink-0" style={{ color: 'var(--text-3)' }}>
                  {formatShortIST(entry.stationTime)}
                </span>
                <TierChip tier={entry.tier} />
                <span className="font-mono text-[9px] w-16 shrink-0" style={{ color: 'var(--text-4)' }}>
                  {entry.type.toUpperCase()}
                </span>
                <Link
                  to={entry.type === 'action' ? '/actions' : entry.type === 'compliance' ? '/compliance' : '/station'}
                  className="text-[11px] flex-1 truncate"
                  style={{ color: 'var(--text-2)' }}
                >
                  {entry.summary}
                </Link>
                {Math.abs(skew) > 120 && (
                  <span className="font-mono text-[8.5px] shrink-0" style={{ color: 'var(--watch-soft)' }}
                    title="Clock skew between station-stamped time and HQ receipt time">
                    skew {formatDuration(Math.abs(skew))}
                  </span>
                )}
                <span
                  className="font-mono text-[8.5px] px-1.5 py-0.5 rounded shrink-0"
                  style={{
                    border: `1px ${entry.reconciled ? 'solid var(--ok)' : 'dashed var(--watch)'}`,
                    color: entry.reconciled ? 'var(--ok-soft)' : 'var(--watch-soft)',
                  }}
                >
                  {entry.reconciled ? 'RECONCILED' : 'PENDING'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
