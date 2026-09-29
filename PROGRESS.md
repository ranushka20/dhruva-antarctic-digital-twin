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

### [2026-09-21 04:15] Dev B (in Dev A's page, at the user's request) — Research Sandbox rebuilt
- Status: done
- Files changed: `src/pages/Sandbox/index.tsx` (rewritten), `src/state/sandbox.ts` (new), `src/mock/scenarios/presets.json` (rewritten), `src/state/params.ts`
- Summary: The Sandbox had four sliders, two of which moved nothing, and its own visual language. Rebuilt as ten parameters in four groups, each with one documented path into the coupling engine, in the same layout/tokens/casing as every other page.
- Touches shared contract? no — `src/shared/contracts.ts` is unchanged. `state/params.ts` gained one registry entry and one type export.
- Touchpoint completed? none — but see #10 below
- Notes for the other developer (Dev A — **this is your page, I edited it because the user asked directly**):
  - **Two of the four old sliders were dead.** `crewSize` lived in React state and was never passed to `runCausalTrace`. `windSpeed` was passed as `windKmh` — but **`runCausalTrace` accepts `windKmh` and never reads it**; the trace derives everything from `ambientTempC`. Only ambient temperature and resupply delay did anything. Worth knowing generally: any page passing `windKmh` expecting it to matter is passing a no-op.
  - New module `src/state/sandbox.ts` holds the scenario model. `PARAMETERS` is a declarative list — label, unit, bounds, bound source, and a one-line `mechanism` string shown in the UI. Levers reach the engine either by overriding a registry parameter through `withSandboxParams` (which persists nothing — NFR-8.4 is satisfied at the state layer, not by disabling buttons) or by adjusting a `CausalTraceInput` field. **No number on the page is computed outside `runCausalTrace`.**
  - **The invariant to preserve if you add a lever:** at baseline values, the scenario result must equal the baseline result exactly. Wind and renewable mix are therefore applied as a *delta against their own baseline*, not as a raw factor — otherwise the page would show a difference on load and "0 of 10 parameters changed" would be a lie.
  - Wind is modelled as a wind-chill delta on T_avg using the engine's own `computeWindChill`. That is an approximation of raised envelope loss, not a real infiltration model, and the UI says so under the slider. If you want it properly, the mechanism is a wind-dependent film coefficient on U, and it belongs in the engine.
  - **New registry parameter `energy.perPersonLoadKw` (0.8 kW/person, SYNTH).** Crew size had no path into the engine at all without it. It appears on `/settings` under Energy as an unconfirmed assumption, which is where an assumption like that belongs.
  - Zone impact is now engine-derived: each zone is re-run with its own envelope penalty, baseline and scenario, and the risks compared. The old version hardcoded `ambientTemp < -40 ? 'critical' : ...` against zone A1.
  - `presets.json` was rewritten to the new parameter keys and now uses `set` / `delta` so "Crew +6" is relative and works at either station. Still pure data (FR-7.2).
  - `TimeSeriesChart` takes a **single** `TimeSeriesPoint[]`, not an array of series objects — the old Sandbox passed `[{id,name,data,color},…]`, which was one of the type errors. The depletion chart is now inline SVG because it needs two lines, ± bands, the ship window and LSOD markers.
  - **Touchpoint 10 is now easy to check:** the Sandbox's BEFORE column is `runCausalTrace(causalTraceInput(stationId))` with nothing overridden, so it must equal the Twin's trace and the Action Centre drawer's for the same station. If those three ever disagree, the Sandbox will show it immediately.
  - **Violet is a provenance class, not this page's accent colour.** I had it on the changed-parameter chip, the group badges, the slider accents, the toast, the trace deltas, the zone row borders and the scenario card border — none of which are simulated *values*. It now appears in exactly four places, all of them spec'd: the banner (FR-1.1), the `SIM` badge on every AFTER value (FR-4.4, via the shared `ProvenanceBadge`), the scenario line/band/LSOD tick on the chart (FR-5.3) and the zone `SIM` marker (FR-8.2). Changed-parameter state now reads as neutral emphasis, the toast is the same mint confirmation the other pages use, and trace deltas use orange-worse / mint-better like every other delta in the product. The banner also matches `ChainBanner`'s geometry now — same 14% tint, same padding, body-font text — with only the safety label kept mono and letter-spaced.

### [2026-09-28 18:05] Shared (both devs' pages, at the user's request) — Type scale: nothing below 11px
- Status: done
- Files changed: `src/index.css` (type scale in `@theme`), `src/lib/utils.js` (`cn` knows the new sizes), `src/components/viz/AntarcticaMap.tsx`, `src/pages/Actions/ActionTable.tsx`, `src/components/shared/StatTile.tsx`, plus a mechanical class rename across ~60 files in `src/pages/`, `src/components/` and `src/twin/`.
- Summary: The UI used 26 ad-hoc sizes, and ~490 elements were at 8–10.5px. Replaced every `text-[Npx]` with an 8-step role-based scale: `text-micro` 11 · `caption` 12 · `body-sm` 13 · `body` 14 · `title` 16 · `headline` 20 · `display` 28 · `hero` 32. Wide tracking on mono uppercase labels (0.08–0.14em) is now `tracking-label` (0.06em). Mono was also removed from prose, names, form controls and buttons on Assets, Twin, Environment and Station Console; it stays on numbers, IDs, codes and micro-labels.
- Touches shared contract? no
- Touchpoint completed? none
- Notes for the other developer:
  - **Don't write `text-[9px]` again.** Pick a size by role from the comment block above `--text-micro` in `src/index.css`. If a new size name is ever added there, add it to the `extendTailwindMerge` list in `src/lib/utils.js` too — otherwise `cn('text-caption text-muted-foreground')` reads `text-caption` as a colour and silently drops it.
  - `AntarcticaMap` draws in a 1000-unit viewBox but renders ~500px wide, so its labels and chips were halved on screen. They are now counter-scaled via `useViewBoxUnit` and render at their real CSS size at any panel width.
  - Back-button labels no longer include `← ` — `PageHeader` already draws the arrow.
  - Pre-existing, not fixed here (Dev A): `src/pages/Environment/index.tsx` renders `StatTile` without `value`/`unit`, so the five current-conditions tiles show "—"; `tsc` also flags `Twin` and `Assets` passing `compact` to `ActionCard` and `trend` to `StatTile`, which neither accepts.

