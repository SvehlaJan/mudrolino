# UI Redesign Phase 1: Baseline and Safety Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish correct parent-route protection, a production-safe automation adapter, persistence fixtures, and responsive test infrastructure before visual migration begins.

**Architecture:** Parent authorization is in-memory route state owned by a provider inside `BrowserRouter`; one guard prevents protected content from rendering while locked and revokes access on return to child routes. The existing `window.__E2E__` oracle becomes merge-based and exposes parent-gate controls only in Vite `mode=test`. This phase changes safety and testability, not the gate’s visual design.

**Tech Stack:** React 19, React Router 7, TypeScript, Vite test mode, Playwright, localStorage, IndexedDB, existing Tailwind UI.

---

## Required context and phase boundary

Read before editing:

- `AGENTS.md`
- `docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`
- `docs/ui-audit/README.md`
- `docs/ui-audit/audit-a11y.md`
- `src/App.tsx`
- `src/shared/components/ParentsGate.tsx`
- `src/shared/services/e2eState.ts`
- `tools/screenshots/capture.mjs`

Create `feature/full-app-ui-redesign` from the commit containing this plan. No
later phase may start until this phase’s handoff manifest is accepted. Do not
install Radix or visually redesign dialogs here; Phase 2 owns that work.

### Task 1: Create the parent-route policy as verified pure logic

**Files:**
- Create: `src/shared/services/parentAccessLogic.ts`
- Create: `src/shared/services/parentAccessLogic.verify.ts`

- [ ] **Step 1: Write the failing route-policy verifier**

```ts
import {
  getParentRouteKind,
  isProtectedParentPath,
  sanitizeChildReturnPath,
} from './parentAccessLogic';

const protectedPaths = [
  '/settings',
  '/settings/games',
  '/settings/games/ALPHABET',
  '/settings/app',
  '/settings/help',
  '/content',
  '/recordings',
];

for (const path of protectedPaths) {
  if (!isProtectedParentPath(path)) throw new Error(`${path} must be protected`);
}
for (const path of ['/', '/alphabet', '/assembly', '/ui-kit', '/avatar-preview']) {
  if (isProtectedParentPath(path)) throw new Error(`${path} must remain public`);
}
if (getParentRouteKind('/settings/games/ALPHABET') !== 'game-detail') {
  throw new Error('Game detail route was not classified');
}
if (sanitizeChildReturnPath('/alphabet') !== '/alphabet') {
  throw new Error('Catalogued child path should be accepted');
}
if (sanitizeChildReturnPath('/settings') !== '/') {
  throw new Error('Protected return path must fall back home');
}
console.log('✓ parent access route policy passed');
```

- [ ] **Step 2: Run the verifier and confirm the expected failure**

Run: `npx tsx src/shared/services/parentAccessLogic.verify.ts`

Expected: FAIL because `parentAccessLogic.ts` does not exist.

- [ ] **Step 3: Implement the route-policy API**

```ts
import { GAME_DEFINITIONS } from '../gameCatalog';

export type ParentRouteKind =
  | 'dashboard'
  | 'games'
  | 'game-detail'
  | 'app'
  | 'help'
  | 'content'
  | 'recordings-legacy'
  | null;

export function getParentRouteKind(pathname: string): ParentRouteKind {
  if (pathname === '/settings') return 'dashboard';
  if (pathname === '/settings/games') return 'games';
  if (/^\/settings\/games\/[^/]+$/.test(pathname)) return 'game-detail';
  if (pathname === '/settings/app') return 'app';
  if (pathname === '/settings/help') return 'help';
  if (pathname === '/content') return 'content';
  if (pathname === '/recordings') return 'recordings-legacy';
  return null;
}

export function isProtectedParentPath(pathname: string): boolean {
  return getParentRouteKind(pathname) !== null;
}

export function sanitizeChildReturnPath(pathname: unknown): string {
  if (pathname === '/') return '/';
  if (typeof pathname !== 'string') return '/';
  return GAME_DEFINITIONS.some(game => game.path === pathname) ? pathname : '/';
}
```

- [ ] **Step 4: Run the verifier**

