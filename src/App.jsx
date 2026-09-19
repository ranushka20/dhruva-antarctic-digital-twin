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
import { useClock } from "@/hooks/use-clock";
import { useTheme } from "@/hooks/use-theme";
import { FIRST_ROOMS, GROUND_ROOMS } from "./twin/stationData";

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

const VIEW_MODES = [
  {
    id: "interior",
    label: "Interior",
    icon: Compass,
    hint: "Walk a single room at eye level",
  },
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

// Environment strip. The AWS feed is not wired up yet, so these are the
// medians measured from the real 2024 Bharati export rather than invented
// numbers — and the strip says plainly that it is not live. The previous
// -24 C sat outside Bharati's entire measured record (min -14.7 C).
const ENVIRONMENT = [
  { label: "Temperature", value: "\u22121.7 \u00b0C" },
  { label: "Wind", value: "13.5 kt" },
  { label: "Pressure", value: "977.9 mbar" },
  { label: "Humidity", value: "53.5 %" },
];

function App() {
  const { theme, toggleTheme } = useTheme();
  const clock = useClock();

  const [floor, setFloor] = useState("ground");
  const [activeNav, setActiveNav] = useState("twin");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isInteriorMode, setIsInteriorMode] = useState(false);

  const viewMode = isInteriorMode
    ? "interior"
    : floor === "exterior"
      ? "exterior"
      : "cutaway";

  const handleEnterRoom = useCallback((room) => {
    if (!room || room.floorId === "exterior") return;
    setFloor(room.floorId);
    setIsInteriorMode(true);
    setSelectedAsset(room);
  }, []);

  const handleViewModeChange = useCallback(
    (mode) => {
      if (mode === "exterior") {
        setFloor("exterior");
        setIsInteriorMode(false);
        setSelectedAsset(null);
        return;
      }
      if (floor === "exterior") setFloor("ground");
      if (mode === "cutaway") {
        setIsInteriorMode(false);
        return;
      }
      // Interior needs a room; fall back to the first one on this floor.
      setIsInteriorMode(true);
      if (!selectedAsset) handleEnterRoom(GROUND_ROOMS[0]);
    },
    [floor, selectedAsset, handleEnterRoom],
  );

  const handleFloorChange = useCallback((next) => {
    setFloor(next);
    setIsInteriorMode(false);
    setSelectedAsset(null);
  }, []);

  const breadcrumb = useMemo(() => {
    const segments = ["Bharati"];
    if (floor === "exterior") {
      segments.push("Exterior");
      return segments;
    }
    segments.push(FLOORS.find((f) => f.id === floor)?.title ?? "Ground Floor");
    if (isInteriorMode && selectedAsset?.name) segments.push(selectedAsset.name);
    return segments;
  }, [floor, isInteriorMode, selectedAsset]);

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full flex-col overflow-hidden bg-background">
        <StationHeader
          clock={clock}
          environment={ENVIRONMENT}
          onToggleTheme={toggleTheme}
          theme={theme}
        />

        <div className="flex min-h-0 flex-1">
          <StationSidebar
            activeId={activeNav}
            items={NAV_ITEMS}
            onSelect={setActiveNav}
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
                    isInteriorMode={isInteriorMode}
                    onEnterRoom={handleEnterRoom}
                    onExitRoom={() => setIsInteriorMode(false)}
                    onSelectAsset={setSelectedAsset}
                    selectedAsset={selectedAsset}
                  />
                </Suspense>
              </SceneErrorBoundary>

              {floor !== "exterior" && !isInteriorMode && (
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
            emptyOnExterior={floor === "exterior"}
            isInteriorMode={isInteriorMode}
            onClear={() => {
              setSelectedAsset(null);
              setIsInteriorMode(false);
            }}
            onEnterControlRoom={() => handleEnterRoom(FIRST_ROOMS[0])}
            onEnterRoom={handleEnterRoom}
            onExitRoom={() => setIsInteriorMode(false)}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

export default App;
