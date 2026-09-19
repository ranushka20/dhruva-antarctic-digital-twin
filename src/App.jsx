import { Suspense, lazy, useCallback, useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  CloudSnow,
  Compass,
  Layers3,
  Radio,
  Shield,
  Truck,
  Zap,
} from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ViewportSkeleton } from "@/components/station/viewport-skeleton";
import { DetailPanel } from "@/components/station/detail-panel";
import { SceneErrorBoundary } from "@/components/station/scene-error-boundary";
import { StationHeader } from "@/components/station/station-header";
import { StationSidebar } from "@/components/station/station-sidebar";
import {
  FloorSwitch,
  ViewModeSwitch,
  ViewportBreadcrumb,
} from "@/components/station/viewport-toolbar";
import { reachGapDays, useAwsFeed } from "@/hooks/use-aws-feed";
import { useClock } from "@/hooks/use-clock";
import { useSyncState } from "@/hooks/use-sync-state";
import { useTheme } from "@/hooks/use-theme";
import { computeStationState, zoneStatus } from "./twin/state/index.js";
import { FIRST_ROOMS } from "./twin/stationData";

// three.js is ~900 kB of the bundle. Splitting it out lets the shell paint
// immediately and gives the Suspense fallback something real to cover.
const BharatiTwin = lazy(() => import("./twin/Bharati3D"));

const NAV_ITEMS = [
  { id: "twin", label: "Digital twin", icon: Compass },
  { id: "sensors", label: "Live sensors", icon: CloudSnow, disabled: true },
  { id: "energy", label: "Energy system", icon: Zap, disabled: true },
  { id: "logistics", label: "Logistics", icon: Truck, disabled: true },
  { id: "comms", label: "Communication", icon: Radio, disabled: true },
  { id: "surveillance", label: "Surveillance", icon: Shield, disabled: true },
  { id: "inventory", label: "Inventory", icon: Boxes, disabled: true },
  { id: "alerts", label: "Alerts", icon: Bell, badge: 2, disabled: true },
];

// Eye-level walkthrough is gone: it toured rooms the evidence base is silent
// on, and the solution doc puts photorealistic reconstruction under "do not
// make core". What is left is the zone-based spatial index it asks for.
const VIEW_MODES = [
  {
    id: "cutaway",
    label: "Cutaway",
    icon: Layers3,
    hint: "Floor plan with the roof removed",
  },
  {
    id: "exterior",
    label: "Exterior",
    icon: Boxes,
    hint: "Full station hull and terrain",
  },
];

const FLOORS = [
  { id: "ground", label: "Ground", title: "Ground Floor" },
  { id: "first", label: "First", title: "First Floor" },
  { id: "second", label: "Second", title: "Second Floor" },
];

