import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

export default function RoomCamera({
  floor = "ground",
  isInteriorMode = false,
  activeRoom = null,
}) {
  const { camera } = useThree();
  const controlsRef = useRef();

  useEffect(() => {
    let targetPos;
    let targetLook;

    if (isInteriorMode && activeRoom) {
      const rw = activeRoom.w || 5.6;
      const rd = activeRoom.d || 4.2;

      // Position camera inside the room at eye level (Y = 1.55m) in front-right quadrant
      targetPos = [rw * 0.32, 1.55, rd * 0.32];
      // Look toward the center / main operations wall
      targetLook = [-0.2, 1.2, -0.3];
    } else if (floor === "exterior") {
      targetPos = [32, 17, 34];
      targetLook = [0, 2.0, 0];
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
  }, [floor, isInteriorMode, activeRoom, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={isInteriorMode ? 0.2 : 12}
      maxDistance={isInteriorMode ? 6.5 : 70}
      maxPolarAngle={isInteriorMode ? Math.PI / 1.95 : Math.PI / 2.05}
    />
  );
}
