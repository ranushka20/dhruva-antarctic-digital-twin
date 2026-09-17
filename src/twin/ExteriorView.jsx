import Box from "./components/Box";
import Door from "./components/Door";
import {
  AntarcticTerrain,
  EntranceDeck,
  RooftopEquipment,
  SolarPanelArray,
  StationStilts,
} from "./components/Exterior";
import Window from "./components/Window";
import {
  darkMetalMaterial,
  galvanizedSteelMaterial,
  selectedMaterial,
  stationAccentOrangeMaterial,
  stationHullDarkMaterial,
  stationHullMaterial,
  steelLightMaterial,
} from "./components/materials";
import { EXTERIOR_ASSETS } from "./stationData";

export default function ExteriorView({ selectedId, onSelect }) {
  const handleSelect = (asset) => {
    onSelect?.(asset);
  };

  const isSelected = (id) => selectedId === id;

  return (
    <group position={[0, 0, 0]}>
      {/* Antarctic Snow Terrain & Drifts */}
      <AntarcticTerrain />

      {/* Photovoltaic Solar Array */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          handleSelect(EXTERIOR_ASSETS[1]);
        }}
      >
        <SolarPanelArray position={[-14, 0, -5]} rotation={[0, 0.25, 0]} />
        {isSelected(EXTERIOR_ASSETS[1].id) && (
          <mesh position={[-14, 0.1, -5]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[4, 4.4, 32]} />
            <primitive object={selectedMaterial} attach="material" />
          </mesh>
        )}
      </group>

      {/* Auxiliary Backup Generator Container Pod */}
      <group
        position={[15, 0, 4]}
        onClick={(e) => {
          e.stopPropagation();
          handleSelect(EXTERIOR_ASSETS[3]);
        }}
      >
        {/* Foundation Stilts */}
        {[-1.8, 1.8].map((x) =>
          [-1.0, 1.0].map((z) => (
            <Box key={`${x}-${z}`} position={[x, -0.6, z]} size={[0.2, 1.2, 0.2]} material={galvanizedSteelMaterial} />
          ))
        )}
        {/* Container Body */}
        <Box
          position={[0, 0.9, 0]}
          size={[4.5, 2.2, 2.6]}
          material={isSelected(EXTERIOR_ASSETS[3].id) ? selectedMaterial : stationHullDarkMaterial}
        />
        <Box position={[0, 2.05, 0]} size={[4.6, 0.1, 2.7]} material={steelLightMaterial} />
        {/* Louvers & Exhausts */}
        <Box position={[2.26, 0.9, 0]} size={[0.04, 1.4, 1.6]} material={darkMetalMaterial} />
        <Box position={[-1.2, 2.6, 0]} size={[0.25, 1.1, 0.25]} material={steelLightMaterial} />
      </group>

      {/* Fuel Storage Module Tanks */}
      <group position={[15, 0, -4]}>
        {[-1.6, 0, 1.6].map((x, idx) => (
          <group key={idx} position={[x, 0.8, 0]}>
            <Box position={[0, -0.6, 0]} size={[0.15, 1.2, 1.6]} material={galvanizedSteelMaterial} />
            <mesh position={[0, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
              <cylinderGeometry args={[0.7, 0.7, 2.2, 24]} />
              <primitive object={darkMetalMaterial} attach="material" />
            </mesh>
          </group>
        ))}
      </group>

      {/* --- MAIN ELEVATED STATION STRUCTURE --- */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          handleSelect(EXTERIOR_ASSETS[0]);
        }}
      >
        {/* Structural Steel Stilts & Grid */}
        <StationStilts width={24} depth={12.5} height={2.5} />

        {/* Cantilevered Entrance Deck Platform & Main Access Stairs */}
        <EntranceDeck position={[-1.8, 0, 6.25]} width={5.2} depth={2.5} stairHeight={2.4} />

        {/* --- AERODYNAMIC FACETED STATION HULL --- */}
        {/* Lower Hull Section */}
        <group position={[0, 2.4, 0]}>
          {/* Main Central Hull Body */}
          <Box
            position={[0.8, 0, 0]}
            size={[23.6, 4.8, 12.2]}
            material={isSelected(EXTERIOR_ASSETS[0].id) ? selectedMaterial : stationHullMaterial}
          />

          {/* Chamfered Aerodynamic Corner Facets */}
          {[-11.0, 12.6].map((x, idx) => (
            <group key={`corner-${idx}`} position={[x, 0, 0]}>
              <Box position={[0, 0, -6.1]} size={[1.8, 4.8, 0.2]} material={stationHullDarkMaterial} />
              <Box position={[0, 0, 6.1]} size={[1.8, 4.8, 0.2]} material={stationHullDarkMaterial} />
            </group>
          ))}

          {/* Roof Cap Overhang with Dark Metal Trim */}
          <Box position={[0.8, 2.5, 0]} size={[24.2, 0.22, 12.8]} material={stationHullDarkMaterial} />
          <Box position={[0.8, -2.45, 0]} size={[23.8, 0.16, 12.4]} material={stationHullDarkMaterial} />

          {/* Upper Penthouses & Rooftop Observations */}
          <Box position={[-1.6, 3.4, 0.4]} size={[17.4, 1.6, 9.8]} material={stationHullMaterial} />
          <Box position={[-1.6, 4.25, 0.4]} size={[17.8, 0.15, 10.2]} material={stationHullDarkMaterial} />

          {/* Rooftop Meteorological Equipment, Radome, and Antennas */}
          <RooftopEquipment position={[0, 4.3, 0]} />

          {/* --- FACADE WINDOW BANDS --- */}
          {/* Front Continuous Ribbon Windows (First Floor) */}
          {[-8, -5.2, -2.4, 0.4, 3.2, 6.0, 8.8].map((x, idx) => (
            <Window key={`front-win-1-${idx}`} position={[x, 0.7, 6.12]} width={2.2} height={0.95} mullions={2} />
          ))}
          {/* Front Ground Floor Windows */}
          {[-8, -5.2, 3.2, 6.0, 8.8].map((x, idx) => (
            <Window key={`front-win-0-${idx}`} position={[x, -1.3, 6.12]} width={2.0} height={0.85} mullions={1} />
          ))}

          {/* Main Entrance Double Doors on Front Facade */}
          <Door
            position={[-1.8, -2.4, 6.12]}
            width={1.6}
            height={2.2}
            type="emergency"
            hasStatusLight
            hasVisionPanel
          />

          {/* Back Continuous Ribbon Windows (North Facade) */}
          {[-8, -5.2, -2.4, 0.4, 3.2, 6.0, 8.8].map((x, idx) => (
            <Window key={`back-win-1-${idx}`} position={[x, 0.7, -6.12]} rotation={[0, Math.PI, 0]} width={2.2} height={0.95} mullions={2} />
          ))}
          {[-8, -5.2, 0.4, 3.2, 6.0, 8.8].map((x, idx) => (
            <Window key={`back-win-0-${idx}`} position={[x, -1.3, -6.12]} rotation={[0, Math.PI, 0]} width={2.0} height={0.85} mullions={1} />
          ))}

          {/* West & East End Facade Windows */}
          {[-2.5, 0, 2.5].map((z, idx) => (
            <Window key={`west-win-${idx}`} position={[-11.02, 0.7, z]} rotation={[0, -Math.PI / 2, 0]} width={1.8} height={0.95} mullions={1} />
          ))}
          {[-2.5, 0, 2.5].map((z, idx) => (
            <Window key={`east-win-${idx}`} position={[12.62, 0.7, z]} rotation={[0, Math.PI / 2, 0]} width={1.8} height={0.95} mullions={1} />
          ))}

          {/* Station Facade Architectural Vertical Seam Trims */}
          {[-10, -6, -2, 2, 6, 10].map((x, idx) => (
            <Box key={`seam-front-${idx}`} position={[x, 0, 6.12]} size={[0.06, 4.6, 0.04]} material={stationAccentOrangeMaterial} castShadow={false} />
          ))}
          {[-10, -6, -2, 2, 6, 10].map((x, idx) => (
            <Box key={`seam-back-${idx}`} position={[x, 0, -6.12]} size={[0.06, 4.6, 0.04]} material={stationAccentOrangeMaterial} castShadow={false} />
          ))}
        </group>
      </group>
    </group>
  );
}
