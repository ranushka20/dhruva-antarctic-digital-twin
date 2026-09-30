// OWNER: Dev B
// PAGE 1 — HQ Overview (route /).
//
// Answers, in this priority order: what needs attention, can each station
// sustain itself, what is the state of both stations, can I trust each
// number, what happened while a station was disconnected.
//
// Actions lead: the Needs attention flag sits beside the page title — the
// position the eye reads first — and opens straight into the Action Centre.
// The page is a summary of both stations; every panel shows only what needs
// a look and links to the page where it is actually worked (Action Centre,
// Logistics, the 3D twin), so nothing here is a dead end or a full list.

import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box } from 'lucide-react';
import { StationComparator } from './StationComparator';
import { NeedsAttention } from './NeedsAttention';
import { ResourceWatch } from './ResourceWatch';
import { ZonesToWatch } from './ZonesToWatch';
import { AntarcticaMap, type MapStation } from '@/components/viz/AntarcticaMap';
import { ProgressBar } from '@/components/shared/ProgressBar';
import { useStationScope } from '@/state/stationScope';
import { useStoreValue, useTick } from '@/state/useStore';
import {
  getStationSummary, getResources, getActions, getActionCounts,
  outboxSummary, envSnapshot, STATION_PROFILES,
} from '@/state/data';
import { getDrainState } from '@/state/sync';
import { formatClockIST } from '@/lib/time';

export default function OverviewPage() {
  const navigate = useNavigate();
  const primaryId = useStationScope((s) => s.primary);
  const compareId = useStationScope((s) => s.compare);
  const setPrimary = useStationScope((s) => s.setPrimary);

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
  // Both stations, always in the same order, so the zones card never jumps
  // when the comparator swaps which one is primary.
  const zoneStations = useMemo(
    () => [primary, compare]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((summary) => ({ summary, env: envSnapshot(summary.id) })),
    [primary, compare]
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

  // The 3D twin is the headline feature, so it gets one canonical entry point
  // that every affordance on this page routes through: the title-row button,
  // the "3D" button on each map chip, a double-click on a map marker, and a
  // zone in "Zones to watch" — which rides along so the twin opens on it.
  const openTwin = useCallback(
    (id: string = primaryId, zone?: string) =>
      navigate(`/stations/${id}/twin` + (zone ? '?zone=' + zone : '')),
    [navigate, primaryId]
  );

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row (FR-2): title, the attention flag, clock, one CTA ---- */}
      <div className="px-6 py-3.5 shrink-0" style={{ borderBottom: '1px solid var(--line)' }}>
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

      </div>

      <div className="@container flex-1 min-h-0 overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-1 gap-5 @min-[56rem]:grid-cols-[minmax(19rem,22rem)_minmax(0,1fr)]">
          {/* Row 1 — both stations: health, contact, what is waiting to come home */}
          <StationComparator
            primary={primary}
            compare={compare}
            onBrief={() => navigate('/handover?station=' + primary.id)}
          />
          <div className="flex flex-col gap-5 min-w-0">
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
                className="absolute left-4 bottom-4 px-3.5 py-1.5 rounded-full text-body-sm pointer-events-none"
                style={{ color: 'var(--text-3)', backgroundColor: 'var(--panel-deep)', border: '1px solid var(--line)' }}
              >
                Double-click a station to open its 3D twin
              </p>
            </section>

            {/* Map footer strip (FR-5.6) — the HQ view of both outboxes */}
            <OutboxStrip outbox={outbox} status={drain.status} />
          </div>

          {/* Row 2 — what to watch: supplies and zones, both stations, each
              a short list that links to where it is worked */}
          <div className="grid grid-cols-1 gap-5 min-w-0 @min-[56rem]:col-span-2 @min-[80rem]:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <ResourceWatch resources={resources} limit={5} />
            <ZonesToWatch stations={zoneStations} onOpenZone={(id, zone) => openTwin(id, zone)} />
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
