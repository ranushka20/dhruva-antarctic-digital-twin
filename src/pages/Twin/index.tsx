// OWNER: Dev A
// Route: /stations/:id/twin

import { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy, type RefObject } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, GripVertical } from 'lucide-react';
import { PageHeader } from '@/components/shell/PageHeader';
import { IsoStationModel } from '@/components/viz/IsoStationModel';
import { ZoneTrace } from '@/components/shared/ZoneTrace';
import { StatusDot } from '@/components/shared/StatusDot';
import { ProvenanceBadge } from '@/components/shared/ProvenanceBadge';
import { PanelLoader } from '@/components/shared/Loading';
import { StepDialog } from '@/components/shared/StepDialog';
import {
  type Action,
  type Measurement,
  type ZoneModel,
  type ZoneStatus,
} from '@/shared/contracts';
import { causalTraceInput, getActions, getResources } from '@/state/data';
import { useStoreValue } from '@/state/useStore';
import { useCan } from '@/state/auth';
import { useSyncInfo } from '@/state/connectivity';
import { formatAge } from '@/lib/time';
import { FLOORS, floorsForZone, getRoom, roomsForZone, twinZoneStatus, zoneForRoom } from '@/twin/zoneRooms';
import { roomTraceProfile } from '@/twin/roomProfiles';
import { zoneSubject } from '@/twin/zoneSubject';
import { runZoneTrace } from '@/engine/zoneTrace';

// Lazy load the existing 3D model
const Bharati3D = lazy(() => import('@/twin/Bharati3D'));

const STATUS_WORD: Record<ZoneStatus, string> = {
  ok: 'Normal',
  watch: 'Watch',
  warning: 'Needs action',
  unknown: 'No data',
};

const STATUS_COLOR: Record<ZoneStatus, string> = {
  ok: 'var(--text-3)',
  watch: 'var(--watch-soft)',
  warning: 'var(--act-soft)',
  unknown: 'var(--text-3)',
};

// Worst first, so whatever needs attention sits at the top of every list.
const SEVERITY: Record<ZoneStatus, number> = { warning: 0, watch: 1, unknown: 2, ok: 3 };
const bySeverity = (a: ZoneModel, b: ZoneModel) => SEVERITY[a.status] - SEVERITY[b.status];

const ACTION_STATE_WORD: Record<Action['state'], string> = {
  RAISED: 'Waiting to be acknowledged',
  ACKNOWLEDGED: 'Acknowledged',
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'Being worked on',
  RESOLVED: 'Resolved',
  DEFERRED: 'Deferred',
};

const floorLabel = (id: string) => FLOORS.find((f) => f.id === id)?.label ?? '';

function floorsInWords(floorIds: string[]): string {
  const labels = floorIds.map(floorLabel);
  if (labels.length < 2) return labels[0] ?? '';
  return `${labels[0]} and ${labels.slice(1).join(', ').toLowerCase()}`;
}

