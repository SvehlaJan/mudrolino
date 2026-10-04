# Feedback timing and simpler home icons

Delivered on `feature/full-app-ui-redesign` following the three browser annotations.

- Both transient success and failure use the same backdrop action and one-second automatic advance after verdict audio ends. Panel clicks keep the modal open; manual dismissal cancels the timer. Final-session choices remain explicit.
- The 500ms retry debounce starts at the tap and overlaps item/retry audio and physical movement. Input still waits for both to finish. The hidden polite retry announcement remains available while the question becomes answerable, until the next tap.
- Seven literacy badges now use large letters, a book, and simple tile outlines rather than multi-step diagrams. Numeracy icons retain the reviewed drawings. `/ui-kit` documents the shared behavior and shows the revised icons.
- Existing browser helpers observe recorded wrong-attempt counters instead of relying on a transient phase that can now clear immediately.

## Verification

Fresh `npm run verify:integration` **passed**: lint (zero errors, the known ContentContext refresh warning), 90 unit tests, all pure verifiers, development recording inventory, test build, **474/474 browser checks**, production build and production bundle boundaries.

Report: `artifacts/verification/2026-10-04T06-25-21-105Z-integration.json`.
Test build fingerprint: `c580a5ab8a051a396411bf4598c936189c9e01d365c521494a48c9c4d74ba4ea`.

Before implementation, four controller cases failed for the missing failure advance and redundant retry delay; both new complete-syllable dismissal browser cases also failed. They passed in the fresh integration run. Additional controlled-clock coverage preserves pause/resume, manual/automatic cancellation, and final-round handling.

Seven seeded visual captures were reviewed only at 320px width: home and complete-syllable failure at narrow phone, short landscape and desktop, plus the icon gallery. The final manifest reports no console errors or failed requests. A deterministic-audio probe measured **0ms idle lock after wrong-tile return** for both complete-syllable and complete-letter. Its initial temporary-script serialization issue was corrected before accepting the measurements.

Artifacts: `artifacts/ui/2026-10-04-feedback-icons-review/manifest.json` and `retry-timing.json`.

Concurrent avatar documentation, concepts and pre-existing audit files remain outside this change. No deployment or pull request was created.
