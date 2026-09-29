// OWNER: Dev B
// PAGE 1 — HQ Overview (route /).
//
// Answers, in this priority order: what needs attention, can each station
// sustain itself, what is the state of both stations, can I trust each
// number, what happened while a station was disconnected.
//
// Actions lead: the Needs attention flag sits beside the page title — the
// position the eye reads first — and opens straight into the Action Centre.
// Everything else is split into three tabs so no screen carries more than
// one question at a time; each tab label carries its own alert count, so
// nothing urgent hides behind a tab.

import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box } from 'lucide-react';
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

type OverviewTab = 'stations' | 'supplies' | 'zones';
const TABS: OverviewTab[] = ['stations', 'supplies', 'zones'];

export default function OverviewPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab') as OverviewTab | null;
  const tab: OverviewTab = tabParam && TABS.includes(tabParam) ? tabParam : 'stations';
  const setTab = (next: OverviewTab) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'stations') params.delete('tab'); else params.set('tab', next);
    setSearchParams(params, { replace: true });
  };
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
  const reorderCount = resources.filter((r) => r.belowReorder).length;
  const zoneWarnings = primary.zones.filter((z) => z.status === 'warning').length;

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
      {/* ---- Title row (FR-2): title, the attention flag, clock, one CTA ---- */}
      <div className="px-6 pt-3.5 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="flex items-center flex-wrap gap-x-4 gap-y-3">
          <h1 className="text-display font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            HQ Overview
          </h1>

          <NeedsAttention actions={openActions} unacked={counts.unacked} />

          <div className="ml-auto flex items-center flex-wrap gap-x-4 gap-y-2">
            <span
              className="font-mono text-body-sm tabular-nums"
              style={{ color: 'var(--text-2)' }}
              title="Current time, India Standard Time"
            >
              {formatClockIST()}
            </span>
            {/* The product's headline feature keeps its place in the title row. */}
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

        {/* ---- Tabs: one question per screen ---- */}
        <div className="flex items-end gap-1 mt-3 -mb-px overflow-x-auto" role="tablist" aria-label="Overview sections">
          <OverviewTabButton id="stations" active={tab} onSelect={setTab} label="Both stations" />
          <OverviewTabButton
            id="supplies"
            active={tab}
            onSelect={setTab}
            label="Supplies"
            badge={reorderCount > 0 ? `${reorderCount} to reorder` : undefined}
          />
          <OverviewTabButton
            id="zones"
            active={tab}
            onSelect={setTab}
            label={`${primary.name} zones`}
            badge={zoneWarnings > 0 ? `${zoneWarnings} warning${zoneWarnings === 1 ? '' : 's'}` : undefined}
          />
        </div>
      </div>

      <div className="@container flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div key={tab} className="m-panel min-h-full">
          {tab === 'stations' && (
            // Both stations side by side: are they healthy, are they in contact,
            // and what is still waiting to come home.
            <div className="grid grid-cols-1 gap-5 @min-[56rem]:grid-cols-[minmax(19rem,22rem)_minmax(0,1fr)]">
              <StationComparator
                primary={primary}
                compare={compare}
                onBrief={() => navigate('/handover?station=' + primary.id)}
              />
              <div className="flex flex-col gap-5 min-w-0">
                <section
                  className="glow-hero glow-map relative overflow-hidden shrink-0 h-[22rem] 2xl:h-[26rem]"
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
                    className="absolute left-4 bottom-4 px-3.5 py-1.5 rounded-full text-body-sm pointer-events-none"
                    style={{ color: 'var(--text-3)', backgroundColor: 'var(--panel-deep)', border: '1px solid var(--line)' }}
                  >
                    Double-click a station to open its 3D twin
                  </p>
                </section>

                {/* Map footer strip (FR-5.6) — the HQ view of both outboxes */}
                <OutboxStrip outbox={outbox} status={drain.status} />
              </div>
            </div>
          )}

          {tab === 'supplies' && <ResourceWatch resources={resources} />}

          {tab === 'zones' && (
            <div className="grid grid-cols-1 gap-5 @min-[56rem]:grid-cols-[minmax(20rem,26rem)_minmax(0,1fr)]">
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

              <div className="flex flex-col gap-5 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-body-sm" style={{ color: 'var(--text-3)' }}>Station</span>
                  <div className="flex items-center gap-1 p-1 rounded-full" style={{ border: '1px solid var(--line-strong)' }} role="group" aria-label="Station">
                    {(['bharati', 'maitri'] as const).map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => { setPrimary(id); setSelectedZone(null); }}
                        aria-pressed={primaryId === id}
                        className="px-4 min-h-9 rounded-full text-body-sm font-medium"
                        style={{
                          backgroundColor: primaryId === id ? 'var(--text)' : 'transparent',
                          color: primaryId === id ? 'var(--bg)' : 'var(--text-2)',
                        }}
                      >
                        {STATION_PROFILES[id].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Environment stat trio (FR-8) */}
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

                <SelectedZoneCard
                  zone={selectedZoneData}
                  impact={zoneImpact}
                  stationName={primary.name}
                  onOpenTwin={() => openTwin(primary.id)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewTabButton({
  id, active, onSelect, label, badge,
}: {
  id: OverviewTab; active: OverviewTab; onSelect: (id: OverviewTab) => void;
  label: string; badge?: string;
}) {
  const selected = id === active;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={() => onSelect(id)}
      className="inline-flex items-center gap-2.5 px-4 min-h-11 text-body font-medium whitespace-nowrap hover:text-[var(--text)]"
      style={{
        color: selected ? 'var(--text)' : 'var(--text-3)',
        borderBottom: `2px solid ${selected ? 'var(--text)' : 'transparent'}`,
      }}
    >
      {label}
      {badge && (
        <span
          className="text-body-sm px-2.5 py-0.5 rounded-full"
          style={{ color: 'var(--act-soft)', border: '1px solid rgba(242,107,33,0.45)' }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/** Selection summary + CTA (FR-9). */
function SelectedZoneCard({
  zone, impact, stationName, onOpenTwin,
}: {
  zone: { code: string; name: string; status: string } | null;
  impact: { lossPct: number; beforeDays: number; afterDays: number; deltaDays: number } | null;
  stationName: string;
  onOpenTwin: () => void;
}) {
  return (
    <section
      className="p-5"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-card)' }}
      aria-label="Selection summary"
    >
      <h2 className="text-title font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Selected zone
      </h2>

      {zone && impact ? (
        <>
          <p className="text-body font-medium mb-1.5" style={{ color: 'var(--text)' }}>
            <span className="font-mono" style={{ color: 'var(--text-2)' }}>{zone.code}</span>{' '}
            {zone.name}
          </p>
          <p className="text-body-sm mb-3 max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
            {impact.lossPct > 0 ? (
              <>
                Holding this zone in {zone.status} adds{' '}
                <span className="font-mono tabular-nums">{impact.lossPct.toFixed(0)}%</span> envelope loss.
              </>
            ) : (
              'Zone nominal — no modelled autonomy cost.'
            )}
          </p>
          <p className="text-body-sm mb-1" style={{ color: 'var(--text-3)' }} title="Days of autonomy: now → if the zone stays in this state">
            Days of autonomy
          </p>
          <p className="font-mono text-title tabular-nums">
            <span style={{ color: 'var(--text-2)' }}>{Math.round(impact.beforeDays)}</span>
            <span style={{ color: 'var(--text-3)' }} aria-label="becomes"> → </span>
            <span style={{ color: impact.deltaDays < 0 ? 'var(--act-soft)' : 'var(--text)' }}>
              {Math.round(impact.afterDays)}
            </span>
            <span className="text-body-sm" style={{ color: 'var(--text-3)', fontFamily: 'var(--font-body)' }}> days</span>
          </p>
        </>
      ) : (
        <p className="text-body-sm max-w-[70ch]" style={{ color: 'var(--text-3)' }}>
          Select a zone to see what leaving it in its current state costs in days of autonomy.
        </p>
      )}

      {/* One CTA, not two — orange means "act on this", never "go here". */}
      <button
        type="button"
        onClick={onOpenTwin}
        className="flex items-center justify-center flex-wrap gap-x-2 gap-y-1 w-full mt-4 px-4 py-2 min-h-10 rounded-full text-body font-semibold"
        style={{ backgroundColor: 'var(--text)', color: 'var(--bg)' }}
      >
        <Box size={16} aria-hidden />
        Open {stationName} 3D twin
        {zone && (
          <span className="font-mono text-body-sm px-2 rounded-full" style={{ border: '1px solid currentColor' }}>
            {zone.code}
          </span>
        )}
      </button>
    </section>
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
