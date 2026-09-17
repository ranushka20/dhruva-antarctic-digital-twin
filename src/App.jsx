import { useState } from "react";
import { Activity, Bell, ChevronDown, CloudSnow, Compass, Database, Gauge, Layers3, Map, Radio, Settings, Shield, Truck, Zap } from "lucide-react";
import BharatiTwin from "./twin/Bharati3D";
import "./App.css";

const navItems = [
  [Compass, "Interior View"], [Layers3, "Exterior View"], [CloudSnow, "Live Sensors"], [Zap, "Energy System"], [Radio, "Communication"], [Shield, "Surveillance"], [Truck, "Logistics"], [Bell, "Alerts"]
];

function App() {
  const [selectedAsset, setSelectedAsset] = useState(null);
  return <div className="reference-shell">
    <header className="reference-header">
      <div className="reference-brand"><div className="flag-mark"><span /><span /><span /></div><div><strong>BHARATI</strong><small>ANTARCTIC RESEARCH STATION</small></div></div>
      <div className="reference-statuses">
        <div><span>TEMPERATURE</span><strong>-24°C</strong></div><div><span>WIND SPEED</span><strong>32 km/h</strong></div><div><span>HUMIDITY</span><strong>68%</strong></div><div><span>PRESSURE</span><strong>982 hPa</strong></div><div className="online"><span>STATION STATUS</span><strong>● ONLINE</strong></div>
      </div>
      <div className="reference-clock"><span>12 JAN 2026</span><strong>14:28:17 <small>(IST)</small></strong><button><span className="live-dot" /> 3D EXTERIOR <ChevronDown size={13} /></button></div>
    </header>
    <div className="reference-body">
      <aside className="reference-sidebar"><div className="sidebar-caption">STATION SYSTEMS</div>{navItems.map(([Icon, label], index) => <button key={label} className={`reference-nav ${index === 0 ? "active" : ""}`}><Icon size={17} /><span>{label}</span>{label === "Alerts" && <b>2</b>}</button>)}<button className="reference-nav"><Settings size={17} /><span>Settings</span></button><div className="antarctica-card"><div className="map-grid"><div className="map-contour" /><span className="map-pin" /></div><strong>BHARATI</strong><small>69.41° S, 76.11° E</small><span className="map-status"><i /> LINK STABLE</span></div></aside>
      <main className="reference-main">
        <div className="reference-mainbar"><div><span>ANTARCTIC RESEARCH STATION</span><h1>BHARATI DIGITAL TWIN</h1></div><div className="view-switch"><button className="active"><Layers3 size={15} /> INTERIOR VIEW</button><button><Map size={15} /> MAP</button></div></div>
        <div className="reference-hero"><BharatiTwin onSelectAsset={setSelectedAsset} /></div>
        <div className="floor-controls"><button className="active">GROUND FLOOR</button><button>FIRST FLOOR</button><button>SECOND FLOOR</button></div>
      </main>
      <aside className="reference-panel">
        {selectedAsset ? <><div className="panel-eyebrow">SELECTED ROOM</div><h2>{selectedAsset.name}</h2><p className="panel-subtitle">Bharati Station · Ground Floor</p><div className="panel-preview"><Database size={28} /><span>LIVE ROOM VIEW</span></div><div className="live-systems"><h3>ROOM STATUS</h3><div><span>Category</span><b>{selectedAsset.type}</b></div><div><span>Status</span><b className="normal">● {selectedAsset.status}</b></div><div><span>Classification</span><b>{selectedAsset.source}</b></div><div><span>Level</span><b>Ground Floor</b></div></div><button className="enter-room" onClick={() => setSelectedAsset(null)}>CLEAR SELECTION <span>→</span></button></> : <><div className="panel-eyebrow">CONTROL ROOM</div><h2>Control Room</h2><p className="panel-subtitle">Bharati Station · Operations Core</p><div className="panel-preview control-preview"><Gauge size={28} /><span>OPERATIONS MONITOR</span><div className="screen-lines" /></div><div className="live-systems"><h3>LIVE SYSTEMS</h3>{[["Environment", "Normal"], ["Power", "Normal"], ["Communication", "Normal"], ["Life Support", "Normal"], ["Security", "Normal"]].map(([name, value]) => <div key={name}><span>{name}</span><b className="normal">● {value}</b></div>)}</div><button className="enter-room">ENTER ROOM <span>→</span></button></>}
        <div className="panel-footer"><span><Activity size={14} /> LAST SYNC</span><b>12 sec ago</b></div>
      </aside>
    </div>
  </div>;
}
export default App;
