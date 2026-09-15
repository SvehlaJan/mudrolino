# UI Redesign Phase 8: Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce objective evidence that every shipping route, game, parent capability, persisted datum, offline path, and production boundary satisfies the approved responsive and accessibility contract before publication.

**Architecture:** One typed release matrix drives exhaustive Playwright journeys, canonical viewport checks, and named screenshots. Existing phase-specific tests remain the behavioral source of truth; Phase 8 adds cross-surface integration, offline production-build coverage, bundle/test-adapter guards, and a human-reviewed contact sheet. Cleanup occurs only after import and route evidence proves that legacy paths are dead.

**Tech Stack:** React 19, TypeScript, Vite production/test builds, Playwright, axe-core, vite-plugin-pwa/Workbox, Sharp, existing pure `.verify.ts` checks, shell-based bundle inspection.

---

## Required context and phase boundary

Start from the accepted Phase 7 SHA on `feature/full-app-ui-redesign`. Read
`AGENTS.md`, `docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`,
and every accepted Phase 1–7 handoff manifest.
Confirm a clean worktree, `VITE_AVATAR_POC_ENABLED` disabled in the release
configuration, and no unresolved blocker in a prior manifest. Phase 8 does not
redesign features, introduce new mechanics, change content, loosen assertions,
or waive failures. Fix only release-contract defects revealed by the checks.

Use the Phase 1 production Playwright configuration, gate adapter, persistence
fixtures, layout assertions, and screenshot harness; the Phase 2 axe dependency;
the Phase 3 catalog; the Phase 4 parent/recording fixtures; and the Phase 5 game
harness. Preserve the `hrave-ucenie-settings`, `hrave-ucenie-app-settings`,
custom-content, and IndexedDB audio compatibility contracts.

### Task 1: Make the release matrix exhaustive and verifiable

**Files:**
- Create: `e2e/support/releaseMatrix.ts`
- Create: `e2e/support/releaseMatrix.verify.ts`
- Modify: `e2e/support/viewports.ts`
- Modify: `package.json`

- [ ] **Step 1: Write the failing matrix verifier**

```ts
import { GAME_DEFINITIONS } from '../../src/shared/gameCatalog';
import { getUiCopy } from '../../src/shared/uiCopy';
import { RELEASE_GAME_CASES, RELEASE_VIEWPORTS } from './releaseMatrix';

const catalogIds = GAME_DEFINITIONS.map(game => game.id).sort();
const releaseIds = RELEASE_GAME_CASES.map(game => game.id).sort();
if (catalogIds.join('|') !== releaseIds.join('|')) throw new Error('release game matrix diverges from catalog');
if (RELEASE_GAME_CASES.length !== 11) throw new Error('release matrix must contain eleven games');
if (new Set(RELEASE_GAME_CASES.map(game => game.path)).size !== 11) throw new Error('game paths must be unique');
for (const release of RELEASE_GAME_CASES) {
  const catalog = GAME_DEFINITIONS.find(game => game.id === release.id);
  if (!catalog || catalog.path !== release.path) throw new Error(`catalog path mismatch: ${release.id}`);
  if (getUiCopy('sk', catalog.titleKey) !== release.title) throw new Error(`catalog title mismatch: ${release.id}`);
}

const requiredSizes = ['320x568', '360x640', '390x844', '667x375', '844x390', '768x1024', '1024x768', '1280x900', '1440x900', '1920x1080'];
const actualSizes = Object.values(RELEASE_VIEWPORTS).map(({ width, height }) => `${width}x${height}`);
for (const size of requiredSizes) if (!actualSizes.includes(size)) throw new Error(`missing viewport ${size}`);
console.log('✓ release matrix covers every game and canonical viewport');
```

- [ ] **Step 2: Run and verify failure**

Run: `npx tsx e2e/support/releaseMatrix.verify.ts`

Expected: FAIL because `releaseMatrix.ts` does not exist.

- [ ] **Step 3: Add the exact release matrix**

