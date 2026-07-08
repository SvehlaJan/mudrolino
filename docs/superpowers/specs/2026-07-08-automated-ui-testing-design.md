# Automated UI Testing Design

## Summary

Add a persisted, repeatable automated UI test suite covering all mini-games, built on `@playwright/test`. This replaces the current pattern of ad-hoc, one-shot Playwright verification scripts written by hand inside each feature's implementation plan (e.g. "Task 5: Browser Verification" in recent game plans) with a real test runner: `npm run test:e2e`, run locally/on-demand.

## Current State

- No test runner is configured (per `CLAUDE.md`). The only automated checks are `.verify.ts` one-shot scripts (pure logic, run via `npx tsx`, no browser) and `npm run test:audio` (audio file coverage).
- `playwright` (the raw library, not the `@playwright/test` runner) is already a devDependency, used exclusively for hand-written, throwaway `node -e "..."` scripts baked into feature plans to screenshot new routes at desktop (1280x900) and mobile (390x844) viewports.
- A repo-local skill, `.agents/skills/playwright-browser-verification/SKILL.md`, documents conventions for these one-off checks (macOS sandbox gotchas, viewport sizes, avatar canvas special-casing).
- The 9 mini-games fall into three mechanical shapes:
  1. **Shared engine** — alphabet, syllables, numbers, words all use `src/shared/components/FindItGame.tsx` (single-tap-to-answer on a content grid).
  2. **Guided fill-in-blank sibling pair** — `Doplň slabiku` (complete-syllable) and `Doplň písmeno` (complete-letter) share the same round lifecycle (timers, session-token guard, sequential blank-filling, overlay sequencing) — `Doplň písmeno` was explicitly built by mirroring `Doplň slabiku`.
  3. **Truly bespoke** — counting, first-letter, and assembly each have a one-off mechanic with no sibling.

## Goals

- Deterministic, repeatable coverage of all 9 games without relying on a human (or an LLM) visually inspecting screenshots or guessing correct answers from word/emoji content.
- Two depths per game: a fast smoke check (route loads, lobby renders, no console errors) and a golden-path flow check (play a round to completion via correct answers, reach the terminal overlay).
- Catch the class of bug found during this session's manual QA: cross-element layout overlap that only appears at certain viewport sizes, and overlay states that are easy to miss by eye but easy to assert for programmatically.
- Fit naturally into the existing subagent-driven-development workflow: a future game's plan gets a step that extends the suite instead of writing a disposable verification script.

## Non-Goals

- No CI wiring in this iteration. The suite runs locally/on-demand (structured so CI can be added later without rework).
- No visual regression / screenshot diffing.
- No testing of actual audio playback correctness (TTS fallback, clip sequencing) — this is already covered by `test:audio` and the `.verify.ts` audio-spec assertions at the logic layer.
- No avatar/React-Three-Fiber canvas testing (out of scope; the existing repo-local Playwright skill already documents ad-hoc canvas verification separately).
- No replacement of existing `.verify.ts` pure-logic scripts — they stay as-is. E2E tests are additive, covering UI/interaction flows those scripts can't reach.
- No performance/load testing.

## Test Runner

Add `@playwright/test` as a new devDependency. The existing raw `playwright` package can remain or be removed once nothing depends on it directly — a decision for the implementation plan, not this design.

## Architecture