### [2026-09-28 18:30] Shared (both devs' pages, at the user's request) — Motion system: route transitions, loading states, button states
- Status: done
- Files changed: `src/styles/motion.css` (new, imported from `index.css`), `src/hooks/usePresence.ts`, `src/components/shared/{ActiveIndicator,AsyncButton,Loading,RollingValue}.tsx` (new), `src/components/shell/navTabs.ts` (new — NAV_TABS/getActiveTab moved out of NavBar), NavBar, AppShell, PageHeader, `router.tsx`, Drawer, Modal, Popover, ProgressBar, StatTile, SyncPill, ZoneCell, `station/viewport-skeleton.jsx`; pages: Actions (index, ActionDrawer), Compliance (index, AuditLog, WasteLedger), Comms (index, OutboxPanel), Settings, Handover, Sandbox, Logistics (index, Manifest), StationConsole, Twin, Environment — each a small, local edit.
- Summary: One motion vocabulary for the whole app, modelled on the ~/Temp-ui-comps kit. Top-level route changes fade + slide 14px in nav-tab order (left/right), sections assemble with a 30ms stagger; the nav pill is a clip-path over a duplicate tab layer so pill and label colour move together. Every in-page tab bar / segmented control (Compliance tabs, Table↔Board, chart↔table, Settings rail, LIVE/LAGGING/DARK, all station-scope pickers) has a sliding `ActiveIndicator`, and switched tab content fades in. Drawer / Modal / Popover / account menu / Action drawer animate in AND out (`usePresence` keeps them mounted for the exit, with their last content). Route Suspense and bootstrap show a synced-shimmer `PageSkeleton`; long work shows `PixelLoader` (pixel wavefront + shimmer label + elapsed timer). All buttons get press feedback (scale 0.97, icons 0.9) and a mint `:focus-visible` ring (NFR-G5) from one unlayered rule; real async buttons (Verify chain, Drain now, Generate capsule, acknowledge, Rebuild demo data) use `AsyncButton` (spinner only after 120ms → drawn check → idle; errors shake). StatTile values roll per changed digit; progress fills wipe in; LIVE dots breathe; the T0/T1 bell dot pings.
- Touches shared contract? no
- Touchpoint completed? none
- Notes for the other developer: (1) New segmented controls: make the container `data-segmented className="relative isolate …"`, put `aria-pressed`/`aria-selected` on each button, drop the inline active `backgroundColor`, and add `<ActiveIndicator style={{ backgroundColor: … }} />` as the last child. (2) New overlays: use `Drawer`/`Modal`, or `usePresence` + the `m-backdrop`/`m-sheet`/`m-dialog`/`m-pop` classes, and mark fixed overlays `data-overlay` so the page stagger skips them. (3) Enter keyframes use `backwards` fill on purpose — a leftover transform on a page wrapper would trap every `position: fixed` child. (4) Command palette deliberately does not animate (keyboard-driven). (5) `prefers-reduced-motion` still kills all motion via the existing rule in `index.css`, now also zeroing animation delays so staggered items never sit invisible. (6) `tsc` still reports the 17 pre-existing errors in Twin/Environment/Assets/IsoStationModel — none introduced here.

