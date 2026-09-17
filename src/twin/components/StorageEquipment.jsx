import Box from "./Box";
import { trimMaterial, woodMaterial } from "./materials";

export default function StorageEquipment({ room }) {
  return (
    <group>
      {[-1.1, -0.35, 0.4, 1.15].map((offset) => (
        <group key={offset} position={[room.x - room.width / 2 + 0.45, 0, room.z + offset]}>
          <Box position={[0, 0.8, 0]} size={[0.48, 1.6, 0.62]} material={woodMaterial} />
          <Box position={[0.38, 0.25, 0]} size={[0.28, 0.35, 0.42]} material={trimMaterial} />
        </group>
      ))}
    </group>
  );
}
