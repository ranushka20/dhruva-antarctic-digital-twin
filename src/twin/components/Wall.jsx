import Box from "./Box";
import { trimMaterial, wallMaterial, glassMaterial, darkMetalMaterial, wallCapMaterial } from "./materials";

export default function Wall({
  position = [0, 0, 0],
  size = [1, 2.3, 0.18],
  material = wallMaterial,
  hasDoor = false,
  doorWidth = 1.0,
  doorHeight = 1.9,
  doorOffset = 0,
  hasWindow = false,
  windowWidth = 1.4,
  windowHeight = 0.8,
  windowElevation = 1.1,
  windowOffset = 0,
  orientation = "x", // 'x' means wall extends along X axis, 'z' means along Z axis
  onClick,
}) {
  const [w, h, d] = size;
  const length = orientation === "x" ? w : d;
  const thickness = orientation === "x" ? d : w;

  // Solid wall
  if (!hasDoor && !hasWindow) {
    return (
      <group position={position} onClick={onClick}>
        <Box
          position={[0, h / 2, 0]}
          size={size}
          material={material}
        />
        {/* Wall Top Cap Trim */}
        <Box
          position={[0, h + 0.02, 0]}
          size={orientation === "x" ? [w, 0.04, d + 0.02] : [w + 0.02, 0.04, d]}
          material={wallCapMaterial}
          castShadow={false}
        />
        {/* Baseboard trim */}
        <Box
          position={[0, 0.05, 0]}
          size={orientation === "x" ? [w, 0.1, d + 0.02] : [w + 0.02, 0.1, d]}
          material={trimMaterial}
          castShadow={false}
        />
      </group>
    );
  }

  // Wall with Door cutout
  if (hasDoor) {
    const halfLen = length / 2;
    const center = doorOffset;
    const leftLen = Math.max(0.1, halfLen + center - doorWidth / 2);
    const rightLen = Math.max(0.1, halfLen - center - doorWidth / 2);
    const lintelH = Math.max(0.1, h - doorHeight);

    if (orientation === "x") {
      const leftPos = -halfLen + leftLen / 2;
      const rightPos = halfLen - rightLen / 2;
      return (
        <group position={position} onClick={onClick}>
          {/* Left wall segment */}
          {leftLen > 0.05 && (
            <Box
              position={[leftPos, h / 2, 0]}
              size={[leftLen, h, thickness]}
              material={material}
            />
          )}
          {/* Right wall segment */}
          {rightLen > 0.05 && (
            <Box
              position={[rightPos, h / 2, 0]}
              size={[rightLen, h, thickness]}
              material={material}
            />
          )}
          {/* Lintel above door */}
          <Box
            position={[center, doorHeight + lintelH / 2, 0]}
            size={[doorWidth, lintelH, thickness]}
            material={material}
          />
          {/* Wall Top Cap Trim */}
          <Box
            position={[0, h + 0.02, 0]}
            size={[w, 0.04, thickness + 0.02]}
            material={wallCapMaterial}
            castShadow={false}
          />
        </group>
      );
    } else {
      const leftPos = -halfLen + leftLen / 2;
      const rightPos = halfLen - rightLen / 2;
      return (
        <group position={position} onClick={onClick}>
          {leftLen > 0.05 && (
            <Box
              position={[0, h / 2, leftPos]}
              size={[thickness, h, leftLen]}
              material={material}
            />
          )}
          {rightLen > 0.05 && (
            <Box
              position={[0, h / 2, rightPos]}
              size={[thickness, h, rightLen]}
              material={material}
            />
          )}
          <Box
            position={[0, doorHeight + lintelH / 2, center]}
            size={[thickness, lintelH, doorWidth]}
            material={material}
          />
          {/* Wall Top Cap Trim */}
          <Box
            position={[0, h + 0.02, 0]}
            size={[thickness + 0.02, 0.04, d]}
            material={wallCapMaterial}
            castShadow={false}
          />
        </group>
      );
    }
  }

  // Wall with Window cutout
  if (hasWindow) {
    const halfLen = length / 2;
    const center = windowOffset;
    const leftLen = Math.max(0.1, halfLen + center - windowWidth / 2);
    const rightLen = Math.max(0.1, halfLen - center - windowWidth / 2);
    const bottomH = windowElevation - windowHeight / 2;
    const topH = h - (windowElevation + windowHeight / 2);

    if (orientation === "x") {
      const leftPos = -halfLen + leftLen / 2;
      const rightPos = halfLen - rightLen / 2;
      return (
        <group position={position} onClick={onClick}>
          {/* Left segment */}
          <Box position={[leftPos, h / 2, 0]} size={[leftLen, h, thickness]} material={material} />
          {/* Right segment */}
          <Box position={[rightPos, h / 2, 0]} size={[rightLen, h, thickness]} material={material} />
          {/* Sill below */}
          <Box position={[center, bottomH / 2, 0]} size={[windowWidth, bottomH, thickness]} material={material} />
          {/* Lintel above */}
          <Box position={[center, h - topH / 2, 0]} size={[windowWidth, topH, thickness]} material={material} />
          {/* Window Glass Pane */}
          <Box position={[center, windowElevation, 0]} size={[windowWidth - 0.04, windowHeight - 0.04, 0.04]} material={glassMaterial} castShadow={false} />
          {/* Window Frame */}
          <Box position={[center, windowElevation, 0]} size={[windowWidth, windowHeight, thickness + 0.02]} material={darkMetalMaterial} />
          {/* Wall Top Cap Trim */}
          <Box position={[0, h + 0.02, 0]} size={[w, 0.04, thickness + 0.02]} material={wallCapMaterial} castShadow={false} />
        </group>
      );
    } else {
      const leftPos = -halfLen + leftLen / 2;
      const rightPos = halfLen - rightLen / 2;
      return (
        <group position={position} onClick={onClick}>
          <Box position={[0, h / 2, leftPos]} size={[thickness, h, leftLen]} material={material} />
          <Box position={[0, h / 2, rightPos]} size={[thickness, h, rightLen]} material={material} />
          <Box position={[0, bottomH / 2, center]} size={[thickness, bottomH, windowWidth]} material={material} />
          <Box position={[0, h - topH / 2, center]} size={[thickness, topH, windowWidth]} material={material} />
          <Box position={[0, windowElevation, center]} size={[0.04, windowHeight - 0.04, windowWidth - 0.04]} material={glassMaterial} castShadow={false} />
          <Box position={[0, windowElevation, center]} size={[thickness + 0.02, windowHeight, windowWidth]} material={darkMetalMaterial} />
          {/* Wall Top Cap Trim */}
          <Box position={[0, h + 0.02, 0]} size={[thickness + 0.02, 0.04, d]} material={wallCapMaterial} castShadow={false} />
        </group>
      );
    }
  }

  return null;
}