New top-level `e2e/` directory (not co-located with game source, unlike `.verify.ts` — these tests need a shared config/fixtures and don't belong to a single module):

```
e2e/
  playwright.config.ts
  support/
    viewports.ts       # DESKTOP = {width:1280,height:900}, MOBILE = {width:390,height:844}
    e2eHook.ts          # typed helper for reading window.__E2E__
    assertions.ts       # expectNoConsoleErrors, waitForOverlay, etc.
  smoke.spec.ts          # all 9 games, desktop-only: route loads, lobby renders, no errors
  find-it-games.spec.ts  # data-driven golden path: alphabet, syllables, numbers, words
  fill-in-games.spec.ts  # shared golden path: complete-syllable, complete-letter
  counting.spec.ts
  first-letter.spec.ts
  assembly.spec.ts
```

Test organization mirrors the app's own mechanical boundaries (shared engine / sibling pair / bespoke) rather than inventing a new grouping, and rather than forcing one harness over every game or duplicating identical structure across files.

## Test-Only Answer Oracle

Playwright cannot infer a round's correct answer from rendered content the way a human (or an LLM reasoning about Slovak vocabulary) can — and for audio-prompted games (e.g. alphabet), the correct answer isn't present in the DOM at all by design. Tests need a deterministic, non-visual way to know the correct choice for the active round/blank.

Each game exposes a small, additive `window.__E2E__` object, populated only when `import.meta.env.DEV || import.meta.env.MODE === 'test'` — never in production builds. It mirrors state that already exists in the game's React state; it does not change any game's real logic or add new behavior. Shape is game-specific, e.g. for `Doplň písmeno`:

```ts
window.__E2E__ = {
  correctSymbol: string,        // the correct letter for the currently active blank
  missingBlanksRemaining: number,
}
```

Golden-path tests read this object to click the correct (or a deliberately wrong, for failure-path coverage) choice tile, instead of guessing.

## Golden-Path Flow Pattern

Shared per-cluster helpers drive the actual interaction:

- **Find-it games**: a `playFindItRound(page, { expectCorrect })` helper — single tap, no blanks.
- **Fill-in games**: a `playFillInGameRound(page, { expectCorrect })` helper — reads `window.__E2E__.correctSymbol`, clicks the matching (or wrong) tile, repeats once per remaining blank. Parameterized per game only by route and expected blank count.
- **Bespoke games**: each spec drives its own flow directly; no shared helper is forced onto mechanically distinct games (drag/tap-to-place for assembly, numeric input for counting, first-letter's single-tap-on-word-audio flow).

## Assertions and Pass/Fail Criteria

Every spec asserts, at minimum:
- No browser console errors.
- No failed network requests.

Golden-path specs additionally assert:
- The expected overlay (`SuccessOverlay` / `FailureOverlay` / `SessionCompleteOverlay`) actually appears, located via `page.waitForSelector`/`page.getByRole` with generous timeouts — not fixed `sleep()` calls, since overlay auto-dismiss timing is exactly what caused missed screenshots during this session's manual QA.
- Every game's golden-path spec exercises both the correct-answer path (via the oracle's `expectCorrect: true`, reaching `SuccessOverlay`) and a deliberate-wrong-answer path (via `expectCorrect: false` repeated to `MAX_ATTEMPTS`, reaching `FailureOverlay`) at least once.
- Round counters increment as expected across a full 5-round session for one designated representative game per cluster (alphabet for find-it, complete-letter for fill-in, assembly for bespoke) — not all 9 games, to keep suite runtime reasonable given the round-counter/session-complete logic is shared within each cluster.

## Viewports

- Smoke tests: desktop (1280x900) only — fastest baseline signal.
- Golden-path tests: both desktop (1280x900) and mobile (390x844) — layout/overlap bugs are viewport-specific, and this is the exact bug class manual QA caught this session.

## Workflow Integration

- New script: `npm run test:e2e`, using Playwright's built-in `webServer` config to start the preview/dev server automatically.
- Future game-addition plans (per `CLAUDE.md`'s "Adding a new grid-based game" section) get a step that extends this suite instead of writing a one-off verification script.
- This repo maintains two near-duplicate agent-instructions files: `CLAUDE.md` (Claude Code) and `AGENTS.md` (Codex). `CLAUDE.md`'s "No test runner is configured" line and the "Commands" section need updating once this ships, and the same substantive update must be mirrored into `AGENTS.md` — tracked as an implementation task, not resolved in this design.
