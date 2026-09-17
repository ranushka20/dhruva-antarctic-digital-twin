import Box from "./Box";
import Door from "./Door";
import Furniture from "./Furniture";
import RoomLabel from "./RoomLabel";
import {
  floorMaterial,
  glassMaterial,
  trimMaterial,
  wallMaterial,
} from "./materials";

function Wall({ position, size, onSelect }) {
  return <Box position={position} size={size} material={wallMaterial} onClick={onSelect} />;
}

export default function Room({ room, selected, onSelect }) {
  const wallHeight = 2.35;
  const wallThickness = 0.2;
  const halfWidth = room.width / 2;
  const halfDepth = room.depth / 2;
  const doorWidth = 1.1;
  const frontSegment = (room.width - doorWidth) / 2;

  return (
    <group onClick={(event) => {
      event.stopPropagation();
      onSelect(room);
    }}>
      <Box
        position={[room.x, 0, room.z]}
        size={[room.width, 0.14, room.depth]}
        material={selected ? trimMaterial : floorMaterial}
      />

      <Wall
        position={[room.x, wallHeight / 2, room.z - halfDepth]}
        size={[room.width, wallHeight, wallThickness]}
        onSelect={() => onSelect(room)}
      />
      <Wall
        position={[room.x - halfWidth, wallHeight / 2, room.z]}
        size={[wallThickness, wallHeight, room.depth]}
        onSelect={() => onSelect(room)}
      />
      <Wall
        position={[room.x + halfWidth, wallHeight / 2, room.z]}
        size={[wallThickness, wallHeight, room.depth]}
        onSelect={() => onSelect(room)}
      />
      <Wall
        position={[room.x - (doorWidth + frontSegment) / 2, wallHeight / 2, room.z + halfDepth]}
        size={[frontSegment, wallHeight, wallThickness]}
        onSelect={() => onSelect(room)}
      />
      <Wall
        position={[room.x + (doorWidth + frontSegment) / 2, wallHeight / 2, room.z + halfDepth]}
        size={[frontSegment, wallHeight, wallThickness]}
        onSelect={() => onSelect(room)}
      />

      <Door position={[room.x, 0, room.z + halfDepth + 0.03]} />
      <Box
        position={[room.x, 1.55, room.z - halfDepth + 0.02]}
        size={[Math.min(room.width * 0.42, 1.6), 0.42, 0.04]}
        material={glassMaterial}
        castShadow={false}
        receiveShadow={false}
      />
      <Box
        position={[room.x, wallHeight + 0.03, room.z]}
        size={[room.width + 0.08, 0.08, room.depth + 0.08]}
        material={trimMaterial}
        castShadow={false}
      />

      <Furniture room={room} />
      <RoomLabel room={room} selected={selected} />
    </group>
  );
}
