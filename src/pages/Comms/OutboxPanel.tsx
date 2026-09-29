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
import { STATION_CODE, STATION_LABEL } from '@/state/stationScope';
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

/** Plain-language tier names, per FRONTEND.md tier definitions. */
const TIER_NAME: Record<Tier, string> = {
  T0: 'Life safety & medical',
  T1: 'Critical operations',
  T2: 'Logistics & records',
  T3: 'Science & bulk data',
};

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
      className="flex-1 flex flex-col min-h-0 min-w-0 p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Outbox and transfer queue"
    >
      <div className="flex items-start gap-x-4 gap-y-3 flex-wrap mb-4">
        <div className="min-w-0">
          <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>Outbox</h2>
          <p className="text-body-sm mt-0.5" style={{ color: totalQueued > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
            <span className="font-mono tabular-nums">{totalQueued}</span> record{totalQueued === 1 ? '' : 's'} waiting to send
          </p>
        </div>
        <AsyncButton
          onClick={onDrain}
          pendingLabel="Sending…"
          doneLabel="Sent"
          disabled={!canDrain || drain.running || totalQueued === 0}
          className="ml-auto px-5 rounded-full text-body-sm font-semibold min-h-10"
          style={{
            border: '1px solid var(--ok)',
            color: 'var(--ok-soft)',
            fontFamily: 'var(--font-body)',
            opacity: canDrain && !drain.running && totalQueued > 0 ? 1 : 0.4,
          }}
          title={linkDown ? 'The link is down — nothing can transfer' : 'Drain the queue in strict tier order'}
        >
          {drain.running ? 'Sending…' : 'Send now'}
        </AsyncButton>
      </div>

      {/* ---- Tier rows (FR-2.1) ---- */}
      <div className="flex flex-col gap-3.5 mb-5">
        {tiers.map((t) => (
          <div key={t.tier}>
            <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mb-1.5">
              <TierChip tier={t.tier} />
              <span className="text-body-sm font-medium" style={{ color: 'var(--text-2)' }}>{TIER_NAME[t.tier]}</span>
              <span className="flex items-baseline gap-x-3 ml-auto text-body-sm" style={{ color: 'var(--text-3)' }}>
                <span>
                  <span className="font-mono tabular-nums" style={{ color: t.queued > 0 ? 'var(--text)' : 'var(--text-3)' }}>{t.queued}</span> waiting
                </span>
                <span>
                  <span className="font-mono tabular-nums">{t.sent}</span> sent
                </span>
              </span>
            </div>
            <ProgressBar
              value={t.sent}
              max={maxQueued}
              tone={tone(t.tier, t.queued)}
              height={6}
              label={`${t.tier}: ${t.queued} queued, ${t.sent} sent`}
            />
          </div>
        ))}
      </div>

      {/* ---- Currently transferring (FR-2.4) ---- */}
      {drain.running && (
        <div
          className="flex items-center gap-4 px-4 py-3 mb-4"
          style={{ backgroundColor: 'var(--panel-raised)', border: '1px solid var(--ok)', borderRadius: 'var(--r-inner)' }}
        >
          <span className="text-body-sm font-medium" style={{ color: 'var(--ok-soft)' }}>
            {drain.status}
          </span>
          <span className="flex-1">
            <ProgressBar value={drain.sentThisRun} max={Math.max(1, drain.sentThisRun + order.length)} tone="ok" height={6} />
          </span>
          <span className="font-mono text-body-sm tabular-nums" style={{ color: 'var(--text-2)' }}>
            {formatBytes(drain.transferredBytes)}
          </span>
        </div>
      )}

      {/* ---- Drain order (FR-2.3) ---- */}
      <h3 className="text-body font-semibold mb-0.5" style={{ color: 'var(--text)' }}>
        Sending order
      </h3>
      <p className="text-body-sm mb-3" style={{ color: 'var(--text-3)' }}>
        Most urgent first. Nothing lower sends while a higher tier is still waiting.
      </p>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {order.length === 0 ? (
          <EmptyState reason="Nothing queued. Records written at the station appear here until the link carries them." />
        ) : (
          <ol className="flex flex-col gap-2">
            {order.slice(0, 12).map((record, i) => (
              <li
                key={record.id}
                className="flex items-start gap-3 px-4 py-3"
                style={{
                  backgroundColor: drain.transferringId === record.id ? 'var(--panel-alt)' : 'var(--panel-raised)',
                  border: `1px solid ${drain.transferringId === record.id ? 'var(--ok)' : 'transparent'}`,
                  borderRadius: 'var(--r-inner)',
                }}
              >
                <span
                  className="w-7 h-7 shrink-0 grid place-items-center rounded-full font-mono text-caption tabular-nums"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--text-3)' }}
                  aria-label={`Position ${i + 1}`}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-body-sm break-all" style={{ color: 'var(--text)' }} title="Record reference">
                    {record.payloadRef}
                  </p>
                  <div className="flex items-center gap-x-3 gap-y-1.5 flex-wrap mt-1 text-body-sm" style={{ color: 'var(--text-3)' }}>
                    <TierChip tier={record.tier} />
                    <span className="capitalize">{record.type}</span>
                    <span className="font-mono tabular-nums">{formatBytes(record.sizeBytes)}</span>
                    <span title={STATION_CODE[record.stationId]}>{STATION_LABEL[record.stationId]}</span>
                    {record.promotedFrom && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-caption font-medium"
                        style={{ border: '1px solid var(--act)', color: 'var(--act-soft)' }}
                        title={record.promotionReason}>
                        Moved up from <span className="font-mono ml-1">{record.promotedFrom}</span>
                      </span>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* ---- Throughput (FR-2.5) — SYNTH and labelled ---- */}
      <div
        className="grid grid-cols-2 gap-x-6 gap-y-3 mt-4 pt-4"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <div>
          <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }} title="Assumed link throughput">Link speed</p>
          <p className="flex items-center gap-2.5">
            <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text-2)' }}>
              {throughputKbps} kbps
            </span>
            <ProvenanceBadge
              measurement={synth(throughputKbps, 'kbps', 'confirmed NCPOR link budget')}
              label="Assumed link throughput"
            />
          </p>
        </div>
        <div>
          <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }}>Time to clear</p>
          <p className="flex items-center gap-2.5">
            <span className="font-mono text-body font-medium tabular-nums" style={{ color: 'var(--text-2)' }}>
              {totalQueued === 0 ? '—' : formatDuration(secondsToClear)}
            </span>
            <ProvenanceBadge
              measurement={synth(secondsToClear, 's', 'confirmed NCPOR link budget')}
              label="Estimated time to clear"
            />
          </p>
        </div>
      </div>

      <p className="text-body-sm mt-3 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
        A late, more urgent record jumps ahead at the next batch and the list reorders to show it.
      </p>
    </section>
  );
}
