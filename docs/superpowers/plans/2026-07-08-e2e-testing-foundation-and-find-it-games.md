# E2E Testing Foundation and FindItGame Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a real `@playwright/test` E2E suite (replacing today's ad-hoc, throwaway Playwright verification scripts), prove the test-only "answer oracle" pattern end-to-end on the `FindItGame`-based games (alphabet, syllables, numbers, words), and add desktop smoke coverage for all 9 mini-games.

**Architecture:** New top-level `e2e/` directory holds Playwright config, shared support utilities, and spec files — kept separate from the `.verify.ts` pure-logic convention since these need a shared runner config and don't belong to one module. A new `src/shared/services/e2eState.ts` lets any game component publish a small, additive `window.__E2E__` object (current overlay + enough game-specific state to know the correct answer) — active only in dev mode or a dedicated `test` build mode, never in the real production build. This plan builds the mechanism once and proves it on the `FindItGame` cluster (which alone covers 4 of the 9 games since they share one component); later plans extend the same pattern to the fill-in-game pair and the 3 bespoke games.

**Tech Stack:** `@playwright/test` (new devDependency), Vite's `--mode` flag for a test-only build variant, existing `vite preview` server.

**Reference:** Design doc at `docs/superpowers/specs/2026-07-08-automated-ui-testing-design.md` — read it for full context on the 3-cluster architecture and non-goals. This plan implements Cluster 1 (`FindItGame`) plus all shared infrastructure and the all-games smoke layer; Clusters 2 and 3 (fill-in games, bespoke games) are separate follow-up plans.

---

## File Structure

- Modify: `package.json` — add `@playwright/test` devDependency, add `build:e2e` and `test:e2e` scripts.
- Create: `e2e/playwright.config.ts` — Playwright Test runner config.
- Create: `e2e/support/viewports.ts` — shared viewport constants.
- Create: `e2e/support/e2eHook.ts` — typed helper for reading `window.__E2E__` from a Playwright `Page`.
- Create: `e2e/support/assertions.ts` — `trackConsoleErrors`, `expectNoConsoleErrors`, `waitForOverlay`, `waitForOverlayCleared`.
- Create: `src/shared/services/e2eState.ts` — production-side helper (`setE2EState`, `isE2EActive`, `E2EGlobalState` type, `Window.__E2E__` global augmentation).
- Modify: `src/shared/components/FindItGame.tsx` — publish oracle state (current overlay, correct item id, grid item ids).
- Create: `e2e/find-it-games.spec.ts` — data-driven golden-path spec for alphabet/syllables/numbers/words.
- Create: `e2e/smoke.spec.ts` — desktop-only smoke spec for all 9 game routes plus the home screen.
- Modify: `CLAUDE.md` — update "Commands" and remove "No test runner is configured" note.
- Modify: `AGENTS.md` — mirror the same `CLAUDE.md` update (this repo maintains both in parallel for Claude Code and Codex).

---

### Task 1: Playwright Test Runner Setup

**Files:**
- Modify: `package.json`
- Create: `e2e/playwright.config.ts`
- Create: `e2e/support/viewports.ts`

- [ ] **Step 1: Install `@playwright/test`**

```bash
npm install -D @playwright/test@^1.59.1
npx playwright install chromium
```

Expected: both commands exit 0. The version matches the existing raw `playwright` devDependency already in `package.json` for consistency.

- [ ] **Step 2: Create viewport constants**

Create `e2e/support/viewports.ts`:

```ts
export const DESKTOP_VIEWPORT = { width: 1280, height: 900 };
export const MOBILE_VIEWPORT = { width: 390, height: 844 };
```

These match the viewport sizes already used for manual Playwright verification in feature plans and documented in `.agents/skills/playwright-browser-verification/SKILL.md`.

- [ ] **Step 3: Create the Playwright config**

Create `e2e/playwright.config.ts`:

```ts
import { defineConfig, devices } from '@playwright/test';
import { DESKTOP_VIEWPORT, MOBILE_VIEWPORT } from './support/viewports';

const PORT = 4173;

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: DESKTOP_VIEWPORT },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: MOBILE_VIEWPORT },
      testMatch: /find-it-games\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run preview -- --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
```

`testDir: '.'` resolves relative to this config file's own directory (`e2e/`), so specs living directly in `e2e/*.spec.ts` are discovered; files under `e2e/support/` don't match the default `*.spec.ts` pattern and are not treated as tests.