Run: `npx tsx src/shared/services/parentAccessLogic.verify.ts`

Expected: `✓ parent access route policy passed`.

- [ ] **Step 5: Commit the policy**

```bash
git add src/shared/services/parentAccessLogic.ts src/shared/services/parentAccessLogic.verify.ts
git commit -m "test: define protected parent route policy" -m "A pure route contract prevents access behavior from being coupled to overlay state or browser history quirks."
```

### Task 2: Make the E2E oracle composable and test-only for gate bypass

**Files:**
- Modify: `src/shared/services/e2eState.ts`
- Create: `src/shared/services/e2eState.verify.ts`
- Modify: `src/vite-env.d.ts`

- [ ] **Step 1: Write the failing merge verifier**

```ts
import { mergeE2EState } from './e2eState';

const unlock = () => undefined;
const withGate = mergeE2EState(
  { overlay: null, correctItemId: 'A' },
  { parentGate: { answer: 4, unlock } },
);
const withGameUpdate = mergeE2EState(withGate, { overlay: 'success' });

if (withGameUpdate.overlay !== 'success') throw new Error('Overlay did not update');
if (withGameUpdate.correctItemId !== 'A') throw new Error('Game state was erased');
if (withGameUpdate.parentGate?.answer !== 4) throw new Error('Gate adapter was erased');
console.log('✓ E2E state merge contract passed');
```

- [ ] **Step 2: Verify the failure**

Run: `npx tsx src/shared/services/e2eState.verify.ts`

Expected: FAIL because `mergeE2EState` is not exported.

- [ ] **Step 3: Implement typed merge and gate registration**

```ts
export type E2EOverlay = 'success' | 'failure' | 'session-complete' | null;

export interface ParentGateE2EState {
  answer: number | null;
  unlock: () => void;
}

export interface E2EGlobalState {
  overlay?: E2EOverlay;
  parentGate?: ParentGateE2EState;
  [key: string]: unknown;
}

export function mergeE2EState(
  current: E2EGlobalState | undefined,
  patch: Partial<E2EGlobalState>,
): E2EGlobalState {
  return { ...current, ...patch };
}

export function setE2EState(patch: Partial<E2EGlobalState>): void {
  if (!isE2EActive()) return;
  window.__E2E__ = mergeE2EState(window.__E2E__, patch);
}

export function exposeParentGateE2E(
  state: ParentGateE2EState,
): () => void {
  if (import.meta.env.MODE !== 'test') return () => undefined;
  setE2EState({ parentGate: state });
  return () => {
    if (!window.__E2E__) return;
    const { parentGate: _removed, ...rest } = window.__E2E__;
    window.__E2E__ = rest;
  };
}
```

Keep `isE2EActive()` compatible with existing development game oracles, but
never expose `parentGate` outside `mode=test`.

- [ ] **Step 4: Register the adapter from `ParentsGate`**

Use an effect whose cleanup is idempotent under React Strict Mode:

```tsx
useEffect(() => exposeParentGateE2E({ answer: problem.answer, unlock: onSuccess }), [
  problem.answer,
  onSuccess,
]);
```

- [ ] **Step 5: Run the verifier and lint**

Run: `npx tsx src/shared/services/e2eState.verify.ts`

Expected: `✓ E2E state merge contract passed`.

Run: `npm run lint`

Expected: PASS with no new warnings.

- [ ] **Step 6: Commit the adapter**

```bash
git add src/shared/services/e2eState.ts src/shared/services/e2eState.verify.ts src/shared/components/ParentsGate.tsx src/vite-env.d.ts
git commit -m "test: add production-safe parent gate adapter" -m "Deterministic setup speeds unrelated E2E and screenshot flows while mode gating keeps the production gate unskippable."
```

### Task 3: Move authorization to a route guard

**Files:**
- Create: `src/shared/contexts/ParentAccessContext.tsx`
- Create: `src/shared/components/ProtectedParentRoute.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the in-memory provider contract**

```tsx
interface ParentAccessValue {
  unlocked: boolean;
  unlock(): void;
  lock(): void;
}

const ParentAccessContext = createContext<ParentAccessValue | null>(null);

