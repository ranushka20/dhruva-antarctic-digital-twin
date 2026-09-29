import { ALL_OBJECTS } from "./stationData";

/**
 * Which 3D rooms belong to each operational zone in mock/bharati.json.
 *
 * The zone list (six zones, from the station-state mock) and the 3D model
 * (seventeen rooms over three floors, from stationData.js) were built
 * separately; this is the one join between them. Rooms left out — control
 * room, briefing room, main entry, RO and wastewater plants — belong to no
 * monitored zone yet, and the twin says so rather than guessing a status.
 *
 * Every room of a given model zone (`room.zone`) maps to the same zone code,
 * so status can be handed to the 3D keyed by model zone without conflict.
 */
export const BHARATI_ZONE_ROOMS = {
  A1: ["chp-station"],
  A2: ["fuel-store"],
  A3: ["comms-room", "earth-station"],
  B1: ["berthing-ab", "berthing-cd", "medical-bay", "galley-kitchen", "dining-lounge"],
  B2: ["science-lab", "met-observatory"],
  B3: ["workshop", "waste-store"],
};

export const FLOORS = [
  { id: "ground", label: "Ground floor" },
  { id: "first", label: "First floor" },
  { id: "second", label: "Second floor" },
];

const ROOM_BY_ID = Object.fromEntries(ALL_OBJECTS.map((o) => [o.id, o]));

export function getRoom(roomId) {
  return ROOM_BY_ID[roomId];
}

/** Rooms of a zone, optionally only those on one floor. */
export function roomsForZone(code, floorId) {
  return (BHARATI_ZONE_ROOMS[code] ?? [])
    .map((id) => ROOM_BY_ID[id])
    .filter((room) => room && (!floorId || room.floorId === floorId));
}

/** Floors a zone has rooms on, in building order. */
export function floorsForZone(code) {
  const onFloors = new Set(roomsForZone(code).map((room) => room.floorId));
  return FLOORS.filter((f) => onFloors.has(f.id)).map((f) => f.id);
}

export function zoneForRoom(roomId) {
  return Object.keys(BHARATI_ZONE_ROOMS).find((code) =>
    BHARATI_ZONE_ROOMS[code].includes(roomId),
  );
}

/** The 3D tints by model zone and names its alarm state "risk". */
const TWIN_STATUS = { ok: "ok", watch: "watch", warning: "risk" };

/** Zone statuses re-keyed for the 3D's ZoneStatusProvider. */
export function twinZoneStatus(zones) {
  const map = {};
  for (const zone of zones) {
    const status = TWIN_STATUS[zone.status];
    if (!status) continue;
    for (const room of roomsForZone(zone.code)) map[room.zone] = status;
  }
  return map;
}
