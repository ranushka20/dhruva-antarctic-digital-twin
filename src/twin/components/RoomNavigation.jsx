import { ChevronLeft, ChevronRight, CornerUpLeft, Eye } from "lucide-react";

export default function RoomNavigation({
  activeRoom,
  floor = "ground",
  floorRooms = [],
  onSelectRoom,
  onExitRoom,
}) {
  if (!activeRoom) return null;

  const currentIndex = floorRooms.findIndex((r) => r.id === activeRoom.id);
  const prevRoom = currentIndex > 0 ? floorRooms[currentIndex - 1] : floorRooms[floorRooms.length - 1];
  const nextRoom = currentIndex < floorRooms.length - 1 ? floorRooms[currentIndex + 1] : floorRooms[0];

  const floorTitle =
    floor === "ground"
      ? "Ground Floor"
      : floor === "first"
      ? "First Floor"
      : floor === "second"
      ? "Second Floor"
      : "Bharati Station";

  return (
    <div className="interior-nav-hud">
      {/* Top Breadcrumb & Status Bar */}
      <div className="interior-nav-header">
        <div className="interior-breadcrumb">
          <span className="interior-tag">
            <Eye size={12} /> INTERIOR EXPLORATION
          </span>
          <span className="interior-sep">/</span>
          <span>{floorTitle}</span>
          <span className="interior-sep">/</span>
          <strong>{activeRoom.name}</strong>
        </div>

        <button className="interior-exit-btn" onClick={onExitRoom}>
          <CornerUpLeft size={13} />
          <span>EXIT TO FLOOR OVERVIEW</span>
        </button>
      </div>

      {/* Bottom Room Switcher Bar */}
      <div className="interior-nav-footer">
        <button
          className="interior-switch-btn"
          onClick={() => onSelectRoom(prevRoom)}
          title={`Previous: ${prevRoom?.name}`}
        >
          <ChevronLeft size={16} />
          <div className="switch-text">
            <small>PREVIOUS</small>
            <span>{prevRoom?.name}</span>
          </div>
        </button>

        <div className="interior-telemetry-pill">
          <div>
            <small>POWER</small>
            <b>{activeRoom.powerKw || "14 kW"}</b>
          </div>
          <div className="pill-divider" />
          <div>
            <small>TEMP</small>
            <b>{activeRoom.temp || "21°C"}</b>
          </div>
          <div className="pill-divider" />
          <div>
            <small>STATUS</small>
            <b className="status-live">● {activeRoom.status || "ONLINE"}</b>
          </div>
        </div>

        <button
          className="interior-switch-btn"
          onClick={() => onSelectRoom(nextRoom)}
          title={`Next: ${nextRoom?.name}`}
        >
          <div className="switch-text" style={{ textAlign: "right" }}>
            <small>NEXT</small>
            <span>{nextRoom?.name}</span>
          </div>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
