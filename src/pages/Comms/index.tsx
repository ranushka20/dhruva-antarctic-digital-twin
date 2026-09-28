
// OWNER: Dev B
// PAGE 6a — Sync & Comms (/comms), the HQ side.
//
// What is each station's link state, what did we miss, what is queued, and
// in what order will it arrive? This page also owns the connectivity toggle
// that every <DegradableSurface> in the app reacts to — including Dev A's
// pages, which read it and never write to it (touchpoint #9).

import { useCallback, useState } from 'react';
import { Radio, Play, Square } from 'lucide-react';
import type { ConnectivityState } from '@/shared/contracts';
import { LinkTimeline } from './LinkTimeline';
import { OutboxPanel } from './OutboxPanel';
import { MissedLog } from './MissedLog';
import { Reconciliation } from './Reconciliation';
import { SyncPill } from '@/components/shared/SyncPill';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import {
  STATION_IDS, getLinkStats, getSyncInfo, setStationConnectivity,
  startOutageScenario, stopOutageScenario, getActiveScenario,
  type StationId,
} from '@/state/connectivity';
import {
  drainOrder, getDrainState, drainAll, reconstructMissedLog,
  getConflicts, resolveConflict, estimatedSecondsToClear,
} from '@/state/sync';
import { outboxSummary } from '@/state/data';
import { useStoreValue, useTick } from '@/state/useStore';
import { getParamValue } from '@/state/params';
import { STATION_LABEL } from '@/state/stationScope';
import { useCan, currentActor } from '@/state/auth';
import { formatClockIST, formatDuration, formatShortIST } from '@/lib/time';
import { synth } from '@/lib/provenance';
import { ActiveIndicator } from '@/components/shared/ActiveIndicator';

type Scope = 'both' | StationId;
const WINDOWS = [24, 168] as const;

