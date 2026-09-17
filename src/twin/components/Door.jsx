import Box from "./Box";
import {
  doorEmergencyMaterial,
  doorFrameMaterial,
  doorLabMaterial,
  doorWoodMaterial,
  glassMaterial,
  indicatorGreenMaterial,
  steelLightMaterial,
} from "./materials";

export default function Door({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 0.95,
  height = 1.9,
  thickness = 0.08,
  type = "lab", // 'lab', 'emergency', 'wood', 'glass'
  isOpen = false,
  openAngle = 0.45,
  hasVisionPanel = true,
  hasStatusLight = true,
  onClick,
}) {
  let leafMaterial = doorLabMaterial;
  if (type === "emergency") leafMaterial = doorEmergencyMaterial;
  else if (type === "wood") leafMaterial = doorWoodMaterial;
  else if (type === "glass") leafMaterial = glassMaterial;

  const frameThickness = 0.06;
  const frameDepth = thickness + 0.04;

  return (
    <group
      position={position}
      rotation={rotation}
      onClick={onClick ? (e) => {
        e.stopPropagation();
        onClick();
      } : undefined}
    >
      {/* --- Door Frame --- */}
      {/* Left Frame Post */}
      <Box
        position={[-width / 2 - frameThickness / 2, height / 2, 0]}
        size={[frameThickness, height, frameDepth]}
        material={doorFrameMaterial}
      />
      {/* Right Frame Post */}
      <Box
        position={[width / 2 + frameThickness / 2, height / 2, 0]}
        size={[frameThickness, height, frameDepth]}
        material={doorFrameMaterial}
      />
      {/* Top Header Frame */}
      <Box
        position={[0, height + frameThickness / 2, 0]}
        size={[width + frameThickness * 2, frameThickness, frameDepth]}
        material={doorFrameMaterial}
      />

      {/* --- Status Indicator Above Door --- */}
      {hasStatusLight && (
        <Box
          position={[0, height + frameThickness + 0.08, frameDepth / 2]}
          size={[0.12, 0.04, 0.04]}
          material={indicatorGreenMaterial}
          castShadow={false}
        />
      )}

      {/* --- Door Leaf (Rotatable if isOpen) --- */}
      <group
        position={[-width / 2, 0, 0]}
        rotation={[0, isOpen ? openAngle : 0, 0]}
      >
        <group position={[width / 2, 0, 0]}>
          <Box
            position={[0, height / 2, 0]}
            size={[width, height, thickness]}
            material={leafMaterial}
          />

          {/* Vision Panel Glass */}
          {hasVisionPanel && type !== "glass" && (
            <>
              <Box
                position={[0, height * 0.65, 0]}
                size={[width * 0.35, 0.5, thickness + 0.01]}
                material={glassMaterial}
                castShadow={false}
              />
              <Box
                position={[0, height * 0.65, 0]}
                size={[width * 0.38, 0.53, thickness + 0.015]}
                material={doorFrameMaterial}
              />
            </>
          )}

          {/* Stainless Steel Handle / Push Plate */}
          <Box
            position={[width * 0.38, height * 0.5, thickness / 2 + 0.02]}
            size={[0.04, 0.22, 0.03]}
            material={steelLightMaterial}
          />
          <Box
            position={[width * 0.38, height * 0.5, -thickness / 2 - 0.02]}
            size={[0.04, 0.22, 0.03]}
            material={steelLightMaterial}
          />
        </group>
      </group>
    </group>
  );
}
