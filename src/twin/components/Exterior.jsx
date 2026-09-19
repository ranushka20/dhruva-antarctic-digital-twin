import Box from "./Box";
import Railings from "./Railings";
import Stairs from "./Stairs";
import {
  chromeMaterial,
  darkMetalMaterial,
  galvanizedSteelMaterial,
  indicatorRedMaterial,
  rockMaterial,
  selectedMaterial,
  snowDriftMaterial,
  snowMaterial,
  solarMaterial,
  stationHullDarkMaterial,
  stationHullMaterial,
  steelLightMaterial,
} from "./materials";

/* --- Elevated Structural Steel Stilts (Piles & Cross Bracing) --- */
export function StationStilts({
  width = 24,
  depth = 12,
  height = 2.5,
  colSpacingX = 4.8,
  colSpacingZ = 4.0,
}) {
  const colsX = Math.floor(width / colSpacingX) + 1;
  const colsZ = Math.floor(depth / colSpacingZ) + 1;

  const positions = [];
  for (let ix = 0; ix < colsX; ix++) {
    const x = -width / 2 + (width / (colsX - 1)) * ix;
    for (let iz = 0; iz < colsZ; iz++) {
      const z = -depth / 2 + (depth / (colsZ - 1)) * iz;
      positions.push([x, z]);
    }
  }

  return (
    <group position={[0, -height / 2, 0]}>
      {/* Heavy Steel Columns */}
      {positions.map(([x, z], idx) => (
        <group key={`col-${idx}`} position={[x, 0, z]}>
          <Box position={[0, 0, 0]} size={[0.3, height, 0.3]} material={galvanizedSteelMaterial} />
          {/* Base Footing Anchor */}
          <Box position={[0, -height / 2 + 0.1, 0]} size={[0.7, 0.2, 0.7]} material={darkMetalMaterial} />
          {/* Top Column Capital Plate */}
          <Box position={[0, height / 2 - 0.1, 0]} size={[0.6, 0.2, 0.6]} material={galvanizedSteelMaterial} />
        </group>
      ))}

      {/* Longitudinal & Transverse Structural Steel I-Beams under station hull */}
      {Array.from({ length: colsZ }).map((_, iz) => {
        const z = -depth / 2 + (depth / (colsZ - 1)) * iz;
        return (
          <Box
            key={`beam-x-${iz}`}
            position={[0, height / 2 - 0.1, z]}
            size={[width + 0.6, 0.25, 0.22]}
            material={galvanizedSteelMaterial}
          />
        );
      })}
      {Array.from({ length: colsX }).map((_, ix) => {
        const x = -width / 2 + (width / (colsX - 1)) * ix;
        return (
          <Box
            key={`beam-z-${ix}`}
            position={[x, height / 2 - 0.25, 0]}
            size={[0.22, 0.25, depth + 0.6]}
            material={galvanizedSteelMaterial}
          />
        );
      })}
    </group>
  );
}

/* --- Entrance Deck Platform & Access Stairs --- */
export function EntranceDeck({
  position = [0, 0, 7.2],
  width = 6.4,
  depth = 2.8,
  stairHeight = 2.4,
}) {
  return (
    <group position={position}>
      {/* Platform Deck Base */}
      <Box position={[0, 0, 0]} size={[width, 0.2, depth]} material={galvanizedSteelMaterial} />
      {/* Perimeter Safety Railings on Front & Sides */}
      <Railings position={[-width / 2, 0.1, 0]} length={depth} orientation="z" posts={3} />
      <Railings position={[width / 2, 0.1, 0]} length={depth} orientation="z" posts={3} />
      {/* Front railing with opening for stairs */}
      <Railings position={[-width / 3, 0.1, depth / 2]} length={width / 2.8} orientation="x" posts={2} />
      <Railings position={[width / 3, 0.1, depth / 2]} length={width / 2.8} orientation="x" posts={2} />

      {/* Main industrial stair down to the snow.
          Stairs climb toward their local +Z, so the flight is placed at its
          foot and turned to face the deck. Previously it was anchored at the
          deck edge, which made it climb away from the building into mid-air. */}
      <Stairs
        hasLanding={false}
        position={[0, -stairHeight, depth / 2 + 2.8]}
        rotation={[0, Math.PI, 0]}
        steps={9}
        totalDepth={2.8}
        totalHeight={stairHeight}
        width={1.6}
      />

      {/* Platform Stilt Supports to Ground */}
      {[-width / 2 + 0.3, width / 2 - 0.3].map((x, idx) => (
        <group key={idx} position={[x, -stairHeight / 2, depth / 2 - 0.3]}>
          <Box position={[0, 0, 0]} size={[0.2, stairHeight, 0.2]} material={galvanizedSteelMaterial} />
          <Box position={[0, -stairHeight / 2 + 0.1, 0]} size={[0.5, 0.2, 0.5]} material={darkMetalMaterial} />
        </group>
      ))}
    </group>
  );
}

