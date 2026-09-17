import * as THREE from "three";

/* =========================================================
   BHARATI STATION DIGITAL TWIN — PBR MATERIAL SYSTEM
   Optimized shared materials for maximum performance
========================================================= */

// --- Station Structural Envelope & Exterior ---
export const stationHullMaterial = new THREE.MeshStandardMaterial({
  color: "#dce4ea",
  roughness: 0.42,
  metalness: 0.22,
});

export const stationHullDarkMaterial = new THREE.MeshStandardMaterial({
  color: "#27333d",
  roughness: 0.55,
  metalness: 0.38,
});

export const stationAccentOrangeMaterial = new THREE.MeshStandardMaterial({
  color: "#e66a28",
  roughness: 0.48,
  metalness: 0.15,
});

export const exteriorTrimMaterial = new THREE.MeshStandardMaterial({
  color: "#4d5b66",
  roughness: 0.5,
  metalness: 0.5,
});

// --- Structural Steel & Stilts ---
export const galvanizedSteelMaterial = new THREE.MeshStandardMaterial({
  color: "#3a4750",
  roughness: 0.45,
  metalness: 0.78,
});

export const steelLightMaterial = new THREE.MeshStandardMaterial({
  color: "#7a8a94",
  roughness: 0.38,
  metalness: 0.85,
});

export const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: "#1c242b",
  roughness: 0.6,
  metalness: 0.4,
});

export const metalMaterial = new THREE.MeshStandardMaterial({
  color: "#5b6873",
  roughness: 0.42,
  metalness: 0.72,
});

export const chromeMaterial = new THREE.MeshStandardMaterial({
  color: "#a4b3be",
  roughness: 0.25,
  metalness: 0.92,
});

// --- Interior Walls & Ceilings ---
export const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#f0f3f5",
  roughness: 0.78,
  metalness: 0.05,
});

export const wallAccentMaterial = new THREE.MeshStandardMaterial({
  color: "#3d5a73",
  roughness: 0.7,
  metalness: 0.1,
});

export const trimMaterial = new THREE.MeshStandardMaterial({
  color: "#bcc6ce",
  roughness: 0.6,
  metalness: 0.2,
});

export const ceilingMaterial = new THREE.MeshStandardMaterial({
  color: "#e2e8ec",
  roughness: 0.85,
});

// --- Floor Materials ---
export const floorLabMaterial = new THREE.MeshStandardMaterial({
  color: "#b0bcc4",
  roughness: 0.65,
  metalness: 0.08,
});

export const floorCorridorMaterial = new THREE.MeshStandardMaterial({
  color: "#9eaab3",
  roughness: 0.72,
  metalness: 0.05,
});

export const floorWoodMaterial = new THREE.MeshStandardMaterial({
  color: "#8c6239",
  roughness: 0.58,
  metalness: 0.02,
});

export const floorLivingMaterial = new THREE.MeshStandardMaterial({
  color: "#c2b4a3",
  roughness: 0.75,
  metalness: 0.02,
});

export const floorSteelPlateMaterial = new THREE.MeshStandardMaterial({
  color: "#47525a",
  roughness: 0.52,
  metalness: 0.65,
});

// Backward compatibility
export const floorMaterial = floorLabMaterial;
export const corridorMaterial = floorCorridorMaterial;
export const woodMaterial = floorWoodMaterial;

// --- Doors & Windows ---
export const doorFrameMaterial = new THREE.MeshStandardMaterial({
  color: "#2c3842",
  roughness: 0.45,
  metalness: 0.6,
});

export const doorWoodMaterial = new THREE.MeshStandardMaterial({
  color: "#784b28",
  roughness: 0.62,
});

export const doorLabMaterial = new THREE.MeshStandardMaterial({
  color: "#2a5d7c",
  roughness: 0.5,
  metalness: 0.2,
});

export const doorEmergencyMaterial = new THREE.MeshStandardMaterial({
  color: "#d94326",
  roughness: 0.48,
  metalness: 0.15,
});

export const doorMaterial = doorLabMaterial;

export const glassMaterial = new THREE.MeshStandardMaterial({
  color: "#5fa0bc",
  roughness: 0.1,
  metalness: 0.25,
  transparent: true,
  opacity: 0.45,
});

