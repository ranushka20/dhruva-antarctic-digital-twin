import Box from "./Box";
import { chromeMaterial, galvanizedSteelMaterial, steelLightMaterial } from "./materials";

export default function Stairs({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  steps = 8,
  width = 1.2,
  totalHeight = 2.4,
  totalDepth = 2.8,
  hasHandrails = true,
  hasLanding = true,
  landingDepth = 1.0,
}) {
  const stepHeight = totalHeight / steps;
  const stepDepth = totalDepth / steps;
  const stringerWidth = 0.06;
  const treadThickness = 0.04;

  return (
    <group position={position} rotation={rotation}>
      {/* Individual Step Treads & Risers */}
      {Array.from({ length: steps }).map((_, i) => {
        const y = i * stepHeight + stepHeight / 2;
        const z = i * stepDepth + stepDepth / 2;
        return (
          <group key={i}>
            {/* Tread */}
            <Box
              position={[0, y + stepHeight / 2 - treadThickness / 2, z]}
              size={[width, treadThickness, stepDepth + 0.02]}
              material={galvanizedSteelMaterial}
            />
            {/* Perforated Riser Plate */}
            <Box
              position={[0, y, z - stepDepth / 2 + 0.01]}
              size={[width, stepHeight, 0.02]}
              material={steelLightMaterial}
            />
          </group>
        );
      })}

      {/* Side Stringer Beams */}
      {[-width / 2 - stringerWidth / 2, width / 2 + stringerWidth / 2].map((x, idx) => (
        <group key={`stringer-${idx}`} position={[x, totalHeight / 2, totalDepth / 2]}>
          <Box
            position={[0, 0, 0]}
            size={[stringerWidth, 0.2, Math.sqrt(totalHeight * totalHeight + totalDepth * totalDepth)]}
            material={galvanizedSteelMaterial}
          />
        </group>
      ))}

      {/* Optional Top Landing Platform */}
      {hasLanding && (
        <group position={[0, totalHeight - treadThickness / 2, totalDepth + landingDepth / 2]}>
          <Box
            position={[0, 0, 0]}
            size={[width, treadThickness, landingDepth]}
            material={galvanizedSteelMaterial}
          />
          {/* Landing Support Beam */}
          <Box
            position={[0, -0.15, landingDepth / 2 - 0.05]}
            size={[width + 0.1, 0.2, 0.1]}
            material={galvanizedSteelMaterial}
          />
        </group>
      )}

      {/* Handrails */}
      {hasHandrails && (
        <group>
          {[-width / 2 - 0.05, width / 2 + 0.05].map((x, idx) => (
            <group key={`handrail-${idx}`}>
              {/* Vertical Posts along stairs */}
              {[0, Math.floor(steps / 2), steps - 1].map((stepIdx) => {
                const y = stepIdx * stepHeight + 0.45;
                const z = stepIdx * stepDepth;
                return (
                  <Box
                    key={`post-${stepIdx}`}
                    position={[x, y, z]}
                    size={[0.04, 0.9, 0.04]}
                    material={chromeMaterial}
                  />
                );
              })}
              {/* Sloped Top Handrail */}
              <group position={[x, totalHeight / 2 + 0.9, totalDepth / 2]}>
                <Box
                  position={[0, 0, 0]}
                  size={[0.04, 0.05, Math.sqrt(totalHeight * totalHeight + totalDepth * totalDepth)]}
                  material={chromeMaterial}
                />
              </group>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}
