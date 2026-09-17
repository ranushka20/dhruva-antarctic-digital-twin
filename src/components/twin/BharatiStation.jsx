import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  ContactShadows,
  Html,
  OrbitControls,
} from "@react-three/drei";
import * as THREE from "three";

/* =========================================================
   ASSET DATA
========================================================= */

const ASSETS = {
  "BHARATI-MAIN": {
    id: "BHARATI-MAIN",
    name: "Bharati Main Station",
    type: "Station Building",
    status: "OPERATIONAL",
    value: "47 personnel capacity",
    source: "MODELED",
  },

  "BHARATI-POWER-01": {
    id: "BHARATI-POWER-01",
    name: "Power Generator 01",
    type: "Power System",
    status: "WARNING",
    value: "42 kW",
    source: "SYNTHETIC",
  },

  "BHARATI-SOLAR-01": {
    id: "BHARATI-SOLAR-01",
    name: "Solar Array 01",
    type: "Energy Asset",
    status: "OPERATIONAL",
    value: "18.4 kW",
    source: "SYNTHETIC",
  },

  "BHARATI-COMMS-01": {
    id: "BHARATI-COMMS-01",
    name: "Communication Tower",
    type: "Communication",
    status: "OPERATIONAL",
    value: "98% link health",
    source: "SYNTHETIC",
  },

  "BHARATI-ENV-01": {
    id: "BHARATI-ENV-01",
    name: "Environmental Sensor 01",
    type: "Environmental Sensor",
    status: "OPERATIONAL",
    value: "-18.4 °C",
    source: "SYNTHETIC",
  },

  "BHARATI-STORAGE-01": {
    id: "BHARATI-STORAGE-01",
    name: "Storage Module 01",
    type: "Storage",
    status: "OPERATIONAL",
    value: "82% capacity",
    source: "SYNTHETIC",
  },
};

/* =========================================================
   MATERIALS
========================================================= */

const materials = {
  station: new THREE.MeshStandardMaterial({
    color: "#c7d2d6",
    roughness: 0.62,
    metalness: 0.18,
  }),

  stationLight: new THREE.MeshStandardMaterial({
    color: "#e1e8ea",
    roughness: 0.58,
    metalness: 0.12,
  }),

  stationDark: new THREE.MeshStandardMaterial({
    color: "#394a52",
    roughness: 0.72,
    metalness: 0.35,
  }),

  glass: new THREE.MeshStandardMaterial({
    color: "#174858",
    roughness: 0.14,
    metalness: 0.38,
    transparent: true,
    opacity: 0.82,
  }),

  glassBright: new THREE.MeshStandardMaterial({
    color: "#2b7183",
    roughness: 0.1,
    metalness: 0.25,
    transparent: true,
    opacity: 0.88,
  }),

  steel: new THREE.MeshStandardMaterial({
    color: "#26383f",
    roughness: 0.46,
    metalness: 0.82,
  }),

  steelLight: new THREE.MeshStandardMaterial({
    color: "#718087",
    roughness: 0.38,
    metalness: 0.86,
  }),

  dark: new THREE.MeshStandardMaterial({
    color: "#101d23",
    roughness: 0.7,
    metalness: 0.32,
  }),

  solar: new THREE.MeshStandardMaterial({
    color: "#102f43",
    roughness: 0.22,
    metalness: 0.62,
  }),

  snow: new THREE.MeshStandardMaterial({
    color: "#e5eef1",
    roughness: 0.98,
  }),

  snowBlue: new THREE.MeshStandardMaterial({
    color: "#b9cbd1",
    roughness: 1,
  }),

  warning: new THREE.MeshStandardMaterial({
    color: "#9b6126",
    roughness: 0.5,
    metalness: 0.2,
  }),

  orange: new THREE.MeshStandardMaterial({
    color: "#d98232",
    roughness: 0.52,
    metalness: 0.18,
  }),

  emissiveBlue: new THREE.MeshStandardMaterial({
    color: "#1c5260",
    emissive: "#3bc7d9",
    emissiveIntensity: 2.5,
    roughness: 0.3,
  }),
};

/* =========================================================
   SELECTABLE OBJECT
========================================================= */

