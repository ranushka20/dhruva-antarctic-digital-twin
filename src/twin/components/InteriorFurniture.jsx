import Box from "./Box";
import {
  CommandConsole,
  ElectronicsTestBench,
  FumeHood,
  GantryHoist,
  GeneratorModule,
  GeologicalSampleTray,
  LabBench,
  LidarLaserUnit,
  ObservationTelescope,
  RadioCommsConsole,
  ServerRack,
  StatusDisplayWall,
  UltraLowFreezer,
  WaterFiltrationSkid,
  WorkshopBench,
} from "./Equipment";
import {
  BunkBed,
  CrewBed,
  DiningSet,
  ErgonomicChair,
  KitchenCounter,
  LockerUnit,
  LoungeSofaSet,
  MedicalStation,
  StorageRack,
  WorkstationDesk,
} from "./Furniture";
import {
  darkMetalMaterial,
  galvanizedSteelMaterial,
  glassTintedMaterial,
  indicatorGreenMaterial,
  sanitaryMaterial,
  screenAmberMaterial,
  screenGlowMaterial,
  steelLightMaterial,
  tableWoodMaterial,
  trimMaterial,
} from "./materials";

/* =========================================================
   GROUND FLOOR INTERIOR ROOM SETS
========================================================= */

/* --- 1. Earth Sciences Lab Interior Set --- */
export function EarthSciencesLabInterior() {
  return (
    <group>
      {/* Heavy Geological Lab Island Bench with Spectrometer */}
      <LabBench position={[-1.1, 0, -0.6]} width={2.2} instrumentType="spectrometer" />
      {/* Sample Examination Workstation */}
      <WorkstationDesk position={[1.1, 0, 0.5]} width={1.6} depth={0.7} dualMonitor />
      {/* Geological Rock Core Sample Tray on Bench */}
      <GeologicalSampleTray position={[-1.1, 0.94, -0.2]} />
      {/* Sample Storage Rack with specimen boxes */}
      <StorageRack position={[-1.8, 0, 1.0]} length={1.4} tiers={3} />
      {/* Rock specimen cabinet */}
      <Box position={[1.9, 0.8, -0.6]} size={[0.5, 1.6, 0.9]} material={darkMetalMaterial} />
    </group>
  );
}

/* --- 2. Life Sciences & Marine Lab Interior Set --- */
export function LifeSciencesLabInterior() {
  return (
    <group>
      {/* Bio Lab Bench with Stereo Microscope */}
      <LabBench position={[-0.8, 0, -0.6]} width={2.3} instrumentType="microscope" />
      {/* Centrifuge & Analysis Bench */}
      <LabBench position={[1.2, 0, 0.5]} width={1.9} instrumentType="centrifuge" />
      {/* Ultra-Low (-80°C) Sample Freezer */}
      <UltraLowFreezer position={[-1.8, 0, 0.9]} />
      {/* Lab Stools / Chairs */}
      <ErgonomicChair position={[-0.8, 0, 0.2]} color="blue" />
      <StorageRack position={[1.8, 0, -0.7]} length={1.1} tiers={3} />
    </group>
  );
}

/* --- 3. Chemical & Atmospheric Lab Interior Set --- */
export function ChemicalLabInterior() {
  return (
    <group>
      {/* Ducted Chemical Safety Fume Hood */}
      <FumeHood position={[-1.2, 0, -0.6]} width={1.8} />
      {/* Analytical Mass Spectrometer Bench */}
      <LabBench position={[1.1, 0, -0.6]} width={1.8} instrumentType="spectrometer" />
      {/* Workstation PC Desk */}
      <WorkstationDesk position={[0.8, 0, 0.6]} width={1.6} depth={0.7} dualMonitor />
      {/* Chemical Reagent Storage Rack & Safety Server */}
      <ServerRack position={[-1.8, 0, 1.0]} />
      <StorageRack position={[1.8, 0, 1.0]} length={1.0} tiers={3} />
    </group>
  );
}

/* --- 4. Electronics & Sensor Lab Interior Set --- */
export function ElectronicsLabInterior() {
  return (
    <group>
      {/* ESD Electronics Workstation with Oscilloscope & Soldering Station */}
      <ElectronicsTestBench position={[0.1, 0, -0.6]} width={2.4} />
      {/* Diagnostics Workstation PC */}
      <WorkstationDesk position={[0.7, 0, 0.6]} width={1.6} depth={0.7} dualMonitor />
      {/* Calibration Instrument Server Rack */}
      <ServerRack position={[-1.5, 0, 1.0]} />
      {/* Component Storage Rack */}
      <StorageRack position={[1.5, 0, 1.0]} length={1.3} tiers={3} />
    </group>
  );
}

