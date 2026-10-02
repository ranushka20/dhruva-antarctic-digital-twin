# 🇮🇳 Bharati Maitri — Antarctic Digital Twin

> **An interactive Antarctic operations and digital-twin platform for monitoring research stations, logistics, supplies, infrastructure, and operational risks through a unified 2D + 3D interface.**

---

## 🌍 Overview

**Bharati Maitri** is a web-based Antarctic operations platform built around the concept of a **Digital Twin**.

The system brings together station-level information, logistics, supplies, infrastructure, equipment status, operational alerts, and 3D station visualization into one interface.

Instead of treating each station, inventory record, equipment item, and operational issue as separate information, Bharati Maitri connects them into a unified operational view.

The platform is designed around two complementary views:

- **HQ / Operations Dashboard** — a high-level view of station status, supplies, logistics, alerts, and operational priorities.
- **3D Digital Twin** — an immersive view of station infrastructure and individual zones/equipment.

---

# 🎯 Problem Statement

Operating research stations in Antarctica involves difficult logistical and environmental conditions.

Operational teams need to keep track of:

- Fuel and other critical supplies
- Generator and power-system health
- Research-station infrastructure
- Crew and station status
- Logistics and resupply windows
- Equipment warnings
- Data synchronization
- Zone-level operational conditions
- Actions requiring attention

When this information is spread across different systems, identifying what requires attention can become difficult.

### Bharati Maitri addresses this through a unified operational interface.

```text
Station Data
     │
     ├── Supplies
     ├── Equipment
     ├── Infrastructure
     ├── Crew
     ├── Logistics
     └── Alerts
            │
            ▼
     Bharati Maitri
            │
      ┌─────┴─────┐
      ▼           ▼
 HQ Dashboard   3D Digital Twin
      │           │
      └─────┬─────┘
            ▼
     Operational Insight
```

---

# ✨ Core Features

## 1. 🏠 HQ Operations Overview

The main dashboard provides a consolidated view of Antarctic stations.

It can surface:

- Station status
- Last synchronization
- Crew information
- Open actions
- Supply conditions
- Zones requiring attention
- Environmental readings
- Logistics information
- Access to the 3D twin

### Screenshot

![Bharati Maitri HQ Overview](./screenshots/hq-overview.jpg)

### What this view shows

The HQ dashboard provides an at-a-glance operational picture of the **Bharati** and **Maitri** stations.

The interface includes:

- Station comparison
- Live/offline state
- Crew counts
- Open operational actions
- Station map / visualization
- Records waiting to synchronize
- Supplies that require monitoring
- Zones requiring attention
- Environmental information such as temperature and wind
- Direct access to the 3D digital twin

The goal is to help an operator move from **overview → issue → detailed station view** without switching between multiple systems.

---

# 2. 🏗️ Interactive 3D Digital Twin

The 3D twin provides a visual representation of station infrastructure.

Operators can inspect a station at the facility/zone level and identify equipment or areas that require attention.

### Screenshot

![3D Power House Digital Twin](./screenshots/3d-power-house-twin.jpg)

### What this view shows

The 3D view represents a station facility with individually identified areas such as:

- Generator / power infrastructure
- Science laboratory
- Workshop and maintenance
- Main entry and mudroom
- Waste storage
- Wastewater / MBR plant
- Seawater RO plant
- Fuel storage
- CHP power station

The right-side operational panel provides additional context for the selected facility.

It can show:

- Current facility status
- Why the issue matters
- Equipment condition
- Equipment readings
- Open actions
- Recommended operational response

For example, an equipment warning can be connected directly to the corresponding physical area in the digital twin.

---

# 3. 📦 Logistics & Supplies Monitoring

Critical supplies can be monitored across stations.

The logistics view focuses on questions such as:

> **How long will the available stock last?**

and:

> **Will the next shipment arrive before the current stock is exhausted?**

### Screenshot

![Logistics and Zones](./screenshots/logistics-zones.jpg)

### What this view shows

The logistics interface displays resources such as:

- Generator spares
- HSD bulk fuel
- LPG cylinders
- Other station-critical resources

For each resource, the interface can communicate:

