import Box from "./Box";
import {
  chromeMaterial,
  darkMetalMaterial,
  glassMaterial,
  hazardYellowMaterial,
  indicatorGreenMaterial,
  indicatorOrangeMaterial,
  indicatorRedMaterial,
  metalMaterial,
  rockMaterial,
  sampleTrayMaterial,
  sanitaryMaterial,
  screenAmberMaterial,
  screenGlowMaterial,
  steelLightMaterial,
  tableTopMaterial,
  trimMaterial,
} from "./materials";


/* --- Laboratory Island / Perimeter Bench --- */
export function LabBench({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  width = 2.4,
  depth = 0.9,
  hasReagentShelf = true,
  instrumentType = "microscope", // 'microscope', 'centrifuge', 'spectrometer', 'none'
}) {
  return (
    <group position={position} rotation={rotation}>
      {/* Base Cabinet & Worktop */}
      <Box position={[0, 0.44, 0]} size={[width, 0.88, depth]} material={trimMaterial} />
      <Box position={[0, 0.9, 0]} size={[width + 0.04, 0.06, depth + 0.04]} material={tableTopMaterial} />

      {/* Stainless Sink at one end */}
      <Box position={[width / 2 - 0.35, 0.92, 0]} size={[0.45, 0.04, depth * 0.6]} material={darkMetalMaterial} />
      <Box position={[width / 2 - 0.35, 1.15, -depth * 0.15]} size={[0.04, 0.25, 0.14]} material={chromeMaterial} />

      {/* Upper Reagent Shelf with Power Raceway */}
      {hasReagentShelf && (
        <group position={[0, 1.35, -depth / 4]}>
          <Box position={[0, 0, 0]} size={[width - 0.2, 0.04, 0.35]} material={tableTopMaterial} />
          <Box position={[-width / 2 + 0.15, -0.22, 0]} size={[0.04, 0.44, 0.3]} material={metalMaterial} />
          <Box position={[width / 2 - 0.15, -0.22, 0]} size={[0.04, 0.44, 0.3]} material={metalMaterial} />
          {/* Glassware / Sample Bottles on Shelf */}
          {[-0.5, -0.2, 0.1, 0.4].map((x, idx) => (
            <Box key={idx} position={[x, 0.1, 0]} size={[0.08, 0.16, 0.08]} material={glassMaterial} castShadow={false} />
          ))}
        </group>
      )}

      {/* Analytical Instrument */}
      {instrumentType === "microscope" && (
        <group position={[-width / 4, 1.05, 0]}>
          <Box position={[0, 0, 0]} size={[0.22, 0.06, 0.26]} material={darkMetalMaterial} />
          <Box position={[0, 0.18, -0.08]} size={[0.06, 0.3, 0.08]} material={chromeMaterial} />
          <Box position={[0, 0.28, 0.04]} size={[0.08, 0.14, 0.16]} material={darkMetalMaterial} />
          <Box position={[0, 0.36, 0.08]} size={[0.05, 0.1, 0.08]} material={chromeMaterial} />
        </group>
      )}
      {instrumentType === "centrifuge" && (
        <group position={[-width / 4, 1.05, 0]}>
          <Box position={[0, 0.1, 0]} size={[0.42, 0.25, 0.42]} material={sanitaryMaterial} />
          <Box position={[0, 0.24, 0]} size={[0.34, 0.04, 0.34]} material={darkMetalMaterial} />
          <Box position={[0.12, 0.26, 0.14]} size={[0.08, 0.02, 0.05]} material={indicatorGreenMaterial} />
        </group>
      )}
      {instrumentType === "spectrometer" && (
        <group position={[-width / 4, 1.08, 0]}>
          <Box position={[0, 0.12, 0]} size={[0.55, 0.3, 0.4]} material={metalMaterial} />
          <Box position={[-0.1, 0.28, 0.15]} size={[0.22, 0.14, 0.02]} material={screenGlowMaterial} />
          <Box position={[0.16, 0.28, 0.15]} size={[0.08, 0.04, 0.02]} material={indicatorOrangeMaterial} />
        </group>
      )}
    </group>
  );
}

export function CommandConsole({ position = [0, 0, 0], rotation = [0, 0, 0], width = 3.6 }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Main Console Base Desk */}
      <Box position={[0, 0.38, 0]} size={[width, 0.74, 1.0]} material={darkMetalMaterial} />
      <Box position={[0, 0.76, 0]} size={[width + 0.06, 0.04, 1.06]} material={tableTopMaterial} />

      {/* Triple Panoramic Display Mounts */}
      {[-1.1, 0, 1.1].map((x, idx) => (
        <group key={idx} position={[x, 1.1, -0.2]} rotation={[0, idx === 0 ? 0.2 : idx === 2 ? -0.2 : 0, 0]}>
          <Box position={[0, 0, 0]} size={[0.95, 0.55, 0.04]} material={screenGlowMaterial} />
          <Box position={[0, 0, -0.03]} size={[1.0, 0.6, 0.02]} material={darkMetalMaterial} />
          <Box position={[0, -0.3, 0]} size={[0.06, 0.15, 0.06]} material={chromeMaterial} />
        </group>
      ))}

      {/* Status Annunciator Panels & Keyboards on Desk */}
      {[-1.0, 0, 1.0].map((x, idx) => (
        <group key={`ctrl-${idx}`} position={[x, 0.79, 0.2]}>
          <Box position={[0, 0, 0]} size={[0.5, 0.015, 0.2]} material={darkMetalMaterial} castShadow={false} />
          <Box position={[0.3, 0.02, 0]} size={[0.06, 0.03, 0.06]} material={indicatorGreenMaterial} castShadow={false} />
        </group>
      ))}
    </group>
  );
}