Two projects implement the design's viewport requirement: `desktop` runs every spec (smoke tests are desktop-only per the design, so they only ever run here); `mobile` overrides the viewport and, via `testMatch`, runs ONLY the golden-path spec (`find-it-games.spec.ts`) — matching "golden-path tests run on both viewports, smoke tests run desktop-only" exactly. `devices['Desktop Chrome']` is used as the base for both (not a touch-emulation mobile device profile) to match this repo's existing manual-verification convention of plain viewport resizing on desktop Chromium, documented in `.agents/skills/playwright-browser-verification/SKILL.md`.

- [ ] **Step 4: Add npm scripts**

In `package.json`, add these two scripts (alongside the existing `build`/`preview` scripts):

```json
"build:e2e": "vite build --mode test",
"test:e2e": "npm run build:e2e && playwright test --config=e2e/playwright.config.ts",
```

**Why a separate `build:e2e` mode:** the oracle hook added in Task 2/3 must never ship in the real production bundle. Vite's `--mode test` flag makes `import.meta.env.MODE === 'test'` true only for this build variant — the ordinary `npm run build` (mode `production`) is completely unaffected. `vite preview` (used by the `webServer.command` above) just serves whichever `dist/` is currently on disk, so running `build:e2e` immediately before `playwright test` guarantees the served bundle has the hook active.

Add `@playwright/test` to `devDependencies` if `npm install -D` in Step 1 didn't already write it (it should have).

- [ ] **Step 5: Verify the config loads with zero tests**

Run:

```bash
npx playwright test --config=e2e/playwright.config.ts --list
```

Expected: exits 0, prints something like `Total: 0 tests in 0 files` (no spec files exist yet — this only confirms the config itself is valid TypeScript and loads without error).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json e2e/playwright.config.ts e2e/support/viewports.ts
git commit -m "feat: add Playwright test runner configuration"
```

---

### Task 2: Shared E2E State Helper and Playwright Support Utilities

**Files:**
- Create: `src/shared/services/e2eState.ts`
- Create: `e2e/support/e2eHook.ts`
- Create: `e2e/support/assertions.ts`

- [ ] **Step 1: Create the production-side E2E state helper**

Create `src/shared/services/e2eState.ts`:

```ts
export type E2EOverlay = 'success' | 'failure' | 'session-complete' | null;

export interface E2EGlobalState {
  overlay: E2EOverlay;
  [key: string]: unknown;
}

declare global {
  interface Window {
    __E2E__?: E2EGlobalState;
  }
}

export function isE2EActive(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'test';
}

export function setE2EState(state: E2EGlobalState): void {
  if (!isE2EActive()) return;
  window.__E2E__ = state;
}
```

This file is the ONLY place any game component needs to import from to publish oracle state. `isE2EActive()` is true during `npm run dev` (handy for manual devtools inspection) and during the `--mode test` build used by `npm run test:e2e`; it is always false in the real `npm run build` (mode `production`), so `window.__E2E__` never exists for real users.

- [ ] **Step 2: Create the Playwright-side typed reader**

Create `e2e/support/e2eHook.ts`:

```ts
import { Page } from '@playwright/test';
import type { E2EGlobalState } from '../../src/shared/services/e2eState';

export async function getE2EState<T extends E2EGlobalState>(page: Page): Promise<T> {
  return page.evaluate(() => (window as unknown as { __E2E__: T }).__E2E__);
}
```

This imports only the `E2EGlobalState` **type** from the app source (a compile-time-only import — nothing from `src/` executes inside the Playwright/Node process). Game-specific specs extend `E2EGlobalState` with their own fields (see Task 3).

- [ ] **Step 3: Create shared assertion/wait helpers**

Create `e2e/support/assertions.ts`:

```ts
import { Page, Request, expect } from '@playwright/test';
import type { E2EOverlay } from '../../src/shared/services/e2eState';

export function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export function expectNoConsoleErrors(errors: string[]): void {
  expect(errors, `Unexpected console errors:\n${errors.join('\n')}`).toEqual([]);
}

export function trackFailedRequests(page: Page): string[] {
  const failures: string[] = [];
  page.on('requestfailed', (request: Request) => {
    failures.push(`${request.method()} ${request.url()} — ${request.failure()?.errorText ?? 'unknown error'}`);
  });
  page.on('response', (response) => {
    if (response.status() >= 400) {
      failures.push(`${response.request().method()} ${response.url()} — HTTP ${response.status()}`);
    }
  });
  return failures;
}

