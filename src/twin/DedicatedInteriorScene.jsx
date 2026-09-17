import Box from "./components/Box";
import Door from "./components/Door";
import { CeilingLight } from "./components/InteriorLighting";
import {
  AtmosphericLidarInterior,
  ChemicalLabInterior,
  ConferenceRoomInterior,
  ControlRoomInterior,
  CrewCabinsBunkInterior,
  CrewCabinsSingleInterior,
  CupolaLoungeInterior,
  DiningLoungeInterior,
  EarthSciencesLabInterior,
  ElectronicsLabInterior,
  EntryAirlockInterior,
  GalleyKitchenInterior,
  LifeSciencesLabInterior,
  MedicalBayInterior,
  MetObservatoryInterior,
  PowerPlantInterior,
  SatComInterior,
  SatProcessingInterior,
  WaterPlantInterior,
  WorkshopInterior,
} from "./components/InteriorFurniture";
import Window from "./components/Window";
import {
  darkMetalMaterial,
  floorCorridorMaterial,
  floorLabMaterial,
  floorLivingMaterial,
  floorSteelPlateMaterial,
  floorWoodMaterial,
  snowMaterial,
  trimMaterial,
  wallMaterial,
} from "./components/materials";

function RoomFurnitureContent({ roomId }) {
  switch (roomId) {
    case "control-room":
      return <ControlRoomInterior />;
    case "comms-room":
      return <SatComInterior />;
    case "earth-lab":
      return <EarthSciencesLabInterior />;
    case "life-lab":
      return <LifeSciencesLabInterior />;
    case "chem-lab":
      return <ChemicalLabInterior />;
    case "elec-lab":
      return <ElectronicsLabInterior />;
    case "medical-bay":
      return <MedicalBayInterior />;
    case "galley-kitchen":
      return <GalleyKitchenInterior />;
    case "dining-lounge":
      return <DiningLoungeInterior />;
    case "berthing-ab":
      return <CrewCabinsSingleInterior />;
    case "berthing-cd":
      return <CrewCabinsBunkInterior />;
    case "briefing-room":
      return <ConferenceRoomInterior />;
    case "workshop":
      return <WorkshopInterior />;
    case "power-plant":
      return <PowerPlantInterior />;
    case "water-plant":
      return <WaterPlantInterior />;
    case "entrance-airlock":
      return <EntryAirlockInterior />;
    case "met-observatory":
      return <MetObservatoryInterior />;
    case "lidar-lab":
      return <AtmosphericLidarInterior />;
    case "sat-processing":
      return <SatProcessingInterior />;
    case "cupola-lounge":
      return <CupolaLoungeInterior />;
    default:
      return <ControlRoomInterior />;
  }
}

