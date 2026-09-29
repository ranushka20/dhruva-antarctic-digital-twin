
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
      <div className="flex items-center gap-x-5 gap-y-3 flex-wrap px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          Sync &amp; Comms
        </h1>

        <div
          data-segmented
          role="group"
          aria-label="Which station to show"
          className="relative isolate flex items-center gap-1 p-1 rounded-full"
          style={{ border: '1px solid var(--line-strong)' }}
        >
          {(['both', 'bharati', 'maitri'] as Scope[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setScope(s)}
              aria-pressed={scope === s}
              className="px-4 min-h-9 rounded-full text-body-sm font-medium"
              style={{
                color: scope === s ? 'var(--bg)' : 'var(--text-3)',
              }}
            >
              {s === 'both' ? 'Both' : STATION_LABEL[s]}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--text)' }} />
        </div>

        <div
          data-segmented
          role="group"
          aria-label="Time window"
          className="relative isolate flex items-center gap-1 p-1 rounded-full"
          style={{ border: '1px solid var(--line-strong)' }}
        >
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowHours(w)}
              aria-pressed={windowHours === w}
              className="px-4 min-h-9 rounded-full text-body-sm font-medium"
              style={{
                color: windowHours === w ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              {w === 24 ? 'Last 24 hours' : 'Last 7 days'}
            </button>
          ))}
          <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--panel-raised)' }} />
        </div>

        <span className="flex items-baseline gap-2 ml-auto text-body-sm" style={{ color: 'var(--text-3)' }}>
          Now
          <span className="font-mono text-body tabular-nums" style={{ color: 'var(--text-2)' }}>
            {formatClockIST()}
          </span>
        </span>
      </div>

      {/* ---- Demo scenario banner (NFR-6.7) ---- */}
      {scenario && (
        <div
          className="flex items-center gap-x-4 gap-y-2.5 flex-wrap px-6 py-3 shrink-0"
          role="status"
          style={{
            backgroundColor: 'rgba(155,132,196,0.12)',
            borderBottom: '1px dashed var(--sim)',
          }}
        >
          <Radio size={18} className="shrink-0" style={{ color: 'var(--sim-soft)' }} aria-hidden />
          <div className="flex-1 min-w-[16rem]">
            <p className="text-body font-semibold" style={{ color: 'var(--sim-soft)' }}>
              Simulated outage running on {STATION_LABEL[scenario.stationId]}
            </p>
            <p className="flex items-center gap-x-4 gap-y-1 flex-wrap text-body-sm mt-0.5" style={{ color: 'var(--text-2)' }}>
              <span>Since <span className="font-mono tabular-nums">{formatShortIST(scenario.startedAt)}</span></span>
              <span>Started by {scenario.startedBy}</span>
              <span style={{ color: 'var(--text-3)' }}>Demo only — no real records are changed.</span>
            </p>
          </div>
          <button
            type="button"
            onClick={stopOutageScenario}
            className="flex items-center gap-2 px-4 rounded-full text-body-sm font-medium min-h-9"
            style={{ border: '1px solid var(--sim)', color: 'var(--sim-soft)', fontFamily: 'var(--font-body)' }}
          >
            <Square size={12} /> End simulation
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="flex flex-col 2xl:flex-row gap-5 max-w-[100rem] mx-auto">
          {/* LEFT — link state + what we missed */}
          <div className="flex-1 min-w-0 flex flex-col gap-5">
            {stations.map((id) => (
              <LinkStateCard
                key={id}
                stationId={id}
                windowHours={windowHours}
                canSimulate={canSimulate}
                actorName={actor.name}
              />
            ))}

            <div className="min-h-[20rem] flex">
              <MissedLog windows={missed} />
            </div>
          </div>

          {/* RIGHT — outbox + reconciliation (side by side until very wide screens) */}
          <div className="w-full 2xl:w-[32rem] 2xl:shrink-0 grid gap-5 lg:grid-cols-2 2xl:grid-cols-1 content-start">
            <div className="min-h-[26rem] flex">
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

const STATE_LABEL: Record<ConnectivityState, { label: string; hint: string }> = {
  LIVE: { label: 'Live', hint: 'LIVE — the link is up and data is current' },
  LAGGING: { label: 'Lagging', hint: 'LAGGING — the link is up but data is arriving late' },
  DARK: { label: 'Dark', hint: 'DARK — no link; nothing is getting through' },
};

function LinkStateCard({
  stationId, windowHours, canSimulate, actorName,
}: { stationId: StationId; windowHours: number; canSimulate: boolean; actorName: string }) {
  const info = useStoreValue(useCallback(() => getSyncInfo(stationId), [stationId]));
  const stats = useStoreValue(useCallback(() => getLinkStats(stationId, windowHours), [stationId, windowHours]));
  const scenario = useStoreValue(getActiveScenario);
  const simulatedHere = scenario?.stationId === stationId;

  return (
    <section
      className="p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label={`${STATION_LABEL[stationId]} link state`}
    >
      {/* Heading: station + its current state */}
      <div className="flex items-center gap-x-4 gap-y-2 flex-wrap mb-1.5">
        <h2 className="text-title font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          {STATION_LABEL[stationId]}
        </h2>
        <SyncPill state={info.state} ageSeconds={info.ageSeconds} />
      </div>
      <p className="text-body-sm mb-4" style={{ color: 'var(--text-3)' }}>
        Last successful sync <span className="font-mono tabular-nums" style={{ color: 'var(--text-2)' }}>{formatShortIST(info.lastSyncAt)}</span>
      </p>

      {/* Controls: the connectivity toggle (this page owns it, the whole app reads it) + demo outage */}
      <div className="flex items-center gap-x-5 gap-y-3 flex-wrap mb-5">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-body-sm" style={{ color: 'var(--text-3)' }} id={`link-toggle-${stationId}`}>
            Set link state
          </span>
          <div
            data-segmented
            role="group"
            aria-labelledby={`link-toggle-${stationId}`}
            className="relative isolate flex items-center gap-1 p-1 rounded-full"
            style={{ border: '1px solid var(--line-strong)' }}
          >
            {(['LIVE', 'LAGGING', 'DARK'] as ConnectivityState[]).map((state) => (
              <button
                key={state}
                type="button"
                onClick={() => setStationConnectivity(stationId, state, 'operator toggle (' + actorName + ')')}
                aria-pressed={info.state === state}
                title={STATE_LABEL[state].hint}
                className="px-4 min-h-9 rounded-full text-body-sm font-medium"
                style={{ color: info.state === state ? 'var(--text)' : 'var(--text-3)' }}
              >
                {STATE_LABEL[state].label}
              </button>
            ))}
            <ActiveIndicator className="rounded-full" style={{ backgroundColor: 'var(--panel-raised)' }} />
          </div>
        </div>

        <button
          type="button"
          disabled={!canSimulate}
          onClick={() =>
            simulatedHere ? stopOutageScenario() : startOutageScenario(stationId, actorName)
          }
          className="flex items-center gap-2 px-4 rounded-full text-body-sm font-medium min-h-9 ml-auto"
          style={{
            border: '1px dashed var(--sim)',
            color: 'var(--sim-soft)',
            fontFamily: 'var(--font-body)',
            opacity: canSimulate ? 1 : 0.4,
          }}
          title="Demo affordance — writes only to the scenario store, never the operational record"
        >
          {simulatedHere ? <Square size={12} /> : <Play size={12} />}
          {simulatedHere ? 'End simulated outage' : 'Simulate an outage'}
        </button>
      </div>

      <LinkTimeline segments={stats.segments} windowHours={windowHours} />

      <div
        className="grid gap-x-8 gap-y-4 grid-cols-1 sm:grid-cols-3 mt-5 pt-4"
        style={{ borderTop: '1px solid var(--line)' }}
      >
        <Stat
          label="Time connected"
          hint="Uptime in this window"
          value={stats.uptimePct.toFixed(1) + ' %'}
          tone={stats.uptimePct > 90 ? 'ok' : stats.uptimePct > 70 ? 'watch' : 'act'}
        />
        <Stat
          label="Longest gap"
          value={stats.longestGapSeconds > 0 ? formatDuration(stats.longestGapSeconds) : 'None'}
          mono={stats.longestGapSeconds > 0}
          tone={stats.longestGapSeconds > 12 * 3600 ? 'act' : 'default'}
        />
        <div>
          <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }}>Next contact</p>
          <p className="flex items-center gap-2.5">
            <span className="text-body font-medium" style={{ color: 'var(--text-2)' }}>
              {info.state === 'DARK' ? 'Not scheduled' : 'Continuous'}
            </span>
            <ProvenanceBadge
              measurement={synth('pass schedule', '', 'satellite pass schedule from NCPOR')}
              label="Next expected contact window"
            />
          </p>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label, value, hint, mono = true, tone = 'default',
}: { label: string; value: string; hint?: string; mono?: boolean; tone?: 'default' | 'ok' | 'watch' | 'act' }) {
  const color = tone === 'ok' ? 'var(--ok-soft)' : tone === 'watch' ? 'var(--watch-soft)' : tone === 'act' ? 'var(--act-soft)' : 'var(--text-2)';
  return (
    <div title={hint}>
      <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }}>
        {label}
      </p>
      <p className={`text-body font-medium tabular-nums ${mono ? 'font-mono' : ''}`} style={{ color }}>{value}</p>
    </div>
  );
}