/* --- Operations Master Video Wall Display --- */
export function StatusDisplayWall({ position = [0, 0, 0], width = 4.2, height = 2.0 }) {
  return (
    <group position={position}>
      {/* Wall Mounting Frame */}
      <Box position={[0, height / 2, 0]} size={[width + 0.1, height + 0.1, 0.06]} material={darkMetalMaterial} />
      {/* Screen Matrix (3x2 Displays) */}
      {[-width / 3, 0, width / 3].map((x, col) =>
        [-height / 4, height / 4].map((y, row) => (
          <group key={`${col}-${row}`} position={[x, height / 2 + y, 0.04]}>
            <Box position={[0, 0, 0]} size={[width / 3.15, height / 2.15, 0.02]} material={col === 1 ? screenAmberMaterial : screenGlowMaterial} />
            <Box position={[0, 0, -0.01]} size={[width / 3.1, height / 2.1, 0.01]} material={darkMetalMaterial} />
          </group>
        ))
      )}
    </group>
  );
}

/* --- 42U Telecom & Server Rack with Blinking LEDs --- */
export function ServerRack({ position = [0, 0, 0], rotation = [0, 0, 0] }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Steel Outer Enclosure */}
      <Box position={[0, 1.0, 0]} size={[0.7, 2.0, 0.85]} material={darkMetalMaterial} />
      {/* Perforated Glass Front Door */}
      <Box position={[0, 1.0, 0.43]} size={[0.62, 1.9, 0.02]} material={glassMaterial} castShadow={false} />

      {/* Internal Rack-mount Servers & Status Lights */}
      {[0.3, 0.6, 0.9, 1.2, 1.5, 1.75].map((y, idx) => (
        <group key={idx} position={[0, y, 0.38]}>
          <Box position={[0, 0, 0]} size={[0.58, 0.22, 0.04]} material={metalMaterial} />
          {/* Status LEDs */}
          <Box position={[-0.22, 0, 0.025]} size={[0.025, 0.025, 0.01]} material={indicatorGreenMaterial} castShadow={false} />
          <Box position={[-0.18, 0, 0.025]} size={[0.025, 0.025, 0.01]} material={indicatorGreenMaterial} castShadow={false} />
          <Box position={[-0.14, 0, 0.025]} size={[0.025, 0.025, 0.01]} material={idx === 4 ? indicatorOrangeMaterial : indicatorGreenMaterial} castShadow={false} />
          {/* Patch Cable Channel */}
          <Box position={[0.1, 0, 0.02]} size={[0.3, 0.08, 0.02]} material={darkMetalMaterial} />
        </group>
      ))}
    </group>
  );
}

/* --- Radio & Satellite Comms Terminal --- */
export function RadioCommsConsole({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Desk Base */}
      <Box position={[0, 0.38, 0]} size={[2.2, 0.74, 0.85]} material={darkMetalMaterial} />
      <Box position={[0, 0.76, 0]} size={[2.24, 0.04, 0.9]} material={tableTopMaterial} />
      {/* Rack Units on top */}
      <Box position={[-0.6, 1.15, -0.15]} size={[0.85, 0.75, 0.4]} material={metalMaterial} />
      <Box position={[-0.6, 1.2, 0.06]} size={[0.75, 0.3, 0.02]} material={screenAmberMaterial} />
      <Box position={[-0.6, 0.95, 0.06]} size={[0.75, 0.15, 0.02]} material={darkMetalMaterial} />
      {/* Operator Monitor */}
      <Box position={[0.5, 1.05, -0.1]} size={[0.65, 0.42, 0.04]} material={screenGlowMaterial} />
      {/* Microphone / Transceiver handset */}
      <Box position={[0.1, 0.85, 0.15]} size={[0.04, 0.18, 0.04]} material={chromeMaterial} />
    </group>
  );
}

