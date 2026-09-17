import Box from "./Box";
import { darkMetalMaterial, glassMaterial, metalMaterial, trimMaterial } from "./materials";

function Cabinet({ position, size = [0.65, 1.5, 0.55] }) {
  return <Box position={position} size={size} material={darkMetalMaterial} />;
}

export function CHPEquipment({ room }) {
  return (
    <group>
      <Box position={[room.x - 0.8, 0.85, room.z]} size={[1.15, 1.55, 1.0]} material={darkMetalMaterial} />
      <Box position={[room.x + 0.65, 0.65, room.z]} size={[0.85, 1.15, 0.85]} material={metalMaterial} />
      <Cabinet position={[room.x - 1.45, 0.75, room.z + 0.95]} />
      <mesh position={[room.x + 0.65, 1.65, room.z]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.08, 0.08, 1.2, 10]} />
        <meshStandardMaterial color="#69727a" metalness={0.75} roughness={0.4} />
      </mesh>
      <Box position={[room.x + 0.65, 1.1, room.z - 0.44]} size={[0.25, 0.08, 0.03]} material={glassMaterial} castShadow={false} receiveShadow={false} />
    </group>
  );
}

export function TechnicalEquipment({ room }) {
  return (
    <group>
      {[-0.9, 0, 0.9].map((offset) => (
        <Cabinet key={offset} position={[room.x + offset, 0.75, room.z - 0.55]} />
      ))}
      <Box position={[room.x, 1.65, room.z + 0.55]} size={[2.2, 0.08, 0.08]} material={metalMaterial} />
      <mesh position={[room.x - 0.7, 1.75, room.z + 0.55]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 8]} />
        <meshStandardMaterial color="#64747c" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}

export function WaterTreatmentEquipment({ room }) {
  return (
    <group>
      <mesh position={[room.x - 0.55, 0.65, room.z]} castShadow>
        <cylinderGeometry args={[0.45, 0.45, 1.25, 16]} />
        <meshStandardMaterial color="#9aa7ad" metalness={0.4} roughness={0.35} />
      </mesh>
      <mesh position={[room.x + 0.7, 0.55, room.z]} castShadow>
        <cylinderGeometry args={[0.3, 0.3, 1.05, 16]} />
        <meshStandardMaterial color="#7b8c94" metalness={0.45} roughness={0.35} />
      </mesh>
      <Box position={[room.x + 1.25, 0.75, room.z + 0.7]} size={[0.5, 1.5, 0.5]} material={trimMaterial} />
      <mesh position={[room.x, 1.35, room.z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.04, 0.04, 2.4, 8]} />
        <meshStandardMaterial color="#5c727d" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>
  );
}
