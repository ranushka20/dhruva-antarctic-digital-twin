import * as THREE from "three";

/* =========================================================
   BHARATI STATION DIGITAL TWIN — MATERIAL SYSTEM

   One palette, shared with the UI shell: cool neutrals carry the
   architecture, and saturation is reserved for things that mean
   something (station livery, status indicators, selection).

   Emissive values are deliberately low. The previous set ran at 1.4–2.2,
   which blew out under tone mapping and made every indicator read as a
   light source rather than a lamp.
========================================================= */

const PALETTE = {
  // Structure
  hull: "#d7dfe6",
  hullDark: "#2b343d",
  livery: "#d4682f", // Bharati's container livery orange
  trimOuter: "#4a5660",

  // Metal
  steelDark: "#39434c",
  steelMid: "#5a6570",
  steelLight: "#7c8792",
  steelChrome: "#a6b1bb",
  metalBlack: "#1d242b",

  // Interior surfaces
  wall: "#eef1f4",
  wallAccent: "#3c5468",
  trim: "#bcc4cc",
  ceiling: "#e3e8ec",

  // Floors
  floorLab: "#b2bcc4",
  floorCorridor: "#a1aab2",
  floorWood: "#8a6a4a",
  floorLiving: "#bfb5a8",
  floorSteel: "#49525b",

  // Environment
  snow: "#eef4f8",
  snowShade: "#dce7ef",
  rock: "#3e474e",

  // Meaning
  accent: "#6fb0d4", // matches the UI primary
  statusGreen: "#5cc98a",
  statusAmber: "#e8a53f",
  statusRed: "#e3685f",
};

const standard = (color, props = {}) =>
  new THREE.MeshStandardMaterial({ color, ...props });

/* --- Station envelope & exterior --- */
export const stationHullMaterial = standard(PALETTE.hull, {
  roughness: 0.46,
  metalness: 0.18,
});

export const stationHullDarkMaterial = standard(PALETTE.hullDark, {
  roughness: 0.58,
  metalness: 0.32,
});

export const stationAccentOrangeMaterial = standard(PALETTE.livery, {
  roughness: 0.52,
  metalness: 0.1,
});

export const exteriorTrimMaterial = standard(PALETTE.trimOuter, {
  roughness: 0.54,
  metalness: 0.42,
});

/* --- Structural steel & stilts --- */
export const galvanizedSteelMaterial = standard(PALETTE.steelDark, {
  roughness: 0.5,
  metalness: 0.7,
});

export const steelLightMaterial = standard(PALETTE.steelLight, {
  roughness: 0.44,
  metalness: 0.72,
});

export const darkMetalMaterial = standard(PALETTE.metalBlack, {
  roughness: 0.62,
  metalness: 0.38,
});

export const metalMaterial = standard(PALETTE.steelMid, {
  roughness: 0.46,
  metalness: 0.64,
});

export const chromeMaterial = standard(PALETTE.steelChrome, {
  roughness: 0.3,
  metalness: 0.86,
});

/* --- Interior walls & ceilings --- */
export const wallMaterial = standard(PALETTE.wall, {
  roughness: 0.82,
  metalness: 0.02,
});

export const wallAccentMaterial = standard(PALETTE.wallAccent, {
  roughness: 0.74,
  metalness: 0.06,
});

export const trimMaterial = standard(PALETTE.trim, {
  roughness: 0.64,
  metalness: 0.14,
});

export const ceilingMaterial = standard(PALETTE.ceiling, { roughness: 0.88 });

/* --- Floors --- */
export const floorLabMaterial = standard(PALETTE.floorLab, {
  roughness: 0.7,
  metalness: 0.05,
});

export const floorCorridorMaterial = standard(PALETTE.floorCorridor, {
  roughness: 0.76,
  metalness: 0.04,
});

export const floorWoodMaterial = standard(PALETTE.floorWood, {
  roughness: 0.64,
  metalness: 0.02,
});

export const floorLivingMaterial = standard(PALETTE.floorLiving, {
  roughness: 0.78,
  metalness: 0.02,
});

export const floorSteelPlateMaterial = standard(PALETTE.floorSteel, {
  roughness: 0.56,
  metalness: 0.58,
});

// Backward compatibility with older imports.
export const floorMaterial = floorLabMaterial;
export const corridorMaterial = floorCorridorMaterial;
export const woodMaterial = floorWoodMaterial;

/* --- Doors & glazing --- */
export const doorFrameMaterial = standard("#2f3943", {
  roughness: 0.5,
  metalness: 0.52,
});

export const doorWoodMaterial = standard("#7c5738", { roughness: 0.66 });

export const doorLabMaterial = standard("#31607d", {
  roughness: 0.54,
  metalness: 0.16,
});

export const doorEmergencyMaterial = standard("#c9503a", {
  roughness: 0.52,
  metalness: 0.1,
});