```ts
import type { GameId } from '../../src/shared/types';

export const RELEASE_VIEWPORTS = {
  narrowPhone: { width: 320, height: 568 },
  smallPhone: { width: 360, height: 640 },
  phonePortrait: { width: 390, height: 844 },
  shortPhoneLandscape: { width: 667, height: 375 },
  phoneLandscape: { width: 844, height: 390 },
  tabletPortrait: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1280, height: 900 },
  desktopLarge: { width: 1440, height: 900 },
  wideDesktop: { width: 1920, height: 1080 },
} as const;

export interface ReleaseGameCase {
  id: GameId;
  path: string;
  title: string;
  category: 'literacy' | 'numeracy';
  answerPattern: 'grid' | 'sequence' | 'counting' | 'comparison' | 'addition';
}

export const RELEASE_GAME_CASES: readonly ReleaseGameCase[] = [
  { id: 'ALPHABET', path: '/alphabet', title: 'Abeceda', category: 'literacy', answerPattern: 'grid' },
  { id: 'SYLLABLES', path: '/syllables', title: 'Slabiky', category: 'literacy', answerPattern: 'grid' },
  { id: 'NUMBERS', path: '/numbers', title: 'Čísla', category: 'numeracy', answerPattern: 'grid' },
  { id: 'WORDS', path: '/words', title: 'Slová', category: 'literacy', answerPattern: 'grid' },
  { id: 'FIRST_LETTER', path: '/first-letter', title: 'Prvé písmenko', category: 'literacy', answerPattern: 'grid' },
  { id: 'ASSEMBLY', path: '/assembly', title: 'Skladaj', category: 'literacy', answerPattern: 'sequence' },
  { id: 'COMPLETE_SYLLABLE', path: '/complete-syllable', title: 'Doplň slabiku', category: 'literacy', answerPattern: 'grid' },
  { id: 'COMPLETE_LETTER', path: '/complete-letter', title: 'Doplň písmeno', category: 'literacy', answerPattern: 'sequence' },
  { id: 'COUNTING_ITEMS', path: '/counting', title: 'Spočítaj', category: 'numeracy', answerPattern: 'counting' },
  { id: 'COMPARE_QUANTITIES', path: '/compare', title: 'Viac alebo menej', category: 'numeracy', answerPattern: 'comparison' },
  { id: 'ADDITION', path: '/addition', title: 'Sčítaj', category: 'numeracy', answerPattern: 'addition' },
] as const;

export const PROTECTED_RELEASE_PATHS = [
  '/settings',
  '/settings/games',
  '/settings/games/ALPHABET',
  '/settings/app',
  '/settings/help',
  '/content',
  '/recordings',
] as const;
```

Re-export the viewport object from `viewports.ts` so tests and screenshot tooling
cannot maintain competing dimensions.

- [ ] **Step 4: Add exact release scripts**

```json
{
  "scripts": {
    "verify:pure": "for file in $(rg --files src e2e -g '*.verify.ts' | sort); do npx tsx \"$file\" || exit 1; done",
    "test:e2e:release": "npm run build:e2e && playwright test --config=e2e/playwright.release.config.ts",
    "test:e2e:offline": "npm run build && playwright test --config=e2e/playwright.production.config.ts e2e/offline.spec.ts",
    "verify:bundle": "node tools/release/verify-production-bundle.mjs",
    "verify:release": "npm run verify:pure && npm run lint && npm run test:audio && npm run test:e2e && npm run test:e2e:release && npm run test:e2e:production-guards && npm run test:e2e:offline && npm run build && npm run verify:bundle"
  }
}
```

Keep existing scripts unchanged. The release script intentionally fails on the
first non-zero command.

- [ ] **Step 5: Run the verifier and commit**

Run: `npx tsx e2e/support/releaseMatrix.verify.ts`

Expected: `✓ release matrix covers every game and canonical viewport`.

```bash
git add e2e/support/releaseMatrix.ts e2e/support/releaseMatrix.verify.ts e2e/support/viewports.ts package.json package-lock.json
git commit -m "test: define the exhaustive release matrix" -m "One verified catalog and viewport inventory prevents final checks and screenshots from silently omitting a shipping surface."
```

