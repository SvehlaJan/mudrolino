# Dragging in every tile-placement game

**Goal:** Extend the reviewed assembly drag behavior to Doplň slabiku and Doplň písmeno, the other games whose choices animate into answer slots.

**Design:** Extract the existing pointer gesture handling into a shared `useTileDrag` hook. Each game supplies eligible drop targets and keeps its own answer rules. Completion games accept only their active slot, evaluate through the existing answer handler and return wrong choices to their original tray position. Transfer the live drag clone into the existing animation so release never jumps back to the tray. Taps, keyboard controls, item/verdict audio order, reduced motion and assembly's reversible placement remain intact. Replay, Back, pause, Escape, native cancellation and unmount cancel the gesture without evaluating an answer.

- [x] Add and observe failing unit tests for drag-clone handoff and return geometry.
- [x] Add and observe failing browser contracts for both completion games: mouse/touch, correct/wrong, invalid targets, cancellation and sequential letter blanks.
- [x] Extract the shared pointer hook and wire all three games to it.
- [x] Extend tile transfer with optional drag-preview ownership and preserve cancellation/reduced-motion fallbacks.
- [x] Update the UI kit and roadmap with the supported controls.
- [x] Run affected browser suites, review the change, then fresh integration verification; inspect only 320px screenshot review copies.

Use the current feature branch and primary checkout. Preserve the previous review changes and unrelated avatar files.

Verification: 66 focused browser checks passed. Fresh `verify:edit --force` selected integration for the shared runtime and passed all gates: lint (zero errors, the existing ContentContext warning), 367 unit tests, pure contracts, development audio inventory, 502 browser tests, production build and bundle boundaries. Four seeded desktop/phone captures had no errors or failed requests; their 320px review copies were inspected. Independent read-only review found no important issues.