/* --- Diesel / CHP Generator Skid --- */
export function GeneratorModule({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Base Skid with Vibration Dampeners */}
      <Box position={[0, 0.12, 0]} size={[2.8, 0.24, 1.6]} material={darkMetalMaterial} />
      {/* Main Sound-Attenuated Engine Enclosure */}
      <Box position={[0, 0.95, 0]} size={[2.6, 1.45, 1.45]} material={metalMaterial} />
      {/* Air Intake Louvers */}
      <Box position={[-1.31, 0.95, 0]} size={[0.02, 1.0, 1.1]} material={darkMetalMaterial} />
      <Box position={[1.31, 0.95, 0]} size={[0.02, 1.0, 1.1]} material={darkMetalMaterial} />
      {/* Control Switchboard */}
      <Box position={[0.8, 0.95, 0.74]} size={[0.7, 0.8, 0.04]} material={steelLightMaterial} />
      <Box position={[0.8, 1.15, 0.77]} size={[0.3, 0.2, 0.01]} material={screenAmberMaterial} />
      <Box position={[0.6, 0.85, 0.77]} size={[0.04, 0.04, 0.02]} material={indicatorGreenMaterial} />
      <Box position={[0.7, 0.85, 0.77]} size={[0.04, 0.04, 0.02]} material={indicatorRedMaterial} />
      {/* Vertical Insulated Exhaust Pipe Stack */}
      <Box position={[-0.8, 1.95, 0]} size={[0.22, 1.1, 0.22]} material={steelLightMaterial} />
      <Box position={[-0.8, 2.5, 0]} size={[0.32, 0.1, 0.32]} material={darkMetalMaterial} />
    </group>
  );
}

/* --- Water Treatment & Snow Melter Skid --- */
export function WaterFiltrationSkid({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Skid Base */}
      <Box position={[0, 0.1, 0]} size={[2.4, 0.2, 1.4]} material={darkMetalMaterial} />
      {/* 2 Vertical RO Filtration Vessels */}
      {[-0.6, 0.2].map((x, idx) => (
        <group key={idx} position={[x, 0.9, -0.2]}>
          <Box position={[0, 0, 0]} size={[0.55, 1.4, 0.55]} material={sanitaryMaterial} />
          <Box position={[0, 0.75, 0]} size={[0.45, 0.15, 0.45]} material={chromeMaterial} />
        </group>
      ))}
      {/* High-Pressure Booster Pump */}
      <Box position={[0.8, 0.45, 0.2]} size={[0.6, 0.5, 0.5]} material={steelLightMaterial} />
      {/* Manifold Pipes & Valves */}
      <Box position={[0, 1.4, -0.2]} size={[2.1, 0.06, 0.06]} material={chromeMaterial} />
      <Box position={[0, 0.5, 0.2]} size={[1.8, 0.06, 0.06]} material={chromeMaterial} />
    </group>
  );
}

/* --- Heavy Maintenance Workshop Bench & Tool Chest --- */
export function WorkshopBench({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Heavy Steel Workbench */}
      <Box position={[0, 0.45, 0]} size={[2.6, 0.9, 0.85]} material={darkMetalMaterial} />
      <Box position={[0, 0.92, 0]} size={[2.65, 0.08, 0.9]} material={steelLightMaterial} />
      {/* Heavy Swivel Vise on left corner */}
      <Box position={[-1.1, 1.05, 0.25]} size={[0.18, 0.18, 0.25]} material={metalMaterial} />
      {/* Tool Pegboard Backing */}
      <Box position={[0, 1.5, -0.4]} size={[2.6, 1.0, 0.04]} material={trimMaterial} />
      {/* Overhead task light */}
      <Box position={[0, 2.05, -0.1]} size={[2.2, 0.06, 0.15]} material={steelLightMaterial} />
      {/* Rolling Tool Chest */}
      <Box position={[1.65, 0.55, 0]} size={[0.65, 1.0, 0.65]} material={indicatorRedMaterial} />
    </group>
  );
}

/* --- Overhead Gantry Crane Hoist & Beam --- */
export function GantryHoist({ position = [0, 2.15, 0], length = 4.8 }) {
  return (
    <group position={position}>
      {/* Heavy Yellow I-Beam Crane Rail */}
      <Box position={[0, 0, 0]} size={[length, 0.14, 0.14]} material={hazardYellowMaterial} />
      {/* Motorized Hoist Trolley Unit */}
      <group position={[0.2, -0.16, 0]}>
        <Box position={[0, 0, 0]} size={[0.42, 0.2, 0.32]} material={darkMetalMaterial} />
        {/* Steel Cable & Heavy Lifting Hook */}
        <Box position={[0, -0.22, 0]} size={[0.02, 0.28, 0.02]} material={chromeMaterial} />
        <Box position={[0, -0.4, 0]} size={[0.1, 0.12, 0.08]} material={hazardYellowMaterial} />
      </group>
    </group>
  );
}

export function GeologicalSampleTray({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* Aluminum Sample Core Box */}
      <Box position={[0, 0.03, 0]} size={[0.75, 0.06, 0.35]} material={sampleTrayMaterial} />
      {/* 3 Cylindrical Rock Drill Cores */}
      {[-0.1, 0, 0.1].map((z, idx) => (
        <Box key={idx} position={[0, 0.06, z]} size={[0.68, 0.04, 0.06]} material={rockMaterial} />
      ))}
    </group>
  );
}

