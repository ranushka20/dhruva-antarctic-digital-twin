// OWNER: Dev B
// PAGE 1 — HQ Overview (route /).
//
// Answers, in this priority order: what needs attention, can each station
// sustain itself, what is the state of both stations, can I trust each
// number, what happened while a station was disconnected.
//
// The action list occupies the top-left — the position the eye reads first.
// Every other team leads with a big temperature readout because that is the
// number they actually have; this page leads with the decision.

import { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, FileText, Search, Box } from 'lucide-react';
import { StationComparator } from './StationComparator';
import { NeedsAttention } from './NeedsAttention';
import { ResourceWatch } from './ResourceWatch';
import { StationZonesPanel } from './StationZonesPanel';
import { AntarcticaMap, type MapStation } from '@/components/viz/AntarcticaMap';
import { StatTile } from '@/components/shared/StatTile';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { DegradableSurface } from '@/components/shared/DegradableSurface';
import { useStationScope } from '@/state/stationScope';
import { useStoreValue, useTick } from '@/state/useStore';
import {
  getStationSummary, getResources, getActions, getActionCounts,
  outboxSummary, zoneAutonomyImpact, envSnapshot, STATION_PROFILES,
} from '@/state/data';
import { getDrainState } from '@/state/sync';
import { formatClockIST, formatDuration } from '@/lib/time';

