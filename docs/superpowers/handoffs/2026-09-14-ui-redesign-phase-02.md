# UI Redesign Phase 2 Handoff Manifest: Design-System Foundation

## Metadata
- **Phase:** 2 (Design-System Foundation)
- **Branch:** `feature/full-app-ui-redesign`
- **Base SHA:** `f8da3a0ee888dcadfd28154d69d96cf92bf86151` (Codex-accepted Phase 1 candidate, commit "docs: accept UI redesign phase one")
- **Candidate SHA:** `debc513b8102dbef72ebed83301be9d98dfab0f9` ("fix: close Task 6 parent-gate review findings (motion, keys, timer, contrast, copy)") — the last product-code commit; this handoff commit and the `ROADMAP.md` update sit on top of it as reporting-only metadata and are not part of the reviewable code candidate.
- **Implementation Status:** Complete, pending Codex acceptance
- **Working Tree Clean:** Yes (`git status --short` clean immediately before this handoff commit)
- **Local Screenshot Artifact Directory:** `artifacts/ui/debc513b8102dbef72ebed83301be9d98dfab0f9/2026-09-16T12-30-21-522Z-50423`

---

## Verification Evidence

| Command | Result | Notes |
|---|---|---|
| `npx tsx src/shared/ui/variants.verify.ts` | **PASS** | `✓ UI variant contracts passed` — button variant class output and `cn` merge behavior |
| `npm run lint` (`tsc --noEmit` + ESLint) | **PASS** | 0 errors, 1 pre-existing documented `react-refresh/only-export-components` warning in `ContentContext.tsx` (unchanged by Phase 2) |
| `npm run test:e2e` | **PASS** | 148/148 tests passed across `desktop` and `mobile` Chromium projects in 32.0s, including the new `ui-foundation.spec.ts` (24 tests), `accessibility-foundation.spec.ts` (2 axe checks), and the expanded `parent-access.spec.ts` dialog-migration coverage |
| `npm run build` | **PASS** | Production build in 1.09s; `AvatarScene-DoLu9sH7.js` (973.00 kB) stayed a separate chunk from the main `index-*.js` (739.40 kB) — see avatar/three.js confirmation below |
| `git diff --check` (plan's literal no-arg form) | **PASS** | Clean working tree, nothing to check |
| `git diff --check f8da3a0..HEAD` (full phase diff, additional rigor matching the Phase 1 handoff) | **PASS** | No whitespace errors or conflict markers across the entire Phase 2 diff |
| `npm run test:audio` | **Not relevant; run anyway for an accurate baseline** | `git diff --stat f8da3a0..HEAD` touches no audio files, `audioManager.ts`, or `contentRegistry.ts`. The run shows 3/6 categories failing (missing bundled `syllables`/`words`/`phrases` MP3s, e.g. `raketa.mp3`, `kde-je-viac.mp3`) — a pre-existing gap unrelated to and unchanged by this phase; `audioManager` falls back to `sk-SK` TTS per its documented contract, so this is not a regression. |

### Avatar / three.js lazy-chunk confirmation
`grep`-ing the built main chunk (`dist/assets/index-*.js`) for `AvatarScene` finds exactly the Vite `import()` chunk reference and dependency map (`__vite__mapDeps=(..."assets/AvatarScene-....js"...)`, `import(\`./AvatarScene-....js\`)`) — not the module body itself. The avatar/three.js/R3F/drei code remains isolated in the separate `AvatarScene-DoLu9sH7.js` lazy chunk, unchanged by Phase 2.

---

## Screenshot Capture Evidence

Captured using `npm run shots -- --scene=ui-kit --scene=parents-gate --scene=settings` against a local `vite preview --port 4173` server built with `vite build --mode test`.

Artifact path:
`artifacts/ui/debc513b8102dbef72ebed83301be9d98dfab0f9/2026-09-16T12-30-21-522Z-50423`

### Captured Scenes & Viewports (10 canonical viewports each):
- **`ui-kit`**: `narrowPhone.png`, `smallPhone.png`, `phonePortrait.png`, `shortLandscape.png`, `phoneLandscape.png`, `tabletPortrait.png`, `tabletLandscape.png`, `desktop.png`, `desktopLarge.png`, `desktopWide.png`
- **`parents-gate`**: same 10 viewports
- **`settings`**: same 10 viewports

The capture tool's own console-error/failed-same-origin-request assertions passed for all 30 screenshots (the run would have thrown otherwise).

### Manual inspection (320×568, 667×375, desktop — required by Task 7 Step 2)
All nine images were opened and visually reviewed:
- **`parents-gate`**: keypad, equation, and confirm button fit cleanly with no clipping at all three sizes; the 667×375 short-landscape two-column layout (equation left, keypad right) shows no overlap.
- **`settings`**: font choice, custom-content, and feedback rows stack cleanly at narrow widths and lay out as expected at desktop; this route was not redesigned in Phase 2 (only `ParentsGate` was in scope) and looks unchanged from Phase 1.
- **`ui-kit`**: the captured frame lands mid-page (on the "Overlay Frame" demo section), not at the top, on every viewport — see the known-gap note below. A supplementary, non-committed capture that force-scrolled to `window.scrollTo(0, 0)` before screenshotting (same three viewports, same artifact run, saved under `.../ui-kit-top/`) confirms the actual top-of-page content — heading, description, and the first "Actions — typed variants" section — renders cleanly with no clipping or overlap at 320×568, 667×375, or desktop.

### Known gap: `/ui-kit` has no capture-tool scene, and auto-scrolls away from its own top
1. `tools/screenshots/capture.mjs`'s `SCENES` map (Files scope of Tasks 1–6, none of which touch it) had no `'ui-kit'` entry. A minimal scene (`goto('/ui-kit')` + wait for the `h1` "UI Kit" heading) was added locally to run this task's required sweep, then **reverted before committing** — Task 7's file scope and this session's explicit commit instruction are both "docs/roadmap only" — so the working tree stays clean of source changes. The screenshots above were captured while that temporary scene was in place; they remain valid evidence, but re-running `npm run shots -- --scene=ui-kit` will currently error with "Unknown scene" until a future change (recommended: a small Task-7-adjacent or Phase 3 follow-up) adds it back permanently.
2. Separately, and unrelated to the scene gap: `UiKitScreen.tsx`'s static `OverlayFrame show focusOnShow` demo (added in Task 5, line ~633) calls `.focus()` on its "Hrať znova" button on every mount via `OverlayFrame`'s `focusOnShow` effect. Because the browser auto-scrolls a freshly focused element into view, **every fresh load of `/ui-kit` immediately scrolls ~4800px down the page**, away from the heading and the first documented sections. Confirmed directly (`window.scrollY` = 4815 on load; `document.activeElement` is the "Hrať znova" button). This is correct, intended behavior for `OverlayFrame`'s real product use (scrolling a genuine game-completion overlay's action into view is desired), but it is a self-inflicted UX/review defect specific to `/ui-kit` statically rendering that state as "always shown." It is dev-only (the route is excluded from child navigation) and does not affect any shipping surface, so it was **not fixed** — Task 7's file scope is handoff/roadmap only. Recommended as a one-line follow-up (e.g. wrap that one demo's initial state behind a "show" toggle, or pass `focusOnShow={false}` in the static swatch) whenever `UiKitScreen.tsx` is next touched.

