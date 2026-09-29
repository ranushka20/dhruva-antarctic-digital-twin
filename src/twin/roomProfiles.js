import { FIRST_ROOMS, GROUND_ROOMS, SECOND_ROOMS } from "./stationData";
import { BHARATI_ZONE_ROOMS } from "./zoneRooms";

/**
 * Each Bharati room's share of the station's power and heat, for the twin's
 * "Why this matters". Nothing at Bharati meters individual rooms, so these
 * are ours, set by hand.
 *
 * They are SHARES, not kW. The engine turns them into kW and fuel, so the
 * rooms always add up to exactly the station. The per-room powerKw the twin
 * once carried summed to 436 kW against a ~379 kW fleet; shares can't drift
 * like that.
 *
 * - Equipment: each room's share of the station's baseline electrical load,
 *   from what runs there. Sums to 1.
 * - Heat: each room's share of the heated shell, from its floor area in the
 *   3D model, weighted up where more of it faces outside (the roof over the
 *   second floor, the underside of the ground floor on its stilts).
 */
const EQUIPMENT_SHARE = {
  // Ground floor: plant and services
  "chp-station": 0.08, // generator auxiliaries, pumps, controls
  "ro-plant": 0.12, // high-pressure seawater pumps
  "wastewater-plant": 0.08, // MBR blowers
  "science-lab": 0.14,
  workshop: 0.07,
  "fuel-store": 0.02, // transfer pumps
  "waste-store": 0.02, // compactor
  "entrance-airlock": 0.01,
  // First floor: operations and living
  "control-room": 0.04,
  "comms-room": 0.05,
  "galley-kitchen": 0.09, // ovens, cold rooms
  "berthing-ab": 0.04,
  "berthing-cd": 0.04,
  "medical-bay": 0.04,
  "dining-lounge": 0.03,
  "briefing-room": 0.02,
  // Second floor: instruments
  "met-observatory": 0.06,
  "earth-station": 0.05,
};

const EXPOSURE = { ground: 1.2, first: 1.0, second: 1.4 };

/**
 * Current faults, by the room they are in. Each makes the station burn more fuel.
 * @type {Record<string, import("@/engine/zoneTrace").ZoneCondition>}
 */
const ROOM_CONDITIONS = {
  "chp-station": { kind: "efficiency", points: 2, what: "Generator #2 running hot" },
  workshop: { kind: "heatLoss", pct: 30, what: "A worn workshop door seal" },
};

/** The room that holds the station's fuel tells the station fuel story. */
const FUEL_ROOM = "fuel-store";

const ROOMS = [...GROUND_ROOMS, ...FIRST_ROOMS, ...SECOND_ROOMS];
const exposedArea = (room) => room.w * room.d * (EXPOSURE[room.floorId] ?? 1);
const TOTAL_EXPOSED = ROOMS.reduce((sum, room) => sum + exposedArea(room), 0);
const ENVELOPE_SHARE = Object.fromEntries(
  ROOMS.map((room) => [room.id, exposedArea(room) / TOTAL_EXPOSED]),
);

/**
 * The engine profile for one room, or undefined for anything that isn't an indoor room.
 * @param {string} roomId
 * @returns {import("@/engine/zoneTrace").ZoneTraceProfile | undefined}
 */
export function roomTraceProfile(roomId) {
  if (!(roomId in ENVELOPE_SHARE)) return undefined;
  const condition = ROOM_CONDITIONS[roomId];
  return {
    loadShare: EQUIPMENT_SHARE[roomId] ?? 0,
    envelopeShare: ENVELOPE_SHARE[roomId],
    ...(roomId === FUEL_ROOM ? { story: "fuel" } : {}),
    ...(condition ? { condition } : {}),
  };
}

/**
 * A zone's profile is the sum of its rooms'. A room's extra heat loss is
 * re-expressed over the whole zone's shell, so the zone reports the same
 * cost in fuel as the room it comes from.
 * @param {string} code
 * @returns {import("@/engine/zoneTrace").ZoneTraceProfile | undefined}
 */
export function zoneTraceProfile(code) {
  const rooms = (BHARATI_ZONE_ROOMS[code] ?? [])
    .map((id) => ({ id, profile: roomTraceProfile(id) }))
    .filter((r) => r.profile);
  if (rooms.length === 0) return undefined;

  const loadShare = rooms.reduce((sum, r) => sum + r.profile.loadShare, 0);
  const envelopeShare = rooms.reduce((sum, r) => sum + r.profile.envelopeShare, 0);
  const withFault = rooms.find((r) => r.profile.condition);

  let condition = withFault?.profile.condition;
  if (condition?.kind === "heatLoss") {
    const extra = condition.pct / 100;
    const k = (withFault.profile.envelopeShare / envelopeShare) * (extra / (1 + extra));
    condition = { ...condition, pct: (k / (1 - k)) * 100 };
  }

  return {
    loadShare,
    envelopeShare,
    ...(rooms.some((r) => r.profile.story === "fuel") ? { story: "fuel" } : {}),
    ...(condition ? { condition } : {}),
  };
}
