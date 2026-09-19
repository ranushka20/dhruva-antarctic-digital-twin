import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export default function RoomCamera({ floor = "ground" }) {
  const { camera } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    let targetPos;
    let targetLook;

    if (floor === "exterior") {
      // Framed on the whole site, not the hull: the water chain, the offload
      // point and the apron are the reason this view exists.
      targetPos = [44, 30, 52];
      targetLook = [-1, 1.5, 4];
    } else if (floor === "first") {
      targetPos = [21, 26, 24];
      targetLook = [0.8, 1.0, 0.2];
    } else if (floor === "second") {
      targetPos = [19, 26, 22];
      targetLook = [0.8, 1.2, 0.2];
    } else {
      // Ground floor isometric dollhouse view
      targetPos = [21, 25, 24];
      targetLook = [0.8, 0.8, 0.2];
    }

    camera.position.set(targetPos[0], targetPos[1], targetPos[2]);
    camera.lookAt(new THREE.Vector3(...targetLook));

    if (controlsRef.current) {
      controlsRef.current.target.set(targetLook[0], targetLook[1], targetLook[2]);
      controlsRef.current.update();
    }
  }, [floor, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={12}
      maxDistance={110}
      maxPolarAngle={Math.PI / 2.05}
    />
  );
}
