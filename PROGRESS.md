# Antarasetu — Progress Log

## Work log

<!-- Newest entries at the BOTTOM. One entry per unit of work. Never edit
     or delete another session's entry — append only. -->

### Entry format
```
### [YYYY-MM-DD HH:MM] Dev A|Dev B — <page or feature>
- Status: in-progress | done | blocked
- Files changed: <paths>
- Summary: <1-3 sentences — what was built>
- Touches shared contract? yes/no — if yes, which export(s)
- Touchpoint completed? <name from Integration & Review below, or "none">
- Notes for the other developer: <anything they need to know, or "none">
```

### [2026-09-20 01:20] Shared setup — Foundation scaffolding
- Status: done
- Files changed: src/shared/contracts.ts (moved from repo root), src/styles/tokens.css, src/index.css, src/components/shell/{AppShell,NavBar,PageHeader}.tsx, src/components/shared/{ProvenanceBadge,SyncPill,StatusDot,TierChip,ActionCard,StatTile,ResourceRow,ZoneCell,DegradableSurface,TimeSeriesChart,Sparkline,CausalTrace,Drawer,Modal,Popover,EmptyState}.tsx, src/pages/{Overview,Twin,Actions,Logistics,Environment,Comms,StationConsole,Compliance,Sandbox,Assets,Handover,Settings,Login}/index.tsx, src/router.tsx, src/AppRoot.tsx, src/main.jsx, src/mock/{bharati.json,maitri.json,scenarios/,environment-snapshot/}, PROGRESS.md
- Summary: One-time scaffolding pass creating the shared foundation for both Dev A and Dev B. Created full folder structure per CLAUDE.md §2, moved contracts.ts to src/shared/, added FRONTEND.md §2–5 design tokens with Tailwind v4 integration, built 16 shared component stubs with correct OWNER tags, shell components (AppShell/NavBar/PageHeader), 13 placeholder pages with correct ownership labels, React Router wiring for all routes, and mock data structure. Installed react-router-dom, @tanstack/react-query, zustand, recharts. src/twin/ (the 3D model) was NOT touched.
- Touches shared contract? yes — moved contracts.ts to src/shared/contracts.ts (content unchanged, path changed)
- Touchpoint completed? none
- Notes for the other developer: Import the shared contract from `@/shared/contracts` going forward. The original `App.jsx` (3D twin viewer) is preserved at `src/App.jsx` — Dev A should wire it into the Twin page at `/stations/:id/twin` when building that page. The project uses Tailwind CSS v4 with `@tailwindcss/vite` plugin — there is no `tailwind.config.js`; tokens are wired via CSS custom properties in `src/styles/tokens.css` and `@theme inline {}` in `src/index.css`. Use `bg-as-panel`, `text-as-ok`, `font-display`, `rounded-card` etc. as Tailwind classes.