### [2026-09-28 19:10] Shared (every page, at the user's request) — Readability pass for an older audience
- Status: done
- Files changed: `src/index.css` (type scale + `--spacing`), `src/styles/tokens.css` (text/line contrast), `src/styles/motion.css`, `src/main.jsx`, `src/state/textSize.ts` (new), NavBar, PageHeader, AppShell, CommandPalette, shared Modal/Drawer/Popover/ChainBanner/DegradableSurface/ActionCard/ProvenanceBadge/StatTile/ResourceRow/EmptyState/MetricRow/CausalTrace; every page folder under `src/pages/` (Overview, Actions, Logistics incl. Manifest, Comms, Compliance, Handover, Settings, Twin, Assets, Environment, Sandbox, StationConsole, Login).
- Summary: The user reported the UI as cluttered for its mostly older users. Type scale raised to body 15 / title 17 / headline 20 / display 26 / micro 11.5 (a first pass at 16px body was judged too big and stepped back one notch); `--spacing` 0.26rem; `--text-4` raised from 4.1:1 (failed AA) to ~6:1 and `--text-2/3` brightened. New "Aa · Text size" control in the NavBar (Standard / Large 112.5% / Larger 125%, per-browser, applied before first paint). Every page was decluttered to one brief, with the Manifest builder as the reference: sans for prose and mono only for numbers/IDs; `·`-joined meta strings split into spaced pieces and chips; plain-language labels with the jargon kept in `title`; at most one inline primary action per row; wrap instead of truncate; layouts rebalanced per breakpoint so they survive 125% text. Notable structural changes: Action Centre table 11 → 3–4 columns with one "next step" button + a More menu (every transition still reachable there and in the drawer); Overview is a container-query grid (1 → 2 → 3 columns); Manifest rows get an explicit Carry | Defer switch; Settings booleans are an On | Off switch; Obligations table 8 → 6 columns.
- Touches shared contract? no. (`CausalTrace` gained an optional presentational `hideHeading` prop; it still calls `runCausalTrace()` and its numbers are unchanged.)
- Touchpoint completed? none. Touchpoints #1, #2, #4 and #6 were re-checked: same functions, same handlers.
- Notes for the other developer:
  - Size by role from the comment block in `src/index.css`. Anything a person reads uses `--text-3` or brighter; `--text-4` is for decoration and axis ticks only.
  - Pick new sizes on the reference pages, then check them at the 125% Text size.
  - Some labels were renamed: "Drain now" → "Send now" (the tooltip still says drain), "SLA breach" → "Overdue only", and the Table/Board toggle is now List/Board.
  - Dev A backlog, pre-existing and not caused by this pass: the Environment tiles and charts render empty because the pages pass `StatTile`/`TimeSeriesChart` props the components don't accept (these are among the 17 `tsc` errors); the 3D view could not be checked in a hidden automation tab, but its wiring is untouched; the Maitri card on `AntarcticaMap` wraps its warning count at the new sizes.

### [2026-09-29 15:30] Shared (at the user's request) — Simpler charts, one chart spec, map chip overlap
- Status: done (build passes; visual check pending — the browser extension disconnected before this pass could be screenshotted)
- Files changed: `src/components/shared/Chart.tsx` (new), `src/styles/chart.css` (new), `src/styles/tokens.css` (`--chart-1/2/3`, `--brand` alias), `src/components/shared/TimeSeriesChart.tsx` (rebuilt), `StatTile.tsx`, `CausalTrace.tsx`, `src/components/viz/AntarcticaMap.tsx`, `src/pages/Compliance/{Obligations,WasteLedger,AuditLog}.tsx`, `src/pages/Logistics/ResupplyTable.tsx`, `src/pages/Sandbox/index.tsx`, `src/pages/Actions/ActionDrawer.tsx`.
- Summary: The user's rule for this pass: every chart says one thing. All charts now follow one spec, ported from `~/Temp-ui-comps` (`CHART_DEFAULTS` + `ChartContainer` / tooltip / legend): a horizontal hairline grid, no axis lines, sans labels with mono numbers, and data series in status-free `--chart-*` colours.
  - **Season calendar:** was dots on a ±days strip; now "What falls due each month", stacked by status.
  - **Waste chart:** was two stacked panels with eight near-identical greens; now one stacked bar chart of 3 groups plus two headline numbers. The table view keeps all 8 streams.
  - **Sandbox depletion:** was 2 lines + 2 bands + ship band + 2 LSOD ticks; now "Does the stock last until the ship?", two lines and a ship window.
  - **Resupply bar:** was the bar + a range band + the ship window + an LSOD tick; now the bar + a dashed "ship arrives" line. The row detail drops the sparkline.
  - **`TimeSeriesChart`:** was a stub; now a real Recharts area chart. It accepts the single- and multi-series shapes the pages pass, never interpolates across gaps, and draws thresholds dashed.
  - **Audit chain card:** collapsed to one row plus a slim strip. The legend and the "not non-repudiable" note moved to an info tooltip; the duration moved into Verify's "Verified in N ms". FR-5.3, 5.4, 5.7 and 5.8 are still met.
  - **Map station chips:** sized from the root font, so they no longer clip at larger text.
- Touches shared contract? no. `StatTile` `value`/`unit` are now optional (they default from `measurement`) and it accepts `trend`; `CausalTrace` gained `hideHeading`. All changes are additive.
- Touchpoint completed? none
- Notes for the other developer: new charts use `ChartContainer` + `CHART_DEFAULTS` from `components/shared/Chart.tsx`. Status colours (`--ok`, `--watch`, `--act`) are for statuses only; a measured series uses `--chart-1/2/3`. This fixed 11 of the 17 pre-existing `tsc` errors, and the Environment tiles and charts now render; the remaining 6 are Twin/Assets/IsoStationModel prop mismatches.