/* --- 5. Heavy Maintenance Workshop Interior Set --- */
export function WorkshopInterior() {
  return (
    <group>
      {/* Industrial Steel Workbench with Vise & Pegboard */}
      <WorkshopBench position={[0, 0, -0.6]} />
      {/* Multi-Tier Heavy Spare Parts Racks */}
      <StorageRack position={[-1.7, 0, 1.0]} length={1.6} tiers={4} />
      <StorageRack position={[1.7, 0, 1.0]} length={1.6} tiers={4} />
      {/* Overhead Gantry Hoist Rail & Trolley */}
      <GantryHoist position={[0, 2.05, 0]} length={4.6} />
      {/* Parts Washer / Maintenance Tank */}
      <Box position={[-1.8, 0.45, -0.6]} size={[0.7, 0.9, 0.6]} material={darkMetalMaterial} />
    </group>
  );
}

/* --- 6. Main Entry Airlock & Mudroom Interior Set --- */
export function EntryAirlockInterior() {
  return (
    <group>
      {/* Cold Weather Survival Suit Lockers */}
      <LockerUnit position={[-1.5, 0, -0.6]} count={4} />
      <LockerUnit position={[1.5, 0, -0.6]} count={4} />
      {/* Central Changing Benches */}
      <Box position={[0, 0.25, 0.5]} size={[2.2, 0.45, 0.6]} material={galvanizedSteelMaterial} />
      {/* Boot Sanitizing & Wash Tray */}
      <Box position={[0, 0.05, -0.2]} size={[1.6, 0.04, 0.8]} material={trimMaterial} />
      {/* Decontamination Equipment Rack */}
      <StorageRack position={[1.7, 0, 1.0]} length={1.1} tiers={3} />
    </group>
  );
}

/* --- 7. Water Treatment & Snow Melter Interior Set --- */
export function WaterPlantInterior() {
  return (
    <group>
      {/* Reverse Osmosis (RO) Skid & Pump Manifold */}
      <WaterFiltrationSkid position={[0, 0, 0]} />
      {/* Water Treatment Chemical Storage Rack */}
      <StorageRack position={[-1.8, 0, 1.0]} length={1.2} tiers={3} />
      {/* Water Quality Test Workstation */}
      <Box position={[1.8, 0.45, 0.8]} size={[0.9, 0.9, 0.7]} material={darkMetalMaterial} />
      <Box position={[1.8, 0.92, 0.8]} size={[0.94, 0.04, 0.74]} material={steelLightMaterial} />
      <Box position={[1.8, 1.15, 0.8]} size={[0.4, 0.28, 0.04]} material={screenGlowMaterial} />
    </group>
  );
}

/* --- 8. Power Generation & CHP Core Interior Set --- */
export function PowerPlantInterior() {
  return (
    <group>
      {/* Sound-Attenuated Diesel / CHP Generator Module */}
      <GeneratorModule position={[0, 0, 0]} />
      {/* High-Voltage Switchgear Racks */}
      <Box position={[-1.8, 1.0, 1.1]} size={[1.3, 2.0, 0.6]} material={darkMetalMaterial} />
      <Box position={[-1.8, 1.4, 1.42]} size={[0.5, 0.4, 0.02]} material={screenAmberMaterial} />
      <Box position={[1.8, 1.0, 1.1]} size={[1.3, 2.0, 0.6]} material={darkMetalMaterial} />
      <Box position={[1.8, 1.4, 1.42]} size={[0.08, 0.08, 0.02]} material={indicatorGreenMaterial} />
    </group>
  );
}

/* =========================================================
   FIRST FLOOR INTERIOR ROOM SETS
========================================================= */

/* --- 1. Control Room Interior Set --- */
export function ControlRoomInterior() {
  return (
    <group>
      {/* Curved Command Operations Console */}
      <CommandConsole position={[0, 0, 0.3]} width={3.4} />
      {/* Master 6-Panel Operations Video Wall */}
      <StatusDisplayWall position={[0, 0.3, -1.85]} width={3.8} height={1.6} />
      {/* Station Telecom & Server Racks */}
      <ServerRack position={[-1.9, 0, 0.8]} />
      <ServerRack position={[1.9, 0, 0.8]} />
      {/* Commander's Ergonomic Desk */}
      <WorkstationDesk position={[-1.7, 0, -1.0]} width={1.2} depth={0.6} />
    </group>
  );
}

