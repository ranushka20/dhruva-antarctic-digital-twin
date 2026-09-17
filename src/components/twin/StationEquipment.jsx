import React from 'react';
import * as THREE from 'three';

function CommsMast({ position = [0, 0, 0], height = 3 }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.09, height, 8]} />
        <meshStandardMaterial color="#5a5f66" metalness={0.8} roughness={0.3} />
      </mesh>
      {[0.3, 0.55, 0.8].map((t, i) => (
        <mesh key={i} position={[0, height * t, 0]} castShadow>
          <boxGeometry args={[0.5 - i * 0.1, 0.03, 0.03]} />
          <meshStandardMaterial color="#5a5f66" metalness={0.8} roughness={0.3} />
        </mesh>
      ))}
      {/* beacon light */}
      <mesh position={[0, height + 0.08, 0]}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color="#ff3b30" emissive="#ff3b30" emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function SatelliteDish({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.6, 6]} />
        <meshStandardMaterial color="#4a4f57" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.4, 0]} rotation={[Math.PI * 0.15, 0, 0]} castShadow>
        <sphereGeometry args={[0.55, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2.3]} />
        <meshStandardMaterial
          color="#dfe4e8"
          metalness={0.3}
          roughness={0.5}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function RoofVent({ position = [0, 0, 0] }) {
  return (
    <mesh position={position} castShadow>
      <cylinderGeometry args={[0.22, 0.26, 0.35, 10]} />
      <meshStandardMaterial color="#3d4650" metalness={0.6} roughness={0.5} />
    </mesh>
  );
}

function UtilityBox({ position = [0, 0, 0] }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={[0.5, 0.5, 0.4]} />
      <meshStandardMaterial color="#454b53" metalness={0.5} roughness={0.6} />
    </mesh>
  );
}

function Pipe({ position = [0, 0, 0], length = 2, rotation = [0, 0, Math.PI / 2], radius = 0.06 }) {
  return (
    <mesh position={position} rotation={rotation} castShadow>
      <cylinderGeometry args={[radius, radius, length, 8]} />
      <meshStandardMaterial color="#5a6069" metalness={0.7} roughness={0.35} />
    </mesh>
  );
}

function Railing({ position = [0, 0, 0], length = 4, rotationY = 0 }) {
  const postCount = Math.max(2, Math.round(length / 0.8) + 1);
  const posts = [];
  for (let i = 0; i < postCount; i++) {
    const t = i / (postCount - 1);
    posts.push(
      <mesh key={i} position={[-length / 2 + t * length, 0.3, 0]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
        <meshStandardMaterial color="#6b7078" metalness={0.6} roughness={0.4} />
      </mesh>
    );
  }
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {posts}
      <mesh position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[length, 0.03, 0.03]} />
        <meshStandardMaterial color="#6b7078" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}

export default function StationEquipment({
  buildingTop = 5.8,
  buildingWidth = 14,
  buildingDepth = 6,
}) {
  return (
    <group>
      <CommsMast position={[-buildingWidth / 2 + 2, buildingTop, 0]} height={3.2} />
      <SatelliteDish
        position={[buildingWidth / 2 - 2.5, buildingTop, 1]}
        rotation={[0, Math.PI / 4, 0]}
      />

      {[-4, -1.5, 1, 3.5].map((x, i) => (
        <RoofVent key={i} position={[x, buildingTop + 0.15, -buildingDepth / 2 + 1]} />
      ))}

      <UtilityBox position={[buildingWidth / 2 - 1, buildingTop - 0.6, buildingDepth / 2 + 0.3]} />

      <Pipe
        position={[0, buildingTop - 1.2, buildingDepth / 2 + 0.15]}
        length={buildingWidth - 3}
        rotation={[0, 0, Math.PI / 2]}
        radius={0.05}
      />

      <Railing position={[0, buildingTop + 0.02, buildingDepth / 2 - 0.1]} length={buildingWidth - 1} />
    </group>
  );
}