### [2026-09-29 23:20] Dev B (at the user's request) — Action pipeline made legible; Overview and Action Centre decluttered
- Status: done (`tsc` clean for every file touched; the 6 remaining errors are the pre-existing Twin/Assets/IsoStationModel ones). The user is checking the screens visually.
- Files changed: `src/components/shared/ActionSteps.tsx` (new), `src/pages/Overview/{index,NeedsAttention,ResourceWatch,ZonesToWatch}.tsx` (`ZonesToWatch` new, `StationZonesPanel.tsx` deleted), `src/pages/Actions/{index,ActionTable,ActionDrawer,TierRail}.tsx`, `src/mock/seed.ts`, `src/state/bootstrap.ts`. Part of this is already in `74d86f6`.
- Summary: The user asked where an acknowledgement goes and why the pipeline was hard to follow. The spec's intent is three human steps: **Acknowledge** ("HQ has seen it"; stops the per-tier response clock, FR-7.1), **Assign** (a named owner, FR-6.3) and **Resolve** (a note, plus evidence for T0/T1). `ActionSteps.tsx` is now the one source for "where this stands / what's next". The Overview flag, the Action Centre rows and the drawer all read from it.
  - **Bug fixed:** the drawer offered **Resolve** on an ACKNOWLEDGED action, which `canTransition` rejects. The primary button is now always the one legal next step. The table's "…" menu takes its enablement from `canTransition`, so it no longer offers Assign on an ASSIGNED action.
  - **Overview:** Needs attention is now a flag beside the title. It opens a panel of the top 3 read-only items, each linking to `/actions/:id`. The page is two rows. Row 1 is the comparator, map and sync queue. Row 2 is "Supplies to watch" (top 5, linking to Logistics) and "Zones to watch" (both stations; non-normal zones only, each opening that station's twin on the zone). Title-row search, Filter and Reports were removed as duplicates of the nav search, Action Centre and Compliance.
  - **Action Centre:** the left rail and the three header count pills are replaced by step tabs (All open · To acknowledge · To assign · To resolve · Deferred · Resolved) and a one-line tier chip filter. Each count now appears once. Rows drop checkboxes, zone/metric text and "no consequence modelled". Bulk ACK becomes "Acknowledge all n" on the To-acknowledge tab. `?state=RAISED` deep links still work.
  - **Seed:** `act-mtr-002` was ACKNOWLEDGED with an assignee, which the state machine can't produce. The assignee was removed (V. Chandran's version still arrives as the seeded sync conflict), and `SEED_VERSION` moved to `devb-4`, so local demo data reseeds once.
- **Spec deviations, all user-directed:** FR-4.3/4.5 (the ACK button on the Overview card is gone; acting happens only in the Action Centre). FR-2.4 (the state filter is grouped by step; Board still shows all six columns). FR-7.1/7.2 (the light-cone zone grid for the primary station is replaced by a non-normal-zones list for both stations). FR-9 (the selection summary is gone; a zone opens the twin instead). FR-8 (ambient and wind appear in the zones card header; the SYNTH load tile was dropped). FR-2.2/2.4 (title-row search and Filter removed).
- Touches shared contract? no — `contracts.ts` untouched; `ActionSteps` only reads `Action`.
- Touchpoint completed? none. Touchpoint #7 still holds: `?state=` pre-fills the matching step tab.
- Notes for the other developer: if Twin or Asset detail needs to show action progress, import `StepBars` / `describeStanding` / `nextStep` from `components/shared/ActionSteps` rather than mapping states locally. The shared `ActionCard` was not changed.

### [2026-09-29 23:55] Dev A (at the user's request) — "Why this matters" reads as our model's estimate
- Status: done. `tsc` shows no errors in `CausalTrace.tsx`. A server-side render with Bharati's mock inputs gives the same numbers as before (220 ±18 d, order within 177 d). The user is checking the screens visually.
- Files changed: `src/components/shared/CausalTrace.tsx` only. Twin page call site left to the session rewriting `src/pages/Twin/index.tsx` (agreed over cross-session message).
- Summary: The user said the panel didn't read as our model's insight. It was a column of engine labels (`AMBIENT`, `↓ HEATING`, `HDD`, `LSOD`) with five identical MODELED chips. The panel now reads answer-first, in plain language:
  1. A framing line: "Our model's estimate for {scope}. Calculated, not read from a sensor." In a Sandbox run it says "A Sandbox what-if… Not a forecast."
  2. An answer card: "Fuel will last about 220 days ±18", then "Order more fuel within 177 days" with one plain sentence explaining the deadline.
  3. "How the model got there": a one-line causal summary and the four engine steps with plain labels. The engine label goes in the tooltip. Last comes one line tying stock ÷ burn to the headline.
  4. A note that insulation, generator efficiency and shipping times are assumptions, linking to `/settings`. Hidden in SIM.
- Also fixed: every step badge's hover card showed the orange "derived value with no declared parents — report this" warning, because `runCausalTrace` returns steps without `parents`. The component now attaches each step's parents for display only. The latest safe order date also gets its own badge.
- Touches shared contract? no. Every number still comes from `runCausalTrace()`. The new optional `scope?: string` prop is additive; `hideHeading` still works.
- Touchpoint completed? none. Touchpoint #10 is unaffected: same engine call, same numbers on every page.
- Spec deviation, user-directed: FR-10.3 puts the operational consequence in the final row. It now sits at the top, so older users see the answer first. FR-10.2's per-value badges are kept.
- Notes for the other developer: the Action Centre drawer picks up the new layout automatically. It needs no change, but `scope` is available if the drawer wants to say what the estimate covers.

