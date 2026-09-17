import Box from "./components/Box";
import {
  ConferenceRoomInterior,
  ControlRoomInterior,
  CrewCabinsBunkInterior,
  CrewCabinsSingleInterior,
  DiningLoungeInterior,
  GalleyKitchenInterior,
  MedicalBayInterior,
  SatComInterior,
} from "./components/InteriorFurniture";
import InteriorRoom from "./components/InteriorRoom";
import Stairs from "./components/Stairs";
import {
  floorCorridorMaterial,
} from "./components/materials";
import { FIRST_ROOMS } from "./stationData";

export default function FirstFloor({ selectedId, onSelect }) {
  return (
    <group position={[0, 0, 0]}>
      {/* Central Corridor Floor */}
      <Box position={[0.8, 0.06, 0.1]} size={[23.0, 0.12, 2.0]} material={floorCorridorMaterial} />

      {/* Stairway Connection to Ground and Second Floor */}
      <Stairs position={[-4.6, 0, 0.1]} rotation={[0, Math.PI / 2, 0]} steps={8} width={1.1} totalHeight={2.4} totalDepth={2.0} />
      <Stairs position={[6.6, 0, 0.1]} rotation={[0, -Math.PI / 2, 0]} steps={8} width={1.1} totalHeight={2.4} totalDepth={2.0} />


      {/* --- ROOM 1: Control Room --- */}
      <InteriorRoom
        room={FIRST_ROOMS[0]}
        selected={selectedId === FIRST_ROOMS[0].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: 1.2, type: "emergency" }}
        windowConfig={{ side: "back" }}
      >
        <ControlRoomInterior />
      </InteriorRoom>

      {/* --- ROOM 2: Communication Center --- */}
      <InteriorRoom
        room={FIRST_ROOMS[1]}
        selected={selectedId === FIRST_ROOMS[1].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: -0.8, type: "lab" }}
        windowConfig={{ side: "back" }}
      >
        <SatComInterior />
      </InteriorRoom>

      {/* --- ROOM 3: Crew Cabins (A & B) --- */}
      <InteriorRoom
        room={FIRST_ROOMS[2]}
        selected={selectedId === FIRST_ROOMS[2].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: 0.8, type: "wood" }}
        windowConfig={{ side: "back" }}
      >
        <CrewCabinsSingleInterior />
      </InteriorRoom>

      {/* --- ROOM 4: Crew Cabins (C & D) --- */}
      <InteriorRoom
        room={FIRST_ROOMS[3]}
        selected={selectedId === FIRST_ROOMS[3].id}
        onSelect={onSelect}
        doorConfig={{ side: "front", offset: -0.8, type: "wood" }}
        windowConfig={{ side: "back" }}
      >
        <CrewCabinsBunkInterior />
      </InteriorRoom>

      {/* --- ROOM 5: Medical Bay & Tele-ICU --- */}
      <InteriorRoom
        room={FIRST_ROOMS[4]}
        selected={selectedId === FIRST_ROOMS[4].id}
        onSelect={onSelect}
        doorConfig={{ side: "back", offset: 1.0, type: "lab" }}
        windowConfig={{ side: "front" }}
      >
        <MedicalBayInterior />
      </InteriorRoom>

      {/* --- ROOM 6: Galley & Pantry --- */}
      <InteriorRoom
        room={FIRST_ROOMS[5]}
        selected={selectedId === FIRST_ROOMS[5].id}
        onSelect={onSelect}
        doorConfig={{ side: "back", offset: -0.8, type: "emergency" }}
        windowConfig={{ side: "front" }}
      >
        <GalleyKitchenInterior />
      </InteriorRoom>

      {/* --- ROOM 7: Dining Hall & Crew Lounge --- */}
      <InteriorRoom
        room={FIRST_ROOMS[6]}
        selected={selectedId === FIRST_ROOMS[6].id}
        onSelect={onSelect}
        doorConfig={{ side: "back", offset: 0.8, type: "wood" }}
        windowConfig={{ side: "front" }}
      >
        <DiningLoungeInterior />
      </InteriorRoom>

      {/* --- ROOM 8: Conference & Briefing Room --- */}
      <InteriorRoom
        room={FIRST_ROOMS[7]}
        selected={selectedId === FIRST_ROOMS[7].id}
        onSelect={onSelect}
        doorConfig={{ side: "back", offset: -0.8, type: "wood" }}
        windowConfig={{ side: "front" }}
      >
        <ConferenceRoomInterior />
      </InteriorRoom>
    </group>
  );
}