function App() {
  const { theme, toggleTheme } = useTheme();
  const clock = useClock();

  // Last contact with the station. Held here so the outage scenario can move
  // it backwards and the whole view ages with it.
  const [lastSyncAt, setLastSyncAt] = useState(() => Date.now());
  const sync = useSyncState(lastSyncAt);

  const aws = useAwsFeed();

  // The environment strip shows the newest values the NCPOR endpoint can
  // reach. It caps at 100,000 rows with no pagination, so "newest reachable"
  // and "now" are months apart — the badge says which.
  const environment = useMemo(() => {
    const n = aws.data?.newest;
    if (!n) return [];
    return [
      { label: "Temperature", value: `${n.tempr.value} \u00b0C` },
      { label: "Wind", value: `${n.ws.value} kt` },
      { label: "Pressure", value: `${n.ap.value} mbar` },
      { label: "Humidity", value: `${n.rh.value} %` },
    ];
  }, [aws.data]);

  const feedNote = useMemo(() => {
    if (aws.status === "error") {
      return {
        label: "Feed unreachable",
        variant: "error",
        detail: `The NCPOR endpoint did not respond: ${aws.error}. The station's only public feed being down is itself operational information, so the twin shows it rather than falling back to a placeholder.`,
      };
    }
    if (aws.status !== "ready") return null;
    const gap = reachGapDays(aws.data.coverage?.to);
    return {
      label: `Real data \u00b7 ${gap} days behind`,
      variant: "warning",
      detail: `Real NCPOR values, newest the feed can reach. The export caps at 100,000 rows with no pagination parameter, so it returns 1 January onwards and stops at ${new Date(aws.data.coverage.to).toUTCString()}. Everything since is structurally unreachable by this route \u2014 that limit is the integration boundary, not a station outage.`,
    };
  }, [aws]);

  // Zone status comes from the station-state model. Most zones resolve to
  // "unknown" and stay untinted, which is the honest answer for a station
  // whose only public instrument is a weather mast.
  const stationState = useMemo(
    () =>
      computeStationState({
        population: 47,
        conditions: aws.data?.newest
          ? { windKt: aws.data.newest.ws.value, tempC: aws.data.newest.tempr.value }
          : undefined,
        lastSyncAt,
        // The sync hook already owns the ticking clock; deriving now from it
        // keeps this memo pure and the two views of time consistent.
        now: lastSyncAt + sync.ageMs,
      }),
    [aws.data, lastSyncAt, sync.ageMs],
  );

  const zoneDetail = useMemo(() => zoneStatus(stationState) ?? {}, [stationState]);

  // The 3D only needs the word; the panel needs the reasoning behind it.
  const zones = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(zoneDetail).map(([zone, q]) => [zone, q?.value ?? "unknown"]),
      ),
    [zoneDetail],
  );

  const [floor, setFloor] = useState("ground");
  const [activeNav, setActiveNav] = useState("twin");
  const [selectedAsset, setSelectedAsset] = useState(null);

  const viewMode = floor === "exterior" ? "exterior" : "cutaway";

  const showRoom = useCallback((room) => {
    if (!room || room.floorId === "exterior") return;
    setFloor(room.floorId);
    setSelectedAsset(room);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setFloor(mode === "exterior" ? "exterior" : "ground");
    setSelectedAsset(null);
  }, []);

  const handleFloorChange = useCallback((next) => {
    setFloor(next);
    setSelectedAsset(null);
  }, []);

  const breadcrumb = useMemo(() => {
    const segments = ["Bharati"];
    if (floor === "exterior") {
      segments.push("Exterior");
      return segments;
    }
    segments.push(FLOORS.find((f) => f.id === floor)?.title ?? "Ground Floor");
    if (selectedAsset?.name) segments.push(selectedAsset.name);
    return segments;
  }, [floor, selectedAsset]);

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <StationHeader
          clock={clock}
          environment={environment}
          feedNote={feedNote}
          loading={aws.status === "loading"}
          onToggleTheme={toggleTheme}
          sync={sync}
          theme={theme}
        />

        <div className="flex min-h-0 flex-1">
          <StationSidebar
            activeId={activeNav}
            items={NAV_ITEMS}
            onSelect={setActiveNav}
            onSimulateOutage={() => setLastSyncAt(Date.now() - 14 * 60 * 60 * 1000)}
            onRestoreLink={() => setLastSyncAt(Date.now())}
            syncState={sync.state}
          />

          <main className="flex min-w-0 flex-1 flex-col bg-viewport">
            <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b bg-surface px-4">
              <ViewportBreadcrumb segments={breadcrumb} />
              <ViewModeSwitch
                onChange={handleViewModeChange}
                options={VIEW_MODES}
                value={viewMode}
              />
            </div>

            <div className="relative min-h-0 flex-1 overflow-hidden">
              <SceneErrorBoundary>
                <Suspense fallback={<ViewportSkeleton />}>
                  <BharatiTwin
                    floor={floor}
                    onSelectAsset={setSelectedAsset}
                    selectedAsset={selectedAsset}
                    sync={sync}
                    zoneStatus={zones}
                  />
                </Suspense>
              </SceneErrorBoundary>

              {floor !== "exterior" && (
                <FloorSwitch
                  onChange={handleFloorChange}
                  options={FLOORS}
                  value={floor}
                />
              )}
            </div>
          </main>

          <DetailPanel
            asset={selectedAsset}
            zoneDetail={zoneDetail}
            emptyOnExterior={floor === "exterior"}
            onClear={() => setSelectedAsset(null)}
            onEnterControlRoom={() => showRoom(FIRST_ROOMS[0])}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