export function expectNoFailedRequests(failures: string[]): void {
  expect(failures, `Unexpected failed requests:\n${failures.join('\n')}`).toEqual([]);
}

export async function waitForOverlay(page: Page, overlay: Exclude<E2EOverlay, null>): Promise<void> {
  await page.waitForFunction(
    (expected) => (window as unknown as { __E2E__?: { overlay: unknown } }).__E2E__?.overlay === expected,
    overlay,
    { timeout: 10_000 },
  );
}

export async function waitForOverlayCleared(page: Page): Promise<void> {
  await page.waitForFunction(
    () => (window as unknown as { __E2E__?: { overlay: unknown } }).__E2E__?.overlay === null,
    undefined,
    { timeout: 10_000 },
  );
}
```

- [ ] **Step 4: Verify the new files type-check**

Run:

```bash
npm run lint
```

Expected: exit code `0`. No new TypeScript errors from the 3 new files (the pre-existing `react-refresh/only-export-components` warning in `ContentContext.tsx` may still appear).

- [ ] **Step 5: Commit**

```bash
git add src/shared/services/e2eState.ts e2e/support/e2eHook.ts e2e/support/assertions.ts
git commit -m "feat: add shared e2e state helper and Playwright support utilities"
```

---

### Task 3: FindItGame Oracle Hook and Golden-Path Spec

**Files:**
- Create: `e2e/find-it-games.spec.ts`
- Modify: `src/shared/components/FindItGame.tsx`

- [ ] **Step 1: Write the failing spec**

Create `e2e/find-it-games.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { getE2EState } from './support/e2eHook';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
  waitForOverlay,
  waitForOverlayCleared,
} from './support/assertions';
import type { E2EGlobalState } from '../src/shared/services/e2eState';

interface FindItGameCase {
  name: string;
  path: string;
}

const FIND_IT_GAMES: FindItGameCase[] = [
  { name: 'alphabet', path: '/alphabet' },
  { name: 'syllables', path: '/syllables' },
  { name: 'numbers', path: '/numbers' },
  { name: 'words', path: '/words' },
];

interface FindItE2EState extends E2EGlobalState {
  correctItemId: string | null;
  gridItemIds: string[];
}

async function tapCorrectItem(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<FindItE2EState>(page);
  expect(state.correctItemId, 'expected an active target item').not.toBeNull();
  await page.getByRole('button', { name: state.correctItemId!, exact: true }).click();
}

async function tapWrongItem(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<FindItE2EState>(page);
  const wrongId = state.gridItemIds.find((id) => id !== state.correctItemId);
  expect(wrongId, 'expected at least one non-target grid item').toBeDefined();
  await page.getByRole('button', { name: wrongId!, exact: true }).click();
}

for (const game of FIND_IT_GAMES) {
  test(`${game.name}: correct answer reaches the success overlay`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    await tapCorrectItem(page);
    await waitForOverlay(page, 'success');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });

  test(`${game.name}: three wrong answers reach the failure overlay`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await page.getByRole('button', { name: 'Hrať' }).click();

    await tapWrongItem(page);
    await tapWrongItem(page);
    await tapWrongItem(page);
    await waitForOverlay(page, 'failure');

    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}

