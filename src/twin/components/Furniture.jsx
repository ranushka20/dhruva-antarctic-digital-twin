import Box from "./Box";
import {
  bedSheetMaterial,
  chromeMaterial,
  darkMetalMaterial,
  fabricBlueMaterial,
  fabricGreyMaterial,
  fabricOrangeMaterial,
  glassMaterial,
  metalMaterial,
  sanitaryMaterial,
  screenGlowMaterial,
  steelLightMaterial,
  tableTopMaterial,
  tableWoodMaterial,
  trimMaterial,
  woodMaterial,
} from "./materials";

/* --- Ergonomic Office / Lab Chair --- */
export function ErgonomicChair({ position = [0, 0, 0], rotation = [0, 0, 0], color = "blue" }) {
  const cushionMat = color === "orange" ? fabricOrangeMaterial : color === "grey" ? fabricGreyMaterial : fabricBlueMaterial;
  return (
    <group position={position} rotation={rotation}>
      {/* 5-Star Base */}
      {[-0.18, 0, 0.18].map((x) => (
        <Box key={x} position={[x, 0.04, 0]} size={[0.04, 0.04, 0.4]} material={darkMetalMaterial} castShadow={false} />
      ))}
      <Box position={[0, 0.04, 0]} size={[0.4, 0.04, 0.04]} material={darkMetalMaterial} castShadow={false} />
      {/* Center Column */}
      <Box position={[0, 0.22, 0]} size={[0.06, 0.32, 0.06]} material={chromeMaterial} />
      {/* Seat Cushion */}
      <Box position={[0, 0.42, 0]} size={[0.44, 0.08, 0.44]} material={cushionMat} />
      {/* Backrest */}
      <Box position={[0, 0.72, -0.2]} size={[0.42, 0.48, 0.06]} material={cushionMat} />
      {/* Armrests */}
      <Box position={[-0.22, 0.58, -0.05]} size={[0.04, 0.22, 0.25]} material={darkMetalMaterial} />
      <Box position={[0.22, 0.58, -0.05]} size={[0.04, 0.22, 0.25]} material={darkMetalMaterial} />
    </group>
  );
}

/* --- Workstation Desk with Monitor & PC --- */
export function WorkstationDesk({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 1.8,
  depth = 0.8,
  height = 0.74,
  dualMonitor = false,
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Tabletop */}
      <Box position={[0, height - 0.02, 0]} size={[width, 0.04, depth]} material={tableTopMaterial} />
      {/* Metal Legs */}
      <Box position={[-width / 2 + 0.08, height / 2 - 0.02, -depth / 2 + 0.08]} size={[0.06, height, 0.06]} material={metalMaterial} />
      <Box position={[-width / 2 + 0.08, height / 2 - 0.02, depth / 2 - 0.08]} size={[0.06, height, 0.06]} material={metalMaterial} />
      <Box position={[width / 2 - 0.08, height / 2 - 0.02, -depth / 2 + 0.08]} size={[0.06, height, 0.06]} material={metalMaterial} />
      <Box position={[width / 2 - 0.08, height / 2 - 0.02, depth / 2 - 0.08]} size={[0.06, height, 0.06]} material={metalMaterial} />
      {/* Modesty Panel */}
      <Box position={[0, height - 0.22, -depth / 2 + 0.1]} size={[width - 0.2, 0.35, 0.02]} material={trimMaterial} />

      {/* PC Tower */}
      <Box position={[width / 2 - 0.22, 0.25, 0]} size={[0.2, 0.44, 0.45]} material={darkMetalMaterial} />

      {/* Monitor(s) */}
      {!dualMonitor ? (
        <group position={[0, height + 0.25, -depth / 4]}>
          <Box position={[0, -0.15, 0]} size={[0.18, 0.02, 0.16]} material={darkMetalMaterial} />
          <Box position={[0, -0.05, -0.02]} size={[0.04, 0.2, 0.03]} material={chromeMaterial} />
          <Box position={[0, 0.12, 0]} size={[0.7, 0.4, 0.04]} material={screenGlowMaterial} />
          <Box position={[0, 0.12, -0.02]} size={[0.74, 0.44, 0.02]} material={darkMetalMaterial} />
        </group>
      ) : (
        <group position={[0, height + 0.25, -depth / 4]}>
          {/* Left Screen */}
          <group position={[-0.38, 0, 0]} rotation={[0, 0.15, 0]}>
            <Box position={[0, 0.12, 0]} size={[0.62, 0.38, 0.04]} material={screenGlowMaterial} />
            <Box position={[0, 0.12, -0.02]} size={[0.66, 0.42, 0.02]} material={darkMetalMaterial} />
          </group>
          {/* Right Screen */}
          <group position={[0.38, 0, 0]} rotation={[0, -0.15, 0]}>
            <Box position={[0, 0.12, 0]} size={[0.62, 0.38, 0.04]} material={screenGlowMaterial} />
            <Box position={[0, 0.12, -0.02]} size={[0.66, 0.42, 0.02]} material={darkMetalMaterial} />
          </group>
        </group>
      )}

      {/* Keyboard & Mousepad */}
      <Box position={[0, height + 0.01, depth * 0.15]} size={[0.46, 0.015, 0.16]} material={darkMetalMaterial} castShadow={false} />
      <Box position={[0.32, height + 0.01, depth * 0.15]} size={[0.2, 0.01, 0.18]} material={fabricGreyMaterial} castShadow={false} />

      {/* Chair */}
      <ErgonomicChair position={[0, 0, depth * 0.55]} rotation={[0, Math.PI, 0]} />
    </group>
  );
}

