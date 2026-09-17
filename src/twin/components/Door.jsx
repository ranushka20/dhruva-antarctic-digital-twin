import { doorMaterial } from "./materials";

export default function Door({ position, width = 0.95, height = 1.55 }) {
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow>
        <boxGeometry args={[width, height, 0.08]} />
        <primitive object={doorMaterial} attach="material" />
      </mesh>
      <mesh position={[width * 0.28, height / 2, 0.06]}>
        <sphereGeometry args={[0.035, 8, 8]} />
        <meshStandardMaterial color="#d8dadd" metalness={0.65} roughness={0.3} />
      </mesh>
    </group>
  );
}
