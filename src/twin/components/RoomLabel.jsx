import { Html } from "@react-three/drei";

export default function RoomLabel({ room, selected, onSelect }) {
  if (!room) return null;

  return (
    <Html
      position={[room.x, 2.55, room.z]}
      center
      distanceFactor={20}
      zIndexRange={[10, 50]}
    >
      <div
        onClick={(e) => {
          e.stopPropagation();
          onSelect?.(room);
        }}
        className={`station-3d-badge ${selected ? "active" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2px",
          padding: "4px 9px",
          borderRadius: "4px",
          background: selected
            ? "rgba(16, 92, 114, 0.95)"
            : "rgba(8, 20, 29, 0.88)",
          border: selected
            ? "1px solid #4bd2e5"
            : "1px solid rgba(138, 185, 202, 0.28)",
          boxShadow: selected
            ? "0 0 16px rgba(75, 210, 229, 0.5), 0 4px 12px rgba(0,0,0,0.4)"
            : "0 4px 12px rgba(0,0,0,0.35)",
          color: "#ecf5f8",
          cursor: "pointer",
          userSelect: "none",
          whiteSpace: "nowrap",
          transform: "translate3d(0,0,0)",
          transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
          backdropFilter: "blur(4px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "10px",
            fontWeight: "700",
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: "5px",
              height: "5px",
              borderRadius: "50%",
              background: selected ? "#56d9e8" : "#65e3a1",
              boxShadow: selected
                ? "0 0 8px #56d9e8"
                : "0 0 6px #65e3a1",
            }}
          />
          {room.name}
        </div>
        <div
          style={{
            fontSize: "7.5px",
            color: selected ? "#b4ebf5" : "#7aa3b0",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {room.category || room.type}
        </div>
      </div>
    </Html>
  );
}