/* --- Rooftop Meteorological & Antenna Mast --- */
export function RooftopEquipment({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Central Telecom / Weather Mast */}
      <group position={[6, 0, -2]}>
        {/* Lattice / Tube Mast */}
        <Box position={[0, 2.5, 0]} size={[0.16, 5.0, 0.16]} material={steelLightMaterial} />
        <Box position={[0, 5.2, 0]} size={[0.08, 1.2, 0.08]} material={chromeMaterial} />
        {/* Red Aviation Beacon Light */}
        <Box position={[0, 5.85, 0]} size={[0.12, 0.12, 0.12]} material={indicatorRedMaterial} />
        {/* Crossarms & Anemometer Cups */}
        <Box position={[0, 4.4, 0]} size={[1.2, 0.04, 0.04]} material={steelLightMaterial} />
        <Box position={[-0.6, 4.55, 0]} size={[0.15, 0.15, 0.15]} material={chromeMaterial} />
        <Box position={[0.6, 4.55, 0]} size={[0.15, 0.15, 0.15]} material={chromeMaterial} />
      </group>

      {/* Satellite Tracking Dome (Radome) */}
      <group position={[-6.5, 0.8, -1.5]}>
        <Box position={[0, -0.4, 0]} size={[1.6, 0.8, 1.6]} material={darkMetalMaterial} />
        <mesh position={[0, 0.6, 0]} castShadow>
          <sphereGeometry args={[1.1, 24, 16]} />
          <primitive object={stationHullDarkMaterial} attach="material" />
        </mesh>
      </group>

      {/* HVAC Mechanical Penthouses */}
      {[-2.5, 2.5].map((x, idx) => (
        <group key={idx} position={[x, 0.55, 0.5]}>
          <Box position={[0, 0, 0]} size={[1.8, 1.1, 1.4]} material={darkMetalMaterial} />
          {/* Fan Cowls */}
          <Box position={[-0.4, 0.6, 0]} size={[0.5, 0.15, 0.5]} material={steelLightMaterial} />
          <Box position={[0.4, 0.6, 0]} size={[0.5, 0.15, 0.5]} material={steelLightMaterial} />
        </group>
      ))}
    </group>
  );
}

/* --- Fuel Farm ---
   13 tanktainers x 24,000 L, double-hull stainless in a carbon-steel frame,
   sited 20 m from the ship anchor point and feeding the power station's day
   tank over a ~300 m line (OMRC tender NCAOR/LH(20)/2013 §2.3, §2.8).
   The count and the arrangement into a bunded row are the documented part;
   exact siting geometry is our interpretation. */
