# UI Redesign Phase 3 Handoff Manifest: Catalog, Home, and Lobbies

## Metadata
- **Phase:** 3 (Catalog, Home, and Lobbies)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `3c3b14b8e217596bcfb62e49c71c4c153b3f2ec4` (Codex-accepted Phase 2 handoff commit "docs: accept UI redesign phase two")
- **Candidate SHA:** `74d545b332703d1449fe59141460ae038527a2c8` ("fix: nest lobby body inside AppScreen for responsive short-landscape layout") — the last product-code commit; this handoff commit and the `ROADMAP.md` update sit on top of it as reporting-only metadata and are not part of the reviewable code candidate.
- **Implementation Status:** Complete, pending Codex acceptance
- **Working Tree Clean:** Yes (`git status --short` clean before handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/74d545b332703d1449fe59141460ae038527a2c8/2026-09-16T14-15-52-811Z-71633`

---

## Verification Evidence

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/uiCopy.verify.ts` | **PASS** | Pure-logic verifier: covers fallback to Slovak, missing-key detection, and stub-locale safety |
| `npx tsx src/shared/gameCatalog.verify.ts` | **PASS** | Pure-logic verifier: covers category completeness, valid setting IDs, absence of raw Tailwind color fragments, and 1:1 parity with module registry |
| `npx tsx tools/screenshots/capture.verify.ts` | **PASS** | Tooling verifier: covers `ui-kit`, `home`, and all 11 `lobby-*` scene registrations, slug aliases, `--help` output, and arg parsing |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` |
| `npm run test:e2e` | **PASS** | 166/166 tests across desktop and mobile Chromium projects in ~37s, including all 17 new catalog/home/lobby tests, smoke tests, and parent-access tests |
| `npm run build` | **PASS** | Production build in 1.13s; 11 lazy game chunks; `AvatarScene-CDLptoUB.js` (973.04 kB) remained separate from main `index-*.js` (238.94 kB) |
| `git diff --check` | **PASS** | No whitespace errors, no orphan trailing spaces, no conflict markers |

### Avatar / three.js lazy-chunk confirmation
Inspecting `dist/assets/index-*.js` confirms that `AvatarScene` is never bundled into the main chunk; it is loaded strictly through dynamic `import()` behind `VITE_AVATAR_POC_ENABLED`. The heavy Three.js / R3F dependencies remain isolated in `dist/assets/AvatarScene-*.js` (973.04 kB).

---

## Screenshot Capture Evidence

Captured using `npm run shots -- --scene=home --scene=lobby-alphabet --scene=lobby-syllables --scene=lobby-numbers --scene=lobby-counting --scene=lobby-compare --scene=lobby-addition --scene=lobby-words --scene=lobby-first-letter --scene=lobby-assembly --scene=lobby-complete-syllable --scene=lobby-complete-letter` against local preview server built with `vite build --mode test`.

Artifact directory:
`artifacts/ui/74d545b332703d1449fe59141460ae038527a2c8/2026-09-16T14-15-52-811Z-71633`

### Captured Scenes & Viewports (10 canonical viewports each, 120 total):
- **`home`**: `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`
- **All 11 Game Lobbies** (`lobby-alphabet`, `lobby-syllables`, `lobby-numbers`, `lobby-counting`, `lobby-compare`, `lobby-addition`, `lobby-words`, `lobby-first-letter`, `lobby-assembly`, `lobby-complete-syllable`, `lobby-complete-letter`): same 10 viewports each

### Visual Inspection Report (320×568, 667×375, and desktop)
- **`home` (320×568 narrowPhone)**: Renders a universal 2-column grid. Card surfaces are light/white (`bg-surface`), titles and descriptions maintain a stable baseline via flex layout, and icon tiles use shared pastel backgrounds rather than saturated per-game color floods. The settings cog remains reachable at touch size.
- **`home` (667×375 shortLandscape)**: Scrollable vertical list under locked viewport; header remains compact and categories stack cleanly without overflow.
- **`home` (desktop)**: Multi-column grid adapts up to 4 columns within `max-w-5xl`.
- **Lobbies (320×568 narrowPhone)**: Centered vertical layout featuring the Living Toybox tactile preset preview, clear accessible `h1` game title, subtitle instruction, and prominent `Button size="play" tone="primary"` with play icon.
- **Lobbies (667×375 shortLandscape)**: Evaluated inside `<AppScreen>` context, switching cleanly to the horizontal short-landscape composition: compact tactile preview and title/instruction on the left, primary child-size play action button on the right, keeping all controls in-viewport without vertical clipping.
- **Lobbies (desktop)**: Centered layout with generous spacing and tactile Toybox presets (`wood`, `magnet`, `felt`, `picture`, `counter`, `tray`, `balance`).
- **Settings Trigger Visibility**: Settings cog button is visible on lobbies whose catalog definition includes settings (`ALPHABET`, `SYLLABLES`, `NUMBERS`, `COUNTING_ITEMS`, `COMPARE_QUANTITIES`, `ADDITION`, `FIRST_LETTER`, `COMPLETE_LETTER`), and absent on lobbies with no settings (`WORDS`, `ASSEMBLY`, `COMPLETE_SYLLABLE`).
- **Focus Restoration**: When the settings dialog is canceled over a game lobby (via Escape or "Späť"), focus is restored to the settings trigger button.

---

## Summary of Changes (Tasks 1–6)

1. **Task 1 — Setting IDs and UI Copy Keys (`9758eb5`):**
   - Created `src/shared/settings/settingIds.ts` with typed enum-like string union of all 9 configurable setting IDs.
   - Created `src/shared/uiCopy.ts` providing locale-aware Slovak copy keys for home, categories, and all 11 games with fallback plumbing.
   - Created `src/shared/uiCopy.verify.ts` validating complete copy keys and fallback.

2. **Task 2 & 3 — Semantic Catalog and Lazy Module Registry (`9758eb5`, `94fba4b`):**
   - Refactored `src/shared/gameCatalog.tsx` to export pure TypeScript capability metadata (`GAME_DEFINITIONS`, `GAME_CATEGORIES`), completely eliminating presentation styling and legacy Tailwind color fragments.
   - Created `src/shared/gameRuntime.ts` defining `GameRuntimeProps` (`settings`, `onExit`, `onOpenSettings`).
   - Created `src/shared/gameModuleRegistry.tsx` providing lazy imports for all 11 games.
   - Created `src/shared/components/GameRoute.tsx` resolving game metadata and providing lazy rendering and catalogued return paths.
   - Migrated all 11 games to accept `GameRuntimeProps`.
   - Created `src/shared/gameCatalog.verify.ts` asserting registry parity, categories, and absence of Tailwind color classes.

3. **Task 4 — Grouped Home Screen (`a7b08dc`):**
   - Created `src/home/GameCard.tsx` with semantic link (`data-testid="game-card"`), light surface, shared-palette icon tile, stable baseline, and no arbitrary background classes.
   - Created `src/home/GroupedHomeScreen.tsx` grouping games by category ("Písmená a slová" and "Čísla a počítanie"), universal 2-column mobile layout, scroll restoration, and PWA control.
   - Removed deprecated `HomeLauncher.tsx` and legacy `GAME_METADATA` bridge.
   - Documented `GameCard` in `UiKitScreen.tsx`.

4. **Task 5 — Unified Responsive Game Lobbies (`01f112a`):**
   - Rebuilt `src/shared/components/GameLobby.tsx` on semantic API (`gameId`, `onPlay`, `onBack`, `onOpenSettings`, `availabilityMessage`, `as`).
   - Implemented Living Toybox tactile presets (`wood`, `magnet`, `felt`, `picture`, `counter`, `tray`, `balance`).
   - Added single accessible `h1` title and standard `Button size="play"` action.
   - Migrated all 11 game components to use `GameLobby` and pass `availabilityMessage` when custom content is empty.
   - Removed deprecated `GAME_LOBBY_LEGACY` bridge.
   - Documented `GameLobby` shell in `UiKitScreen.tsx`.
   - Created `e2e/catalog-home-lobbies.spec.ts` testing grouping, navigation, viewports, focus, and settings rules (17 tests).

5. **Task 6 — Verification, Tooling, and Remediation (`f71fcce`, `74d545b`):**
   - Updated `e2e/smoke.spec.ts` to derive smoke test cases directly from `GAME_DEFINITIONS`.
   - Remediated keyboard focus restoration in `GameRoute.tsx`, `ProtectedParentRoute.tsx`, and `GameLobby.tsx` so canceling the parent gate restores focus to the settings trigger button.
   - Remediated `GameLobby.tsx` by nesting `LobbyBody` inside `<AppScreen>` context provider to properly trigger the responsive horizontal short-landscape composition.
   - Permanently registered `home` and all 11 `lobby-*` scenes (with shorthand slug aliases) in `tools/screenshots/capture.mjs`, verified by `tools/screenshots/capture.verify.ts`.
   - Captured 120-image screenshot matrix across all 10 canonical viewports.

---

## Internal Review Ledger

- **Task 1 & 2 (keys, catalog):** `9758eb5` — Spec & code verified; pure-logic invariants passed.
- **Task 3 (lazy routes):** `94fba4b` — Clean lazy chunking verified; 11 separate game chunks generated.
- **Task 4 (grouped home):** `a7b08dc` — Spec & visual verified; 2-column 320px grid and stable baselines verified with TDD.
- **Task 5 (unified lobbies):** `01f112a` — Rebuilt lobby shell and migrated all 11 games; 17/17 new e2e tests passed.
- **Task 6 (remediation & tool fix):** `f71fcce` — Restored settings button focus upon gate cancellation and permanently registered screenshot scenes.
- **Task 6 (responsive lobby layout fix):** `74d545b` — Evaluated lobby body inside `<AppScreen>` context to render horizontal short-landscape composition.
- **Verification Gate:** Full 166-test E2E suite, verifiers, linter, production build, and screenshot sweep all green.

---

## Remaining Compatibility Adapters

No new temporary adapters were introduced in Phase 3. The `GAME_METADATA` and `GAME_LOBBY_LEGACY` bridges created earlier in Phase 3 were fully deleted in Tasks 4 and 5. Existing Phase 2 compatibility adapters remain in place for Phase 4 callers:

| Adapter | Location | Removal condition |
|---|---|---|
| `cx` (deprecated alias of `cn`) | `src/shared/ui/utils.ts` | Remove once no callers remain |
| `LegacyButtonVariant`/`LegacyButtonSize` | `src/shared/ui/Button.tsx` | Remove once all call sites pass `tone`/typed `size` |
| `fixedHeight`/`scrollable` booleans | `src/shared/ui/AppScreen.tsx` | Remove once all call sites pass typed `height`/`scroll` |
| `onToggle`-shaped legacy call signature | `src/shared/ui/FormControls.tsx` | Remove once callers use `SwitchControl` with `onCheckedChange` |

---

## Risks & Preconditions for Phase 4

- **No parent dashboard redesign introduced:** Phase 3 stayed strictly within its boundary — only catalog, home, and lobbies were redesigned. The parent dashboard (`/settings`), custom content (`/content`), and recordings management remain in their Phase 2 state, ready for redesign in Phase 4.
- **WebKit smoke coverage environment limitation:** As documented in Phase 2, WebKit browser installation hangs in this sandboxed environment; WebKit smoke testing is a release gate for Phase 8.
- **Phase 4 Preconditions:**
  1. Codex reviews and accepts candidate SHA `74d545b332703d1449fe59141460ae038527a2c8` based on specification, code quality, and the 120-image screenshot artifact.
  2. Phase 4 (`docs/superpowers/plans/2026-09-14-ui-redesign-phase-4-parent-dashboard.md`) begins strictly from the commit containing the Codex acceptance record.