### Task 2: Prove all eleven child journeys end to end

**Files:**
- Create: `e2e/release-journeys.spec.ts`
- Modify: `e2e/support/gameHarness.ts`
- Modify: `e2e/playwright.release.config.ts`

- [ ] **Step 1: Extend the game harness with visible cross-game actions**

Do not add another production-side test adapter. Use the merged test-mode oracle
fields established by Phases 5–7 only to discover the current answer, then act
through visible controls. Implement `completeCurrentRound(page, gameId)` with
this exhaustive mapping:

- FindIt, FIRST_LETTER, COMPLETE_SYLLABLE, and COUNTING_ITEMS: read
  `correctItemId` and click `[data-answer-id="<id>"]`;
- ADDITION: read `correctSum` and click its `[data-answer-id]`;
- COMPARE_QUANTITIES: read `correctSide` and click
  `[data-answer-side="left|right"]`;
- COMPLETE_LETTER: repeatedly read its changing `correctItemId` and click the
  visible choice until the oracle phase becomes `answered-correctly`;
- ASSEMBLY: read `correctTileOrder` and click each visible
  `[data-tile-id="<id>"]` in order.

Throw an exhaustive-switch error for an unknown `GameId`. Add
`readGamePhase(page)` for the existing `phase` field. The helper must never call
a React handler through `page.evaluate`.

- [ ] **Step 2: Write the failing catalog-driven journey test**

```ts
for (const game of RELEASE_GAME_CASES) {
  test(`${game.id}: home to five-round completion and home`, async ({ page }) => {
    const errors = trackConsoleErrors(page);
    const failedRequests = trackFailedRequests(page);
    await page.goto('/');
    await page.getByRole('link', { name: new RegExp(game.title, 'i') }).click();
    await page.getByRole('button', { name: 'Hrať' }).click();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.getByTestId('game-visible-instruction')).toBeVisible();

    for (let round = 0; round < 5; round += 1) {
      await completeCurrentRound(page, game.id);
      if (round < 4) {
        await expect.poll(() => readGamePhase(page)).toBe('answered-correctly');
        await page.getByRole('button', { name: 'Pokračovať' }).click();
      }
    }

    await expect.poll(() => readGamePhase(page)).toBe('session-complete');
    await page.getByRole('button', { name: 'Domov' }).click();
    await expect(page).toHaveURL('/');
    expectNoConsoleErrors(errors);
    expectNoFailedRequests(failedRequests);
  });
}
```

Keep the release title values verified against Phase 3 localized catalog copy so
this journey exercises the visible home link rather than an internal ID.

- [ ] **Step 3: Add retry and replay coverage for every pattern**

For each game, start a second test and use a real visible incorrect path: one
wrong choice for grid/counting/addition/complete-letter, the wrong side for
comparison, and the oracle's full `incorrectTileOrder` for Assembly. Assert
visible/live retry feedback and enabled recovery, then complete the round through
real controls. Exercise the visible replay button and verify the prompt remains
visible. Pattern-specific suites remain responsible for third-wrong semantics,
sequential placement detail, comparison self-correction detail, and object
interactions.

- [ ] **Step 4: Run and fix integration failures**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.release.config.ts e2e/release-journeys.spec.ts`

Expected: 22 logical cases PASS in each of the release config's representative
phone, short-landscape, and desktop projects (66 project executions), with no
console errors or failed same-origin requests.

- [ ] **Step 5: Commit exhaustive child journeys**

```bash
git add e2e/release-journeys.spec.ts e2e/support/gameHarness.ts e2e/playwright.release.config.ts
git commit -m "test: cover every child journey before release" -m "Catalog-driven completion and retry checks prove no redesigned game was lost between isolated migrations."
```

### Task 3: Run objective responsive and accessibility checks across the full app

**Files:**
- Create: `e2e/playwright.release.config.ts`
- Create: `e2e/release-responsive.spec.ts`
- Create: `e2e/release-accessibility.spec.ts`
- Modify: `e2e/support/layoutAssertions.ts`

- [ ] **Step 1: Configure the canonical release projects**

Create one project per `RELEASE_VIEWPORTS` entry. Set `testMatch` to
`/(release-responsive|release-accessibility)\.spec\.ts/`, reuse the test-mode
preview server, retain trace and screenshot on failure, and run these two specs
serially per file to avoid screenshot/resource contention. Do not remove the
smaller normal E2E project matrix.

- [ ] **Step 2: Complete shared objective layout helpers**

```ts
export async function expectReachableOrVisible(locator: Locator) {
  for (const element of await locator.all()) {
    await element.scrollIntoViewIfNeeded();
    await expect(element).toBeVisible();
    const box = await element.boundingBox();
    expect(box, 'expected a rendered bounding box').not.toBeNull();
  }
}