export function ParentAccessProvider({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const location = useLocation();
  const wasProtected = useRef(isProtectedParentPath(location.pathname));

  useEffect(() => {
    const protectedNow = isProtectedParentPath(location.pathname);
    if (wasProtected.current && !protectedNow) setUnlocked(false);
    wasProtected.current = protectedNow;
  }, [location.pathname]);

  const value = useMemo(() => ({
    unlocked,
    unlock: () => setUnlocked(true),
    lock: () => setUnlocked(false),
  }), [unlocked]);

  return <ParentAccessContext.Provider value={value}>{children}</ParentAccessContext.Provider>;
}
```

Export a `useParentAccess()` hook that throws outside the provider.

- [ ] **Step 2: Add the guarded outlet**

```tsx
export function ProtectedParentRoute() {
  const { unlocked, unlock, lock } = useParentAccess();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = sanitizeChildReturnPath(
    (location.state as { returnTo?: unknown } | null)?.returnTo,
  );

  if (unlocked) return <Outlet />;

  return (
    <ParentsGate
      onSuccess={unlock}
      onCancel={() => {
        lock();
        navigate(returnTo, { replace: true });
      }}
    />
  );
}
```

- [ ] **Step 3: Mount the provider inside `BrowserRouter`**

```tsx
<BrowserRouter>
  <ParentAccessProvider>
    <App />
  </ParentAccessProvider>
</BrowserRouter>
```

- [ ] **Step 4: Replace the home parent overlay flow with guarded navigation**

In `App.tsx`, remove `awaitingHomeSettingsReveal` and route home settings to
`/settings`. Nest protected routes under `ProtectedParentRoute`. Until Phase 4
builds their final screens, protect future URLs and replace-redirect them to the
existing dashboard after unlock:

```tsx
<Route element={<ProtectedParentRoute />}>
  <Route path="/settings" element={<SettingsScreen {...settingsProps} />} />
  <Route path="/settings/games" element={<Navigate to="/settings" replace />} />
  <Route path="/settings/games/:gameId" element={<Navigate to="/settings" replace />} />
  <Route path="/settings/app" element={<Navigate to="/settings" replace />} />
  <Route path="/settings/help" element={<Navigate to="/settings" replace />} />
  <Route path="/content" element={<CustomContentScreen />} />
  <Route path="/recordings" element={<Navigate to="/content" replace />} />
</Route>
```

Keep the existing contextual game overlay behind its gate in this phase. Phase
3 changes lobby settings to the route contract and Phase 4 supplies final parent
destinations.

- [ ] **Step 5: Run lint and existing E2E smoke**

Run: `npm run lint`

Expected: PASS.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/smoke.spec.ts`

Expected: existing public routes PASS.

- [ ] **Step 6: Commit the guard**

```bash
git add src/main.tsx src/App.tsx src/shared/contexts/ParentAccessContext.tsx src/shared/components/ProtectedParentRoute.tsx
git commit -m "fix: guard parent routes in memory" -m "Route-level protection closes direct-navigation and history bypasses without persisting parent authorization."
```

### Task 4: Add parent-access E2E coverage and helpers

**Files:**
- Create: `e2e/support/parentGate.ts`
- Create: `e2e/parent-access.spec.ts`
- Modify: `e2e/playwright.config.ts`

- [ ] **Step 1: Add reusable real and quick-pass helpers**

```ts
export async function unlockParentGate(page: Page): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__E2E__?.parentGate));
  await page.evaluate(() => window.__E2E__?.parentGate?.unlock());
}

export async function solveParentGate(page: Page): Promise<void> {
  const answer = await page.evaluate(() => window.__E2E__?.parentGate?.answer);
  if (typeof answer !== 'number') throw new Error('Parent gate answer unavailable');
  for (const digit of String(answer)) {
    await page.getByRole('button', { name: digit, exact: true }).click();
  }
  await page.getByRole('button', { name: 'Potvrdiť' }).click();
}
```

- [ ] **Step 2: Write route and history tests before adjusting implementation**

```ts
test('direct protected routes never reveal content before the gate', async ({ page }) => {
  for (const path of ['/settings', '/content', '/recordings']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toHaveCount(0);
  }
});

test('leaving and revisiting asks again', async ({ page }) => {
  await page.goto('/settings');
  await unlockParentGate(page);
  await expect(page.getByRole('heading', { name: 'Rodičovská zóna' })).toBeVisible();
  await page.goto('/');
  await page.goBack();
  await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
});
```

Add wrong-answer, correct keypad, direct-route cancel-to-home, a synthetic valid
child `returnTo` cancel case (Phase 3 adds the real lobby entry),
protected-to-protected, reload, new context, Back, Forward, and legacy redirect
cases from the design route matrix.

- [ ] **Step 3: Run the focused suite and fix only contract failures**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/parent-access.spec.ts`

Expected: PASS in desktop and the configured mobile project.

- [ ] **Step 4: Commit access coverage**

```bash
git add e2e/support/parentGate.ts e2e/parent-access.spec.ts e2e/playwright.config.ts src/App.tsx src/shared/contexts/ParentAccessContext.tsx
git commit -m "test: cover parent access lifecycle" -m "Direct routes, browser history, reloads, and repeated entry must all preserve the ask-each-time safety contract."
```

### Task 5: Add persistence and responsive baseline fixtures

**Files:**
- Create: `e2e/fixtures/local-data-v1.json`
- Create: `e2e/support/persistenceFixtures.ts`
- Create: `e2e/persistence-compat.spec.ts`
- Create: `e2e/support/layoutAssertions.ts`
- Create: `e2e/responsive-baseline.spec.ts`
- Modify: `e2e/support/viewports.ts`

- [ ] **Step 1: Add the canonical viewport constants**

```ts
export const CANONICAL_VIEWPORTS = {
  narrowPhone: { width: 320, height: 568 },
  smallPhone: { width: 360, height: 640 },
  phonePortrait: { width: 390, height: 844 },
  shortLandscape: { width: 667, height: 375 },
  phoneLandscape: { width: 844, height: 390 },
  tabletPortrait: { width: 768, height: 1024 },
  tabletLandscape: { width: 1024, height: 768 },
  desktop: { width: 1280, height: 900 },
  desktopWide: { width: 1920, height: 1080 },
} as const;
```

- [ ] **Step 2: Add objective layout assertions**

```ts
export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
}

