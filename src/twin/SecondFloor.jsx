import Box from "./components/Box";
import {
  MetObservatoryInterior,
  SatProcessingInterior,
} from "./components/InteriorFurniture";
import InteriorRoom from "./components/InteriorRoom";
import Railings from "./components/Railings";
import Stairs from "./components/Stairs";
import {
  darkMetalMaterial,
  floorCorridorMaterial,
  galvanizedSteelMaterial,
  trimMaterial,
} from "./components/materials";
import { SECOND_ROOMS } from "./stationData";

export default function SecondFloor({ selectedId, onSelect }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Central Corridor & Stairway to First Floor */}
      <Box position={[-1.6, 0.06, 0.4]} size={[17.0, 0.12, 1.8]} material={floorCorridorMaterial} />
      <Stairs position={[-4.6, 0, 0.4]} rotation={[0, Math.PI / 2, 0]} steps={8} width={1.1} totalHeight={2.4} totalDepth={2.0} />

      {/* Outdoor Science Terrace Platform Deck */}
      <group position={[9.2, 0, 0.4]}>
        <Box position={[0, 0.06, 0]} size={[4.2, 0.12, 9.4]} material={galvanizedSteelMaterial} />
        {/* Perimeter Safety Railings */}
        <Railings position={[2.1, 0.1, 0]} length={9.4} orientation="z" posts={6} />
        <Railings position={[-0.1, 0.1, -4.7]} length={4.4} orientation="x" posts={3} />
        <Railings position={[-0.1, 0.1, 4.7]} length={4.4} orientation="x" posts={3} />

        {/* Outdoor Atmospheric Air Samplers & Anemometers on Deck */}
        <group position={[0.8, 0, -2.5]}>
          <Box position={[0, 0.6, 0]} size={[0.1, 1.2, 0.1]} material={darkMetalMaterial} />
          <Box position={[0, 1.25, 0]} size={[0.45, 0.25, 0.45]} material={trimMaterial} />
        </group>
        <group position={[0.8, 0, 2.5]}>
          <Box position={[0, 0.6, 0]} size={[0.1, 1.2, 0.1]} material={darkMetalMaterial} />
          <Box position={[0, 1.25, 0]} size={[0.45, 0.25, 0.45]} material={trimMaterial} />
        </group>
      </group>


      {/* --- ROOM 1: Meteorological Observatory --- */}
      <InteriorRoom
        room={SECOND_ROOMS[0]}
        selected={selectedId === SECOND_ROOMS[0].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: 1.0, type: "lab" }}
        windowConfig={{ side: "back" }}
      >
        <MetObservatoryInterior />
      </InteriorRoom>

      {/* --- ROOM 2: Satellite Earth Station --- */}
      <InteriorRoom
        room={SECOND_ROOMS[1]}
        selected={selectedId === SECOND_ROOMS[1].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: -1.2, type: "emergency" }}
        windowConfig={{ side: "back" }}
      >
        <SatProcessingInterior />
      </InteriorRoom>
    </group>
  );
}
