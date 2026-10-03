# Game play browser review — 2026-10-03

Completed the five user annotations on Numbers, Counting and Comparison, based on `285d550`.

- TactilePiece no longer displays a retry note or retry icon on the clicked card. Spoken
  item-then-retry feedback, the hidden live announcement and accessible description remain.
  This applies consistently to the shared game materials; success notes remain.
- Counting and object-mode Comparison use seeded scattered positions. Tokens occupy disjoint
  cells, remain within their tray, and keep their positions through taps, replay and retries.
  Counters are capped at 64px; counting preserves 48px targets wherever the tray fits them.
  Tight trays reduce their edge gutter to preserve those targets. Numeral mode and other
  quantity surfaces retain their existing behavior.
- Horizontal AnswerGroup no longer creates a scroll container that clips its children's
  shadows. Padding reserves paint space around number answers and comparison cards.
- UI Kit demonstrates scattered quantities, silent visual retry states and padded choices.

## Verification

Regression tests first reproduced aligned counters, seed-insensitive positions, card retry
text and both shadow-clipping defects. Visual capture then exposed ten counters losing their
48px targets at 667×375; a new failing pure test and deterministic browser case cover that edge.

- `npm run verify:integration`: all gates passed, including 392 browser checks in 157.8 seconds,
  lint with only the known ContentContext warning, unit/pure checks, development inventory and
  production build/bundle checks. Aggregate report:
  `artifacts/verification/2026-10-03T05-29-27-673Z-integration.json`.
- After the small edge-gutter correction, `npm run test:e2e -- e2e/game-play-review.spec.ts e2e/numeracy-responsive.spec.ts e2e/counting.spec.ts --workers=3`:
  19 affected browser checks passed in 18.0 seconds. The unchanged shared-material coverage
  above was not repeated.
- Final cheap gates: 62 unit tests, every pure verifier, lint and development inventory passed.
  Report: `artifacts/verification/2026-10-03T05-36-49-652Z-none.json`.
- Fresh final production build and `npm run verify:bundle` passed; the avatar stays lazy.
- Seed 42 captures: Numbers during retry, Counting, maximum ten counters, and Comparison at
  1107×853, 320×568 and 667×375. All twelve 320px review copies were inspected. The manifest
  reports no console errors or failed requests:
  `artifacts/ui/2026-10-03T05-37-10-844Z-11421-285d550/manifest.json`.

Capture and build hashes reflect their different environments: the test bundle receives
`VITE_WEB3FORMS_KEY=e2e-placeholder`. With that same environment, its fingerprint matches the
current source. Earlier failed helper captures are diagnostic artifacts, not acceptance evidence.

No recordings or audio keys changed. The 40 known pending recordings remain a shipping gate.
The development server on port 3000 serves the updated checkout for the user's hands-on review.
