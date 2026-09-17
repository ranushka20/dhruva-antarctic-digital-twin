import { useState } from "react";
import {
  Activity,
  Bell,
  ChevronDown,
  CloudSnow,
  Compass,
  Database,
  Eye,
  Gauge,
  Layers3,
  Map,
  Radio,
  Settings,
  Shield,
  Truck,
  Zap,
} from "lucide-react";
import BharatiTwin from "./twin/Bharati3D";
import { FIRST_ROOMS, GROUND_ROOMS } from "./twin/stationData";
import "./App.css";

const navItems = [
  [Compass, "Interior View"],
  [Layers3, "Exterior View"],
  [CloudSnow, "Live Sensors"],
  [Zap, "Energy System"],
  [Radio, "Communication"],
  [Shield, "Surveillance"],
  [Truck, "Logistics"],
  [Bell, "Alerts"],
];

function App() {
  const [floor, setFloor] = useState("ground");
  const [activeNav, setActiveNav] = useState("Interior View");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [isInteriorMode, setIsInteriorMode] = useState(false);

  const handleNavClick = (label) => {
    setActiveNav(label);
    if (label === "Exterior View") {
      setFloor("exterior");
      setIsInteriorMode(false);
    } else if (label === "Interior View") {
      if (floor === "exterior") setFloor("ground");
      setIsInteriorMode(true);
      if (!selectedAsset) {
        // default to first room on ground floor
        setSelectedAsset({
          id: GROUND_ROOMS[0].id,
          name: GROUND_ROOMS[0].name,
          type: GROUND_ROOMS[0].category,
          floor: GROUND_ROOMS[0].floor,
          status: GROUND_ROOMS[0].status,
          powerKw: GROUND_ROOMS[0].powerKw,
          temp: GROUND_ROOMS[0].temp,
          occupancy: GROUND_ROOMS[0].occupancy,
          source: GROUND_ROOMS[0].classification,
          raw: GROUND_ROOMS[0],
        });
      }
    }
  };

  const handleFloorClick = (newFloor) => {
    setFloor(newFloor);
    setActiveNav("Interior View");
    setIsInteriorMode(false);
  };

  const toggleExterior = () => {
    if (floor === "exterior") {
      setFloor("ground");
      setActiveNav("Interior View");
      setIsInteriorMode(false);
    } else {
      setFloor("exterior");
      setActiveNav("Exterior View");
      setIsInteriorMode(false);
    }
  };

  const handleEnterRoom = (roomData) => {
    const targetRoom = roomData || selectedAsset?.raw;
    if (targetRoom) {
      if (targetRoom.floorId) {
        setFloor(targetRoom.floorId);
      }
      setIsInteriorMode(true);
      setSelectedAsset({
        id: targetRoom.id,
        name: targetRoom.name,
        type: targetRoom.category || targetRoom.type,
        floor: targetRoom.floor,
        status: targetRoom.status || "ONLINE",
        powerKw: targetRoom.powerKw || "14.5 kW",
        temp: targetRoom.temp || "21.0 °C",
        occupancy: targetRoom.occupancy || "Nominal",
        source: targetRoom.classification || "ARCHITECTURAL TWIN",
        raw: targetRoom,
      });
    }
  };

  const handleExitRoom = () => {
    setIsInteriorMode(false);
  };

  return (
    <div className="reference-shell">
      {/* Top Header */}
      <header className="reference-header">
        <div className="reference-brand">
          <div className="flag-mark">
            <span />
            <span />
            <span />
          </div>
          <div>
            <strong>BHARATI</strong>
            <small>ANTARCTIC RESEARCH STATION</small>
          </div>
        </div>

        <div className="reference-statuses">
          <div>
            <span>TEMPERATURE</span>
            <strong>-24°C</strong>
          </div>
          <div>
            <span>WIND SPEED</span>
            <strong>32 km/h</strong>
          </div>
          <div>
            <span>HUMIDITY</span>
            <strong>68%</strong>
          </div>
          <div>
            <span>PRESSURE</span>
            <strong>982 hPa</strong>
          </div>
          <div className="online">
            <span>STATION STATUS</span>
            <strong>● ONLINE</strong>
          </div>
        </div>

        <div className="reference-clock">
          <span>12 JAN 2026</span>
          <strong>
            14:28:17 <small>(IST)</small>
          </strong>
          <button onClick={toggleExterior}>
            <span className="live-dot" />
            {floor === "exterior" ? "3D INTERIOR" : "3D EXTERIOR"}
            <ChevronDown size={13} />
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="reference-body">
        {/* Left Sidebar */}
        <aside className="reference-sidebar">
          <div className="sidebar-caption">STATION SYSTEMS</div>
          {navItems.map(([Icon, label]) => (
            <button
              key={label}
              className={`reference-nav ${activeNav === label ? "active" : ""}`}
              onClick={() => handleNavClick(label)}
            >
              <Icon size={17} />
              <span>{label}</span>
              {label === "Alerts" && <b>2</b>}
            </button>
          ))}
          <button className="reference-nav">
            <Settings size={17} />
            <span>Settings</span>
          </button>

          <div className="antarctica-card">
            <div className="map-grid">
              <div className="map-contour" />
              <span className="map-pin" />
            </div>
            <strong>BHARATI</strong>
            <small>69.41° S, 76.11° E</small>
            <span className="map-status">
              <i /> LINK STABLE
            </span>
          </div>
        </aside>

        {/* Main 3D Viewport */}
        <main className="reference-main">
          <div className="reference-mainbar">
            <div>
              <span>ANTARCTIC RESEARCH STATION</span>
              <h1>
                BHARATI DIGITAL TWIN{" "}
                <small style={{ fontSize: "11px", color: "#6e8b97", marginLeft: "8px" }}>
                  {floor === "exterior"
                    ? "· EXTERIOR VIEW"
                    : isInteriorMode && selectedAsset?.name
                    ? `· ${selectedAsset.name.toUpperCase()} INTERIOR`
                    : `· ${floor.toUpperCase()} FLOOR CUTAWAY`}
                </small>
              </h1>
            </div>
            <div className="view-switch">
              <button
                className={floor !== "exterior" ? "active" : ""}
                onClick={() => {
                  if (floor === "exterior") setFloor("ground");
                  setIsInteriorMode(true);
                  if (!selectedAsset) handleEnterRoom(GROUND_ROOMS[0]);
                }}
              >
                <Eye size={15} /> INTERIOR ROOM VIEW
              </button>
              <button
                className={floor !== "exterior" && !isInteriorMode ? "active" : ""}
                onClick={() => {
                  if (floor === "exterior") setFloor("ground");
                  setIsInteriorMode(false);
                }}
              >
                <Layers3 size={15} /> FLOOR CUTAWAY
              </button>
              <button
                className={floor === "exterior" ? "active" : ""}
                onClick={() => {
                  setFloor("exterior");
                  setIsInteriorMode(false);
                }}
              >
                <Map size={15} /> EXTERIOR 3D
              </button>
            </div>
          </div>

          <div className="reference-hero">
            <BharatiTwin
              floor={floor}
              isInteriorMode={isInteriorMode}
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
              onEnterRoom={handleEnterRoom}
              onExitRoom={handleExitRoom}
            />
          </div>

          {/* Bottom Floor Selector */}
          <div className="floor-controls">
            <button
              className={floor === "ground" ? "active" : ""}
              onClick={() => handleFloorClick("ground")}
            >
              GROUND FLOOR
            </button>
            <button
              className={floor === "first" ? "active" : ""}
              onClick={() => handleFloorClick("first")}
            >
              FIRST FLOOR
            </button>
            <button
              className={floor === "second" ? "active" : ""}
              onClick={() => handleFloorClick("second")}
            >
              SECOND FLOOR
            </button>
          </div>
        </main>

        {/* Right Details Panel */}
        <aside className="reference-panel">
          {selectedAsset ? (
            <>
              <div className="panel-eyebrow">SELECTED MODULE</div>
              <h2>{selectedAsset.name}</h2>
              <p className="panel-subtitle">
                Bharati Station · {selectedAsset.floor || "Operations Level"}
              </p>

              <div className="panel-preview">
                <Database size={28} />
                <span>LIVE TELEMETRY STREAM</span>
              </div>

              <div className="live-systems">
                <h3>MODULE TELEMETRY</h3>
                <div>
                  <span>Category</span>
                  <b>{selectedAsset.type}</b>
                </div>
                <div>
                  <span>Status</span>
                  <b className="normal">● {selectedAsset.status}</b>
                </div>
                <div>
                  <span>Power Draw</span>
                  <b>{selectedAsset.powerKw || "12.5 kW"}</b>
                </div>
                <div>
                  <span>Internal Temp</span>
                  <b>{selectedAsset.temp || "21.0 °C"}</b>
                </div>
                <div>
                  <span>Occupancy</span>
                  <b>{selectedAsset.occupancy || "Nominal"}</b>
                </div>
                <div>
                  <span>Classification</span>
                  <b>{selectedAsset.source || "ARCHITECTURAL TWIN"}</b>
                </div>
                <div>
                  <span>Level</span>
                  <b>{selectedAsset.floor || "Ground Floor"}</b>
                </div>
              </div>

              {/* Action Buttons */}
              {!isInteriorMode && selectedAsset.raw && (
                <button
                  className="enter-room"
                  style={{ marginBottom: "8px" }}
                  onClick={() => handleEnterRoom(selectedAsset.raw)}
                >
                  ENTER ROOM INTERIOR <span>→</span>
                </button>
              )}

              {isInteriorMode && (
                <button
                  className="enter-room"
                  style={{ marginBottom: "8px", background: "rgba(101, 227, 161, 0.12)", borderColor: "rgba(101, 227, 161, 0.4)", color: "#65e3a1" }}
                  onClick={handleExitRoom}
                >
                  EXIT TO FLOOR OVERVIEW <span>↑</span>
                </button>
              )}

              <button
                className="enter-room"
                style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.12)", color: "#7d98a3" }}
                onClick={() => {
                  setSelectedAsset(null);
                  setIsInteriorMode(false);
                }}
              >
                CLEAR SELECTION <span>✕</span>
              </button>
            </>
          ) : (
            <>
              <div className="panel-eyebrow">CONTROL ROOM</div>
              <h2>Control Room</h2>
              <p className="panel-subtitle">Bharati Station · Operations Core</p>

              <div className="panel-preview control-preview">
                <Gauge size={28} />
                <span>OPERATIONS MONITOR</span>
                <div className="screen-lines" />
              </div>

              <div className="live-systems">
                <h3>LIVE SYSTEMS</h3>
                {[
                  ["Environment", "Normal (-24°C Ext)"],
                  ["Power & CHP", "Normal (165 kW)"],
                  ["Communication", "Normal (SatLink 99.8%)"],
                  ["Life Support", "Normal (O2 / Temp 21°C)"],
                  ["Security / Access", "Normal (Airlocks Sealed)"],
                ].map(([name, value]) => (
                  <div key={name}>
                    <span>{name}</span>
                    <b className="normal">● {value}</b>
                  </div>
                ))}
              </div>

              <button
                className="enter-room"
                onClick={() => {
                  setFloor("first");
                  handleEnterRoom(FIRST_ROOMS[0]);
                }}
              >
                ENTER CONTROL ROOM <span>→</span>
              </button>
            </>
          )}

          <div className="panel-footer">
            <span>
              <Activity size={14} /> LAST SYNC
            </span>
            <b>Real-Time (Telemetry Online)</b>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default App;