### Reduced-motion behavior
Per the plan, reduced-motion behavior is covered as an automated interaction check rather than a screenshot: `e2e/ui-foundation.spec.ts` ("reduced motion removes confetti particles entirely") and `e2e/parent-access.spec.ts` ("reduced motion truly disables the wrong-answer shake, not just speeds it up") both passed in the `npm run test:e2e` run above. The screenshot sweep itself also runs every scene under Playwright's `reducedMotion: 'reduce'` context option.

### WebKit smoke — attempted, blocked by this sandboxed environment
The design spec calls for "a small WebKit smoke suite" covering representative routes. No WebKit Playwright project exists in this repo yet (only `desktop`/`mobile` Chromium projects in `e2e/playwright.config.ts`), and adding one is outside Task 7's file scope. To still honor the requirement, WebKit was installed directly (`npx playwright install webkit`, matching the pattern `e2e/browserResolver.ts` already documents for sandboxed environments): the 75.4 MiB download completed to 100% twice, but the post-download install/extraction step then hung indefinitely both times, leaving only a partial `libwebrtc.dylib` in `~/Library/Caches/ms-playwright/webkit-2272/` with no runnable `pw_run.sh`/`.app` bundle. The second attempt was killed after several minutes of no progress (background task `bobi4i5ki`, exit 137) and the corrupted cache directory was removed. **WebKit smoke coverage could not be captured in this environment** — this mirrors the same class of sandbox constraint `browserResolver.ts` already documents for Chromium (network/extraction restrictions), just at the extraction step instead of the fetch step. This should be re-attempted from a non-sandboxed CI or developer machine; it is not a Phase 2 product defect.

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
7. **Task 7 — Verification and handoff (this change):** Ran the full required check set, captured and manually reviewed the `/ui-kit`, `parents-gate`, and `settings` screenshot sweep, attempted and documented the WebKit smoke gap, and wrote this handoff plus the `ROADMAP.md` update. No product code was committed in Task 7 — see the reverted `tools/screenshots/capture.mjs` scene note above.

