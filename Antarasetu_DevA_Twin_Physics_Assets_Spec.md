# Antarasetu — Developer A Build Spec
## Owner: Twin, Physics & Assets
## Pages: Station Digital Twin · Environment & Data Sources · Research Sandbox · Maintenance & Assets

**Source of truth:** this file is extracted directly from `FRONTEND.md` (the complete, consolidated build specification) — Part I (Foundation, shared by both developers) plus your four assigned pages from Part II, plus the parts of Part III that concern you. If anything here ever seems to disagree with `FRONTEND.md`, `FRONTEND.md` wins — treat this file as your working copy, not a fork.

**This is a frontend-only build.** There is no real backend. Read the "FRONTEND-ONLY BUILD SCOPE" note inside Part I below before writing any code that touches persistence, sync, or external data — it tells you exactly what to simulate client-side and how.

---

## Role summary

You own everything that renders the station's physical and derived state through the **coupling engine** (`src/engine/coupling.ts`) — the shared physics module that turns environmental inputs into operational consequences (heating demand → energy demand → fuel burn → autonomy → Last Safe Order Date).

**Routes you own:** `/stations/:id/twin` (Station Digital Twin), `/environment` (Environment & Data Sources), `/sandbox` (Research Sandbox), `/assets` + `/assets/:assetId` (Maintenance & Assets).

