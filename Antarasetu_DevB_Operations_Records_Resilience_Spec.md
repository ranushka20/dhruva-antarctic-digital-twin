# Antarasetu — Developer B Build Spec
## Owner: Operations, Records & Resilience
## Pages: HQ Overview · Action Centre · Logistics & Resupply · Sync/Comms & Station Console · Compliance & Audit · Crew Handover, Settings & Auth

**Source of truth:** this file is extracted directly from `FRONTEND.md` (the complete, consolidated build specification) — Part I (Foundation, shared by both developers) plus your six assigned pages from Part II, plus the parts of Part III that concern you. If anything here ever seems to disagree with `FRONTEND.md`, `FRONTEND.md` wins — treat this file as your working copy, not a fork.

**This is a frontend-only build.** There is no real backend. Read the "FRONTEND-ONLY BUILD SCOPE" note inside Part I below before writing any code that touches persistence, sync, or auth — it tells you exactly what to simulate client-side and how. You own building most of that simulation layer (see below), so read it twice.

---

## Role summary

You own everything that is **lifecycle, workflow, connectivity or record-keeping** — the action state machine, the offline outbox/sync simulation, and the tamper-evident audit chain.

**Routes you own:** `/` (HQ Overview), `/actions` + `/actions/:actionId` (Action Centre), `/logistics` + `/logistics/manifest/:id` (Logistics & Resupply), `/comms` + `/station` (Sync, Comms & Station Console), `/compliance` (Compliance & Audit), `/handover` + `/settings` + `/login` (Crew Handover, Settings, Auth).

