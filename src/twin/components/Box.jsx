export default function Box({
  position,
  size,
  material,
  onClick,
  castShadow = true,
  receiveShadow = true,
}) {
  return (
    <mesh
      position={position}
      onClick={onClick ? (event) => {
        event.stopPropagation();
        onClick();
      } : undefined}
      castShadow={castShadow}
      receiveShadow={receiveShadow}
    >
      <boxGeometry args={size} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