test('alphabet: a full 5-round session reaches the session-complete overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();

  for (let round = 0; round < 5; round += 1) {
    await tapCorrectItem(page);
    if (round < 4) {
      await waitForOverlay(page, 'success');
      await waitForOverlayCleared(page);
    }
  }

  await waitForOverlay(page, 'session-complete');
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
```

- [ ] **Step 2: Run the spec and confirm it fails**

Run:

```bash
npm run test:e2e -- find-it-games.spec.ts
```

Expected: FAIL. `window.__E2E__` does not exist yet, so `getE2EState` resolves `undefined`, and `state.correctItemId` throws or the assertion on it being non-null fails. The exact failure message doesn't matter — the point is confirming the spec can't pass without the hook.

- [ ] **Step 3: Add the oracle hook to `FindItGame.tsx`**

In `src/shared/components/FindItGame.tsx`, add this import alongside the existing ones (after the `ChoiceTile` import line):

```ts
import { setE2EState } from '../services/e2eState';
```

Add this `useEffect` immediately after the existing `useLayoutEffect` block that measures `gridAreaSize` (i.e., right after its closing `}, []);`), before `const startNewRound = useCallback(...)`:

```ts
useEffect(() => {
  const overlay = showSessionComplete ? 'session-complete' : showSuccess ? 'success' : showFailure ? 'failure' : null;
  setE2EState({
    overlay,
    correctItemId: targetItem ? descriptor.getItemId(targetItem) : null,
    gridItemIds: gridItems.map((item) => descriptor.getItemId(item)),
  });
}, [targetItem, gridItems, showSuccess, showFailure, showSessionComplete, descriptor]);
```

This mirrors state that already exists in the component (`targetItem`, `gridItems`, `showSuccess`, `showFailure`, `showSessionComplete`) onto `window.__E2E__` — it does not change any rendering or game logic.

- [ ] **Step 4: Run the spec again and confirm it passes**

Run:

```bash
npm run test:e2e -- find-it-games.spec.ts
```

Expected: all 18 tests pass — this spec's 9 tests (2 per game × 4 games + 1 full-session test) each run once under the `desktop` project and once under the `mobile` project (per the two-project config from Task 1), for 9 × 2 = 18 total, ending in something like `18 passed`.

- [ ] **Step 5: Confirm the production build is unaffected**

Run:

```bash
npm run build 2>&1 | tail -5
grep -c "__E2E__" dist/assets/*.js || true
```

Expected: `npm run build` (mode `production`, no `--mode test`) exits 0, and the `grep -c` count is `0` — confirming `setE2EState`'s `isE2EActive()` guard means the string `__E2E__` doesn't even appear in the shipped bundle in a way that could be exercised (the guard itself may still appear as a no-op branch; if it does, note that in your report, but the critical property is that `window.__E2E__` is never assigned in this build, which the `isE2EActive` check ensures).

- [ ] **Step 6: Commit**

```bash
git add e2e/find-it-games.spec.ts src/shared/components/FindItGame.tsx
git commit -m "feat: add FindItGame e2e oracle hook and golden-path spec"
```

---

### Task 4: Smoke Tests for All 9 Games

**Files:**
- Create: `e2e/smoke.spec.ts`

- [ ] **Step 1: Write the smoke spec**

Create `e2e/smoke.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
} from './support/assertions';

interface SmokeCase {
  name: string;
  path: string;
}

const ALL_GAME_ROUTES: SmokeCase[] = [
  { name: 'alphabet', path: '/alphabet' },
  { name: 'syllables', path: '/syllables' },
  { name: 'numbers', path: '/numbers' },
  { name: 'counting', path: '/counting' },
  { name: 'words', path: '/words' },
  { name: 'first-letter', path: '/first-letter' },
  { name: 'assembly', path: '/assembly' },
  { name: 'complete-syllable', path: '/complete-syllable' },
  { name: 'complete-letter', path: '/complete-letter' },
];

test('home: loads without errors', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Hravé Učenie' })).toBeVisible();
  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

for (const game of ALL_GAME_ROUTES) {
  test(`${game.name}: route loads and lobby renders`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto(game.path);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}
```

Note: `counting` and `assembly` render their lobby via `GameLobby` same as every other game (confirmed by reading `CountingItemsGame.tsx` and `AssemblyGame.tsx` — both use `<GameLobby ... onPlay={...} />`, which always renders the `aria-label="Hrať"` play button), so this single loop covers all 9 without special-casing.

- [ ] **Step 2: Run the smoke spec**

Run:

```bash
npm run test:e2e -- smoke.spec.ts
```

Expected: all 10 tests pass (1 home test + 9 game routes) with output ending in something like `10 passed`.

- [ ] **Step 3: Commit**

```bash
git add e2e/smoke.spec.ts
git commit -m "feat: add e2e smoke tests for all game routes"
```

---

### Task 5: Update CLAUDE.md and AGENTS.md

**Files:**
- Modify: `CLAUDE.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Update CLAUDE.md commands section**

In `CLAUDE.md`, the `## Commands` code block currently ends with:

```
npm run test:audio # Validate expected audio files vs. content/audio keys
```

followed by a blank line and:

```
No test runner is configured.
```

Change this to add a new command line inside the code block and replace the "No test runner" sentence:

```
npm run test:e2e  # Run the Playwright end-to-end suite (builds a test-mode bundle first)
```

Replace the `No test runner is configured.` line with:

```
An end-to-end Playwright suite exists under `e2e/` (run via `npm run test:e2e`). There is still no unit/component test runner — pure logic modules use one-shot `.verify.ts` scripts run via `npx tsx` (see `npm run test:audio` and any `*.verify.ts` file for the pattern).
```

- [ ] **Step 2: Add an E2E testing section to CLAUDE.md**

After the `## Gotchas` section (before `## Architecture`), add:

```md
## End-to-End Testing

- `e2e/` holds the Playwright Test suite: `e2e/playwright.config.ts`, shared helpers in `e2e/support/`, and `*.spec.ts` files.
- Run the full suite with `npm run test:e2e` (this runs `vite build --mode test` first, then starts `vite preview` and runs Playwright against it).
- Games publish a small, additive `window.__E2E__` object via `setE2EState()` from `src/shared/services/e2eState.ts`, active only in dev mode or the `test` build mode — never in the real production build. Specs read it via `e2e/support/e2eHook.ts`'s `getE2EState()` to know the correct answer for the current round deterministically, instead of guessing from rendered content.
- When adding a new grid-based game (see below), also add its route to `e2e/smoke.spec.ts`, and add an oracle hook + golden-path spec if the game doesn't fit an existing shared spec (`e2e/find-it-games.spec.ts` covers any game built on `FindItGame`).
```

- [ ] **Step 3: Mirror both changes into AGENTS.md**

`AGENTS.md` is a near-duplicate of `CLAUDE.md` for the Codex harness (same content, header/product name swapped, plus one extra "Local Meshy Helper" section `CLAUDE.md` doesn't have). Apply the identical three edits from Steps 1-2 to `AGENTS.md` in the corresponding locations (same section headers exist in both files).

- [ ] **Step 4: Verify**

```bash
diff <(sed '1,3d' CLAUDE.md) <(sed '1,3d' AGENTS.md) | grep -v "Meshy" | head -40
```

Expected: no output related to the sections just edited (the only remaining diff should be the pre-existing product-name header difference already excluded by `sed '1,3d'` and the Meshy section already excluded by `grep -v`). If this shows unexpected differences in the sections you just edited, fix them so both files match again.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md AGENTS.md
git commit -m "docs: document the new e2e testing suite in CLAUDE.md and AGENTS.md"
```

---

### Task 6: Final Verification

**Files:**
- No planned file edits.

- [ ] **Step 1: Run the full e2e suite**

```bash
npm run test:e2e
```

Expected: all specs across `e2e/find-it-games.spec.ts` and `e2e/smoke.spec.ts` pass (28 tests total: `desktop` project runs both files — 9 from find-it-games + 10 from smoke = 19 — plus the `mobile` project running only find-it-games.spec.ts's 9 tests again = 28).

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: exit code `0`, only the pre-existing `react-refresh/only-export-components` warning in `ContentContext.tsx`.

- [ ] **Step 3: Run the real production build and confirm the oracle hook is inert**

```bash
npm run build
```

Expected: exit code `0`, same large-chunk and PWA precache output as always. This uses mode `production` (not `test`), so `window.__E2E__` is never assigned for real users regardless of what Task 3's Step 5 grep found textually in the bundle.

- [ ] **Step 4: Check git state**

```bash
git status --short --branch
git log --oneline --decorate --max-count=8
```

Expected: worktree is clean; the latest commits are the ones from Tasks 1-5 of this plan (config/setup, shared helpers, FindItGame hook + spec, smoke spec, docs).

---

## Review Guidance for the Implementing Agent

Before handing back:

- Confirm `window.__E2E__` is never assigned when running the real `npm run build` output (mode `production`) — this is the single most important safety property of this whole plan.
- Confirm the wrong-answer test genuinely exercises 3 distinct wrong taps reaching `MAX_ATTEMPTS`, not fewer.
- Confirm the full-session test correctly waits for each success overlay to both appear AND clear before attempting the next tap (a raw click while `OverlayFrame`'s `fixed inset-0 z-50` div is showing will fail/hang, since it intercepts pointer events).
- Confirm no existing game behavior changed — the hook only mirrors existing state onto `window`, it must not alter `FindItGame.tsx`'s actual rendering or game logic.

If using `superpowers:subagent-driven-development`, run a spec compliance review after each implementation task and then a code-quality review. Fix any Critical or Important findings before moving to the next task.
