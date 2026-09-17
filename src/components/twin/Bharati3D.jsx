import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function Bharati3D() {
  return (
    <div
      style={{
        width: "100%",
        height: "650px",
        background: "#07111f",
        borderRadius: "16px",
        overflow: "hidden",
      }}
    >
      <Canvas camera={{ position: [8, 6, 10], fov: 45 }}>
        <ambientLight intensity={1.5} />

        <directionalLight
          position={[10, 15, 10]}
          intensity={3}
          castShadow
        />

        {/* Test building */}
        <mesh position={[0, 1, 0]}>
          <boxGeometry args={[6, 2, 3]} />
          <meshStandardMaterial color="#b8c4cc" />
        </mesh>

        {/* Ground */}
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#dce7ed" />
        </mesh>

        <OrbitControls
          enableDamping
          minDistance={5}
          maxDistance={25}
        />
      </Canvas>
    </div>
  );
}

export default Bharati3D;