function Selectable({
  id,
  selectedId,
  onSelect,
  children,
}) {
  const selected = selectedId === id;

  return (
    <group
      onClick={(event) => {
        event.stopPropagation();
        onSelect(id);
      }}
      onPointerOver={(event) => {
        event.stopPropagation();
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "default";
      }}
    >
      {children}

      {selected && (
        <mesh position={[0, 0.02, 0]}>
          <boxGeometry args={[1.15, 0.08, 1.15]} />
          <meshBasicMaterial
            color="#56d9e8"
            transparent
            opacity={0.2}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}

/* =========================================================
   SNOW
========================================================= */

function SnowGround() {
  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.35, 0]}
        receiveShadow
      >
        <planeGeometry args={[42, 42]} />
        <primitive object={materials.snow} attach="material" />
      </mesh>

      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.34, 0]}
      >
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial
          color="#b8cbd2"
          roughness={1}
        />
      </mesh>
    </group>
  );
}

function SnowDrifts() {
  const drifts = [
    [-8, 0.02, -5, 4, 0.5, 2],
    [7, 0.02, -6, 5, 0.45, 1.7],
    [-7, 0.02, 7, 5, 0.55, 2],
    [8, 0.02, 6, 4, 0.5, 1.8],
  ];

  return (
    <group>
      {drifts.map((drift, index) => (
        <mesh
          key={index}
          position={[drift[0], drift[1], drift[2]]}
          scale={[drift[3], drift[4], drift[5]]}
          rotation={[0, index * 0.45, 0]}
        >
          <sphereGeometry args={[1, 32, 16]} />
          <primitive object={materials.snow} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

/* =========================================================
   MAIN STATION
========================================================= */

function MainStation({
  selectedId,
  onSelect,
}) {
  return (
    <Selectable
      id="BHARATI-MAIN"
      selectedId={selectedId}
      onSelect={onSelect}
    >
      <group position={[0, 3.2, 0]}>

        {/* LOWER MODULE */}

        <mesh
          position={[0, -0.75, 0]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[9.2, 2.6, 4.8]} />
          <primitive
            object={materials.station}
            attach="material"
          />
        </mesh>

        {/* UPPER MODULE */}

        <mesh
          position={[0, 1.35, 0]}
          castShadow
        >
          <boxGeometry args={[8.8, 1.7, 4.6]} />
          <primitive
            object={materials.station}
            attach="material"
          />
        </mesh>

        {/* ROOF */}

        <mesh
          position={[0, 2.35, 0]}
          castShadow
        >
          <boxGeometry args={[9.4, 0.3, 5]} />
          <primitive
            object={materials.stationDark}
            attach="material"
          />
        </mesh>

        {/* FRONT WINDOWS */}

        {[-3.4, -1.7, 0, 1.7, 3.4].map(
          (x, index) => (
            <mesh
              key={`front-window-${index}`}
              position={[x, 1.32, 2.34]}
            >
              <boxGeometry args={[1.2, 0.75, 0.08]} />
              <primitive
                object={materials.glass}
                attach="material"
              />
            </mesh>
          )
        )}

        {/* SIDE WINDOWS */}

        {[-1.4, 0, 1.4].map(
          (z, index) => (
            <mesh
              key={`side-window-${index}`}
              position={[4.42, 1.2, z]}
            >
              <boxGeometry args={[0.08, 0.72, 1.05]} />
              <primitive
                object={materials.glass}
                attach="material"
              />
            </mesh>
          )
        )}

        {/* ENTRANCE */}

        <mesh
          position={[0, -1.05, 2.48]}
          castShadow
        >
          <boxGeometry args={[1.35, 1.9, 0.25]} />
          <primitive
            object={materials.dark}
            attach="material"
          />
        </mesh>

        {/* CANOPY */}

        <mesh
          position={[0, 0.05, 3]}
          rotation={[0.08, 0, 0]}
        >
          <boxGeometry args={[2.4, 0.18, 1.3]} />
          <primitive
            object={materials.steel}
            attach="material"
          />
        </mesh>

        {/* STEPS */}

        {[0, 1, 2].map((step) => (
          <mesh
            key={`step-${step}`}
            position={[
              0,
              -2.05 + step * 0.25,
              2.95 - step * 0.3,
            ]}
          >
            <boxGeometry args={[2.1, 0.2, 0.7]} />
            <primitive
              object={materials.steel}
              attach="material"
            />
          </mesh>
        ))}

        {/* SUPPORT COLUMNS */}

        {[-3.7, -1.85, 0, 1.85, 3.7].map(
          (x, index) => (
            <mesh
              key={`column-back-${index}`}
              position={[x, -2.5, -1.7]}
              castShadow
            >
              <boxGeometry args={[0.25, 2.5, 0.25]} />
              <primitive
                object={materials.steel}
                attach="material"
              />
            </mesh>
          )
        )}

        {[-3.7, -1.85, 0, 1.85, 3.7].map(
          (x, index) => (
            <mesh
              key={`column-front-${index}`}
              position={[x, -2.5, 1.7]}
              castShadow
            >
              <boxGeometry args={[0.25, 2.5, 0.25]} />
              <primitive
                object={materials.steel}
                attach="material"
              />
            </mesh>
          )
        )}

        {/* HVAC UNIT 1 */}

        <group position={[-2.5, 2.75, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.5, 0.6, 1.1]} />
            <primitive
              object={materials.dark}
              attach="material"
            />
          </mesh>

          <mesh position={[0, 0.34, 0]}>
            <cylinderGeometry
              args={[0.28, 0.28, 0.15, 24]}
            />
            <primitive
              object={materials.steel}
              attach="material"
            />
          </mesh>
        </group>

        {/* HVAC UNIT 2 */}

        <group position={[2.4, 2.75, 0.4]}>
          <mesh castShadow>
            <boxGeometry args={[1.3, 0.55, 1]} />
            <primitive
              object={materials.dark}
              attach="material"
            />
          </mesh>

          <mesh position={[0, 0.32, 0]}>
            <cylinderGeometry
              args={[0.25, 0.25, 0.14, 24]}
            />
            <primitive
              object={materials.steel}
              attach="material"
            />
          </mesh>
        </group>
      </group>
    </Selectable>
  );
}

/* =========================================================
   SIDE MODULES
========================================================= */

function SideModules() {
  return (
    <>
      <group position={[-6.4, 2.15, 0.2]}>
        <mesh castShadow>
          <boxGeometry args={[2.7, 3.2, 3.6]} />
          <primitive
            object={materials.station}
            attach="material"
          />
        </mesh>

        <mesh position={[0, 0.25, 1.83]}>
          <boxGeometry args={[1.8, 0.8, 0.08]} />
          <primitive
            object={materials.glass}
            attach="material"
          />
        </mesh>

        <mesh position={[0, -0.55, 1.83]}>
          <boxGeometry args={[1.1, 1.2, 0.08]} />
          <primitive
            object={materials.dark}
            attach="material"
          />
        </mesh>
      </group>

      <group position={[6.3, 2.15, 0.1]}>
        <mesh castShadow>
          <boxGeometry args={[2.7, 3.2, 3.6]} />
          <primitive
            object={materials.station}
            attach="material"
          />
        </mesh>

        <mesh position={[0, 0.25, 1.83]}>
          <boxGeometry args={[1.8, 0.8, 0.08]} />
          <primitive
            object={materials.glass}
            attach="material"
          />
        </mesh>

        <mesh position={[0, -0.55, 1.83]}>
          <boxGeometry args={[1.1, 1.2, 0.08]} />
          <primitive
            object={materials.dark}
            attach="material"
          />
        </mesh>
      </group>
    </>
  );
}

/* =========================================================
   SOLAR ARRAY
========================================================= */

function SolarArray({
  selectedId,
  onSelect,
}) {
  return (
    <Selectable
      id="BHARATI-SOLAR-01"
      selectedId={selectedId}
      onSelect={onSelect}
    >
      <group position={[-8, 1.2, -4]}>
        {[-1.6, -0.8, 0, 0.8, 1.6].map(
          (x, index) => (
            <group
              key={`solar-${index}`}
              position={[x, 0, 0]}
              rotation={[0.18, 0, 0]}
            >
              <mesh castShadow>
                <boxGeometry args={[0.7, 0.08, 2.8]} />
                <primitive
                  object={materials.solar}
                  attach="material"
                />
              </mesh>

              <mesh position={[0, -0.45, 0]}>
                <boxGeometry
                  args={[0.08, 0.9, 0.08]}
                />
                <primitive
                  object={materials.steel}
                  attach="material"
                />
              </mesh>
            </group>
          )
        )}
      </group>
    </Selectable>
  );
}

/* =========================================================
   COMMUNICATION TOWER
========================================================= */

function CommunicationTower({
  selectedId,
  onSelect,
}) {
  return (
    <Selectable
      id="BHARATI-COMMS-01"
      selectedId={selectedId}
      onSelect={onSelect}
    >
      <group position={[8, 4, -3]}>

        {[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(
          ([x, z], index) => (
            <mesh
              key={`tower-leg-${index}`}
              position={[
                x * 0.7,
                0,
                z * 0.7,
              ]}
              rotation={[
                0,
                0,
                x * -0.08,
              ]}
              castShadow
            >
              <cylinderGeometry
                args={[0.08, 0.1, 7, 12]}
              />
              <primitive
                object={materials.steel}
                attach="material"
              />
            </mesh>
          )
        )}

        {[1.7, 3.4, 5.1].map(
          (y, index) => (
            <mesh
              key={`tower-ring-${index}`}
              position={[0, y, 0]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <torusGeometry
                args={[1, 0.05, 8, 32]}
              />
              <primitive
                object={materials.steel}
                attach="material"
              />
            </mesh>
          )
        )}

        {/* CENTRAL ANTENNA */}

        <mesh
          position={[0, 6, 0]}
          castShadow
        >
          <cylinderGeometry
            args={[0.05, 0.05, 2.2, 12]}
          />
          <primitive
            object={materials.steel}
            attach="material"
          />
        </mesh>

        {/* DISH */}

        <mesh
          position={[0, 4.2, 0.15]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <sphereGeometry
            args={[
              0.85,
              24,
              12,
              0,
              Math.PI * 2,
              0,
              Math.PI / 2,
            ]}
          />
          <primitive
            object={materials.stationDark}
            attach="material"
          />
        </mesh>
      </group>
    </Selectable>
  );
}

/* =========================================================
   GENERATOR
========================================================= */

function Generator({
  selectedId,
  onSelect,
}) {
  return (
    <Selectable
      id="BHARATI-POWER-01"
      selectedId={selectedId}
      onSelect={onSelect}
    >
      <group position={[7, 0.65, 3.8]}>
        <mesh castShadow>
          <boxGeometry args={[2.4, 1.5, 1.8]} />
          <primitive
            object={materials.warning}
            attach="material"
          />
        </mesh>

        {[-0.6, 0, 0.6].map(
          (x, index) => (
            <mesh
              key={`generator-vent-${index}`}
              position={[x, 0.82, 0]}
            >
              <cylinderGeometry
                args={[0.18, 0.18, 0.3, 16]}
              />
              <primitive
                object={materials.dark}
                attach="material"
              />
            </mesh>
          )
        )}

        {/* EXHAUST */}

        <mesh
          position={[0.75, 1.45, 0]}
          castShadow
        >
          <cylinderGeometry
            args={[0.12, 0.12, 1.2, 12]}
          />
          <primitive
            object={materials.steel}
            attach="material"
          />
        </mesh>
      </group>
    </Selectable>
  );
}

/* =========================================================
   STORAGE
========================================================= */

function StorageModule({
  selectedId,
  onSelect,
}) {
  return (
    <Selectable
      id="BHARATI-STORAGE-01"
      selectedId={selectedId}
      onSelect={onSelect}
    >
      <group position={[-8, 0.8, 3.7]}>
        <mesh castShadow>
          <boxGeometry args={[3.2, 1.7, 2.2]} />
          <primitive
            object={materials.stationDark}
            attach="material"
          />
        </mesh>

        {[-1.2, -0.4, 0.4, 1.2].map(
          (x, index) => (
            <mesh
              key={`storage-rib-${index}`}
              position={[x, 0, 1.13]}
            >
              <boxGeometry
                args={[0.06, 1.55, 0.06]}
              />
              <primitive
                object={materials.steel}
                attach="material"
              />
            </mesh>
          )
        )}

        {/* DOOR */}

        <mesh position={[0, -0.05, 1.15]}>
          <boxGeometry args={[1.2, 1.35, 0.08]} />
          <primitive
            object={materials.dark}
            attach="material"
          />
        </mesh>
      </group>
    </Selectable>
  );
}

/* =========================================================
   VEHICLE
========================================================= */

function Vehicle({
  position = [0, 0, 0],
}) {
  return (
    <group position={position}>
      <mesh
        castShadow
        position={[0, 0.55, 0]}
      >
        <boxGeometry args={[2.4, 0.7, 1.2]} />
        <primitive
          object={materials.dark}
          attach="material"
        />
      </mesh>

      <mesh
        position={[0, 0.95, 0]}
        castShadow
      >
        <boxGeometry args={[1.3, 0.55, 1]} />
        <primitive
          object={materials.glass}
          attach="material"
        />
      </mesh>

      {[-0.8, 0.8].map(
        (x, index) => (
          <mesh
            key={`wheel-front-${index}`}
            position={[x, 0.18, 0.55]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry
              args={[0.28, 0.28, 0.22, 20]}
            />
            <primitive
              object={materials.dark}
              attach="material"
            />
          </mesh>
        )
      )}

      {[-0.8, 0.8].map(
        (x, index) => (
          <mesh
            key={`wheel-back-${index}`}
            position={[x, 0.18, -0.55]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <cylinderGeometry
              args={[0.28, 0.28, 0.22, 20]}
            />
            <primitive
              object={materials.dark}
              attach="material"
            />
          </mesh>
        )
      )}
    </group>
  );
}

/* =========================================================
   SENSOR MARKER
========================================================= */

function SensorMarker({
  id,
  position,
  color,
  label,
  selectedId,
  onSelect,
}) {
  const markerRef = useRef();

  useFrame(({ clock }) => {
    if (!markerRef.current) {
      return;
    }

    const pulse =
      1 +
      Math.sin(clock.elapsedTime * 2.2) *
        0.12;

    markerRef.current.scale.setScalar(pulse);
  });

  const selected = selectedId === id;

  return (
    <group position={position}>
      <Selectable
        id={id}
        selectedId={selectedId}
        onSelect={onSelect}
      >
        <group ref={markerRef}>
          <mesh>
            <sphereGeometry
              args={[0.16, 20, 20]}
            />
            <meshBasicMaterial color={color} />
          </mesh>

          <mesh>
            <sphereGeometry
              args={[0.3, 20, 20]}
            />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.12}
            />
          </mesh>
        </group>
      </Selectable>

      <Html
        position={[0.35, 0.1, 0]}
        center
        distanceFactor={10}
      >
        <div
          style={{
            padding: "4px 7px",
            border: `1px solid ${color}`,
            background:
              "rgba(4,12,17,.86)",
            color,
            fontSize: 9,
            letterSpacing: "0.08em",
            whiteSpace: "nowrap",
            borderRadius: 4,
            opacity: selected ? 1 : 0.72,
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

/* =========================================================
   CAMERA
========================================================= */

function CameraController({
  viewMode,
  controlsRef,
}) {
  const target = useMemo(
    () => new THREE.Vector3(0, 2, 0),
    []
  );

  useEffect(() => {
    if (!controlsRef.current) {
      return;
    }

    const camera =
      controlsRef.current.object;

    const presets = {
      EXT: [21, 13, 21],
      F1: [14, 7, 15],
      F2: [13, 10, 14],
      ROOF: [10, 17, 10],
      RESET: [21, 13, 21],
    };

    const position =
      presets[viewMode] ||
      presets.EXT;

    camera.position.set(
      position[0],
      position[1],
      position[2]
    );

    camera.lookAt(target);

    controlsRef.current.target.copy(
      target
    );

    controlsRef.current.update();
  }, [
    viewMode,
    controlsRef,
    target,
  ]);

  return null;
}

/* =========================================================
   SCENE
========================================================= */

function Scene({
  viewMode,
  selectedId,
  onSelect,
  controlsRef,
}) {
  return (
    <>
      <CameraController
        viewMode={viewMode}
        controlsRef={controlsRef}
      />

      <ambientLight intensity={1.15} />

      <directionalLight
        position={[10, 20, 10]}
        intensity={2.3}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />

      <directionalLight
        position={[-10, 10, -10]}
        intensity={0.7}
      />

      <SnowGround />
      <SnowDrifts />

      <MainStation
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <SideModules />

      <SolarArray
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <CommunicationTower
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <Generator
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <StorageModule
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <Vehicle position={[-3.8, 0, 7]} />
      <Vehicle position={[4.8, 0, 6.4]} />

      <SensorMarker
        id="BHARATI-ENV-01"
        position={[-4.5, 4.7, 2.7]}
        color="#56d9e8"
        label="ENV-01"
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <SensorMarker
        id="BHARATI-COMMS-01"
        position={[8, 9, -3]}
        color="#63e6a3"
        label="COMMS-01"
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <SensorMarker
        id="BHARATI-POWER-01"
        position={[7, 2, 3.8]}
        color="#f2b45c"
        label="POWER-01"
        selectedId={selectedId}
        onSelect={onSelect}
      />

      <ContactShadows
        position={[0, -0.3, 0]}
        opacity={0.32}
        scale={30}
        blur={2.5}
        far={10}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={8}
        maxDistance={42}
        maxPolarAngle={Math.PI / 2.05}
      />
    </>
  );
}

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function BharatiTwin({
  onSelectAsset,
}) {
  const [viewMode, setViewMode] =
    useState("EXT");

  const [selectedId, setSelectedId] =
    useState("BHARATI-MAIN");

  const controlsRef = useRef();

  const selectedAsset =
    ASSETS[selectedId] ||
    ASSETS["BHARATI-MAIN"];

  function handleSelect(id) {
    setSelectedId(id);

    if (onSelectAsset) {
      onSelectAsset(ASSETS[id]);
    }
  }

  function resetView() {
    setViewMode("RESET");

    setTimeout(() => {
      setViewMode("EXT");
    }, 50);
  }

  return (
    <div className="twin-wrap">

      {/* TOOLBAR */}

      <div className="twin-toolbar">
        <div className="twin-toolbar-left">
          <span className="twin-mode-label">
            VIEW
          </span>

          {["EXT", "F1", "F2", "ROOF"].map(
            (mode) => (
              <button
                key={mode}
                className={`twin-control ${
                  viewMode === mode
                    ? "active"
                    : ""
                }`}
                onClick={() =>
                  setViewMode(mode)
                }
              >
                {mode}
              </button>
            )
          )}

          <button
            className="twin-control"
            onClick={resetView}
          >
            RESET VIEW
          </button>
        </div>

        <div className="twin-toolbar-right">
          <span className="twin-status-dot" />
          DIGITAL TWIN
        </div>
      </div>

      {/* CANVAS */}

      <div className="twin-canvas">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{
            position: [21, 13, 21],
            fov: 42,
          }}
          onPointerMissed={() => {
            setSelectedId(null);
          }}
        >
          <Scene
            viewMode={viewMode}
            selectedId={selectedId}
            onSelect={handleSelect}
            controlsRef={controlsRef}
          />
        </Canvas>

        {/* TITLE */}

        <div className="twin-label">
          <strong>
            BHARATI DIGITAL TWIN
          </strong>

          <span>
            EXTERIOR · CONCEPTUAL MODEL
          </span>
        </div>

        {/* SELECTED OBJECT */}

        {selectedAsset && (
          <div className="twin-selected-hud">
            <div className="hud-kicker">
              SELECTED ASSET
            </div>

            <div className="hud-name">
              {selectedAsset.name}
            </div>

            <div className="hud-meta">
              <span>
                {selectedAsset.type}
              </span>

              <span>•</span>

              <span>
                {selectedAsset.source}
              </span>
            </div>
          </div>
        )}

        {/* HINT */}

        <div className="twin-hint">
          Click an asset to inspect · Drag to
          rotate · Scroll to zoom · Right drag
          to pan
        </div>
      </div>

      {/* ASSET CARD */}

      {selectedAsset && (
        <div className="twin-asset-card">

          <div className="asset-card-top">
            <div>
              <div className="asset-kicker">
                ASSET
              </div>

              <div className="asset-title">
                {selectedAsset.name}
              </div>
            </div>

            <div
              className={`asset-status ${
                selectedAsset.status ===
                "WARNING"
                  ? "warning"
                  : ""
              }`}
            >
              {selectedAsset.status}
            </div>
          </div>

          <div className="asset-grid">

            <div>
              <span>TYPE</span>

              <strong>
                {selectedAsset.type}
              </strong>
            </div>

            <div>
              <span>VALUE</span>

              <strong>
                {selectedAsset.value}
              </strong>
            </div>

            <div>
              <span>SOURCE</span>

              <strong>
                {selectedAsset.source}
              </strong>
            </div>

            <div>
              <span>ID</span>

              <strong>
                {selectedAsset.id}
              </strong>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}