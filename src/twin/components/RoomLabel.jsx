import { Html } from "@react-three/drei";

export default function RoomLabel({ room, selected }) {
  return (
    <Html
      position={[room.x, 0.72, room.z]}
      center
      distanceFactor={17}
      zIndexRange={[10, 100]}
    >
      <div
        style={{
          pointerEvents: "none",
          minWidth: 94,
          padding: "5px 8px",
          border: selected
            ? "1px solid #6ea8ff"
            : "1px solid rgba(255,255,255,0.15)",
          borderRadius: 6,
          background: selected
            ? "rgba(20, 100, 220, 0.95)"
            : "rgba(8, 16, 27, 0.9)",
          color: "#fff",
          textAlign: "center",
          boxShadow: "0 5px 16px rgba(0,0,0,.28)",
          fontFamily: "Inter, Arial, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        <div style={{ fontSize: 10, fontWeight: 700 }}>{room.name}</div>
        <div style={{ marginTop: 2, fontSize: 8, opacity: 0.72 }}>
          {room.subtitle}
        </div>
      </div>
    </Html>
  );
}
