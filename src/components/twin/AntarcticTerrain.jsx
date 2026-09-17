import React, { useMemo } from 'react';
import * as THREE from 'three';

// Builds a large, gently uneven snow plane. The area directly under the
// station is flattened so the elevated supports sit on believable ground.
function createTerrainGeometry(width, depth, segments, flattenRadius) {
  const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const distanceFromCenter = Math.sqrt(x * x + z * z);

    let height =
      Math.sin(x * 0.15) * 0.15 +
      Math.cos(z * 0.12) * 0.15 +
      Math.sin(x * 0.05 + z * 0.05) * 0.3;

    if (distanceFromCenter < flattenRadius) {
      const t = distanceFromCenter / flattenRadius;
      height *= t * t;
    }

    position.setY(i, height);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function SnowBank({ position, scale = 1 }) {
  return (
    <mesh position={position} scale={scale} receiveShadow castShadow>
      <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#e9edf2" roughness={0.9} metalness={0} />
    </mesh>
  );
}

function IceFormation({ position, scale = 1, rotation = 0 }) {
  return (
    <mesh position={position} scale={scale} rotation={[0, rotation, 0]} castShadow receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial
        color="#cfe3ee"
        roughness={0.25}
        metalness={0.1}
        transparent
        opacity={0.92}
      />
    </mesh>
  );
}

export default function AntarcticTerrain({ flattenRadius = 17 }) {
  const geometry = useMemo(
    () => createTerrainGeometry(140, 140, 72, flattenRadius),
    [flattenRadius]
  );

  const snowBanks = useMemo(() => {
    const banks = [];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const radius = flattenRadius + 4 + Math.random() * 30;
      banks.push({
        position: [Math.cos(angle) * radius, -0.35, Math.sin(angle) * radius],
        scale: 1.6 + Math.random() * 2.6,
      });
    }
    return banks;
  }, [flattenRadius]);

  const iceFormations = useMemo(() => {
    const formations = [];
    const count = 12;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.8;
      const radius = flattenRadius + 6 + Math.random() * 26;
      formations.push({
        position: [Math.cos(angle) * radius, 0.2, Math.sin(angle) * radius],
        scale: 0.8 + Math.random() * 1.4,
        rotation: Math.random() * Math.PI,
      });
    }
    return formations;
  }, [flattenRadius]);

  return (
    <group>
      <mesh geometry={geometry} receiveShadow>
        <meshStandardMaterial color="#eef2f6" roughness={0.95} metalness={0} />
      </mesh>

      {/* Subtle digital-twin reference grid */}
      <gridHelper args={[70, 35, '#5b8bb0', '#33506a']} position={[0, 0.02, 0]} />

      {snowBanks.map((b, i) => (
        <SnowBank key={`snow-${i}`} position={b.position} scale={b.scale} />
      ))}
      {iceFormations.map((f, i) => (
        <IceFormation
          key={`ice-${i}`}
          position={f.position}
          scale={f.scale}
          rotation={f.rotation}
        />
      ))}
    </group>
  );
}
