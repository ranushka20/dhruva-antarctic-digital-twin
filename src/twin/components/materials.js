import * as THREE from "three";

export const floorMaterial = new THREE.MeshStandardMaterial({
  color: "#d8d3ca",
  roughness: 0.72,
  metalness: 0.05,
});

export const corridorMaterial = new THREE.MeshStandardMaterial({
  color: "#c9c4bc",
  roughness: 0.82,
  metalness: 0.02,
});

export const wallMaterial = new THREE.MeshStandardMaterial({
  color: "#eeeeea",
  roughness: 0.7,
});

export const trimMaterial = new THREE.MeshStandardMaterial({
  color: "#cfd1d3",
  roughness: 0.65,
});

export const doorMaterial = new THREE.MeshStandardMaterial({
  color: "#754a2d",
  roughness: 0.55,
});

export const glassMaterial = new THREE.MeshStandardMaterial({
  color: "#87b7d8",
  transparent: true,
  opacity: 0.42,
  roughness: 0.15,
  metalness: 0.1,
});

export const metalMaterial = new THREE.MeshStandardMaterial({
  color: "#69727a",
  roughness: 0.42,
  metalness: 0.7,
});

export const darkMetalMaterial = new THREE.MeshStandardMaterial({
  color: "#242932",
  roughness: 0.45,
  metalness: 0.35,
});

export const blueMaterial = new THREE.MeshStandardMaterial({
  color: "#386fa8",
  roughness: 0.8,
});

export const woodMaterial = new THREE.MeshStandardMaterial({
  color: "#8a5a35",
  roughness: 0.65,
});

export const sanitaryMaterial = new THREE.MeshStandardMaterial({
  color: "#d9e1e4",
  roughness: 0.35,
  metalness: 0.05,
});
