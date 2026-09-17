export default function RoomInfoPanel({ room, onClose }) {
  if (!room) return null;

  return (
    <div className="ground-floor-room-panel">
      <div className="ground-floor-room-panel-header">
        <div>
          <div className="ground-floor-room-name">{room.name}</div>
          <div className="ground-floor-room-subtitle">{room.subtitle}</div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close room details">
          ×
        </button>
      </div>
      <div className="ground-floor-room-panel-divider" />
      <div className="ground-floor-room-row">
        <span>Status</span>
        <strong className={room.status === "Operational" ? "operational" : "maintenance"}>
          {room.status}
        </strong>
      </div>
      <div className="ground-floor-room-row">
        <span>Floor</span>
        <strong>Ground Floor</strong>
      </div>
      <div className="ground-floor-room-row">
        <span>Category</span>
        <strong>{room.category}</strong>
      </div>
      <div className="ground-floor-room-row ground-floor-room-classification">
        <span>Classification</span>
        <strong>{room.classification}</strong>
      </div>
    </div>
  );
}
