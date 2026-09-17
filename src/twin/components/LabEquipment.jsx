import * as THREE from "three";
import Box from "./Box";
import { glassMaterial, metalMaterial, trimMaterial, woodMaterial } from "./materials";

function Bench({ position, width = 2.1 }) {
  return (
    <group position={position}>
      <Box position={[0, 0.72, 0]} size={[width, 0.12, 0.7]} material={woodMaterial} />
      {[-width / 2 + 0.14, width / 2 - 0.14].map((x) => (
        <Box key={x} position={[x, 0.35, 0]} size={[0.08, 0.7, 0.08]} material={metalMaterial} />
      ))}
    </group>
  );
}

function Cabinet({ position }) {
  return (
    <Box position={position} size={[0.55, 1.45, 0.65]} material={trimMaterial} />
  );
}

function EquipmentUnit({ position, color = "#5f7786" }) {
  return (
    <group position={position}>
      <Box position={[0, 0.28, 0]} size={[0.4, 0.48, 0.38]} material={metalMaterial} />
      <Box
        position={[0, 0.58, 0]}
        size={[0.22, 0.08, 0.03]}
        material={new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2 })}
        castShadow={false}
        receiveShadow={false}
      />
    </group>
  );
}

export function ElectricalLabEquipment({ room }) {
  return (
    <group>
      <Bench position={[room.x - 0.8, 0, room.z - 0.55]} width={1.7} />
      <Bench position={[room.x + 0.9, 0, room.z + 0.55]} width={1.7} />
      <Cabinet position={[room.x - room.width / 2 + 0.45, 0.75, room.z + 0.8]} />
      <EquipmentUnit position={[room.x - 1.1, 0, room.z - 0.55]} color="#4dc3e8" />
      <EquipmentUnit position={[room.x + 0.6, 0, room.z + 0.55]} color="#f2b45c" />
    </group>
  );
}

export function LifeSciencesLabEquipment({ room }) {
  return (
    <group>
      <Bench position={[room.x - 0.75, 0, room.z - 0.55]} width={1.8} />
      <Bench position={[room.x + 0.85, 0, room.z + 0.55]} width={1.8} />
      <Cabinet position={[room.x - room.width / 2 + 0.42, 0.75, room.z + 0.85]} />
      <EquipmentUnit position={[room.x - 0.8, 0, room.z - 0.55]} color="#63e6a3" />
      <Box position={[room.x + 1.15, 0.55, room.z - 0.9]} size={[0.48, 1.0, 0.48]} material={glassMaterial} />
    </group>
  );
}

export function ChemicalLabEquipment({ room }) {
  return (
    <group>
      <Bench position={[room.x - 0.75, 0, room.z - 0.55]} width={1.8} />
      <Bench position={[room.x + 0.85, 0, room.z + 0.55]} width={1.8} />
      <Cabinet position={[room.x - room.width / 2 + 0.42, 0.75, room.z + 0.85]} />
      <EquipmentUnit position={[room.x - 0.8, 0, room.z - 0.55]} color="#f2b45c" />
      <Box position={[room.x + 1.1, 0.7, room.z - 0.85]} size={[0.42, 1.25, 0.42]} material={glassMaterial} />
    </group>
  );
}

export function EarthSciencesLabEquipment({ room }) {
  return (
    <group>
      <Bench position={[room.x - 0.75, 0, room.z - 0.55]} width={1.8} />
      <Bench position={[room.x + 0.85, 0, room.z + 0.55]} width={1.8} />
      <Cabinet position={[room.x - room.width / 2 + 0.42, 0.75, room.z + 0.85]} />
      <Box position={[room.x - 0.8, 0.35, room.z - 0.55]} size={[0.5, 0.55, 0.5]} material={metalMaterial} />
      <Box position={[room.x + 1.05, 0.45, room.z - 0.85]} size={[0.65, 0.75, 0.5]} material={trimMaterial} />
    </group>
  );
}
