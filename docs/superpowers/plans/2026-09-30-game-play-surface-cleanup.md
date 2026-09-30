# Game Play Surface Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve eight browser annotations without changing answer ordering or round semantics.

**Architecture:** The shared session owns success timing; `GameShell` owns overlays and the invisible retry announcement. Skladaj owns its source/word slot geometry. The three numeracy games use bounded, centered answer surfaces; shared materials gain only narrowly scoped variants. Keep these domains in separate commits and tests.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Vite, Playwright.

---

## Task 1: Shared success and retry feedback

**Files:** `src/shared/game/useGameSession.ts`, `src/shared/game/GameShell.tsx`, `src/shared/ui/UiKitScreen.tsx` if its demo changes, `e2e/game-shell.spec.ts`, `e2e/find-it-games.spec.ts`, `e2e/bespoke-literacy.spec.ts`, and any tests that assert visible `game-retry-status`. Do not change game-specific answer handlers.

- [ ] Add a browser test that holds praise audio pending, verifies the non-final success overlay remains, resolves audio, advances exactly once only after 1000 ms, and verifies manual Continue/backdrop advance cancels the timer. Include a final-round case that preserves the explicit recap.
- [ ] Add a test that a backdrop click advances while clicking the panel does not. `OverlayFrame` already accepts `onBackdropClick`; pass the same guarded `feedback.onContinue` action only for non-final success.
- [ ] Add a retry test measuring `game-interactive-content` and answer-region bounding boxes before and after a wrong answer. Require unchanged geometry, no visible banner, and a polite retry announcement available to assistive technology.
- [ ] Confirm the new tests fail on the current code. Implement an operation-bound 1000 ms timer after `audioManager.play(input.verdictAudio)` resolves in `useGameSession.resolveAnswer`. Add it to `timersRef`; use existing `invalidate()` to clear it on manual continue, pause, back/unmount, and new operations. Invoke `continueAfterFeedback`'s shared guarded transition rather than duplicating reducer logic. Never schedule for the final round or failure.
- [ ] Remove `RetryStatusBanner` from normal flow in `GameShell`; render the retry title/detail only in a visually hidden `role="status" aria-live="polite"` element, clearing it when retry ends. Update assertions that currently require the visible banner; preserve tile-local retry state and audio order.
- [ ] Run affected shell/FindIt/literacy specs and `npm run lint`. Commit `fix: keep game feedback from shifting the board` with a body explaining audio-bound timing and stable geometry.

## Task 2: Stable Skladaj syllable cells

**Files:** `src/games/assembly/AssemblyGame.tsx`, optionally `src/shared/game/materials/InsetSlot.tsx`/`WordRail.tsx` only for a focused variant, and new `e2e/assembly-layout.spec.ts`. Avoid editing existing `e2e/bespoke-literacy.spec.ts` because Task 1 owns it.

- [ ] Add browser geometry assertions after placing and returning a syllable: tray cell count/order/positions remain fixed; moved cell is visible as an empty noninteractive slot; word rail width/height and all word slot rectangles stay stable. Compare typography/box dimensions of a filled rail syllable with its source tray tile within a small tolerance. Include desktop, 320×568, and 667×375 cases.
- [ ] Confirm the assertions fail on the current code. Render tray cells from the original board tile order (`trayIndex`) rather than the shrinking `trayTiles` list. Use the present tile when available and a decorative, aria-hidden disabled empty cell otherwise. Keep the AnswerGroup's child count stable and its roving keyboard index limited to enabled buttons.
- [ ] Give each word slot a stable box size based on the same syllable tile token used in the tray; pending and filled states reserve identical geometry. Use a shared local class or CSS variable for the syllable type scale so “ŽI” looks like the same card in both places. Do not change tap-to-return, flight-clone positioning, audio, or focus recovery.
- [ ] Run `e2e/assembly-layout.spec.ts`, assembly/literacy specs, and `npm run lint`. Commit `fix: keep assembly syllable positions stable` with a body explaining disappearing source cells and rail growth.

## Task 3: Center and bound numeracy choices

**Files:** `src/games/counting/CountingItemsGame.tsx`, `src/games/addition/AdditionGame.tsx`, `src/games/compare/CompareQuantitiesGame.tsx`, `src/shared/game/AnswerGroup.tsx`, `src/shared/game/materials/PlayTray.tsx`, `src/shared/game/materials/BalancePlayfield.tsx`, `src/shared/game/materials/QuantityTray.tsx` if needed, `e2e/numeracy-responsive.spec.ts`, and focused numeracy specs. Do not edit `GameShell`.

- [ ] Add browser assertions at desktop, 320×568, and 667×375: number answer group's center is within 12 px of the tray center; each of four targets is at least 48 px and fully visible; the answer surface has a bounded height rather than taking all remaining page height; compare's two cards are equal height, centered, contain readable object groups, and do not overflow. Measure before and after retry to reject layout movement.
- [ ] Confirm red. For horizontal `AnswerGroup`, center the inner row and size buttons from `--tile-size` or a clamped compact token while retaining 48 px minimum, keyboard order, and fallback grid at constrained widths. Add an opt-in content-height/compact presentation to `PlayTray` and use it only for counting/addition; center that tray within their remaining game area.
- [ ] Bound the two `BalancePlayfield` cards to a responsive height and center them; keep `QuantityTray` measured within that bound with tokens centered. A short landscape layout must shrink the card height before the answer region overflows. Do not change counting or compare logic/audio.
- [ ] Run focused numeracy specs and `npm run lint`; run a pure `.verify.ts` if a logic module changes. Commit `fix: center and bound numeracy choices` with a body explaining the flex growth and start alignment.

## Task 4: Integrated verification and handoff

**Files:** `ROADMAP.md` after verification; no new product edits in this task.

- [ ] Run `npm run lint`, affected pure verifiers, `npm run test:e2e -- --workers=3`, `npm run build`, and `git diff --check` sequentially. If full-suite flakes occur, inspect their errors, rerun failures in isolation, and obtain one clean full run before marking the task complete.
- [ ] Capture the annotated states at narrowPhone, shortLandscape, and desktop using `npm run shots` against a test-mode preview, including success/retry, assembly after selection, counting, compare, and addition. Downsize copies to 320 px width before any visual inspection. Never view source-size PNGs.
- [ ] Update the Phase 8/game UI item in `ROADMAP.md`, including a Decisions Log row only if implementation differs materially from the approved design. Commit `docs: record game play surface verification` with check results in its body.
- [ ] Review the full diff, fast-forward the verified work into `feature/full-app-ui-redesign`, verify affected tests on that checkout, and keep its port-3000 dev server available for user review. Do not open a PR.