export const doorMaterial = doorLabMaterial;

export const glassMaterial = standard("#8fb9cd", {
  roughness: 0.12,
  metalness: 0.2,
  transparent: true,
  opacity: 0.38,
});

export const glassTintedMaterial = standard("#24475b", {
  roughness: 0.14,
  metalness: 0.35,
  transparent: true,
  opacity: 0.7,
});

export const glassClearMaterial = standard("#b3d3e1", {
  roughness: 0.1,
  metalness: 0.12,
  transparent: true,
  opacity: 0.28,
});

/* --- Furniture & upholstery --- */
export const tableTopMaterial = standard("#e9ecef", {
  roughness: 0.6,
  metalness: 0.04,
});

export const tableWoodMaterial = standard("#8f6b47", { roughness: 0.7 });

export const fabricBlueMaterial = standard("#2b4f6b", { roughness: 0.9 });
export const fabricOrangeMaterial = standard("#c06736", { roughness: 0.9 });
export const fabricGreyMaterial = standard("#464f58", { roughness: 0.88 });
export const bedSheetMaterial = standard("#d6dee4", { roughness: 0.92 });

export const sanitaryMaterial = standard("#e9eef1", {
  roughness: 0.34,
  metalness: 0.06,
});

/* --- Displays & indicators ---
   Screens read as lit panels, not lamps: low emissive, dark base colour. */
export const screenGlowMaterial = standard("#15323f", {
  emissive: PALETTE.accent,
  emissiveIntensity: 0.5,
  roughness: 0.24,
});

export const screenAmberMaterial = standard("#3c2e14", {
  emissive: PALETTE.statusAmber,
  emissiveIntensity: 0.45,
  roughness: 0.24,
});

export const indicatorGreenMaterial = standard("#1e3f2c", {
  emissive: PALETTE.statusGreen,
  emissiveIntensity: 0.85,
  roughness: 0.25,
});

export const indicatorOrangeMaterial = standard("#40300f", {
  emissive: PALETTE.statusAmber,
  emissiveIntensity: 0.85,
  roughness: 0.25,
});

export const indicatorRedMaterial = standard("#401c19", {
  emissive: PALETTE.statusRed,
  emissiveIntensity: 0.85,
  roughness: 0.25,
});

export const solarMaterial = standard("#101e29", {
  emissive: "#16303f",
  emissiveIntensity: 0.1,
  roughness: 0.22,
  metalness: 0.74,
});

export const laserGlowMaterial = standard("#177a56", {
  emissive: "#3ec78f",
  emissiveIntensity: 1,
  roughness: 0.15,
});

/* --- Environment --- */
export const snowMaterial = standard(PALETTE.snow, {
  roughness: 0.96,
  metalness: 0,
});

export const snowDriftMaterial = standard(PALETTE.snowShade, {
  roughness: 0.98,
  metalness: 0,
});

export const rockMaterial = standard(PALETTE.rock, {
  roughness: 0.92,
  metalness: 0.1,
});

/* --- Selection ---
   Tinted, not glowing: the selected room should read as highlighted
   without becoming the brightest thing on screen. */
export const selectedMaterial = standard("#5b93b4", {
  emissive: PALETTE.accent,
  emissiveIntensity: 0.22,
  roughness: 0.48,
  metalness: 0.08,
});

export const blueMaterial = fabricBlueMaterial;

/* --- Industrial / cutaway --- */
export const hazardYellowMaterial = standard("#d9a521", {
  roughness: 0.5,
  metalness: 0.16,
});

export const wallCapMaterial = standard("#3b4851", {
  roughness: 0.54,
  metalness: 0.34,
});

export const sampleTrayMaterial = standard("#4b5663", {
  roughness: 0.82,
  metalness: 0.08,
});

export { PALETTE };

/* --- Zone status ---
   Used only when the state model has an actual basis for a status. Most
   zones on this station have neither a feed nor a model behind them, so
   their honest status is "unknown" and they carry no tint at all — the
   absence of colour is information here, not an oversight. */
export const zoneWatchMaterial = standard("#8a6a2e", {
  emissive: PALETTE.statusAmber,
  emissiveIntensity: 0.18,
  roughness: 0.6,
  metalness: 0.05,
});

export const zoneRiskMaterial = standard("#8a3d36", {
  emissive: PALETTE.statusRed,
  emissiveIntensity: 0.22,
  roughness: 0.6,
  metalness: 0.05,
});

export const zoneOkMaterial = standard("#35705a", {
  emissive: PALETTE.statusGreen,
  emissiveIntensity: 0.14,
  roughness: 0.62,
  metalness: 0.05,
});

/** null means "no basis for a status" — render the surface untinted. */
export function zoneStatusMaterial(status) {
  if (status === "risk") return zoneRiskMaterial;
  if (status === "watch") return zoneWatchMaterial;
  if (status === "ok") return zoneOkMaterial;
  return null;
}