- Which station needs it
- Estimated remaining duration
- Uncertainty/range
- Margin to the next shipment
- Suggested ordering window
- Current operational state

The interface also provides a **Zones to Watch** section for identifying areas that are not currently normal.

---

# 4. ⛽ Fuel Stock Projection

The system includes a projection view for understanding fuel consumption over time.

### Screenshot

![Fuel Stock Projection](./screenshots/fuel-projection.jpg)

### What this view shows

The chart compares the current fuel-stock trajectory with a configurable **what-if scenario**.

It communicates:

- Current stock level
- Projected days of remaining fuel
- What-if scenario
- Fuel depletion point
- Potential shipment arrival window

The visualization makes it easier to understand whether current resources can support station operations until the next resupply opportunity.

> **Important:** A projection is based on the entered assumptions and burn rate. It should not be interpreted as a guaranteed prediction of future fuel availability.

---

# 5. 🚨 Operational Alerts & Actions

The platform highlights situations that require attention.

Example operational states include:

| Status | Meaning |
|---|---|
| 🟢 Normal | Operating within expected conditions |
| 🟡 Watch | Requires monitoring |
| 🟠 Needs Action | Requires an operational response |
| ⚪ No Data | Data is unavailable or has not been received |

The system can connect an alert to:

1. The affected station
2. The affected zone
3. The affected equipment
4. The reason the issue matters
5. The available operational action

This creates a traceable path from **alert → context → action**.

---

# 6. 🛰️ Station Connectivity & Synchronization

The platform also considers the reality that Antarctic stations may not always have continuous connectivity.

The dashboard can represent:

- Live station state
- Offline station state
- Last synchronization
- Queued records
- Data age
- Station link status

This is important for an Antarctic operations platform because a missing update does not necessarily mean that the underlying physical system has failed.

---

# 7. 🌡️ Environmental Context

Station information can be presented alongside environmental readings such as:

- Temperature
- Wind speed
- Other available environmental measurements

This allows operational information to be interpreted within the station's environmental context.

---

# 🧠 Digital Twin Concept

The project uses a digital-twin approach to connect physical infrastructure with its digital representation.

```text
              PHYSICAL STATION
                     │
          ┌──────────┼──────────┐
          ▼          ▼          ▼
       Equipment   Zones      Supplies
          │          │          │
          └──────────┼──────────┘
                     │
                     ▼
                Digital Model
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
      HQ Dashboard         3D Digital Twin
          │                     │
          └──────────┬──────────┘
                     ▼
             Operational View
```

The long-term objective is to make the digital model reflect the operational state of the real station as closely as the available data allows.

---

# 🛠️ Technology Stack

| Technology | Role |
|---|---|
| React | Frontend application |
| JavaScript | Application logic |
| HTML5 | Web structure |
| CSS3 | Interface styling |
| Vite | Development and build tooling |
| Three.js / WebGL | 3D visualization where implemented |
| Node.js | JavaScript runtime |
| npm | Package management |
| Git | Version control |
| GitHub | Source control and collaboration |

> The exact dependencies should be treated as authoritative from `package.json`.

---

# 🏗️ Application Architecture

```text
                         USER
                           │
                           ▼
                  React Web Application
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
     HQ Dashboard     Station Views    3D Digital Twin
          │                │                │
          └────────────────┼────────────────┘
                           │
                           ▼
                     Project Data
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
       Stations        Logistics         Equipment
          │                │                │
          └────────────────┼────────────────┘
                           ▼
                  Operational Insights
```

---

# 📁 Project Structure

