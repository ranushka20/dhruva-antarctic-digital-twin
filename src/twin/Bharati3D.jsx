import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { ContactShadows } from "@react-three/drei";
import { useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { StalenessBanner } from "@/components/station/sync-indicator";
import CanvasLoader from "./components/CanvasLoader";
import { ZoneStatusProvider } from "./zone-status";
import ExteriorView from "./ExteriorView";
import FirstFloor from "./FirstFloor";
import GroundFloor from "./GroundFloor";
import SecondFloor from "./SecondFloor";
import { AntarcticTerrain } from "./components/Exterior";
import RoomCamera from "./components/RoomCamera";

const FLOOR_COMPONENTS = {
  ground: GroundFloor,
  first: FirstFloor,
  second: SecondFloor,
};

const VIEW_CAPTIONS = {
  ground: {
    title: "Ground Floor",
    detail: "Plant, utilities and waste — the evidenced half of the station",
  },
  first: {
    title: "First Floor",
    detail: "Operations, communications and living quarters",
  },
  second: {
    title: "Second Floor",
    detail: "Observatory, instrument bay and earth station",
  },
  exterior: {
    title: "Exterior",
    detail: "Elevated hull and Larsemann Hills terrain",
  },
};

/**
 * Contact shadows are baked once: nothing in the scene moves, so re-rendering
 * their target every frame was pure waste.
 */
function GroundShadows({ scale = 50, opacity = 0.4 }) {
  return (
    <ContactShadows
      blur={2.5}
      far={15}
      frames={1}
      opacity={opacity}
      position={[0, -2.48, 0]}
      resolution={512}
      scale={scale}
    />
  );
}

function SceneLighting() {
  return (
    <>
      {/* Antarctic sun. 1024 shadow map is indistinguishable from 2048 at
          this camera distance and costs a quarter of the fill rate. */}
      <directionalLight
        castShadow
        color="#fff4e2"
        intensity={2.6}
        position={[20, 32, 22]}
        shadow-bias={-0.0005}
        shadow-camera-bottom={-28}
        shadow-camera-far={90}
        shadow-camera-left={-28}
        shadow-camera-near={0.5}
        shadow-camera-right={28}
        shadow-camera-top={28}
        shadow-mapSize-height={1024}
        shadow-mapSize-width={1024}
      />
      {/* Sky fill */}
      <directionalLight color="#8fc0dd" intensity={0.55} position={[-22, 18, -18]} />
      {/* Snow bounce */}
      <directionalLight color="#c5dbe8" intensity={0.25} position={[0, -10, 0]} />
      {/* 0.75 washed every surface flat; 0.45 lets the key light model form. */}
      <ambientLight color="#dbe9f2" intensity={0.45} />
    </>
  );
}

function Scene({ floor, selectedRoom, onSelectRoom }) {
  const FloorComponent = FLOOR_COMPONENTS[floor];

  return (
    <>
      <SceneLighting />

      {FloorComponent && (
        <>
          <AntarcticTerrain />
          <FloorComponent onSelect={onSelectRoom} selectedId={selectedRoom?.id} />
          <GroundShadows />
        </>
      )}

      {floor === "exterior" && (
        <>
          <ExteriorView onSelect={onSelectRoom} selectedId={selectedRoom?.id} />
          <GroundShadows opacity={0.38} scale={46} />
        </>
      )}

      <RoomCamera floor={floor} />
    </>
  );
}

export default function Bharati3D({
  floor = "ground",
  onSelectAsset,
  selectedAsset,
  zoneStatus,
  sync = { state: "live", staleness: 0, label: "just now" },
  // Page-owned buttons (e.g. full screen), set beside the model badge.
  controls,
}) {
  const caption = VIEW_CAPTIONS[floor];

  // Rooms are the twin's own objects now, so selection passes them straight
  // through rather than flattening them into a separate telemetry shape.
  const handleSelectRoom = useCallback(
    (room) => {
      if (room) onSelectAsset?.(room);
    },
    [onSelectAsset],
  );

  const clearSelection = useCallback(() => onSelectAsset?.(null), [onSelectAsset]);

  return (
    <div className="absolute inset-0">
      {/* The scene itself desaturates and dims as HQ's picture ages. A stale
          twin that still looks crisp is the failure mode this guards against:
          it invites you to act on a memory as though it were the station. */}
      {/* Transparent canvas: the viewport background comes from the theme
          token, so the scene follows light/dark without a second source of
          truth for its colour. */}
      <Canvas
        camera={{ position: [25, 22, 29], fov: 40 }}
        style={{
          filter: `saturate(${1 - 0.75 * sync.staleness}) brightness(${1 - 0.18 * sync.staleness})`,
          transition: "filter 600ms ease-out",
        }}
        dpr={[1, 1.5]}
        frameloop="demand"
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: "high-performance",
          // ACES (the R3F default) grays out the white hull and crushes the
          // snow. Neutral keeps architectural whites reading as white.
          toneMapping: THREE.NeutralToneMapping,
          toneMappingExposure: 1.05,
        }}
        onPointerMissed={clearSelection}
        performance={{ min: 0.5 }}
        shadows
      >
        <ZoneStatusProvider value={zoneStatus}>
          <Scene
            floor={floor}
            onSelectRoom={handleSelectRoom}
            selectedRoom={selectedAsset}
          />
        </ZoneStatusProvider>
      </Canvas>

      <CanvasLoader />

      <StalenessBanner label={sync.label} state={sync.state} />

      {/* Overlays sit on bright snow as often as on the dark backdrop, so
          each one carries its own surface rather than relying on the
          viewport for contrast. */}
      {caption && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 flex flex-col gap-0.5 rounded-lg border bg-popover/85 px-3 py-2 shadow-sm backdrop-blur-sm">
          <span className="font-medium text-popover-foreground text-readout">
            {caption.title}
          </span>
          <span className="text-muted-foreground text-xs">{caption.detail}</span>
        </div>
      )}

      <div className="pointer-events-none absolute top-4 right-4 z-10 flex items-center gap-2">
        <Badge className="bg-popover/85 shadow-sm backdrop-blur-sm" variant="outline">
          Zone model · not an as-built survey
        </Badge>
        {controls && <div className="pointer-events-auto">{controls}</div>}
      </div>

      <span className="pointer-events-none absolute right-4 bottom-4 z-10 rounded-md border bg-popover/85 px-2.5 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur-sm">
        Drag to orbit · Scroll to zoom · Click a zone
      </span>
    </div>
  );
}
