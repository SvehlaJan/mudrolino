# Development efficiency handoff

Implemented the approved recommendations on `feature/development-efficiency`, based on
`01a1b288a4dcac308d9fe562f341e74bb8a2af5b`, in `.worktrees/development-efficiency`.
The original checkout and its running development server were preserved. No PR or deployment.

## Daily workflow

After dependency installation, run `npm run setup:browsers` once. Matching Playwright packages
are pinned to 1.60.0, which fixes the archive extraction stall observed with 1.59.1 on Node 26.

- `npm run test:unit:watch` gives fast session/audio feedback without a browser.
- `npm run verify:edit` runs lint, unit, legacy pure checks and development recording inventory,
  then chooses browser suites from staged, unstaged and untracked changes. Add `-- --base=<ref>`
  to include committed changes. `-- --dry-run` explains selection. Unknown/shared inputs broaden
  conservatively to integration.
- `npm run verify:integration` runs all functional contracts and three geometry sizes, plus
  production build/bundle checks. Use before accepting shared runtime or shell changes.
- `npm run verify:release` adds the exhaustive viewport matrix, WebKit, accessibility, parent-data,
  production/offline checks and strict recording inventory. It continues independent gates even
  after a failure and writes an aggregate report.

`--reuse` explicitly reuses a successful proof only for the same input, profile, workers and
environment identity. Browser identity includes installed headless shell and runtime metadata;
local configuration contributes to the input hash without disclosing values. `--force` runs fresh.
Reuse is optional; never describe it as a fresh test run.

Test output lives in `dist-e2e`; production output stays in `dist`. Preview servers use strict
ports, cannot be reused, and must serve the local expected build identity. JSON results and
aggregate reports are ignored under `artifacts/verification`; each profile retains its own traces
under `test-results`. Browser tests remain silent, including native production playback checks.

## Coverage and architecture

The shared session controller has injectable audio/clock dependencies and behavioral tests for
ordering, timing boundaries, attempts, locks, pause/replay, stale work and disposal. React owns
subscription and shared opening/completion effects; each game still owns its board/animation.
The refactor also fixes resuming a paused terminal verdict that otherwise stranded completion.

Ordinary browser fixtures use fast audio; explicit held-audio and native-media checks retain
their respective contracts. Repeated viewport executions were reduced: integration 667 to 387,
release 322 to 305. The literacy split preserves all 231 assertion-bearing lines. Release keeps
all prior distinct titles and adds parent-data ownership. Rotation checks have a single owner.
Behavioral content checks replace source-string assertions. All legacy pure verifiers remain.

## Measured verification

These are observed runs on this Mac with three browser workers, not general runtime guarantees.
Agent-token savings were not measured.

| Check | Final evidence | Result |
| --- | --- | --- |
| Focused counting profile | `artifacts/verification/2026-10-02T16-50-21-429Z-edit.json` | 47.7 s total; 35 browser checks |
| Integration browser | `artifacts/verification/integration.json` | 387 passed in 153.8 s, versus audited 8.8 min baseline |
| Release browser after fixture correction | `artifacts/verification/release.json` | 305 passed in 144.1 s; no skips or flaky results |
| Production/offline browser | `artifacts/verification/production-browser.json` | 5 passed in 21.6 s |
| Final cheap gates | `artifacts/verification/2026-10-02T18-45-58-963Z-none.json` | Lint: zero errors, known ContentContext warning; 57 unit tests; every legacy pure verifier; development inventory passed |
| Production build and lazy bundle | `artifacts/verification/2026-10-02T17-12-26-570Z-release.json` | Passed; avatar remains lazy |
| Strict recording inventory | Same aggregate release report | Expected failure: exactly 40 pending recordings |

The aggregate report above remains red: it records both the expected strict inventory failure
and the then-failing Assembly retry fixture. Its later focused and full release reruns passed.
The fixture now seeds distinct `ja-ho-da` labels, so swapping tiles necessarily gives a wrong
answer. No unrelated integration/production rerun was needed after that test-only correction.
The final browser-cache correction passed its new regression tests and independent review;
unchanged proof reuse was exercised and reported explicitly.

Seeded screenshot review used seed 42 for long assembly labels, duplicate syllables, ten counters
and a numbers round at narrow phone, short landscape and desktop sizes. All twelve 320px review
copies were inspected; capture manifest reports no console/request errors. Evidence:
`artifacts/ui/2026-10-02T16-59-27-271Z-91964-01a1b28/manifest.json`.
Use `npm run shots -- --seed=42` for reproducible captures; inspect the reduced copies.

## Remaining shipping gate

Record the 40 entries in `public/audio/_review/pending-recordings.json` before deploying to
friends and colleagues. Development permits only those declared omissions and rejects new
omissions, duplicates, stale entries and orphan files. Strict mode requires all clips present
and the pending list empty. Remove each entry as its recording lands, then run
`npm run test:audio:strict` and `npm run verify:release` before deployment.
