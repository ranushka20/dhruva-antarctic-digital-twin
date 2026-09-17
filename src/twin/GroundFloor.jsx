import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, OrbitControls, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import Box from "./components/Box";
import Door from "./components/Door";
import { darkMetalMaterial, glassMaterial, metalMaterial, trimMaterial, wallMaterial, woodMaterial } from "./components/materials";

const ROOMS = [
  { id: "research", name: "Research Lab", category: "Laboratory", x: -6.4, z: -2.5, w: 5.3, d: 3.9, kind: "lab" },
  { id: "control", name: "Control Room", category: "Operations", x: 0, z: -2.5, w: 5.3, d: 3.9, kind: "control" },
  { id: "comms", name: "Communication Room", category: "Communications", x: 6.4, z: -2.5, w: 5.3, d: 3.9, kind: "comms" },
  { id: "living", name: "Living Area", category: "Accommodation", x: -6.4, z: 2.0, w: 5.3, d: 3.5, kind: "living" },
  { id: "lobby", name: "Lobby", category: "Circulation", x: 0, z: 2.0, w: 5.3, d: 3.5, kind: "lobby" },
  { id: "medical", name: "Medical Room", category: "Medical", x: 6.4, z: 2.0, w: 5.3, d: 3.5, kind: "medical" },
  { id: "kitchen", name: "Kitchen & Dining", category: "Common Area", x: -6.4, z: 6.1, w: 5.3, d: 3.4, kind: "kitchen" },
  { id: "entrance", name: "Main Entrance", category: "Access", x: 0, z: 6.1, w: 5.3, d: 3.4, kind: "entrance" },
  { id: "power", name: "Power Room", category: "Energy System", x: 4.8, z: 6.1, w: 3.8, d: 3.4, kind: "power" },
  { id: "storage", name: "Storage", category: "Logistics", x: 9.4, z: 6.1, w: 4.2, d: 3.4, kind: "storage" },
];

const materials = {
  floor: new THREE.MeshStandardMaterial({ color: "#aeb7bc", roughness: 0.8 }),
  floorWarm: new THREE.MeshStandardMaterial({ color: "#b9b0a2", roughness: 0.84 }),
  selected: new THREE.MeshStandardMaterial({ color: "#1b7892", emissive: "#1b7892", emissiveIntensity: 0.32, roughness: 0.5 }),
  accent: new THREE.MeshStandardMaterial({ color: "#2d99ad", emissive: "#2d99ad", emissiveIntensity: 0.65 }),
  warm: new THREE.MeshStandardMaterial({ color: "#e6a866", emissive: "#e6a866", emissiveIntensity: 1.5 }),
};