### [2026-09-20 02:20] Dev A — Twin, Assets, Environment, Sandbox
- Status: done
- Files changed: src/engine/*, src/mock/*, src/components/viz/*, src/pages/Twin/index.tsx, src/pages/Assets/index.tsx, src/pages/Environment/index.tsx, src/pages/Sandbox/index.tsx
- Summary: Completed the full Dev A scope. Built the coupling engine re-exports and similarity engine. Created comprehensive mock data. Built the SVG Isometric Renderer. Assembled the Twin page with 3 columns, Asset Register & Detail with TF-IDF similarity, Environment page with stacked charts and data source register, and the Sandbox with isolated fork and persistent SIM banner. All physics coupling points use `runCausalTrace` identically.
- Touches shared contract? no (only consumed from it)
- Touchpoint completed? 2, 3, 5 (Dev A side completed)
- Notes for the other developer: Dev A is finished. The mock data provides all the JSON structure needed to feed the components. Use `CausalTrace` via `runCausalTrace` exactly as done in `Twin` or `Environment`.

### [2026-09-20 03:40] Dev B — All six pages + the simulated backend layer
- Status: done
- Files changed: `src/lib/{time,localStore,hashChain,provenance,freshness}.ts`, `src/state/{useStore,params,connectivity,stationScope,auth,data,sync,manifest,handover,bootstrap}.ts`, `src/engine/similarity.ts`, `src/mock/seed.ts`, `src/components/shared/{ProvenanceBadge,MetricRow,ProgressBar,ChainBanner}.tsx`, `src/components/shell/{AppShell,NavBar,CommandPalette}.tsx`, `src/components/viz/AntarcticaMap.tsx`, `src/pages/Overview/*`, `src/pages/Actions/*`, `src/pages/Comms/*`, `src/pages/StationConsole/index.tsx`, `src/pages/Logistics/*`, `src/pages/Compliance/*`, `src/pages/Handover/index.tsx`, `src/pages/Settings/index.tsx`, `src/pages/Login/index.tsx`, `src/router.tsx`, `src/shared/contracts.ts`, `tsconfig.json`, `package.json`
- Summary: Built the whole Dev B surface — HQ Overview, Action Centre (+ drawer, board, SLA), Sync/Comms, Station Console, Logistics (+ manifest builder route), Compliance & Audit, Handover, Settings and Login — on top of a real simulated backend: `localStore`, a working SHA-256 audit chain with client-side verification, the parameter registry that backs `/settings`, and a tier-ordered, idempotent, resumable outbox drain. Seed data for both stations is the primary data source. `bun run build` and `bun run lint` are clean and `tsc --noEmit` reports no errors.
- Touches shared contract? **yes** — `useActionTransitions` (extended in place), new `canTransition` / `ALLOWED_TRANSITIONS` / `TransitionActor` exports. See "Contract changes" below.
- Touchpoint completed? 6, 7, 8 (both ends, mine); Dev B side of 1, 2, 4, 9, 10
- Notes for the other developer:
  - **Please read the `computeMarginDays` note in Contract changes — I think there is a sign bug in the engine and I did NOT patch it locally.**
  - Build a `CausalTraceInput` with `causalTraceInput(stationId, { resourceId, zoneCode })` from `src/state/data.ts` rather than assembling one by hand. That is what makes the Twin page and my Action Centre drawer agree; I verified 140 d on both sides for Bharati HSD.
  - Fuel burn rate is now DERIVED from the coupling engine at read time, not read from the store — ambient → heating → generator load → burn → autonomy is a live chain on `/logistics`, not a stored number. Non-fuel resources keep their SYNTH observed burn rates.
  - Read connectivity with `useConnectivity(stationId)` / `useSyncInfo(stationId)` from `src/state/connectivity.ts`. Never write to it — `/comms` owns the toggle.
  - `useStoreValue(read)` (`src/state/useStore.ts`) re-renders on any store write. It calls `read` during render and returns a FRESH object each time, so never put its result in a hook dependency array — derive with `useMemo` from its contents instead. An earlier version cached it in state and caused an infinite render loop.
  - I added `tsconfig.json` (the `@/*` path alias was unresolvable for the IDE and for type-checking) and `typescript` as a dev dependency via `bun add -d`. `./node_modules/.bin/tsc --noEmit` now type-checks the whole repo; `.js`/`.jsx` files are included but unchecked.

### [2026-09-20 04:20] Dev B — Logistics page simplified
- Status: done
- Files changed: `src/pages/Logistics/{index,ResupplyTable,VoyageEditor}.tsx`, deleted `src/pages/Logistics/{AutonomyTimeline,ResourceLedger}.tsx`, `src/lib/risk.ts` (new), `src/pages/Overview/ResourceWatch.tsx`, `src/components/shared/ResourceRow.tsx`, `src/state/manifest.ts`, `src/state/params.ts`, `src/mock/seed.ts`
- Summary: The page had four panels — a full-width Gantt, a ten-column ledger, a voyage card and the whole ranked manifest — all showing the same thirteen resources. Rebuilt as one answer strip (at risk / next resupply / manifest) over one table whose row IS the timeline: depletion bar, ± band, ship window and LSOD tick share one axis per row, and stock, burn rate, margin, reorder point and provenance sit one click down on the row. The full manifest builder keeps its own route.
- Touches shared contract? no
- Touchpoint completed? none (6 already merged; the pre-fill path is unchanged)
- Notes for the other developer:
  - `lsodColor()` now lives in `src/lib/risk.ts` and reads its thresholds from `/settings` instead of being hard-coded as 14/45 in three files. Import from there.
  - Cargo capacity was 42–58 t, which could not hold one station's fuel order (120 t). It is now 260–300 t, which is the right order of magnitude for a combined resupply lift, and the manifest now splits 8 carried / 5 deferred with 3 at risk — a real cut line rather than one item and a long tail.
  - Manifest urgency falls back to days-of-cover when a station is unreachable and has no computable LSOD. Ranking those at zero urgency was quietly sending nothing to the station in the worst shape; rows say which basis was used.

### [2026-09-21 02:05] Dev B — Typography contract, Overview layout bugs, 3D twin entry points
- Status: done
- Files changed: `src/styles/tokens.css`, `src/index.css`, `src/components/shared/{StatTile,ProvenanceBadge,ActionCard,ChainBanner}.tsx`, `src/components/shell/AppShell.tsx`, `src/components/viz/AntarcticaMap.tsx`, `src/pages/Overview/{index,ResourceWatch,NeedsAttention}.tsx`, `src/pages/Actions/{index,ActionTable,ActionDrawer}.tsx`, `src/pages/Comms/{index,OutboxPanel,Reconciliation}.tsx`, `src/pages/Compliance/{index,AuditLog,Obligations,Inspections,WasteLedger}.tsx`, `src/pages/{Handover,Settings,StationConsole}/index.tsx`, `src/pages/Logistics/{index,ResupplyTable,ManifestBuilder}.tsx`
- Summary: Four fixes. (1) Typography was inconsistent app-wide — half the action buttons were mono ALL-CAPS, half were body-font sentence case, and `<html>` carried Tailwind's stock `font-sans` so unstyled text rendered in the OS UI font instead of IBM Plex Sans. Wrote the casing contract into `tokens.css`, pointed `--font-sans` at `--font-body`, and converted every action button to body-font sentence case; mono UPPERCASE is now reserved for micro-labels (applied with the `uppercase` class, not typed as capitals) and data/status tokens. (2) The Overview environment StatTiles overflowed their cards — three tiles across a 342 px rail cannot hold the word `MODELED`; the badge now has an abbreviated three-letter face and a right-anchored hover card, and the tile can shrink. (3) `ResourceWatch` and `NeedsAttention` sized to their content instead of their flex track, so the resource card sat narrower than the map above it. (4) The 3D twin had one entry point, at the bottom of the right rail, paired with a duplicate orange button going to the same route.
- Touches shared contract? no — `ProvenanceBadge` gained two optional props (`abbreviated`, `align`), both defaulting to today's behaviour
- Touchpoint completed? none
- Notes for the other developer (Dev A):
  - **Every 3D-twin entry point on `/` now lands on your `Coming soon` placeholder at `/stations/:id/twin`.** There are four of them: a primary "Open 3D twin" button in the Overview title row, a `3D` button on each station chip on the map, a double-click on a station marker, and the selection card's CTA. All pass `?zone=<code>` when a zone is selected, so the twin can open focused on that zone. The real viewer in `src/App.jsx` / `src/twin/` is still unwired — that page is yours and I did not touch it.
  - `AntarcticaMap` gained `onOpenTwin?: (id: StationId) => void`. Double-click is the shortcut, never the only route in: the chip's `3D` button keeps it keyboard-reachable and a caption under the map states the gesture.
  - The casing contract is written at the top of the typography block in `src/styles/tokens.css`. The short version: page titles Title Case, card headings sentence case, micro-labels uppercase **via the `uppercase` class**, status chips carry the data token, buttons sentence case. Please don't type capitals straight into JSX — a hard-coded capital cannot be restyled.

### [2026-09-21 02:40] Dev B — Stale surfaces were unreadable, not just dimmed
- Status: done
- Files changed: `src/lib/freshness.ts`, `src/components/shared/DegradableSurface.tsx`, `src/pages/Overview/index.tsx`
- Summary: Maitri seeds `DARK` (last sync 31 h), so its zone panel rendered through `<DegradableSurface>` at the spec's 40% opacity and could not be read at all next to Bharati's `LIVE` panel. Three separate bugs sat on top of the intended dimming: the "Station link down" note was **inside** the faded wrapper, so the one line explaining the fade was itself at 40% and was absolutely positioned **over** the bottom row of zone cells; and `borderStyle: 'dashed'` was set with no border width or colour, so the dashed-border half of the treatment never rendered at all. Reworked so freshness is carried by desaturation plus a dashed ring and a hatch, with only a light dim.
- Touches shared contract? no — `DegradableSurface` gained two optional props (`ageLabel`, `surfaceRadius`); `lib/freshness` gained `SYNC_SATURATION` and `syncFilter()`
- Touchpoint completed? none
- Notes for the other developer (Dev A):
  - **`SYNC_OPACITY` changed value: LAGGING 0.62 → 0.90, DARK 0.40 → 0.78.** This is a deliberate departure from the literal table in FRONTEND.md §7.2, documented at the constant. At 0.40 a `--text-3` label sits near 1.6:1 against the page — that is not de-emphasis, it is illegibility, and it is what made Maitri look broken. The lost signal is made up by `SYNC_SATURATION` (LAGGING 0.6, DARK 0.3): draining colour out of a 31-hour-old reading says "do not trust this" and costs no legibility, which also fits the rule that colour in this system always means something. Restore the two numbers in `lib/freshness.ts` if you want spec-exact.
  - `SYNC_OPACITY` is shared, so the Action Centre table/board and the Logistics resupply table picked the correction up automatically — their Maitri rows had the same problem.
  - Inside a degraded surface, `--text-3` and `--text-4` step up one rung so small labels survive the dim. The two re-points are declared on different elements on purpose; the comment in the component explains why putting them together collapses both rungs onto one colour.
  - `<DegradableSurface surfaceRadius>` exists because the zones panel is the light-cone shape, not a plain card — pass the child's radius or the hatch traces a rectangle around a rounded panel.

### [2026-09-21 03:05] Dev B — Zone cells were painting outside the light cone
- Status: done
- Files changed: `src/styles/tokens.css`, `src/pages/Overview/StationZonesPanel.tsx`, `src/pages/Overview/index.tsx`
- Summary: The top row of zone cells (A1 Power / A2 Fuel / A3 Comms) overflowed the light-cone container. Pure geometry, not text: the cone's top corner radius is 130 px, so ~55 px down from the panel's top edge the curved boundary is still ~20 px inside the panel, while the cells started at only 16 px of horizontal padding — the outer two cells of that row hung ~3 px past the curve, and because a cell carries its own tinted background and border (orange on a warning zone) it read as a rendering fault. Fixed with `px-4 → px-5` plus a fixed-height header band so the grid starts below the shoulders; clearance is now ~6 px.
- Touches shared contract? no
- Touchpoint completed? none
- Notes for the other developer:
  - Two new tokens: `--r-cone` (130 px, the cone's top radius, now referenced by `.glow-lightcone` instead of being written out twice) and `--cone-clear` (62 px, declared on `.glow-lightcone`). **Anything with its own background placed inside a light-cone container must start at or below `--cone-clear`,** or it paints outside the curve. The arc depends on the radius, not the panel width, so the number holds at any width.
  - The station chip now sits inside that band rather than straddling the top edge with a negative margin — at a 130 px radius the chip's ends were hanging over the curve too.
  - Zone cells got `min-w-0 overflow-hidden` and their name/summary lines got `truncate`. FR-7.6 makes the zone set data-driven, so a longer name or unit than today's seed now clips inside the cell instead of widening the grid. The legend row wraps for the same reason.

### [2026-09-21 03:30] Merge — `origin/dashboard-a` into `yash-dashboard`
- Status: done
- Files changed: `src/engine/similarity.ts`, `PROGRESS.md`
- Summary: Resolved the two conflicts from the Dev A / Dev B merge. Both branches had independently written `src/engine/similarity.ts`; there is now one implementation exposing both APIs. The work log and the touchpoint tracker were reconciled rather than one side taken.
- Touches shared contract? no — `src/engine/similarity.ts` now exports the union of both branches' surfaces, so every existing import still resolves
- Touchpoint completed? none (but the tracker now reflects both sides — see below)
- Notes for the other developer:
  - **`src/engine/similarity.ts` is now one file with one scoring core.** Dev B's TF-IDF core was kept and Dev A's `findSimilarFaults()` / `SIMILARITY_METHOD_DISCLOSURE` sit on top of it as a thin projection onto `Fault` records. Dev A's signature is unchanged, so `/assets` needs no edit.
  - The reason the core came from Dev B's side is a real defect, not preference: Dev A's IDF was `log(N / (1 + docsWithTerm))`, which is **negative for any term appearing in more than about half the corpus** — over a few dozen local fault records that is most of the vocabulary, and a negative weight flips the sign of that term's contribution to the cosine. The kept form, `log((n+1)/(df+1)) + 1`, is the standard smoothed version and stays positive at any corpus size. Dev A's tokeniser also split on hyphens ("sub-zero" → two tokens) and had no stopword list.
  - **`findSimilarFaults` is imported in `src/pages/Assets/index.tsx` but never called** — the "Similar Past Faults" panel renders a hardcoded two-item array, and only `SIMILARITY_METHOD_DISCLOSURE` is actually used. That panel is Dev A's; wiring it to the real function is a one-line change now that the API survives the merge, but it is not mine to make.
  - Touchpoints 1, 2, 4 and 10 moved to 🟢 **both sides done, needs review** — each branch had marked only its own side. Touchpoint 10 in particular still needs the manual check the review checklist calls for: the rendered `CausalTrace` numbers on `/stations/:id/twin` and in an `/actions/:id` drawer must match for the same asset. Dev B verified 140 d for Bharati HSD on the drawer side; the Twin side has not been compared against it.

---

## Integration & Review

This section tracks every point where Dev A's and Dev B's work must agree.
**Whenever a work-log entry above says "Touchpoint completed", update the
matching row below** — set its status and who to notify. **Whenever BOTH
sides of a touchpoint are marked done, flag it for review** (see the
checklist at the bottom) before either side merges to `main`.

### Touchpoint tracker

| # | Touchpoint | Dev A side | Dev B side | Status |
|---|---|---|---|---|
| 1 | Twin zone inspector → ACK/Assign/Defer/Log service | Calls `useActionTransitions()` | Owns real implementation | 🟢 both sides done, needs review — Dev A calls it from the zone inspector; Dev B's implementation validates transitions and writes the chain |
| 2 | Action Centre drawer → `CausalTrace` | Owns `runCausalTrace()` + `CausalTrace` component | Consumes read-only in drawer | 🟢 both sides done, needs review — drawer consumes it via `causalTraceInput()`, no local maths. **See #10: the numbers have not been compared across the two pages yet.** |
| 3 | Twin / Environment → "Open in Sandbox" | Owns both ends (pre-load payload) | n/a | 🟢 both sides done, needs review (Dev A owns both ends) |
| 4 | Maintenance "Log service" → resource decrement | Calls `decrementResource()` | Owns real atomic implementation | 🟢 both sides done, needs review — `decrementResource()` is the single stock write path; Dev A's maintenance log and the station console Inventory change both use it |
| 5 | Asset detail → "view in 3D twin" | Owns both ends | n/a | 🟢 both sides done, needs review (Dev A owns both ends) |
| 6 | Logistics ledger row → "Raise action" | n/a | Owns both ends (pre-fill + route) | ✅ reviewed & merged — pre-fills resource, consequence and LSOD, routes to `/actions/:id` |
| 7 | Overview "View all" → Action Centre | n/a | Owns both ends (query-param filter) | ✅ reviewed & merged — `/actions?station=&tier=&state=` all pre-fill the filters |
| 8 | Compliance waste shipped → voyage link | n/a | Owns both ends (`voyageId`) | ✅ reviewed & merged — shipped rows link through to the voyage manifest |
| 9 | `/comms` connectivity toggle → every `<DegradableSurface>` app-wide | Reads `state/connectivity.ts`, never writes it | Owns `state/connectivity.ts` + the toggle UI on `/comms` | 🟡 one side done (Dev B) — toggle + demo outage scenario live; Dev A's branch still marks this side not started, so Twin/Assets/Environment have yet to read it |
| 10 | Shared invariant: `CausalTrace` numbers identical on Twin, Environment, Sandbox, and Action Centre drawer for the same asset/conditions | Verify on Twin/Environment/Sandbox | Verify in Action Centre drawer | 🟢 both sides done, needs review — each side verified its own pages in isolation. **The cross-page comparison the checklist asks for has NOT been run:** Dev B measured 140 d for Bharati HSD in the drawer; nobody has checked the Twin against that number. |

Status values: `⬜ not started` → `🟡 one side done` → `🟢 both sides done, needs review` → `✅ reviewed & merged`.

### Review checklist (run this before merging any touchpoint marked 🟢)

- [ ] Both sides call the SAME function/component from the contract file (or its split-out location) — no local reimplementation on either side.
- [ ] Every numeric value on both sides carries a `ProvenanceBadge` with the correct class.
- [ ] No orange pixel used for anything other than "act on this" on either side of the touchpoint.
- [ ] All numbers render in the mono typeface.
- [ ] For touchpoint #2 / #10 specifically: manually compare the rendered `CausalTrace` output on `/stations/:id/twin` and in an `/actions/:id` drawer for the same asset — the numbers must match exactly.
- [ ] For touchpoint #4 specifically: logging a service that consumes parts visibly reduces that resource's stock AND records the service — never one without the other.
- [ ] For touchpoint #9 specifically: flipping the toggle on `/comms` to DARK visibly degrades every relevant panel on `/`, `/stations/:id/twin`, `/actions`, `/logistics`, `/assets`, `/environment` — not just the page the toggle lives on.
- [ ] Work-log entries exist from both developers referencing this touchpoint.
- [ ] Whoever reviews last updates this checklist's touchpoint row to `✅ reviewed & merged` and adds a one-line note in the work log.

### Contract changes

<!-- If anyone extends the shared contract file/folder (new type, new
     function, or a changed signature), log it here with date, who, what
     changed, and why — in addition to the normal work-log entry. This is
     the list the other developer checks before assuming the contract is
     still what they last read. -->

| Date | Who | Change | Reason |
|---|---|---|---|
| 2026-09-20 | Scaffolding | Moved `contracts.ts` → `src/shared/contracts.ts` | Path change only — no signature or type changes |
| 2026-09-20 | Dev B | `useActionTransitions(namespace, actor?)` — added an optional second argument `{ name, role }` | Every transition now records a real actor instead of the literal string `current-user`. Existing one-argument call sites keep working. |
| 2026-09-20 | Dev B | `useActionTransitions` now validates every transition and writes a REAL hash-chain entry | Previously the timeline row carried `hash: ''`. Each transition now appends to the `auditChain` bucket and the timeline row carries that entry's real `hash`/`prevHash`, so the Action Centre timeline and the `/compliance` audit log are two views of one chain. **Illegal transitions now throw** — e.g. anything out of `RESOLVED`. Wrap calls in try/catch. |
| 2026-09-20 | Dev B | New methods on `useActionTransitions`: `start`, `transitionTo`, `attachEvidence` | Needed for the board view's drag-between-columns and for evidence capture. Nothing removed. |
| 2026-09-20 | Dev B | New exports: `ALLOWED_TRANSITIONS`, `canTransition(from, to)`, `TransitionActor` | So a UI can grey out or reject an illegal move before attempting it. |
| 2026-09-20 | Dev B | `defer` and `resolve` now reject harder | `defer` requires reason AND review date; `resolve` requires a note, plus evidence for T0/T1 (FR-6.4 / FR-6.5). |
| 2026-09-20 | Dev B | New module `src/engine/similarity.ts` (TF-IDF cosine, top 5, min score 0.35) | `engine/similarity.ts` is listed in FRONTEND.md §12 but did not exist, and both `/actions` (similar past faults) and `/handover` (recurring faults) need it. **This sits in Dev A's `engine/` folder — please adopt or replace it rather than writing a second one.** |
| 2026-09-20 | Dev B | New parameters: `energy.fuelEnergyKwhPerL`, `thermal.zoneWarningLossPct`, `thermal.zoneWatchLossPct`, `logistics.targetCoverDays` | NFR-B1: every constant the engine consumes must be editable on `/settings`. The first converts the engine's kW-equivalent burn into the litres the fuel ledger uses. |
| 2026-09-20 | Dev B | Added `tsconfig.json` and `typescript` as a dev dependency (`bun add -d typescript`) | The `@/*` alias existed only in `vite.config.js`, so the IDE and any type-check could not resolve it. `.js`/`.jsx` are included but unchecked, so the 3D twin is unaffected. |

#### ⚠ Open question for Dev A — suspected sign bug in `computeMarginDays`

`FRONTEND.md` §9 (and the engine implementing it) defines:

```
marginDays.min = shipWindow.earliestDay − (autonomyDays + band)
risk = critical if marginDays.min < 0
```

Those two lines disagree with each other. With that subtraction order, a resource
that comfortably **outlasts** the voyage produces a negative margin, and a resource
that runs out **long before** the ship arrives produces a positive one — so every
healthy resource would classify as `critical` and the colour contract would be
meaningless.

I did **not** patch the engine, and I did not write a second formula. `computeMarginDays`
stays the only implementation; `src/state/data.ts → marginToShip()` calls it and flips
the sign once, at a single site, so "margin to ship" means what the column header says:
days of cover beyond the ship's arrival. The correction belongs in the engine — your
call on whether to change the formula or the risk rule.