export async function expectFocusOrder(page: Page, names: string[]) {
  for (const name of names) {
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name })).toBeFocused();
  }
}
```

Retain helpers for no horizontal overflow, minimum 48px child/44px parent
targets, viewport intersection, and pairwise non-overlap. Report element names
and rectangles in assertion messages.

- [ ] **Step 3: Write responsive checks for every shipping route**

At every canonical viewport:

- home: both group headings and all eleven cards reachable, no horizontal scroll;
- every lobby: heading, instruction, preview, Back, Hrať, and only applicable
  settings action visible;
- every active round: prompt, replay, progress, answers, and Back intersect the
  viewport with no critical overlap or document scroll;
- every parent route/category/editor: identical actions remain reachable inside
  the explicit vertical scroll region;
- rotating 390×844 → 844×390 preserves route, round, selected/entered data,
  open editor, and focus context;
- browser zoom at 200% does not introduce two-dimensional scrolling in ordinary
  content.

- [ ] **Step 4: Write accessibility checks for every interaction family**

Use `AxeBuilder` with `wcag2a`, `wcag2aa`, `wcag21aa`, and `wcag22aa`. Assert no
critical or serious violation on home, every lobby, every active game pattern,
gate, dashboard, each parent destination, content editor, recording error, and
feedback success/error. Also verify:

```ts
await expect(page.getByRole('main')).toHaveCount(1);
await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
await page.getByRole('radiogroup').first().press('ArrowRight');
await expect(page.getByRole('radio', { checked: true }).first()).toBeFocused();
```

Test answer-group arrows/Enter/Space, switch Space, tabs Home/End/arrows,
dropdown arrows/Escape, dialogs focus containment/restoration, error-summary
focus, live results, and native/linked labels. Run a `reducedMotion: 'reduce'`
context and assert no infinite animation plus equivalent visible outcomes.

- [ ] **Step 5: Run the canonical matrix**

```bash
npm run build:e2e
npx playwright test --config=e2e/playwright.release.config.ts e2e/release-responsive.spec.ts e2e/release-accessibility.spec.ts
```

Expected: PASS at all ten canonical dimensions with zero serious/critical axe violations, clipped critical controls, overlaps, undersized targets, or horizontal overflow.

- [ ] **Step 6: Commit responsive and accessibility gates**

```bash
git add e2e/playwright.release.config.ts e2e/release-responsive.spec.ts e2e/release-accessibility.spec.ts e2e/support/layoutAssertions.ts
git commit -m "test: enforce release responsive and accessibility gates" -m "The complete viewport matrix now checks semantics, keyboard use, focus, target size, bounds, and reduced motion objectively."
```

### Task 4: Re-run every parent, persistence, recording, and audio contract

**Files:**
- Create: `e2e/release-parent-data.spec.ts`
- Modify: `e2e/persistence-compat.spec.ts`
- Modify: `e2e/parent-settings.spec.ts`
- Modify: `e2e/custom-content.spec.ts`
- Modify: `e2e/recordings.spec.ts`
- Modify: `e2e/feedback.spec.ts`

- [ ] **Step 1: Add a cross-feature legacy-data journey**

Load the Phase 1 fixture before first navigation, then assert:

```ts
await expect(page.getByRole('radio', { name: '1 – 20' })).toBeChecked();
await expect(page.getByRole('radio', { name: 'Čísla' })).toBeChecked();
await expect(page.locator('html')).toHaveAttribute('data-font', 'shantell');
await expect(page.getByText('Vlastné')).toBeVisible();
await expect(page.getByRole('button', { name: 'Prehrať' }).first()).toBeEnabled();
```

Edit one game setting, one app setting, one custom word, one praise, and one audio
override. Reload each protected route; solve the fresh gate; verify all edited
values and the unchanged IndexedDB Blob. Leave to a child route and prove the
authorization expires without deleting data.

- [ ] **Step 2: Complete parent access and settings cases**

Run correct, incorrect, cancel, keyboard, direct route, protected-to-protected,
Back, Forward, reload, legacy redirect, unknown game ID, home entry, lobby return
state, leave/re-enter, save success, save failure, every setting value, and the
addition dependency notice. Assert the adapter exists only in test mode.

- [ ] **Step 3: Complete content and recording invariants**

Cover all five content categories; search; word/praise add, edit, validation,
disable, individual restore, restore all, custom delete, confirmation, and Undo.
Call repository mutations through `page.evaluate` to prove the last-playable-item
constraint also holds outside UI controls. Exercise recording permission request,
denial/recovery, cancel/discard, Stop/save, playback, replacement, deletion, and
stale-event isolation.

- [ ] **Step 4: Complete feedback and audio regression**

Cover category keyboard selection, optional message, loading, server error,
retry, success, explicit close, support `mailto:`, and focus restoration. For one
correct and one wrong answer in every game, capture the audio-manager test log
and assert item/target audio precedes praise or retry. Assert Assembly retains its
bespoke wrong-answer sequence.

- [ ] **Step 5: Run focused tests and pure contracts**

```bash
npm run verify:pure
npm run test:audio
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/parent-access.spec.ts e2e/parent-settings.spec.ts e2e/custom-content.spec.ts e2e/recordings.spec.ts e2e/feedback.spec.ts e2e/persistence-compat.spec.ts e2e/release-parent-data.spec.ts
```

Expected: all pure, audio, parent, persistence, recording, feedback, and cross-feature cases PASS.

- [ ] **Step 6: Commit parent/data release coverage**

```bash
git add e2e/release-parent-data.spec.ts e2e/persistence-compat.spec.ts e2e/parent-settings.spec.ts e2e/custom-content.spec.ts e2e/recordings.spec.ts e2e/feedback.spec.ts
git commit -m "test: prove parent data survives the redesign" -m "Legacy fixtures and cross-feature reloads verify settings, content, recordings, and authorization together."
```

### Task 5: Verify the installable PWA and offline routes from a production build

**Files:**
- Create: `e2e/offline.spec.ts`
- Modify: `e2e/playwright.production.config.ts`
- Modify: `src/pwa/pwaConfig.verify.ts`

- [ ] **Step 1: Extend the pure PWA verifier**

Import the serializable catalog paths and assert Workbox precaches the shell,
all lazy game chunks, built-in audio, fonts, and PWA icons while excluding maps,
avatar GLBs, and the avatar/three.js diagnostic chunk. Keep `navigateFallback`
at `/` and the prompt-based update contract.

- [ ] **Step 2: Write the failing production offline test**

```ts
test('installed shell and every game route work offline after install', async ({ page, context }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  for (const game of RELEASE_GAME_CASES) {
    await page.goto(game.path);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  }
  await page.goto('/');
  await context.setOffline(true);
  for (const game of RELEASE_GAME_CASES) {
    await page.goto(game.path);
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Hrať' })).toBeVisible();
  }
});
```

Add offline home reload, a representative started literacy/numeracy round with
bundled audio fallback, update prompt presence, manifest/icon responses, and a
protected deep-link case that shows the gate without exposing parent content.

- [ ] **Step 3: Run against the isolated production server**

Run: `npm run build && npx playwright test --config=e2e/playwright.production.config.ts e2e/offline.spec.ts`

Expected: PASS with service-worker control after the initial install page and no network-dependent failure.

- [ ] **Step 4: Commit offline verification**

```bash
git add e2e/offline.spec.ts e2e/playwright.production.config.ts src/pwa/pwaConfig.verify.ts
git commit -m "test: verify every game remains available offline" -m "Production service-worker checks protect installation, deep links, lazy routes, and core audio from release regressions."
```

### Task 6: Guard production test boundaries, lazy avatar code, and bundle growth

**Files:**
- Create: `tools/release/verify-production-bundle.mjs`
- Create: `tools/release/bundle-budget.json`
- Modify: `e2e/production-guards.spec.ts`
- Modify: `package.json`

- [ ] **Step 1: Add failing production browser guards**

Extend the Phase 1 suite to assert `window.__E2E__.parentGate` and all game
oracle fields are absent, direct `/settings` still shows the real gate,
`VITE_AVATAR_POC_ENABLED` renders no home avatar, and `/avatar-preview` follows
the release route policy.

- [ ] **Step 2: Implement the production bundle verifier**

```js
import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const mainMatch = html.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/);
if (!mainMatch) throw new Error('Unable to locate the production entry chunk');
const assetsDir = new URL('assets/', dist);
const main = readFileSync(new URL(mainMatch[1], assetsDir));
const mainText = main.toString('utf8');
for (const forbidden of ['parentGate:{answer', 'audioEvents:', 'three.module', '@react-three/fiber']) {
  if (mainText.includes(forbidden)) throw new Error(`Forbidden production entry content: ${forbidden}`);
}

