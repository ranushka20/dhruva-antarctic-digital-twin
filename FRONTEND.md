# ANTARASETU — COMPLETE FRONTEND BUILD SPECIFICATION

**SIH 2026 · Problem Statement 26060**
Digital Platform for Efficient Remote Management of Indian Antarctic Research Stations

**Stack:** React 18 + Vite + TypeScript + Tailwind CSS
**Scope of this document:** every page, every functional requirement, every non-functional requirement, the complete colour system, all data contracts, all algorithms, and the build order.

---

## HOW TO USE THIS DOCUMENT

> **If you are an AI implementing this:** Part I is mandatory reading before writing any code. It defines tokens, the shell, the shared component library and the coupling engine that every page depends on. Part II specifies each page. Part III is the build order and the global checklist.
>
> **Three rules that override any inference you might make:**
> 1. **Orange (`#F26B21`) means "act on this" and nothing else.** Never a chart fill, never a brand accent, never decoration.
> 2. **Every displayed value carries a provenance class.** A missing class is a build failure, never a silent default to LIVE.
> 3. **One coupling engine.** Every page that shows autonomy, LSOD or a causal chain reads from `src/engine/coupling.ts`. Never compute the same number twice.
>
> Do not build: a generic AI chatbot or assistant avatar; photorealistic 3D; tile-based world maps; predictive-maintenance ML; blockchain; any claim about NCPOR bandwidth, internal systems or real telemetry that is not labelled SYNTH.

---

## FRONTEND-ONLY BUILD SCOPE — READ THIS BEFORE §9–11

**This build has no real backend.** Every line in this document that assumes a server (a FastAPI process, SQLite, Postgres, a JWT-verifying API, a caching proxy) is simulated entirely client-side for this build. This is a scope decision, not an oversight — treat it the same way the rest of this document treats SYNTH data: label it honestly, never claim it's more than it is.

Concretely, wherever this document says "server", "backend" or names a stack (FastAPI, SQLite), read it as:

| The document says | Build it as |
|---|---|
| "cached server-side with a documented TTL" (§10, Page 5 NFR-5.2) | A static JSON snapshot in `src/mock/`, pulled once from the real public sources, refreshed manually before a demo. Still labelled `LIVE` — it's real data, just not continuously polled. |
| "enforced server-side" (NFR-G9, role gating) | Enforced in a client-side auth/permissions module only. State plainly (in the doc and if asked) that this is UI-level gating, not real authorization — anyone with browser devtools could bypass it. Fine for a demo, not for production. |
| "the local edge service (FastAPI + SQLite)" (Page 6 station console) | A `localStorage`-backed store simulating the station's local database. "Write to local SQLite, then confirm" becomes "write to `localStorage`, then confirm" — same durability-before-confirmation rule, different storage engine. |
| "the server deduplicates" / "server-side as well as client-side" (NFR-6.3, NFR-6.6) | A single in-browser store simulating both ends — station-side and HQ-side state live in two separate in-memory/localStorage namespaces within the same app, and a scripted "sync" function moves records between them, applying the same dedup/tier-order rules a real server would. |
| "when the backend is unreachable" / "killing the backend" (NFR-1.2, checklist items) | A dev-only connectivity toggle (LIVE / LAGGING / DARK) that the demo operator flips by hand, instead of an actual process being killed. This is more reliable for a live demo, not a downgrade. |

The hash chain (§9, "Hash chain (audit)") is **not** simulated — implement it for real with `crypto.subtle.digest`. It's pure, synchronous, and needs no server; there's no reason to fake it.

If the pitch or a judge asks about the backend: the architecture above is the intended path, not yet built. This build demonstrates the full frontend and interaction model against a synthetic/local data layer.

---

## TABLE OF CONTENTS