### [2026-09-29 23:18] Dev A (at the user's request) — Twin page: floors are back, zones follow the floor, page simplified
- Status: done. `tsc` shows no errors in the Twin page (this also clears 4 old ones there: `openActionCount`, `compact`, missing `Bharati3D` props). Checked in Chrome on Bharati 3D (all three floors, room clicks), Bharati Diagram and Maitri. No console errors.
- Files changed: `src/pages/Twin/index.tsx` (rewritten), `src/twin/zoneRooms.js` (new).
- Summary: The 20 Sep Twin page rendered `<Bharati3D />` with no `floor` prop, so the model was stuck on the ground floor. The page was also `h-screen` inside the shell, which clipped its bottom 56px. The left rail is now a Floors list (Ground / First / Second). Opening a floor shows the zones on it, most urgent first. Choosing a zone jumps to its floor and highlights its room; clicking a room in 3D selects its zone. The 3D rooms are tinted by zone status. A room outside any zone says "Not monitored yet" instead of showing a status. `?zone=A1` from the Overview opens that zone on the right floor.
- `zoneRooms.js` is the one join between the six mock zones and the 17 rooms in `stationData.js`. Control room, briefing room, main entry and the RO and wastewater plants belong to no zone yet.
- Touches shared contract? no. It reads `getActions()`/`getResources()` and calls `useActionTransitions().acknowledge()`, all unchanged.
- Touchpoint completed? #1: Acknowledge now calls the real `useActionTransitions('hq')`. It replaces the `alert()` placeholders. Assign and Defer need a person or a date, so they moved behind "Open in Action Centre".
- Spec deviations, user-directed ("UI seems too complex… it's a government website"):
  - FR-4: the Colour-by radios (Status / Provenance / Freshness) are removed. They only ever affected the Diagram view, not the 3D, and the labels were jargon. Provenance is still on every value via its badge.
  - FR-5: the autonomy strip is now one line: the shortest-lasting supply, from the same `getResources()` as `/` and `/logistics`, plus a "See all" link.
  - FR-8.1/8.2: status is shown in words (Normal / Watch / Needs action / No data). The tier chip is gone. The latest-reading box and the asset progress bars are replaced by plain rows showing the value, its limit, and a badge.
- Notes for the other developer: nothing needed. Open-action counts on the Twin now come from the live store, so they change when an action is acknowledged or resolved in the Action Centre.

