# Task/answer cards, development gallery and tile placement

Date: 2026-10-03. Branch: `feature/full-app-ui-redesign`. Base: `f6568c2`.
Status: implemented, reviewed and verified. No deployment or pull request requested.

## Delivered scope

- All eleven games use the Slová answer-card appearance: white fill, thin light border, 22px corners and raised shadow. A required task/answer role replaces implicit material affordances; wider comparison cards remain permitted.
- Supporting pictures use flat circular frames; counting objects and word rails are flat. Counting interactions, stable scattered positions, accessible names and shadow clearance remain. Placed/returnable Assembly tiles retain the answer appearance.
- `/ui-kit` adds a searchable inventory of 103 named app components with categories, source paths, usage references and accurately labelled live/full-flow links. AST generation and freshness checks prevent silent inventory drift. Gallery code loads only in development/test; production redirects home and excludes it from every bundle chunk.
- Skladaj, Doplň slabiku and Doplň písmeno transfer selected tiles into the question slots. Assembly's source query now spans the tray and rail. Guided transfers scale proportionally into the destination. Input enters normal resolving immediately; item audio precedes outcome/verdict, and outcome awaits landing.
- Guided transfers retain their landed clone through longer recordings until the filled DOM commits. Reduced motion shows a cancellable immediate slot preview without prematurely committing session progress. Transfers clean up on interruption and unmount and have inert/aria-hidden clones. Failed browser animation falls back to immediate guided placement. Wrong guided choices remain in the tray. Explicit tile transition properties exclude visibility, so native focus and clone handoffs cannot be delayed by `transition-all`.
- Inline gallery overlay specimens render settled, avoiding transient opacity/contrast failures while preserving actual game feedback entrances.

## Verification

- `npm run verify:integration` — PASS, all eight gates: lint (0 errors; existing ContentContext react-refresh warning), 80 unit tests, all pure verifiers, development audio inventory, test build, 454/454 representative browser tests, production build and bundle boundaries. Report: `artifacts/verification/2026-10-03T12-54-17-096Z-integration.json`; browser detail: `artifacts/verification/integration.json`.
- `npx playwright test --config=e2e/playwright.production.config.ts e2e/production-guards.spec.ts` — 3/3 passed, including gallery redirect and absence of test/experimental route access.
- Seeded `npm run shots` — 39/39 successful captures: eleven active rounds, Assembly placed/returnable state and gallery, each at 320×568, 667×375 and 1280×900. All 39 were inspected only as 320px review copies; no clipped solid shadows or changed overflow/readability defects found. Zero console/page errors and zero failed local requests. Evidence: `artifacts/ui/2026-10-03T12-59-36-769Z-28938-f6568c2/manifest.json` and its `review/` tree.
- Spec and quality reviewers approved the component gallery and final role/motion implementation. The motion spec has 21 cases, including held item audio, replay after arrival, reduced-motion preview rollback, actual flight/fit and exit cleanup. Controller and helper lifecycle tests cover immediate locking, cancellation and deferred verdict. The final integration includes these cases and the existing Assembly keyboard regression.
- Regression provenance: initial style checks failed on circular/flat answers; actual tile-travel tests failed without clones; controller-boundary tests failed without the landing await. Review exposed a long-audio visual gap and a real keyboard-focus failure; both received focused checks and passed the final integrated run. An earlier integration's one gallery contrast failure was repaired by settled inline specimens. A subsequent run was intentionally interrupted for the long-audio fix and is not claimed as a successful gate.

Source/input fingerprint: `143f9cf0010b2f29509f157f7db2d4f778d4c38ba3290f08f42d5f2efa0f1164`, matching the capture manifest and production identity. Test-build fingerprint: `1936d17f373ec177d529b0b0c8142e337966cadcfd8aa15af1d46d42aa633837` (the test build supplies its explicit feedback key). Build identities record base HEAD `f6568c2714a4c7c578571c2dab50ee7f96256716` plus these fingerprints for the implemented working tree; they do not claim the base commit alone contains the changes.

## Remaining deployment work

The 40 documented missing recordings remain pending by user agreement. Development audio inventory allows only that explicit list; strict audio and the exhaustive release gate must pass before deploying to friends/colleagues. No recordings or deployment changes were made in this work.