**Components/modules you are the source of truth for** (Developer B's pages consume these, never fork them):
- `src/engine/coupling.ts`, `autonomy.ts`, `lsod.ts`, `similarity.ts` — the coupling engine. Pure, synchronous, unit-tested.
- `CausalTrace` (`src/components/shared/CausalTrace.tsx`) — the "why this matters" cause→effect panel. Must produce **identical numbers everywhere it appears**: Twin, Environment, Sandbox, and Developer B's Action Centre drawer. One engine call, four render sites.
- `TimeSeriesChart`, `Sparkline` (`src/components/shared/`) — used by Environment, Assets, and (by Developer B) Logistics.
- `viz/IsoStationModel`, `viz/ZoneGrid` — the isometric SVG zone-model renderer (§ "Isometric projection" in the Foundation section below). Reused by Sandbox as a "zone tint echo" — do not build a second 3D/iso scene for the Sandbox.
- `src/adapters/environment.adapter.ts`, `fuel.adapter.ts`, `generator.adapter.ts`, `maintenance.adapter.ts` — declare provenance class per source; the UI never hard-codes one.
- `src/mock/environment-snapshot/` — the static JSON pull from the real public sources (NCPOR, READER, AMRC, ERA5) that backs the Environment page in this frontend-only build.

**Modules you consume but do not own** (Developer B builds these, per the shared Foundation and their own spec file):
- `ProvenanceBadge`, `SyncPill`, `StatusDot`, `TierChip`, `ActionCard`, `StatTile`, `ResourceRow`, `Drawer`, `DegradableSurface` (`src/components/shared/`).
- `src/lib/hashChain.ts` — the SHA-256 audit chain writer/verifier.
- `state/connectivity.ts` — the dev-only LIVE/LAGGING/DARK toggle and the sync-simulation function.
- The action state machine (RAISED → ACKNOWLEDGED → ASSIGNED → IN_PROGRESS → RESOLVED/DEFERRED) — you call into it (e.g. "Raise action" / "Log service") but never reimplement it.

---

# PART I — FOUNDATION (shared with Developer B, read in full)

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
## PAGE 2 OF 10 (your page 1 of 4) — Station Digital Twin

## PAGE 2 — Station Digital Twin

**Route:** `/stations/:id/twin` · **Nav tab:** Stations

### 2.1 Purpose

The operational model of ONE station at a time, with a station switcher. Reached from the HQ dashboard's CTA or the Stations tab.

**The core thesis, restated because it governs every decision on this page:** the 3D model is the visual index into the twin, not the twin itself. The single most important panel is the **"Why this matters" causal trace**. A build that renders a beautiful rotating station but buries that chain has missed the point.

The page must work identically for Bharati and Maitri. Zones, assets and resources are data-driven; nothing about the layout may assume a particular station's configuration.

### 2.2 Layout (1440 × 900)

```
┌────────────────────────────────────────────────────────────────────────┐
│ NAV BAR (Stations active)  +  LIVE OPS / SANDBOX mode switch           │
├────────────────────────────────────────────────────────────────────────┤
│ ← HQ │ "Digital Twin" │ [Bharati|Maitri] │ sync pill │ coords · crew   │
├───────────┬──────────────────────────────────┬─────────────────────────┤
│ LEFT 232  │ CENTRE  flex                     │ RIGHT  396              │
│           │                                  │                         │
│ Zone list │  ZONE MODEL header               │ Zone inspector          │
│ ────────  │  ┌────────────────────────────┐  │  · status + tier        │
│ Colour by │  │   isometric 3D viewport    │  │  · asset list           │
│ ────────  │  │   (glow + floor + blocks)  │  │  · asset chart          │
│ Autonomy  │  └────────────────────────────┘  │  · WHY THIS MATTERS     │
│ + LSOD    │  ORBIT ZOOM RESET    legend      │  · Defer/Assign/ACK     │
└───────────┴──────────────────────────────────┴─────────────────────────┘
```

**Responsive:** below 1280px the inspector becomes a slide-over drawer. Below 900px the viewport collapses to list + inspector with a "show model" toggle. **The causal trace is never hidden at any breakpoint.**

### 2.3 Functional requirements

#### FR-1 Nav & FR-2 Title row

| ID | Requirement |
|---|---|
| FR-1.1 | "Stations" active; "Overview" links back to `/`. |
| FR-1.2 | **Mode switch** on the right of the nav: **LIVE OPS** (active, mint pill with `--bg` text) / **SANDBOX**. |
| FR-2.1 | "← HQ" back pill preserving which station was primary. |
| FR-2.2 | Page title "Digital Twin". |
| FR-2.3 | **Station switcher**: two-option segmented control, Bharati / Maitri, each with a status dot. Switching re-loads zone list, model, inspector and autonomy without a full page reload. |
| FR-2.4 | Sync pill for the active station. |
| FR-2.5 | Right meta: coordinates and crew count, mono 10.5px. |

#### FR-3 Zone list (left, top)

| ID | Requirement |
|---|---|
| FR-3.1 | One row per zone: status dot, zone name, optional tier chip for zones with open actions. |
| FR-3.2 | Selected row: tinted background + border in its status colour, name in 600. |
| FR-3.3 | Clicking selects the zone: inspector updates, the 3D block gains the white dashed outline, camera eases toward it. |
| FR-3.4 | **Selection is bidirectional** with the 3D view — one shared selection state, both directions. |
| FR-3.5 | Data-driven; must render 4–12 zones without breakage. |

#### FR-4 Colour-by switch (left, middle)

| ID | Requirement |
|---|---|
| FR-4.1 | Three radios: **Status** (default), **Provenance**, **Freshness**. |
| FR-4.2 | **Status** — edges coloured by operational state (mint / amber / orange). |
| FR-4.3 | **Provenance** — edges coloured by each zone's dominant provenance class: mint LIVE, grey-solid MODELED, grey-dashed SYNTH. Lets an operator see at a glance how much of the station is real data. |
| FR-4.4 | **Freshness** — edges and opacity driven by each zone's own update age, independent of station-level sync state. |
| FR-4.5 | Switching re-colours the existing model. It must **not** rebuild the scene or reset the camera. |

#### FR-5 Autonomy strip (left, bottom)

| ID | Requirement |
|---|---|
| FR-5.1 | Compact list: resource name, days remaining (mono, coloured by risk), thin progress bar. |
| FR-5.2 | Footer callout showing the nearest LSOD, in an orange-bordered box when ≤ 14 days. |
| FR-5.3 | Values must agree exactly with `/logistics` and `/` — one computation, three renderings. |

#### FR-6 3D zone model (centre)

| ID | Requirement |
|---|---|
| FR-6.1 | **Isometric, low-poly, zone-level.** One extruded block per zone. Header must state "low-poly operational model — not an as-built survey". |
| FR-6.2 | Each block drawn from three faces: top (rhombus), left, right — reads as a solid under fixed isometric light. |
| FR-6.3 | Each top face carries two baked labels: zone name (mono 11px 600) and a one-value summary (mono 9.5px), coloured by status. |
| FR-6.4 | Ground plane: diamond outline plus diagonal grid in `--grid-line`. |
| FR-6.5 | Radial floor glow ellipse under the model, `--glow` 0.30 → 0. |
| FR-6.6 | Zones with an open T0/T1 get a **callout pill** floating above, joined by a leader line: status dot + short label (`GEN #2 · T1 OPEN`). |
| FR-6.7 | Blocks render back-to-front by isometric depth. |
| FR-6.8 | Distinguishing features (comms mast with signal arcs, fuel tanks) are encouraged where they aid recognition. |
| FR-6.9 | Hovering a block raises it 4px and brightens its edge; clicking selects it. |
| FR-6.10 | **Ship the inline-SVG renderer first.** Upgrade to Three.js only once everything else works. The SVG version remains a functioning fallback for low-power devices and `prefers-reduced-motion`. |

#### FR-7 Viewport controls

| ID | Requirement |
|---|---|
| FR-7.1 | Three pill buttons with icons: **ORBIT**, **ZOOM**, **RESET**. |
| FR-7.2 | Legend on the right: counts of nominal / watch / warning with dots. |
| FR-7.3 | RESET returns the camera to default isometric framing. |
| FR-7.4 | In the SVG fallback, ORBIT/ZOOM apply viewBox transforms. |

#### FR-8 Inspector: identity & assets (right, top)

| ID | Requirement |
|---|---|
| FR-8.1 | Header: "ZONE INSPECTOR" label, zone name display 22px 600, status chip (WARNING / WATCH / NOMINAL). |
| FR-8.2 | Sub-line: open action count, tier, acknowledgement state. |
| FR-8.3 | **Asset list** — status dot, asset name, current value (mono), provenance badge. |
| FR-8.4 | A warning asset gets a tinted row, matching border, and 600-weight name and value. |
| FR-8.5 | Clicking an asset row scopes the chart and causal trace below. |

#### FR-9 Asset chart (right, middle)

| ID | Requirement |
|---|---|
| FR-9.1 | 24-hour series for the selected asset's key metric. |
| FR-9.2 | Dashed threshold line with a labelled value (`THRESHOLD 96 °C`), orange when crossed. |
| FR-9.3 | Latest point marked with a filled dot coloured by status. |
| FR-9.4 | X-axis ticks every 8 hours, mono 8.5px, `--text-4`. |
| FR-9.5 | Chart header carries its own provenance badge. |
| FR-9.6 | If LAGGING/DARK, truncate at the last known timestamp and hatch the remainder with the gap start time. **Never extrapolate across a gap.** |

#### FR-10 "Why this matters" — THE KEY FEATURE

| ID | Requirement |
|---|---|
| FR-10.1 | A distinct panel with a mint-tinted border, headed "WHY THIS MATTERS". **Visible without scrolling at 1440×900.** |
| FR-10.2 | Renders the cause→effect chain: each link is one row — label (`AMBIENT`, `↓ HEATING`, `↓ GEN LOAD`, `↓ FUEL BURN`), value in mono, that value's own provenance badge. |
| FR-10.3 | Final row separated by a rule, showing the **operational consequence**: autonomy before → after plus the LSOD delta (`214 → 198 d`, `LSOD −9 d`) in `--act-soft`. |
| FR-10.4 | Computed by the shared coupling engine, NOT hard-coded per zone. Selecting a different asset recomputes it. |
| FR-10.5 | Each row's badge is independently hoverable and shows that value's derivation. |
| FR-10.6 | If any input is stale, the whole chain is marked degraded and the consequence shows a range, not a point estimate. |

#### FR-11 Mode switch: Live Ops vs Sandbox

| ID | Requirement |
|---|---|
| FR-11.1 | **Live Ops** (default) reflects real/modelled state, writes to the Action Centre, feeds the audit log. |
| FR-11.2 | **Sandbox** forks state into a scratch copy. Never writes anywhere real, never touches the audit log, never merges back. |
| FR-11.3 | In Sandbox, a **persistent banner** "SIMULATION — not live station data" is fixed for the whole mode. |
| FR-11.4 | In Sandbox, all derived values carry the `SIM` class in violet. |
| FR-11.5 | Sandbox exposes parameter sliders bounded by real historical ranges. |
| FR-11.6 | Results render as a before/after diff reusing Live Ops components. **No second 3D scene** — the existing model may optionally re-tint. |
| FR-11.7 | Action buttons are disabled in Sandbox. |

#### FR-12 Action controls (right, bottom)

| ID | Requirement |
|---|---|
| FR-12.1 | **Defer** · **Assign** (secondary) · **Acknowledge** (primary, orange, flex-grow, arrow icon). |
| FR-12.2 | Acknowledge writes `{actor, timestamp, zone, asset}` and advances state. |
| FR-12.3 | Assign opens a picker of station roles (Station Engineer, Station Leader, Medical Officer, Logistics). |
| FR-12.4 | Defer requires a free-text reason **and** a review date. |
| FR-12.5 | Every transition appends to the SHA-256 chain. |
| FR-12.6 | Offline transitions queue locally with a "pending sync" marker and optimistic UI. |

#### FR-13 Provenance · FR-14 Keyboard

| ID | Requirement |
|---|---|
| FR-13.x | Per §7.1 — all four classes, hover popovers, derivation rule, adjacent placement. |
| FR-14.1 | Arrow keys move zone selection; `Enter` focuses the inspector; `Esc` clears selection. |
| FR-14.2 | The 3D SVG carries a descriptive `aria-label` summarising scene state. |
| FR-14.3 | **The 3D view is never the only way to reach a function** — everything selectable in the model is selectable in the zone list. |

### 2.4 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-2.1 | SVG model renders in < 100 ms; a Three.js upgrade holds 60 fps on integrated graphics at 1440×900. |
| NFR-2.2 | Selection → inspector update in < 50 ms. No network round-trip; zone detail pre-fetched with the station payload. |
| NFR-2.3 | Switching Colour-by must not rebuild the scene graph — re-colour existing nodes only. |
| NFR-2.4 | The 3D library is code-split and lazy-loaded; the page is usable before it arrives. |
| NFR-2.5 | The coupling engine is **explainable first-principles physics**, never a black box. No deep learning. Any forecast is labelled a projection from the entered rate, never AI prediction. |
| NFR-2.6 | The station model (zone positions, dimensions, labels) is **declarative data**, not hard-coded geometry. Adding a zone = adding a data row. |
| NFR-2.7 | The 3D view has a complete non-visual equivalent — zone list plus inspector — so a screen-reader user loses no function. |
| NFR-2.8 | The model must never display a value that contradicts the inspector. One state source, two renderings. |
| NFR-2.9 | Plus all global NFRs G1–G10. |

### 2.5 Data contracts

```ts
interface StationModel {
  stationId: 'bharati' | 'maitri';
  zones: ZoneModel[];
}

interface ZoneModel {
  code: string;                 // "A1"
  name: string;                 // "Power House"
  grid: { gx: number; gy: number };   // isometric cell — renderer derives x/y
  height: number;
  status: 'ok'|'watch'|'warning'|'unknown';
  topLabel: string;
  topValue: Measurement;
  feature?: 'mast' | 'tank' | 'none';
  assets: Asset[];
  openActions: Action[];
}

interface Asset {
  id: string; name: string;
  status: 'ok'|'watch'|'warning'|'unknown';
  current: Measurement;
  threshold?: { value: number; unit: string; label: string };
  series24h: { t: string; v: number }[];
  provenance: Provenance;
}
```

### 2.6 Acceptance criteria

- [ ] Selecting a zone in the model updates the inspector, and selecting it in the list outlines the block — one shared state, both directions.
- [ ] The causal trace is visible without scrolling and shows a provenance badge on every link.
- [ ] Colour-by → Provenance instantly reveals how much of the station is SYNTH.
- [ ] Switching station re-loads everything with no layout breakage.
- [ ] Sandbox shows the persistent banner, turns derived values violet, disables action buttons.
- [ ] Leaving Sandbox restores Live Ops with nothing written to the audit log.
- [ ] With the dev connectivity toggle set to DARK, the model still renders dimmed with hatched charts and no empty panels.
- [ ] Every number, including SVG-baked labels, renders in mono.
- [ ] In greyscale, every zone's status is readable from its top-face text.

---

-e 
---

## PAGE 5 OF 10 (your page 2 of 4) — Environment & Data Sources

## PAGE 5 — Environment & Data Sources

**Route:** `/environment` · **Nav tab:** Overview (secondary)

### 5.1 Purpose

Two jobs deliberately combined:

1. **Environmental monitoring** — the real, citable data for both stations.
2. **The data-source register** — the honest inventory of every feed, its class, its last update, and what it is still awaiting.

Combining them is the point. This is where anyone can ask *"what does Antarasetu actually know, and from where?"* and get a complete answer.

**This is the only page where a large share of the data is genuinely `LIVE`.** Lean into it — it is the anchor that makes the SYNTH labels elsewhere credible rather than evasive.

### 5.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Environment & Data Sources │ [Both|BHR|MTR] │ range │ refresh time │
├──────────────────────────────────────────┬─────────────────────────┤
│ CURRENT CONDITIONS (stat row per stn)    │  DATA SOURCE REGISTER   │
├──────────────────────────────────────────┤   (right rail, w 380)   │
│ TIME SERIES (4 stacked charts, flex)     │   · feed rows           │
│  temp · wind · pressure · heating demand │   · class · last update │
├──────────────────────────────────────────┤   · awaiting · coverage │
│ ENVIRONMENTAL COUPLING (the payoff)      │  SOURCE DETAIL drawer   │
└──────────────────────────────────────────┴─────────────────────────┘
```

### 5.3 Functional requirements

| ID | Requirement |
|---|---|
| **FR-1.1** | Title "Environment & Data Sources". Scope **Both** (default, overlaid series) / BHR / MTR. |
| FR-1.2 | Range selector: 24 h · 7 d · 30 d · season · custom. |
| FR-1.3 | Last-refresh timestamp with age, plus a manual refresh button. |
| **FR-2.1** | One `<StatTile>` row per station: **Temperature**, **Wind** (kt + direction), **Pressure**, **Humidity**, **Wind chill** (derived). |
| FR-2.2 | Wind chill is `MODELED`; its popover names the NWS formula and lists temperature and wind as parents with their classes. |
| FR-2.3 | Each tile shows a 24 h sparkline. |
| FR-2.4 | LAGGING/DARK station tiles degrade and show "as of <time>". |
| FR-2.5 | A tile with no data renders `—` with `UNKNOWN`, never `0`. |
| **FR-3.1** | Four stacked charts sharing one x-axis and one crosshair: temperature, wind speed, pressure, derived heating demand. |
| FR-3.2 | With scope Both, each chart overlays two series distinguished by **line style as well as colour** (solid vs dashed). |
| FR-3.3 | Gaps render as hatched regions labelled with duration. **Never interpolate across a gap.** |
| FR-3.4 | The heating-demand chart is `MODELED` with a caption naming the degree-day formula. |
| FR-3.5 | Crosshair hover shows a shared tooltip with all four values, each with its provenance badge. |
| FR-3.6 | Brushing a range on any chart zooms all four. |
| FR-3.7 | Uses the shared `<TimeSeriesChart>` — one implementation across environment, twin and sandbox. |
| **FR-4.1** | A panel titled "How weather becomes an operational constraint". |
| FR-4.2 | Renders the live `<CausalTrace>` at current conditions: ambient → heating → energy → generator load → fuel burn → autonomy → LSOD. |
| FR-4.3 | Each link shows value, formula on hover, provenance badge. |
| FR-4.4 | A secondary row shows the delta against the 30-day mean. |
| FR-4.5 | Link out to `/sandbox` pre-loaded with current conditions: "Explore a what-if from here". |
| FR-4.6 | **Same coupling engine module** as twin, actions and sandbox. No second implementation. |
| **FR-5.1** | A list of every adapter: source name, what it provides, provenance badge, last update + age, coverage bar, status dot. |
| FR-5.2 | Grouped: **Connected (LIVE)**, **Derived (MODELED)**, **Awaiting connection (SYNTH)**. |
| FR-5.3 | Each SYNTH row must name what it awaits — "station SCADA adapter", "NCPOR inventory export". |
| FR-5.4 | Header summary: `n of m feeds live · n modelled · n awaiting`, with a stacked bar. **This single line is the platform's honesty statement.** |
| FR-5.5 | Row click opens a detail drawer: URL, licence/attribution, fields provided, cadence, last fetch, last error, adapter interface, consuming pages. |
| FR-5.6 | Public sources listed with their real URLs (§10), click-through. |
| FR-5.7 | A feed failing its last N fetches shows amber and surfaces a T2 action. |
| **FR-6.1** | Export the visible range as CSV with `source`, `provenance` and `timestamp` columns per series. |
| FR-6.2 | **The export must carry provenance.** A CSV that loses the class is a spec violation — it is how SYNTH data escapes into a report. |

### 5.4 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-5.1 | 30 days hourly (≈720 pts × 4 series × 2 stations) renders in < 300 ms; LTTB downsample above 2000 points per series, disclosed in the chart footer. |
| NFR-5.2 | **Frontend-only build:** public-source data ships as a static JSON snapshot in `src/mock/environment/`, pulled once from the real sources in §10, refreshed manually before a demo rather than fetched live. Still labelled `LIVE` (it is real observed data) — only the refresh mechanism differs from the intended architecture. The client never calls an external portal directly at runtime either way. |
| NFR-5.3 | A failed external fetch degrades to the last cached value with its real age, never a blank chart. |
| NFR-5.4 | Attribution displayed wherever a source's data appears, not only on this page. |
| NFR-5.5 | Series distinguishable in greyscale and to deuteranopes — pair colour with line style. |
| NFR-5.6 | Plus all global NFRs G1–G10. |

### 5.5 Data contract

```ts
interface EnvironmentalSeries {
  stationId: 'bharati' | 'maitri';
  metric: 'temperature'|'windSpeed'|'windDir'|'pressure'|'humidity'|'heatingDemand';
  unit: string;
  points: { t: string; v: number | null }[];   // null marks a gap — do NOT interpolate
  gaps: { from: string; to: string; reason?: string }[];
  provenance: Provenance;
  source: string; sourceUrl?: string;
  downsampled?: { method: 'LTTB'; from: number; to: number };
}

interface DataSource {
  id: string; name: string; provides: string[];
  provenance: Provenance;
  group: 'connected' | 'derived' | 'awaiting';
  url?: string; attribution?: string;
  cadence: string;
  lastSuccessAt?: string; lastErrorAt?: string; lastError?: string;
  coverage: number;                // 0–1 over the selected range
  awaiting?: string;               // REQUIRED when SYNTH
  adapterInterface: string;
  consumedBy: string[];
}
```

### 5.6 Acceptance criteria

- [ ] The register's header states honestly how many feeds are live vs awaiting, matching the rows.
- [ ] Every SYNTH feed names the specific adapter it awaits.
- [ ] Public sources click through to their real URLs.
- [ ] A data gap renders as a labelled hatched region; no line crosses it.
- [ ] Wind chill's popover names the formula and both parents with their classes.
- [ ] The coupling panel matches the twin page's causal trace for the same station and conditions.
- [ ] CSV export contains a provenance column for every value.
- [ ] With scope Both, the two stations' series are distinguishable with colour removed.

### 5.7 Out of scope

No weather forecasting model, no satellite imagery viewer, no climate narrative.

---

-e 
---

## PAGE 9 OF 10 (your page 3 of 4) — Maintenance & Assets

## PAGE 9 — Maintenance & Assets

**Routes:** `/assets` · detail `/assets/:assetId` · **Nav tab:** Stations (secondary)

### 9.1 Purpose

The asset register and operational history of both stations — the "infrastructure" domain given its own working surface. Answers: *what equipment exists, what condition is it in, what has happened to it, what is due, and has this fault happened before?*

**The honesty constraint that shapes this page:** we have no real fault history.

- **Do not** build predictive maintenance. There is nothing to train on, and a judge will ask.
- **Do** build *similar-fault retrieval* via TF-IDF over the platform's own records — defensible, explainable, genuinely useful once real history accrues.
- Label the history block `SYNTH` until it is real.

### 9.2 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ Maintenance & Assets │ [Both|BHR|MTR] │ search │ due counts │ view │
├───────────────┬────────────────────────────────────────────────────┤
│ FILTER RAIL   │  ASSET REGISTER (table)                            │
│  w 220        │   status · asset · station · zone · category ·     │
│  Zone         │   condition · last service · next due · open       │
│  Category     ├────────────────────────────────────────────────────┤
│  Condition    │  MAINTENANCE SCHEDULE (strip)                      │
│  Due window   │   overdue · due 30 d · due 90 d                    │
└───────────────┴────────────────────────────────────────────────────┘

ASSET DETAIL /assets/:assetId
┌──────────────────────────────┬─────────────────────────────────────┐
│ identity + spec              │  open actions on this asset         │
│ live metrics + charts        │  WHY THIS MATTERS (causal trace)    │
│ maintenance timeline         │  similar past faults                │
│ fault history                │  schedule next service              │
└──────────────────────────────┴─────────────────────────────────────┘
```

### 9.3 Functional requirements

| ID | Requirement |
|---|---|
| **FR-1.1** | Title "Maintenance & Assets". Scope **Both** (default) / BHR / MTR. |
| FR-1.2 | Search by asset name, ID, manufacturer or zone. |
| FR-1.3 | Counts: `n assets · n overdue service · n with open actions`. Overdue in `--act-soft`. |
| FR-1.4 | Filter rail: zone, category (power, HVAC, water, comms, vehicles, lab, safety, structural), condition, due window, has-open-actions. |
| FR-1.5 | View toggle: **Table** (default) / **By zone** / **Schedule**. |
| **FR-2.1** | Table columns: status dot · asset name + ID · station · zone · category · condition · current key metric · last service · next due · open actions count. |
| FR-2.2 | Condition is a four-state enum — `good` / `monitor` / `degraded` / `fault` — shown as a labelled chip, **never colour alone**. |
| FR-2.3 | Condition is **rule-derived and inspectable**, never an opaque score. Hovering shows the rule that fired (`coil temp > 90 °C for > 6 h`). |
| FR-2.4 | Overdue service rows get an orange left border and an `OVERDUE` chip. |
| FR-2.5 | LAGGING/DARK station rows degrade; the current metric reads "as of last sync". |
| FR-2.6 | Asset telemetry is `SYNTH` until a real SCADA adapter exists. |
| FR-2.7 | Row actions: **Open asset**, **Raise action**, **Log service**. |
| **FR-3.1** | Schedule strip: **Overdue**, **Due in 30 days**, **Due in 90 days**, each listing assets with due date and interval. |
| FR-3.2 | Schedules are interval-based (run hours, calendar days, or cycles), configurable per asset, with the basis shown. |
| FR-3.3 | An overdue service automatically has a T2 action; a missing link is flagged. |
| FR-3.4 | **A service due during a period when the station will be DARK or a resupply is unavailable is flagged** — the cross-domain insight the twin exists to produce. |
| **FR-4.1** | Detail header: back pill, asset name, station · zone breadcrumb, condition chip, and a link to view the asset in the 3D twin (which selects its zone). |
| FR-4.2 | Spec block: category, manufacturer, model, install date, rated capacity, service interval, criticality tier. |
| FR-4.3 | Specs sourced from documentation are `MODELED`; anything invented is `SYNTH`. Both labelled. |
| **FR-5.1** | `<StatTile>` row for key metrics (load, coil temperature, run hours, starts). |
| FR-5.2 | 24 h / 7 d / 30 d `<TimeSeriesChart>` per primary metric, with labelled threshold lines. |
| FR-5.3 | Charts truncate at the last known timestamp with a hatched labelled gap when LAGGING/DARK. **Never extrapolate.** |
| FR-5.4 | Run hours accumulate and drive interval scheduling; show hours-to-next-service alongside days-to-next-service. |
| **FR-6.1** | Reverse-chronological timeline: service, inspection, fault, repair, part replacement, condition change. |
| FR-6.2 | Each entry: date, type, performed by, notes, parts used, downtime, evidence, audit hash, provenance. |
| FR-6.3 | Offline entries show both station and HQ receipt time with a pending marker. |
| FR-6.4 | **Parts used link to the corresponding resource in `/logistics`**, so a repair visibly consumes spares and moves that resource's autonomy. **This link is the point** — it makes maintenance part of the twin rather than a separate log. |
| FR-6.5 | **Log service** form: type, date, performed by, notes, parts consumed, downtime, evidence. On submit it writes the event, decrements linked resources, recomputes autonomy, appends to the chain. |
| **FR-7.1** | Fault history: date, symptom, diagnosis, resolution, time-to-resolve. |
| FR-7.2 | The block carries a `SYNTH` badge and the note *"historical fault data is synthetic pending NCPOR records"*. **Do not hide this.** |
| FR-7.3 | **Similar past faults** — up to 5 across all assets of the same category, TF-IDF cosine over `{symptom + diagnosis + category}`, minimum score 0.35. |
| FR-7.4 | Each result shows similarity score, the asset, the resolution, time-to-resolve. |
| FR-7.5 | The method is stated in the UI: *"TF-IDF similarity over this platform's own records — no external model, no training"*. |
| FR-7.6 | **No predictive-maintenance claim, no failure probability, no remaining-useful-life estimate anywhere.** |
| **FR-8.1** | The shared `<CausalTrace>` for this asset, identical to the twin page's. |
| FR-8.2 | Open actions listed via `<ActionCard>` with inline ACK. |
| FR-8.3 | **Raise action** pre-filled with asset, current metric and computed consequence. |
| FR-8.4 | **Schedule service** creates a future maintenance event and warns if it falls outside a feasible resupply window for required parts. |

### 9.4 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-9.1 | Register renders 300 assets without lag; window rows above 200. |
| NFR-9.2 | Condition rules are declarative data, evaluated by a pure unit-tested function, inspectable in the UI. **No hidden scoring.** |
| NFR-9.3 | Similarity retrieval runs client-side in < 100 ms for 1000 records; above that, server-side with the same algorithm. |
| NFR-9.4 | Logging a service that consumes parts must **atomically** update the resource ledger. A partial write is a correctness failure. |
| NFR-9.5 | Every asset metric carries provenance at the tile, not just page level. |
| NFR-9.6 | Asset schemas are additive — an unknown category or metric renders generically. |
| NFR-9.7 | Plus all global NFRs G1–G10. |

### 9.5 Data contract

```ts
interface Asset {
  id: string; name: string;
  stationId: 'bharati' | 'maitri'; zoneCode: string;
  category: 'power'|'hvac'|'water'|'comms'|'vehicle'|'lab'|'safety'|'structural';
  criticality: 'T0'|'T1'|'T2'|'T3';
  spec: { manufacturer?: string; model?: string; installedAt?: string;
          ratedCapacity?: Measurement; provenance: Provenance };
  condition: 'good' | 'monitor' | 'degraded' | 'fault';
  conditionRule: { id: string; expression: string; firedAt?: string };   // inspectable
  metrics: { key: string; label: string; current: Measurement;
             threshold?: { value: number; unit: string; label: string };
             series: { t: string; v: number | null }[] }[];
  runHours?: Measurement;
  service: { intervalBasis: 'calendar_days'|'run_hours'|'cycles'; interval: number;
             lastServiceAt?: string; lastServiceAtHours?: number;
             nextDueAt?: string; nextDueAtHours?: number; overdue: boolean };
  openActionIds: string[];
}

interface MaintenanceEvent {
  id: string; assetId: string;
  type: 'service'|'inspection'|'fault'|'repair'|'part_replacement'|'condition_change';
  at: string; atStation?: string; performedBy: string; notes: string;
  partsUsed: { resourceId: string; quantity: number }[];   // decrements /logistics
  downtimeMinutes?: number;
  evidence: { id: string; kind: string; label: string }[];
  auditHash: string; prevHash: string; pendingSync: boolean; provenance: Provenance;
}

interface Fault {
  id: string; assetId: string;
  symptom: string; diagnosis?: string; resolution?: string;
  raisedAt: string; resolvedAt?: string; timeToResolveMinutes?: number;
  linkedActionId?: string;
  provenance: Provenance;                // SYNTH while history is synthetic
}
```

### 9.6 Acceptance criteria

- [ ] Hovering a condition chip shows the exact rule that produced it.
- [ ] Logging a service that consumes two hydraulic spares visibly reduces stock and moves autonomy and LSOD on `/logistics`.
- [ ] A service due during a projected DARK window or outside a resupply window is flagged.
- [ ] The fault-history block carries a SYNTH badge and the pending-NCPOR note.
- [ ] Similar-fault results show scores and the method is stated on screen.
- [ ] No element claims a failure probability, remaining useful life, or any prediction.
- [ ] The asset's causal trace matches the twin page's for the same asset.

### 9.7 Out of scope

No predictive maintenance, no anomaly-detection ML, no RUL estimation, no vendor/warranty integration.

---

-e 
---

## PAGE 8 OF 10 (your page 4 of 4, build last) — Research Sandbox

## PAGE 8 — Research Sandbox

**Route:** `/sandbox` · **Nav tab:** Sandbox

### 8.1 Purpose

Every other page is about **operating** the station. This one is about **understanding** it.

The Sandbox lets a user change environmental, energy, logistics and crew parameters within physically realistic bounds and see the modelled downstream consequences — grounded in the same coupling engine the live twin uses, never presented as a real operational change.

**Why it earns its place:** the PS is about *research* stations. This turns the twin from a monitoring surface into a decision-support instrument, and costs almost nothing because it reuses the engine, charts and cards that already exist.

**The single most important requirement:** it must be impossible, at any moment, to mistake a sandbox result for live station data.

### 8.2 Mode separation — the non-negotiable contract

| | Live Ops | Research Sandbox |
|---|---|---|
| State | Real / modelled station state | Forked scratch copy |
| Writes | Action Centre, records, inventory | **Nothing. Ever.** |
| Audit log | Every transition appended | **No entries, ever** |
| Provenance | LIVE / MODELED / SYNTH | **SIM** — a fourth, visually distinct class |
| Banner | none | **Persistent, whole session** |
| Action buttons | enabled | **disabled** |
| Merge back | n/a | **Never** |

A result may *optionally* re-tint the existing 3D zone model. It gets **no second 3D scene** — one 3D asset, reused.

### 8.3 Layout

```
┌────────────────────────────────────────────────────────────────────┐
│ NAV BAR  (SANDBOX active)                                          │
├────────────────────────────────────────────────────────────────────┤
│ ███  SIMULATION — NOT LIVE STATION DATA  ███   (violet, sticky)    │
├────────────────────────────────────────────────────────────────────┤
│ Research Sandbox │ [BHR|MTR] │ scenario ▾ │ Reset │ Save scenario  │
├──────────────────────────────┬─────────────────────────────────────┤
│ PARAMETERS (left 340)        │  RESULTS (flex)                     │
│  ▸ Environmental             │   ┌───────────────────────────────┐ │
│    ambient temp  ──●──       │   │ BEFORE / AFTER DIFF CARDS     │ │
│    wind speed    ─●───       │   ├───────────────────────────────┤ │
│    storm days    ●────       │   │ AUTONOMY PROJECTION CHART     │ │
│  ▸ Energy                    │   ├───────────────────────────────┤ │
│  ▸ Logistics                 │   │ CAUSE → EFFECT TRACE          │ │
│  ▸ Crew / Ops                │   ├───────────────────────────────┤ │
│                              │   │ ZONE IMPACT (reused 3D/grid)  │ │
└──────────────────────────────┴───┴───────────────────────────────┴─┘
```

### 8.4 Functional requirements

| ID | Requirement |
|---|---|
| **FR-1.1** | Sticky banner directly beneath the nav, full width, violet-tinted (`--sim` at 14% on `--panel`), 1px violet border, text `SIMULATION — NOT LIVE STATION DATA` in mono with letter-spacing. |
| FR-1.2 | Visible for the entire time the user is on `/sandbox`. **Cannot be dismissed, collapsed or scrolled away.** |
| FR-1.3 | States the fork point: `forked from Bharati state at 14:22 IST, 19 Sep 2026`. |
| FR-1.4 | If a sandbox result appears on any other page, that surface carries the same banner. |
| **FR-2.1** | Title "Research Sandbox". |
| FR-2.2 | Station selector; switching re-forks from that station's current state and resets parameters. |
| FR-2.3 | **Scenario dropdown** with saved and preset scenarios. |
| FR-2.4 | **Reset** returns every slider to baseline (current real state). |
| FR-2.5 | **Save scenario** persists the parameter set with a name. Saving a *scenario* is permitted; saving a *result* into operational state is not. |
| **FR-3.1** | Four collapsible groups: Environmental, Energy, Logistics, Crew / Ops. |
| FR-3.2 | Each parameter: labelled slider + numeric input, unit, current value, and the baseline marked as a tick on the track. |
| FR-3.3 | **Bounds are calibrated from real historical ranges** (SCAR READER, AMRC, ERA5 for environmental; station config for the rest), so a physically implausible value cannot be selected. Each slider's tooltip names the source of its bounds. |
| FR-3.4 | **Correlated parameters are constrained**: an extreme winter temperature narrows the plausible wind range to what actually co-occurs in the historical record. When a bound moves, the UI says so inline. |
| FR-3.6 | Changing any parameter recomputes results **live**, debounced to 120 ms. **No "Run" button.** |
| FR-3.7 | Every changed parameter is highlighted; a counter shows `n of m parameters changed`. |
| **FR-4.1** | Paired diff cards reusing the `<StatTile>` visual language, so numbers feel continuous with the rest of the product. |
| FR-4.2 | Each card: metric name, **BEFORE** (baseline), **AFTER** (scenario), delta, and a risk chip for each side. |
| FR-4.3 | Default metrics: fuel autonomy (± band), spares autonomy, LSOD, daily energy demand, daily fuel burn, projected risk level. |
| FR-4.4 | Every AFTER value carries a violet `SIM` badge; BEFORE values carry their real class. |
| FR-4.5 | A worsening delta in `--act-soft`, an improving one in `--ok-soft`, always with sign and unit. |
| FR-4.6 | Autonomy shows its ± band on **both** sides. A scenario that widens uncertainty must show the widened band. |
| **FR-5.1** | Projection chart: stock depletion forward for baseline and scenario as two lines with uncertainty bands. |
| FR-5.2 | Ship windows as vertical bands (same visual as `/logistics`); LSOD markers on both lines. |
| FR-5.3 | Scenario line violet; baseline in the normal series colour. **Line style differs as well as colour.** |
| FR-5.4 | Explicit caption: `projection from the entered rate — not a prediction`. |
| FR-5.5 | An optional linear-trend or ARIMA layer may be offered, labelled a projection from entered rates, **never AI prediction**. |
| **FR-6.1** | The shared `<CausalTrace>` run against scenario inputs: `wind ↑ → heat loss ↑ → heating demand ↑ → generator load ↑ → fuel burn ↑ → autonomy ↓ → LSOD ↓`. |
| FR-6.2 | Each link shows baseline value, scenario value and delta. |
| FR-6.3 | Each link's formula inspectable on hover — the exact engine expression with inputs substituted. |
| FR-6.4 | Every scenario value carries the `SIM` badge. |
| FR-6.5 | **This is the panel that proves the sandbox is physics and not a toy.** Visible without scrolling at 1440×900. |
| **FR-7.1** | Presets shipped with the product: **Three-day blizzard** · **Winter minimum** · **Generator #2 offline** · **Resupply delayed 30 days** · **Crew +6 for summer** · **Renewables doubled**. |
| FR-7.2 | Presets are **data files, not code**. Adding one is adding a JSON row. |
| FR-7.3 | Users may save, rename and delete their own scenarios. Saved scenarios store parameters only, never results. |
| FR-7.4 | A **Compare** mode showing up to three scenarios side by side against one baseline. |
| FR-7.5 | Export a scenario and its results as CSV/JSON with every value carrying `SIM`. Losing the class is a spec violation — it is exactly how a simulated number would escape into a real report. |
| **FR-8.1** | The existing zone grid (or loaded 3D scene) re-tints to show which zones the scenario pushes into watch or warning. |
| FR-8.2 | Tinting uses the same status colours, with a small violet `SIM` marker on every affected zone. |
| FR-8.3 | **No second 3D scene.** If Three.js is not loaded, the SVG zone grid is used. |

### 8.5 Page-specific NFRs

| ID | Requirement |
|---|---|
| NFR-8.1 | Full recompute in < 100 ms for a single-parameter change. The engine is pure and synchronous; **no network call on a slider drag**. |
| NFR-8.2 | **No black-box ML.** Explainable first-principles physics; every output traces to a named formula. A statistical layer may only constrain slider bounds and correlations — never produce a headline number. |
| NFR-8.3 | Any forecast is labelled a projection from the entered rate. The words "AI prediction", "forecast model" and "trained" must not appear. |
| NFR-8.4 | The sandbox holds **zero write capability** — enforce at the state layer, not just by disabling buttons. The sandbox store is a separate fork, read-only to the outside. |
| NFR-8.5 | Leaving `/sandbox` discards the fork entirely; returning re-forks from then-current state. |
| NFR-8.6 | The `SIM` class must be distinguishable from the other three **in greyscale** — use a distinct border pattern, not only violet. |
| NFR-8.7 | Slider bounds must be traceable: each bound's source is inspectable in the UI. |
| NFR-8.8 | Plus all global NFRs G1–G10. |

### 8.6 Parameters & bounds

| Group | Parameter | Unit | Bound source |
|---|---|---|---|
| Environmental | Ambient temperature | °C | SCAR READER station range |
| | Wind speed | kt | AMRC AWS distribution |
| | Storm duration | days | historical event record |
| | Solar irradiance | W/m² | seasonal ERA5 range |
| Energy | Renewable mix (wind/solar) | % | station config |
| | Generator efficiency | % | equipment spec |
| | Insulation quality (U-value) | W/m²K | building config |
| Logistics | Resupply interval | days | voyage schedule |
| | Cargo capacity | kg | voyage config |
| | Consumption rate multiplier | × | 0.5–2.0 |
| Crew / Ops | Crew size | people | station capacity |
| | Shift pattern | enum | station config |

### 8.7 Data contract

```ts
interface SandboxParameter {
  key: string; group: 'environmental'|'energy'|'logistics'|'crew';
  label: string; unit: string;
  baseline: number; value: number;
  min: number; max: number; step: number;
  boundSource: string;              // "SCAR READER 1990–2024, Bharati"
  constrainedBy?: string[];
}

interface SandboxResult {
  scenarioId: string;
  forkedFrom: { stationId: string; at: string };
  metrics: {
    key: string; label: string; unit: string;
    before: { value: number; band?: number; risk: Risk; provenance: Provenance };
    after:  { value: number; band?: number; risk: Risk; provenance: 'SIM' };
    delta: number;
  }[];
  trace: { step: string; formula: string; before: number; after: number;
           unit: string; provenance: 'SIM' }[];
  projection: {
    baseline: { t: string; v: number; band: number }[];
    scenario: { t: string; v: number; band: number }[];
    lsodBaseline: number | null; lsodScenario: number | null;
    method: 'linear-rate' | 'trend' | 'arima';
    caption: string;                // always "projection from the entered rate"
  };
  zoneImpact: { zoneCode: string; before: Risk; after: Risk }[];
}
```

### 8.8 Acceptance criteria

- [ ] The simulation banner is visible in every screenshot, at every scroll position.
- [ ] Every AFTER value carries a violet `SIM` badge, distinguishable in greyscale.
- [ ] Dragging a slider updates cards, chart and trace in < 100 ms with no network call.
- [ ] An extreme temperature visibly narrows the wind slider's bounds with an inline explanation.
- [ ] Hovering any trace link shows the exact formula with substituted inputs.
- [ ] Nothing the sandbox does appears in the Action Centre, the audit log, or any record.
- [ ] Navigating away and back re-forks from current state with parameters reset.
- [ ] An exported scenario CSV carries `SIM` on every simulated value.
- [ ] The words "AI prediction" and "trained" appear nowhere on the page.

### 8.9 Out of scope

No neural networks, no training pipeline, no learned behaviour. No second 3D scene. No writing to any operational store. No optimisation solver — the sandbox explores, it does not prescribe.

---


---

# YOUR INTEGRATION CONTRACTS

Agree exact shapes with Developer B before building each touchpoint below — this list is identical in both of your spec files, so neither of you is working from a stale copy.

| Touchpoint | What you expose / consume |
|---|---|
| Twin zone inspector → raise/ACK/assign/defer an action | You call Developer B's `useActionTransitions()`. Do not reimplement the state machine. |
| Twin / Environment → "Open in Sandbox" | You provide the pre-load payload: `{ stationId, currentConditions }`. Sandbox (your own page) consumes it. |
| Maintenance "Log service" → decrements a resource | You write the maintenance event; Developer B's resource ledger (`/logistics`) owns the atomic stock decrement + autonomy recompute. Agree the exact call before building — a write that consumes parts without recording the service, or vice versa, is a correctness failure even in a frontend-only build with a single in-memory store. |
| Asset detail → "view in 3D twin" | You own both ends — route + zone pre-selection param, e.g. `/stations/bharati/twin?zone=A1`. |
| Environment coupling panel → `/sandbox` | Link labelled "Explore a what-if from here", pre-loaded with current conditions. |
| Any of your pages → Action Centre "Raise action" | You pre-fill `{ stationId, zoneCode?, assetId?, trigger, consequence }` and route to `/actions/:id` (Developer B's route). |
| Twin/Environment "kill the link" demo moment | You read `state/connectivity.ts` (Developer B's module) to render `<DegradableSurface>` correctly — you never write to it directly; the toggle itself lives on `/comms`. |

**Non-negotiable shared invariant:** `CausalTrace` numbers must be byte-identical for the same asset/station/conditions across the Digital Twin, Environment coupling panel, Sandbox, and Developer B's Action Centre drawer. One engine, four call sites, one source of truth. If the Action Centre trace ever disagrees with your Twin trace for the same asset, that's a shared-engine bug, not a rounding difference to shrug off.

---

# YOUR BUILD ORDER

Aligned to `FRONTEND.md`'s global build order (§13) — steps 1–3 there are shared foundation work; from step 4 the two of you diverge onto your own pages.

1. **Coupling engine + unit tests** (`src/engine/`) — blocks everything else in this file.
2. **`CausalTrace` component** — build it once, correctly, before any page needs it.
3. **Station Digital Twin (`/stations/:id/twin`)** — panels first, SVG isometric model second. This is Page 2 in the global build order and the screen the demo spends the second-longest on.
4. **Maintenance & Assets (`/assets`, `/assets/:assetId`)**.
5. **Environment & Data Sources (`/environment`)**.
6. **Research Sandbox (`/sandbox`)** — build last; it reuses everything above (engine, `CausalTrace`, zone grid, chart component) and should be the cheapest page once the rest exists.

## Demo-critical path

From `FRONTEND.md`'s five-minute demo script (§14), your pages carry: **Beat 2** (`/stations/:id/twin` — understand the twin) and **Beat 9** (`/sandbox` — the what-if). `/assets` and `/environment` are supporting depth — build them fully, but if time runs short, Beats 2 and 9 cannot be thin.

---

# WORKING AGREEMENTS

1. Branch per page, named for its route (`feat/twin`, `feat/assets`, `feat/environment`, `feat/sandbox`).
2. No hard-coded hex, radius or spacing anywhere — tokens only, including inside SVG.
3. No orange pixel that isn't "act on this" — check this specifically before opening a PR.
4. Every number needs a provenance badge — treat a missing one as a build failure, not a nit.
5. Log every unit of work in `PROGRESS.md` before ending a session (see `CLAUDE.md`).
6. Daily sync with Developer B on `src/engine/`, `src/adapters/`, `src/types/`, and the touchpoints table above.