export function FuelFarm({ position = [0, 0, 0], rotation = [0, 0, 0], selected = false }) {
  const rows = [
    { z: -1.4, count: 7 },
    { z: 1.4, count: 6 },
  ];
  const pitch = 1.5;
  const bodyMaterial = selected ? selectedMaterial : stationHullMaterial;

  return (
    <group position={position} rotation={rotation}>
      {/* Spill containment berm */}
      <Box position={[0, -0.3, 0]} size={[11.6, 0.3, 4.8]} material={rockMaterial} />
      {[-5.7, 5.7].map((x, i) => (
        <Box key={`berm-x-${i}`} position={[x, -0.05, 0]} size={[0.2, 0.5, 4.8]} material={galvanizedSteelMaterial} />
      ))}
      {[-2.4, 2.4].map((z, i) => (
        <Box key={`berm-z-${i}`} position={[0, -0.05, z]} size={[11.6, 0.5, 0.2]} material={galvanizedSteelMaterial} />
      ))}

      {rows.map((row, ri) =>
        Array.from({ length: row.count }).map((_, i) => {
          const x = (i - (row.count - 1) / 2) * pitch;
          return (
            <group key={`tank-${ri}-${i}`} position={[x, 0.55, row.z]}>
              {/* ISO frame */}
              <Box position={[0, 0, 0]} size={[1.3, 1.1, 2.5]} material={galvanizedSteelMaterial} />
              {/* Tank barrel inside the frame */}
              <mesh castShadow position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.45, 0.45, 2.3, 16]} />
                <primitive attach="material" object={bodyMaterial} />
              </mesh>
              {/* Manway */}
              <Box position={[0, 0.55, 0]} size={[0.3, 0.12, 0.3]} material={steelLightMaterial} />
            </group>
          );
        }),
      )}

      {/* Transfer manifold running to the day-tank line */}
      <Box position={[0, 0.15, 2.15]} size={[11.0, 0.14, 0.14]} material={steelLightMaterial} />
      <Box position={[5.4, 0.15, 3.4]} size={[0.14, 0.14, 2.6]} material={steelLightMaterial} />
    </group>
  );
}

/* --- Photovoltaic Solar Array --- */
export function SolarPanelArray({ position = [-10, 0, -6], rotation = [0, 0.2, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {[-2.2, -1.1, 0, 1.1, 2.2].map((x, idx) => (
        <group key={idx} position={[x, 0, 0]}>
          {/* Angled Solar Panel */}
          <group position={[0, 1.35, 0]} rotation={[0.45, 0, 0]}>
            <Box position={[0, 0, 0]} size={[0.95, 0.04, 2.2]} material={solarMaterial} />
            <Box position={[0, -0.03, 0]} size={[0.98, 0.04, 2.24]} material={darkMetalMaterial} />
          </group>
          {/* Steel Ground Legs */}
          <Box position={[0, 0.7, -0.7]} size={[0.08, 1.4, 0.08]} material={galvanizedSteelMaterial} />
          <Box position={[0, 0.4, 0.6]} size={[0.08, 0.8, 0.08]} material={galvanizedSteelMaterial} />
        </group>
      ))}
    </group>
  );
}

/* --- Antarctic Snow Terrain & Drifts --- */
export function AntarcticTerrain() {
  const drifts = [
    [-14, -0.6, -9, 8, 0.9, 4.5, 0.3],
    [13, -0.6, -10, 9, 0.8, 4.2, -0.2],
    [-13, -0.6, 10, 7.5, 0.95, 4.0, 0.4],
    [14, -0.6, 9, 8, 0.85, 3.8, -0.3],
    [0, -0.8, -14, 12, 0.7, 5, 0],
    [-8, -0.7, 14, 10, 0.8, 4.5, 0.15],
  ];

  const rocks = [
    [-16, -0.4, -6, 1.8, 1.2, 1.5],
    [17, -0.4, -4, 2.2, 1.4, 1.8],
    [-12, -0.5, 15, 1.4, 0.9, 1.3],
    [15, -0.5, 13, 2.0, 1.1, 1.6],
  ];

  return (
    <group position={[0, -2.5, 0]}>
      {/* Main Ground Plane.
          A circle, not a rectangle: a 70x60 plane showed a hard straight
          edge floating against the viewport background from almost every
          orbit angle. A disc reads as open ice from all sides, and scene
          fog dissolves its rim. One segment ring is enough — it is flat. */}
      <mesh position={[0, -0.05, 0]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[58, 64]} />
        <primitive object={snowMaterial} attach="material" />
      </mesh>

      {/* Undulating Snow Drifts */}
      {drifts.map(([x, y, z, sx, sy, sz, rot], i) => (
        <mesh key={`drift-${i}`} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0, rot, 0]} receiveShadow>
          <sphereGeometry args={[1, 24, 12]} />
          <primitive object={snowDriftMaterial} attach="material" />
        </mesh>
      ))}

      {/* Exposed Antarctic Bedrock Outcrops */}
      {rocks.map(([x, y, z, sx, sy, sz], i) => (
        <mesh key={`rock-${i}`} position={[x, y, z]} scale={[sx, sy, sz]} rotation={[0.2, i * 0.7, 0.1]} castShadow receiveShadow>
          <dodecahedronGeometry args={[1, 0]} />
          <primitive object={rockMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