function Furniture({ room }) {
  const { x, z, w, d, kind } = room;
  const table = (position, size = [2.2, 0.12, 0.7]) => <Box position={position} size={size} material={woodMaterial} />;
  const monitor = (position, size = [0.65, 0.42, 0.08]) => <Box position={position} size={size} material={materials.accent} castShadow={false} />;
  const cabinet = (position, size = [0.55, 1.4, 0.55]) => <Box position={position} size={size} material={darkMetalMaterial} />;
  const chair = (position) => <group position={position}><Box position={[0, 0.38, 0]} size={[0.42, 0.08, 0.42]} material={trimMaterial} /><Box position={[0, 0.68, -0.16]} size={[0.42, 0.5, 0.08]} material={trimMaterial} /></group>;

  if (kind === "lab") return <group>{table([x - 1.15, 0.72, z - 0.55])}{table([x + 1.15, 0.72, z + 0.55])}{monitor([x - 1.15, 1.05, z - 0.55], [0.35, 0.28, 0.06])}{cabinet([x - w / 2 + 0.45, 0.72, z + 0.8])}{cabinet([x + w / 2 - 0.45, 0.72, z - 0.8])}</group>;
  if (kind === "control") return <group>{table([x, 0.72, z + 0.55], [3.1, 0.12, 0.8])}{chair([x - 1.1, 0, z + 1.2])}{chair([x, 0, z + 1.2])}{chair([x + 1.1, 0, z + 1.2])}{monitor([x - 1.25, 1.15, z - 1.35], [1.2, 0.8, 0.08])}{monitor([x, 1.15, z - 1.35], [1.2, 0.8, 0.08])}{monitor([x + 1.25, 1.15, z - 1.35], [1.2, 0.8, 0.08])}</group>;
  if (kind === "comms") return (
    <group>
      {[-1.5, -0.5, 0.5, 1.5].map((offset) => (
        <group key={offset}>
          {cabinet([x + offset, 0.86, z])}
          {monitor([x + offset, 1.02, z - 0.6], [0.2, 0.06, 0.03])}
        </group>
      ))}
    </group>
  );
  if (kind === "living") return <group>{[-1.25, 1.25].map((offset) => <group key={offset}><Box position={[x + offset, 0.32, z]} size={[1.55, 0.22, 2.2]} material={materials.floorWarm} /><Box position={[x + offset, 0.5, z - 0.8]} size={[1.4, 0.12, 0.45]} material={trimMaterial} /><Box position={[x + offset + 0.95, 0.45, z]} size={[0.38, 0.65, 0.45]} material={woodMaterial} /></group>)}</group>;
  if (kind === "medical") return <group><Box position={[x - 0.55, 0.35, z]} size={[1.1, 0.18, 2]} material={materials.floorWarm} /><Box position={[x - 0.55, 0.55, z - 0.72]} size={[1, 0.12, 0.4]} material={trimMaterial} />{cabinet([x + 1.1, 0.72, z - 0.8])}{monitor([x + 1.1, 1.18, z - 0.8], [0.7, 0.45, 0.06])}</group>;
  if (kind === "kitchen") return <group>{table([x, 0.72, z + 0.55], [2.6, 0.12, 0.85])}{chair([x - 1, 0, z + 1.35])}{chair([x, 0, z + 1.35])}{chair([x + 1, 0, z + 1.35])}<Box position={[x, 0.75, z - 1.05]} size={[3.8, 1.35, 0.45]} material={darkMetalMaterial} /><Box position={[x + 1.2, 1.52, z - 1.05]} size={[0.7, 0.08, 0.35]} material={glassMaterial} /></group>;
  if (kind === "lobby") return <group><Box position={[x, 0.62, z - 0.7]} size={[2.3, 1.0, 0.55]} material={woodMaterial} /><Box position={[x, 1.5, z + 0.9]} size={[2.3, 1.1, 0.08]} material={materials.accent} castShadow={false} /><Box position={[x - 1.6, 0.75, z + 0.5]} size={[0.55, 1.5, 0.55]} material={trimMaterial} /></group>;
  if (kind === "power") return <group><Box position={[x, 0.82, z]} size={[1.6, 1.55, 1.15]} material={darkMetalMaterial} /><Box position={[x + 1.1, 0.75, z + 0.5]} size={[0.65, 1.4, 0.65]} material={metalMaterial} /><Box position={[x - 0.9, 1.7, z]} size={[0.08, 0.08, 1.6]} material={materials.warm} castShadow={false} /></group>;
  if (kind === "storage") return <group>{[-1.15, -0.35, 0.45, 1.25].map((offset) => <group key={offset}><Box position={[x - w / 2 + 0.45, 0.78, z + offset]} size={[0.48, 1.55, 0.6]} material={woodMaterial} /><Box position={[x + 0.6, 0.3, z + offset]} size={[0.55, 0.5, 0.55]} material={trimMaterial} /></group>)}</group>;
  return <group><Door position={[x, 0, z + d / 2 + 0.04]} /><Box position={[x, 0.05, z]} size={[2.6, 0.08, 1.8]} material={glassMaterial} /></group>;
}

