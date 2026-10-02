---
paths:
  - "e2e/**/*.ts"
  - "src/shared/services/e2eState.ts"
---

# End-to-end tests

`e2e/` holds the Playwright suite: `playwright.config.ts`, helpers in `support/`,
and `*.spec.ts`. `npm run test:e2e` builds a test-mode bundle, starts
`vite preview` for the isolated `dist-e2e` artifact, and runs integration coverage.
Functional checks run once; `@geometry` checks run at narrow phone, short landscape
and desktop. Explicit viewport loops have one owner. `verify:edit` selects source-mapped
suites; shared or unknown changes select integration. `verify:release` retains the full
viewport matrix, WebKit, parent-data, real audio/order, production guards and offline.
See AGENTS.md for commands and saved verification reports.

## Oracle hook, not guesswork

Games publish an additive `window.__E2E__` object via `setE2EState()` from
`src/shared/services/e2eState.ts`, active only in dev or the `test` build mode
and never in production. Specs read it with `getE2EState()` from
`support/e2eHook.ts` to learn the correct answer for the current round. Do not
infer the answer from rendered content.

## One failure, many red tests

Every spec asserts no console errors and no failed requests on the route it
visits, so a single unrelated 404 — a missing favicon, say — fails tests across many routes. When the whole suite goes red, look for one shared cause before
debugging an individual spec.

## Browser resolution

`browserResolver.ts` decides which Chromium to launch: an explicit
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` wins, otherwise a bare `chromium` under
`PLAYWRIGHT_BROWSERS_PATH` (what sandboxes that block `cdn.playwright.dev`
pre-stage), otherwise `undefined` so Playwright's managed browser is used. The
run prints which binary it picked. If `npx playwright install` 403s, do not
chase it — the fallback already handles that case. Cover changes with
`npx tsx e2e/browserResolver.verify.ts`.

## Adding coverage

Every new route goes in `smoke.spec.ts`. `find-it-games.spec.ts` already covers
any game built on `FindItGame`; a bespoke game needs its own oracle hook and
golden-path spec.

## Fast fixtures and artifacts

Use `support/fixtures` for ordinary game/geometry tests: deterministic media and speech.
Held audio tests override it to check ordering. Dedicated native media and audio-output tests
use Playwright directly so actual completion, cancellation and fallback remain covered.
New shared lifecycle/timing contracts belong in fast controller tests; browser checks verify wiring.

Do not import a Playwright config from a spec. Shared viewport policy lives in support.
Configs use strict ports, reject server reuse, validate build identity and save JSON reports.
Use seeded `npm run shots` and inspect only 320px review copies. Keep reduced-motion and
accessible announcement assertions on visible UI; do not sample transforms of hidden status nodes.
