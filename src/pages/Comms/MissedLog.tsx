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
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  return (
    <section
      className="flex-1 flex flex-col min-h-0 min-w-0 p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="What we missed"
    >
      <h2 className="text-title font-semibold mb-1" style={{ color: 'var(--text)' }}>What we missed</h2>
      <p className="text-body-sm mb-4 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        Records written at the station while the link was down, shown in the order the station wrote them.
      </p>

      <div className="flex items-center gap-x-3 gap-y-2 flex-wrap mb-4">
        <SummaryChip value={summary.records} label={plural(summary.records, 'record recovered', 'records recovered')} />
        <SummaryChip value={formatDuration(summary.gapSeconds)} label="of gaps" />
        <SummaryChip value={summary.actions} label={plural(summary.actions, 'action', 'actions')} />
        <SummaryChip value={summary.faults} label={plural(summary.faults, 'fault', 'faults')} />
        <SummaryChip value={summary.inventory} label={plural(summary.inventory, 'inventory change', 'inventory changes')} />
      </div>

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

function SummaryChip({ value, label }: { value: number | string; label: string }) {
  return (
    <span
      className="inline-flex items-baseline gap-2 px-3 py-1 rounded-full text-body-sm"
      style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
    >
      <span className="font-mono tabular-nums font-medium" style={{ color: 'var(--text)' }}>{value}</span>
      {label}
    </span>
  );
}

function WindowBlock({ window: w }: { window: MissedWindow }) {
  return (
    <div style={{ border: '1px dashed var(--line-strong)', borderRadius: 'var(--r-inner)' }} className="p-4">
      <div className="flex items-center gap-x-4 gap-y-2 mb-3 flex-wrap">
        <span className="font-mono text-body-sm font-medium tabular-nums" style={{ color: 'var(--text)' }}>
          {formatShortIST(new Date(w.fromMs).toISOString())} → {formatShortIST(new Date(w.toMs).toISOString())}
        </span>
        <span
          className="inline-flex items-baseline gap-1.5 px-3 py-0.5 rounded-full text-body-sm"
          style={{ backgroundColor: 'var(--panel-raised)', color: 'var(--text-3)' }}
        >
          Gap of <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{formatDuration(w.durationSeconds)}</span>
        </span>
        {w.cause && (
          <span className="text-body-sm ml-auto" style={{ color: 'var(--text-3)' }}>
            Cause: {w.cause}
          </span>
        )}
      </div>

      {w.stillOpen && w.entries.length === 0 ? (
        <p className="text-body max-w-[70ch]" style={{ color: 'var(--act-soft)' }}>
          Gap still open — nothing from this window has reached HQ yet. We cannot say the station
          has been quiet, only that we have heard nothing. Whatever it has written is waiting in
          its local outbox.
        </p>
      ) : w.stationReportedNothing ? (
        <p className="text-body max-w-[70ch]" style={{ color: 'var(--watch-soft)' }}>
          No records — the station reported nothing in this window. That is not the same as “no
          data available”: the gap has closed and nothing was queued, so there is nothing still to
          arrive.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {w.entries.map((entry) => {
            const skew = clockSkewSeconds(entry.stationTime, entry.hqReceiptTime);
            return (
              <li
                key={entry.recordId}
                className="px-4 py-3"
                style={{ backgroundColor: 'var(--panel-raised)', borderRadius: 'var(--r-inner)' }}
              >
                <Link
                  to={entry.type === 'action' ? '/actions' : entry.type === 'compliance' ? '/compliance' : '/station'}
                  className="block text-body font-medium line-clamp-2 hover:underline"
                  style={{ color: 'var(--text)' }}
                >
                  {entry.summary}
                </Link>
                <div className="flex items-center gap-x-4 gap-y-2 flex-wrap mt-1.5 text-body-sm" style={{ color: 'var(--text-3)' }}>
                  <span className="font-mono tabular-nums" title="Station time">
                    {formatShortIST(entry.stationTime)}
                  </span>
                  <TierChip tier={entry.tier} />
                  <span
                    className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption capitalize"
                    style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text-2)' }}
                  >
                    {entry.type}
                  </span>
                  {Math.abs(skew) > 120 && (
                    <span style={{ color: 'var(--watch-soft)' }}
                      title="Clock skew between station-stamped time and HQ receipt time">
                      Clocks differ by <span className="font-mono tabular-nums">{formatDuration(Math.abs(skew))}</span>
                    </span>
                  )}
                  <span
                    className="inline-flex items-center px-3 py-0.5 rounded-full text-caption font-medium ml-auto"
                    style={{
                      border: `1px ${entry.reconciled ? 'solid var(--ok)' : 'dashed var(--watch)'}`,
                      color: entry.reconciled ? 'var(--ok-soft)' : 'var(--watch-soft)',
                    }}
                    title={entry.reconciled ? 'Matched against the HQ record' : 'Not yet matched against the HQ record'}
                  >
                    {entry.reconciled ? 'Reconciled' : 'Pending'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
