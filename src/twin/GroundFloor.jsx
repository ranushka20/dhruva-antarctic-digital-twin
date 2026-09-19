import Box from "./components/Box";
import { EntranceDeck, StationStilts } from "./components/Exterior";
import {
  EarthSciencesLabInterior,
  EntryAirlockInterior,
  PowerPlantInterior,
  WaterPlantInterior,
  WorkshopInterior,
} from "./components/InteriorFurniture";
import InteriorRoom from "./components/InteriorRoom";
import Stairs from "./components/Stairs";
import {
  floorCorridorMaterial,
} from "./components/materials";
import { GROUND_ROOMS } from "./stationData";

export default function GroundFloor({ selectedId, onSelect }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Structural Stilts underneath Ground Floor */}
      <StationStilts width={23} depth={12.5} height={2.5} />

      {/* Central Circulation Corridor Floor */}
      <Box position={[0.8, 0.06, 0.1]} size={[23.0, 0.12, 2.0]} material={floorCorridorMaterial} />

      {/* Stairways to First Floor */}
      <Stairs position={[-4.6, 0, 0.1]} rotation={[0, Math.PI / 2, 0]} steps={8} width={1.1} totalHeight={2.4} totalDepth={2.0} />
      <Stairs position={[6.6, 0, 0.1]} rotation={[0, -Math.PI / 2, 0]} steps={8} width={1.1} totalHeight={2.4} totalDepth={2.0} />


      {/* Cantilevered Main Entrance Deck Platform & Steps */}
      <EntranceDeck position={[-1.8, 0, 6.2]} width={5.2} depth={2.4} stairHeight={2.4} />

      {/* --- ROOM 1: Science Laboratory --- */}
      <InteriorRoom
        room={GROUND_ROOMS[0]}
        selected={selectedId === GROUND_ROOMS[0].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: 1.2, type: "lab" }}
        windowConfig={{ side: "back" }}
      >
        <EarthSciencesLabInterior />
      </InteriorRoom>

      {/* --- ROOM 2: Waste Store --- */}
      <InteriorRoom
        room={GROUND_ROOMS[1]}
        selected={selectedId === GROUND_ROOMS[1].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: -0.8, type: "lab" }}
        windowConfig={{ side: "back" }}
      >
        <WaterPlantInterior />
      </InteriorRoom>

      {/* --- ROOM 3: Wastewater & MBR Plant --- */}
      <InteriorRoom
        room={GROUND_ROOMS[2]}
        selected={selectedId === GROUND_ROOMS[2].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: 0.8, type: "lab" }}
        windowConfig={{ side: "back" }}
      >
        <WaterPlantInterior />
      </InteriorRoom>

      {/* --- ROOM 4: Fuel Storage Room --- */}
      <InteriorRoom
        room={GROUND_ROOMS[3]}
        selected={selectedId === GROUND_ROOMS[3].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: -0.8, type: "lab" }}
        windowConfig={{ side: "back" }}
      >
        <WaterPlantInterior />
      </InteriorRoom>

      {/* --- ROOM 5: Heavy Workshop & Maintenance --- */}
      <InteriorRoom
        room={GROUND_ROOMS[4]}
        selected={selectedId === GROUND_ROOMS[4].id}
        onSelect={onSelect}
        doorConfig={{ side: "back", offset: 1.0, type: "emergency" }}
        windowConfig={{ side: "front" }}
      >
        <WorkshopInterior />
      </InteriorRoom>

      {/* --- ROOM 6: Main Entry Airlock & Mudroom --- */}
      <InteriorRoom
        room={GROUND_ROOMS[5]}
        selected={selectedId === GROUND_ROOMS[5].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: 0, type: "emergency" }}
        windowConfig={{ side: "none" }}
      >
        <EntryAirlockInterior />
      </InteriorRoom>

      {/* --- ROOM 7: Seawater RO Plant --- */}
      <InteriorRoom
        room={GROUND_ROOMS[6]}
        selected={selectedId === GROUND_ROOMS[6].id}
        onSelect={onSelect}
        doorConfig={{ side: "back", offset: -0.8, type: "lab" }}
        windowConfig={{ side: "front" }}
      >
        <WaterPlantInterior />
      </InteriorRoom>

      {/* --- ROOM 8: CHP Power Station --- */}
      <InteriorRoom
        room={GROUND_ROOMS[7]}
        selected={selectedId === GROUND_ROOMS[7].id}
        onSelect={onSelect}
        doorConfig={{ side: "back", offset: 0.8, type: "emergency" }}
        windowConfig={{ side: "front" }}
      >
        <PowerPlantInterior />
      </InteriorRoom>
    </group>
  );
}