### [2026-09-30 00:30] Shared (at the user's request, agreed with Dev B's session) — Provenance hover card no longer clipped
- Status: done. `tsc` shows no errors in the touched files. The user is checking visually.
- Files changed: `src/components/shared/ProvenanceBadge.tsx` (Dev B's file; the Dev B session agreed to this change).
- Summary: The user's screenshot showed the MODELED hover card in the Twin inspector with its left third cut off. Any `overflow-y-auto` ancestor clips the x axis too, so the card, rendered in place with `position: absolute`, could not escape the inspector or the Action Centre drawer. The card is now portalled to `<body>` with `position: fixed`, placed from the badge's `getBoundingClientRect()`. It is clamped 8px inside the viewport, flips above the badge when there is no room below, and follows the badge when any ancestor scrolls or the window resizes. It sits at `z-[60]`, above the drawer and modal layers. It is placed in a layout effect, so it never paints at a stale spot.
- Touches shared contract? no. The props API (`measurement`, `label`, `abbreviated`, `align`, `className`), the four styles, the card contents and the aria wiring are unchanged. `align` still sets the preferred side.
- Touchpoint completed? none
- Notes for the other developer: the per-zone "Why this matters" item was started here, then handed to the Twin session mid-way, at its request. Already written: `src/engine/zoneTrace.ts` (new; `runZoneTrace(input, profile)`, built on `runCausalTrace` and the `compute*` functions) and one additive `"trace"` line per zone in `src/mock/bharati.json` / `maitri.json`. That session owns the rest and may keep or replace both.

### [2026-09-29 23:34] Dev A (at the user's request) — Twin: each zone gets its own "Why this matters"; foldable floors; resizable panels; link state
- Status: done. `tsc` shows no errors in the touched files. Checked in Chrome: Bharati Power House / Storage & Workshop / Fuel Storage / Labs & Science, Maitri Fuel Depot, panel drag and reset, and the hover card inside the inspector.
- Files changed: `src/components/shared/ZoneTrace.tsx` (new), `src/components/shared/CausalTrace.tsx` (ship-window row), `src/pages/Twin/index.tsx`. Kept the Dev B session's `src/engine/zoneTrace.ts` and the mock `trace` lines as they were.
- Summary: The user pointed out that every zone and floor showed the same station fuel panel. Each zone's panel now answers that zone's own question, with numbers from `runZoneTrace()` (the engine on the zone's share of heat and load):
  - A zone with a fault gives a verdict ("Needs attention" / "Worth watching"), the days of fuel the fault costs, and fuel now vs. once fixed. Bharati: Generator #2 costs ≈7 d, the workshop door seal ≈2 d.
  - A healthy zone says "All right", with its share of the station's fuel.
  - The zone that holds the fuel keeps the station fuel story (`CausalTrace`).
- The Twin now builds its engine input with `causalTraceInput(stationId)` instead of hand-copying `mock/*.json` `engineInputs`. Bharati's fuel therefore reads 140 d, the figure Dev B measured in the drawer.
- `CausalTrace` also shows the next ship's arrival window, with a badge. When the fuel runs out before the earliest ship it says so in `--act-soft`. Maitri today: 70 d of fuel against a 107–114 d window, which "order within 27 days" alone hid.
- Floors: the floor already in view folds and unfolds its zone list. The side panels can be dragged wider or narrower, via pointer or arrow keys; double-click resets. Widths are remembered per viewer in `localStorage`.
- Touches shared contract? no existing signature. See "Contract changes" for the adopted `engine/zoneTrace.ts` and the mock `trace` field.
- Touchpoint completed? #9 (Twin side only). The 3D fades and shows the "No contact / HQ behind" banner from `useSyncInfo()`. Assets and Environment still don't read connectivity. #10: see the note on the tracker row.
- Notes for the other developer: the drawer calls `causalTraceInput(stationId, { zoneCode })`, which models a warning zone as extra envelope loss. `runZoneTrace` models Generator #2 as an efficiency loss. So for an A1 action, the drawer's "days of fuel" and the Twin's "fuel lasts … now" differ. The station figure without a zone (140 d) matches. One of the two fault models should win; ask the user before changing either.

### [2026-09-30 00:30] Dev B (at the user's request) — Compliance page rewritten for a government audience
- Status: done. `tsc` is clean for every Compliance file; the 2 errors left are the known IsoStationModel/Assets ones. The user is checking visuals. Built by four parallel sub-agents from one shared brief (shell, Reports, Waste, Inspections + Record history), then integrated here.
- Files changed: `src/pages/Compliance/{index,Obligations,WasteLedger,Inspections,AuditLog}.tsx`, `src/components/shell/CommandPalette.tsx` (entry title "Compliance").
- Summary: The user asked "what even is this page?". Its job is the stations' official paperwork under the Antarctic Treaty's environmental rules and India's Antarctic Act, plus proof nobody changed it afterwards. The page is now built around four plain questions. Each is a card that shows its own answer and acts as the tab:
  - **Reports:** are reports filed on time?
  - **Waste:** is all waste accounted for?
  - **Inspections:** were inspections passed?
  - **Record history:** are the records untouched?
  - These cards replace the header count chips, the "Chain verified" chip and the tab bar. One line shows the whole pipeline: station writes a record → reaches HQ, or waits for the satellite link → locked into the record history.
  - **Reports:** grouped by urgency; "waiting for the link" is visibly not overdue; "Filed" is collapsed.
  - **Waste:** one table checking that produced = stored + shipped out, with "Adds up?" and "Raise action".
  - **Inspections:** one card per inspection, failed items listed inline with their action.
  - **Record history:** a plain newest-first timeline. Fingerprints (hashes) appear only under per-row "Technical details". The JSON export and the tamper demo sit in a collapsed "For auditors" section.
- Removed as redundant or engineer-only: the monthly "what falls due" chart, the chain-strip visual, the actor filter, always-visible hashes and "SHA-256" labels, and the per-row tamper buttons. Actions this page raises now read in plain words ("Hazardous waste doesn't add up").
- **Spec deviations (user-directed):**
  - FR-1.1: title is "Compliance", not "Compliance & Audit".
  - FR-1.3/1.4: the counts and chain chip are folded into the cards.
  - FR-2.1: no calendar strip.
  - FR-5.4: no chain strip; the changed record is marked in the timeline instead.
  - FR-5.8's label now appears as the plain explanation "sealed together with the one before it", with "tamper-evident, not signed" under "For auditors".
- Kept: `?tab=` (obligations / waste / inspections / audit), `?record=` and `?seq=` deep links; QUEUED OFFLINE ≠ OVERDUE; SYNTH on every waste figure; superseded entries greyed, never hidden; JSON export with hashes; no "blockchain" anywhere.
- Touches shared contract? no.
- Touchpoint completed? #8 unchanged: shipped waste still links to its voyage.
- Notes for the other developer: `Inspections` gained an optional `onOpen` prop. `STREAM_RAMP` is no longer exported from WasteLedger; nothing imported it. On your #10 note: agreed that the zone-level fuel figures must match; that choice is with the user.

### [2026-09-29 23:44] Dev A (at the user's request) — Twin: per-room figures, shorter "Why this matters"
- Status: done. `tsc` shows no errors in the touched files. Checked in Chrome: Power House, Living Quarters (its five rooms add up to the zone's 24%), Galley, Control Room (no zone), and the workshop door seal (same cost in the room and in the zone).
- Files changed: `src/twin/roomProfiles.js` (new), `src/components/shared/ZoneTrace.tsx` (rewritten shorter), `src/pages/Twin/index.tsx`, `src/mock/bharati.json` (removed the six `trace` lines added earlier today; Maitri keeps its lines).
- Summary: The user asked for figures that follow the room. Each of Bharati's 18 indoor rooms now has a hand-set share of the station's equipment load, and a share of the heated shell taken from its floor area in the 3D, weighted for roof and underside exposure. Both sum to 1, so rooms always add up to exactly the station. Faults sit in their rooms: Generator #2 in the CHP room, the door seal in the workshop. A Bharati zone is the sum of its rooms. Clicking any room, including the five outside a zone, shows that room's own panel; a zone lists its rooms with each room's share.
- "Why this matters" is now one sentence with the answer and its badge, one line of context, and the workings folded behind "How we worked it out", which starts closed. The fuel zone uses the same short shape.
- Deviation: FR-10.2 wants the chain rows visible. They are now one click away, at the user's request ("make this concise").
- Touches shared contract? no. Bharati's zone profiles now come from `twin/roomProfiles.js` rather than `mock/bharati.json`.
- Touchpoint completed? none.
- Notes for the other developer: none.

### [2026-09-30 01:00] Shared (at the user's request, agreed with Dev B's session) — Action Centre drawer uses the Twin's zone model
- Status: done. `tsc` shows no errors in the touched files. The other 4 errors are in files other sessions are editing (Actions/index, StationConsole, Assets, IsoStationModel). Not checked in a browser.
- Files changed: `src/twin/zoneSubject.ts` (new), `src/components/shared/ZoneTrace.tsx` (optional `hideHeading`), `src/pages/Actions/ActionDrawer.tsx` (the trace input and the "Why this matters" render only; the Dev B session agreed).
- Summary: The user chose one zone-fault model, resolving the open #10 note in the entry above. The drawer used `causalTraceInput(stationId, { resourceId, zoneCode })`, which adds a flat +8% heat loss to any warning zone. The Twin uses `runZoneTrace` with each zone's actual fault. So an A1 action showed different "days of fuel" in the two places. Now:
  - **Input:** the drawer builds `causalTraceInput(action.stationId)`, the same call as the Twin.
  - **Zone actions:** when the action has a zone with a profile, the drawer renders `<ZoneTrace subject={zoneSubject(stationId, zoneCode)} hideHeading />`. Otherwise it keeps `CausalTrace`.
  - **One lookup:** `zoneSubject()` is the single place that picks a zone's profile and status: Bharati from `twin/roomProfiles.js`, Maitri from `mock/maitri.json`. An action on a zone now shows the Twin's numbers for that zone by construction.
- Also fixed: the drawer passed the action's `resourceId` into the fuel chain. For act-mtr-004 (generator spares) and the RO/science/medical actions, "fuel will last" was computed from that resource's stock. The chain now always uses the station's fuel.
- Still on the old model: `state/sandbox.ts` `zoneImpacts()` uses `causalTraceInput(…, { zoneCode })` for its per-zone risk chips. It is a what-if risk label, not a "days now" figure, so it was left alone; worth aligning later.
- Touches shared contract? no. `ZoneTrace` `hideHeading` is additive; `data.ts` is unchanged.
- Touchpoint completed? #10: the drawer and the Twin now share one input and one zone model. The Twin could use `zoneSubject()` instead of its inline copy of the same rule (`Twin/index.tsx`, `zoneProfile`); suggested to the Twin session.
- Notes for the other developer: none beyond the above.

### [2026-09-30 00:05] Dev B (at the user's request; one edit in Dev A's Twin page) — Every action step asks for a note; no silent transitions
- Status: done. `tsc` clean apart from the 2 known IsoStationModel/Assets errors. Checked in Chrome: Acknowledge (preset phrase) → Assign (owner + note) → Resolve on a T0 blocks without evidence. The chain re-verified at 42 entries, and the note shows in the drawer history and in the audit-chain payload.
- Files changed: `src/components/shared/StepDialog.tsx` (new), `src/shared/contracts.ts`, `src/pages/Actions/{index,ActionDrawer,ActionBoard}.tsx`, `src/pages/Twin/index.tsx` (the zone inspector's Acknowledge only), `src/pages/StationConsole/index.tsx` (one `assign` call), `src/components/shared/ActionSteps.tsx` (step explainer text).
- Summary: The user asked why Acknowledge worked in one click with no reason given, and wanted every step logged. One rule now holds everywhere: **no step changes an action without a note**. Who and when are filled in automatically; the person writes one line.
  - **One dialog:** `StepDialog` handles Acknowledge, Assign, Start, Defer and Resolve. Every entry point uses it: drawer footer, table row buttons, "Acknowledge all n", the `a` key, Board drops and the Twin zone inspector.
  - **Fast input:** Acknowledge and Assign offer preset phrases, one tap each, so acknowledging is still two clicks. The dialog says exactly what gets written: name, time, note, history and audit log.
  - **Enforced in the contract**, not just the UI. `apply()` rejects an empty note, so no call site can write a silent transition.
  - **Notes are tamper-evident:** each note sits inside the hashed payload. Before, the ACK/assign text lived only in the unhashed `payloadSummary`.
  - **Bug fixed:** Board drag called `transitionTo`, which skipped every required field. It could RESOLVE a T0 with no note or evidence, DEFER with no reason or review date, and ASSIGN with no owner. Dropping a card now opens the matching dialog, and `transitionTo` refuses ASSIGNED/DEFERRED/RESOLVED.
  - **Bulk acknowledge:** one note covers the batch, but each action still gets its own chain entry, written in sequence.
  - The duplicate Assign/Defer/Resolve dialogs in `ActionDrawer` and `Actions/index` (`QuickDialog`) are gone; both now use `StepDialog`.
- **Spec deviation (user-directed):** FR-6.2 / FR-4.5 / NFR-3.6 describe Acknowledge as recording actor + timestamp only, in one action. It now also needs a note. The `a` key opens the dialog instead of acknowledging directly.
- Touches shared contract? **yes** — see Contract changes (2026-09-30 rows).
- Touchpoint completed? #1 still 🟢. The Twin's Acknowledge now goes through `StepDialog`, so both sides call the same component.
- Notes for the other developer: in `Twin/index.tsx` I replaced the direct `transitions.acknowledge(id, actor.name)` with `<StepDialog>`. Only the `acknowledge` handler, one `useState`, the imports and the dialog element below the ack error changed. If a Twin or Asset surface needs to change an action's state, open `StepDialog` rather than calling `useActionTransitions` directly.

### [2026-09-30 01:30] Dev B (at the user's request) — Action Centre split by station; HQ can raise an action; one toolbar row
- Status: done. `tsc` is clean for every Actions file (the 2 known IsoStationModel/Assets errors remain). The user is checking visuals.
- Files changed: `src/pages/Actions/{index,ActionTable,TierRail}.tsx`, `src/pages/Actions/RaiseActionDialog.tsx` (new).
- Summary:
  - **Split by station:** with "All stations", the list is now a Bharati section and a Maitri section. Each has a heading with its count and a single "Out of contact" note, which replaces the per-row "as of last sync". Rows no longer repeat the station name, and the "Station" sort option is gone.
  - **Raise action:** each station heading has a "Raise action" button, the HQ path for a problem reported by phone, radio or email. The form asks what's wrong, optional details, tier, an optional zone and an optional owner; the owner is recorded as a normal assign step with a note. The trigger reads "Reported by HQ staff", mirroring the Station Console's operator entry.
  - **One toolbar row:** the tier filter, "Overdue only", bulk acknowledge and "Sort by" now share one row; before, "Sort by" sat alone on a second row. Tier chips with a zero count are dimmed.
  - **Subtitle** now says what the page is for.
- **Spec deviation (user-directed):** FR-1.2 / §3.6 "a Maitri T1 outranks a Bharati T2" still holds *within* the priority order, but the two stations are no longer interleaved in one list.
- Touches shared contract? no. `raise` and `assign` are used as they are.
- Touchpoint completed? none. #7 (`?station=` / `?tier=` / `?state=`) still pre-fills.
- Notes for the other developer: if the Twin needs a "Raise action" entry point, reuse `RaiseActionDialog` (props: `stationId`, `onClose`, `onRaised`).

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
| 1 | Twin zone inspector → ACK/Assign/Defer/Log service | Calls `useActionTransitions()` | Owns real implementation | 🟢 both sides done, needs review — the zone inspector's Acknowledge now opens the shared `StepDialog` (note required, 2026-09-30); Dev B's implementation validates transitions and writes the chain |
| 2 | Action Centre drawer → `CausalTrace` | Owns `runCausalTrace()` + `CausalTrace` component | Consumes read-only in drawer | 🟢 both sides done, needs review — drawer consumes it via `causalTraceInput()`, no local maths. **See #10: the numbers have not been compared across the two pages yet.** |
| 3 | Twin / Environment → "Open in Sandbox" | Owns both ends (pre-load payload) | n/a | 🟢 both sides done, needs review (Dev A owns both ends) |
| 4 | Maintenance "Log service" → resource decrement | Calls `decrementResource()` | Owns real atomic implementation | 🟢 both sides done, needs review — `decrementResource()` is the single stock write path; Dev A's maintenance log and the station console Inventory change both use it |
| 5 | Asset detail → "view in 3D twin" | Owns both ends | n/a | 🟢 both sides done, needs review (Dev A owns both ends) |
| 6 | Logistics ledger row → "Raise action" | n/a | Owns both ends (pre-fill + route) | ✅ reviewed & merged — pre-fills resource, consequence and LSOD, routes to `/actions/:id` |
| 7 | Overview "View all" → Action Centre | n/a | Owns both ends (query-param filter) | ✅ reviewed & merged — `/actions?station=&tier=&state=` all pre-fill the filters |
| 8 | Compliance waste shipped → voyage link | n/a | Owns both ends (`voyageId`) | ✅ reviewed & merged — shipped rows link through to the voyage manifest |
| 9 | `/comms` connectivity toggle → every `<DegradableSurface>` app-wide | Reads `state/connectivity.ts`, never writes it | Owns `state/connectivity.ts` + the toggle UI on `/comms` | 🟡 one side done (Dev B) — toggle + demo outage scenario live. Twin now reads it (3D fades + "No contact / HQ behind" banner, 2026-09-29); Assets and Environment have yet to |
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
| 2026-09-29 | Dev A | New module `src/engine/zoneTrace.ts`: `runZoneTrace(input, profile)`, `ZoneTraceProfile`, `ZoneCondition`, `ZoneTraceResult`. Additive optional `trace` field per zone in `mock/maitri.json` (not yet on the `ZoneModel` type). Bharati's comes from its rooms in `src/twin/roomProfiles.js` | Per-zone "Why this matters" on the Twin. Built on `runCausalTrace` + `compute*`, with no existing signature changed. `result.station` is exactly `runCausalTrace(input)`. |
| 2026-09-30 | Dev B | **Breaking:** `acknowledge(actionId, note)` (the 2nd arg was `actorName`, now the note; the actor comes from the hook). `assign(actionId, assignee, note)` gains a required `note`. `start(actionId, note)` and `transitionTo(actionId, to, note)` now require the note | Every step must carry a person's note for the log. All call sites updated (Actions, drawer, Twin, StationConsole). A leftover `acknowledge(id, actor.name)` would type-check but log the name as the note, so search for that call. |
| 2026-09-30 | Dev B | Every transition rejects an empty note. The note is stored inside the hashed `payload` (`{ from, to, note, … }`), and `payloadSummary` is the note | Makes the note tamper-evident. Entries written earlier still verify, because their stored payloads are unchanged. |
| 2026-09-30 | Dev B | `transitionTo` refuses ASSIGNED / DEFERRED / RESOLVED | Those states carry required fields; the generic mover had let the Board skip them. Use `assign` / `defer` / `resolve`. |

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