export async function expectMinimumTarget(page: Page, locator: Locator, size: number) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(size);
  expect(box!.height).toBeGreaterThanOrEqual(size);
}
```

Add helpers for viewport intersection and pairwise non-overlap. Parent content
may be vertically scrollable; child answers and critical game actions may not be
silently clipped.

- [ ] **Step 3: Create exact legacy-data fixtures**

The JSON fixture must contain valid values for these existing keys:

```json
{
  "hrave-ucenie-settings": {
    "alphabetGridSize": 6,
    "alphabetAccents": false,
    "syllablesGridSize": 4,
    "numbersRange": { "start": 1, "end": 20 },
    "countingRange": { "start": 1, "end": 10 },
    "completeLetterMissingCount": "adaptive",
    "compareRange": { "start": 1, "end": 10 },
    "compareMode": "numerals",
    "additionSumRange": 20,
    "additionRepresentation": "numerals"
  },
  "hrave-ucenie-app-settings": { "locale": "sk", "fontFamily": "shantell" }
}
```

Also include seeded Slovak custom/default word and praise arrays plus an IndexedDB
audio Blob key. The support helper writes localStorage before navigation and
IndexedDB through `page.evaluate`.

- [ ] **Step 4: Write and run persistence/layout tests**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/persistence-compat.spec.ts e2e/responsive-baseline.spec.ts`

Expected: persistence cases PASS. Baseline assertions cover the gate and current
parent routes; known legacy game visual failures stay in the audit rather than
being waived as passing expectations.

- [ ] **Step 5: Commit test infrastructure**

```bash
git add e2e/fixtures e2e/support e2e/persistence-compat.spec.ts e2e/responsive-baseline.spec.ts
git commit -m "test: establish persistence and responsive baselines" -m "Stable fixtures and DOM assertions give later redesign phases objective compatibility and viewport gates."
```