export default function DedicatedInteriorScene({ room }) {
  if (!room) return null;

  const w = room.w || 5.6;
  const d = room.d || 4.2;
  const h = 2.85; // Room wall height
  const halfW = w / 2;
  const halfD = d / 2;
  const wallThick = 0.18;

  // Floor Material
  let floorMat = floorLabMaterial;
  if (room.floorType === "wood" || room.type === "living") floorMat = floorWoodMaterial;
  else if (room.floorType === "living" || room.type === "lounge") floorMat = floorLivingMaterial;
  else if (room.floorType === "steel" || room.type === "power" || room.type === "workshop" || room.type === "utility") floorMat = floorSteelPlateMaterial;
  else if (room.floorType === "corridor") floorMat = floorCorridorMaterial;

  const hasBackWindows = room.id !== "entrance-airlock" && room.id !== "workshop";

  return (
    <group position={[0, 0, 0]}>
      {/* =========================================================
          INTERIOR LIGHTING RIG
      ========================================================= */}
      {/* Soft warm clean-room ambient */}
      <ambientLight intensity={0.9} color="#f0f6fa" />

      {/* Primary Central Ceiling Troffer Light */}
      <pointLight
        position={[0, h - 0.3, 0]}
        intensity={2.2}
        color="#fffbf5"
        distance={14}
        decay={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
      />

      {/* Auxiliary Warm Corner Fill Lights */}
      <pointLight position={[halfW * 0.6, 1.6, halfD * 0.6]} intensity={0.6} color="#cce7f8" distance={7} />
      <pointLight position={[-halfW * 0.6, 1.6, -halfD * 0.6]} intensity={0.6} color="#e0f0fa" distance={7} />

      {/* Window Natural Cold Daylight Fill (coming from back wall) */}
      <directionalLight position={[0, 4, -8]} intensity={0.8} color="#9ecfe8" />

      {/* =========================================================
          ENCLOSED ARCHITECTURAL ROOM SHELL
      ========================================================= */}

      {/* --- FLOOR SLAB --- */}
      <Box position={[0, -0.07, 0]} size={[w, 0.14, d]} material={floorMat} receiveShadow />

      {/* Baseboard Cable Raceways along perimeter */}
      <Box position={[0, 0.08, -halfD + 0.04]} size={[w, 0.14, 0.06]} material={trimMaterial} castShadow={false} />
      <Box position={[0, 0.08, halfD - 0.04]} size={[w, 0.14, 0.06]} material={trimMaterial} castShadow={false} />
      <Box position={[-halfW + 0.04, 0.08, 0]} size={[0.06, 0.14, d]} material={trimMaterial} castShadow={false} />
      <Box position={[halfW - 0.04, 0.08, 0]} size={[0.06, 0.14, d]} material={trimMaterial} castShadow={false} />

      {/* --- CEILING SLAB & RECESSED LED TROFFERS --- */}
      <Box position={[0, h + 0.06, 0]} size={[w + 0.2, 0.12, d + 0.2]} material={wallMaterial} />
      {/* 2 Ceiling LED Troffer fixtures */}
      <CeilingLight position={[-halfW / 2, h - 0.02, 0]} size={[1.6, 0.04, 0.5]} />
      <CeilingLight position={[halfW / 2, h - 0.02, 0]} size={[1.6, 0.04, 0.5]} />

      {/* --- BACK WALL (Exterior facing with Ribbon Windows) --- */}
      {hasBackWindows ? (
        <group position={[0, 0, -halfD]}>
          {/* Left wall segment */}
          <Box position={[-halfW + (halfW - 1.2) / 2, h / 2, 0]} size={[halfW - 1.2, h, wallThick]} material={wallMaterial} />
          {/* Right wall segment */}
          <Box position={[halfW - (halfW - 1.2) / 2, h / 2, 0]} size={[halfW - 1.2, h, wallThick]} material={wallMaterial} />
          {/* Wall sill below window */}
          <Box position={[0, 0.5, 0]} size={[2.4, 1.0, wallThick]} material={wallMaterial} />
          {/* Wall lintel above window */}
          <Box position={[0, h - 0.45, 0]} size={[2.4, 0.9, wallThick]} material={wallMaterial} />
          {/* Ribbon Window Frame & Glass */}
          <Window position={[0, 1.5, 0]} width={2.4} height={1.0} mullions={2} />
          {/* Exterior Antarctic Snow Vista visible through the window */}
          <group position={[0, 0, -2.5]}>
            <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[14, 8]} />
              <primitive object={snowMaterial} attach="material" />
            </mesh>
          </group>
        </group>
      ) : (
        <Box position={[0, h / 2, -halfD]} size={[w, h, wallThick]} material={wallMaterial} />
      )}

      {/* --- FRONT WALL (Corridor facing with Entrance Door) --- */}
      <group position={[0, 0, halfD]}>
        {/* Left wall segment */}
        <Box position={[-halfW + (halfW - 0.6) / 2, h / 2, 0]} size={[halfW - 0.6, h, wallThick]} material={wallMaterial} />
        {/* Right wall segment */}
        <Box position={[halfW - (halfW - 0.6) / 2, h / 2, 0]} size={[halfW - 0.6, h, wallThick]} material={wallMaterial} />
        {/* Lintel above door */}
        <Box position={[0, 2.0 + (h - 2.0) / 2, 0]} size={[1.2, h - 2.0, wallThick]} material={wallMaterial} />
        {/* Architectural Entrance Door */}
        <Door position={[0, 0, 0]} width={1.05} height={2.0} type={room.type === "living" ? "wood" : "lab"} />
      </group>

      {/* --- LEFT WALL --- */}
      <Box position={[-halfW, h / 2, 0]} size={[wallThick, h, d]} material={wallMaterial} />

      {/* --- RIGHT WALL --- */}
      <Box position={[halfW, h / 2, 0]} size={[wallThick, h, d]} material={wallMaterial} />

      {/* Wall trim cornices */}
      <Box position={[0, h - 0.05, -halfD + 0.04]} size={[w, 0.08, 0.06]} material={darkMetalMaterial} castShadow={false} />
      <Box position={[0, h - 0.05, halfD - 0.04]} size={[w, 0.08, 0.06]} material={darkMetalMaterial} castShadow={false} />

      {/* =========================================================
          ROOM-SPECIFIC PROCEDURAL FURNITURE & EQUIPMENT
      ========================================================= */}
      <group position={[0, 0, 0]}>
        <RoomFurnitureContent roomId={room.id} />
      </group>
    </group>
  );
}