function Room({ room, selected, onSelect }) {
  const wallHeight = 2.25;
  const thickness = 0.18;
  const halfW = room.w / 2;
  const halfD = room.d / 2;
  const doorWidth = 1.05;
  const segment = (room.w - doorWidth) / 2;
  return <group onClick={(event) => { event.stopPropagation(); onSelect(room); }}>
    <Box position={[room.x, 0, room.z]} size={[room.w, 0.14, room.d]} material={selected ? materials.selected : room.kind === "living" || room.kind === "kitchen" ? materials.floorWarm : materials.floor} />
    <Box position={[room.x, wallHeight / 2, room.z - halfD]} size={[room.w, wallHeight, thickness]} material={wallMaterial} />
    <Box position={[room.x - halfW, wallHeight / 2, room.z]} size={[thickness, wallHeight, room.d]} material={wallMaterial} />
    <Box position={[room.x + halfW, wallHeight / 2, room.z]} size={[thickness, wallHeight, room.d]} material={wallMaterial} />
    <Box position={[room.x - (doorWidth + segment) / 2, wallHeight / 2, room.z + halfD]} size={[segment, wallHeight, thickness]} material={wallMaterial} />
    <Box position={[room.x + (doorWidth + segment) / 2, wallHeight / 2, room.z + halfD]} size={[segment, wallHeight, thickness]} material={wallMaterial} />
    <Door position={[room.x, 0, room.z + halfD + 0.03]} />
    <Box position={[room.x, 1.45, room.z - halfD + 0.02]} size={[Math.min(room.w * 0.42, 1.6), 0.38, 0.04]} material={glassMaterial} castShadow={false} receiveShadow={false} />
    <Furniture room={room} />
    <Html position={[room.x, 0.85, room.z]} center distanceFactor={17}>
      <div className={`station-room-label ${selected ? "selected" : ""}`}><strong>{room.name}</strong><span>{room.category}</span></div>
    </Html>
    {selected && <mesh position={[room.x, 0.08, room.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[Math.min(room.w, room.d) * 0.36, Math.min(room.w, room.d) * 0.42, 4]} /><meshBasicMaterial color="#53d6e8" transparent opacity={0.75} /></mesh>}
  </group>;
}

function Exterior({ onSelect }) {
  return <group>
    <Box position={[0, -0.28, 1.5]} size={[29, 0.18, 13]} material={materials.floor} />
    <Box position={[0, 1.7, 8.15]} size={[5.4, 0.18, 1.25]} material={darkMetalMaterial} />
    <Door position={[-1.2, 1.7, 8.72]} /><Door position={[1.2, 1.7, 8.72]} />
    <Box position={[-2.7, 0.8, 8.1]} size={[0.08, 1.7, 0.08]} material={metalMaterial} /><Box position={[2.7, 0.8, 8.1]} size={[0.08, 1.7, 0.08]} material={metalMaterial} />
    {[-2, -1, 0, 1, 2].map((offset) => <Box key={offset} position={[offset * 0.6, 0.85, 8.1]} size={[0.04, 0.04, 5.4]} material={metalMaterial} />)}
    {[-10, -5, 0, 5, 10].map((x) => <Box key={x} position={[x, -0.9, 1.5]} size={[0.25, 2, 0.25]} material={darkMetalMaterial} />)}
    <group onClick={(event) => { event.stopPropagation(); onSelect({ id: "main-entrance", name: "Main Entrance", category: "Access", status: "ONLINE", source: "SIMULATED" }); }}><Html position={[0, 2.2, 8.1]} center><div className="station-room-label"><strong>Main Entrance</strong><span>Access</span></div></Html></group>
  </group>;
}

function StationScene({ selectedId, onSelect }) {
  const { camera } = useThree();
  useEffect(() => camera.lookAt(0, 1.5, 1.5), [camera]);
  return <>
    <color attach="background" args={["#0b1620"]} />
    <ambientLight intensity={0.72} />
    <directionalLight position={[10, 18, 10]} intensity={2.1} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <directionalLight position={[-10, 8, -4]} intensity={0.55} color="#8ac6e8" />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.05, 1.5]} receiveShadow><planeGeometry args={[60, 50]} /><meshStandardMaterial color="#cbd7dc" roughness={1} /></mesh>
    <gridHelper args={[46, 46, "#688b9c", "#b6c9d0"]} position={[0, -1, 1.5]} />
    <Box position={[0, 2.35, 1.5]} size={[28.5, 0.2, 12.2]} material={darkMetalMaterial} />
    {ROOMS.map((room) => <Room key={room.id} room={room} selected={room.id === selectedId} onSelect={onSelect} />)}
    <Exterior onSelect={onSelect} />
    <ContactShadows position={[0, -1, 1.5]} scale={40} opacity={0.42} blur={2.6} far={14} />
    <OrbitControls makeDefault enableDamping dampingFactor={0.08} minDistance={16} maxDistance={42} maxPolarAngle={Math.PI / 2.12} target={[0, 1.4, 1.5]} />
  </>;
}

function assetFromRoom(room) {
  return { id: `ROOM-${room.id.toUpperCase()}`, name: room.name, type: room.category, status: "ONLINE", value: "Ground Floor", source: room.id === "entrance" ? "SIMULATED" : "DOCUMENTED / APPROXIMATE", classification: "SIMULATED" };
}

export default function GroundFloor({ onSelectAsset }) {
  const [selected, setSelected] = useState(null);
  const handleSelect = (room) => { setSelected(room); onSelectAsset?.(assetFromRoom(room)); };
  const clear = () => { setSelected(null); onSelectAsset?.(null); };
  return <div className="station-model">
    <Canvas shadows camera={{ position: [25, 22, 29], fov: 42 }} dpr={[1, 1.5]} onPointerMissed={clear}><StationScene selectedId={selected?.id} onSelect={handleSelect} /></Canvas>
    <div className="station-label-layer">
      {ROOMS.map((room, index) => <button type="button" key={room.id} className={`station-overlay-label station-overlay-label-${index} ${selected?.id === room.id ? "selected" : ""}`} onClick={() => handleSelect(room)}><strong>{room.name}</strong><span>{room.category}</span></button>)}
    </div>
    <div className="model-floater model-floater-top"><span>BHARATI STATION</span><strong>Antarctic Research Station</strong><small>INTERIOR VIEW · DIGITAL TWIN</small></div>
    <div className="model-floater model-floater-bottom"><strong>Ground Floor</strong><span>Cutaway architectural visualization</span></div>
    <div className="model-source">MODEL CLASSIFICATION <b>APPROXIMATE</b></div>
    <div className="model-help">Rotate · Pan · Zoom · Click to explore</div>
  </div>;
}