/* --- Crew Single Bed --- */
export function CrewBed({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Bed Base Frame */}
      <Box position={[0, 0.2, 0]} size={[1.1, 0.35, 2.1]} material={woodMaterial} />
      {/* Mattress */}
      <Box position={[0, 0.42, 0.05]} size={[1.02, 0.2, 1.95]} material={bedSheetMaterial} />
      {/* Duvet / Blanket */}
      <Box position={[0, 0.46, 0.25]} size={[1.04, 0.14, 1.45]} material={fabricBlueMaterial} />
      {/* Pillow */}
      <Box position={[0, 0.54, -0.7]} size={[0.7, 0.12, 0.4]} material={sanitaryMaterial} />
      {/* Headboard with integrated shelf */}
      <Box position={[0, 0.65, -1.02]} size={[1.16, 0.8, 0.1]} material={woodMaterial} />
      {/* Bedside table & lamp */}
      <Box position={[0.75, 0.25, -0.7]} size={[0.42, 0.5, 0.42]} material={woodMaterial} />
      <Box position={[0.75, 0.58, -0.7]} size={[0.15, 0.16, 0.15]} material={tableTopMaterial} />
    </group>
  );
}

/* --- Crew 2-Tier Bunk Bed --- */
export function BunkBed({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* 4 Corner Posts */}
      {[-0.52, 0.52].map((x) =>
        [-1.02, 1.02].map((z) => (
          <Box key={`${x}-${z}`} position={[x, 0.95, z]} size={[0.08, 1.9, 0.08]} material={metalMaterial} />
        ))
      )}
      {/* Lower Bunk */}
      <Box position={[0, 0.35, 0]} size={[1.0, 0.15, 2.0]} material={bedSheetMaterial} />
      <Box position={[0, 0.42, 0.2]} size={[1.02, 0.12, 1.4]} material={fabricBlueMaterial} />
      <Box position={[0, 0.48, -0.7]} size={[0.65, 0.1, 0.38]} material={sanitaryMaterial} />

      {/* Upper Bunk */}
      <Box position={[0, 1.35, 0]} size={[1.0, 0.15, 2.0]} material={bedSheetMaterial} />
      <Box position={[0, 1.42, 0.2]} size={[1.02, 0.12, 1.4]} material={fabricOrangeMaterial} />
      <Box position={[0, 1.48, -0.7]} size={[0.65, 0.1, 0.38]} material={sanitaryMaterial} />

      {/* Safety Rail */}
      <Box position={[0.52, 1.6, 0.1]} size={[0.04, 0.25, 1.6]} material={metalMaterial} />

      {/* Access Ladder */}
      {[-0.45, -0.25].map((z, idx) => (
        <Box key={idx} position={[0.55, 0.9, z]} size={[0.04, 1.8, 0.04]} material={chromeMaterial} />
      ))}
      {[0.4, 0.7, 1.0, 1.3].map((y) => (
        <Box key={y} position={[0.55, y, -0.35]} size={[0.04, 0.03, 0.2]} material={chromeMaterial} />
      ))}
    </group>
  );
}