---

## Internal Review Ledger

Each feature task's own review/fix cycle is visible directly in its commit pair on this branch (no separate subagent review artifacts were produced for this phase; the phase was implemented and self-reviewed within one Claude Code session per the implementation index's provider assignment):

- **Task 1 (deps):** `415e8a6` — clean, no follow-up fix needed.
- **Task 2 (tokens/variants):** `2cac022` — clean, no follow-up fix needed.
- **Task 3 (typed controls):** `0bbc9be` → fixed in `de70030` (tap-target minimums, typed-size detection).
- **Task 4 (Radix wrappers):** `68af9cf` → fixed in `f17b90f` (SegmentedChoice radio semantics, typed control tones) → further fixed in `6fb8d7c` (remaining typed-control gaps from the tone/variant refactor).
- **Task 5 (screen/motion):** `bee6ab6` → fixed in `bff4454` (short-layout measured by container not just `window`, duplicate `<main>` landmarks removed).
- **Task 6 (ParentsGate dialog):** `4795392` → fixed in `debc513` (motion, keys, timer, contrast, copy — see `ROADMAP.md` Decisions Log 2026-09-16 entries for the full rationale on each).
- **Task 7 (this handoff):** Verification-only; no code changes to review. One pre-existing gap found during manual screenshot review (`/ui-kit` auto-scroll via the static `focusOnShow` demo) documented above rather than fixed, since it is outside Task 7's file scope.

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
- **WebKit smoke coverage is still missing** (see gap above) — not a Phase 2 regression, but Phase 8's final release-hardening gate explicitly requires it, so it needs a working WebKit environment before that phase closes.
- **`/ui-kit` capture-tool scene and auto-scroll gap** (see above) — low severity, dev-only, but worth a one-line fix whenever `UiKitScreen.tsx` is next touched (likely Phase 3, since it modifies `UiKitScreen.tsx` for lobby examples).
- **Phase 3 Preconditions:**
  1. Codex reviews this handoff, the verification evidence, and the screenshot artifact directory above, then either accepts candidate SHA `debc513b8102dbef72ebed83301be9d98dfab0f9` (recording its own acceptance commit) or returns findings to this phase for remediation.
  2. Phase 3 (`docs/superpowers/plans/2026-09-14-ui-redesign-phase-3-catalog-home-lobbies.md`) starts only from Codex's acceptance commit, not from this handoff commit directly.

---

## Codex Review Record
- **Reviewed Candidate SHA:** _pending submission_
- **Result:** _pending Codex review_
- **Reviewer Notes:** _to be completed by Codex_