**PART I — FOUNDATION**
- [1. Project identity & core thesis](#1-project-identity--core-thesis)
- [2. Design tokens](#2-design-tokens)
- [3. The colour contract](#3-the-colour-contract)
- [4. Typography & geometry](#4-typography--geometry)
- [5. Ambient glow recipes](#5-ambient-glow-recipes)
- [6. App shell, nav & routing](#6-app-shell-nav--routing)
- [7. Shared component library](#7-shared-component-library)
- [8. Data layer & the Measurement atom](#8-data-layer--the-measurement-atom)
- [9. The coupling engine](#9-the-coupling-engine)
- [10. Adapters & real public data sources](#10-adapters--real-public-data-sources)
- [11. Global non-functional requirements](#11-global-non-functional-requirements)
- [12. Folder structure](#12-folder-structure)

**PART II — PAGES**
- [PAGE 1 — HQ Overview `/`](#page-1--hq-overview)
- [PAGE 2 — Station Digital Twin `/stations/:id/twin`](#page-2--station-digital-twin)
- [PAGE 3 — Action Centre `/actions`](#page-3--action-centre)
- [PAGE 4 — Logistics & Resupply `/logistics`](#page-4--logistics--resupply)
- [PAGE 5 — Environment & Data Sources `/environment`](#page-5--environment--data-sources)
- [PAGE 6 — Sync, Comms & Station Console `/comms` `/station`](#page-6--sync-comms--station-console)
- [PAGE 7 — Compliance & Audit `/compliance`](#page-7--compliance--audit)
- [PAGE 8 — Research Sandbox `/sandbox`](#page-8--research-sandbox)
- [PAGE 9 — Maintenance & Assets `/assets`](#page-9--maintenance--assets)
- [PAGE 10 — Crew Handover, Settings & Auth](#page-10--crew-handover-settings--auth)

**PART III — DELIVERY**
- [13. Build order](#13-build-order)
- [14. Five-minute demo script](#14-five-minute-demo-script)
- [15. Global acceptance checklist](#15-global-acceptance-checklist)
- [16. Open questions for NCPOR](#16-open-questions-for-ncpor)

---
---

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

# PART II — PAGES

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

# PART III — DELIVERY

---

## 13. Build order

Build in this sequence. Steps 1–7 are the demo; everything after is depth.

| # | Step | Why here |
|---|---|---|
| 1 | Tokens, `AppShell`, `NavBar`, `PageHeader`, routing skeleton | Everything hangs off this |
| 2 | Shared primitives: `ProvenanceBadge`, `SyncPill`, `StatusDot`, `TierChip`, `ProgressBar`, `DegradableSurface` | Used on every page |
| 3 | **The coupling engine + unit tests** | **Before any page that shows a number** |
| 4 | **Page 1 — HQ Overview** | The screen judges look at longest |
| 5 | **Page 2 — Digital Twin** — panels first, SVG model second, Three.js last | If Three.js eats two days you still have a complete product |
| 6 | **Page 3 — Action Centre** | Proves "management" |
| 7 | **Page 6 — `/comms` + `/station`** | The outage demo — the hardest thing to copy |
| 8 | Page 4 — Logistics · Page 5 — Environment | Depth on the PS domains |
| 9 | Page 8 — Sandbox | The research angle |
| 10 | Pages 7, 9, 10 — Compliance, Assets, Handover, Settings | Completeness |

### Must build (the MVP)

Unified twin state model · HQ dashboard · 3D zone visualisation · four-domain integration · Action Centre · resource + autonomy forecasting · offline local store + sync queue · sync-lag/freshness indicators · provenance badges · one strong outage demo.

### Useful supporting features

Compliance records · maintenance history · crew handover capsule · similar-fault retrieval · logistics prioritisation · research sandbox.

### Never build

Generic AI chatbot · photorealistic 3D reconstruction · blockchain · predictive maintenance on nonexistent fault history · fabricated real-time telemetry · unsupported claims about bandwidth or internal NCPOR systems.

---

## 14. Five-minute demo script

| Beat | Route | What happens |
|---|---|---|
| **1 — Normal operation** | `/` | Open HQ. Both stations visible. Real environmental data labelled LIVE; internal telemetry labelled SYNTH. |
| **2 — Understand the twin** | `/stations/bharati/twin` | Click Power House. Show how the zone links to its assets, measurements and status. |
| **3 — Operational action** | `/stations/bharati/twin` → `/actions` | Generator warning creates a T1 inspection task with an owner and a consequence. |
| **4 — Communication outage** | `/comms` | Trigger the scripted outage. Maitri goes LAGGING → DARK. The HQ twin and dashboard visibly degrade; the link timeline shows the gap opening. |
| **5 — Offline operation** | `/station` | With the link down, log a fault, record an action, post an inventory change, file a waste record. Each appears in the local outbox at its tier. Local autonomy recomputes immediately. |
| **6 — Reconnect** | `/comms` | Restore the link. Outbox drains T0 → T1 → T2 → T3 on screen. "What we missed" reconstructs the dark period. HQ state converges. |
| **7 — Resource decision** | `/logistics` | Show a projected depletion crossing the next logistics window, then the manifest engine prioritising replenishment. |
| **8 — Provenance** | any | Click a data badge. LIVE → real public source · MODELED → derived · SYNTH → prototype placeholder. |
| **9 — Sandbox** | `/sandbox` | "What if a storm hits Bharati for three days?" Autonomy 214 ±18 → 187 ±20 d. Risk AMBER → RED. **LSOD moves nine days closer, from next month into next week.** |

**Beats 4–6 are one continuous 90-second sequence. Rehearse them as one.**

**The line to land on Beat 8:**
> *"We never pretend that unavailable telemetry is real. We show exactly what the platform knows, how fresh it is, and where it came from."*

**The line to land on Beat 9:**
> *"The weather stopped being a weather report and became a procurement deadline."*

**The positioning line for the judges:**
> *"We built a Digital Twin for remote operations. It integrates the four domains named in the PS, shows the relationships between them, turns important changes into actionable operations, and remains useful when HQ temporarily loses the station link."*

---

## 15. Global acceptance checklist

Run this before every demo and before submission.

### Trust
- [ ] Every number on every page carries a provenance badge.
- [ ] Hovering any badge explains class, source, timestamp, age, and — for MODELED — the formula and every parent with its own class.
- [ ] No value blends LIVE and SYNTH inputs without being labelled MODELED.
- [ ] Every CSV/PDF/JSON export carries provenance.
- [ ] The data-source register's "n of m feeds live" line matches reality.

### Both stations
- [ ] Bharati and Maitri are visible simultaneously on `/`, `/logistics`, `/compliance`, `/actions`, `/comms`.
- [ ] A Maitri item can outrank a Bharati item in every priority ordering.
- [ ] Switching primary station re-scopes every station-specific panel without a full reload.

### Offline
- [ ] `/station` is fully usable with the network disabled in devtools.
- [ ] Flipping the dev connectivity toggle to DARK leaves every HQ page rendering last-known state, labelled DARK, with no empty panels.
- [ ] Offline transitions queue, show as pending, and replay in tier order.
- [ ] Interrupting a drain mid-batch and resuming produces no duplicates.
- [ ] A stale station never produces a confident derived deadline.

### One engine
- [ ] Autonomy on `/`, `/logistics`, `/stations/:id/twin` and `/station` agree exactly.
- [ ] The causal trace on the twin, the action drawer, `/environment` and `/assets` agree for the same inputs.
- [ ] Every engine constant is editable on `/settings`.

### Colour & accessibility
- [ ] No orange pixel refers to anything other than "act on this".
- [ ] Glow never tints a number, bar, badge or dot.
- [ ] In greyscale, every status is readable from its label.
- [ ] Text contrast ≥ 4.5:1; targets ≥ 40px; full keyboard operability with a visible focus ring.
- [ ] `prefers-reduced-motion` disables camera easing, hover lift and pulsing.

### Honesty
- [ ] The string "blockchain" appears nowhere in UI, code or exports.
- [ ] The words "AI prediction" and "trained" appear nowhere.
- [ ] No failure probability, RUL or predictive-maintenance claim exists.
- [ ] The sandbox banner is visible at every scroll position; nothing it does reaches an operational store.
- [ ] Every 3D surface is labelled "low-poly operational model — not an as-built survey".

---

## 16. Open questions for NCPOR

**These answers should determine the final MVP, not assumptions made by the development team.** Getting even three answered before locking scope is worth more than a week of building.

1. What systems or dashboards are currently used at HQ?
2. What infrastructure, energy, logistics and environmental data can HQ currently see?
3. Which information is real-time, which periodic, which manually reported?
4. What does "remote management" actually involve in practice?
5. What decisions and actions does HQ make using station information?
6. Which information is difficult to consolidate today?
7. What happens operationally during communication loss?
8. Which station systems can generate data that could feed a Digital Twin?
9. Are there existing station-integration or Digital Twin initiatives?
10. What would an engineer consider the three most valuable capabilities in a remote-management platform?

Additionally, to replace SYNTH parameters with confirmed values (see `/settings`):

- Procurement lead time, cargo consolidation time, transit duration to each station, unloading duration.
- Actual ship/flight windows per season and cargo capacity.
- Generator rated capacity and efficiency; station baseline electrical load.
- Building U-values and heated areas per zone.
- Realistic link availability, pass schedules and bandwidth.
- Per-tier acknowledgement expectations for operational SLAs.

---

*End of specification. Antarasetu — SIH 2026, PS 26060.*
