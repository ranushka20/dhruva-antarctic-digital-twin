import Box from "./Box";
import { ceilingMaterial, indicatorGreenMaterial } from "./materials";

/* --- Recessed LED Ceiling Troffer Light Fixture --- */
export function CeilingLight({ position = [0, 2.38, 0], size = [1.2, 0.04, 0.4] }) {
  return (
    <group position={position}>
      {/* Outer Flush Bezel */}
      <Box position={[0, 0, 0]} size={[size[0] + 0.06, 0.03, size[2] + 0.06]} material={ceilingMaterial} castShadow={false} />
      {/* Diffuser Lens */}
      <mesh position={[0, -0.01, 0]}>
        <boxGeometry args={[size[0], 0.02, size[2]]} />
        <meshStandardMaterial
          color="#fdfcf7"
          emissive="#ffffff"
          emissiveIntensity={1.2}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

/* --- Interior Lighting Rig for Room View --- */
export default function InteriorLighting({ activeRoom, isInteriorMode }) {
  if (!isInteriorMode || !activeRoom) {
    return (
      <>
        {/* Soft general interior bounce light */}
        <pointLight position={[0, 3.5, 0]} intensity={0.45} color="#edf5fa" distance={30} />
      </>
    );
  }

  const { x = 0, z = 0 } = activeRoom;

  return (
    <group>
      {/* Dedicated eye-level interior soft ambient fill */}
      <ambientLight intensity={0.45} color="#eef6fb" />

      {/* Primary Room Ceiling Light (Warm neutral clean room lighting) */}
      <pointLight
        position={[x, 2.2, z]}
        intensity={1.2}
        color="#fff9f0"
        distance={8}
        decay={1.6}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-bias={-0.001}
      />

      {/* Secondary fill light for corners */}
      <pointLight
        position={[x + 1.2, 1.4, z + 1.2]}
        intensity={0.4}
        color="#cde7f5"
        distance={5}
        decay={2}
      />

      {/* Workstation task light bounce */}
      <pointLight
        position={[x - 1.0, 1.0, z - 0.8]}
        intensity={0.35}
        color="#e0f2fe"
        distance={4}
      />

      {/* Subtle indicator beacon */}
      <mesh position={[x, 2.38, z]}>
        <boxGeometry args={[0.08, 0.02, 0.08]} />
        <primitive object={indicatorGreenMaterial} attach="material" />
      </mesh>
    </group>
  );
}
