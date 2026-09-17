import React from 'react';

function Window({ position, rotation = [0, 0, 0], size = [0.8, 0.95] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* frame */}
      <mesh castShadow>
        <boxGeometry args={[size[0] + 0.14, size[1] + 0.14, 0.09]} />
        <meshStandardMaterial color="#494f57" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* glass pane */}
      <mesh position={[0, 0, 0.055]}>
        <boxGeometry args={[size[0], size[1], 0.04]} />
        <meshPhysicalMaterial
          color="#0b1f33"
          metalness={0.3}
          roughness={0.15}
          emissive="#1a4d73"
          emissiveIntensity={0.28}
          clearcoat={0.6}
        />
      </mesh>
      {/* mullion cross bar for realism */}
      <mesh position={[0, 0, 0.08]}>
        <boxGeometry args={[size[0], 0.03, 0.02]} />
        <meshStandardMaterial color="#3a3f46" />
      </mesh>
    </group>
  );
}

// Places a row of `count` window units, starting at `start`, spaced along X
// by `spacing`. Rotate the whole row (rotation) to place it on side facades.
export default function StationWindows({
  count = 5,
  spacing = 1.8,
  start = [-4, 0, 0],
  rotation = [0, 0, 0],
  size,
}) {
  const windows = [];
  for (let i = 0; i < count; i++) {
    windows.push(
      <Window
        key={i}
        position={[start[0] + i * spacing, start[1], start[2]]}
        rotation={rotation}
        size={size}
      />
    );
  }
  return <group>{windows}</group>;
}
