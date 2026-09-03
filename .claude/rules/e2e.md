---
paths:
  - "e2e/**/*.ts"
  - "src/shared/services/e2eState.ts"
---

# End-to-end tests

`e2e/` holds the Playwright suite: `playwright.config.ts`, helpers in `support/`,
and `*.spec.ts`. `npm run test:e2e` builds a test-mode bundle, starts
`vite preview`, and runs against it. 28 tests across a desktop and a mobile
project.

## Oracle hook, not guesswork

Games publish an additive `window.__E2E__` object via `setE2EState()` from
`src/shared/services/e2eState.ts`, active only in dev or the `test` build mode
and never in production. Specs read it with `getE2EState()` from
`support/e2eHook.ts` to learn the correct answer for the current round. Do not
infer the answer from rendered content.

## One failure, many red tests

Every spec asserts no console errors and no failed requests on the route it
visits, so a single unrelated 404 — a missing favicon, say — fails all 28 tests
rather than one. When the whole suite goes red, look for one shared cause before
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
