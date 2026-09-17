import React from 'react';
import StationWindows from './StationWindows';

export const MAIN_W = 14;
export const MAIN_H = 3;
export const MAIN_D = 6;
const WING_W = 5;
const WING_D = 5;

function Door({ position, rotation = [0, 0, 0], width = 1.1, height = 2.1 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[width + 0.16, height + 0.16, 0.1]} />
        <meshStandardMaterial color="#3d4650" metalness={0.5} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[width, height, 0.06]} />
        <meshStandardMaterial color="#c7402d" metalness={0.2} roughness={0.6} />
      </mesh>
      {/* door handle */}
      <mesh position={[width / 2 - 0.12, 0, 0.1]}>
        <boxGeometry args={[0.04, 0.25, 0.04]} />
        <meshStandardMaterial color="#d8dade" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function StationBuilding({ elevation = 2.5 }) {
  return (
    <group position={[0, elevation, 0]}>
      {/* ===== MAIN HULL ===== */}
      <mesh position={[0, MAIN_H / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[MAIN_W, MAIN_H, MAIN_D]} />
        <meshStandardMaterial color="#d7dce1" metalness={0.35} roughness={0.5} />
      </mesh>

      {/* roof cap */}
      <mesh position={[0, MAIN_H + 0.13, 0]} castShadow>
        <boxGeometry args={[MAIN_W + 0.5, 0.26, MAIN_D + 0.5]} />
        <meshStandardMaterial color="#575d66" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* raised mechanical / plant room housing on roof */}
      <mesh position={[2, MAIN_H + 0.26 + 0.45, 0]} castShadow>
        <boxGeometry args={[2.2, 0.9, 2.4]} />
        <meshStandardMaterial color="#c3c9cf" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* ===== LEFT WING - Communication Room block ===== */}
      <group position={[-(MAIN_W / 2 + WING_W / 2 - 0.3), 0, 0]}>
        <mesh position={[0, (MAIN_H - 0.5) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WING_W, MAIN_H - 0.5, WING_D]} />
          <meshStandardMaterial color="#ccd2d8" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, MAIN_H - 0.5 + 0.1, 0]} castShadow>
          <boxGeometry args={[WING_W + 0.3, 0.2, WING_D + 0.3]} />
          <meshStandardMaterial color="#575d66" metalness={0.5} roughness={0.4} />
        </mesh>
        <StationWindows
          count={3}
          spacing={1.3}
          start={[-1.3, (MAIN_H - 0.5) * 0.55, WING_D / 2 + 0.03]}
          size={[0.65, 0.8]}
        />
        <Door position={[0, 1.05, WING_D / 2 + 0.06]} width={0.9} height={1.9} />
      </group>

      {/* ===== RIGHT WING - Living / Service block ===== */}
      <group position={[MAIN_W / 2 + WING_W / 2 - 0.3, 0, 0]}>
        <mesh position={[0, (MAIN_H - 0.3) / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[WING_W, MAIN_H - 0.3, WING_D]} />
          <meshStandardMaterial color="#ccd2d8" metalness={0.35} roughness={0.5} />
        </mesh>
        <mesh position={[0, MAIN_H - 0.3 + 0.1, 0]} castShadow>
          <boxGeometry args={[WING_W + 0.3, 0.2, WING_D + 0.3]} />
          <meshStandardMaterial color="#575d66" metalness={0.5} roughness={0.4} />
        </mesh>
        <StationWindows
          count={3}
          spacing={1.3}
          start={[-1.3, (MAIN_H - 0.3) * 0.55, WING_D / 2 + 0.03]}
          size={[0.65, 0.8]}
        />
        <Door position={[0, 1.0, WING_D / 2 + 0.06]} width={0.9} height={1.85} />
      </group>

      {/* ===== MAIN FACADE WINDOWS ===== */}
      <StationWindows
        count={6}
        spacing={1.7}
        start={[-4.6, MAIN_H * 0.58, MAIN_D / 2 + 0.03]}
        size={[0.9, 1.0]}
      />

      {/* ===== MAIN ENTRANCE DOOR ===== */}
      <Door position={[0, 1.1, MAIN_D / 2 + 0.06]} width={1.3} height={2.0} />

      {/* Vertical structural panel strips (facade detailing) */}
      {[-5.5, -2.5, 2.5, 5.5].map((x, i) => (
        <mesh key={i} position={[x, MAIN_H / 2, MAIN_D / 2 + 0.03]} castShadow>
          <boxGeometry args={[0.2, MAIN_H - 0.2, 0.05]} />
          <meshStandardMaterial color="#a9b0b8" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}

      {/* back-facade panels for a finished look from all angles */}
      {[-5.5, -2.5, 2.5, 5.5].map((x, i) => (
        <mesh key={`back-${i}`} position={[x, MAIN_H / 2, -MAIN_D / 2 - 0.03]} castShadow>
          <boxGeometry args={[0.2, MAIN_H - 0.2, 0.05]} />
          <meshStandardMaterial color="#a9b0b8" metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
