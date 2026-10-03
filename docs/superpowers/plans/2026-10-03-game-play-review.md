# Browser annotation fixes

The user requests removal of all visible retry banners, random item placement in Counting
and Comparison, and complete answer shadows. These annotations authorize the following design.

Keep the shared live retry announcement and item-then-verdict audio contract. Remove the retry
note from TactilePiece while retaining its accessible description and success note. Add an
opt-in seeded scattered layout to QuantityTray: bounded randomized positions in disjoint cells,
64px maximum counters, and 48px counting targets wherever the tray can fit them. A layout seed
is stable for a round; replay, taps and retries do not move counters. Other quantity surfaces
retain their default grid. Remove the unnecessary answer-group scroll container and reserve
space for shadows around horizontal controls. Update UI Kit to demonstrate these contracts.

- [x] Reproduce retry text, fixed rows and shadow clipping with focused browser regressions;
  prove seeded scatter, containment, non-overlap and narrow counting targets in pure tests.
- [x] Implement the shared component fixes and opt counting/comparison into scattered layout.
  Update existing assertions that required visible retry text or centered grid bounding boxes.
- [x] Run lint, unit and pure checks, representative integration and production bundle checks.
  Review seeded 320px screenshot copies at the annotated size and constrained sizes.
- [x] Update roadmap and acceptance evidence; commit the verified fix on the feature branch.

Acceptance evidence: `../handoffs/2026-10-03-game-play-review.md`.
