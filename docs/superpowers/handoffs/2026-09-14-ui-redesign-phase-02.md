# UI Redesign Phase 2 Handoff Manifest: Design-System Foundation

## Metadata
- **Phase:** 2 (Design-System Foundation)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `f8da3a0ee888dcadfd28154d69d96cf92bf86151` (Codex-accepted Phase 1 candidate, commit "docs: accept UI redesign phase one")
- **Prior candidate SHA:** `debc513b8102dbef72ebed83301be9d98dfab0f9` ("fix: close Task 6 parent-gate review findings (motion, keys, timer, contrast, copy)") — submitted once, not yet accepted by Codex; superseded by the remediation below before any acceptance record was made.
- **Candidate SHA:** `ac4a40be0380e7bfc15a3e42c99eee902593661c` ("fix: permanently register the /ui-kit capture scene and stop its focus demo auto-scrolling") — the last product-code commit; this handoff commit and the `ROADMAP.md` update sit on top of it as reporting-only metadata and are not part of the reviewable code candidate.
- **Implementation Status:** Complete, Codex accepted
- **Working Tree Clean:** Yes (`git status --short` clean immediately before this handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/ac4a40be0380e7bfc15a3e42c99eee902593661c/2026-09-16T12-52-06-572Z-57418`

### Remediation summary (this update)
The prior candidate (`debc513`) documented two gaps as non-blocking and deliberately left unfixed because Task 7's own file scope was verification/handoff only. This update remediates both, TDD-first, as a dedicated fix commit:
1. **`tools/screenshots/capture.mjs` now permanently registers a `'ui-kit'` scene** (previously added locally, then reverted before commit). `parseArgs`/`SCENES`/`printHelp` are exported behind a main-module guard so the scene list, `--help` output, and unknown-scene validation all stay driven by one config, and a new `tools/screenshots/capture.verify.ts` covers it per the repo's pure-logic-verify convention.
2. **`UiKitScreen.tsx`'s static completion-overlay demo no longer auto-scrolls a fresh `/ui-kit` load.** It previously rendered `OverlayFrame show focusOnShow` unconditionally, so `.focus()` on mount scrolled ~4800px down the page before a reviewer ever saw the top. The demo now sits behind an explicit "Zobraziť dokončenie" trigger button, preserving `focusOnShow`'s real interaction-focus behavior as e2e-covered, user-triggered UI rather than a page-load side effect.

Full diff: `debc513..ac4a40b` (single commit, four files: `e2e/ui-foundation.spec.ts`, `src/shared/ui/UiKitScreen.tsx`, `tools/screenshots/capture.mjs`, `tools/screenshots/capture.verify.ts`).

---

## Verification Evidence

Evidence below is from this remediation pass (candidate `ac4a40b`), rerun proportionately to what the fix touched — a `/ui-kit` demo component, its e2e coverage, and a dev-only screenshot tool. Task 1–6 evidence (dependency install, build output size, etc.) is unchanged from the prior candidate and not rerun.

| Command | Result | Notes |
|---|---|---|
| `npx tsx tools/screenshots/capture.verify.ts` (new) | **PASS** | `✓ capture.mjs scene/help/config contracts passed` — confirmed RED first (`SCENES`/`parseArgs` not exported on the pre-fix module, via `git stash`), then GREEN after the fix |
| `npx tsx src/shared/ui/variants.verify.ts` | **PASS** | `✓ UI variant contracts passed` — unaffected by this remediation, rerun for an accurate baseline |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` (unchanged) |
| `npm run test:e2e` | **PASS** | 149/149 across `desktop`/`mobile` Chromium projects in ~32s, including the two new/changed `ui-foundation.spec.ts` overlay-focus tests (TDD RED confirmed pre-fix: trigger button not found / `scrollY` ≠ 0, then GREEN post-fix). One `parent-access.spec.ts` timer test flaked once under full-suite worker contention (`errorRecoveries` polled 0 instead of 1); reran clean 3/3 in isolation and clean again on a full-suite rerun — pre-existing timing sensitivity unrelated to this change's files, not investigated further per this task's scope. |
| `npm run build` | **PASS** | Production build in 0.91s; `AvatarScene-DoLu9sH7.js` (973.00 kB) stayed a separate chunk from the main `index-*.js` (739.71 kB) — see avatar/three.js confirmation below |
| `git diff --check` (working tree, pre-commit) | **PASS** | No whitespace errors or conflict markers |
| `npm run test:audio` | **Not rerun** | This remediation touches no audio files, `audioManager.ts`, or `contentRegistry.ts`; the pre-existing gap recorded against the prior candidate (missing bundled `syllables`/`words`/`phrases` MP3s, TTS fallback covers it) is unchanged and not re-verified here. |

### Avatar / three.js lazy-chunk confirmation
`grep`-ing the built main chunk (`dist/assets/index-*.js`) for `AvatarScene` finds exactly the Vite `import()` chunk reference and dependency map (`__vite__mapDeps=(..."assets/AvatarScene-....js"...)`, `import(\`./AvatarScene-....js\`)`) — not the module body itself. The avatar/three.js/R3F/drei code remains isolated in the separate `AvatarScene-DoLu9sH7.js` lazy chunk, unchanged by Phase 2.

---

## Screenshot Capture Evidence

Captured using `npm run shots -- --scene=ui-kit --scene=parents-gate --scene=settings` against a local `vite preview --port 4173` server built with `vite build --mode test`, using the now-permanent `'ui-kit'` scene (see remediation summary above).

Artifact path:
`artifacts/ui/ac4a40be0380e7bfc15a3e42c99eee902593661c/2026-09-16T12-52-06-572Z-57418`

### Captured Scenes & Viewports (10 canonical viewports each):
- **`ui-kit`**: `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`
- **`parents-gate`**: same 10 viewports
- **`settings`**: same 10 viewports

The capture tool's own console-error/failed-same-origin-request assertions passed for all 30 screenshots (the run would have thrown otherwise).

### Manual inspection (320×568, 667×375, desktop — required by Task 7 Step 2)
All nine images were opened and visually reviewed:
- **`ui-kit`**: now lands at the true top of the page on every viewport — heading, description, and the first "Actions — typed variants" section render cleanly with no clipping or overlap at 320×568, 667×375, or desktop. The prior mid-page auto-scroll gap (below) is resolved; no supplementary force-scrolled capture is needed anymore.
- **`parents-gate`**: keypad, equation, and confirm button fit cleanly with no clipping at all three sizes; the 667×375 short-landscape two-column layout (equation left, keypad right) shows no overlap.
- **`settings`**: font choice, custom-content, and feedback rows stack cleanly at narrow widths and lay out as expected at desktop; this route was not redesigned in Phase 2 (only `ParentsGate` was in scope) and looks unchanged from Phase 1.

### Resolved: `/ui-kit` capture-tool scene and top-of-page auto-scroll
Both gaps documented against the prior candidate (`debc513`) are fixed in `ac4a40b`, TDD-first (see remediation summary above and the commit message for the RED/GREEN detail):
1. `'ui-kit'` is now a permanent entry in `tools/screenshots/capture.mjs`'s `SCENES` config — `npm run shots -- --scene=ui-kit` (and `--help`, which lists it) work without any local/reverted edits.
2. `UiKitScreen.tsx`'s completion-overlay demo no longer renders `focusOnShow` pre-shown on mount; it requires an explicit click, so a fresh `/ui-kit` load stays at `scrollY = 0`. `e2e/ui-foundation.spec.ts` covers both the no-auto-scroll contract and (post-trigger) the original `focusOnShow` behavior.

### Reduced-motion behavior
Per the plan, reduced-motion behavior is covered as an automated interaction check rather than a screenshot: `e2e/ui-foundation.spec.ts` ("reduced motion removes confetti particles entirely") and `e2e/parent-access.spec.ts` ("reduced motion truly disables the wrong-answer shake, not just speeds it up") both passed in the `npm run test:e2e` run above. The screenshot sweep itself also runs every scene under Playwright's `reducedMotion: 'reduce'` context option.

### WebKit smoke — attempted a third time, still blocked by this sandboxed environment
The design spec calls for "a small WebKit smoke suite" covering representative routes. No WebKit Playwright project exists in this repo yet (only `desktop`/`mobile` Chromium projects in `e2e/playwright.config.ts`), and adding one is outside this remediation's scope (code-fix scope was limited to the two documented gaps). `npx playwright install webkit` was re-attempted (bounded to 240s this time rather than left unbounded): the 75.4 MiB download again completed cleanly to 100%, and this time the command itself returned (exit 0, no hang) — but the result was identical to the prior two attempts: only a partial `libwebrtc.dylib` landed in `~/Library/Caches/ms-playwright/webkit-2272/`, with no `pw_run.sh`/`.app` bundle anywhere under that directory. **WebKit smoke coverage still could not be captured in this environment.** The corrupted cache directory was removed again after confirming no runnable bundle existed. Three attempts across two sessions now reproduce the same post-download extraction failure consistently enough to treat it as a stable property of this sandbox, not transient flakiness — re-attempting here again is unlikely to change the outcome. This needs a non-sandboxed CI or developer machine before Phase 8 closes; it is not a Phase 2 product defect.

---

## Approved Dependency Versions (Task 1, Codex-approved before install)

| Package | Installed version |
|---|---|
| `@radix-ui/react-dialog` | `^1.1.23` |
| `@radix-ui/react-alert-dialog` | `^1.1.23` |
| `@radix-ui/react-radio-group` | `^1.4.7` |
| `@radix-ui/react-switch` | `^1.3.7` |
| `@radix-ui/react-tabs` | `^1.1.21` |
| `@radix-ui/react-dropdown-menu` | `^2.1.24` |
| `@radix-ui/react-label` | `^2.1.15` |
| `class-variance-authority` | `^0.7.1` |
| `clsx` | `^2.1.1` |
| `tailwind-merge` | `^3.7.0` |
| `@axe-core/playwright` (devDependency) | `^4.13.0` |

No dependency changes were made in Task 7; this table simply records what Tasks 1–6 already installed.

---

## Summary of Changes (Tasks 1–7)

1. **Task 1 — Dependencies:** Installed the Radix primitives, `class-variance-authority`, `clsx`, `tailwind-merge`, and `@axe-core/playwright` listed above (`415e8a6`).
2. **Task 2 — Semantic tokens and class merging:** Added `--color-canvas/surface/text-main/text-muted/action-primary/action-danger/focus/selected-surface/success-surface/border-subtle` tokens and a `prefers-reduced-motion` global rule to `src/index.css`; added `cn` (deterministic `clsx` + `tailwind-merge`) and `buttonVariants` (CVA) in `src/shared/ui/variants.ts` with `variants.verify.ts` covering the 48px child-target, primary-token, and no-`!important`-leak contracts (`2cac022`).
3. **Task 3 — Typed core controls:** `Button`/`IconButton` rebuilt on `buttonVariants` with `tone`/`size`/`density`, `data-tone` attributes, and a documented `LegacyButtonVariant`/`LegacyButtonSize` compatibility mapping; `ChoiceTile` gained explicit `neutral | selected | correct | wrong | disabled` state semantics; `PromptBadge` renders a real `Button` when interactive instead of `div role="button"` (`0bbc9be`, review-fixed in `de70030` for tap-target/typed-size gaps).
4. **Task 4 — Radix wrappers:** New repo-owned `Dialog`/`AlertDialog`/`RadioGroup`/`Switch`/`Tabs`/`DropdownMenu`/`Field`/`PageHeader`; `FormControls.ToggleControl` reimplemented on `SwitchControl` (deprecated `onToggle` signature kept), `SegmentedChoice` reimplemented on `RadioGroupControl` with real radio semantics, `IconMenuButton` reimplemented on `DropdownMenu` with its external API unchanged; `activeClassName` and the `!bg-*` exact-string repair pattern were removed from these primitives entirely (`68af9cf`, review-fixed in `f17b90f` for `SegmentedChoice` radio semantics and `6fb8d7c` for remaining typed-control gaps).
5. **Task 5 — Screen and motion foundations:** Added `src/shared/ui/motion.ts` (`motionPreset`: press/enter/reducedEnter/transition); `AppScreen` gained typed `mode`/`height`/`scroll`/`maxWidth`/`as` props, a `ResizeObserver`-based short-layout sizer (falling back to `window.innerHeight`), and deprecated `fixedHeight`/`scrollable` booleans; `OverlayFrame` stayed a non-modal labelled status region with finite reduced-motion-aware confetti (`bee6ab6`, review-fixed in `bff4454` for short-layout measurement and duplicate-`<main>` landmarks — `ParentsGate` and `FeedbackModal` now pass `as="div"`).
6. **Task 6 — `ParentsGate` migration:** Rebuilt on `DialogShell`/`Button` with the Phase 1 arithmetic contract, keypad, and test adapter preserved; added a visible `role="alert"` error, initial-focus/Tab-containment/Escape/trigger-restore coverage, and axe checks on `/ui-kit`, the gate, and the protected dashboard in new `e2e/accessibility-foundation.spec.ts` (`4795392`, review-fixed in `debc513` for reduced-motion shake, keydown double-submit prevention, stacked error timers, exact copy, and residual low-contrast text/tiles within Task 6's own file scope).
7. **Task 7 — Verification and handoff:** Ran the full required check set, captured and manually reviewed the `/ui-kit`, `parents-gate`, and `settings` screenshot sweep, attempted and documented the WebKit smoke gap, and wrote the original handoff plus the `ROADMAP.md` update. No product code was committed in Task 7 itself — see the (then-)reverted `tools/screenshots/capture.mjs` scene note.
8. **Task 7 remediation (this change, `ac4a40b`):** Fixed both gaps Task 7 had documented rather than fixed, TDD-first: `capture.mjs` permanently registers `'ui-kit'` in its `SCENES` config (exported, with a new `capture.verify.ts` covering it), and `UiKitScreen.tsx`'s completion-overlay demo moved behind an explicit trigger so a fresh `/ui-kit` load no longer auto-scrolls away from its own top. Reran proportionate verification (not the full Task 1–6 check set), recaptured all three screenshot scenes under a new artifact run, manually reviewed the required three viewports, re-attempted and re-documented the WebKit gap, and updated this handoff plus `ROADMAP.md` with the new candidate SHA.

---

## Internal Review Ledger

Each feature task's own review/fix cycle is visible directly in its commit pair on this branch (no separate subagent review artifacts were produced for this phase; the phase was implemented and self-reviewed within one Claude Code session per the implementation index's provider assignment):

- **Task 1 (deps):** `415e8a6` — clean, no follow-up fix needed.
- **Task 2 (tokens/variants):** `2cac022` — clean, no follow-up fix needed.
- **Task 3 (typed controls):** `0bbc9be` → fixed in `de70030` (tap-target minimums, typed-size detection).
- **Task 4 (Radix wrappers):** `68af9cf` → fixed in `f17b90f` (SegmentedChoice radio semantics, typed control tones) → further fixed in `6fb8d7c` (remaining typed-control gaps from the tone/variant refactor).
- **Task 5 (screen/motion):** `bee6ab6` → fixed in `bff4454` (short-layout measured by container not just `window`, duplicate `<main>` landmarks removed).
- **Task 6 (ParentsGate dialog):** `4795392` → fixed in `debc513` (motion, keys, timer, contrast, copy — see `ROADMAP.md` Decisions Log 2026-09-16 entries for the full rationale on each).
- **Task 7 (original handoff):** Verification-only; no code changes to review. Two gaps found during manual screenshot review (`/ui-kit` capture-tool scene missing; `/ui-kit` auto-scroll via the static `focusOnShow` demo) documented rather than fixed, since both were outside Task 7's own file scope.
- **Task 7 remediation (this handoff):** `ac4a40b` — clean, both documented gaps fixed with TDD (RED confirmed for each before the fix: `git stash`-verified missing `capture.mjs` exports/scene, and failing e2e assertions for the trigger button and `scrollY`), no follow-up fix needed.
- **Final integrated Codex review:** ✅ Spec review approved candidate `ac4a40be0380e7bfc15a3e42c99eee902593661c`; quality and visual review initially rejected the non-reproducible `/ui-kit` capture and page-load auto-scroll, then approved both after `ac4a40b` and the refreshed 30-image sweep.

---

## Remaining Compatibility Adapters

These are intentional, plan-sanctioned bridges kept until later phases migrate their callers — not defects:

| Adapter | Location | Removal condition |
|---|---|---|
| `cx` (deprecated alias of `cn`) | `src/shared/ui/utils.ts` | Remove once `rg` shows no remaining `cx(` callers |
| `LegacyButtonVariant`/`LegacyButtonSize` (`variant`, `size="sm"\|"md"\|"lg"`) | `src/shared/ui/Button.tsx` (shared by `IconButton`) | Remove once all call sites pass `tone`/typed `size` |
| `fixedHeight`/`scrollable` booleans | `src/shared/ui/AppScreen.tsx` | Remove once all call sites pass typed `height`/`scroll` |
| `onToggle`-shaped legacy call signature | `src/shared/ui/FormControls.tsx` (`ToggleControl`) | Remove once callers use `SwitchControl` with `onCheckedChange` directly |

Confirmed clean of `!important`/`!bg-*`-style overrides: `Button.tsx`, `IconButton.tsx`, `ChoiceTile.tsx`, `Card.tsx`, `PromptBadge.tsx`, and all six new Task 4 wrappers (`Dialog`, `AlertDialog`, `RadioGroup`, `Switch`, `Tabs`, `DropdownMenu`, `Field`). Remaining `!bg-*`/`!border-*`/`!shadow-*` usage in the codebase (`RecordingListItem.tsx`, `GameLobby.tsx`, `SuccessOverlay.tsx`, `PwaHomeControl.tsx`, `CountingItemsGame.tsx`, `AssemblyGame.tsx`, `App.tsx`, and the intentionally-labelled "legacy compatibility adapter" demo swatches in `UiKitScreen.tsx`) sits entirely in files outside every Phase 2 task's file scope (games, recordings, lobbies, PWA control) and is expected to migrate in Phases 3–7 as those surfaces are redesigned.

---

## Risks & Preconditions for Phase 3

- **No redesign of catalog, home, or lobbies introduced:** Phase 2 stayed within its boundary — only `ParentsGate` was migrated to the new dialog primitive; `/settings`, `/content`, home, and all game lobbies/rounds are visually unchanged from Phase 1.
- **WebKit smoke coverage is still missing** (see gap above, now attempted three times with a consistent result) — not a Phase 2 regression, but Phase 8's final release-hardening gate explicitly requires it, so it needs a working WebKit environment (non-sandboxed CI or developer machine) before that phase closes.
- ~~`/ui-kit` capture-tool scene and auto-scroll gap~~ — **resolved in `ac4a40b`**, see remediation summary above.
- **Phase 3 Preconditions:**
  1. Codex accepted candidate SHA `ac4a40be0380e7bfc15a3e42c99eee902593661c` after independent specification, code-quality, and refreshed screenshot review.
  2. Phase 3 (`docs/superpowers/plans/2026-09-14-ui-redesign-phase-3-catalog-home-lobbies.md`) starts only from the commit containing this acceptance record.

---

## Codex Review Record
- **Reviewed Candidate SHA:** `ac4a40be0380e7bfc15a3e42c99eee902593661c`
- **Result:** Accepted
- **Reviewer Notes:** The final specification review found the Phase 2 component, responsive, motion, accessibility, dependency, and scope contracts complete. The quality/visual review initially rejected two Task 7 evidence gaps: `/ui-kit` was not a permanent screenshot scene and its static focus demo auto-scrolled fresh loads. Candidate `ac4a40b` fixed both with automated coverage; the focused re-review approved the permanent capture contract and refreshed 30-image matrix, including 320×568, 667×375, and desktop. Chromium verification passed 149/149, lint and production build passed, and the avatar/three.js boundary remained lazy. WebKit remains a documented environment constraint and a Phase 8 release gate.
