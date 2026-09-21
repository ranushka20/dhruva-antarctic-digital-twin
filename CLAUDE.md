# CLAUDE.md — Antarasetu Frontend

This file is read automatically at the start of every Claude Code session in
this repo. Follow it before doing anything else.

**Project:** Antarasetu — SIH 2026 PS 26060. Digital platform for remote
management of the Indian Antarctic research stations Bharati and Maitri.

**This is a frontend-only build.** There is no real backend anywhere in this
project, and none should be added without an explicit decision to change
scope. `FRONTEND.md` and `contracts.ts` both contain a "frontend-only"
section explaining exactly what to simulate client-side (auth, sync, the
station's local store) and how — read it before building anything that
looks like it wants a server.

**Package manager: Bun, not npm.** This repo uses `bun.lock`. Use `bun add`
/ `bun install` / `bun run`, never `npm install` — mixing lockfiles causes
real problems later.

**Two developers, two Claude Code sessions, one repo.** Each session works
inside its own page/route folders. This file exists so both sessions set up
the SAME shared foundation, the SAME contract file, and follow the SAME
progress/integration workflow — that is what keeps two parallel AI-driven
build sessions from diverging.

---

## 0. Figure out which developer you are, and what already exists

Before doing anything else:

1. Check what the user's task/prompt says, or which of these two files they
   handed you:
   - `Antarasetu_DevA_Twin_Physics_Assets_Spec.md` → you are **Dev A**. You
     own `/stations/:id/twin`, `/assets`, `/assets/:assetId`,
     `/environment`, `/sandbox`.
   - `Antarasetu_DevB_Operations_Records_Resilience_Spec.md` → you are
     **Dev B**. You own `/`, `/actions`, `/actions/:actionId`,
     `/logistics`, `/logistics/manifest/:id`, `/comms`, `/station`,
     `/compliance`, `/handover`, `/settings`, `/login`.
2. Both dev spec files are extracted from `FRONTEND.md`, the complete
   consolidated build specification. **If anything in your dev spec file
   ever seems to disagree with `FRONTEND.md`, `FRONTEND.md` wins** — it is
   the source of truth; the split files exist purely so each of you can
   work from one self-contained document.
3. Check the repo before scaffolding anything — `src/lib/twin/` (the 3D/iso
   station model), `src/components/`, and `src/hooks/` may already contain
   real work. Read what's there before creating a parallel version of it.

**Only build pages in your own list.** If shared setup (Step 1–5 below) is
missing, check `PROGRESS.md` first to see if the other session already did
it before you duplicate the work.

Read your own full dev spec file top to bottom before writing any page
code. It already contains the design tokens, every FR/NFR, every data
contract and every algorithm you need.

---

## 1. Repo setup (run once — check PROGRESS.md before repeating)

```bash
bun install
bun add react-router-dom @tanstack/react-query zustand recharts lucide-react
bun add -d tailwindcss postcss autoprefixer
bunx tailwindcss init -p
```

If the repo already has a `package.json` with these installed (check first),
skip straight to Step 2.

## 2. Folder structure — canonical layout per `FRONTEND.md` §12

Create this exact layout under `src/` if it doesn't already exist. Reuse
what's already there (`lib/twin/`, existing `components/`, `hooks/`) rather
than duplicating it.

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
    StationConsole/  Compliance/  Sandbox/  Assets/  Handover/  Settings/  Login/
  engine/       coupling.ts  autonomy.ts  lsod.ts  priority.ts  similarity.ts
  adapters/     environment  fuel  generator  inventory  maintenance  logistics
  state/        stationScope  selection  mode  outbox  auth  connectivity
  lib/          hashChain.ts  provenance.ts  freshness.ts  time.ts  localStore.ts
                twin/           ← ALREADY EXISTS — the 3D/iso model. Dev A's
                                   Twin page imports from here; do not move
                                   or fork it.
  types/        measurement.ts  station.ts  action.ts  resource.ts
  mock/         bharati.json  maitri.json  scenarios/  environment-snapshot/
```

`pages/` in this layout is what earlier planning docs called `routes/` —
same concept, this name matches `FRONTEND.md` exactly, use this one.

`contracts.ts` (repo root, provided to you) is a single-file convenience
covering `types/`, `engine/`, `lib/hashChain.ts` and the `state/` +
`adapters/` simulation layer all at once. Move it to `src/shared/contracts.ts`
(create that one folder) and import from there, OR split it along the
folder lines above if you'd rather match the canonical structure exactly —
the file's own header comment explains which section maps to which folder.
Splitting is optional for a hackathon timeline; keeping one file is fine.
**Do not edit its type or function signatures without logging the change in
PROGRESS.md's "Contract changes" section the same session.**

## 3. Design tokens

Both `FRONTEND.md` and both dev spec files contain the identical `:root
{ ... }` CSS custom-properties block (§2 "Design tokens") and typography/
geometry block (§4). Map these into `tailwind.config.js` under
`theme.extend.colors` / `theme.extend.fontFamily` / `theme.extend.borderRadius`
so every component reads from Tailwind classes backed by these tokens —
never a hard-coded hex value in a component, including inside SVG.

Non-negotiable colour rule, enforce in every component you write: **orange
(`--act` / `--act-soft`) means "act on this" and nothing else.** Never a
chart fill, never decoration. Every numeric value renders in the mono
typeface (`--font-mono` / `font-mono` in Tailwind) — no exceptions.

## 4. Shared component stubs

If these don't exist yet in `src/components/shared/`, create minimal
working versions so both sessions can import and render pages immediately:
`ProvenanceBadge`, `SyncPill`, `StatusDot`, `TierChip`, `StatTile`,
`ActionCard`, `ResourceRow`, `ZoneCell`, `DegradableSurface`,
`TimeSeriesChart`, `Sparkline`, `CausalTrace`, `Drawer`, `Modal`, `Popover`,
`EmptyState`. Mark each file's owner in a top comment (`// OWNER: Dev A` or
`// OWNER: Dev B`, per the "Components you are the source of truth for"
list in each dev spec's Role Summary) — only the owner extends it further;
the other session only ever imports it.

`CausalTrace` specifically must call `runCausalTrace()` (or the split
equivalent in `engine/coupling.ts`) from the contract file — never compute
trace numbers locally. This is checked in PROGRESS.md's integration review
(Step 6).

Since this is a frontend-only build, `state/connectivity.ts` and
`lib/localStore.ts` are not placeholders waiting on a backend — they ARE
the final implementation. See `contracts.ts` §4 for the working
`localStorage`-backed version; move/split it into these files per the
folder mapping in its header comment.

## 5. Page scaffolding

Create one folder per page under `src/pages/` (see the layout in Step 2)
with a placeholder page component and React Router wiring in `router.tsx`,
even for pages you don't personally own — this lets both sessions run the
app and click between pages from day one. A page you don't own should
render a "Coming soon — owned by Dev A/B" placeholder until that developer's
session builds it for real.

---

## 6. PROGRESS.md — mandatory after every unit of work

`PROGRESS.md` has two parts: a chronological **work log** (top section,
append-only) and a living **Integration & Review** section below it. Create
it at repo init with the exact template below if it doesn't exist yet.

**Rule: before ending any session (or any time you complete a page, a
component, or a touchpoint), append an entry to the work log.** Pull the
latest `PROGRESS.md` first if working in git, so you never overwrite the
other session's entries — always append, never rewrite existing entries.

### PROGRESS.md template (create this file verbatim if missing)

```markdown
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
| 1 | Twin zone inspector → ACK/Assign/Defer/Log service | Calls `useActionTransitions()` | Owns real implementation | ⬜ not started |
| 2 | Action Centre drawer → `CausalTrace` | Owns `runCausalTrace()` + `CausalTrace` component | Consumes read-only in drawer | ⬜ not started |
| 3 | Twin / Environment → "Open in Sandbox" | Owns both ends (pre-load payload) | n/a | ⬜ not started |
| 4 | Maintenance "Log service" → resource decrement | Calls `decrementResource()` | Owns real atomic implementation | ⬜ not started |
| 5 | Asset detail → "view in 3D twin" | Owns both ends | n/a | ⬜ not started |
| 6 | Logistics ledger row → "Raise action" | n/a | Owns both ends (pre-fill + route) | ⬜ not started |
| 7 | Overview "View all" → Action Centre | n/a | Owns both ends (query-param filter) | ⬜ not started |
| 8 | Compliance waste shipped → voyage link | n/a | Owns both ends (`voyageId`) | ⬜ not started |
| 9 | `/comms` connectivity toggle → every `<DegradableSurface>` app-wide | Reads `state/connectivity.ts`, never writes it | Owns `state/connectivity.ts` + the toggle UI on `/comms` | ⬜ not started |
| 10 | Shared invariant: `CausalTrace` numbers identical on Twin, Environment, Sandbox, and Action Centre drawer for the same asset/conditions | Verify on Twin/Environment/Sandbox | Verify in Action Centre drawer | ⬜ not started |

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

(none yet)
```

---

## 7. Working rules (apply throughout, not just at setup)

1. Never edit a page route you don't own. If it's still a placeholder and
   you need it built to test your own integration, say so in
   `PROGRESS.md` rather than building it yourself.
2. Never change a contract type or function signature without logging it in
   the "Contract changes" section the same session — the other developer's
   session may be reading the old shape.
3. This build has no backend — the `localStorage`-backed implementations in
   `contracts.ts` §4 (`useActionTransitions`, `decrementResource`,
   `enqueueSyncRecord`/`drainOutbox`, `state/connectivity.ts`) are the real,
   final implementations, not stand-ins. Extend them in place; don't build a
   second, "more real" version elsewhere in the app.
4. Run the review checklist yourself on any touchpoint you complete, even
   before the other side is done — catching a shape mismatch early is
   cheaper than catching it at integration.
5. Follow every acceptance-criteria checklist inside your own dev spec file
   page-by-page, and the global checklist in `FRONTEND.md` §15 — those are
   the actual definition of "done", not this file.
6. If asked about the backend during a demo or pitch: this build is
   frontend-only with a simulated/local data layer; the FastAPI + SQLite
   (station edge) / Postgres (HQ) architecture described in the wider
   solution doc is the intended path, not yet implemented. Say this plainly
   if asked — don't imply the simulation is more than it is.
