# Bear Guide Phase A closeout — 2026-11-11

Implementation and technical verification are complete on `feature/bear-guide-phase-a` in the primary checkout. Exact-model art approval and Vercel Blob publication remain pending.

## Delivered

- Home welcome/tap animations, cross-session celebration rotation, empathetic exhausted-attempt and zero-score reactions, and the 12-second inactivity nudge.
- Shared prop resources, procedural eyelids/brows, post-clip zero-FPS rendering, released raw GLB bytes, and a precached offline still.
- The 18-clip `celebration-v7` candidate: 14,363 triangles, 1,190,036 raw bytes, 826,942 gzip bytes. SHA-256: `0bd0aaf5e592d8ce22b58c622d0f64adb73c27d2bc5ff0715c0e3d105ce92698`.
- Task 6 browser coverage and an offline preparation fix: skip optional network requests while offline, recover on a subsequent preparation after reconnection, and retain terminal failure behavior for actual resource errors.

## Verification evidence

- `node --import tsx tools/verification/run.ts --profile=integration --reuse` explicitly reused the successful 2026-11-11 16:58:44 UTC proof after confirming identical inputs, browser identity, environment, workers, and profile. It was not a fresh full-suite run. The original gate passed lint, units, pure verifiers, non-strict audio inventory, both builds, production bundle checks, and 581 integration browser cases with no skips, failures, or flaky cases. Report: `artifacts/verification/2026-11-11T16-52-40-684Z-integration.json`; browser details: `artifacts/verification/integration.json`.
- A fresh `node node_modules/@playwright/test/cli.js test --config=e2e/playwright.production.config.ts` passed all 8 production/offline cases, including home and feedback stills without console errors or failed requests. Report: `artifacts/verification/production-browser.json`.
- All six SHA-256 receipts in the candidate's canonical verification summary match the current native parity, clearance, optimization, runtime, still, and browser reports. The browser study has 30 passing views. The asset proofs cover 4,722 poses, zero new arm/head or arm/torso-leg contacts, and maximum native/runtime vertex error of 27.799 µm.
- Inspected only existing review images at 320px width: flex, bow, home, failure, and nudge. Review images are under `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/` and `artifacts/verification/bear-companion/celebration-v7/game-reviews/`.
- The npm/tsx CLI initially failed on sandbox IPC creation; the direct Node import ran the reuse check successfully. Browser checks ran outside the sandbox. No application changes were needed for the harness limitation.

Strict release verification was not rerun; existing pending audio recordings remain. No Meshy credits were spent during closeout.

## Remaining acceptance

The implementation plan explicitly requires user art approval of this exact v7 model before `publish_bear_companion.mjs --candidate=bear-v2`. Keep both verification summaries' `artReview.status` pending until that approval arrives. The public `src/avatar/companions/bear-v1.json` still selects `celebration-v6`. Blob publication and a production release are separate actions; no release branch update is part of this closeout.

The pre-existing untracked B04, F02, and female catalog diagnostic files were preserved and excluded from the commit.

## Development animation follow-up

Live user review exposed a development-only failure after closeout: StrictMode replay cleaned up a WebGL context created from a layout-effect microtask, then initialization on the reused canvas received that lost context. Shader precision queries threw and the optional companion stayed on its fallback still. Moving initialization to a passive effect lets the replay finish before the creation microtask.

The new `npm run test:e2e:dev` first failed on `still` instead of `rendered3D`. After the fix, both actual Vite-server checks pass: Home has changing canvas pixels through three tapped clips, and counting mounts a rendered celebration. These checks now run in integration/release profiles. The in-app browser was also confirmed to render 3D after reloading. The user-facing server on port 3000 now enables the existing local-v7 flag; publication is unchanged.

Lint passes with its one known warning. A sandbox unit run passed 676 tests; the remaining catalog HTTP transport test was blocked by `listen EPERM` on loopback. Full integration has not rerun for this follow-up: automatic permission review timed out twice before the runner started. The user explicitly chose to keep the focused browser results instead of rerunning full verification; this follow-up is accepted with that limited verification scope. Focused proof and the animation video are under `artifacts/verification/bear-companion/live-animation-debug/`; development suite results are in `artifacts/verification/development-browser.json`.
