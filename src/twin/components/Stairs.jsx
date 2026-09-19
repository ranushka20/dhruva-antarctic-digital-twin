import Box from "./Box";
import { chromeMaterial, galvanizedSteelMaterial, steelLightMaterial } from "./materials";

/**
 * Industrial open-tread stair.
 *
 * Local frame: the run climbs toward +Z, starting at the group origin
 * (bottom of the first riser) and finishing at y = totalHeight.
 *
 * The stringers and handrail follow the pitch. They previously used the
 * hypotenuse as a length but were never rotated, so both rendered as
 * horizontal bars floating at mid-height.
 */
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
  handrailHeight = 0.95,
}) {
  const stepHeight = totalHeight / steps;
  const stepDepth = totalDepth / steps;
  const stringerWidth = 0.06;
  const treadThickness = 0.04;

  // Pitch of the flight. Negative rotation about X lifts the +Z end.
  const run = Math.hypot(totalHeight, totalDepth);
  const pitch = -Math.atan2(totalHeight, totalDepth);

  // Posts at the foot, midpoint and head of the flight.
  const postSteps = [0, Math.floor(steps / 2), steps - 1];

  return (
    <group position={position} rotation={rotation}>
      {/* Treads & perforated risers */}
      {Array.from({ length: steps }).map((_, i) => {
        const y = i * stepHeight + stepHeight / 2;
        const z = i * stepDepth + stepDepth / 2;
        return (
          <group key={i}>
            <Box
              material={galvanizedSteelMaterial}
              position={[0, y + stepHeight / 2 - treadThickness / 2, z]}
              size={[width, treadThickness, stepDepth + 0.02]}
            />
            <Box
              material={steelLightMaterial}
              position={[0, y, z - stepDepth / 2 + 0.01]}
              size={[width, stepHeight, 0.02]}
            />
          </group>
        );
      })}

      {/* Side stringers, following the pitch */}
      {[-width / 2 - stringerWidth / 2, width / 2 + stringerWidth / 2].map((x, idx) => (
        <group
          key={`stringer-${idx}`}
          position={[x, totalHeight / 2, totalDepth / 2]}
          rotation={[pitch, 0, 0]}
        >
          <Box
            material={galvanizedSteelMaterial}
            position={[0, 0, 0]}
            size={[stringerWidth, 0.22, run]}
          />
        </group>
      ))}

      {/* Top landing */}
      {hasLanding && (
        <group position={[0, totalHeight - treadThickness / 2, totalDepth + landingDepth / 2]}>
          <Box
            material={galvanizedSteelMaterial}
            position={[0, 0, 0]}
            size={[width, treadThickness, landingDepth]}
          />
          <Box
            material={galvanizedSteelMaterial}
            position={[0, -0.15, landingDepth / 2 - 0.05]}
            size={[width + 0.1, 0.2, 0.1]}
          />
        </group>
      )}

      {/* Handrails */}
      {hasHandrails &&
        [-width / 2 - 0.05, width / 2 + 0.05].map((x, idx) => (
          <group key={`handrail-${idx}`}>
            {postSteps.map((stepIdx) => (
              <Box
                key={`post-${stepIdx}`}
                material={chromeMaterial}
                position={[
                  x,
                  stepIdx * stepHeight + handrailHeight / 2,
                  stepIdx * stepDepth,
                ]}
                size={[0.04, handrailHeight, 0.04]}
              />
            ))}

            {/* Sloped top rail, parallel to the stringers */}
            <group
              position={[x, totalHeight / 2 + handrailHeight, totalDepth / 2]}
              rotation={[pitch, 0, 0]}
            >
              <Box
                material={chromeMaterial}
                position={[0, 0, 0]}
                size={[0.045, 0.045, run]}
              />
            </group>

            {/* Landing guard: a level continuation of the rail */}
            {hasLanding && (
              <>
                <Box
                  material={chromeMaterial}
                  position={[
                    x,
                    totalHeight + handrailHeight / 2,
                    totalDepth + landingDepth - 0.05,
                  ]}
                  size={[0.04, handrailHeight, 0.04]}
                />
                <Box
                  material={chromeMaterial}
                  position={[
                    x,
                    totalHeight + handrailHeight,
                    totalDepth + landingDepth / 2,
                  ]}
                  size={[0.045, 0.045, landingDepth]}
                />
              </>
            )}
          </group>
        ))}
    </group>
  );
}
