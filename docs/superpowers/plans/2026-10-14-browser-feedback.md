# Browser feedback implementation plan

**Goal:** Apply the eleven review comments to home cards and syllable assembly.

**Design:** Use the shared catalog names in Slovak and Czech. Home cards show only icon and title. Remove the shared settled-piece banner while retaining accessible feedback. Assembly keeps tap and keyboard controls, adds pointer dragging to any empty rail slot and back to the tray, and morphs one tile into a flush rail piece. Invalid or cancelled drops preserve the board. Input locks, audio ordering, reduced motion and cleanup follow the existing session contracts.

- [x] Add behavioral tests for targeted placement, rejected targets, repeated syllables and immutable state; observe failures before implementation.
- [x] Add browser regressions for names, icon-only cards, banner removal, tray centering, flush landing, mouse and touch dragging, cancellation and occupied targets.
- [x] Update `uiCopy.ts`, `GameCard.tsx`, `TactilePiece.tsx` and their existing expectations and UI kit examples.
- [x] Extend `assemblyLogic.ts` with explicit empty-slot placement. Cap assembly grid tracks to the actual piece size through `AnswerGroup.tsx`.
- [x] Add a local pointer-drag hook using capture, a movement threshold and a floating tile. Hand accepted drops to the existing flight animation; restore invalid drops and cancel on pause, replay, round changes and unmount.
- [x] Update the assembly rail to a single flush frame and morph border, radius, typography and shadow alongside size and position.
- [x] Update `ROADMAP.md`; run lint, unit/pure tests and fresh integration browser verification. Inspect only screenshot review copies at 320px width.

Work stays on the existing feature branch in the primary checkout. No deployment or pull request is requested.

Verification: fresh `npm run verify:integration -- --force` passed all gates; 364 unit tests and 491 integration browser tests passed. Nine seeded screenshot captures had no console errors or failed requests; their 320px review copies were inspected. Read-only review finding about pointer cancellation was reproduced with native touch, fixed, and covered by a passing regression.
