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

| Date | Who | Change | Reason |
|---|---|---|---|
| 2026-09-20 | Scaffolding | Moved `contracts.ts` → `src/shared/contracts.ts` | Path change only — no signature or type changes |