```text
bharati-maitri-dashboard/
│
├── src/
│   ├── components/
│   │   └── Reusable React components
│   │
│   ├── data/
│   │   └── Project and station data
│   │
│   ├── twin/
│   │   └── Digital-twin / 3D functionality
│   │
│   ├── utils/
│   │   └── Utility functions
│   │
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   └── main.jsx
│
├── screenshots/
│   ├── hq-overview.jpg
│   ├── 3d-power-house-twin.jpg
│   ├── logistics-zones.jpg
│   └── fuel-projection.jpg
│
├── .gitignore
├── eslint.config.js
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Install:

- Node.js
- npm
- Git
- A modern web browser

Verify Node.js:

```bash
node --version
```

Verify npm:

```bash
npm --version
```

---

## Installation

Clone the repository:

```bash
git clone https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
```

Enter the project directory:

```bash
cd bharati-maitri-dashboard
```

Install dependencies:

```bash
npm install
```

---

## Run the Application

Start the Vite development server:

```bash
npm run dev
```

Open the local address shown by Vite, usually:

```text
http://localhost:5173
```

---

# 🧑‍💻 Development Structure

### Application Entry

```text
src/main.jsx
```

Initializes the React application.

### Main Application

```text
src/App.jsx
```

Acts as the main application component.

### Components

```text
src/components/
```

Contains reusable UI and feature components.

### Data

```text
src/data/
```

Contains structured application/station data.

### Digital Twin

```text
src/twin/
```

Contains functionality associated with the digital-twin / 3D experience.

### Utilities

```text
src/utils/
```

Contains reusable helper logic.

---

# 📊 Operational Data Model

A station can conceptually be represented as:

```text
Station
│
├── Status
├── Connectivity
├── Crew
├── Environment
│
├── Zones
│   ├── Power
│   ├── Fuel
│   ├── Storage
│   ├── Communications
│   └── Labs
│
├── Equipment
│   ├── Generators
│   ├── Fuel Systems
│   └── Other Assets
│
├── Supplies
│   ├── Fuel
│   ├── Generator Spares
│   └── LPG
│
└── Actions
    ├── Warnings
    ├── Open Actions
    └── Resupply Actions
```

This structure allows station information to be connected across the dashboard and digital twin.

---

# 🔄 Operational Workflow

```text
       DATA ARRIVES
            │
            ▼
     Station / System Data
            │
            ▼
       Data Processing
            │
            ▼
    ┌───────┴────────┐
    ▼                ▼
Dashboard          3D Twin
    │                │
    └───────┬────────┘
            ▼
       Alert / Insight
            │
            ▼
      Operator Action
            │
            ▼
      Updated Status
```

---

# 🤖 Future AI Integration

The platform can be extended with AI/ML for operational intelligence.

Potential applications include:

### Predictive Maintenance

Estimate equipment issues before they become operational failures.

### Fuel Consumption Analysis

Analyze historical burn rates and operational conditions.

### Resupply Planning

Support logistics planning using:

- Current stock
- Consumption rate
- Shipment schedules
- Uncertainty
- Station requirements

### Anomaly Detection

Identify unusual equipment, environmental, or consumption patterns.

### Risk Analysis

Combine multiple signals to identify situations requiring closer monitoring.

Possible architecture:

```text
Station Data
     │
     ▼
Data Processing
     │
     ▼
AI / ML Models
     │
     ├── Anomaly Detection
     ├── Prediction
     ├── Maintenance
     └── Logistics Analysis
              │
              ▼
       Operational Insight
              │
              ▼
        Digital Twin
```

---

# 🛰️ Future Scientific Data Integration

The platform can eventually integrate real scientific and operational datasets such as:

- Research-station information
- Satellite observations
- Weather observations
- Ice-sheet information
- Sea-ice information
- Terrain/elevation data
- Environmental measurements
- Logistics records

External datasets should be documented with their source, date, license, resolution, and relevant limitations.

---

# 📅 Time-Based Analysis

A future timeline could allow operators and researchers to inspect changes over time.

```text
Past ───────────────► Present ───────────────► Future
 │                       │                       │
Historical Data       Live Data             Scenarios
 │                       │                       │
 └────────────── Antarctic Operational History ─┘