export default function CommsPage() {
  const [scope, setScope] = useState<Scope>('both');
  const [windowHours, setWindowHours] = useState<(typeof WINDOWS)[number]>(24);
  const [busy, setBusy] = useState(false);

  useTick(15_000);

  const canSimulate = useCan('comms.simulate');
  const actor = currentActor();

  const stations = STATION_IDS.filter((id) => scope === 'both' || scope === id);
  const queueStation: StationId = scope === 'both' ? 'maitri' : scope;

  const tiers = useStoreValue(useCallback(() => outboxSummary(queueStation), [queueStation]));
  const order = useStoreValue(useCallback(
    () => drainOrder().filter((r) => r.stationId === queueStation), [queueStation]
  ));
  const drain = useStoreValue(getDrainState);
  const conflicts = useStoreValue(getConflicts);
  const missed = useStoreValue(useCallback(() => reconstructMissedLog(queueStation, 168), [queueStation]));
  const scenario = useStoreValue(getActiveScenario);
  const secondsToClear = useStoreValue(useCallback(() => estimatedSecondsToClear(queueStation), [queueStation]));

  const throughputKbps = getParamValue<number>('sync.throughputKbps');
  const linkDown = useStoreValue(useCallback(() => getSyncInfo(queueStation).state === 'DARK', [queueStation]));

  const onDrain = async () => {
    setBusy(true);
    try {
      await drainAll(queueStation);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row ---- */}
      <div className="flex items-center gap-3 flex-wrap px-6 py-3 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Sync &amp; Comms
        </h1>

        <div data-segmented className="relative isolate flex items-center gap-1 ml-2 p-0.5 rounded-full" style={{ border: '1px solid var(--line)' }}>
          {(['both', 'bharati', 'maitri'] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className="px-3 py-1.5 rounded-full text-body-sm"
              style={{
                color: scope === s ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {s === 'both' ? 'Both' : STATION_LABEL[s]}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--text)' }} />
        </div>

        <div data-segmented className="relative isolate flex items-center gap-1 p-0.5 rounded-full" style={{ border: '1px solid var(--line)' }}>
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowHours(w)}
              aria-pressed={windowHours === w}
              className="px-3 py-1.5 rounded-full font-mono text-caption"
              style={{
                color: windowHours === w ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              {w === 24 ? '24 H' : '7 D'}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--panel-raised)' }} />
        </div>

        <span className="font-mono text-body-sm tabular-nums ml-auto" style={{ color: 'var(--text-2)' }}>
          {formatClockIST()}
        </span>
      </div>

      {/* ---- Demo scenario banner (NFR-6.7) ---- */}
      {scenario && (
        <div
          className="flex items-center gap-2.5 px-6 py-2 shrink-0"
          role="status"
          style={{
            backgroundColor: 'rgba(155,132,196,0.12)',
            borderBottom: '1px dashed var(--sim)',
          }}
        >
          <Radio size={14} style={{ color: 'var(--sim-soft)' }} aria-hidden />
          <span className="text-body" style={{ color: 'var(--sim-soft)' }}>
            <strong>Simulated outage running</strong> on {STATION_LABEL[scenario.stationId]} since{' '}
            {formatShortIST(scenario.startedAt)} — started by {scenario.startedBy}. This writes only
            to the demo scenario store; no operational record is affected.
          </span>
          <button
            type="button"
            onClick={stopOutageScenario}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-sm font-medium min-h-[34px]"
            style={{ border: '1px solid var(--sim)', color: 'var(--sim-soft)', fontFamily: 'var(--font-body)' }}
          >
            <Square size={10} /> End simulation
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <div className="flex flex-col xl:flex-row gap-3.5">
          {/* LEFT — link state + what we missed */}
          <div className="flex-1 min-w-0 flex flex-col gap-3.5">
            {stations.map((id) => (
              <LinkStateCard
                key={id}
                stationId={id}
                windowHours={windowHours}
                canSimulate={canSimulate}
                actorName={actor.name}
              />
            ))}

            <div className="min-h-[300px] flex">
              <MissedLog windows={missed} />
            </div>
          </div>

          {/* RIGHT — outbox + reconciliation */}
          <div className="w-full xl:w-[420px] xl:shrink-0 flex flex-col gap-3.5">
            <div className="min-h-[420px] flex">
              <OutboxPanel
                tiers={tiers}
                order={order}
                drain={drain}
                throughputKbps={throughputKbps}
                secondsToClear={secondsToClear}
                onDrain={onDrain}
                canDrain={!busy && !linkDown}
                linkDown={linkDown}
              />
            </div>

            <Reconciliation
              conflicts={conflicts}
              canResolve={canSimulate}
              onResolve={(objectId, as, reason) => { void resolveConflict(objectId, as, reason); }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkStateCard({
  stationId, windowHours, canSimulate, actorName,
}: { stationId: StationId; windowHours: number; canSimulate: boolean; actorName: string }) {
  const info = useStoreValue(useCallback(() => getSyncInfo(stationId), [stationId]));
  const stats = useStoreValue(useCallback(() => getLinkStats(stationId, windowHours), [stationId, windowHours]));
  const scenario = useStoreValue(getActiveScenario);
  const simulatedHere = scenario?.stationId === stationId;

  return (
    <section
      className="p-4"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label={`${STATION_LABEL[stationId]} link state`}
    >
      <div className="flex items-center gap-2.5 mb-3 flex-wrap">
        <h2 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          {STATION_LABEL[stationId]}
        </h2>
        <SyncPill state={info.state} ageSeconds={info.ageSeconds} />
        <span className="font-mono text-caption" style={{ color: 'var(--text-3)' }}>
          last successful sync {formatShortIST(info.lastSyncAt)}
        </span>

        {/* The connectivity toggle: this page owns it, the whole app reads it */}
        <div data-segmented className="relative isolate flex items-center gap-1 ml-auto p-0.5 rounded-full" style={{ border: '1px solid var(--line)' }}>
          {(['LIVE', 'LAGGING', 'DARK'] as ConnectivityState[]).map((state) => (
            <button
              key={state}
              type="button"
              onClick={() => setStationConnectivity(stationId, state, 'operator toggle (' + actorName + ')')}
              aria-pressed={info.state === state}
              className="px-2.5 py-1 rounded-full font-mono text-micro tracking-[0.06em] min-h-[30px]"
              style={{ color: info.state === state ? 'var(--text)' : 'var(--text-3)' }}
            >
              {state}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--panel-raised)' }} />
        </div>

        <button
          type="button"
          disabled={!canSimulate}
          onClick={() =>
            simulatedHere ? stopOutageScenario() : startOutageScenario(stationId, actorName)
          }
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-body-sm font-medium min-h-[34px]"
          style={{
            border: '1px dashed var(--sim)',
            color: 'var(--sim-soft)',
            fontFamily: 'var(--font-body)',
            opacity: canSimulate ? 1 : 0.4,
          }}
          title="Demo affordance — writes only to the scenario store, never the operational record"
        >
          {simulatedHere ? <Square size={10} /> : <Play size={10} />}
          {simulatedHere ? 'End outage sim' : 'Simulate outage'}
        </button>
      </div>

      <LinkTimeline segments={stats.segments} windowHours={windowHours} />

      <div className="flex items-center gap-5 mt-3 flex-wrap">
        <Stat
          label="Uptime"
          value={stats.uptimePct.toFixed(1) + ' %'}
          tone={stats.uptimePct > 90 ? 'ok' : stats.uptimePct > 70 ? 'watch' : 'act'}
        />
        <Stat
          label="Longest gap"
          value={stats.longestGapSeconds > 0 ? formatDuration(stats.longestGapSeconds) : 'none'}
          tone={stats.longestGapSeconds > 12 * 3600 ? 'act' : 'default'}
        />
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-micro uppercase tracking-label" style={{ color: 'var(--text-4)' }}>
            Next contact
          </span>
          <span className="font-mono text-body-sm" style={{ color: 'var(--text-2)' }}>
            {info.state === 'DARK' ? 'unscheduled' : 'continuous'}
          </span>
          <ProvenanceBadge
            measurement={synth('pass schedule', '', 'satellite pass schedule from NCPOR')}
            label="Next expected contact window"
          />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, tone = 'default' }: { label: string; value: string; tone?: 'default' | 'ok' | 'watch' | 'act' }) {
  const color = tone === 'ok' ? 'var(--ok-soft)' : tone === 'watch' ? 'var(--watch-soft)' : tone === 'act' ? 'var(--act-soft)' : 'var(--text-2)';
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-micro uppercase tracking-label" style={{ color: 'var(--text-4)' }}>
        {label}
      </span>
      <span className="font-mono text-body-sm tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
