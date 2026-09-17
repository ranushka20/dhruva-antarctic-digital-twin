import Box from "./Box";
import { chromeMaterial, galvanizedSteelMaterial } from "./materials";

export default function Railings({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  length = 4,
  height = 1.0,
  posts = 4,
  hasKickPlate = true,
  orientation = "x", // 'x' or 'z'
}) {
  const postSize = 0.04;
  const railSize = 0.035;
  const kickPlateHeight = 0.12;

  const postSpacing = length / (posts - 1);

  return (
    <group position={position} rotation={rotation}>
      {/* Top Handrail */}
      <Box
        position={orientation === "x" ? [0, height, 0] : [0, height, 0]}
        size={orientation === "x" ? [length, railSize, railSize * 1.5] : [railSize * 1.5, railSize, length]}
        material={chromeMaterial}
      />

      {/* Mid Guard Rail */}
      <Box
        position={orientation === "x" ? [0, height * 0.55, 0] : [0, height * 0.55, 0]}
        size={orientation === "x" ? [length, railSize * 0.8, railSize * 0.8] : [railSize * 0.8, railSize * 0.8, length]}
        material={galvanizedSteelMaterial}
      />

      {/* Bottom Safety Kick Plate */}
      {hasKickPlate && (
        <Box
          position={orientation === "x" ? [0, kickPlateHeight / 2, 0] : [0, kickPlateHeight / 2, 0]}
          size={orientation === "x" ? [length, kickPlateHeight, 0.02] : [0.02, kickPlateHeight, length]}
          material={galvanizedSteelMaterial}
        />
      )}

      {/* Vertical Stanchion Posts */}
      {Array.from({ length: posts }).map((_, i) => {
        const offset = -length / 2 + i * postSpacing;
        const postPos = orientation === "x" ? [offset, height / 2, 0] : [0, height / 2, offset];
        return (
          <Box
            key={i}
            position={postPos}
            size={[postSize, height, postSize]}
            material={galvanizedSteelMaterial}
          />
        );
      })}
    </group>
  );
}