const files = readdirSync(assetsDir).filter(file => file.endsWith('.js'));
const avatarChunks = files.filter(file => /Avatar|three|react-three/i.test(file));
if (avatarChunks.length === 0) throw new Error('Expected avatar renderer to remain a separate lazy chunk');
if (avatarChunks.includes(mainMatch[1])) throw new Error('Avatar code entered the main chunk');

const budget = JSON.parse(readFileSync(new URL('./bundle-budget.json', import.meta.url), 'utf8'));
const gzipBytes = gzipSync(main).byteLength;
if (gzipBytes > budget.mainEntryGzipBytes) {
  throw new Error(`Main entry ${gzipBytes} exceeds budget ${budget.mainEntryGzipBytes}`);
}
console.log(`✓ production bundle guards passed (${gzipBytes} gzip bytes)`);
```

- [ ] **Step 3: Establish the checked-in budget from the accepted Phase 7 build**

Run `npm run build`, measure the entry with the verifier temporarily in report
mode, and write `bundle-budget.json` with `mainEntryGzipBytes` equal to the Phase
7 measured value rounded up to the next 1024 bytes. Record the raw measurement
and rounded budget in the Phase 8 handoff. The committed verifier never updates
the budget automatically.

- [ ] **Step 4: Run production guards**

```bash
npm run build
npm run verify:bundle
npm run test:e2e:production-guards
```

Expected: PASS; automation adapters absent, parent routes protected, avatar UI disabled, avatar renderer separate, and entry gzip at or below the checked-in budget.

- [ ] **Step 5: Commit production guards**

```bash
git add tools/release/verify-production-bundle.mjs tools/release/bundle-budget.json e2e/production-guards.spec.ts package.json package-lock.json
git commit -m "test: guard the production bundle boundary" -m "Release checks exclude automation bypasses and avatar rendering code while preventing silent entry-chunk growth."
```

### Task 7: Remove confirmed dead legacy UI and rerun focused regressions

**Files:**
- Delete if still present and unreferenced: `src/shared/components/SettingsOverlay.tsx`
- Delete if still present and unreferenced: `src/shared/components/SettingsScreen.tsx`
- Delete if still present and unreferenced: `src/shared/components/SettingToggle.tsx`
- Delete if still present and unreferenced: `src/shared/components/settingsContentData.ts`
- Delete if still present and unreferenced: `src/shared/components/QuantityCluster.tsx`
- Delete if still present and unreferenced: `src/shared/scatterGridLogic.ts`
- Delete if still present and unreferenced: `src/shared/scatterGridLogic.verify.ts`
- Delete if still present and unreferenced: `src/shared/components/TopBar.tsx`
- Modify: `src/shared/ui/index.ts`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Prove each candidate is dead before deletion**

Run:

```bash
rg -n "SettingsOverlay|SettingsScreen|SettingToggle|settingsContentData|QuantityCluster|scatterGridLogic|shared/components/TopBar" src e2e
```

Expected: no production or test import remains for each listed compatibility
file. If a result is a legitimate migrated consumer, replace that import with
the Phase 2/4/5/7 API and rerun the relevant focused test before deleting.

- [ ] **Step 2: Remove only proven compatibility files and stale exports**

Use `git rm` for tracked files. Remove obsolete exports and UI-kit legacy
examples. Do not delete `FindItGame` if it remains the mechanic adapter for the
four Phase 5 games, and do not touch any file under `src/avatar/`.

- [ ] **Step 3: Scan for old styling contracts**

Run:

```bash
rg -n "activeClassName|playButtonColorClassName|topDecorationClassName|bottomDecorationClassName|![a-z-]+:|opacity-[0-9]+.*text-|landscape:" src --glob '*.tsx'
```

Expected: no old component-API prop remains; no `!important` repair in a shared
primitive; no opacity-muted normal text; and no orientation-only layout rule on
a shipping surface. Replace residual shipping usages with semantic variants,
text-muted, or width-plus-height/container-query behavior.

- [ ] **Step 4: Run focused regressions and commit cleanup**

```bash
npm run lint
npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/ui-foundation.spec.ts e2e/catalog-home-lobbies.spec.ts e2e/parent-settings.spec.ts e2e/find-it-games.spec.ts e2e/numeracy-responsive.spec.ts
npm run build
```

Expected: PASS with no unresolved imports, mixed legacy UI, or missing route.

```bash
git add -A src e2e
git commit -m "refactor: remove superseded UI paths" -m "Evidence-backed cleanup leaves every shipping route on one component, shell, and semantic styling system."
```

### Task 8: Produce the final contact sheet, release report, and handoff

**Files:**
- Modify: `tools/screenshots/capture.mjs`
- Create: `tools/screenshots/contact-sheet.mjs`
- Create: `docs/ui-audit/redesign-final-review.md`
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-08.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Make screenshot output deterministic**

The capture tool must accept `--matrix=release`, derive dimensions from
`RELEASE_VIEWPORTS`, use the test-only gate/game adapters, and write files as:

```text
artifacts/redesign-final/<scene>/<viewport>.png
```

Capture home; gate normal/error; all eleven lobbies; all eleven active rounds;
correct/wrong/session-complete representatives; dashboard; game overview;
one/two-setting details; app/help; all five content categories; word/praise
editors; disabled list; recording states; feedback form/error/success; and
`/ui-kit`. Keypress and focus scenes must show a visible focus ring.

- [ ] **Step 2: Implement the contact-sheet generator**

```js
import sharp from 'sharp';
import { mkdir, readdir } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const source = process.argv[2] ?? 'artifacts/redesign-final';
const output = process.argv[3] ?? 'artifacts/redesign-final-contact-sheet.jpg';
const scenes = (await readdir(source, { withFileTypes: true })).filter(entry => entry.isDirectory()).map(entry => entry.name).sort();
const cells = [];
for (const scene of scenes) {
  const directory = join(source, scene);
  for (const file of (await readdir(directory)).filter(name => name.endsWith('.png')).sort()) {
    const image = sharp(join(directory, file));
    const metadata = await image.metadata();
    const width = 280;
    const height = Math.max(1, Math.round((metadata.height ?? 1) * width / (metadata.width ?? width)));
    const buffer = await image.resize({ width }).jpeg({ quality: 82 }).toBuffer();
    cells.push({ input: buffer, left: 0, top: 0, width, height, label: `${scene}/${basename(file, '.png')}` });
  }
}
const gap = 20;
const columns = 4;
const rowHeights = Array.from({ length: Math.ceil(cells.length / columns) }, (_, row) =>
  Math.max(...cells.slice(row * columns, row * columns + columns).map(cell => cell.height + 32)),
);
const canvasWidth = columns * 280 + (columns + 1) * gap;
const canvasHeight = rowHeights.reduce((sum, value) => sum + value, 0) + (rowHeights.length + 1) * gap;
let top = gap;
const composites = [];
for (let row = 0; row < rowHeights.length; row += 1) {
  for (let column = 0; column < columns; column += 1) {
    const cell = cells[row * columns + column];
    if (!cell) continue;
    const left = gap + column * (280 + gap);
    composites.push({ input: cell.input, left, top: top + 32 });
    composites.push({ input: Buffer.from(`<svg width="280" height="28"><text x="0" y="20" font-family="sans-serif" font-size="15" fill="#5D453E">${cell.label.replaceAll('&', '&amp;')}</text></svg>`), left, top });
  }
  top += rowHeights[row] + gap;
}
await mkdir(dirname(output), { recursive: true });
await sharp({ create: { width: canvasWidth, height: canvasHeight, channels: 3, background: '#F4F1EA' } })
  .composite(composites)
  .jpeg({ quality: 88 })
  .toFile(output);
