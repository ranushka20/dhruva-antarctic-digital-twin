import Box from "./Box";
import { darkMetalMaterial, metalMaterial, trimMaterial, woodMaterial } from "./materials";

export default function WorkshopEquipment({ room, garage = false }) {
  return (
    <group>
      {!garage && <Box position={[room.x - room.width / 2 + 0.65, 0.75, room.z - 0.8]} size={[0.55, 1.5, 0.8]} material={woodMaterial} />}
      {!garage && <Box position={[room.x - room.width / 2 + 0.65, 0.75, room.z + 0.85]} size={[0.55, 1.5, 0.8]} material={woodMaterial} />}
      <Box position={[room.x + (garage ? -0.8 : 0.8), 0.72, room.z]} size={[garage ? 2.2 : 1.8, 0.14, 0.75]} material={woodMaterial} />
      <Box position={[room.x + (garage ? -0.8 : 0.8), 0.3, room.z]} size={[garage ? 2.2 : 1.8, 0.08, 0.08]} material={metalMaterial} />
      {garage && <Box position={[room.x + 1.1, 0.85, room.z]} size={[1.2, 1.2, 2.0]} material={darkMetalMaterial} />}
      <Box position={[room.x + 0.6, 0.7, room.z + 1.2]} size={[0.55, 1.4, 0.55]} material={trimMaterial} />
    </group>
  );
}
