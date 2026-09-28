// OWNER: Dev B
// Outbox / queue panel — tier bars, the exact drain order, the record in
// flight, and throughput.
//
// Two honesty points live here. T0 is mint when clear but ORANGE the moment
// anything is queued, because a life-safety record waiting on a link is an
// alarm (FR-2.2). And throughput and time-to-clear are SYNTH and labelled —
// we do not know NCPOR's real link budget and will not imply that we do.

import type { SyncRecord, Tier } from '@/shared/contracts';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { TierChip } from '@/components/shared/TierChip';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { STATION_CODE } from '@/state/stationScope';
import { formatDuration } from '@/lib/time';
import { synth } from '@/lib/provenance';
import type { DrainState } from '@/state/sync';
import { AsyncButton } from '@/components/shared/AsyncButton';

interface Props {
  tiers: { tier: Tier; queued: number; sent: number }[];
  order: SyncRecord[];
  drain: DrainState;
  throughputKbps: number;
  secondsToClear: number;
  onDrain: () => Promise<void> | void;
  canDrain: boolean;
  linkDown: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

export function OutboxPanel({
  tiers, order, drain, throughputKbps, secondsToClear, onDrain, canDrain, linkDown,
}: Props) {
  const maxQueued = Math.max(1, ...tiers.map((t) => t.queued + t.sent));
  const totalQueued = tiers.reduce((s, t) => s + t.queued, 0);

  const tone = (tier: Tier, queued: number) =>
    tier === 'T0' ? (queued > 0 ? 'act' as const : 'ok' as const)
      : tier === 'T1' ? 'act' as const
      : tier === 'T2' ? 'watch' as const
      : 'neutral' as const;

  return (
    <section
      className="flex flex-col min-h-0 p-4"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Outbox and transfer queue"
    >
      <div className="flex items-center mb-3">
        <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Outbox</h2>
        <span className="font-mono text-caption tabular-nums ml-2" style={{ color: totalQueued > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
          {totalQueued} queued
        </span>
        <AsyncButton
          onClick={onDrain}
          pendingLabel="Draining…"
          doneLabel="Drained"
          disabled={!canDrain || drain.running || totalQueued === 0}
          className="ml-auto px-3 py-1.5 rounded-full text-body-sm font-medium min-h-[36px]"
          style={{
            border: '1px solid var(--ok)',
            color: 'var(--ok-soft)',
            fontFamily: 'var(--font-body)',
            opacity: canDrain && !drain.running && totalQueued > 0 ? 1 : 0.4,
          }}
          title={linkDown ? 'The link is down — nothing can transfer' : 'Drain the queue in strict tier order'}
        >
          {drain.running ? 'Draining…' : 'Drain now'}
        </AsyncButton>
      </div>

      {/* ---- Tier rows (FR-2.1) ---- */}
      <div className="space-y-2 mb-4">
        {tiers.map((t) => (
          <div key={t.tier} className="flex items-center gap-2.5">
            <TierChip tier={t.tier} />
            <div className="flex-1">
              <ProgressBar
                value={t.sent}
                max={maxQueued}
                tone={tone(t.tier, t.queued)}
                height={6}
                label={`${t.tier}: ${t.queued} queued, ${t.sent} sent`}
              />
            </div>
            <span className="font-mono text-caption tabular-nums w-28 text-right" style={{ color: 'var(--text-3)' }}>
              <span style={{ color: t.queued > 0 ? 'var(--text-2)' : 'var(--text-4)' }}>{t.queued}</span> queued ·{' '}
              {t.sent} sent
            </span>
          </div>
        ))}
      </div>

      {/* ---- Currently transferring (FR-2.4) ---- */}
      {drain.running && (
        <div
          className="flex items-center gap-2.5 px-3 py-2 mb-3"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--ok)', borderRadius: 'var(--r-inner)' }}
        >
          <span className="font-mono text-micro tracking-label" style={{ color: 'var(--ok-soft)' }}>
            {drain.status}
          </span>
          <span className="flex-1">
            <ProgressBar value={drain.sentThisRun} max={Math.max(1, drain.sentThisRun + order.length)} tone="ok" height={4} />
          </span>
          <span className="font-mono text-caption tabular-nums" style={{ color: 'var(--text-3)' }}>
            {formatBytes(drain.transferredBytes)}
          </span>
        </div>
      )}

      {/* ---- Drain order (FR-2.3) ---- */}
      <p className="font-mono text-micro uppercase tracking-label mb-2" style={{ color: 'var(--text-4)' }}>
        Next in transfer order
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {order.length === 0 ? (
          <EmptyState reason="Nothing queued. Records written at the station appear here until the link carries them." />
        ) : (
          <ol className="space-y-1">
            {order.slice(0, 12).map((record, i) => (
              <li
                key={record.id}
                className="flex items-center gap-2 px-2 py-1.5"
                style={{
                  backgroundColor: drain.transferringId === record.id ? 'var(--panel-raised)' : 'transparent',
                  borderRadius: 'var(--r-inner)',
                }}
              >
                <span className="font-mono text-micro w-5 shrink-0" style={{ color: 'var(--text-4)' }}>
                  {i + 1}
                </span>
                <TierChip tier={record.tier} />
                <span className="font-mono text-micro w-16 shrink-0" style={{ color: 'var(--text-4)' }}>
                  {record.type.toUpperCase()}
                </span>
                <span className="text-body-sm flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                  {record.payloadRef}
                </span>
                {record.promotedFrom && (
                  <span className="font-mono text-micro px-1 py-0.5 rounded shrink-0"
                    style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}
                    title={record.promotionReason}>
                    ↑ {record.promotedFrom}
                  </span>
                )}
                <span className="font-mono text-micro tabular-nums shrink-0" style={{ color: 'var(--text-4)' }}>
                  {formatBytes(record.sizeBytes)}
                </span>
                <span className="font-mono text-micro shrink-0" style={{ color: 'var(--text-4)' }}>
                  {STATION_CODE[record.stationId]}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ---- Throughput (FR-2.5) — SYNTH and labelled ---- */}
      <div
        className="flex items-center gap-2 mt-3 pt-2.5 flex-wrap"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <span className="font-mono text-micro uppercase tracking-label" style={{ color: 'var(--text-4)' }}>
          Throughput
        </span>
        <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-2)' }}>
          {throughputKbps} kbps
        </span>
        <ProvenanceBadge
          measurement={synth(throughputKbps, 'kbps', 'confirmed NCPOR link budget')}
          label="Assumed link throughput"
        />
        <span className="font-mono text-micro uppercase tracking-label ml-3" style={{ color: 'var(--text-4)' }}>
          To clear
        </span>
        <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-2)' }}>
          {totalQueued === 0 ? '—' : formatDuration(secondsToClear)}
        </span>
        <ProvenanceBadge
          measurement={synth(secondsToClear, 's', 'confirmed NCPOR link budget')}
          label="Estimated time to clear"
        />
      </div>

      <p className="font-mono text-micro mt-2" style={{ color: 'var(--text-4)' }}>
        Strict tier order: no T2 transfers while any T1 remains. A late higher-tier record
        pre-empts at the next batch boundary and the list visibly reorders.
      </p>
    </section>
  );
}