```

This could be used for:

- Supply trends
- Fuel consumption
- Equipment history
- Environmental changes
- Station performance

---

# ⚡ Performance

Because the project includes interactive visualization, performance is an important consideration.

Potential optimizations include:

- Level of Detail (LOD)
- Efficient 3D geometry
- Texture optimization
- Lazy loading
- Instanced rendering
- Frustum culling
- Asset compression
- Progressive loading
- Efficient data updates

---

# 🔐 Security

For future backend/API integration:

- Keep API keys out of frontend source code.
- Use environment variables for secrets.
- Validate incoming data.
- Configure CORS appropriately.
- Use authentication where required.
- Apply rate limiting to exposed APIs.
- Never commit `.env` files containing secrets.

---

# 🧪 Development Roadmap

## Phase 1 — Platform Foundation

- [x] React + Vite application
- [x] Component-based architecture
- [x] Station dashboard concept
- [x] Logistics interface
- [x] 3D twin interface
- [x] Operational status indicators

## Phase 2 — Digital Twin

- [ ] More accurate station geometry
- [ ] Detailed zone interaction
- [ ] Equipment-to-model linking
- [ ] Interactive station navigation
- [ ] Improved 3D performance

## Phase 3 — Operational Data

- [ ] Live station telemetry
- [ ] Supply database
- [ ] Equipment history
- [ ] Logistics integration
- [ ] Synchronization service

## Phase 4 — Analytics

- [ ] Historical trends
- [ ] Fuel forecasting
- [ ] Equipment analytics
- [ ] Operational dashboards
- [ ] Advanced scenario modelling

## Phase 5 — AI

- [ ] Predictive maintenance
- [ ] Anomaly detection
- [ ] Consumption forecasting
- [ ] Logistics optimization support
- [ ] Environmental analysis

---

# 📸 Screenshots

## HQ Overview

The main operational dashboard provides a consolidated view of both stations, showing station status, crew, open actions, supplies, synchronization state, and zones that require attention.

![HQ Overview](./screenshots/hq-overview.jpg)

---

## 3D Digital Twin — Power House

The 3D station view connects physical-looking infrastructure with operational information. Users can inspect zones, equipment, power systems, and open actions from the same interface.

![3D Power House Twin](./screenshots/3d-power-house-twin.jpg)

---

## Logistics & Zones

This view focuses on resources that need monitoring or ordering and highlights abnormal zones across Bharati and Maitri.

![Logistics and Zones](./screenshots/logistics-zones.jpg)

---

## Fuel Stock Projection

The projection interface compares current and what-if fuel trajectories to help understand remaining stock and the relationship between consumption and the next shipment window.

![Fuel Stock Projection](./screenshots/fuel-projection.jpg)

---

# 🎥 Demonstration

### Live Demo

Add the deployed application URL here:

```text
https://YOUR-LIVE-URL
```

### Demo Video

Add the project demonstration video here:

```text
YOUR-VIDEO-LINK
```

---

# 📌 Current Status

🚧 **Active Development**

Bharati Maitri is being developed as an interactive Antarctic operations and digital-twin platform.

The current interface focuses on:

- Station overview
- Logistics
- Supplies
- Operational alerts
- Zones
- Equipment
- 3D infrastructure visualization
- Fuel-stock scenario visualization

---

# 🌱 Long-Term Vision

The long-term goal is to build a unified digital environment for Antarctic station operations.

```text
              ANTARCTIC STATIONS
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
    Logistics      Equipment       People
       │              │              │
       └──────────────┼──────────────┘
                      ▼
               DIGITAL TWIN
                      │
          ┌───────────┴───────────┐
          ▼                       ▼
    2D Operations             3D Twin
      Dashboard             Visualization
          │                       │
          └───────────┬───────────┘
                      ▼
              AI / Analytics
                      │
                      ▼
          Operational Intelligence
```

The vision is to connect **station infrastructure, logistics, supplies, environmental conditions, equipment, scientific information, and analytics** into a single operational ecosystem.

---

# 🤝 Contributing

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Make your changes:

```bash
git add .
git commit -m "Add: your feature"
git push origin feature/your-feature
```

Then open a Pull Request.

---

# 📜 License

Add the project's selected open-source license here.

For example:

```text
MIT License
```

should only be used if the repository is actually released under that license.

---

# 👨‍💻 Author

**Vabh**

B.Tech — Information Technology

---

# ⭐ Acknowledgements

This project may use open-source libraries, visualization technologies, scientific datasets, geographic information, and publicly available research resources.

All external datasets, imagery, models, libraries, and other resources should be credited according to their respective licenses and attribution requirements.

---

# ❄️ Bharati Maitri

> **A digital operational window into Antarctica — connecting stations, infrastructure, logistics, data, and immersive digital twins.**

**Explore. Monitor. Simulate. Understand.**
