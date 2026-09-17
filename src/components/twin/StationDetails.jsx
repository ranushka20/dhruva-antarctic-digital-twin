import { Html } from '@react-three/drei';

export default function StationDetails({ labelPosition = [0, 8, 0] }) {
  return (
    <group>
      <Html position={labelPosition} center distanceFactor={12} occlude>
        <div
          style={{
            background: 'rgba(8, 20, 35, 0.85)',
            border: '1px solid #3d7ea6',
            color: '#bfe4ff',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '12px',
            fontFamily: 'sans-serif',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
          }}
        >
          BHARATI STATION — 69.41°S 76.11°E
        </div>
      </Html>

      {/* subtle location marker beam + ring on the ground */}
      <mesh position={[0, 0.5, -10]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 6]} />
        <meshBasicMaterial color="#4fc3f7" transparent opacity={0.6} />
      </mesh>
      <mesh position={[0, 0.02, -10]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.4, 0.5, 24]} />
        <meshBasicMaterial color="#4fc3f7" transparent opacity={0.5} side={2} />
      </mesh>
    </group>
  );
}