/* --- 2. Communication Center (SatCom & Radio) Interior Set --- */
export function SatComInterior() {
  return (
    <group>
      {/* Deep Space Radio & Satellite Uplink Terminal */}
      <RadioCommsConsole position={[0, 0, -0.6]} />
      {/* 2x 42U Telecom Server Racks with active LEDs */}
      <ServerRack position={[1.5, 0, 0.8]} />
      <ServerRack position={[-1.5, 0, 0.8]} />
      {/* Operator Workstation */}
      <WorkstationDesk position={[0.7, 0, 0.7]} width={1.4} depth={0.6} dualMonitor />
      {/* Comms Storage & Cable Rack */}
      <StorageRack position={[1.8, 0, -0.6]} length={1.1} tiers={3} />
    </group>
  );
}

/* --- 3. Crew Cabins (A & B) Interior Set --- */
export function CrewCabinsSingleInterior() {
  return (
    <group>
      {/* 2 Single Beds with Linens & Pillows */}
      <CrewBed position={[-1.2, 0, -0.4]} />
      <CrewBed position={[1.2, 0, -0.4]} />
      {/* Crew Locker Wardrobe */}
      <LockerUnit position={[0, 0, 1.2]} count={3} />
      {/* 2 Study Desks with PC Monitors */}
      <WorkstationDesk position={[-1.2, 0, 1.0]} width={1.2} depth={0.6} />
      <WorkstationDesk position={[1.2, 0, 1.0]} width={1.2} depth={0.6} />
    </group>
  );
}

/* --- 4. Crew Cabins (C & D) Interior Set --- */
export function CrewCabinsBunkInterior() {
  return (
    <group>
      {/* 2 Bunk Beds (2-Tier) with Safety Rails & Ladders */}
      <BunkBed position={[-1.1, 0, -0.4]} />
      <BunkBed position={[1.1, 0, -0.4]} />
      {/* 4-Door Wardrobe Lockers */}
      <LockerUnit position={[0, 0, 1.2]} count={4} />
      {/* Study Desk */}
      <WorkstationDesk position={[0, 0, -0.8]} width={1.3} depth={0.6} />
    </group>
  );
}

/* --- 5. Medical Bay & Tele-ICU Interior Set --- */
export function MedicalBayInterior() {
  return (
    <group>
      {/* Hospital ICU Bed with Telemetry Cart & IV Stand */}
      <MedicalStation position={[-0.4, 0, 0]} />
      {/* Doctor's Examination Desk */}
      <WorkstationDesk position={[1.4, 0, 0.6]} width={1.4} depth={0.7} />
      {/* Medical Trauma & Drug Cabinets */}
      <StorageRack position={[-1.8, 0, 1.1]} length={1.2} tiers={3} />
      <Box position={[1.8, 0.8, -0.6]} size={[0.5, 1.6, 0.8]} material={sanitaryMaterial} />
    </group>
  );
}

/* --- 6. Galley / Kitchen Interior Set --- */
export function GalleyKitchenInterior() {
  return (
    <group>
      {/* Stainless Commercial Kitchen Counter with Cooktops & Sink */}
      <KitchenCounter position={[0, 0, 0.4]} length={3.4} />
      {/* Food Provisions Storage Racks */}
      <StorageRack position={[-1.8, 0, -0.8]} length={1.4} tiers={4} />
      {/* Secondary Prep Counter */}
      <Box position={[0, 0.45, -0.8]} size={[1.8, 0.9, 0.6]} material={steelLightMaterial} />
    </group>
  );
}

/* --- 7. Dining Hall & Crew Lounge Interior Set --- */
export function DiningLoungeInterior() {
  return (
    <group>
      {/* Dining Table with 6 Chairs */}
      <DiningSet position={[-1.1, 0, 0]} seats={6} />
      {/* Lounge Sofa with Coffee Table & Credenza */}
      <LoungeSofaSet position={[1.3, 0, 0]} />
      {/* Wall Display for Crew Briefing / Entertainment */}
      <Box position={[-1.1, 1.4, 1.95]} size={[2.2, 1.1, 0.04]} material={screenGlowMaterial} />
    </group>
  );
}

