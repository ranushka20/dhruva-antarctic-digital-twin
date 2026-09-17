import { useMemo } from 'react';
import * as THREE from 'three';

export const LEG_HEIGHT = 2.2;
export const PLATFORM_THICKNESS = 0.3;
const LEG_RADIUS = 0.18;

function Leg({ position }) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <cylinderGeometry args={[LEG_RADIUS, LEG_RADIUS * 1.3, LEG_HEIGHT, 8]} />
      <meshStandardMaterial color="#383d44" metalness={0.7} roughness={0.4} />
    </mesh>
  );
}

// Orients a thin box between two points, used for the X cross-bracing.
function CrossBrace({ from, to }) {
  const { mid, length, rotation } = useMemo(() => {
    const fromV = new THREE.Vector3(...from);
    const toV = new THREE.Vector3(...to);
    const dir = new THREE.Vector3().subVectors(toV, fromV);
    const segLength = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    const euler = new THREE.Euler().setFromQuaternion(quat);
    const midV = fromV.clone().add(toV).multiplyScalar(0.5);
    return {
      mid: [midV.x, midV.y, midV.z],
      length: segLength,
      rotation: [euler.x, euler.y, euler.z],
    };
  }, [from, to]);

  return (
    <mesh position={mid} rotation={rotation} castShadow>
      <boxGeometry args={[0.06, length, 0.06]} />
      <meshStandardMaterial color="#2b2f35" metalness={0.6} roughness={0.5} />
    </mesh>
  );
}

function Stairs({ position = [0, 0, 0], topHeight = LEG_HEIGHT + PLATFORM_THICKNESS, stepCount = 7 }) {
  const stepDepth = 0.4;
  const stepHeight = topHeight / stepCount;
  const steps = [];
  for (let i = 0; i < stepCount; i++) {
    steps.push(
      <mesh key={i} position={[0, stepHeight * (i + 0.5), i * stepDepth]} castShadow receiveShadow>
        <boxGeometry args={[1.6, stepHeight, stepDepth]} />
        <meshStandardMaterial color="#565c64" metalness={0.5} roughness={0.6} />
      </mesh>
    );
  }
  return <group position={position}>{steps}</group>;
}

export default function StationSupports({ width = 26, depth = 7 }) {
  const cols = 7;
  const rows = 3;
  const halfW = width / 2 - 1;
  const halfD = depth / 2 - 0.8;

  const legPositions = useMemo(() => {
    const arr = [];
    for (let i = 0; i < cols; i++) {
      const x = -halfW + (i / (cols - 1)) * halfW * 2;
      for (let j = 0; j < rows; j++) {
        const z = -halfD + (j / (rows - 1)) * halfD * 2;
        arr.push([x, LEG_HEIGHT / 2, z]);
      }
    }
    return arr;
  }, [halfW, halfD]);

  const braces = useMemo(() => {
    const arr = [];
    const zFront = -halfD;
    const zBack = halfD;
    for (let i = 0; i < cols - 1; i++) {
      const x1 = -halfW + (i / (cols - 1)) * halfW * 2;
      const x2 = -halfW + ((i + 1) / (cols - 1)) * halfW * 2;
      arr.push({ from: [x1, 0.15, zFront], to: [x2, LEG_HEIGHT - 0.15, zFront] });
      arr.push({ from: [x1, LEG_HEIGHT - 0.15, zFront], to: [x2, 0.15, zFront] });
      arr.push({ from: [x1, 0.15, zBack], to: [x2, LEG_HEIGHT - 0.15, zBack] });
      arr.push({ from: [x1, LEG_HEIGHT - 0.15, zBack], to: [x2, 0.15, zBack] });
    }
    return arr;
  }, [halfW, halfD]);

  return (
    <group>
      {legPositions.map((p, i) => (
        <Leg key={`leg-${i}`} position={p} />
      ))}
      {braces.map((b, i) => (
        <CrossBrace key={`brace-${i}`} from={b.from} to={b.to} />
      ))}

      {/* elevated platform / foundation deck */}
      <mesh position={[0, LEG_HEIGHT + PLATFORM_THICKNESS / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width + 0.4, PLATFORM_THICKNESS, depth + 0.4]} />
        <meshStandardMaterial color="#4b5a68" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* entrance stairs at front-center, leading up to the main door */}
      <Stairs position={[0, 0, depth / 2 + 0.2]} />
      <mesh position={[-0.9, 1.1, depth / 2 + 1.2]} rotation={[Math.PI / 2 - 0.35, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.9, 6]} />
        <meshStandardMaterial color="#6b7078" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.9, 1.1, depth / 2 + 1.2]} rotation={[Math.PI / 2 - 0.35, 0, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.9, 6]} />
        <meshStandardMaterial color="#6b7078" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}