console.log(`✓ wrote ${output} with ${cells.length} screenshots`);
```

- [ ] **Step 3: Run the full automated release gate**

```bash
npm run verify:release
git diff --check
```

Expected: every pure verifier, lint, audio inventory, normal E2E, release E2E,
production guard, offline test, production build, and bundle guard PASS. Save
complete command output in the handoff manifest.

- [ ] **Step 4: Capture and build the final contact sheet**

```bash
npm run shots -- --matrix=release --output=artifacts/redesign-final
node tools/screenshots/contact-sheet.mjs artifacts/redesign-final artifacts/redesign-final-contact-sheet.jpg
```

Expected: every named scene has all required viewport captures and the generator
reports the exact image count without missing-file warnings.

- [ ] **Step 5: Prepare the report for the designated Codex review**

Write `docs/ui-audit/redesign-final-review.md` with:

- branch, reviewed SHA, reviewer, date, capture command, matrix, artifact paths;
- route/scene inventory and exact screenshot count;
- checks for Living Toybox coherence, light home cards, shared palette, parent
  calmness, focus, contrast, short-height fit, no clipped controls, consistent
  materials, reduced motion, and no mixed legacy surface;
- `Result: Pending Codex review` (the implementing agent must not self-approve);
- every accepted deviation with owner and rationale. Use `None` when there are no
  accepted deviations.

- [ ] **Step 6: Write the pending final handoff manifest**

Do not mark Phase 8 or the full redesign complete yet. Record accepted Phase 7
base SHA, evidence SHA, branch, clean status, every command/outcome, production
bundle measurements, contact-sheet path, `Pending Codex review`, changed/deleted
files, data-migration evidence, and remaining risks. Obtain exact values with
`git rev-parse HEAD` and `git status --short`.

- [ ] **Step 7: Commit documentation and stop**

```bash
git add tools/screenshots/capture.mjs tools/screenshots/contact-sheet.mjs docs/ui-audit/redesign-final-review.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-08.md ROADMAP.md
git commit -m "docs: hand off the UI redesign for final review" -m "The release evidence and contact sheet give the designated Codex reviewer one reproducible acceptance candidate."
```

Do not publish, merge, tag, or open a pull request unless the user explicitly
asks. Return the final manifest, review report, contact-sheet path, and resulting
SHA for Codex review against the design specification.

## Codex-only Phase 8 acceptance

After the implementation agent stops, Codex checks out the exact evidence SHA,
reads all eight manifests, inspects the full-resolution screenshots and contact
sheet, and reviews the changed code against the design specification. Codex then:

1. records its name/date and either `Approved` or `Rejected` in
   `docs/ui-audit/redesign-final-review.md`;
2. records findings and the review result in the Phase 8 handoff manifest;
3. marks Phase 8 and the full redesign complete in `ROADMAP.md` only when no
   publication blocker remains;
4. runs `git diff --check`, commits the review documents with
   `docs: record final UI redesign review`, and returns the review commit SHA.

A rejection leaves the roadmap items open and sends each finding back to its
owning phase; it is never converted into an accepted deviation automatically.
