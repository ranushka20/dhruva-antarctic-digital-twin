import Box from "./Box";
import { darkMetalMaterial, glassTintedMaterial, trimMaterial } from "./materials";

export default function Window({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.4,
  height = 0.9,
  depth = 0.12,
  mullions = 1, // Number of vertical dividers
}) {
  const frameThickness = 0.05;
  const glassThickness = 0.03;

  return (
    <group position={position} rotation={rotation}>
      {/* Outer Window Frame */}
      {/* Top Frame */}
      <Box
        position={[0, height / 2 - frameThickness / 2, 0]}
        size={[width, frameThickness, depth]}
        material={darkMetalMaterial}
      />
      {/* Bottom Frame / Sill */}
      <Box
        position={[0, -height / 2 + frameThickness / 2, 0]}
        size={[width + 0.06, frameThickness, depth + 0.04]}
        material={trimMaterial}
      />
      {/* Left Frame */}
      <Box
        position={[-width / 2 + frameThickness / 2, 0, 0]}
        size={[frameThickness, height, depth]}
        material={darkMetalMaterial}
      />
      {/* Right Frame */}
      <Box
        position={[width / 2 - frameThickness / 2, 0, 0]}
        size={[frameThickness, height, depth]}
        material={darkMetalMaterial}
      />

      {/* Vertical Mullion Divider */}
      {mullions > 0 &&
        Array.from({ length: mullions }).map((_, i) => {
          const x = -width / 2 + (width / (mullions + 1)) * (i + 1);
          return (
            <Box
              key={i}
              position={[x, 0, 0]}
              size={[frameThickness * 0.8, height - frameThickness * 2, depth * 0.8]}
              material={darkMetalMaterial}
            />
          );
        })}

      {/* Insulated Double Glass Pane */}
      <Box
        position={[0, 0, 0]}
        size={[width - frameThickness * 2, height - frameThickness * 2, glassThickness]}
        material={glassTintedMaterial}
        castShadow={false}
      />
    </group>
  );
}
