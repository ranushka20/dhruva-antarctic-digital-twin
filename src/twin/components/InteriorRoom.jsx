import Box from "./Box";
import Door from "./Door";
import RoomLabel from "./RoomLabel";
import Wall from "./Wall";
import { useZoneStatus } from "../zone-status-context";
import {
  floorCorridorMaterial,
  floorLabMaterial,
  floorLivingMaterial,
  floorSteelPlateMaterial,
  floorWoodMaterial,
  selectedMaterial,
  wallMaterial,
  zoneStatusMaterial,
} from "./materials";

export default function InteriorRoom({
  room,
  selected = false,
  onSelect,
  children,
  wallHeight = 2.2,
  wallThickness = 0.18,
  doorConfig = { side: "front", offset: 0, width: 0.95, type: "lab" },
  hasExteriorWindows = true,
  windowConfig = { count: 1, side: "back" },
}) {
  const { x, z, w, d, name, type, floorType } = room;
  const status = useZoneStatus(room.zone);
  const halfW = w / 2;
  const halfD = d / 2;

  // Determine floor material
  let floorMat = floorLabMaterial;
  if (floorType === "wood" || type === "living" || type === "berthing") floorMat = floorWoodMaterial;
  else if (floorType === "living" || type === "lounge" || type === "dining") floorMat = floorLivingMaterial;
  else if (floorType === "steel" || type === "power" || type === "workshop" || type === "storage" || type === "utility") floorMat = floorSteelPlateMaterial;
  else if (floorType === "corridor") floorMat = floorCorridorMaterial;

  const handlePointer = (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    onSelect?.(room);
  };

  return (
    <group position={[x, 0, z]} onClick={handlePointer}>
      {/* Floor Slab. Selection wins over status, and a zone with no basis
          for a status keeps its ordinary floor rather than being coloured
          in as though it were healthy. */}
      <Box
        position={[0, 0.07, 0]}
        size={[w, 0.14, d]}
        material={
          selected ? selectedMaterial : (zoneStatusMaterial(status) ?? floorMat)
        }
      />

      {/* Localized Warm Interior Illumination (Open-Roof Cutaway Lighting) */}
      <pointLight
        position={[0, 1.7, 0]}
        intensity={selected ? 1.4 : 0.85}
        color="#fff8ed"
        distance={Math.max(w, d) * 1.6}
        decay={1.6}
      />

      {/* --- Solid Architectural Boundary Walls with Cutouts --- */}
      {/* Back Wall (along X axis at -halfD) */}
      <Wall
        position={[0, 0, -halfD]}
        size={[w, wallHeight, wallThickness]}
        orientation="x"
        material={wallMaterial}
        hasWindow={hasExteriorWindows && windowConfig.side === "back"}
        windowWidth={1.6}
        windowHeight={0.85}
        windowElevation={1.25}
        onClick={handlePointer}
      />

      {/* Front Wall (along X axis at +halfD) */}
      <Wall
        position={[0, 0, halfD]}
        size={[w, wallHeight, wallThickness]}
        orientation="x"
        material={wallMaterial}
        hasDoor={doorConfig.side === "front"}
        doorWidth={doorConfig.width || 0.95}
        doorHeight={1.9}
        doorOffset={doorConfig.offset || 0}
        hasWindow={hasExteriorWindows && windowConfig.side === "front"}
        windowWidth={1.6}
        windowHeight={0.85}
        windowElevation={1.25}
        onClick={handlePointer}
      />

      {/* Left Wall (along Z axis at -halfW) */}
      <Wall
        position={[-halfW, 0, 0]}
        size={[wallThickness, wallHeight, d]}
        orientation="z"
        material={wallMaterial}
        hasDoor={doorConfig.side === "left"}
        doorWidth={doorConfig.width || 0.95}
        doorHeight={1.9}
        doorOffset={doorConfig.offset || 0}
        hasWindow={hasExteriorWindows && windowConfig.side === "left"}
        windowWidth={1.4}
        windowHeight={0.85}
        windowElevation={1.25}
        onClick={handlePointer}
      />

      {/* Right Wall (along Z axis at +halfW) */}
      <Wall
        position={[halfW, 0, 0]}
        size={[wallThickness, wallHeight, d]}
        orientation="z"
        material={wallMaterial}
        hasDoor={doorConfig.side === "right"}
        doorWidth={doorConfig.width || 0.95}
        doorHeight={1.9}
        doorOffset={doorConfig.offset || 0}
        hasWindow={hasExteriorWindows && windowConfig.side === "right"}
        windowWidth={1.4}
        windowHeight={0.85}
        windowElevation={1.25}
        onClick={handlePointer}
      />

      {/* Architectural Door Leaf */}
      {doorConfig.side === "front" && (
        <Door
          position={[doorConfig.offset || 0, 0, halfD]}
          type={doorConfig.type || "lab"}
          onClick={handlePointer}
        />
      )}
      {doorConfig.side === "left" && (
        <Door
          position={[-halfW, 0, doorConfig.offset || 0]}
          rotation={[0, Math.PI / 2, 0]}
          type={doorConfig.type || "lab"}
          onClick={handlePointer}
        />
      )}
      {doorConfig.side === "right" && (
        <Door
          position={[halfW, 0, doorConfig.offset || 0]}
          rotation={[0, -Math.PI / 2, 0]}
          type={doorConfig.type || "lab"}
          onClick={handlePointer}
        />
      )}
      {doorConfig.side === "back" && (
        <Door
          position={[doorConfig.offset || 0, 0, -halfD]}
          rotation={[0, Math.PI, 0]}
          type={doorConfig.type || "lab"}
          onClick={handlePointer}
        />
      )}

      {/* 3D Interior Furniture & Equipment (100% visible from elevated isometric angle) */}
      {children}

      {/* Single Clean Floating Room Label Badge */}
      <RoomLabel
        room={{ ...room, x: 0, z: 0, name }}
        selected={selected}
        onSelect={onSelect}
      />

      {/* Selection Glowing Cyan Boundary Ring & Floor Perimeter Border */}
      {selected && (
        <group>
          {/* Floor Glowing Cyan Perimeter Border */}
          <mesh position={[0, 0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w + 0.06, d + 0.06]} />
            <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.8} />
          </mesh>
          <mesh position={[0, 0.155, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.min(w, d) * 0.32, Math.min(w, d) * 0.38, 32]} />
            <meshBasicMaterial color="#56d9e8" transparent opacity={0.85} />
          </mesh>
        </group>
      )}
    </group>
  );
}