export default function OverviewPage() {
  const navigate = useNavigate();
  const primaryId = useStationScope((s) => s.primary);
  const compareId = useStationScope((s) => s.compare);
  const setPrimary = useStationScope((s) => s.setPrimary);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  // NFR-G10 / FR-13.5 — a 60 s poll that must not shift layout or lose
  // selection. Selection lives in React state, so it survives by construction.
  useTick(60_000);

  const primary = useStoreValue(() => getStationSummary(primaryId));
  const compare = useStoreValue(() => getStationSummary(compareId));
  const resources = useStoreValue(() => getResources('all'));
  const actions = useStoreValue(() => getActions('all'));
  const counts = useStoreValue(() => getActionCounts('all'));
  const outbox = useStoreValue(() => outboxSummary());
  const drain = useStoreValue(getDrainState);

  const openActions = useMemo(() => actions.filter((a) => a.isOpen), [actions]);
  const env = useMemo(() => envSnapshot(primaryId), [primaryId]);

  const zoneImpact = useMemo(
    () => (selectedZone ? zoneAutonomyImpact(primaryId, selectedZone) : null),
    [primaryId, selectedZone]
  );

  const mapStations: MapStation[] = [primary, compare].map((s) => {
    const urgent = s.openActions.some((a) => a.tier === 'T0' || a.tier === 'T1');
    const warn = s.zones.some((z) => z.status === 'warning');
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      x: STATION_PROFILES[s.id].map.x,
      y: STATION_PROFILES[s.id].map.y,
      syncState: s.sync.state,
      ageSeconds: s.sync.ageSeconds,
      warnings: s.zones.filter((z) => z.status === 'warning').length,
      tone: urgent ? 'act' : warn || s.sync.state !== 'LIVE' ? 'watch' : 'ok',
    };
  });

  const selectedZoneData = primary.zones.find((z) => z.code === selectedZone) ?? null;

  // The 3D twin is the headline feature, so it gets one canonical entry point
  // that every affordance on this page routes through: the title-row button,
  // the "3D" button on each map chip, a double-click on a map marker, and the
  // selection card's CTA. A selected zone rides along so the twin opens on it.
  const openTwin = useCallback(
    (id: string = primaryId) =>
      navigate(`/stations/${id}/twin` + (selectedZone ? '?zone=' + selectedZone : '')),
    [navigate, primaryId, selectedZone]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row (FR-2) ---- */}
      <div
        className="flex items-center flex-wrap gap-x-4 gap-y-3 px-6 py-3.5 shrink-0"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          HQ Overview
        </h1>

        <label
          className="flex items-center gap-2.5 px-4 min-h-10 rounded-full min-w-[15rem] max-w-md flex-1"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)' }}
          title="Search assets, actions and records (⌘ Space)"
        >
          <Search size={16} style={{ color: 'var(--text-3)' }} aria-hidden />
          <span className="sr-only">Search assets, actions, records</span>
          <input
            readOnly
            onFocus={(e) => { e.currentTarget.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', ctrlKey: true })); }}
            placeholder="Search assets, actions, records"
            className="flex-1 bg-transparent outline-none text-body-sm min-w-0"
            style={{ color: 'var(--text-2)' }}
          />
          <span
            className="hidden 2xl:inline font-mono text-micro px-2 py-0.5 rounded shrink-0"
            style={{ border: '1px solid var(--line)', color: 'var(--text-3)' }}
          >
            ⌘ Space
          </span>
        </label>

        <div className="ml-auto flex items-center flex-wrap gap-x-3 gap-y-2">
          <span
            className="font-mono text-body-sm tabular-nums mr-1"
            style={{ color: 'var(--text-2)' }}
            title="Current time, India Standard Time"
          >
            {formatClockIST()}
          </span>

          <button
            type="button"
            onClick={() => navigate('/actions')}
            className="flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
            title="Open the Action Centre to filter every action"
          >
            <Filter size={15} aria-hidden /> Filter
          </button>
          <button
            type="button"
            onClick={() => navigate('/compliance')}
            className="flex items-center gap-2 px-4 min-h-9 rounded-full text-body-sm font-medium hover:bg-[var(--panel-alt)]"
            style={{ border: '1px solid var(--line-strong)', color: 'var(--text-2)' }}
            title="Compliance reports"
          >
            <FileText size={15} aria-hidden /> Reports
          </button>

          {/* Primary CTA — the product's headline feature belongs in the title
              row, not buried at the bottom of the right rail. */}
          <button
            type="button"
            onClick={() => openTwin()}
            className="flex items-center gap-2 px-5 min-h-10 rounded-full text-body font-semibold shrink-0"
            style={{ backgroundColor: 'var(--text)', color: 'var(--bg)' }}
            title={`Open the ${primary.name} 3D digital twin`}
          >
            <Box size={16} aria-hidden /> Open 3D twin
          </button>
        </div>
      </div>

      {/* ---- Layout (container queries, so it also follows the text-size
           setting): one column when narrow; two columns — rails stacked on
           the left, map + resources on the right — from 56rem; three
           columns only from 88rem, where the centre keeps real room. ---- */}
      <div className="@container flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div
          className={[
            'grid grid-cols-1 gap-5 min-h-full',
            '@min-[56rem]:grid-cols-[minmax(19rem,22rem)_minmax(0,1fr)] @min-[56rem]:grid-rows-[auto_1fr]',
            '@min-[88rem]:grid-cols-[21rem_minmax(0,1fr)_22rem] @min-[88rem]:grid-rows-[1fr]',
          ].join(' ')}
        >
          {/* LEFT — never hidden at any width */}
          <div className="flex flex-col gap-5 min-w-0 order-1 @min-[56rem]:[grid-area:1/1/2/2]">
            <StationComparator
              primary={primary}
              compare={compare}
              onBrief={() => navigate('/handover?station=' + primary.id)}
            />
            <div className="flex-1 min-h-[280px] flex">
              <NeedsAttention
                actions={openActions}
                deferred={counts.deferred}
                resolved={counts.resolved}
              />
            </div>
          </div>

          {/* CENTRE */}
          <div className="flex flex-col gap-5 min-w-0 order-3 @min-[56rem]:[grid-area:1/2/3/3] @min-[88rem]:[grid-area:1/2/2/3]">
            <section
              className="glow-hero glow-map relative overflow-hidden shrink-0 h-[20rem] 2xl:h-[22rem]"
              style={{ borderRadius: 'var(--r-card)' }}
              aria-label="Antarctica map"
            >
              <AntarcticaMap
                stations={mapStations}
                primaryId={primaryId}
                onSelect={setPrimary}
                onOpenTwin={openTwin}
              />
              {/* Says out loud what the double-click does — the gesture is
                  worthless if nobody knows it is there. */}
              <p
                className="absolute left-4 bottom-4 flex flex-wrap gap-x-4 gap-y-1 px-3.5 py-1.5 rounded-full text-body-sm pointer-events-none"
                style={{ color: 'var(--text-3)', backgroundColor: 'var(--panel-deep)', border: '1px solid var(--line)' }}
              >
                <span>Click a station to select it</span>
                <span>Double-click to open its 3D twin</span>
              </p>
            </section>

            {/* Map footer strip (FR-5.6) — the HQ view of both outboxes */}
            <OutboxStrip outbox={outbox} status={drain.status} />

            <div className="flex-1 min-h-[260px] flex">
              <ResourceWatch resources={resources} />
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-5 min-w-0 order-2 @min-[56rem]:[grid-area:2/1/3/2] @min-[88rem]:[grid-area:1/3/2/4]">
            <DegradableSurface
              syncState={primary.sync.state}
              ageLabel={formatDuration(primary.sync.ageSeconds)}
              surfaceRadius="var(--r-cone) var(--r-cone) 16px 16px"
            >
              <StationZonesPanel
                stationName={primary.name}
                zones={primary.zones}
                selectedCode={selectedZone}
                onSelect={(code) => setSelectedZone((c) => (c === code ? null : code))}
              />
            </DegradableSurface>

            {/* Environment stat trio (FR-8). Two-up plus one full-width tile in
                a rail; three-across only when there is room for the labels. */}
            <section aria-label={`Conditions at ${primary.name}`} className="@container">
              <h2 className="text-body-sm font-medium mb-2.5 px-1" style={{ color: 'var(--text-3)' }}>
                Right now at {primary.name}
              </h2>
              <div className="grid grid-cols-1 gap-3 @min-[18rem]:grid-cols-2 @min-[30rem]:grid-cols-3">
                <StatTile label="Ambient" value={env.ambientC.value} unit="°C" measurement={env.ambientC} />
                <StatTile label="Wind" value={env.windKt.value} unit="kt" measurement={env.windKt} />
                <StatTile
                  label="Load"
                  value={env.loadKw.value}
                  unit="kW"
                  measurement={env.loadKw}
                  className="@min-[18rem]:col-span-2 @min-[30rem]:col-span-1"
                />
              </div>
            </section>

            {/* Selection summary + CTA (FR-9) */}
            <section
              className="p-5"
              style={{
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-card)',
              }}
              aria-label="Selection summary"
            >
              <h2 className="text-title font-semibold mb-3" style={{ color: 'var(--text)' }}>
                Selected zone
              </h2>

              {selectedZoneData && zoneImpact ? (
                <>
                  <p className="text-body font-medium mb-1.5" style={{ color: 'var(--text)' }}>
                    <span className="font-mono" style={{ color: 'var(--text-2)' }}>{selectedZoneData.code}</span>{' '}
                    {selectedZoneData.name}
                  </p>
                  <p className="text-body-sm mb-3 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
                    {zoneImpact.lossPct > 0 ? (
                      <>
                        Holding this zone in {selectedZoneData.status} adds{' '}
                        <span className="font-mono tabular-nums">{zoneImpact.lossPct.toFixed(0)}%</span> envelope loss.
                      </>
                    ) : (
                      'Zone nominal — no modelled autonomy cost.'
                    )}
                  </p>
                  <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }} title="Days of autonomy: now → if the zone stays in this state">
                    Days of autonomy
                  </p>
                  <p className="font-mono text-title tabular-nums">
                    <span style={{ color: 'var(--text-2)' }}>{Math.round(zoneImpact.beforeDays)}</span>
                    <span style={{ color: 'var(--text-3)' }} aria-label="becomes"> → </span>
                    <span style={{ color: zoneImpact.deltaDays < 0 ? 'var(--act-soft)' : 'var(--text)' }}>
                      {Math.round(zoneImpact.afterDays)}
                    </span>
                    <span className="text-body-sm" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}> days</span>
                  </p>
                </>
              ) : (
                <p className="text-body-sm max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
                  Select a zone above to see what leaving it in its current state costs in days of autonomy.
                </p>
              )}

              {/* One CTA, not two. The previous pair both navigated to the
                  same route, and the orange half broke the colour contract —
                  orange means "act on this", never "go here". */}
              <button
                type="button"
                onClick={() => openTwin(primary.id)}
                className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 w-full mt-4 px-4 py-2 min-h-10 rounded-full text-body font-semibold"
                style={{ backgroundColor: 'var(--text)', color: 'var(--bg)' }}
              >
                <Box size={16} aria-hidden />
                Open {primary.name} 3D twin
                {selectedZoneData && (
                  <span className="font-mono text-body-sm px-2 rounded-full" style={{ border: '1px solid currentColor' }}>
                    {selectedZoneData.code}
                  </span>
                )}
              </button>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FR-5.6 / FR-12: the priority bar is proportional to queue depth, T0 first.
 * T0 is mint when clear but ORANGE when anything is queued — a life-safety
 * record waiting for a link is an alarm, not a statistic (Page 6 FR-2.2).
 */