**Components/modules you are the source of truth for** (Developer A's pages consume these, never fork them):
- `ProvenanceBadge`, `SyncPill`, `StatusDot`, `TierChip`, `ActionCard`, `StatTile`, `ResourceRow`, `Drawer`, `DegradableSurface`, `EmptyState`, `Modal`, `Popover` (`src/components/shared/`).
- The **action state machine**: `RAISED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED`, with `DEFERRED` reachable from any pre-resolved state. Expose it as `useActionTransitions()` — Developer A's pages call this to raise/ACK/log-service, never reimplement it.
- `src/lib/hashChain.ts` — the SHA-256 tamper-evident hash chain (writer, client-side verifier, the chain-broken banner). Real implementation — do not simulate this one, it needs no server.
- **`state/connectivity.ts`** — the dev-only LIVE/LAGGING/DARK toggle, and the sync-simulation function that drains the outbox between the station-side and HQ-side local stores (frontend-only build — this module *is* your simulated backend, see the scope note below).
- **`lib/localStore.ts`** — the `localStorage` wrapper simulating both "local SQLite" (station) and persistent HQ state.
- `AntarcticaMap`, `DiffPanel` (`src/components/viz/`).

**Modules you consume but do not own** (Developer A builds these):
- `CausalTrace` — you use it verbatim in the Action Centre detail drawer. Its numbers must match Developer A's Digital Twin page exactly for the same asset/conditions — same engine, same call, no local reimplementation.
- `src/engine/coupling.ts` and friends — you call into it for the causal trace and for any Logistics/Compliance calculation touching autonomy or LSOD, but never modify its formulas.
- `TimeSeriesChart` — reuse for any chart you need (e.g. burn-rate sparklines on Logistics).

---

# PART I — FOUNDATION (shared with Developer A, read in full)

# PART I — FOUNDATION

---

## 1. Project identity & core thesis

**Antarasetu** (अंतरासेतु — "Bridge to Antarctica") is a Digital Twin and offline-first remote-operations platform for the Indian Antarctic stations **Bharati** and **Maitri**, operated from NCPOR HQ in Goa.

### What the problem statement actually requires

Integrate four domains into **one connected state model**, not four dashboards:

| Domain | Covers |
|---|---|
| **Infrastructure** | Equipment, facilities, utilities, operational assets |
| **Energy** | Generation, consumption, fuel, operating state |
| **Logistics** | Inventory, consumables, spares, cargo, resupply constraints |
| **Environment** | Temperature, wind, pressure, humidity and other measurements |

### The management question the product answers

> **"What is the state of the station right now, what is affecting that state, what needs attention, and what is the consequence if we do nothing?"**

### The core thesis — read this before writing any code

The 3D model is **not** the digital twin. The 3D model is the visual index into it. The twin is the **state model plus the causal relationships between subsystems**:

```
temperature falls
  → heating demand rises
    → energy consumption rises
      → generator load rises
        → fuel burn rises
          → projected autonomy falls
            → resupply risk increases
```

A build that renders a beautiful rotating station but omits or buries that chain has missed the point.

### What makes this defensible against other teams

| Layer | What it is |
|---|---|
| **Integration** | The four domains are *linked*, not displayed side by side. This is the twin. |
| **Action Centre** | Observe → Understand → Decide → Act → Record. This is the "management" in the PS. |
| **Offline-first + sync lag** | The station operates with no link; HQ's view visibly degrades. Nobody else will build this. |
| **Provenance badges** | LIVE / MODELED / SYNTH on every number. Converts the fake-data weakness into a trust feature. |
| **Autonomy Horizon + LSOD** | Reframes "what's the fuel level" into "can this station survive until the next ship, and when must we act". |

### Equality principle

**Bharati and Maitri are equals.** Neither is a footnote of the other. Every cross-station view must let an operator compare them side by side, and a Maitri problem must be able to outrank a Bharati one in any priority ordering.

---

## 2. Design tokens

Put these in `src/styles/tokens.css` and map them into `tailwind.config.ts` under `theme.extend`. **No component may contain a hard-coded hex value — including inside SVG.**

```css
:root {
  /* ---- surfaces : near-black with a green cast ---- */
  --bg:            #0A0D0C;   /* page background */
  --panel:         #111614;   /* primary card */
  --panel-raised:  #161D1A;   /* card inside a card, list rows */
  --panel-deep:    #0F1413;   /* map / 3D / chart wells */
  --panel-alt:     #1A221F;   /* hover, tooltips, popovers */
  --track:         #1C2422;   /* progress-bar trough */

  /* ---- hairlines ---- */
  --line:          rgba(255,255,255,0.07);
  --line-strong:   rgba(255,255,255,0.12);

  /* ---- text ---- */
  --text:          #EEF2F0;   /* primary */
  --text-2:        #B4C1BC;   /* secondary */
  --text-3:        #8B9A94;   /* muted labels — minimum permitted, passes 4.5:1 */
  --text-4:        #6E7C77;   /* axis ticks only */

  /* ---- semantic status ---- */
  --act:           #F26B21;   /* ORANGE — action required */
  --act-soft:      #F5915A;   /* orange text on dark */
  --ok:            #4FAE85;   /* MINT — healthy */
  --ok-soft:       #6FC6A2;   /* mint text on dark */
  --watch:         #D9A441;   /* AMBER — watch / degrading */
  --watch-soft:    #E0B564;   /* amber text on dark */
  --unknown:       #8B9A94;   /* GREY — no data / not ours */
  --sim:           #9B84C4;   /* VIOLET — sandbox simulation only */
  --sim-soft:      #B79BE0;

  /* ---- ambient glow : DECORATION ONLY ---- */
  --glow:          #4FD1A5;

  /* ---- geometry ---- */
  --r-nav: 15px; --r-card: 18px; --r-inner: 12px; --r-pill: 999px;
  --pad-page: 20px 24px; --pad-card: 16px 18px;
  --gap: 14px; --gap-inner: 9px;
}
```

### 3D-specific surface colours (Page 2)

```css
/* nominal zone block */
--face-top-ok:    linear-gradient(135deg, #2A3833 0%, #1E2A26 100%);
--face-left-ok:   #161F1C;
--face-right-ok:  #1B2521;
--edge-ok:        rgba(79,174,133,0.50);

/* warning zone block */
--face-top-warn:  linear-gradient(135deg, #4A2E19 0%, #37220F 100%);
--face-left-warn: #2B1C10;
--face-right-warn:#38240F;
--edge-warn:      #F26B21;

/* watch zone — nominal faces, amber edge */
--edge-watch:     rgba(217,164,65,0.60);

/* selection — independent channel from status */
--edge-selected:  #EEF2F0;   /* white dashed, 2px, dash 7 6 */

/* ground plane */
--grid-line:      rgba(79,209,165,0.16);
```

**Note the separation:** status is carried by the *edge* colour and (for warnings) the *top-face* tint. Selection is carried by a *white dashed outline*. These are three independent channels — a zone can be simultaneously selected and in warning.

---

## 3. The colour contract

Enforce these on every page. They are the design, not a suggestion.

| Rule | Detail |
|---|---|
| **Orange means "act on this". Nothing else.** | Primary CTAs, T0/T1 actions, warning states, overdue deadlines, the station pin with an open action. NEVER a chart fill, NEVER a brand accent, NEVER decoration. When the eye catches orange, there is something to do. |
| **Mint means healthy.** | Status dots, LIVE badges, healthy progress bars, the logo mark, comms signal arcs. Low saturation, no glow on the colour itself. |
| **Amber means watch.** | Degrading resources, LAGGING sync, storage low, thresholds being approached. |
| **Grey means unknown.** | Data we do not have. Always paired with a SYNTH / MODELED / UNKNOWN badge. |
| **Violet is sandbox-only.** | Appears on `/sandbox` and nowhere else. |
| **Status is never colour alone.** | Every coloured dot is paired with a text label, a value or a distinct shape. The screen must survive a bad projector and colour-blind viewers. Test in greyscale. |
| **Glow is ambient only.** | The teal `--glow` appears only as large, low-alpha radial gradients behind content. It never tints a number, a bar, a badge or a status dot. A mint value still means "healthy"; the glow can never be mistaken for a reading. |

---

## 4. Typography & geometry

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap');

--font-display: 'Space Grotesk', sans-serif;   /* titles, station codes, big numerals */
--font-body:    'IBM Plex Sans', system-ui, sans-serif;
--font-mono:    'JetBrains Mono', monospace;   /* EVERY number, badge, timestamp */
```

| Role | Family | Size | Weight |
|---|---|---|---|
| Page title | display | 27px | 500 |
| Station code (BHR / MTR) | display | 32px | 600 |
| Zone name (inspector) | display | 22px | 600 |
| Big stat | display | 20px | 600 |
| Card title | body | 13.5px | 600 |
| Body / list row | body | 12.5px | 400–500 |
| Metric value | mono | 12–15px | 400–600 |
| 3D zone label | mono | 11px | 600 |
| 3D zone sub-value | mono | 9.5px | 400 |
| Field label | mono | 9.5px, ls 0.10–0.12em, uppercase | 400 |
| Badge | mono | 8.5px, ls 0.06em | 400 |

**Hard rule:** every numeric value renders in `--font-mono`, including text baked into SVG. This is what makes the product read as instrumentation rather than a marketing site.

---

## 5. Ambient glow recipes

```css
/* ---- every page background ---- */
background:
  radial-gradient(ellipse 60% 44% at 80% 0%,
    rgba(79,209,165,0.10) 0%, rgba(79,209,165,0.03) 45%, rgba(10,13,12,0) 75%),
  #0A0D0C;

/* ---- nav bar ---- */
background:
  radial-gradient(ellipse 46% 320% at 71% 0%,
    rgba(79,209,165,0.20) 0%, rgba(79,209,165,0.06) 42%, rgba(17,22,20,0) 72%),
  #111614;

/* ---- hero viewport (3D, map, sandbox result) ---- */
background:
  radial-gradient(ellipse 74% 58% at 50% 6%,
    rgba(79,209,165,0.24) 0%, rgba(79,209,165,0.09) 34%,
    rgba(79,209,165,0.02) 62%, rgba(15,20,19,0) 82%),
  #0F1413;
border: 1px solid rgba(79,209,165,0.14);
box-shadow: inset 0 18px 70px rgba(79,209,165,0.10);

/* ---- light-cone container (the signature element: zone grid) ---- */
border-top-left-radius: 130px; border-top-right-radius: 130px;
border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;
background:
  radial-gradient(ellipse 88% 76% at 50% -4%,
    rgba(79,209,165,0.34) 0%, rgba(79,209,165,0.16) 26%,
    rgba(79,209,165,0.05) 52%, rgba(18,25,23,0) 76%),
  linear-gradient(180deg, #16201C 0%, #121917 100%);
border: 1px solid rgba(79,209,165,0.16);
box-shadow: inset 0 22px 60px rgba(79,209,165,0.14);

/* ---- map well ---- */
box-shadow: inset 0 0 90px rgba(79,209,165,0.10);

/* ---- floor glow inside a 3D/iso scene (SVG radialGradient) ---- */
/* #4FD1A5 : 0.30 at 0% → 0.11 at 45% → 0 at 100% */
```

---

## 6. App shell, nav & routing

Every page renders inside `<AppShell>`, which provides the nav bar and page padding.

### 6.1 Nav bar (`<NavBar>`)

| Element | Detail |
|---|---|
| Logo | Mint snowflake SVG + "Antarasetu", display 15px 600, ls 0.1em |
| Tabs | **Overview · Stations · Logistics · Compliance · Sandbox** — active = white pill `#EEF2F0` with `--bg` text; inactive = transparent, `--text-3` |
| Search | Circular icon button, opens the global command palette (`⌘/Ctrl + Space`) |
| Alerts | Circular icon button with an orange dot when ≥1 unacked T0/T1 exists on either station |
| User chip | Initials avatar on `#23302B`, handle mono 8.5px, name 11.5px, chevron |
| Mode switch | LIVE OPS / SANDBOX pill group — shown on Stations and Sandbox routes only |

Secondary routes light up the nearest parent tab and are reached from cards, tables and the command palette.

### 6.2 Page header (`<PageHeader>`)

Standard second row: optional back pill, page title (display 27px 500), inline controls (station switcher, search, segmented control), spacer, right-side meta (clock, counts), icon buttons.

### 6.3 Routing

```
/                          HQ Overview
/stations/:id/twin         Station Digital Twin
/actions                   Action Centre
/actions/:actionId         Action detail (drawer over /actions)
/logistics                 Logistics & Resupply
/logistics/manifest/:id    Manifest builder
/environment               Environment & Data Sources
/comms                     Sync & Comms (HQ side)
/station                   Station Console (station-side, offline-first)
/compliance                Compliance & Audit
/sandbox                   Research Sandbox
/assets                    Maintenance & Assets
/assets/:assetId           Asset detail
/handover                  Crew Handover
/settings                  Settings & Parameters
/login                     Auth
```

**Station scope is global app state, not a route param on every page.** `useStationScope()` returns `{ primary, compare, setPrimary }`. Station-specific pages read from it; `/logistics` and `/compliance` show both stations at once.

---

## 7. Shared component library

Build these once in `src/components/shared/`. Every page references them by name.

| Component | Purpose |
|---|---|
| `<ProvenanceBadge measurement>` | LIVE / MODELED / SYNTH / SIM badge + hover popover |
| `<SyncPill station>` | LIVE / LAGGING / DARK pill with age |
| `<StatusDot status size>` | 6–9px dot, always accompanied by a label |
| `<TierChip tier>` | T0–T3 chip, coloured by tier |
| `<ActionCard action variant>` | Action row used on `/`, `/actions`, `/station` |
| `<StatTile label value unit provenance>` | Big-number tile |
| `<MetricRow label value provenance>` | Label / value / badge row |
| `<ProgressBar value max tone>` | 4–6px trough bar |
| `<ResourceRow resource>` | Resource row with autonomy band + LSOD |
| `<ZoneCell zone selected>` | Zone grid cell |
| `<CausalTrace chain>` | The "Why this matters" cause→effect panel |
| `<Sparkline series threshold>` | Inline SVG series with optional threshold line |
| `<TimeSeriesChart series gaps>` | Chart with gap hatching, never interpolating |
| `<DegradableSurface syncState>` | Wrapper applying opacity/dash/hatch by sync state |
| `<EmptyState reason>` | Never a blank panel — always a reason |
| `<Drawer> <Modal> <Popover>` | Overlays on `--panel-alt` |
| `<CommandPalette>` | Global search across assets, actions, resources, records |
| `<AntarcticaMap>` | Inline-SVG continent with station markers |
| `<IsoStationModel>` | Isometric zone model (SVG first, Three.js upgrade) |
| `<DiffPanel>` | Before/after comparison for the sandbox |

### 7.1 `<ProvenanceBadge>` — the trust primitive

Four classes, one per value, no exceptions:

| Class | Meaning | Style |
|---|---|---|
| `LIVE` | Real external/public feed | mint tint bg, mint solid border, `--ok-soft` text |
| `MODELED` | Derived or replayed from documented real info | grey tint bg, grey solid border, `--text-2` text |
| `SYNTH` | Prototype placeholder for a feed we do not have | transparent bg, **grey dashed** border, `--text-3` text |
| `SIM` | Sandbox what-if output | violet tint bg, violet border, `--sim-soft` text |

**Hover popover contents:**

```
┌─ PROVENANCE ───────────────────────┐
│ SYNTHETIC — prototype placeholder  │
│ Generator #2 electrical load       │
│ awaiting: station SCADA adapter    │
│ model: baseline + HDD coupling     │
│ parent: ambient temp (LIVE)        │
│ NCPOR NPDC · 14:18 IST · 4 min     │
└────────────────────────────────────┘
```

**Derivation rule:** a value computed from mixed-class inputs is `MODELED` and must list every parent with that parent's own class. Silently blending a LIVE input with a SYNTH input into an unlabelled number is a spec violation.

**Placement rule:** the badge sits adjacent to its value, never in a corner legend.

### 7.2 `<DegradableSurface>` — the freshness primitive

| State | Age | Treatment |
|---|---|---|
| `LIVE` | < 30 min | 100% opacity, solid borders |
| `LAGGING` | 30 min – 12 h | 62% opacity, dashed borders, "view may be stale" note |
| `DARK` | > 12 h | 40% opacity, dashed borders, charts truncated at last known time with a hatched, labelled gap |

Thresholds configurable in `/settings`. **Each station degrades independently** — Bharati can be LIVE while Maitri is DARK on the same screen. **A stale input must never produce a confident derived deadline** — such fields render `stale`, not a number.

---

## 8. Data layer & the Measurement atom

### 8.1 The atom

```ts
type Provenance = 'LIVE' | 'MODELED' | 'SYNTH' | 'SIM';

interface Measurement {
  value: number | string | null;
  unit: string;
  timestamp: string;            // ISO 8601, station-stamped
  source: string;               // e.g. "NCPOR NPDC", "station SCADA adapter"
  provenance: Provenance;
  confidence?: number;          // 0–1
  freshnessSeconds: number;     // derived at read time
  parents?: { name: string; provenance: Provenance }[];  // REQUIRED when MODELED
  awaiting?: string;            // REQUIRED when SYNTH — the feed not yet connected
  model?: string;               // REQUIRED when MODELED — the formula used
}
```

### 8.2 Entity graph

```
Station ├── Asset ├── Measurement
        │         ├── Fault
        │         └── MaintenanceEvent
        ├── Zone
        ├── Resource └── ResourceMeasurement
        ├── LogisticsEvent
        ├── EnvironmentalMeasurement
        ├── OperationalAction
        ├── CommunicationEvent └── SyncRecord
        ├── WasteEvent
        └── HandoverSnapshot
```

### 8.3 Station summary (consumed by Pages 1 and 2)

```ts
interface StationSummary {
  id: 'bharati' | 'maitri';
  code: 'BHR' | 'MTR';
  name: string;
  lat: number; lon: number;
  crew: number;
  sync: { state: 'LIVE'|'LAGGING'|'DARK'; lastSyncAt: string; ageSeconds: number };
  domains: {
    infrastructure: DomainState;
    energy: DomainState;
    logistics: DomainState;
    environment: DomainState;
  };
  zones: Zone[];
  resources: Resource[];
  openActions: Action[];
  outbox: { tier: 'T0'|'T1'|'T2'|'T3'; queued: number; sent: number }[];
}

interface DomainState { status: 'ok'|'watch'|'warning'|'unknown'; summary: string; }

interface Zone {
  code: string; name: string;
  status: 'ok'|'watch'|'warning'|'unknown';
  summary: Measurement;
  openActionCount: number;
}
```

---

## 9. The coupling engine

`src/engine/coupling.ts` — **pure TypeScript, no UI dependency, unit-tested.** Every page that shows autonomy, LSOD or a causal chain reads from this one module. Two pages must never compute the same number two ways.

```ts
// ---- Thermal ----
HDD       = max(0, T_base − T_avg)                  // T_base default 18 °C, configurable
Q         = U × A × ΔT                              // per-zone U and A from station config
T_wc      = 13.12 + 0.6215·T − 11.37·v^0.16 + 0.3965·T·v^0.16
                                                     // NWS / Environment Canada wind chill
                                                     // T in °C, v in km/h

// ---- Energy ----
demand    = baselineLoad + heatingLoad(HDD, Q)
burnRate  = demand / generatorEfficiency

// ---- Autonomy ----
autonomyDays     = stock / burnRate
autonomyBandDays = autonomyDays × burnRateVariance  // ALWAYS surfaced as ±

// ---- Last Safe Order Date ----
LSOD = depletionDate
     − unloadingDays
     − transitDays
     − consolidationDays
     − procurementLeadDays
     then snapped BACKWARD to the last feasible sailing date in the ship window
     → null when any input is stale

// ---- Margin & risk ----
marginDays.min = shipWindow.earliestDay − (autonomyDays + band)
marginDays.max = shipWindow.latestDay   − (autonomyDays − band)

risk = critical if marginDays.min < 0
       warning  if lsodDays <= 14
       watch    if lsodDays <= 45
       ok       otherwise

// ---- Manifest prioritisation ----
urgency     = clamp(0, 1, (horizonDays − lsodDays) / horizonDays)
criticality = { lifeSafety: 1.0, power: 0.9, fuel: 0.85, medical: 0.8,
                spares: 0.6, provisions: 0.5, science: 0.3 }[category]
score       = urgency × criticality

// ---- Priority sync drain ----
T0 (life safety / medical)
T1 (critical ops / power / fuel)
T2 (logistics / compliance / operational records)
T3 (bulk science / non-critical)
→ strict tier order; no T2 transfers while any T1 remains

// ---- Fault similarity ----
TF-IDF cosine over {symptom + diagnosis + asset category}
top 5, minimum score 0.35, over this platform's OWN records only
NO external model, NO embeddings service, NO training claim
```

### Critical rule on parameters

**All lead times, transit durations, efficiencies, U-values, ship-window dates and coefficients are configurable inputs with visible values in `/settings`, never constants buried in code.** They are assumptions until NCPOR confirms them. `NFR-B1`: a constant in the engine that is not surfaced on `/settings` is a spec violation.

### Isometric projection (SVG renderer, Page 2)

```
halfW = 88; halfD = 51; height = 58
stepRight = { dx: +96, dy: +55 }
stepDown  = { dx: −96, dy: +55 }

cx = originX + gx·stepRight.dx + gy·stepDown.dx
cy = originY + gx·stepRight.dy + gy·stepDown.dy

top   = (cx, cy−halfD) (cx+halfW, cy) (cx, cy+halfD) (cx−halfW, cy)
left  = (cx−halfW, cy) (cx, cy+halfD) (cx, cy+halfD+h) (cx−halfW, cy+h)
right = (cx, cy+halfD) (cx+halfW, cy) (cx+halfW, cy+h) (cx, cy+halfD+h)

draw order: ascending (gx + gy)
```

### Hash chain (audit)

```
entry.hash = SHA256(
  entry.prevHash + canonicalJSON({
    seq, at, atStation, actor, actorRole, objectType, objectId, transition, payload
  })
)
genesis.prevHash = "0".repeat(64)

verify(chain):
  for i in 1..n:
    if chain[i].prevHash !== chain[i-1].hash: return { ok:false, brokenAt:i }
    if recompute(chain[i]) !== chain[i].hash:  return { ok:false, brokenAt:i }
  return { ok:true, verified:n }
```

Canonical JSON = keys sorted, no whitespace, UTF-8, numbers in shortest round-trip form. **Station edge and HQ must use identical serialisation**, or offline-written entries will fail verification after sync.

Call it a **tamper-evident hash chain (SHA-256)**. The string "blockchain" must not appear in the UI, the code or any export.

---

## 10. Adapters & real public data sources

Every data source sits behind an adapter in `src/adapters/`, so a SYNTH feed becomes a real one without touching UI code. **Each adapter declares its own provenance class. The UI never hard-codes one.**

```
environment.adapter.ts    → NCPOR NPDC / SCAR READER / AMRC / ERA5   [LIVE]
fuel.adapter.ts           → station fuel telemetry                    [SYNTH]
generator.adapter.ts      → station SCADA                             [SYNTH]
inventory.adapter.ts      → station inventory system                  [SYNTH]
maintenance.adapter.ts    → station maintenance records               [SYNTH]
logistics.adapter.ts      → cargo / voyage system                     [SYNTH]
```

### Real, citable public sources

| Source | Provides | Class | URL |
|---|---|---|---|
| NCPOR National Polar Data Center | Bharati/Maitri environmental datasets — aerosol optical depth, black carbon, lake-water chemistry, by station and date | LIVE | https://data.ncpor.res.in |
| NCPOR MET-Data / Live Access Server | Station meteorological data | LIVE | https://ncpor.res.in |
| SCAR READER | Quality-controlled monthly/annual means of temperature, pressure, wind for Antarctic stations and AWS | LIVE | https://www.antarctica.ac.uk/met/READER/ |
| UW–Madison AMRC / AWS Project | Decades of surface observations; wind–temperature co-occurrence | LIVE | https://amrc.ssec.wisc.edu · https://amrdcdata.ssec.wisc.edu |
| ERA5 (ECMWF / Copernicus) | Hourly global reanalysis — temperature, wind, pressure, radiation | LIVE | https://cds.climate.copernicus.eu |
| NSIDC Sea Ice Index | Antarctic sea-ice extent and concentration | LIVE | https://nsidc.org/data/seaice_index |

**None of these provide internal station telemetry.** Fuel level, generator load, inventory and maintenance history remain `SYNTH` until NCPOR shares them. The data-source register on Page 5 must state this plainly.

---

## 11. Global non-functional requirements

These apply to **every** page. Page-specific NFRs are additional, never contradictory.

| ID | Requirement |
|---|---|
| **NFR-G1** | FCP < 1.5 s on a mid-range laptop at 4 Mbps. Initial JS < 400 KB gzipped. Heavy libs (Three.js, chart lib) code-split and lazy-loaded. |
| **NFR-G2** | Last-known state persists client-side and renders before the network responds. No page ever shows an empty panel where a stale state exists — it shows the stale state, degraded and labelled. |
| **NFR-G3** | Every displayed value carries a provenance class. A missing class is a build failure, never a silent default to LIVE. |
| **NFR-G4** | Every state transition appends `{prev_hash, payload, actor, timestamp, hash}` to a SHA-256 chain, verifiable client-side. A break surfaces a persistent banner app-wide. Call it tamper-evident, never "blockchain". |
| **NFR-G5** | Text contrast ≥ 4.5:1 (≥ 3:1 at 24px+). Status never colour-alone. Targets ≥ 40px. Full keyboard operability, visible 2px `--ok-soft` focus ring. `prefers-reduced-motion` respected. |
| **NFR-G6** | Malformed or missing data renders `—` with an `UNKNOWN` badge. Never `0`, never blank. |
| **NFR-G7** | Ages computed from station-stamped time; clock skew detected and surfaced. All display times IST. |
| **NFR-G8** | Schema-additive: a station may report zones, assets or resources never seen before without breaking the UI. |
| **NFR-G9** | JWT-shaped auth, roles `hq_operator` / `station_operator` / `compliance` / `readonly`. Write actions gated by role. **Frontend-only build:** the JWT is issued and verified client-side and role-gating is UI-level only — see the frontend-only scope note above. |
| **NFR-G10** | Poll refresh (default 60 s, configurable) must not shift layout (CLS ≈ 0) or lose selection/scroll position. |

---

## 12. Folder structure

```
src/
  main.tsx  App.tsx  router.tsx
  styles/       tokens.css  globals.css
  components/
    shell/      AppShell  NavBar  PageHeader  CommandPalette
    shared/     ProvenanceBadge  SyncPill  StatusDot  TierChip  ActionCard
                StatTile  MetricRow  ProgressBar  ResourceRow  ZoneCell
                CausalTrace  Sparkline  TimeSeriesChart  DegradableSurface
                EmptyState  Drawer  Modal  Popover
    viz/        AntarcticaMap  IsoStationModel  ZoneGrid  DiffPanel
  pages/
    Overview/  Twin/  Actions/  Logistics/  Environment/  Comms/
    StationConsole/  Compliance/  Sandbox/  Assets/  Handover/  Settings/
  engine/       coupling.ts  autonomy.ts  lsod.ts  priority.ts  similarity.ts
  adapters/     environment  fuel  generator  inventory  maintenance  logistics
  state/        stationScope  selection  mode  outbox  auth  connectivity
  lib/          hashChain.ts  provenance.ts  freshness.ts  time.ts  localStore.ts
  types/        measurement.ts  station.ts  action.ts  resource.ts
  mock/         bharati.json  maitri.json  scenarios/  environment-snapshot/
```

**Frontend-only build additions** (see the scope note after "How to use this document"):
- `state/connectivity.ts` — the dev-only LIVE/LAGGING/DARK toggle that stands in for a real network condition, and the sync-simulation function that drains the outbox between the station-side and HQ-side local stores.
- `lib/localStore.ts` — a thin `localStorage` wrapper simulating both "local SQLite" (station) and persistent HQ state, namespaced separately per store.
- `mock/` is the **primary** data source for this build, not a fallback — including `environment-snapshot/`, the one-time pull from the real public sources in §10, refreshed manually rather than fetched live.

---
---

-e 
---

# PART II — YOUR PAGES

-e 
## PAGE 1 OF 10 (your page 1 of 6) — HQ Overview

## PAGE 1 — HQ Overview

**Route:** `/` · **Nav tab:** Overview

### 1.1 Purpose

The landing screen for an HQ operator. It answers five questions **in this priority order**:

1. What needs attention right now?
2. Can each station sustain itself until the next resupply?
3. What is the state of both stations across the four domains?
4. Can I trust each number on screen?
5. What happened while a station was disconnected?

**Critical design principle:** actions come first, readings second. The top-left region — the position the eye reads first — is the action list, not a temperature gauge. Every other team will lead with a big temperature readout because it is the number they actually have.

### 1.2 Layout (1440 × 900)

```
┌────────────────────────────────────────────────────────────────────────┐
│ NAV BAR                                                    h 52        │
├────────────────────────────────────────────────────────────────────────┤
│ TITLE ROW  "HQ Overview" + search + clock + icon buttons   h 40        │
├──────────────┬──────────────────────────────┬──────────────────────────┤
│ LEFT  w 320  │ CENTRE  flex                 │ RIGHT  w 342             │
│              │                              │                          │
│ Station      │ Antarctica map       h 314   │ Station zones panel      │
│ comparator   │                              │  · light-cone container  │
│ (BHR ⇄ MTR)  │                              │  · 3×2 zone grid         │
│ ──────────── ├──────────────────────────────┤  · legend                │
│ Needs        │ Resource watch table  flex   │ Environment stat trio    │
│ attention    │                              │ Selection summary        │
│ (flex)       │                              │ CTA → Open 3D twin       │
└──────────────┴──────────────────────────────┴──────────────────────────┘
```

**Responsive:** below 1280px the right column drops beneath the centre. Below 900px single column in order: Needs attention → Station comparator → Map → Zones → Resource watch. **Never hide the action list.**

### 1.3 Functional requirements

#### FR-1 Navigation bar

| ID | Requirement |
|---|---|
| FR-1.1 | Logo mark (mint snowflake SVG) + wordmark "Antarasetu". |
| FR-1.2 | Pill tabs: **Overview** (active), Stations, Logistics, Compliance, Sandbox. |
| FR-1.3 | Circular icon buttons: search, alerts. Alerts carries an orange dot badge when ≥1 unacknowledged T0/T1 action exists on either station. |
| FR-1.4 | User chip: initials avatar, handle mono 8.5px, display name 11.5px, chevron. |
| FR-1.5 | The nav renders identically on every page, with the correct tab active. |

#### FR-2 Title row

| ID | Requirement |
|---|---|
| FR-2.1 | Page title "HQ Overview". |
| FR-2.2 | Global search, placeholder "Search assets, actions, records", with a `⌘ Space` hint chip. Searches assets, actions, resources and compliance records of both stations. |
| FR-2.3 | HQ clock, mono, `19 SEP 2026 · 14:22 IST`, updating every minute. |
| FR-2.4 | Filter button (station, tier, domain) and Reports button. |

#### FR-3 Station comparator (left, top)

The most important structural decision on the page: both stations in one card, symmetrically.

| ID | Requirement |
|---|---|
| FR-3.1 | Two station codes side by side — `BHR` (primary) and `MTR` (comparison) — display 32px 600, full name beneath each. |
| FR-3.2 | A circular swap button between them. Clicking makes the other station primary; every other panel re-scopes. |
| FR-3.3 | Two split stat rows separated by a 1px vertical rule: **LAST SYNC** (coloured by sync state) and **CREW · OPEN** (crew count · open action count). |
| FR-3.4 | Primary button "Station brief (n)" — generates the crew-handover / shift-brief package for the primary station. |
| FR-3.5 | The inactive station's values render at `--text-3`, never hidden. Comparison is always visible. |

#### FR-4 Needs attention (left, bottom)

| ID | Requirement |
|---|---|
| FR-4.1 | Card title "Needs attention" + "View all" link to `/actions`. |
| FR-4.2 | Top 3 open actions **across both stations**, sorted by tier desc → time-to-LSOD asc → age desc. |
| FR-4.3 | Each card: tier chip, station + age/deadline in mono, status dot, title, sub-status line, ACK button. |
| FR-4.4 | Card border encodes urgency: T0/T1 unacked → `rgba(242,107,33,0.30)`; everything else → `--line`. |
| FR-4.5 | **ACK** writes an acknowledgement event (actor, timestamp), moves to ASSIGNED-pending, appends to the audit chain. Disabled with tooltip once acked. |
| FR-4.6 | Footer strip: "n DEFERRED", "n RESOLVED", "FULL LOG →". |

#### FR-5 Antarctica map (centre, top)

| ID | Requirement |
|---|---|
| FR-5.1 | Stylised dark map of Antarctica. **Inline SVG only** — continent outline, graticule, three concentric ellipses. No tile-server, no Leaflet, no Mapbox. |
| FR-5.2 | Two markers at approximate real positions: **Bharati** (Larsemann Hills, Prydz Bay — east) and **Maitri** (Schirmacher Oasis, Queen Maud Land — north-west of centre). Each = a coloured core disc in a low-alpha halo, ringed with the panel background. |
| FR-5.3 | Marker colour = the station's worst active state: mint nominal, amber watch/lagging, orange open T0/T1. |
| FR-5.4 | Dashed link path from each station to an "NCPOR GOA" node off-continent, top right. Path colour = that station's sync state. A DARK station's path renders at 25% alpha. |
| FR-5.5 | A floating chip near each marker: station name, sync state, age, warning count. LAGGING/DARK chips use a **dashed** border. |
| FR-5.6 | Bottom strip: "RECORDS PENDING — n queued · n <station>", a segmented priority bar (T0 mint / T1 orange / T2 amber, widths proportional to queue depth), and a live status word ("Draining T1", "Idle", "Link down"). |
| FR-5.7 | Clicking a marker or chip sets that station as primary. |

#### FR-6 Resource watch table (centre, bottom)

| ID | Requirement |
|---|---|
| FR-6.1 | Title "Resource watch", caption "RANKED BY LAST SAFE ORDER DATE". |
| FR-6.2 | Columns: RESOURCE (dot + name) · STATION · AUTONOMY (`214 ±18 d`) · MARGIN TO SHIP (bar) · LSOD (right-aligned). |
| FR-6.3 | Rows from **both stations**, sorted by LSOD ascending. A Maitri row must be able to outrank a Bharati row. |
| FR-6.4 | Autonomy **always** renders with its uncertainty band. A point estimate is a spec violation. |
| FR-6.5 | LSOD cell colour: `--act-soft` ≤ 14 d, `--watch-soft` ≤ 45 d, `--text-3` otherwise. |
| FR-6.6 | Rows of a LAGGING/DARK station render at 62% opacity and their LSOD cell reads `stale` — a stale input must never produce a confident deadline. |
| FR-6.7 | Clicking a row routes to `/logistics` scoped to that resource. |

#### FR-7 Station zones panel (right)

| ID | Requirement |
|---|---|
| FR-7.1 | Container with the signature light-cone treatment (§5) and a floating station-name chip at the top of the cone. |
| FR-7.2 | A 3 × 2 grid of zone cells for the primary station: A1 Power, A2 Fuel, A3 Comms, B1 Living, B2 Labs, B3 Storage. Each: zone code (mono 9px), name (11px), one-value summary (mono 9px). |
| FR-7.3 | Cell styling — nominal: `--panel-alt` + `--line`; watch: amber tint + amber border; warning: orange tint + orange border, name in 600. |
| FR-7.4 | Clicking a cell selects that zone and updates the Selection summary. |
| FR-7.5 | Legend row: "n nominal / n low / n warning" with square swatches. |
| FR-7.6 | Zone set is data-driven per station; the grid must adapt to 4–9 cells without breakage. |

#### FR-8 Environment stat trio (right)

| ID | Requirement |
|---|---|
| FR-8.1 | Three equal stat cards: AMBIENT (°C), WIND (kt), LOAD (kW). |
| FR-8.2 | Ambient and wind are `LIVE` (mint); load is `SYNTH` (grey dashed). |
| FR-8.3 | Values in display 20px 600. |

#### FR-9 Selection summary + CTA (right, bottom)

| ID | Requirement |
|---|---|
| FR-9.1 | Shows the selected zone and its computed autonomy impact (`214 → 198 d`) in `--act-soft` when negative. |
| FR-9.2 | CTA: white pill containing "Open 3D twin" and an orange pill button carrying the primary station's name plus an arrow. Navigates to the twin with station and selected zone pre-loaded. |

#### FR-10 Provenance, FR-11 Sync freshness, FR-12 Outbox

Implemented per §7.1, §7.2 and §9. Page-specific notes:

| ID | Requirement |
|---|---|
| FR-12.1 | The map footer strip is the HQ-side view of both station outboxes. |
| FR-12.2 | On reconnect, records drain strictly in tier order T0 → T1 → T2 → T3. |
| FR-12.3 | Records arriving out of order must not reorder the queue display. |

#### FR-13 Keyboard

| ID | Requirement |
|---|---|
| FR-13.1 | `⌘/Ctrl + Space` focuses global search. |
| FR-13.2 | Tab order follows visual order: nav → title → left → centre → right. |
| FR-13.3 | Every interactive element is a real `<button>`, `<a href>` or `<input>` + `<label>`. No handlers on `div`/`span`. |
| FR-13.4 | Icon-only buttons carry `aria-label`. |
| FR-13.5 | Auto-refresh on a 60 s poll without losing selection or scroll. |

### 1.4 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-1.1 | No map tile library and no 3D library on this page. |
| NFR-1.2 | The page renders a usable skeleton from cached last-known state when the dev connectivity toggle is set to DARK (frontend-only build — see scope note), with every panel marked DARK. |
| NFR-1.3 | Actions taken while the HQ client is offline queue locally and replay on reconnect, with optimistic UI and a "pending sync" marker. |
| NFR-1.4 | Plus all global NFRs G1–G10. |

### 1.5 Data contracts

```ts
interface Resource {
  id: string; name: string; stationId: string;
  stock: Measurement;
  burnRate: Measurement;              // units per day
  autonomyDays: number;
  autonomyBandDays: number;           // MANDATORY
  shipWindow: { earliestDay: number; latestDay: number };
  marginDays: { min: number; max: number };
  lsodDays: number | null;            // null when inputs are stale
  risk: 'ok'|'watch'|'warning'|'critical';
  provenance: Provenance;
}

interface Action {
  id: string; stationId: string; zoneCode?: string; assetId?: string;
  tier: 'T0'|'T1'|'T2'|'T3';
  title: string; reason: string;
  state: 'RAISED'|'ACKNOWLEDGED'|'ASSIGNED'|'IN_PROGRESS'|'RESOLVED'|'DEFERRED';
  assignee?: string;
  raisedAt: string; ageSeconds: number;
  linkedLsodDays?: number;
  auditHash: string;
}
```

### 1.6 Acceptance criteria

- [ ] An operator can name the single most urgent thing in under 5 seconds without scrolling.
- [ ] Both stations' sync state is visible simultaneously; a LAGGING station is degraded without being hidden.
- [ ] Every number has a provenance badge; hovering any badge explains where it came from.
- [ ] A resource whose LSOD has passed appears above one with more days of stock.
- [ ] Setting Maitri as primary re-scopes zones, environment trio and CTA without a page reload.
- [ ] Flipping the dev connectivity toggle to DARK still renders the last-known state, labelled DARK, with no empty panels.
- [ ] In greyscale, every status is readable from its label.
- [ ] No orange pixel refers to anything other than "act on this".

---

-e 
---

## PAGE 3 OF 10 (your page 2 of 6) — Action Centre

## PAGE 3 — Action Centre

**Route:** `/actions` · detail drawer `/actions/:actionId` · **Nav tab:** Overview (secondary)

### 3.1 Purpose

The page that makes Antarasetu a **management** platform rather than a monitoring one. The full working surface for **Observe → Understand → Decide → Act → Record**.

**Design principle:** an action is never just a status. It always carries *what changed*, *why it matters*, *who owns it*, and *what happens if nobody acts*.

### 3.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Action Centre │ [All|Bharati|Maitri] │ search │ counts │ filters   │
├───────────────────────────┬────────────────────────────────────────┤
│ TIER RAIL (left 180)      │  ACTION TABLE / BOARD (flex)           │
│  T0 Life safety      0    │  ┌──────────────────────────────────┐  │
│  T1 Critical ops     3    │  │ action row                       │  │
│  T2 Logistics/recs   7    │  ├──────────────────────────────────┤  │
│  T3 Bulk science     2    │  │ action row                       │  │
│  ──────────────           │  └──────────────────────────────────┘  │
│  STATE filters            │                                        │
│  SLA BREACH        1      │                                        │
└───────────────────────────┴────────────────────────────────────────┘
        ↑ row click → ACTION DETAIL DRAWER (right, 480)
```

**Responsive:** below 1100px the tier rail becomes a horizontal chip row. Below 800px the table becomes stacked cards and the drawer goes full-screen.

### 3.3 Functional requirements

| ID | Requirement |
|---|---|
| **FR-1.1** | Title "Action Centre". |
| FR-1.2 | Station scope **All** (default) / Bharati / Maitri — a cross-station page; both visible by default. |
| FR-1.3 | Inline search by title, asset, zone, assignee. |
| FR-1.4 | Summary counts in mono: `n OPEN · n UNACKED · n BREACHING SLA`. Unacked T0/T1 in `--act-soft`. |
| FR-1.5 | Filter button (domain, trigger provenance, date range) and a view toggle: **Table** (default) / **Board**. |
| **FR-2.1** | Tier rail with live counts: T0 life safety/medical, T1 critical ops/power/fuel, T2 logistics/compliance/records, T3 bulk science. |
| FR-2.2 | Tier rows are toggle filters; multiple may be active. Active = tinted bg + tier-coloured border. |
| FR-2.3 | T0 is distinguished from T1 by a **filled square marker**, not only by colour. |
| FR-2.4 | A STATE filter group: Raised, Acknowledged, Assigned, In progress, Resolved, Deferred. |
| FR-2.5 | An SLA BREACH counter; clicking filters to breaching actions. |
| **FR-3.1** | Table columns: status dot · tier chip · title · station · zone/asset · state · age · owner · **consequence** · row actions. |
| FR-3.2 | **The consequence column is mandatory** and is what distinguishes this from a ticket list. It shows the operational cost of inaction from the coupling engine — `autonomy −16 d`, `LSOD in 12 d`, `compliance overdue 3 d`. Empty only when the engine genuinely produces none. |
| FR-3.3 | Default sort: tier desc → time-to-LSOD asc → age desc. Headers sortable. |
| FR-3.4 | LAGGING/DARK station rows render through `<DegradableSurface>`; age reads "as of last sync". |
| FR-3.5 | Row actions: **ACK** (when RAISED), **ASSIGN**, **DEFER**, **RESOLVE** — role-gated per NFR-G9. |
| FR-3.6 | Bulk ACK and bulk assign permitted; **bulk resolve is not** — a resolution needs per-action evidence. |
| FR-3.7 | Clicking elsewhere in the row opens the detail drawer. |
| **FR-4.1** | Board view: six columns matching the state machine. |
| FR-4.2 | Cards use `<ActionCard variant="board">` — tier chip, title, station, consequence, owner, age. |
| FR-4.3 | Drag between columns performs the transition and writes to the audit chain. Illegal transitions rejected with an inline reason. |
| **FR-5.1** | Detail drawer opens at 480px; URL becomes `/actions/:actionId` — linkable, back-button friendly. |
| FR-5.2 | Header: tier chip, title, state chip, station → zone → asset breadcrumb. |
| FR-5.3 | **Trigger block** — what raised this: metric, value, threshold, and its `<ProvenanceBadge>`. An action triggered by a SYNTH metric must say so. |
| FR-5.4 | **`<CausalTrace>`** — the same chain as the twin page, showing why this matters and its autonomy/LSOD consequence. Shared engine, never hard-coded. |
| FR-5.5 | **Timeline** — every transition with actor, timestamp, note and audit hash (truncated, expandable). Offline entries show a "pending sync" marker. |
| FR-5.6 | **Evidence** — photos, readings, notes. Station-side attachments appear once the outbox drains. |
| FR-5.7 | **Similar past faults** — up to 3, TF-IDF over the platform's own records, each with score and resolution. Badged `SYNTH` while history is synthetic. |
| FR-5.8 | Footer bar: **Defer** · **Assign** · **Acknowledge / Resolve** (primary, orange). |
| **FR-6.1** | State machine: `RAISED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED`; `DEFERRED` from any pre-resolved state; `RESOLVED` is terminal. |
| FR-6.2 | Acknowledge records actor + timestamp. |
| FR-6.3 | Assign requires a role or named person from the station roster. |
| FR-6.4 | **Defer requires a reason AND a review date.** Rejected without both. |
| FR-6.5 | Resolve requires a resolution note and ≥1 evidence item for T0/T1. |
| FR-6.6 | Every transition appends to the hash chain. |
| FR-6.7 | Offline transitions queue with optimistic UI and replay in tier order. |
| FR-6.8 | **Conflict resolution:** if HQ and station both transitioned while disconnected, the higher-tier actor wins and the losing entry is preserved in the timeline as **superseded** — never deleted. |
| **FR-7.1** | Per-tier acknowledgement SLA, configurable. Defaults: T0 15 min, T1 2 h, T2 24 h, T3 7 d. |
| FR-7.2 | A breaching action shows an orange SLA chip with elapsed-over time. |
| FR-7.3 | **SLA clocks pause while the station is DARK** and resume on reconnect — a station cannot breach an SLA it could not be told about. The pause is visible in the timeline. |

### 3.4 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-3.1 | Renders 500 actions without lag; window rows above 200. |
| NFR-3.2 | Drawer opens in < 50 ms — detail pre-fetched with the list payload. |
| NFR-3.3 | An action with no traceable trigger renders with an `UNKNOWN` badge and a warning, never silently. |
| NFR-3.4 | Optimistic transitions are visually distinguishable from confirmed ones until the server acknowledges. |
| NFR-3.5 | The hash chain is verified on load; a break disables bulk operations and shows a banner. |
| NFR-3.6 | Keyboard: `j/k` move selection, `a` acknowledge, `Enter` open, `Esc` close — all also reachable by Tab + Space. |
| NFR-3.7 | Plus all global NFRs G1–G10. |

### 3.5 Data contract

```ts
interface Action {
  id: string;
  stationId: 'bharati' | 'maitri';
  zoneCode?: string; assetId?: string;
  tier: 'T0' | 'T1' | 'T2' | 'T3';
  title: string; reason: string;
  state: 'RAISED'|'ACKNOWLEDGED'|'ASSIGNED'|'IN_PROGRESS'|'RESOLVED'|'DEFERRED';
  trigger: {
    metricName: string;
    measurement: Measurement;          // carries its own provenance
    threshold?: { value: number; unit: string; label: string };
  };
  consequence?: {
    kind: 'autonomy' | 'lsod' | 'compliance' | 'safety';
    before: number; after: number; unit: string;
    label: string;                     // "autonomy −16 d"
  };
  assignee?: { id: string; name: string; role: string };
  deferral?: { reason: string; reviewDate: string };
  resolution?: { note: string; at: string; by: string };
  evidence: { id: string; kind: 'photo'|'reading'|'note'|'file'; label: string;
              at: string; pendingSync: boolean }[];
  timeline: { state: string; at: string; by: string; note?: string;
              hash: string; prevHash: string; pendingSync: boolean; superseded?: boolean }[];
  sla: { targetSeconds: number; elapsedSeconds: number; pausedSeconds: number; breached: boolean };
  raisedAt: string; ageSeconds: number;
  similar?: { actionId: string; title: string; score: number;
              resolution: string; provenance: Provenance }[];
}
```

### 3.6 Acceptance criteria

- [ ] With scope All, a Maitri T1 outranks a Bharati T2.
- [ ] Every row shows a consequence, or is provably one the engine cannot compute.
- [ ] An action triggered by a SYNTH metric says so on the trigger badge.
- [ ] Deferring without a reason and review date is rejected inline.
- [ ] Offline transitions show as pending and replay in tier order.
- [ ] An SLA clock visibly pauses while its station is DARK.
- [ ] The drawer's causal trace matches the twin page's for the same asset.

### 3.7 Out of scope

No AI triage, auto-assignment or severity prediction. No email/SMS gateway. Priority is rule-based and inspectable.

---

-e 
---

## PAGE 6 OF 10 (your page 3 of 6) — Sync, Comms & Station Console

## PAGE 6 — Sync, Comms & Station Console

**Routes:** `/comms` (HQ side) · `/station` (station edge, offline-first) · **Nav tab:** Overview (secondary)

### 6.1 Purpose

The **Antarctic-specific** part of Antarasetu and the hardest thing for any competing team to build. Two sides of one story:

- **`/comms`** — What is each station's link state, what did we miss, what is queued, in what order will it arrive?
- **`/station`** — A local-first console keeping the station operating with **no link at all**, recording faults, actions, inventory changes and records into a local store and outbox.

**This is the demo.** Beats 4–6 run entirely on these two routes.

### 6.2 Layout — `/comms`

```
┌────────────────────────────────────────────────────────────────────┐
│ Sync & Comms │ [Both|BHR|MTR] │ live clock │ simulate outage ▸     │
├──────────────────────────────┬─────────────────────────────────────┤
│ LINK STATE (per station)     │  OUTBOX / QUEUE (w 420)             │
│  · big sync pill + age       │   · tier bars T0–T3                 │
│  · link timeline strip       │   · drain order list                │
│  · uptime %                  │   · currently transferring          │
├──────────────────────────────┤   · throughput                      │
│ WHAT WE MISSED (flex)        ├─────────────────────────────────────┤
│  · reconstructed event log   │  RECONCILIATION                     │
│  · gap ranges                │   · conflicts awaiting resolution   │
└──────────────────────────────┴─────────────────────────────────────┘
```

### 6.3 Layout — `/station`

```
┌────────────────────────────────────────────────────────────────────┐
│ STATION CONSOLE · BHARATI       ⚠ LINK DOWN 4h 12m   [outbox 23]   │
├──────────────────────────────┬─────────────────────────────────────┤
│ QUICK ACTIONS (left 300)     │  LOCAL STATE (flex)                 │
│  · Log fault                 │   · zone status grid                │
│  · Record action             │   · resources                       │
│  · Inventory change          │   · open local actions              │
│  · Compliance record         ├─────────────────────────────────────┤
│  · Attach evidence           │  LOCAL OUTBOX (w 380)               │
│ AUTONOMY (local compute)     │   · queued records by tier          │
└──────────────────────────────┴─────────────────────────────────────┘
```

The station console models a local edge service and must be fully usable with the WAN interface physically down. **Frontend-only build:** the "local edge service" is a `localStorage`-backed store within the same app (namespaced separately from the HQ-side store), not a real FastAPI + SQLite process — see the frontend-only scope note above. The intended production architecture is FastAPI + SQLite at the station edge; say so if asked. It uses a **reduced shell** — no HQ nav tabs.

### 6.4 Functional requirements — `/comms`

| ID | Requirement |
|---|---|
| **FR-1.1** | One card per station: large `<SyncPill>`, last successful sync, age in mono, state word. |
| FR-1.2 | **Link timeline strip** — a horizontal 24 h / 7 d band where each interval is coloured by link state. Gaps obvious at a glance. |
| FR-1.3 | Uptime percentage over the range, plus the longest single gap. |
| FR-1.4 | Next expected contact window when configured (satellite pass schedules are `SYNTH`). |
| FR-1.5 | A **Simulate outage** control (demo affordance, role-gated, clearly labelled) driving the station LAGGING → DARK for a scripted scenario. It writes **only** to the demo scenario store, never the real record. |
| **FR-2.1** | Four tier rows — T0 / T1 / T2 / T3 — each with queued count, sent count, progress bar. |
| FR-2.2 | Tier colours: T0 mint when clear / **orange when queued** (life safety queued is an alarm), T1 orange, T2 amber, T3 grey. Always labelled. |
| FR-2.3 | **Drain order list** showing the next N records in exact transfer order with tier chip, type, size, station. |
| FR-2.4 | A **currently transferring** row with live progress when a drain is in flight. |
| FR-2.5 | Throughput and estimated time-to-clear, both `SYNTH` and labelled — we do not know NCPOR's real link budget. |
| FR-2.6 | **Strict tier ordering:** no T2 transfers while any T1 remains. A late higher-tier record jumps the queue and the list visibly reorders. |
| FR-2.7 | Failed transfers retry with backoff; after N failures they surface as a T2 action. |
| **FR-3.1** | After a gap closes, reconstruct the station's event log for the dark period from drained records, in station-timestamp order. |
| FR-3.2 | Each entry: station time, HQ receipt time, tier, type, summary, `pending`/`reconciled` marker. |
| FR-3.3 | Gap ranges with **no** records are shown explicitly as "no records — station reported nothing in this window", which differs from "we have no data". |
| FR-3.4 | Summary line: `n records recovered across a 31 h 40 m gap · n actions · n faults · n inventory changes`. |
| FR-3.5 | Entries click through to their source object. |
| **FR-4.1** | Reconciliation lists conflicts where HQ and station both modified the same object while disconnected. |
| FR-4.2 | Each conflict shows both versions side by side with actor, timestamp and differing fields. |
| FR-4.3 | Default rule: higher-tier actor wins; ties resolve to the station (closer to ground truth). **The rule is stated on screen.** |
| FR-4.4 | The losing version is **preserved as superseded**, never deleted. |
| FR-4.5 | An operator may override; the override is recorded with a reason and appended to the chain. |

### 6.5 Functional requirements — `/station`

| ID | Requirement |
|---|---|
| **FR-5.1** | Reduced shell: station name, local time, link banner, outbox counter. |
| FR-5.2 | Permanent link banner stating state plainly: `LINK UP · synced 4 min ago` (mint) / `LINK DOWN 4h 12m · working locally` (amber) / `LINK DOWN 31h 40m · 23 records queued` (orange). |
| FR-5.3 | **Nothing on this console blocks on the network.** A spinner waiting on a server is a spec violation. |
| **FR-6.1** | Large touch-friendly buttons (**≥ 56px** — the operator may be wearing gloves): Log fault · Record action · Inventory change · Compliance record · Attach evidence. |
| FR-6.2 | Each opens a short form completable in under 30 seconds, working with no network. |
| FR-6.3 | **Log fault** captures asset (local picker), severity → tier, description, optional photo. Creates a local action at the mapped tier. |
| FR-6.4 | **Inventory change** captures resource, delta, reason, and **immediately recomputes local autonomy** so the station sees the consequence of its own entry. |
| FR-6.5 | On submit: write to the local store (`localStorage`, simulating local SQLite — see scope note), append to the local hash chain, enqueue in the outbox at its tier. Confirmation shows tier and queue position. |
| FR-6.6 | Photos/files stored locally and queued as T2/T3 attachments, never blocking the parent record. |
| **FR-7.1** | Zone grid, resources and local actions render from the local store using the **same coupling engine module** as HQ. |
| FR-7.2 | Local autonomy must match what HQ computes once synced — one engine, two hosts. |
| FR-7.3 | Locally entered values show as `LIVE` from the station's perspective; the console shows the station-side class. |
| **FR-8.1** | Local outbox lists queued records by tier with type, time, size, and remove/edit for untransferred records. |
| FR-8.2 | Shows total queued size and live drain progress when the link is up. |
| FR-8.3 | An operator may **promote** a record's tier with a reason (recorded). **Demotion is not permitted.** |
| FR-8.4 | On reconnect, drain is automatic, strictly tier-ordered, resumable after interruption, and **idempotent** — a partially transferred batch must not duplicate on retry. |

### 6.6 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-6.1 | `/station` loads and is fully interactive with the network down, from the local service only. Cold start < 2 s. |
| NFR-6.2 | Local writes are durable **before** the UI confirms — write to the local store (`localStorage`, simulating SQLite), then confirm, never the reverse. |
| NFR-6.3 | Sync is idempotent and resumable. Every record carries a client-generated UUID; the sync simulation function (frontend-only build — see scope note) deduplicates on it. |
| NFR-6.4 | Local and HQ hash chains reconcile into one verifiable chain per object after sync. |
| NFR-6.5 | Clock skew measured on each sync and surfaced; ordering uses station-stamped time. |
| NFR-6.6 | Tier ordering enforced in the sync simulation function as well as the station-side UI (frontend-only build — both are client-side here, but keep them as two independent checks so the logic mirrors a real client/server split). |
| NFR-6.7 | The outage simulation writes only to the demo scenario store and is impossible to confuse with real data. |
| NFR-6.8 | `/station` targets ≥ 56px for primary controls, usable at 1024×768 on a low-spec machine. |
| NFR-6.9 | Plus all global NFRs G1–G10. |

### 6.7 Data contracts & drain algorithm

```ts
type Tier = 'T0' | 'T1' | 'T2' | 'T3';

interface SyncRecord {
  id: string;                    // client-generated UUID, dedupe key
  stationId: 'bharati' | 'maitri';
  tier: Tier;
  type: 'action'|'fault'|'inventory'|'compliance'|'measurement'|'attachment'|'handover';
  payloadRef: string; sizeBytes: number;
  createdAtStation: string;      // station-stamped
  enqueuedAt: string;
  state: 'QUEUED'|'TRANSFERRING'|'SENT'|'FAILED'|'SUPERSEDED';
  attempts: number; lastError?: string;
  promotedFrom?: Tier; promotionReason?: string;
  hash: string; prevHash: string;
}

interface CommunicationEvent {
  stationId: string;
  state: 'LIVE' | 'LAGGING' | 'DARK';
  from: string; to?: string; durationSeconds: number;
  recordsRecovered?: number;
  cause?: string;                // MODELED or SYNTH — never asserted as fact
}

interface Conflict {
  objectType: 'action' | 'resource' | 'record';
  objectId: string;
  hqVersion:      { actor: string; at: string; fields: Record<string, unknown> };
  stationVersion: { actor: string; at: string; fields: Record<string, unknown> };
  differingFields: string[];
  defaultResolution: 'hq' | 'station';
  resolvedAs?: 'hq' | 'station';
  overrideReason?: string;
}
```

```
while (link.up && queue.nonEmpty):
    tier  = lowest tier index with any QUEUED record   // T0 before T1 before T2 before T3
    batch = take(queue[tier], batchSize)
    transfer(batch)                                     // resumable, idempotent by UUID
    on success: mark SENT, append to HQ chain
    on failure: attempts++, exponential backoff, re-queue at same tier
    if attempts > N: raise T2 action "sync failure"
    re-evaluate tier each loop — a new T0 pre-empts an in-flight T2 batch boundary
```

### 6.8 Acceptance criteria

- [ ] `/station` is fully usable with the network disabled in devtools — every form submits and confirms.
- [ ] A record logged offline appears in the outbox with its tier and survives a page reload.
- [ ] On reconnect, a T1 record always transfers before a T2 queued earlier.
- [ ] Interrupting a drain mid-batch and resuming produces no duplicates.
- [ ] "What we missed" distinguishes "no records in this window" from "no data available".
- [ ] A conflict shows both versions, applies the stated rule, and preserves the loser as superseded.
- [ ] Local autonomy equals HQ autonomy for the same inputs after sync.
- [ ] The outage simulation cannot be mistaken for real data at any point.

### 6.9 Out of scope

No real satellite modem integration, no claims about NCPOR's actual bandwidth or pass schedules, no peer-to-peer mesh.

---

-e 
---

## PAGE 4 OF 10 (your page 4 of 6) — Logistics & Resupply

## PAGE 4 — Logistics & Resupply

**Route:** `/logistics` · manifest builder `/logistics/manifest/:id` · **Nav tab:** Logistics

### 4.1 Purpose

> **"Can each station sustain itself until the next feasible resupply, and if not, what do we load first?"**

**Cross-station by default** — resupply is a shared constraint. One ship serves both stations in a season.

Three jobs: **Autonomy Horizon** (days remaining, with uncertainty) · **Last Safe Order Date** (when we must act) · **Manifest prioritisation** (what goes on this run).

### 4.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Logistics & Resupply │ [All|BHR|MTR] │ season selector │ counts    │
├──────────────────────────────┬─────────────────────────────────────┤
│  AUTONOMY TIMELINE  h 300    │  MANIFEST BUILDER  w 400            │
│  (horizon bars vs windows)   │   · capacity meter                  │
├──────────────────────────────┤   · ranked item list                │
│  RESOURCE LEDGER  flex       │   · carried / deferred split        │
│  (both stations)             │   · total mass + margin             │
│                              │   · CTA: Generate manifest          │
└──────────────────────────────┴─────────────────────────────────────┘
```

### 4.3 Functional requirements

| ID | Requirement |
|---|---|
| **FR-1.1** | Title "Logistics & Resupply". Scope **All** (default) / BHR / MTR. |
| FR-1.2 | **Season selector** — the Antarctic resupply season is the organising unit, not the calendar month. Shows the active season and next voyage window. |
| FR-1.3 | Counts: `n resources tracked · n below reorder · n LSOD ≤ 14 d`. The last in `--act-soft` when non-zero. |
| **FR-2.1** | Horizontal time axis in days from today, spanning ≥ 365 days. |
| FR-2.2 | One row per critical resource, grouped by station with a label rail. |
| FR-2.3 | Each row: a **depletion bar** from today to projected depletion, plus a lighter **uncertainty band** extending ± the autonomy band. |
| FR-2.4 | **Ship windows** as vertical translucent bands across all rows, labelled with the voyage name. |
| FR-2.5 | **LSOD marker** per row — a vertical tick with a label. Orange with an orange-outlined bar when LSOD has passed. |
| FR-2.6 | Bar colour by risk: mint ok, amber watch, orange warning, orange+hatched critical. |
| FR-2.7 | A LAGGING/DARK station's rows degrade, and the LSOD marker is replaced by a hatched "stale — cannot compute" region. **Never draw a confident deadline from stale inputs.** |
| FR-2.8 | Hover tooltip: stock, burn rate, autonomy ±, margin, LSOD, each with a provenance badge. |
| FR-2.9 | Clicking a row scrolls the ledger to that resource and selects it in the manifest builder. |
| **FR-3.1** | Ledger columns: status dot · resource · station · stock · burn rate/day · autonomy `n ±n d` · margin · LSOD · reorder point · provenance. |
| FR-3.2 | Default sort LSOD ascending across both stations. |
| FR-3.3 | Autonomy must always show its ± band. |
| FR-3.4 | Rows below reorder point get an orange left border and a `REORDER` chip. |
| FR-3.5 | Row action **Raise action** creates a T1/T2 logistics action pre-filled with resource, consequence and LSOD. |
| FR-3.6 | Burn-rate cells show a 12-week sparkline; rising is amber, sharply rising is orange. |
| FR-3.7 | Stock and burn rate are `SYNTH` until a real inventory/fuel feed exists. |
| **FR-4.1** | **Capacity meter** — an input for available cargo capacity (kg) with a low/high range and a consumed bar. Configurable with its source visible; labelled `SYNTH` until confirmed. |
| FR-4.2 | Ranked candidate list scored by the prioritisation algorithm: rank, item, station, mass, urgency score, LSOD, include/exclude toggle. |
| FR-4.3 | The list splits visually into **CARRIED** and **DEFERRED** with a divider showing remaining capacity at the cut. |
| FR-4.4 | Toggling recomputes live; manual overrides carry an override icon so departures from the algorithm are visible. |
| FR-4.5 | Footer: total mass, remaining capacity, and the count of deferred items whose LSOD falls before the **following** voyage — in orange, because those become emergencies. |
| FR-4.6 | **Generate manifest** produces a versioned record, appends to the audit chain, offers CSV/PDF export. |
| FR-4.7 | Supports a mixed-station manifest with per-station subtotals. |
| **FR-5.1** | Voyage panel: name, departure window, per-station arrival window, capacity, status. |
| FR-5.2 | **Editing a voyage window recomputes every LSOD on the page live** — the demo beat showing logistics driving operations. |
| FR-5.3 | Voyage data configurable and badged `SYNTH` / `MODELED`. |

### 4.4 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-4.1 | Timeline renders 40 rows × 365 days at 60 fps; SVG with virtualised rows, not a canvas library. |
| NFR-4.2 | Recomputation after a capacity or window change completes in < 100 ms — the engine is synchronous and pure. |
| NFR-4.3 | All LSOD inputs visible and editable in `/settings`; each value shows its current setting on hover. |
| NFR-4.4 | Manifest generation is idempotent and versioned; regenerating creates a new version. |
| NFR-4.5 | With zero voyages configured, the page shows autonomy only and LSOD reads "no voyage configured", not a number. |
| NFR-4.6 | Plus all global NFRs G1–G10. |

### 4.5 Data contract

```ts
interface Voyage {
  id: string; name: string; season: string;
  departureWindow: { from: string; to: string };
  arrival: { bharati?: { from: string; to: string }; maitri?: { from: string; to: string } };
  capacityKg: { min: number; max: number };
  provenance: Provenance;
  status: 'planned' | 'committed' | 'sailed' | 'completed';
}

interface ManifestItem {
  resourceId: string; stationId: string;
  quantity: number; massKg: number;
  urgency: number; criticality: number; score: number;
  included: boolean; manualOverride: boolean;
}

interface Manifest {
  id: string; voyageId: string; version: number;
  items: ManifestItem[];
  totalMassKg: number; capacityKg: number;
  deferredAtRisk: number;             // items whose LSOD < next voyage
  generatedAt: string; generatedBy: string; auditHash: string;
}
```

### 4.6 Acceptance criteria

- [ ] With scope All, a Maitri resource with a nearer LSOD sorts above a Bharati resource with more stock.
- [ ] Every autonomy figure shows a ± band.
- [ ] Changing a voyage window moves every LSOD marker within 100 ms.
- [ ] A DARK station's resource shows a hatched "cannot compute" region instead of an LSOD marker.
- [ ] Reducing capacity pushes items below the cut and flags any whose LSOD precedes the next voyage.
- [ ] Manual overrides are visually distinct from algorithmic ranking.
- [ ] Every coefficient and lead time is findable and editable in `/settings`.

### 4.7 Out of scope

No route optimisation, no vessel tracking, no shipping-line integration, no ML demand forecasting.

---

-e 
---

## PAGE 7 OF 10 (your page 5 of 6) — Compliance & Audit

## PAGE 7 — Compliance & Audit

**Route:** `/compliance` · **Nav tab:** Compliance

### 7.1 Purpose

Antarctic stations operate under the Environmental Protocol to the Antarctic Treaty and India's own reporting obligations. This page is the **structured operational record** plus the **tamper-evident audit log** that makes every record and action defensible.

**Two framing rules:**
1. This is a **supporting capability**, not the core of the PS. Complete and credible, but it must not out-shout the twin, the action centre or the offline architecture.
2. The mechanism is a **SHA-256 hash chain**. Describe it as *tamper-evident*. **Never call it blockchain** — that invites one follow-up question you cannot win.

### 7.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Compliance & Audit │ [Both|BHR|MTR] │ period │ overdue │ chain chip│
├────────────────────────────────────────────────────────────────────┤
│ TABS:  Obligations │ Waste ledger │ Inspections │ Audit log        │
├────────────────────────────────────────────────────────────────────┤
│  Active tab content (flex)                                         │
│  Obligations   → calendar strip + due list                         │
│  Waste ledger  → mass-balance table + chart                        │
│  Inspections   → checklist records                                 │
│  Audit log     → hash-chain viewer + verifier                      │
├────────────────────────────────────────────────────────────────────┤
│  Record detail drawer (right 460) on row click                     │
└────────────────────────────────────────────────────────────────────┘
```

### 7.3 Functional requirements

| ID | Requirement |
|---|---|
| **FR-1.1** | Title "Compliance & Audit". Scope **Both** (default) / BHR / MTR. |
| FR-1.2 | Period selector: current season, previous season, custom. |
| FR-1.3 | Counts: `n due in 30 d · n overdue · n queued offline`. Overdue in `--act-soft`. |
| FR-1.4 | A chain-integrity chip: `CHAIN VERIFIED` (mint) or `CHAIN BROKEN AT ENTRY n` (orange, persistent, links to the audit tab). |
| **FR-2.1** | Season calendar strip with every obligation as a marker on its due date: mint submitted, amber due soon, orange overdue, grey future. |
| FR-2.2 | Below it, a list: name, station, category, cadence, due date, owner, status chip, last submission. |
| FR-2.3 | Categories (data-driven, not hard-coded): waste return, EIA, inspection report, fuel-handling record, wildlife interaction log, incident report, seasonal operational return. |
| FR-2.4 | An overdue obligation automatically has a T2 action; the row links to it. A missing link is a data-integrity error and is flagged. |
| FR-2.5 | **Submit record** opens the matching record form. |
| FR-2.6 | Obligations whose evidence is queued in a station outbox show `QUEUED OFFLINE`, not `OVERDUE` — the station did its part, the link did not. **This distinction must be visible.** |
| **FR-3.1** | Mass-balance table by waste stream: generated, stored, shipped out, current inventory — per station, per period. |
| FR-3.2 | Streams (configurable): general, recyclable, hazardous, fuel/oily, food, sewage, medical, scientific. |
| FR-3.3 | Stacked bar chart of monthly generation by stream, plus a cumulative stored-mass line. |
| FR-3.4 | A **balance check** row: `generated − shipped = stored`. A mismatch beyond tolerance renders orange and raises a T2 action. **This is the page's most useful integrity feature.** |
| FR-3.5 | Each waste event row: date, stream, mass, container/ID, handler, destination, evidence, provenance. |
| FR-3.6 | Shipped waste links to its voyage in `/logistics`, so removal is traceable to a manifest. |
| FR-3.7 | All masses are `SYNTH` until a real station record feed exists, and must say so. |
| **FR-4.1** | Inspection records: date, type, zone/asset scope, inspector, result, findings count, linked actions. |
| FR-4.2 | A record opens its full checklist with per-item pass/fail/NA and notes. |
| FR-4.3 | Any failed item must link to an action or offer to raise one; a failed item with no action is flagged. |
| FR-4.4 | Templates are data-driven and versioned; a record stores the template version it was completed against. |
| **FR-5.1** | Audit log: every chain entry — timestamp, actor, object type, object id, transition, payload summary, hash (truncated, expandable), previous hash. |
| FR-5.2 | Filters by object type, actor, station, date range, "written offline". |
| FR-5.3 | A **Verify chain** button recomputing every hash client-side, reporting entries verified, first broken link, duration. |
| FR-5.4 | A visual chain strip — each entry a linked block; a break renders as a severed link in orange at the exact position. |
| FR-5.5 | Offline-written entries are marked and show both station time and HQ receipt time. |
| FR-5.6 | Superseded entries from reconciliation are shown greyed, **never hidden** — the log's value is that nothing disappears. |
| FR-5.7 | Export the log as JSON with hashes, for independent verification. |
| FR-5.8 | Label the mechanism **"tamper-evident hash chain (SHA-256)"**. The string "blockchain" must not appear anywhere in the product. |
| **FR-6.1** | Record detail drawer at 460px, URL-addressable. |
| FR-6.2 | Shows the full record, evidence, its chain entry with hash and prev hash, submission state, and the obligation it satisfies. |
| FR-6.3 | Records pending sync show a marker and the station queue position. |
| FR-6.4 | **Download record** exports a single record with its hash and chain position, for an external auditor. |

### 7.4 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-7.1 | Chain verification of 10,000 entries completes in < 2 s in a Web Worker, without blocking the UI. |
| NFR-7.2 | A broken chain surfaces a persistent, non-dismissable banner **across the whole app**, not only on this page. |
| NFR-7.3 | Records are **append-only**. Corrections are new entries referencing the original, never edits. "Amend" must visibly create a new record. |
| NFR-7.4 | Every record carries a provenance class. **An unlabelled compliance figure is the most dangerous kind of fake data in this product.** |
| NFR-7.5 | Exports carry hashes and provenance. Losing either is a spec violation. |
| NFR-7.6 | Role gating: `compliance` submits and exports; `hq_operator` views and raises actions; `readonly` views only. |
| NFR-7.7 | Plus all global NFRs G1–G10. |

### 7.5 Data contracts

```ts
interface Obligation {
  id: string; name: string; category: string;
  stationId: 'bharati' | 'maitri';
  cadence: 'monthly'|'quarterly'|'seasonal'|'annual'|'event-driven';
  dueDate: string; owner: string;
  status: 'future'|'due_soon'|'overdue'|'submitted'|'queued_offline';
  lastSubmissionId?: string; linkedActionId?: string;
  templateId: string; templateVersion: number;
}

interface WasteEvent {
  id: string; stationId: string;
  stream: 'general'|'recyclable'|'hazardous'|'fuel_oily'|'food'|'sewage'|'medical'|'scientific';
  direction: 'generated' | 'shipped';
  massKg: Measurement;              // SYNTH until a real feed exists
  containerId?: string; handler: string; destination?: string;
  voyageId?: string;                // links to /logistics when shipped
  at: string;
  evidence: { id: string; kind: string; label: string }[];
  auditHash: string; pendingSync: boolean;
}

interface AuditEntry {
  seq: number;
  at: string;                       // HQ receipt time
  atStation?: string;               // station-stamped
  actor: string; actorRole: string;
  objectType: string; objectId: string;
  transition: string; payloadSummary: string;
  hash: string; prevHash: string;
  writtenOffline: boolean; superseded: boolean;
}
```

### 7.6 Acceptance criteria

- [ ] A record whose evidence is stuck in a station outbox shows `QUEUED OFFLINE`, not `OVERDUE`.
- [ ] The waste balance check catches a deliberate mismatch and raises a T2 action.
- [ ] Verify chain on a tampered entry reports the exact index; the strip shows the break there.
- [ ] A broken chain shows a banner on every page.
- [ ] Amending creates a new entry and leaves the original visible.
- [ ] A superseded entry from offline reconciliation is greyed but present.
- [ ] Every compliance figure derived from synthetic mass data carries a SYNTH badge.
- [ ] **The string "blockchain" appears nowhere in the UI, the code or any export.**

### 7.7 Out of scope

No submission to a real regulator or NCPOR system. No digital signatures or PKI (the chain is tamper-evident, not non-repudiable — say so honestly if asked). No distributed ledger, no consensus, no smart contracts.

---

-e 
---

## PAGE 10 OF 10 (your page 6 of 6) — Crew Handover, Settings & Auth

## PAGE 10 — Crew Handover, Settings & Auth

**Routes:** `/handover` · `/settings` · `/login`

---

### PART A — Crew Handover (`/handover`)

#### A.1 Purpose

Antarctic crews rotate, and the station's operational memory usually walks out of the door with them. This page generates a **handover capsule**: a structured snapshot assembled automatically from the platform's own records rather than typed from memory into a document.

> **The goal in one line:** the next crew should inherit the station's operational memory instead of rebuilding it manually.

#### A.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Crew Handover │ [BHR|MTR] │ rotation ▾ │ Generate capsule          │
├──────────────────────────────┬─────────────────────────────────────┤
│ CAPSULE PREVIEW (flex)       │  CONTENTS CHECKLIST (w 360)         │
│  1 Station state             │   ☑ Open actions           3       │
│  2 Open actions              │   ☑ Recurring faults       4       │
│  3 Recurring faults          │   ☑ Recent incidents       7       │
│  4 Recent incidents          │   ☑ Resource state         6       │
│  5 Resource & autonomy       │   ☑ Maintenance due        5       │
│  6 Maintenance due           │   ☑ Pending compliance     2       │
│  7 Pending compliance        │   ☑ Comms state            —       │
│  8 Comms & sync state        │   ☑ Outstanding sync      23       │
│  9 Outgoing crew notes       │   ☐ Free-text notes                │
│                              │   Export: PDF · JSON · Markdown    │
└──────────────────────────────┴─────────────────────────────────────┘
```

#### A.3 Functional requirements

| ID | Requirement |
|---|---|
| FR-A1 | Station selector and **rotation selector** (the crew period the capsule covers). Default: current rotation, ending on the configured changeover date. |
| FR-A2 | **Generate capsule** assembles all sections from live platform data. **Nothing is typed twice.** |
| FR-A3 | **§1 Station state** — domain statuses, zone summary, crew count, sync state at generation time. |
| FR-A4 | **§2 Open actions** — every unresolved action with tier, age, owner, consequence, state. **Deferred actions appear with reason and review date** — a deferral the next crew does not know about is the classic handover failure. |
| FR-A5 | **§3 Recurring faults** — faults occurring more than once on the same asset within the rotation, grouped, with occurrence counts and each resolution. Detected by the same TF-IDF similarity as `/assets`. |
| FR-A6 | **§4 Recent incidents** — date, severity, resolution, evidence links. |
| FR-A7 | **§5 Resource & autonomy** — stock, burn rate, autonomy ± band, LSOD, plus which resources cross a threshold during the **incoming** rotation. |
| FR-A8 | **§6 Maintenance due** — services due or overdue next rotation, parts required, whether those parts are on station. |
| FR-A9 | **§7 Pending compliance** — outstanding obligations with due dates, and records still queued offline. |
| FR-A10 | **§8 Comms & sync state** — link uptime over the rotation, longest gap, anything still unsynced. |
| FR-A11 | **§9 Outgoing crew notes** — the **only** free-text section. Rich text plus attachments. |
| FR-A12 | The checklist rail shows each section with item count and an include/exclude toggle. A zero-item section still appears, marked "none" — **an empty section is information**. |
| FR-A13 | A generated capsule is **immutable and versioned**, stamped with generation time, user and an audit hash. Regenerating creates a new version. |
| FR-A14 | Export as PDF, JSON and Markdown, every value keeping its provenance class. |
| FR-A15 | **Acknowledgement flow**: the incoming crew lead marks the capsule received, appending to the audit chain. The capsule then shows both parties. |

#### A.4 NFRs

| ID | Requirement |
|---|---|
| NFR-A1 | Generation completes in < 3 s for a full season of records. |
| NFR-A2 | The capsule generates correctly while the station is DARK, using last-known state, with every stale section marked and the gap stated in §8. |
| NFR-A3 | Exports carry provenance on every value. **A capsule PDF presenting SYNTH figures as fact is the single most damaging possible output of this product.** |
| NFR-A4 | Capsules are append-only; no version is overwritten or deleted. |
| NFR-A5 | Plus all global NFRs G1–G10. |

#### A.5 Data contract

```ts
interface HandoverSnapshot {
  id: string; version: number;
  stationId: 'bharati' | 'maitri';
  rotation: { id: string; from: string; to: string;
              outgoingLead: string; incomingLead?: string };
  generatedAt: string; generatedBy: string;
  syncStateAtGeneration: { state: 'LIVE'|'LAGGING'|'DARK'; lastSyncAt: string };
  sections: {
    key: 'state'|'actions'|'recurring_faults'|'incidents'|'resources'
       |'maintenance'|'compliance'|'comms'|'notes';
    included: boolean; itemCount: number; stale: boolean; items: unknown[];
  }[];
  notes?: { html: string; attachments: { id: string; label: string }[] };
  acknowledgedAt?: string; acknowledgedBy?: string;
  auditHash: string; prevHash: string;
}
```

#### A.6 Acceptance criteria

- [ ] Generating requires no manual data entry except §9.
- [ ] Deferred actions appear with reason and review date.
- [ ] Recurring faults are grouped with occurrence counts, not listed individually.
- [ ] Resources crossing a threshold during the **incoming** rotation are flagged.
- [ ] A capsule generated while DARK marks every stale section and states the gap.
- [ ] Exported PDF carries provenance on every value.
- [ ] Acknowledgement by the incoming lead appends to the audit chain.

---

### PART B — Settings & Parameters (`/settings`)

#### B.1 Purpose

**This page is a credibility feature, not config.**

Most of the numbers driving Antarasetu's most impressive outputs — LSOD, autonomy, risk bands, SLA clocks, sync thresholds — depend on assumptions: procurement lead time, transit duration, generator efficiency, building U-values, degree-day base temperature. **None are confirmed by NCPOR yet.**

Burying them as constants would make every derived number unfalsifiable. Exposing them here — with value, unit, source and provenance — converts the biggest weakness into the honest claim:

> *"The logic is real. The parameters are yours to set."*

#### B.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Settings & Parameters │ [Global|BHR|MTR] │ unsaved changes │ Save  │
├───────────────┬────────────────────────────────────────────────────┤
│ SECTION RAIL  │  PARAMETER GROUPS                                  │
│  Logistics    │   label · value · unit · source · provenance       │
│  Energy       │   default · last changed by · reset                │
│  Thermal      │                                                    │
│  Sync         │                                                    │
│  SLA          │                                                    │
│  Thresholds   │                                                    │
│  Stations     │                                                    │
│  Users        │                                                    │
│  Data sources │                                                    │
└───────────────┴────────────────────────────────────────────────────┘
```

#### B.3 Functional requirements

| ID | Requirement |
|---|---|
| FR-B1 | Scope selector: **Global** or per-station. A station value overrides the global value with an "overridden" marker. |
| FR-B2 | Every row shows: label, editable value, unit, **source**, **provenance badge**, shipped default, last-changed-by + timestamp, reset-to-default. |
| FR-B3 | **Logistics:** procurement lead days, consolidation days, transit days per station, unloading days, cargo capacity range, manifest criticality coefficients, LSOD warning thresholds (14 d / 45 d). |
| FR-B4 | **Energy:** baseline load, generator rated capacity, generator efficiency, renewable mix, burn-rate variance factor. |
| FR-B5 | **Thermal:** degree-day base temperature (default 18 °C), per-zone U-values and areas, wind-chill formula selection (NWS default). |
| FR-B6 | **Sync:** LIVE/LAGGING/DARK thresholds (default 30 min / 12 h), tier definitions, batch size, retry backoff, max attempts before raising a sync action. |
| FR-B7 | **SLA:** per-tier acknowledgement targets (T0 15 min, T1 2 h, T2 24 h, T3 7 d), and whether clocks pause while DARK (default yes). |
| FR-B8 | **Thresholds:** per-asset-category alarm thresholds, resource reorder points, waste balance tolerance. |
| FR-B9 | **Stations:** metadata, zone definitions, crew capacity, coordinates, changeover dates. |
| FR-B10 | **Users:** users and roles. |
| FR-B11 | **Data sources:** read-only mirror of the `/environment` register, with adapter enable/disable and cache TTL. |
| FR-B12 | Changing a parameter shows a **live impact preview**: "this changes LSOD for 4 resources", with before/after deltas, **before saving**. |
| FR-B13 | Saving appends to the audit chain with old value, new value, actor and reason. A parameter change is an operational decision and must be traceable. |
| FR-B14 | Parameters never confirmed by NCPOR carry a `SYNTH` badge and appear in a filterable **"unconfirmed assumptions"** view. A header counter shows `n of m parameters unconfirmed`. |
| FR-B15 | Export the full parameter set as JSON — **the artefact you hand to a chief engineer to validate.** |

#### B.4 NFRs

| ID | Requirement |
|---|---|
| NFR-B1 | **No parameter used anywhere in the coupling engine may be absent from this page. A constant in code not surfaced here is a spec violation.** |
| NFR-B2 | Changes propagate to every open view within one poll cycle without a page reload. |
| NFR-B3 | Impact preview is computed by the same pure engine, not an approximation. |
| NFR-B4 | Write access restricted to `hq_operator`; the Users group to an admin role. |
| NFR-B5 | Invalid values are rejected with the valid range and its source, **never silently clamped**. |
| NFR-B6 | Plus all global NFRs G1–G10. |

#### B.5 Data contract

```ts
interface Parameter {
  key: string;
  group: 'logistics'|'energy'|'thermal'|'sync'|'sla'|'thresholds'|'stations'|'users'|'sources';
  label: string;
  value: number | string | boolean;
  unit?: string;
  default: number | string | boolean;
  min?: number; max?: number;
  scope: 'global' | 'bharati' | 'maitri';
  overriddenFromGlobal: boolean;
  source: string;                    // "assumption — pending NCPOR confirmation"
  provenance: Provenance;            // SYNTH until confirmed
  confirmedBy?: string; confirmedAt?: string;
  lastChangedBy?: string; lastChangedAt?: string;
  usedBy: string[];                  // engine functions that read it
}
```

#### B.6 Acceptance criteria

- [ ] Every constant in `src/engine/` is reachable and editable from this page.
- [ ] Changing transit days shows an impact preview naming the affected resources before save.
- [ ] Saving appends an audit entry with old value, new value and actor.
- [ ] The "unconfirmed assumptions" filter returns exactly the SYNTH-badged parameters, matching the header count.
- [ ] A station override is visibly marked and takes precedence.
- [ ] Exported JSON is complete enough for a domain expert to review without the app.

---

### PART C — Auth (`/login`)

| ID | Requirement |
|---|---|
| FR-C1 | Single centred card on the standard background with its ambient glow. Logo mark, product name, and the line "Digital platform for remote management of Indian Antarctic research stations". |
| FR-C2 | Username + password; JWT issued on success. Role claims decoded client-side **for UI gating only** — authorisation is enforced server-side. |
| FR-C3 | Role selection is not offered at login; roles come from the account. |
| FR-C4 | Failed login shows a generic message; never reveal whether the username exists. |
| FR-C5 | A "station console" link routing to `/station` for station-side operators. |
| FR-C6 | Session expiry warns 5 minutes ahead and offers renewal. **Expiry while offline must not discard queued local records.** |
| FR-C7 | No password reset, no SSO, no registration in this build — accounts are provisioned. Say so on the card rather than showing dead links. |

### Out of scope (all three)

No HR or rostering system, no real crew records, no email delivery of capsules, no SSO/LDAP, no password self-service, no multi-tenant management.

---
---


---

# YOUR INTEGRATION CONTRACTS

Identical to the table in Developer A's spec file — one shared list, not two versions of it.

| Touchpoint | What you expose / consume |
|---|---|
| Twin zone inspector (Dev A) → raise/ACK/assign/defer | You expose `useActionTransitions()`; Developer A calls it, never reimplements the state machine. |
| Action Centre drawer → `CausalTrace` | You consume Developer A's component and engine call read-only. Never compute a local approximation. |
| Overview "View all" / "FULL LOG →" → Action Centre | You own both ends. Query params for tier/station filter pre-fill, e.g. `/actions?station=maitri&tier=T1`. |
| Logistics ledger row → "Raise action" | You pre-fill `{ resourceId, consequence, lsodDays }` and route to `/actions/:id`. |
| Maintenance "Log service" (Dev A) → resource ledger | Developer A writes the maintenance event; you own the atomic stock decrement + autonomy recompute on `/logistics`. Agree the exact call signature before building — a partial write is a correctness failure even against a single in-memory store. |
| Compliance waste shipped → voyage | You own both — `voyageId` links a `WasteEvent` to a `Voyage` on `/logistics`. |
| Asset detail (Dev A) → "view in 3D twin" | Developer A owns both ends; no touchpoint for you here. |
| `/comms` connectivity toggle → every `<DegradableSurface>` app-wide | You own `state/connectivity.ts`. Developer A's pages read it to render correctly; they never write to it. |

**Non-negotiable shared invariant:** the Action Centre drawer's `CausalTrace` must produce numbers identical to Developer A's Digital Twin page for the same asset and conditions. If they ever disagree, that's a shared-engine bug, not something to patch locally in your drawer.

---

# YOUR BUILD ORDER

Aligned to `FRONTEND.md`'s global build order (§13).

1. **Shared primitives** — `ProvenanceBadge`, `SyncPill`, `StatusDot`, `TierChip`, `ActionCard`, `StatTile`, `ProgressBar`, `DegradableSurface`. Blocks every page either of you builds.
2. **`src/lib/hashChain.ts`** — real SHA-256 chain + verifier. Compliance and Action Centre both depend on it.
3. **`state/connectivity.ts` + `lib/localStore.ts`** — your simulated backend layer. Build this before `/comms`/`/station`, since nothing about the offline demo works without it.
4. **HQ Overview (`/`)** — the screen judges look at longest (Page 1 in the global build order).
5. **Action Centre (`/actions`, `/actions/:id`)** — the full lifecycle; this is what proves "management", not monitoring (Page 3).
6. **`/comms` + `/station`** — the outage demo, the single hardest thing for another team to copy (Page 6).
7. **Logistics & Resupply (`/logistics`, manifest builder)** (Page 4).
8. **Compliance & Audit (`/compliance`)** (Page 7).
9. **Crew Handover, Settings & Auth (`/handover`, `/settings`, `/login`)** (Page 10) — smallest set, good buffer work.

## Demo-critical path

From `FRONTEND.md`'s five-minute demo script (§14), your pages carry: **Beat 1** (`/`), **Beat 3** (`/actions`), **Beats 4–6** (`/comms` ↔ `/station` — one continuous 90-second sequence, rehearse it as one), **Beat 7** (`/logistics`). `/compliance` and `/handover`+`/settings`+`/login` are supporting depth — build them fully, but if time runs short, Beats 1, 3–7 cannot be thin.

---

# WORKING AGREEMENTS

1. Branch per page, named for its route (`feat/overview`, `feat/actions`, `feat/logistics`, `feat/comms-station`, `feat/compliance`, `feat/handover-settings-login`).
2. No hard-coded hex, radius or spacing anywhere — tokens only.
3. No orange pixel that isn't "act on this" — check this specifically before opening a PR.
4. Every number needs a provenance badge — treat a missing one as a build failure, not a nit.
5. Log every unit of work in `PROGRESS.md` before ending a session (see `CLAUDE.md`).
6. Daily sync with Developer A on `src/engine/` (read-only for you), the shared components you own, and the touchpoints table above.
