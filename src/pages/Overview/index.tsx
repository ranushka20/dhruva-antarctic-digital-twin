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

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, FileText, Search } from 'lucide-react';
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
import { formatClockIST } from '@/lib/time';

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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Title row (FR-2) ---- */}
      <div
        className="flex items-center gap-3 h-[52px] px-6 shrink-0"
        style={{ borderBottom: '1px solid var(--line)' }}
      >
        <h1 className="text-[27px] font-medium" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
          HQ Overview
        </h1>

        <label className="flex items-center gap-2 ml-4 px-3 py-1.5 rounded-full min-w-0 max-w-sm flex-1"
          style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)' }}>
          <Search size={13} style={{ color: 'var(--text-4)' }} aria-hidden />
          <span className="sr-only">Search assets, actions, records</span>
          <input
            readOnly
            onFocus={(e) => { e.currentTarget.blur(); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', ctrlKey: true })); }}
            placeholder="Search assets, actions, records"
            className="flex-1 bg-transparent outline-none text-[12px] min-w-0"
            style={{ color: 'var(--text-2)' }}
          />
          <span className="font-mono text-[8.5px] px-1.5 py-0.5 rounded shrink-0"
            style={{ border: '1px solid var(--line)', color: 'var(--text-4)' }}>
            ⌘ SPACE
          </span>
        </label>

        <div className="flex-1" />

        <span className="font-mono text-[11px] tabular-nums" style={{ color: 'var(--text-2)' }}>
          {formatClockIST()}
        </span>

        <button
          type="button"
          onClick={() => navigate('/actions')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px]"
          style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
        >
          <Filter size={12} /> Filter
        </button>
        <button
          type="button"
          onClick={() => navigate('/compliance')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px]"
          style={{ border: '1px solid var(--line)', color: 'var(--text-2)' }}
        >
          <FileText size={12} /> Reports
        </button>
      </div>

      {/* ---- Three columns; right column drops below centre under 1280px ---- */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5">
        <div className="flex flex-col xl:flex-row gap-3.5 min-h-full">
          {/* LEFT — never hidden at any width */}
          <div className="flex flex-col gap-3.5 w-full xl:w-[320px] xl:shrink-0 order-1">
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
          <div className="flex flex-col gap-3.5 flex-1 min-w-0 order-3 xl:order-2">
            <section
              className="glow-hero glow-map relative overflow-hidden shrink-0"
              style={{ borderRadius: 'var(--r-card)', height: 314 }}
              aria-label="Antarctica map"
            >
              <AntarcticaMap
                stations={mapStations}
                primaryId={primaryId}
                onSelect={setPrimary}
              />
            </section>

            {/* Map footer strip (FR-5.6) — the HQ view of both outboxes */}
            <OutboxStrip outbox={outbox} status={drain.status} />

            <div className="flex-1 min-h-[260px] flex">
              <ResourceWatch resources={resources} />
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-3.5 w-full xl:w-[342px] xl:shrink-0 order-2 xl:order-3">
            <DegradableSurface syncState={primary.sync.state}>
              <StationZonesPanel
                stationName={primary.name}
                zones={primary.zones}
                selectedCode={selectedZone}
                onSelect={(code) => setSelectedZone((c) => (c === code ? null : code))}
              />
            </DegradableSurface>

            {/* Environment stat trio (FR-8) */}
            <div className="grid grid-cols-3 gap-2.5">
              <StatTile label="Ambient" value={env.ambientC.value} unit="°C" measurement={env.ambientC} />
              <StatTile label="Wind" value={env.windKt.value} unit="kt" measurement={env.windKt} />
              <StatTile label="Load" value={env.loadKw.value} unit="kW" measurement={env.loadKw} />
            </div>

            {/* Selection summary + CTA (FR-9) */}
            <section
              className="p-4"
              style={{
                backgroundColor: 'var(--panel)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--r-card)',
              }}
              aria-label="Selection summary"
            >
              <p className="font-mono text-[9px] uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--text-4)' }}>
                Selection
              </p>

              {selectedZoneData && zoneImpact ? (
                <>
                  <p className="text-[14px] font-semibold mb-1" style={{ fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                    {selectedZoneData.code} {selectedZoneData.name}
                  </p>
                  <p className="text-[11.5px] mb-2" style={{ color: 'var(--text-3)' }}>
                    {zoneImpact.lossPct > 0
                      ? `Holding this zone in ${selectedZoneData.status} adds ${zoneImpact.lossPct.toFixed(0)}% envelope loss.`
                      : 'Zone nominal — no modelled autonomy cost.'}
                  </p>
                  <p className="font-mono text-[15px] tabular-nums">
                    <span style={{ color: 'var(--text-2)' }}>{Math.round(zoneImpact.beforeDays)}</span>
                    <span style={{ color: 'var(--text-4)' }}> → </span>
                    <span style={{ color: zoneImpact.deltaDays < 0 ? 'var(--act-soft)' : 'var(--text)' }}>
                      {Math.round(zoneImpact.afterDays)} d
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-[11.5px]" style={{ color: 'var(--text-3)' }}>
                  Select a zone to see what leaving it in its current state costs in days of autonomy.
                </p>
              )}

              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/stations/${primary.id}/twin` + (selectedZone ? '?zone=' + selectedZone : '')
                    )
                  }
                  className="flex-1 py-2.5 rounded-full text-[12.5px] font-medium"
                  style={{ backgroundColor: 'var(--text)', color: 'var(--bg)' }}
                >
                  Open 3D twin
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      `/stations/${primary.id}/twin` + (selectedZone ? '?zone=' + selectedZone : '')
                    )
                  }
                  className="px-4 py-2.5 rounded-full text-[12.5px] font-medium shrink-0"
                  style={{ backgroundColor: 'var(--act)', color: 'var(--bg)' }}
                >
                  {primary.name} →
                </button>
              </div>
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
    <div
      className="flex items-center gap-4 px-4 py-2.5 shrink-0"
      style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--r-inner)' }}
    >
      <span className="font-mono text-[9px] uppercase tracking-[0.12em] shrink-0" style={{ color: 'var(--text-4)' }}>
        Records pending
      </span>
      <span className="font-mono text-[11.5px] tabular-nums shrink-0" style={{ color: total > 0 ? 'var(--act-soft)' : 'var(--text-2)' }}>
        {total} queued
      </span>

      <div className="flex-1 flex items-center gap-1.5 min-w-[120px]">
        {outbox.map((t) => (
          <div key={t.tier} className="flex-1 flex items-center gap-1.5" style={{ flexGrow: Math.max(1, t.queued) }}>
            <span className="font-mono text-[8.5px] shrink-0" style={{ color: 'var(--text-4)' }}>{t.tier}</span>
            <ProgressBar
              value={t.queued}
              max={Math.max(1, ...outbox.map((o) => o.queued))}
              tone={tone(t.tier, t.queued)}
              height={4}
              label={`${t.tier}: ${t.queued} queued`}
            />
          </div>
        ))}
      </div>

      <span className="font-mono text-[9.5px] tracking-[0.06em] shrink-0" style={{ color: 'var(--text-3)' }}>
        {status}
      </span>
    </div>
  );
}