function OutboxStrip({
  outbox, status,
}: { outbox: { tier: string; queued: number }[]; status: string }) {
  const total = outbox.reduce((s, t) => s + t.queued, 0);
  const tone = (tier: string, queued: number) =>
    tier === 'T0' ? (queued > 0 ? 'act' : 'ok')
      : tier === 'T1' ? 'act'
      : tier === 'T2' ? 'watch'
      : 'neutral';

  return (
    <section
      className="px-5 py-4 shrink-0"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Records waiting to sync"
    >
      <div className="flex items-baseline flex-wrap gap-x-4 gap-y-1 mb-3">
        <h2 className="text-title font-semibold" style={{ color: 'var(--text)' }}>
          Records waiting to sync
        </h2>
        <span className="text-body-sm" style={{ color: total > 0 ? 'var(--act-soft)' : 'var(--text-3)' }}>
          <span className="font-mono tabular-nums">{total}</span> queued
        </span>
        <span
          className="ml-auto text-body-sm px-3 py-0.5 rounded-full"
          style={{ color: 'var(--text-2)', backgroundColor: 'var(--panel-raised)', border: '1px solid var(--line)' }}
          title="Current state of the outbox transfer"
        >
          {status}
        </span>
      </div>

      <div className="flex items-center gap-4 min-w-0">
        {outbox.map((t) => (
          <div
            key={t.tier}
            className="flex-1 flex items-center gap-2 min-w-0"
            style={{ flexGrow: Math.max(1, t.queued) }}
            title={`Priority tier ${t.tier} (T0 most urgent): ${t.queued} queued`}
          >
            <span className="font-mono text-body-sm shrink-0" style={{ color: 'var(--text-3)' }}>{t.tier}</span>
            <span className="font-mono text-body-sm tabular-nums shrink-0" style={{ color: 'var(--text-2)' }}>{t.queued}</span>
            <ProgressBar
              value={t.queued}
              max={Math.max(1, ...outbox.map((o) => o.queued))}
              tone={tone(t.tier, t.queued)}
              height={6}
              label={`${t.tier}: ${t.queued} queued`}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