function ageInWords(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  if (hours < 1) return 'less than an hour ago';
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

// "COIL TEMP MAX" → "Coil temp max"
const sentenceCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

// How much the 3D fades as HQ's picture of the station ages (0 = crisp).
const STALENESS: Record<'LIVE' | 'LAGGING' | 'DARK', number> = { LIVE: 0, LAGGING: 0.4, DARK: 0.85 };

// Side panels can be dragged wider or narrower. Until someone does, they keep
// their responsive default widths; the viewport-width cap keeps the 3D usable
// on smaller screens even with a remembered width.
const LEFT_PANEL = { key: 'twin.leftPanelWidth', min: 224, max: 448, maxVw: 0.3, className: 'w-[17rem] xl:w-[19rem]' };
const RIGHT_PANEL = { key: 'twin.rightPanelWidth', min: 320, max: 672, maxVw: 0.42, className: 'w-[22rem] xl:w-[24rem] 2xl:w-[27rem]' };

export default function TwinPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const zoneParam = searchParams.get('zone');
  const navigate = useNavigate();
  const stationId = id === 'maitri' ? 'maitri' : 'bharati';
  const stationName = stationId === 'maitri' ? 'Maitri' : 'Bharati';
  const has3D = stationId === 'bharati'; // Only Bharati has a 3D model

  // --- State ---
  const [stationData, setStationData] = useState<any>(null); // Full mock data
  const [renderMode, setRenderMode] = useState<'svg' | '3d'>(has3D ? '3d' : 'svg');
  const [floor, setFloor] = useState('ground');
  // Which floor's zone list is open. Separate from `floor` so the list can be
  // folded away while the 3D keeps showing that floor.
  const [expandedFloor, setExpandedFloor] = useState<string | null>('ground');
  const [selectedZone, setSelectedZone] = useState<string | undefined>();
  // Set only when a room is clicked in the 3D; otherwise the selected zone's
  // own room on this floor is the one highlighted.
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [ackError, setAckError] = useState<string | null>(null);

  const showFloors = has3D && renderMode === '3d';

  // --- Fetch Mock Data ---
  useEffect(() => {
    let cancelled = false;
    async function loadData() {
      try {
        const data = await import(`../../mock/${stationId}.json`);
        if (cancelled) return;
        const zones: ZoneModel[] = data.default.zones ?? [];
        // Open on the zone the Overview linked to, else the most urgent one.
        const initial = zones.find((z) => z.code === zoneParam) ?? [...zones].sort(bySeverity)[0];
        setStationData(data.default);
        setRenderMode(has3D ? '3d' : 'svg');
        setSelectedZone(initial?.code);
        setSelectedRoomId(undefined);
        const startFloor = (initial && floorsForZone(initial.code)[0]) ?? 'ground';
        setFloor(startFloor);
        setExpandedFloor(startFloor);
      } catch (err) {
        console.error("Failed to load mock data:", err);
      }
    }
    loadData();
    return () => {
      cancelled = true;
    };
  }, [stationId, has3D, zoneParam]);

  // --- Live store: open actions and supplies agree with / and /logistics ---
  const actions = useStoreValue(() => getActions(stationId));
  const resources = useStoreValue(() => getResources(stationId));
  const canAck = useCan('action.transition');
  // Acknowledging asks for a note like everywhere else (touchpoint #1).
  const [ackId, setAckId] = useState<string | null>(null);

  // --- Link state from /comms: the 3D fades and bannered when HQ is behind ---
  const syncInfo = useSyncInfo(stationId);
  const twinSync = {
    state: syncInfo.state.toLowerCase(),
    staleness: STALENESS[syncInfo.state],
    label: formatAge(syncInfo.ageSeconds),
  };

  // --- Resizable side panels ---
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [leftWidth, setLeftWidth] = usePanelWidth(LEFT_PANEL);
  const [rightWidth, setRightWidth] = usePanelWidth(RIGHT_PANEL);

  // --- Derived Data ---
  const zones: ZoneModel[] = useMemo(() => stationData?.zones ?? [], [stationData]);
  const twinStatus = useMemo(() => twinZoneStatus(zones), [zones]);

  const zonesOnFloor = useCallback(
    (floorId: string) => zones.filter((z) => floorsForZone(z.code).includes(floorId)).sort(bySeverity),
    [zones],
  );

  const activeZone = zones.find((z) => z.code === selectedZone) ?? null;
  const clickedRoom = selectedRoomId ? getRoom(selectedRoomId) : undefined;

  // Same rule as the Action Centre drawer (touchpoint #10): one helper decides
  // which story a zone tells, so the two pages can't drift apart.
  const zoneProfile = (zone: ZoneModel) => zoneSubject(stationId, zone.code)?.trace;

  const highlightRoom = useMemo(() => {
    const room = selectedRoomId ? getRoom(selectedRoomId) : undefined;
    if (room?.floorId === floor) return room;
    return selectedZone ? roomsForZone(selectedZone, floor)[0] ?? null : null;
  }, [selectedRoomId, selectedZone, floor]);

  const openActionsFor = (code: string) => actions.filter((a) => a.isOpen && a.zoneCode === code);
  const zoneActions = activeZone ? openActionsFor(activeZone.code) : [];
  const shortestSupply = [...resources].sort((a, b) => a.autonomyDays - b.autonomyDays)[0];

  // The one shared builder (touchpoint #10), so the station figures here match
  // the Action Centre drawer, Environment and the Sandbox baseline.
  const traceInput = useStoreValue(() => causalTraceInput(stationId));

  // Each of the zone's rooms with its share of the station's fuel, from the engine.
  type TwinRoom = { id: string; name: string; floorId: string };
  const zoneRoomList: { room: TwinRoom; share: Measurement }[] =
    activeZone && has3D
      ? roomsForZone(activeZone.code).flatMap((room: TwinRoom) => {
          const profile = roomTraceProfile(room.id);
          return profile ? [{ room, share: runZoneTrace(traceInput, profile).zone.sharePct }] : [];
        })
      : [];

  // --- Selection: one shared state for the list and the 3D (FR-3.4) ---
  const chooseZone = (code: string) => {
    setSelectedZone(code);
    setSelectedRoomId(undefined);
    setAckError(null);
    const floors = floorsForZone(code);
    if (showFloors && floors.length && !floors.includes(floor)) {
      setFloor(floors[0]);
      setExpandedFloor(floors[0]);
    }
  };

  const chooseFloor = (next: string) => {
    // The floor already in view just opens or folds its zone list.
    if (next === floor) {
      setExpandedFloor(expandedFloor === next ? null : next);
      return;
    }
    setFloor(next);
    setExpandedFloor(next);
    setSelectedRoomId(undefined);
    setAckError(null);
    if (selectedZone && floorsForZone(selectedZone).includes(next)) return;
    setSelectedZone(zonesOnFloor(next)[0]?.code);
  };

  const chooseRenderMode = (mode: 'svg' | '3d') => {
    setRenderMode(mode);
    if (mode !== '3d' || !selectedZone) return;
    const floors = floorsForZone(selectedZone);
    if (floors.length && !floors.includes(floor)) {
      setFloor(floors[0]);
      setExpandedFloor(floors[0]);
    }
  };

  const chooseRoom = (room: { id: string; floorId: string }) => {
    setSelectedRoomId(room.id);
    setAckError(null);
    if (showFloors && room.floorId !== floor) {
      setFloor(room.floorId);
      setExpandedFloor(room.floorId);
    }
  };

  const onRoomSelect = useCallback((room: { id: string; floorId?: string } | null) => {
    if (!room) return; // a click on empty space keeps the inspector as it was
    setSelectedRoomId(room.id);
    setSelectedZone(zoneForRoom(room.id));
    if (room.floorId) setExpandedFloor(room.floorId);
    setAckError(null);
  }, []);

  const acknowledge = (actionId: string) => {
    setAckError(null);
    setAckId(actionId);
  };

  if (!stationData) return <PanelLoader label="Loading station twin" />;

  const segBtn = (active: boolean) =>
    `px-4 min-h-10 text-body-sm font-medium rounded-full transition-colors ${
      active ? 'bg-[var(--panel-raised)] text-[var(--text)]' : 'text-[var(--text-3)] hover:text-[var(--text-2)]'
    }`;

  const zoneRow = (zone: ZoneModel) => (
    <ZoneRow
      key={zone.code}
      zone={zone}
      selected={selectedZone === zone.code}
      openCount={openActionsFor(zone.code).length}
      onSelect={() => chooseZone(zone.code)}
    />
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg)] overflow-hidden">
      {/* Header */}
      <PageHeader
        title={`${stationName} Digital Twin`}
        backTo="/"
        backLabel="HQ"
        className="bg-[var(--panel)]"
        rightContent={
          <div className="flex gap-4 items-center flex-wrap">
            <div
              className="flex gap-1 bg-[var(--bg)] rounded-full border border-[var(--line)] p-1"
              role="group"
              aria-label="Station"
            >
              <button
                onClick={() => navigate('/stations/bharati/twin')}
                className={segBtn(stationId === 'bharati')}
                aria-pressed={stationId === 'bharati'}
              >
                Bharati
              </button>
              <button
                onClick={() => navigate('/stations/maitri/twin')}
                className={segBtn(stationId === 'maitri')}
                aria-pressed={stationId === 'maitri'}
              >
                Maitri
              </button>
            </div>

            {has3D && (
              <div
                className="flex gap-1 bg-[var(--bg)] rounded-full border border-[var(--line)] p-1"
                role="group"
                aria-label="View"
              >
                <button
                  onClick={() => chooseRenderMode('3d')}
                  className={segBtn(renderMode === '3d')}
                  aria-pressed={renderMode === '3d'}
                  title="Rooms floor by floor, in 3D"
                >
                  3D model
                </button>
                <button
                  onClick={() => chooseRenderMode('svg')}
                  className={segBtn(renderMode === 'svg')}
                  aria-pressed={renderMode === 'svg'}
                  title="All zones in one simple diagram"
                >
                  Diagram
                </button>
              </div>
            )}
          </div>
        }
      />

      {/* Main Content: 3 Columns */}
      <div className="flex-1 flex overflow-hidden">

        {/* Left Column: floors and their zones, then supplies */}
        <div
          ref={leftRef}
          style={panelStyle(leftWidth, LEFT_PANEL)}
          className={`relative ${leftWidth ? '' : LEFT_PANEL.className} border-r border-[var(--line)] bg-[var(--panel)] flex flex-col shrink-0`}
        >
          <ResizeHandle
            edge="right"
            panelRef={leftRef}
            limits={LEFT_PANEL}
            onResize={setLeftWidth}
            label="Resize the floors and zones panel"
          />
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            {showFloors ? (
              <>
                <h2 className="text-body-sm font-medium text-[var(--text-3)] px-1 mb-2">Floors</h2>
                <ul className="flex flex-col gap-2">
                  {FLOORS.map((f) => {
                    const here = zonesOnFloor(f.id);
                    const inView = floor === f.id;
                    const open = expandedFloor === f.id;
                    const worst = here[0]?.status;
                    return (
                      <li
                        key={f.id}
                        className={`rounded-xl border ${
                          inView ? 'border-[var(--line-strong)] bg-[var(--bg)]' : 'border-[var(--line)]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => chooseFloor(f.id)}
                          aria-expanded={open}
                          aria-current={inView ? 'true' : undefined}
                          title={
                            inView
                              ? open ? 'Hide this floor’s zones' : 'Show this floor’s zones'
                              : `Show the ${f.label.toLowerCase()} in the model`
                          }
                          className="w-full flex items-center gap-3 px-4 min-h-12 text-left rounded-xl hover:bg-[var(--panel-raised)]"
                        >
                          <span className="flex-1 min-w-0">
                            <span className="block text-body font-semibold text-[var(--text)]">{f.label}</span>
                            {inView && !open && (
                              <span className="block text-body-sm text-[var(--text-3)]">Shown in the model</span>
                            )}
                          </span>
                          {!open && worst && worst !== 'ok' && (
                            <span title={`A zone on this floor: ${STATUS_WORD[worst]}`}>
                              <StatusDot status={worst} size={9} />
                            </span>
                          )}
                          <span className="text-body-sm text-[var(--text-3)]">
                            <span className="font-mono">{here.length}</span> {here.length === 1 ? 'zone' : 'zones'}
                          </span>
                          <ChevronDown
                            aria-hidden
                            className={`size-4 shrink-0 text-[var(--text-3)] transition-transform ${open ? 'rotate-180' : ''}`}
                          />
                        </button>
                        {open && (
                          <div className="px-2 pb-2 flex flex-col gap-1">
                            {here.length > 0 ? (
                              here.map(zoneRow)
                            ) : (
                              <p className="px-3 py-2 text-body-sm text-[var(--text-3)]">
                                No monitored zones on this floor.
                              </p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <>
                <h2 className="text-body-sm font-medium text-[var(--text-3)] px-1 mb-2">Zones</h2>
                <div className="flex flex-col gap-1">{[...zones].sort(bySeverity).map(zoneRow)}</div>
              </>
            )}
          </div>

          {shortestSupply && (
            <div className="p-4 border-t border-[var(--line)] bg-[var(--bg)]">
              <h2 className="text-body-sm font-medium text-[var(--text-3)] mb-1">Supplies</h2>
              <p className="text-body text-[var(--text)]">
                {shortestSupply.name} lasts about{' '}
                <span
                  className="font-mono font-semibold whitespace-nowrap"
                  style={{
                    color:
                      shortestSupply.risk === 'ok'
                        ? 'var(--text)'
                        : shortestSupply.risk === 'watch'
                          ? 'var(--watch-soft)'
                          : 'var(--act-soft)',
                  }}
                  title="Days of supply left at the current rate of use, with its uncertainty"
                >
                  {Math.round(shortestSupply.autonomyDays)} ±{Math.round(shortestSupply.autonomyBandDays)}
                </span>{' '}
                days
              </p>
              <p className="mt-1 text-body-sm text-[var(--text-3)]">
                The shortest of <span className="font-mono">{resources.length}</span> supplies.{' '}
                <Link to="/logistics" className="underline underline-offset-2 hover:text-[var(--text-2)]">
                  See all
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Centre Column: Render Viewport */}
        <div className="flex-1 min-w-[20rem] relative bg-[var(--bg)] overflow-hidden flex flex-col">
          {/* Capped short of the 3D's top-right "Zone model" badge, so on a
              narrow viewport the legend wraps instead of sliding under it. */}
          <div className="absolute top-4 left-4 z-10 max-w-[calc(100%-18rem)] bg-[var(--panel)] border border-[var(--line)] rounded-xl px-4 py-2 text-body-sm text-[var(--text-2)] flex items-center gap-x-4 gap-y-1 flex-wrap">
            {(['ok', 'watch', 'warning', 'unknown'] as const).map((s) => (
              <span key={s} className="flex items-center gap-2">
                <StatusDot status={s} size={10} />
                {STATUS_WORD[s]}
              </span>
            ))}
          </div>

          {renderMode === 'svg' ? (
            <IsoStationModel
               zones={zones}
               selectedZoneCode={selectedZone}
               onZoneSelect={chooseZone}
               colorMode="status"
               className="flex-1"
            />
          ) : (
            <div className="flex-1 relative">
               <Suspense fallback={<PanelLoader label="Loading 3D model" />}>
                 <Bharati3D
                   floor={floor}
                   onSelectAsset={onRoomSelect}
                   selectedAsset={highlightRoom}
                   zoneStatus={twinStatus}
                   sync={twinSync}
                 />
               </Suspense>
            </div>
          )}
        </div>

        {/* Right Column: Zone Inspector */}
        <div
          ref={rightRef}
          style={panelStyle(rightWidth, RIGHT_PANEL)}
          className={`relative ${rightWidth ? '' : RIGHT_PANEL.className} border-l border-[var(--line)] bg-[var(--panel)] shrink-0`}
        >
          <ResizeHandle
            edge="left"
            panelRef={rightRef}
            limits={RIGHT_PANEL}
            onResize={setRightWidth}
            label="Resize the zone details panel"
          />
          <div className="h-full overflow-y-auto">
          {activeZone || clickedRoom ? (
            <div className="p-5 flex flex-col gap-6">
              <header>
                <p className="text-body-sm text-[var(--text-3)]">
                  {clickedRoom ? (
                    <>
                      {floorLabel(clickedRoom.floorId)}
                      {activeZone ? (
                        <>
                          {' · in '}
                          <button
                            type="button"
                            onClick={() => chooseZone(activeZone.code)}
                            className="underline underline-offset-2 hover:text-[var(--text-2)]"
                            title={`Show all of ${activeZone.name}`}
                          >
                            {activeZone.name}
                          </button>
                        </>
                      ) : (
                        ' · not in a monitored zone'
                      )}
                    </>
                  ) : (
                    activeZone && (
                      <>
                        {has3D && `${floorsInWords(floorsForZone(activeZone.code))} · `}
                        Zone <span className="font-mono">{activeZone.code}</span>
                      </>
                    )
                  )}
                </p>
                <h2
                  className="mt-1 text-display font-semibold text-[var(--text)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {clickedRoom?.name ?? activeZone?.name}
                </h2>
                {activeZone ? (
                  <p className="mt-2 flex items-center gap-2 text-body font-medium" style={{ color: STATUS_COLOR[activeZone.status] }}>
                    <StatusDot status={activeZone.status} size={10} />
                    {STATUS_WORD[activeZone.status]}
                    {zoneActions.length > 0 && (
                      <span className="font-normal text-[var(--text-3)]">
                        · <span className="font-mono">{zoneActions.length}</span> open action
                        {zoneActions.length === 1 ? '' : 's'} below
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="mt-2 flex items-center gap-2 text-body font-medium text-[var(--text-3)]">
                    <StatusDot status="unknown" size={10} />
                    Not monitored yet
                  </p>
                )}
              </header>

              {/* Engine Coupling: this zone's or room's own trace */}
              <ZoneTrace
                input={traceInput}
                subject={
                  clickedRoom
                    ? { status: activeZone?.status ?? 'unknown', trace: roomTraceProfile(clickedRoom.id) }
                    : { status: activeZone?.status ?? 'unknown', trace: activeZone ? zoneProfile(activeZone) : undefined }
                }
                kind={clickedRoom ? 'room' : 'zone'}
              />

              {!clickedRoom && zoneRoomList.length > 1 && (
                <section>
                  <h3 className="text-title font-medium text-[var(--text)] mb-3">Rooms</h3>
                  <ul className="rounded-xl border border-[var(--line)] bg-[var(--bg)] divide-y divide-[var(--line)]">
                    {zoneRoomList.map(({ room, share }) => (
                      <li key={room.id} className="flex items-center gap-2 pr-4">
                        <button
                          type="button"
                          onClick={() => chooseRoom(room)}
                          className="flex-1 min-w-0 flex flex-col items-start px-4 py-2.5 min-h-12 text-left rounded-xl hover:bg-[var(--panel-raised)]"
                        >
                          <span className="text-body font-medium text-[var(--text)]">{room.name}</span>
                          <span className="text-body-sm text-[var(--text-3)]">{floorLabel(room.floorId)}</span>
                        </button>
                        <span
                          className="font-mono text-body tabular-nums text-[var(--text)] whitespace-nowrap"
                          title="Share of the station's fuel"
                        >
                          {Math.round(Number(share.value))}%
                        </span>
                        <ProvenanceBadge
                          measurement={share}
                          label={`${room.name}: share of the station's fuel`}
                          abbreviated
                          align="right"
                        />
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-body-sm text-[var(--text-3)]">
                    Each room's share of the station's fuel. Choose one for its own figures.
                  </p>
                </section>
              )}

              {!activeZone && (
                <p className="text-body text-[var(--text-2)]">
                  This room is not part of a monitored zone, so there are no readings or actions for it yet.
                </p>
              )}

              {activeZone && (
              <>
              <section>
                <h3 className="text-title font-medium text-[var(--text)] mb-3">Equipment</h3>
                {activeZone.assets.length === 0 ? (
                  <p className="text-body-sm text-[var(--text-3)]">No connected equipment in this zone.</p>
                ) : (
                  <ul className="rounded-xl border border-[var(--line)] bg-[var(--bg)] divide-y divide-[var(--line)]">
                    {activeZone.assets.map((asset) => (
                      <li key={asset.id} className="px-4 py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-body font-medium text-[var(--text)]">{asset.name}</p>
                          <p className="mt-0.5 text-body-sm" style={{ color: STATUS_COLOR[asset.status] }}>
                            {STATUS_WORD[asset.status]}
                            {asset.threshold && (
                              <span className="text-[var(--text-3)]">
                                {' · '}
                                {sentenceCase(asset.threshold.label)}{' '}
                                <span className="font-mono whitespace-nowrap">
                                  {asset.threshold.value} {asset.threshold.unit}
                                </span>
                              </span>
                            )}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className="font-mono text-title font-medium text-[var(--text)] whitespace-nowrap">
                            {asset.current.value}
                            <span className="text-body-sm text-[var(--text-3)]"> {asset.current.unit}</span>
                          </span>
                          <ProvenanceBadge measurement={asset.current} label={asset.name} abbreviated align="right" />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-title font-medium text-[var(--text)] mb-3">Open actions</h3>
                {zoneActions.length === 0 ? (
                  <p className="text-body-sm text-[var(--text-3)]">No open actions in this zone.</p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {zoneActions.map((a) => (
                      <li
                        key={a.id}
                        className="rounded-xl border bg-[var(--bg)] p-4"
                        style={{ borderColor: a.isUnacked ? 'rgba(242,107,33,0.35)' : 'var(--line)' }}
                      >
                        <p className="text-body font-medium text-[var(--text)]">{a.title}</p>
                        <p className="mt-1 text-body-sm text-[var(--text-3)]">
                          {a.state === 'ASSIGNED' && a.assignee
                            ? `Assigned to ${a.assignee.name}`
                            : ACTION_STATE_WORD[a.state]}{' '}
                          · raised {ageInWords(a.ageSeconds)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {a.isUnacked && canAck && (
                            <button
                              type="button"
                              onClick={() => acknowledge(a.id)}
                              className="min-h-10 px-4 rounded-full text-body-sm font-semibold bg-[var(--act)] text-[var(--bg)] hover:opacity-90"
                            >
                              Acknowledge
                            </button>
                          )}
                          <Link
                            to={`/actions/${a.id}`}
                            className="min-h-10 px-4 inline-flex items-center rounded-full text-body-sm font-medium border border-[var(--line-strong)] text-[var(--text-2)] hover:bg-[var(--panel-raised)]"
                          >
                            Open in Action Centre
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {ackError && (
                  <p role="alert" className="mt-2 text-body-sm" style={{ color: 'var(--act-soft)' }}>
                    {ackError}
                  </p>
                )}
                <StepDialog
                  request={ackId ? { kind: 'ack', actionIds: [ackId] } : null}
                  actions={zoneActions}
                  onClose={() => setAckId(null)}
                />
              </section>
              </>
              )}
            </div>
          ) : (
            <div className="p-5 flex items-center justify-center h-full">
              <span className="text-body text-[var(--text-3)] text-center">
                Choose a zone on the left{showFloors ? ', or click a room in the model' : ''}.
              </span>
            </div>
          )}
          </div>
        </div>

      </div>
    </div>
  );
}

type PanelLimits = typeof LEFT_PANEL;

/** A dragged panel width, remembered per viewer. `null` means "use the default". */
function usePanelWidth(limits: PanelLimits) {
  const [width, setWidth] = useState<number | null>(() => {
    try {
      const saved = Number(localStorage.getItem(limits.key));
      return saved >= limits.min && saved <= limits.max ? saved : null;
    } catch {
      return null;
    }
  });
  const update = useCallback(
    (next: number | null) => {
      setWidth(next);
      try {
        if (next == null) localStorage.removeItem(limits.key);
        else localStorage.setItem(limits.key, String(Math.round(next)));
      } catch {
        // Storage unavailable: the width still applies, it just isn't remembered.
      }
    },
    [limits.key],
  );
  return [width, update] as const;
}

function panelStyle(width: number | null, limits: PanelLimits) {
  return width ? { width: `min(${width}px, ${limits.maxVw * 100}vw)` } : undefined;
}

/**
 * Drag handle on a panel's inner edge. Pointer drag, arrow keys (Shift for
 * bigger steps) and double-click to reset.
 */
function ResizeHandle({
  edge,
  panelRef,
  limits,
  onResize,
  label,
}: {
  /** The panel edge the handle sits on. */
  edge: 'left' | 'right';
  panelRef: RefObject<HTMLDivElement | null>;
  limits: PanelLimits;
  onResize: (width: number | null) => void;
  label: string;
}) {
  const clamp = (w: number) =>
    Math.round(Math.min(limits.max, window.innerWidth * limits.maxVw, Math.max(limits.min, w)));

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel || e.button !== 0) return;
    e.preventDefault();
    const handle = e.currentTarget;
    const startX = e.clientX;
    const startWidth = panel.offsetWidth;
    handle.setPointerCapture(e.pointerId);
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      onResize(clamp(edge === 'right' ? startWidth + dx : startWidth - dx));
    };
    const end = () => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const panel = panelRef.current;
    if (!panel) return;
    const step = e.shiftKey ? 64 : 16;
    const grow = edge === 'right' ? 'ArrowRight' : 'ArrowLeft';
    const shrink = edge === 'right' ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === grow) onResize(clamp(panel.offsetWidth + step));
    else if (e.key === shrink) onResize(clamp(panel.offsetWidth - step));
    else return;
    e.preventDefault();
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      tabIndex={0}
      title={`${label}: drag, or use the arrow keys. Double-click to reset.`}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onResize(null)}
      className={`group absolute inset-y-0 z-20 w-3 cursor-col-resize touch-none outline-none ${
        edge === 'right' ? '-right-1.5' : '-left-1.5'
      }`}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 transition-colors group-hover:bg-[var(--line-strong)] group-focus-visible:bg-[var(--ok)] group-active:bg-[var(--ok)]"
      />
      <span
        aria-hidden
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-4 h-10 rounded-full border border-[var(--line-strong)] bg-[var(--panel)] text-[var(--text-3)] group-hover:text-[var(--text)]"
      >
        <GripVertical className="size-3" />
      </span>
    </div>
  );
}

function ZoneRow({
  zone,
  selected,
  openCount,
  onSelect,
}: {
  zone: ZoneModel;
  selected: boolean;
  openCount: number;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`w-full flex items-center gap-3 px-3 py-2.5 min-h-12 rounded-lg text-left transition-colors ${
        selected ? 'bg-[var(--panel-raised)] ring-1 ring-[var(--line-strong)]' : 'hover:bg-[var(--panel-raised)]'
      }`}
    >
      <StatusDot status={zone.status} size={10} />
      <span className="flex-1 min-w-0">
        <span className="block text-body font-medium text-[var(--text)]">{zone.name}</span>
        <span className="block text-body-sm" style={{ color: STATUS_COLOR[zone.status] }}>
          {STATUS_WORD[zone.status]}
        </span>
      </span>
      {openCount > 0 && (
        <span
          className="shrink-0 font-mono text-body-sm font-semibold min-w-7 text-center px-2 py-0.5 rounded-full bg-[var(--act)] text-[var(--bg)]"
          title={`${openCount} open action${openCount === 1 ? '' : 's'}`}
          aria-label={`${openCount} open action${openCount === 1 ? '' : 's'}`}
        >
          {openCount}
        </span>
      )}
    </button>
  );
}