### Task 6: Prove the adapter is absent from production and update screenshots

**Files:**
- Create: `e2e/production-guards.spec.ts`
- Create: `e2e/playwright.production.config.ts`
- Create: `tools/screenshots/capture.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add the production assertion**

```ts
test('production does not expose the parent gate adapter', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Pre rodičov' })).toBeVisible();
  const exposed = await page.evaluate(() => 'parentGate' in (window.__E2E__ ?? {}));
  expect(exposed).toBe(false);
});
```

- [ ] **Step 2: Add explicit scripts**

```json
{
  "scripts": {
    "test:e2e:production-guards": "npm run build && playwright test --config=e2e/playwright.production.config.ts e2e/production-guards.spec.ts"
  }
}
```

The production config serves the ordinary `npm run build` output on a different
fixed port and never reuses a test-mode server.

- [ ] **Step 3: Update screenshot gate setup**

The `shots` package script already points to this currently missing file. Create
the Playwright CLI with these contracts:

- accept `--base=<url>`, repeatable `--scene=<id>`, repeatable
  `--viewport=<canonical-name>`, and `--output=<directory>`;
- default to the Phase 1 `CANONICAL_VIEWPORTS` and write deterministic
  `<output>/<scene>/<viewport>.png` paths;
- launch installed Chrome through Playwright's `channel: 'chrome'`, create a new
  context per viewport with `reducedMotion: 'reduce'`, and close browser/context
  in `finally` blocks;
- define `parents-gate`, `parents-gate-error`, `settings`, and `content` scene
  setup explicitly; later phases extend this registry rather than creating a
  second capture tool;
- use `window.__E2E__.parentGate.unlock()` for protected settings/content scenes
  when the adapter exists; keep real keypad interaction for `parents-gate` and
  `parents-gate-error`;
- wait for the route's named heading, `document.fonts.ready`, and two animation
  frames before capture; fail on console errors, failed same-origin requests,
  unknown scenes/viewports, or a protected quick-pass request against a
  non-test server.

- [ ] **Step 4: Run both build modes**

Run: `npm run test:e2e:production-guards`

Expected: PASS and `parentGate` absent.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/parent-access.spec.ts`

Expected: PASS and quick-pass available.

- [ ] **Step 5: Commit production safeguards**

```bash
git add package.json package-lock.json e2e/production-guards.spec.ts e2e/playwright.production.config.ts tools/screenshots/capture.mjs
git commit -m "test: separate production and test gate behavior" -m "Distinct build verification prevents the automation shortcut from entering a release bundle."
```

### Task 7: Complete Phase 1 verification and handoff

**Files:**
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-01.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run the complete phase gate**

```bash
npx tsx src/shared/services/parentAccessLogic.verify.ts
npx tsx src/shared/services/e2eState.verify.ts
npm run lint
npm run test:e2e
npm run test:e2e:production-guards
npm run build
git diff --check
```

Expected: all commands PASS; only the repository’s documented pre-existing lint
warning may remain.

- [ ] **Step 2: Capture targeted screenshots**

Build and serve the test bundle in one terminal:

```bash
npm run build:e2e
npm run preview -- --port 4173 --host 127.0.0.1
```

Then run in a second terminal:

```bash
npm run shots -- --base=http://127.0.0.1:4173 --scene=parents-gate --scene=settings --scene=content
```

Expected: every selected scene captures at every configured viewport without a
setup failure.

- [ ] **Step 3: Update roadmap and write the handoff manifest**

Mark only Phase 1 complete. Record the branch, base and result SHAs, clean status,
all command outcomes, screenshot artifact path, changed files, reviewer result,
risks, and Phase 2 preconditions. Use `git rev-parse HEAD` and `git status --short`
to obtain the exact values; do not estimate them.

- [ ] **Step 4: Commit the phase handoff**

```bash
git add ROADMAP.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-01.md
git commit -m "docs: hand off UI redesign phase one" -m "Recorded verification and a precise accepted base let the design-system agent start without hidden state."
```

- [ ] **Step 5: Stop**

Do not begin Phase 2. Return the manifest and resulting SHA for explicit phase
acceptance.