/* --- Dining Table Set with Chairs --- */
export function DiningSet({ position = [0, 0, 0], seats = 6 }) {
  const tableLength = seats === 4 ? 1.6 : 2.4;
  return (
    <group position={position}>
      {/* Tabletop */}
      <Box position={[0, 0.74, 0]} size={[tableLength, 0.06, 0.9]} material={tableWoodMaterial} />
      {/* Table Frame & Legs */}
      <Box position={[-tableLength / 2 + 0.1, 0.36, -0.35]} size={[0.06, 0.72, 0.06]} material={metalMaterial} />
      <Box position={[-tableLength / 2 + 0.1, 0.36, 0.35]} size={[0.06, 0.72, 0.06]} material={metalMaterial} />
      <Box position={[tableLength / 2 - 0.1, 0.36, -0.35]} size={[0.06, 0.72, 0.06]} material={metalMaterial} />
      <Box position={[tableLength / 2 - 0.1, 0.36, 0.35]} size={[0.06, 0.72, 0.06]} material={metalMaterial} />

      {/* Chairs around table */}
      {[-0.6, 0, 0.6].map((x, idx) => (
        <group key={`chair-row-${idx}`}>
          <ErgonomicChair position={[x, 0, -0.65]} rotation={[0, 0, 0]} color="blue" />
          <ErgonomicChair position={[x, 0, 0.65]} rotation={[0, Math.PI, 0]} color="blue" />
        </group>
      ))}
    </group>
  );
}

/* --- Kitchen / Galley Counters & Appliances --- */
export function KitchenCounter({ position = [0, 0, 0], length = 3.6 }) {
  return (
    <group position={position}>
      {/* Base Cabinets & Stainless Steel Counter */}
      <Box position={[0, 0.44, 0]} size={[length, 0.88, 0.7]} material={darkMetalMaterial} />
      <Box position={[0, 0.9, 0]} size={[length + 0.04, 0.06, 0.74]} material={steelLightMaterial} />

      {/* Dual Induction Cooktop */}
      <Box position={[-0.8, 0.94, 0]} size={[0.8, 0.02, 0.5]} material={darkMetalMaterial} />
      <Box position={[-0.8, 1.85, 0]} size={[0.9, 0.35, 0.55]} material={metalMaterial} />

      {/* Stainless Sink with Mixer Tap */}
      <Box position={[0.7, 0.92, 0]} size={[0.65, 0.04, 0.45]} material={darkMetalMaterial} />
      <Box position={[0.7, 1.12, -0.15]} size={[0.04, 0.22, 0.12]} material={chromeMaterial} />

      {/* Upright Double-door Industrial Refrigerator */}
      <Box position={[length / 2 + 0.55, 1.05, 0]} size={[0.9, 2.1, 0.8]} material={steelLightMaterial} />
      <Box position={[length / 2 + 0.55, 1.05, 0.41]} size={[0.04, 0.8, 0.04]} material={chromeMaterial} />
    </group>
  );
}

/* --- Medical Infirmary Bed & Diagnostic Station --- */
export function MedicalStation({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Hospital Bed with Adjustable Elevation */}
      <Box position={[0, 0.28, 0]} size={[1.05, 0.45, 2.15]} material={sanitaryMaterial} />
      <Box position={[0, 0.58, 0]} size={[0.98, 0.18, 2.05]} material={bedSheetMaterial} />
      <Box position={[0, 0.72, -0.65]} size={[0.65, 0.12, 0.38]} material={sanitaryMaterial} />
      {/* Head Incline Section */}
      <group position={[0, 0.65, -0.5]} rotation={[-0.2, 0, 0]}>
        <Box position={[0, 0, 0]} size={[0.96, 0.12, 0.7]} material={bedSheetMaterial} />
      </group>
      {/* Side Safety Rails */}
      <Box position={[-0.52, 0.7, 0]} size={[0.04, 0.28, 1.2]} material={chromeMaterial} />
      <Box position={[0.52, 0.7, 0]} size={[0.04, 0.28, 1.2]} material={chromeMaterial} />

      {/* IV Drip Pole */}
      <Box position={[0.65, 0.95, -0.8]} size={[0.04, 1.9, 0.04]} material={chromeMaterial} />
      <Box position={[0.65, 1.75, -0.8]} size={[0.18, 0.25, 0.12]} material={glassMaterial} />

      {/* Telemetry Monitor Cart */}
      <Box position={[-0.75, 0.5, -0.6]} size={[0.48, 0.95, 0.45]} material={sanitaryMaterial} />
      <Box position={[-0.75, 1.15, -0.6]} size={[0.42, 0.32, 0.06]} material={screenGlowMaterial} />
      {/* Medicine / Trauma Cabinet */}
      <Box position={[-0.75, 0.8, 0.6]} size={[0.45, 1.4, 0.45]} material={sanitaryMaterial} />
    </group>
  );
}

