# Game play surface cleanup — in-progress handover

Date: 2026-09-30. The user approved the eight browser annotations and said “Proceed.” Later they asked to wrap up for a fresh session. Do not request the same approval again. Do not inspect full-resolution screenshots; use copies resized to 320 px wide. The user prefers lower-cost implementation subagents.

## Checkout and source of truth

- Worktree: `/Users/svehla/playground/teo-learn/.worktrees/game-play-surface`
- Branch: `feature/game-play-surface`; this handover's predecessor HEAD was `4c32e41` and the worktree was clean.
- Main review checkout: `/Users/svehla/playground/teo-learn`, branch `feature/full-app-ui-redesign`, still at `cd33377`. Its existing dev server is on `http://localhost:3000` and still serves the previous game UI until integration.
- Approved design: `docs/superpowers/specs/2026-09-30-game-play-surface-cleanup-design.md`.
- Implementation plan: `docs/superpowers/plans/2026-09-30-game-play-surface-cleanup.md`.
- `npm ci --offline` has already installed dependencies in the worktree. `ROADMAP.md` has an open checklist item for this sweep; mark it complete only after integrated checks.

## Completed and reviewed

### Task 1 — shared feedback (commits `525c59c`, `b83c161`, `937ea52`)

Non-final success auto-advances one second after the full verdict audio finishes; Continue and success-backdrop click use the guarded transition; panel click does not dismiss. The timer is canceled by manual advance/unmount/new operation, and a paused already-armed success timer is rearmed on resume. Final recap and failure remain explicit. The visible normal-flow retry banner is removed from all games; a polite visually hidden status remains. The selected item still plays before praise.

Red-to-green browser timing evidence, focused shell/bespoke/numeracy cases, and lint passed (one known `ContentContext.tsx` Fast Refresh warning). Both spec and code-quality reviews passed after follow-ups. The complete suite has not run on this branch.

### Task 2 — Skladaj (commits `f10a6d5`, `2fd1ac1`, `4c32e41`)

Original tray positions remain as visible, aria-hidden dashed empty cells when a syllable moves. Word slots reserve stable geometry and use the tray tile's type scale. `AnswerGroup` now includes decorative placeholders in layout geometry while skipping them in focus/keyboard navigation; the later keyboard fix maps arrow/Home/End navigation through full slot indices. Place/return and keyboard regression tests passed 4/4 across desktop, 320×568, and 667×375; existing Skladaj keyboard case passed 1/1; lint passed with the known warning. Spec and code-quality reviews passed after the visible-slot and keyboard follow-ups.

## Remaining implementation

1. **Task 3 — numeracy** in the plan is untouched. Center and bound Spočítaj/Sčítaj number choices and Viac alebo Menej quantity cards. Work in `CountingItemsGame`, `AdditionGame`, `CompareQuantitiesGame`, `PlayTray`, `BalancePlayfield`, `QuantityTray`, and, if needed, `AnswerGroup`. Preserve Task 2's decorative-placeholder contract in `AnswerGroup`. Add desktop/narrow-phone/short-landscape geometry tests, red then green, verify focused numeracy specs and lint, commit. Use a lower-cost implementation agent; then separate spec and quality reviews with follow-ups for findings.
2. **Task 4 — integrated verification** in the plan: run lint, any affected pure verifiers, full `npm run test:e2e -- --workers=3`, production build, `git diff --check`, and reduced-size screenshot review. The annotated scenes are success/retry, assembly after one placement, counting, compare, and addition at narrowPhone, shortLandscape, and desktop. The current capture script has `game-shell-success`, `game-shell-retry`, `assembly-round`, `counting-round`, `compare-round`, and `addition-round`; it lacks an `assembly-placed` scene, so add one or capture that state with a one-off browser script. Resize all captured PNGs before viewing. Update the open `ROADMAP.md` item only after checks pass.
3. Request one whole-change code review. Fast-forward the verified worktree branch into `feature/full-app-ui-redesign` in the root checkout, verify affected flows there, keep port 3000 available for the user's review, and remove the managed local worktree/branch when safe. Do not open a PR unless asked.

## Known coordination points

- The success overlay is rendered after selected-item audio but during praise audio. `useGameSession.resolveAnswer` dispatches `ANSWER_CORRECT` before awaiting verdict audio. The one-second countdown starts only after that await resolves.
- Existing tests that manually click Continue may race the new one-second advance under heavy full-suite load. Inspect failures rather than increasing generic timeouts; the explicit button remains supported.
- Shared `AnswerGroup` is now placeholder aware for Skladaj. Numeracy changes to horizontal layout must preserve grid keyboard semantics.
- Visual mockup was shown at `http://localhost:57125` using ignored `.superpowers/brainstorm` files; the server is ephemeral and is not required for implementation.
- No audio files or audio keys changed so far; `npm run test:audio` is only needed if later work changes them.