/* --- 8. Conference & Briefing Room Interior Set --- */
export function ConferenceRoomInterior() {
  return (
    <group>
      {/* Boardroom Conference Table */}
      <Box position={[0, 0.74, 0]} size={[2.6, 0.06, 1.2]} material={tableWoodMaterial} />
      {/* 6 Ergonomic Boardroom Chairs */}
      {[-0.8, 0, 0.8].map((x, idx) => (
        <group key={`conf-chair-${idx}`}>
          <ErgonomicChair position={[x, 0, -0.85]} rotation={[0, 0, 0]} color="grey" />
          <ErgonomicChair position={[x, 0, 0.85]} rotation={[0, Math.PI, 0]} color="grey" />
        </group>
      ))}
      {/* Large Glowing Presentation Screen */}
      <Box position={[0, 1.4, -1.85]} size={[2.4, 1.2, 0.04]} material={screenGlowMaterial} />
      {/* Presentation Podium */}
      <Box position={[-1.8, 0.55, -1.2]} size={[0.5, 1.1, 0.5]} material={darkMetalMaterial} />
    </group>
  );
}

/* =========================================================
   SECOND FLOOR INTERIOR ROOM SETS
========================================================= */

/* --- 1. Meteorological Observatory Interior Set --- */
export function MetObservatoryInterior() {
  return (
    <group>
      {/* Weather Station Monitoring Workstation */}
      <WorkstationDesk position={[-1.2, 0, -0.6]} width={2.2} depth={0.8} dualMonitor />
      {/* Real-time Polar Radar & Isobaric Wall Display */}
      <StatusDisplayWall position={[0.8, 0.4, -1.85]} width={2.8} height={1.4} />
      {/* Met Data Logging Server Rack */}
      <ServerRack position={[1.8, 0, 0.6]} />
      {/* Barometer Calibration Table */}
      <Box position={[-1.8, 0.45, 0.7]} size={[0.8, 0.9, 0.7]} material={darkMetalMaterial} />
    </group>
  );
}

/* --- 2. Atmospheric LIDAR Lab Interior Set --- */
export function AtmosphericLidarInterior() {
  return (
    <group>
      {/* Optical Bench with Spectrometer */}
      <LabBench position={[-0.8, 0, -0.6]} width={2.6} instrumentType="spectrometer" />
      {/* Vertical Atmospheric LIDAR Laser Tube pointing through roof port */}
      <LidarLaserUnit position={[1.8, 0, 0.3]} />
      {/* Compute & Laser Power Rack */}
      <ServerRack position={[-2.2, 0, 0.6]} />
      {/* Laser Operator Workstation */}
      <WorkstationDesk position={[0.4, 0, 0.6]} width={1.4} depth={0.7} />
    </group>
  );
}

/* --- 3. Satellite Data Processing (Compute Farm) Interior Set --- */
export function SatProcessingInterior() {
  return (
    <group>
      {/* High-Density 3-Rack Server Farm Row */}
      <ServerRack position={[-1.8, 0, -0.5]} />
      <ServerRack position={[-0.9, 0, -0.5]} />
      <ServerRack position={[0.0, 0, -0.5]} />
      {/* High-Throughput Data Analysis Workstation */}
      <WorkstationDesk position={[1.4, 0, 0.5]} width={1.8} depth={0.7} dualMonitor />
      {/* Telecom Storage Rack */}
      <StorageRack position={[1.8, 0, -0.6]} length={1.1} tiers={3} />
    </group>
  );
}

/* --- 4. Observation Cupola Lounge Interior Set --- */
export function CupolaLoungeInterior() {
  return (
    <group>
      {/* Panoramic Glass Roof Canopy Frame */}
      <Box position={[0, 2.35, 0]} size={[4.8, 0.08, 2.6]} material={glassTintedMaterial} castShadow={false} />
      {/* Sky & Aurora Viewing Telescope */}
      <ObservationTelescope position={[1.9, 0, -0.4]} />
      {/* Comfortable Lounge Seating */}
      <LoungeSofaSet position={[-0.5, 0, 0]} />
      <ErgonomicChair position={[1.9, 0, 0.6]} color="orange" />
      {/* Aurora Sky Monitor */}
      <Box position={[2.1, 1.1, 1.4]} size={[1.4, 0.8, 0.04]} material={screenGlowMaterial} />
    </group>
  );
}