/* --- Lounge Sofa & Coffee Table --- */
export function LoungeSofaSet({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* 3-Seater Sofa */}
      <Box position={[0, 0.25, -0.7]} size={[2.2, 0.45, 0.85]} material={fabricBlueMaterial} />
      <Box position={[0, 0.65, -1.05]} size={[2.2, 0.55, 0.22]} material={fabricBlueMaterial} />
      <Box position={[-1.12, 0.45, -0.7]} size={[0.2, 0.4, 0.85]} material={fabricGreyMaterial} />
      <Box position={[1.12, 0.45, -0.7]} size={[0.2, 0.4, 0.85]} material={fabricGreyMaterial} />
      {/* Throw Cushions */}
      <Box position={[-0.6, 0.52, -0.8]} size={[0.38, 0.38, 0.1]} material={fabricOrangeMaterial} />
      <Box position={[0.6, 0.52, -0.8]} size={[0.38, 0.38, 0.1]} material={fabricOrangeMaterial} />

      {/* Coffee Table */}
      <Box position={[0, 0.22, 0]} size={[1.3, 0.04, 0.65]} material={tableWoodMaterial} />
      <Box position={[-0.55, 0.1, -0.25]} size={[0.05, 0.2, 0.05]} material={metalMaterial} />
      <Box position={[0.55, 0.1, -0.25]} size={[0.05, 0.2, 0.05]} material={metalMaterial} />
      <Box position={[-0.55, 0.1, 0.25]} size={[0.05, 0.2, 0.05]} material={metalMaterial} />
      <Box position={[0.55, 0.1, 0.25]} size={[0.05, 0.2, 0.05]} material={metalMaterial} />

      {/* Bookshelf / Credenza */}
      <Box position={[0, 0.75, 0.9]} size={[2.0, 1.5, 0.4]} material={woodMaterial} />
    </group>
  );
}

/* --- Multi-Tier Heavy Storage Rack --- */
export function StorageRack({ position = [0, 0, 0], length = 2.2, tiers = 4 }) {
  return (
    <group position={position}>
      {/* 4 Corner Uprights */}
      {[-length / 2 + 0.04, length / 2 - 0.04].map((x) =>
        [-0.25, 0.25].map((z) => (
          <Box key={`${x}-${z}`} position={[x, 1.0, z]} size={[0.06, 2.0, 0.06]} material={metalMaterial} />
        ))
      )}
      {/* Shelves & Cargo Crates */}
      {Array.from({ length: tiers }).map((_, i) => {
        const y = 0.3 + i * 0.52;
        return (
          <group key={i}>
            <Box position={[0, y, 0]} size={[length, 0.04, 0.6]} material={darkMetalMaterial} />
            {/* Storage Totes/Crates on shelves */}
            <Box position={[-length / 4, y + 0.18, 0]} size={[0.48, 0.32, 0.48]} material={trimMaterial} />
            <Box position={[length / 4, y + 0.18, 0]} size={[0.48, 0.32, 0.48]} material={fabricBlueMaterial} />
          </group>
        );
      })}
    </group>
  );
}

/* --- Crew Locker Unit --- */
export function LockerUnit({ position = [0, 0, 0], count = 3 }) {
  const width = count * 0.45;
  return (
    <group position={position}>
      <Box position={[0, 0.95, 0]} size={[width, 1.9, 0.55]} material={trimMaterial} />
      {Array.from({ length: count }).map((_, i) => {
        const x = -width / 2 + 0.225 + i * 0.45;
        return (
          <group key={i} position={[x, 0.95, 0.28]}>
            <Box position={[0, 0, 0]} size={[0.42, 1.82, 0.02]} material={darkMetalMaterial} />
            <Box position={[0.15, 0, 0.02]} size={[0.03, 0.16, 0.03]} material={chromeMaterial} />
          </group>
        );
      })}
    </group>
  );
}
