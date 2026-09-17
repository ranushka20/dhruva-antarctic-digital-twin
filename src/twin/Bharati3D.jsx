import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import DedicatedInteriorScene from "./DedicatedInteriorScene";
import ExteriorView from "./ExteriorView";
import FirstFloor from "./FirstFloor";
import GroundFloor from "./GroundFloor";
import SecondFloor from "./SecondFloor";
import { AntarcticTerrain } from "./components/Exterior";
import RoomCamera from "./components/RoomCamera";
import RoomNavigation from "./components/RoomNavigation";
import { getRoomsForFloor } from "./stationData";

function Scene({
  floor,
  isInteriorMode,
  activeRoom,
  selectedRoom,
  onSelectRoom,
}) {
  return (
    <>
      <color attach="background" args={["#08141e"]} />

      {/* --- DEDICATED INTERIOR ROOM VIEW --- */}
      {isInteriorMode && activeRoom ? (
        <DedicatedInteriorScene room={activeRoom} />
      ) : (
        <>
          {/* --- EXTERIOR & FLOOR CUTAWAY MODES --- */}
          {/* Arctic Sunlight */}
          <directionalLight
            position={[20, 32, 22]}
            intensity={2.3}
            color="#fff6ec"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={90}
            shadow-camera-left={-28}
            shadow-camera-right={28}
            shadow-camera-top={28}
            shadow-camera-bottom={-28}
            shadow-bias={-0.0005}
          />
          {/* Sky Fill Light */}
          <directionalLight
            position={[-22, 18, -18]}
            intensity={0.7}
            color="#7fb5d6"
          />
          {/* Ground Bounce */}
          <directionalLight
            position={[0, -10, 0]}
            intensity={0.3}
            color="#c5dbe8"
          />

          {/* Ambient Fill */}
          <ambientLight intensity={0.75} color="#dbe9f2" />

          {/* Ground Floor Cutaway */}
          {floor === "ground" && (
            <>
              <AntarcticTerrain />
              <GroundFloor selectedId={selectedRoom?.id} onSelect={onSelectRoom} />
              <ContactShadows position={[0, -2.48, 0]} scale={50} opacity={0.45} blur={2.5} far={15} />
            </>
          )}

          {/* First Floor Cutaway */}
          {floor === "first" && (
            <>
              <AntarcticTerrain />
              <FirstFloor selectedId={selectedRoom?.id} onSelect={onSelectRoom} />
              <ContactShadows position={[0, -2.48, 0]} scale={50} opacity={0.45} blur={2.5} far={15} />
            </>
          )}

          {/* Second Floor Cutaway */}
          {floor === "second" && (
            <>
              <AntarcticTerrain />
              <SecondFloor selectedId={selectedRoom?.id} onSelect={onSelectRoom} />
              <ContactShadows position={[0, -2.48, 0]} scale={50} opacity={0.45} blur={2.5} far={15} />
            </>
          )}

          {/* Exterior Full Station Twin */}
          {floor === "exterior" && (
            <>
              <ExteriorView selectedId={selectedRoom?.id} onSelect={onSelectRoom} />
              <ContactShadows position={[0, -2.48, 0]} scale={55} opacity={0.55} blur={2.8} far={20} />
            </>
          )}
        </>
      )}

      {/* Smooth Interpolated Camera Coordinator */}
      <RoomCamera
        floor={floor}
        isInteriorMode={isInteriorMode}
        activeRoom={activeRoom}
      />
    </>
  );
}

export default function Bharati3D({
  floor = "ground",
  isInteriorMode = false,
  onSelectAsset,
  selectedAsset,
  onExitRoom,
}) {
  const selectedRoom = selectedAsset?.raw || (selectedAsset ? { id: selectedAsset.id } : null);
  const floorRooms = getRoomsForFloor(floor);

  const handleSelectRoom = (room) => {
    if (!room) return;
    if (onSelectAsset) {
      onSelectAsset({
        id: `ROOM-${(room.id || "GEN").toUpperCase()}`,
        name: room.name,
        type: room.category || room.type,
        floor: room.floor || (floor === "ground" ? "Ground Floor" : floor === "first" ? "First Floor" : floor === "second" ? "Second Floor" : "Exterior View"),
        status: room.status || "ONLINE",
        powerKw: room.powerKw || "12.4 kW",
        temp: room.temp || "-24.0 °C",
        occupancy: room.occupancy || "Operational",
        source: room.classification || "ARCHITECTURAL TWIN",
        raw: room,
      });
    }
  };

  const clearSelection = () => {
    if (!isInteriorMode) {
      onSelectAsset?.(null);
    }
  };

  const floorLabel =
    isInteriorMode && selectedRoom?.name
      ? `Room Interior · ${selectedRoom.name}`
      : floor === "ground"
      ? "Ground Floor Overview"
      : floor === "first"
      ? "First Floor Overview"
      : floor === "second"
      ? "Second Floor Overview"
      : "3D Exterior View";

  const floorSubtitle =
    isInteriorMode && selectedRoom?.category
      ? `${selectedRoom.category} · Eye-Level Architectural Exploration`
      : floor === "ground"
      ? "Level 0 · Laboratories, Workshop, Power & Utilities"
      : floor === "first"
      ? "Level 1 · Operations Core, Habitat & Living Quarters"
      : floor === "second"
      ? "Level 2 · Upper Science Deck & Atmospheric Observatory"
      : "Full Aerodynamic Elevated Hull & Antarctic Environment";

  return (
    <div className="station-model">
      <Canvas
        shadows
        camera={{ position: [25, 22, 29], fov: 40 }}
        dpr={[1, 1.5]}
        onPointerMissed={clearSelection}
      >
        <Scene
          floor={floor}
          isInteriorMode={isInteriorMode}
          activeRoom={selectedRoom}
          selectedRoom={selectedRoom}
          onSelectRoom={handleSelectRoom}
        />
      </Canvas>

      {/* In-Canvas Interior Navigation HUD */}
      {isInteriorMode && selectedRoom && (
        <RoomNavigation
          activeRoom={selectedRoom}
          floor={floor}
          floorRooms={floorRooms}
          onSelectRoom={handleSelectRoom}
          onExitRoom={onExitRoom}
        />
      )}

      {/* Top Left Floater (only when not in room interior to avoid clutter) */}
      {!isInteriorMode && (
        <div className="model-floater model-floater-top">
          <span>BHARATI STATION · DIGITAL TWIN</span>
          <strong>Antarctic Research Facility</strong>
          <small>LARSEMANN HILLS · 69.41° S, 76.11° E</small>
        </div>
      )}

      {/* Bottom Left Floater */}
      {!isInteriorMode && (
        <div className="model-floater model-floater-bottom">
          <strong>{floorLabel}</strong>
          <span>{floorSubtitle}</span>
        </div>
      )}

      {/* Top Right Classification */}
      {!isInteriorMode && (
        <div className="model-source">
          DIGITAL TWIN <b>ARCHITECTURAL RECONSTRUCTION</b>
        </div>
      )}

      {/* Bottom Right Help */}
      <div className="model-help">
        {isInteriorMode
          ? "Rotate 360° · Pan · Zoom · Explore Interior Equipment"
          : "Rotate · Pan · Zoom · Click Room to Inspect"}
      </div>
    </div>
  );
}