export const glassTintedMaterial = new THREE.MeshStandardMaterial({
  color: "#18455b",
  roughness: 0.12,
  metalness: 0.4,
  transparent: true,
  opacity: 0.78,
});

export const glassClearMaterial = new THREE.MeshStandardMaterial({
  color: "#9ec9db",
  roughness: 0.08,
  metalness: 0.15,
  transparent: true,
  opacity: 0.35,
});

// --- Furniture & Upholstery ---
export const tableTopMaterial = new THREE.MeshStandardMaterial({
  color: "#eceef0",
  roughness: 0.55,
  metalness: 0.05,
});

export const tableWoodMaterial = new THREE.MeshStandardMaterial({
  color: "#996b42",
  roughness: 0.65,
});

export const fabricBlueMaterial = new THREE.MeshStandardMaterial({
  color: "#234e70",
  roughness: 0.88,
});

export const fabricOrangeMaterial = new THREE.MeshStandardMaterial({
  color: "#d16828",
  roughness: 0.88,
});

export const fabricGreyMaterial = new THREE.MeshStandardMaterial({
  color: "#434f59",
  roughness: 0.85,
});

export const bedSheetMaterial = new THREE.MeshStandardMaterial({
  color: "#d4dde3",
  roughness: 0.9,
});

export const sanitaryMaterial = new THREE.MeshStandardMaterial({
  color: "#e8eff2",
  roughness: 0.3,
  metalness: 0.1,
});

// --- Technical & Displays ---
export const screenGlowMaterial = new THREE.MeshStandardMaterial({
  color: "#103d52",
  emissive: "#34b3cf",
  emissiveIntensity: 0.85,
  roughness: 0.2,
});

export const screenAmberMaterial = new THREE.MeshStandardMaterial({
  color: "#4a3212",
  emissive: "#f0a83a",
  emissiveIntensity: 0.9,
  roughness: 0.2,
});

export const indicatorGreenMaterial = new THREE.MeshStandardMaterial({
  color: "#1b4d2e",
  emissive: "#50e386",
  emissiveIntensity: 1.4,
  roughness: 0.2,
});

export const indicatorOrangeMaterial = new THREE.MeshStandardMaterial({
  color: "#523311",
  emissive: "#f09828",
  emissiveIntensity: 1.4,
  roughness: 0.2,
});

export const indicatorRedMaterial = new THREE.MeshStandardMaterial({
  color: "#521616",
  emissive: "#ff4d4d",
  emissiveIntensity: 1.4,
  roughness: 0.2,
});

export const solarMaterial = new THREE.MeshStandardMaterial({
  color: "#0a1f2e",
  emissive: "#0e344d",
  emissiveIntensity: 0.15,
  roughness: 0.18,
  metalness: 0.8,
});

// --- Environment: Snow & Rock ---
export const snowMaterial = new THREE.MeshStandardMaterial({
  color: "#ebf3f7",
  roughness: 0.95,
  metalness: 0.02,
});

export const snowDriftMaterial = new THREE.MeshStandardMaterial({
  color: "#dbe8ef",
  roughness: 0.98,
  metalness: 0.01,
});

export const rockMaterial = new THREE.MeshStandardMaterial({
  color: "#3b454a",
  roughness: 0.9,
  metalness: 0.15,
});

// --- Selection Highlight ---
export const selectedMaterial = new THREE.MeshStandardMaterial({
  color: "#19768f",
  emissive: "#19768f",
  emissiveIntensity: 0.45,
  roughness: 0.4,
});

export const blueMaterial = fabricBlueMaterial;

// --- Specialized Cutaway & Industrial Materials ---
export const hazardYellowMaterial = new THREE.MeshStandardMaterial({
  color: "#eab308",
  roughness: 0.45,
  metalness: 0.2,
});

export const wallCapMaterial = new THREE.MeshStandardMaterial({
  color: "#37474f",
  roughness: 0.5,
  metalness: 0.4,
});

export const laserGlowMaterial = new THREE.MeshStandardMaterial({
  color: "#059669",
  emissive: "#10b981",
  emissiveIntensity: 2.2,
  roughness: 0.1,
});

export const sampleTrayMaterial = new THREE.MeshStandardMaterial({
  color: "#475569",
  roughness: 0.8,
  metalness: 0.1,
});

