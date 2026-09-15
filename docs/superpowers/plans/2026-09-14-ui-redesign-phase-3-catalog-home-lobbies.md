# UI Redesign Phase 3: Catalog, Home, and Lobbies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make game discovery, routing, and lobby presentation catalog-driven, scalable, and responsive while introducing the approved grouped light-card home.

**Architecture:** Serializable game/category metadata and a separate lazy module registry share one exhaustive `GameId` contract, avoiding import cycles while eliminating duplicate route and home lists. The home renders ordered catalog groups; all current game components retain their round logic but consume one semantic lobby API. Settings links derive from setting IDs and enter the protected route contract from Phase 1.

**Tech Stack:** React 19, React Router 7, TypeScript, Tailwind v4, Phase 2 UI primitives, React lazy/Suspense, Playwright.

---

## Required context and phase boundary

Start from the Codex-accepted Phase 2 SHA on `feature/full-app-ui-redesign`. Read
`AGENTS.md`, `docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`,
and both Codex-accepted handoff manifests. Phase 2 primitives are mandatory;
do not create local replacements. This phase changes discovery and lobbies only;
do not migrate game-round visuals or build the parent dashboard.

## Phase acceptance contract

This phase produces a candidate SHA, not a self-approved result. After the
handoff commit, stop and submit the exact SHA, verification evidence, and local
screenshot directory to Codex. Phase 4 may begin only after Codex accepts that
SHA. If rejected, remediate inside Phase 3 with the same agent when available,
rerun affected checks and screenshots, and submit a new candidate; Phase 4 must
not absorb the findings. Screenshots remain ignored local manual-review evidence
under `artifacts/ui/<full-git-sha>/<unique-run-id>/` and are never committed or
pixel-diffed.
On approval, Codex records the reviewed candidate SHA and `Accepted` in the
handoff manifest, commits that review, and returns the acceptance commit SHA;
that commit is the only valid Phase 4 base. Any direct dependency addition,
removal, major upgrade, or substitution requires a short fit proposal and Codex
approval before `package.json` or the lockfile changes.

### Task 1: Define stable setting IDs and Slovak UI-copy keys

**Files:**
- Create: `src/shared/settings/settingIds.ts`
- Create: `src/shared/uiCopy.ts`
- Create: `src/shared/uiCopy.verify.ts`
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Write the failing copy verifier**

```ts
import { getUiCopy } from './uiCopy';

if (getUiCopy('sk', 'category.literacy') !== 'Písmená a slová') {
  throw new Error('Slovak literacy label missing');
}
if (getUiCopy('cs', 'game.alphabet.title') !== 'Abeceda') {
  throw new Error('Stub locale must fall back to Slovak');
}
console.log('✓ UI copy fallback passed');
```

- [ ] **Step 2: Run it and verify failure**

Run: `npx tsx src/shared/uiCopy.verify.ts`

Expected: FAIL because `uiCopy.ts` does not exist.

- [ ] **Step 3: Add exhaustive IDs**

```ts
export const SETTING_IDS = [
  'alphabetAccents',
  'alphabetGridSize',
  'syllablesGridSize',
  'numbersRange',
  'countingRange',
  'completeLetterMissingCount',
  'compareRange',
  'compareMode',
  'additionSumRange',
  'additionRepresentation',
] as const;

export type SettingId = typeof SETTING_IDS[number];
```

Define `UiCopyKey` from an `as const` Slovak object containing category titles,
all eleven game titles/descriptions/lobby instructions, and shared home/lobby
labels. `getUiCopy(locale, key)` returns Slovak until another locale provides the
key. Do not translate the app in this phase.

- [ ] **Step 4: Run verifier and commit**

Run: `npx tsx src/shared/uiCopy.verify.ts`

Expected: `✓ UI copy fallback passed`.

```bash
git add src/shared/settings/settingIds.ts src/shared/uiCopy.ts src/shared/uiCopy.verify.ts src/shared/types.ts
git commit -m "feat: define scalable game metadata keys" -m "Stable setting and copy identifiers let catalog consumers grow without copying labels or visibility switches."
```

### Task 2: Replace presentation fragments with a typed catalog

**Files:**
- Modify: `src/shared/gameCatalog.tsx`
- Create: `src/shared/gameCatalog.verify.ts`

- [ ] **Step 1: Write the failing catalog verifier**

```ts
import { GAME_CATEGORIES, GAME_DEFINITIONS } from './gameCatalog';
import { GAME_MODULE_IDS } from './gameModuleRegistry';
import { SETTING_IDS } from './settings/settingIds';

const ids = GAME_DEFINITIONS.map(game => game.id);
const paths = GAME_DEFINITIONS.map(game => game.path);
if (ids.length !== 11 || new Set(ids).size !== 11) throw new Error('Expected 11 unique game IDs');
if (new Set(paths).size !== paths.length) throw new Error('Game paths must be unique');
if (ids.slice().sort().join() !== GAME_MODULE_IDS.slice().sort().join()) {
  throw new Error('Catalog/module registry mismatch');
}
for (const game of GAME_DEFINITIONS) {
  if (!GAME_CATEGORIES.some(category => category.id === game.categoryId)) throw new Error(`Missing category: ${game.id}`);
  if (game.settings.some(id => !SETTING_IDS.includes(id))) throw new Error(`Unknown setting: ${game.id}`);
  if (JSON.stringify(game).includes('bg-')) throw new Error(`Raw Tailwind contract: ${game.id}`);
}
console.log('✓ game catalog invariants passed');
```

The module registry is added in Task 3, so this verifier initially fails.

- [ ] **Step 2: Define the catalog types**

```ts
export type GameCategoryId = 'literacy' | 'numeracy';
export type GameIconId = 'letters' | 'syllables' | 'numbers' | 'counting' | 'compare' | 'addition' | 'words' | 'first-letter' | 'assembly' | 'complete-syllable' | 'complete-letter';
export type TactilePreset = 'wood' | 'magnet' | 'felt' | 'picture' | 'counter' | 'tray' | 'balance';

export interface GameDefinition {
  id: GameId;
  path: string;
  categoryId: GameCategoryId;
  order: number;
  titleKey: UiCopyKey;
  descriptionKey: UiCopyKey;
  instructionKey: UiCopyKey;
  icon: GameIconId;
  tactilePreset: TactilePreset;
  settings: readonly SettingId[];
  promptMode: 'audio-first' | 'visual-and-audio';
  answerLayout: 'grid' | 'assembly' | 'quantity' | 'comparison';
}
```

Create `GAME_CATEGORIES` with literacy first and numeracy second. Convert all
eleven existing definitions to semantic metadata. Preserve current routes and
game IDs exactly.

- [ ] **Step 3: Encode the exact settings mapping**

Use the approved inventory:

```ts
ALPHABET: ['alphabetAccents', 'alphabetGridSize']
SYLLABLES: ['syllablesGridSize']
NUMBERS: ['numbersRange']
COUNTING_ITEMS: ['countingRange']
COMPARE_QUANTITIES: ['compareMode', 'compareRange']
ADDITION: ['additionSumRange', 'additionRepresentation']
FIRST_LETTER: ['alphabetAccents']
COMPLETE_LETTER: ['alphabetAccents', 'completeLetterMissingCount']
WORDS: []
ASSEMBLY: []
COMPLETE_SYLLABLE: []
```

- [ ] **Step 4: Defer verifier execution until Task 3**

Do not weaken the parity assertion. The missing module registry is the intended
failure.

### Task 3: Generate routes from a lazy module registry

**Files:**
- Create: `src/shared/gameRuntime.ts`
- Create: `src/shared/gameModuleRegistry.tsx`
- Create: `src/shared/components/GameRoute.tsx`
- Modify: `src/App.tsx`
- Modify: all eleven files under `src/games/*/*Game.tsx`

- [ ] **Step 1: Define one runtime prop contract**

```ts
export interface GameRuntimeProps {
  settings: GameSettings;
  onExit(): void;
  onOpenSettings?: () => void;
}
```

Export this interface from `src/shared/gameRuntime.ts`; the registry and every
game import it from that file so no game module depends back on the registry.

Update every game component to accept this contract. Games read only the setting
fields they need. This is a prop normalization, not a round-loop refactor.

- [ ] **Step 2: Add the lazy adapter helper and exhaustive registry**

```tsx
function lazyRoute<TModule>(
  load: () => Promise<TModule>,
  render: (module: TModule, props: GameRuntimeProps) => React.ReactNode,
) {
  return React.lazy(async () => {
    const module = await load();
    return { default: (props: GameRuntimeProps) => render(module, props) };
  });
}

export const GAME_MODULES: Record<GameId, React.ComponentType<GameRuntimeProps>> = {
  ALPHABET: lazyRoute(() => import('../games/alphabet/AlphabetGame'), (m, p) => <m.AlphabetGame {...p} />),
  SYLLABLES: lazyRoute(() => import('../games/syllables/SyllablesGame'), (m, p) => <m.SyllablesGame {...p} />),
  NUMBERS: lazyRoute(() => import('../games/numbers/NumbersGame'), (m, p) => <m.NumbersGame {...p} />),
  COUNTING_ITEMS: lazyRoute(() => import('../games/counting/CountingItemsGame'), (m, p) => <m.CountingItemsGame {...p} />),
  COMPARE_QUANTITIES: lazyRoute(() => import('../games/compare/CompareQuantitiesGame'), (m, p) => <m.CompareQuantitiesGame {...p} />),
  ADDITION: lazyRoute(() => import('../games/addition/AdditionGame'), (m, p) => <m.AdditionGame {...p} />),
  WORDS: lazyRoute(() => import('../games/words/WordsGame'), (m, p) => <m.WordsGame {...p} />),
  FIRST_LETTER: lazyRoute(() => import('../games/first-letter/FirstLetterGame'), (m, p) => <m.FirstLetterGame {...p} />),
  ASSEMBLY: lazyRoute(() => import('../games/assembly/AssemblyGame'), (m, p) => <m.AssemblyGame {...p} />),
  COMPLETE_SYLLABLE: lazyRoute(() => import('../games/complete-syllable/CompleteSyllableGame'), (m, p) => <m.CompleteSyllableGame {...p} />),
  COMPLETE_LETTER: lazyRoute(() => import('../games/complete-letter/CompleteLetterGame'), (m, p) => <m.CompleteLetterGame {...p} />),
};

export const GAME_MODULE_IDS = Object.keys(GAME_MODULES) as GameId[];
```

- [ ] **Step 3: Implement `GameRoute`**

Resolve `gameId`, pass the full settings object, and supply settings navigation
only when the catalog’s `settings` array is non-empty:

```tsx
const onOpenSettings = definition.settings.length
  ? () => navigate(`/settings/games/${gameId}`, { state: { returnTo: definition.path } })
  : undefined;
```

Wrap the lazy component in existing `ErrorBoundary` and `Suspense` using a shared
loading state from Phase 2.

- [ ] **Step 4: Generate game routes in `App.tsx`**

```tsx
{GAME_DEFINITIONS.map(game => (
  <Route
    key={game.id}
    path={game.path}
    element={<GameRoute gameId={game.id} settings={settings} />}
  />
))}
```

Remove all eleven static imports and explicit route blocks. Do not import any
avatar renderer into the registry.

- [ ] **Step 5: Run catalog verifier, lint, and build**

Run: `npx tsx src/shared/gameCatalog.verify.ts`

Expected: `✓ game catalog invariants passed`.

Run: `npm run lint && npm run build`

Expected: PASS and eleven lazy game chunks; avatar/three.js remains separate.

- [ ] **Step 6: Commit catalog routing**

```bash
git add src/App.tsx src/shared/gameCatalog.tsx src/shared/gameCatalog.verify.ts src/shared/gameModuleRegistry.tsx src/shared/components/GameRoute.tsx src/games
git commit -m "refactor: generate game routes from catalog" -m "One exhaustive registry removes duplicate route wiring and keeps future game additions lazy and verifiable."
```

### Task 4: Build the grouped light-card home

**Files:**
- Create: `src/home/GroupedHomeScreen.tsx`
- Create: `src/home/GameCard.tsx`
- Modify: `src/App.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Create: `e2e/catalog-home-lobbies.spec.ts`

- [ ] **Step 1: Write failing group/card tests**

```ts
test('home renders ordered catalog groups and every game once', async ({ page }) => {
  await page.goto('/');
  const main = page.getByRole('main');
  await expect(main.getByRole('heading', { name: 'Písmená a slová' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Čísla a počítanie' })).toBeVisible();
  await expect(main.getByRole('link', { name: /Abeceda/ })).toHaveCount(1);
  await expect(main.getByTestId('game-card')).toHaveCount(11);
});
```

- [ ] **Step 2: Implement `GameCard`**

Use a semantic link with `data-testid="game-card"`, a light/white surface, a shared-palette icon tile, title,
description, and one stable baseline. Accept `GameDefinition` and localized copy;
do not accept arbitrary color classes.

- [ ] **Step 3: Implement catalog grouping**

```ts
const groupedGames = GAME_CATEGORIES.map(category => ({
  category,
  games: GAME_DEFINITIONS
    .filter(game => game.categoryId === category.id)
    .sort((a, b) => a.order - b.order),
}));
```

Render category sections in a universal grid: two columns when 320px can retain
48px targets and readable titles, more columns as space grows, and bounded card
width on wide desktop. Preserve home scroll restoration and the PWA control.
Do not render the avatar overlay in the release configuration.

- [ ] **Step 4: Add UI-kit examples and run focused tests**

Document one game card, a wrapped long title, both group headings, keyboard focus,
and the 320px layout.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/catalog-home-lobbies.spec.ts`

Expected: grouped-home test PASS.

- [ ] **Step 5: Commit home**

```bash
git add src/home src/App.tsx src/shared/ui/UiKitScreen.tsx e2e/catalog-home-lobbies.spec.ts
git commit -m "feat: group games on a scalable home" -m "Catalog categories reduce cognitive load while light cards preserve a coherent palette as the game library grows."
```

### Task 5: Migrate all lobbies to one semantic shell

**Files:**
- Modify: `src/shared/components/GameLobby.tsx`
- Modify: all eleven `src/games/*/*Game.tsx` files
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `e2e/catalog-home-lobbies.spec.ts`

- [ ] **Step 1: Add failing lobby contract tests**

For each catalog path assert one heading, visible instruction, tactile preview,
one **Hrať** action, and settings only for the eight configured games. Assert no
settings action for Slová, Skladaj, or Doplň slabiku. From Abeceda, open
settings, cancel the gate, and assert the URL returns to `/alphabet`; unlock on a
second attempt and assert the protected interim screen remains locked behind the
same route guard. Phase 4 owns the final close-to-lobby behavior.

- [ ] **Step 2: Replace the raw lobby API**

```ts
interface GameLobbyProps {
  gameId: GameId;
  onPlay(): void;
  onBack(): void;
  onOpenSettings?: () => void;
  availabilityMessage?: string;
}
```

Resolve title, instruction, semantic material preview, and visual preset from
the catalog. Render the title as one accessible string; do not split it into
per-character screen-reader nodes. Remove `playButtonColorClassName` and raw
decoration classes.

- [ ] **Step 3: Update every caller mechanically**

Each game passes its stable `gameId`. Preserve empty-content messaging and the
existing HOME/PLAYING state. Do not touch round markup.

- [ ] **Step 4: Verify responsive lobby behavior**

At 320×568 and portrait, use a compact vertical layout. At 667×375, use a short
horizontal composition with compressed header. At tablet/desktop, center within
bounded width. All controls remain identical.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/catalog-home-lobbies.spec.ts`

Expected: all eleven lobby cases PASS at configured viewports.

- [ ] **Step 5: Commit lobbies**

```bash
git add src/shared/components/GameLobby.tsx src/games src/shared/ui/UiKitScreen.tsx e2e/catalog-home-lobbies.spec.ts
git commit -m "feat: unify responsive game lobbies" -m "A semantic catalog-backed lobby removes empty settings paths and keeps new games consistent without unique color themes."
```

### Task 6: Complete Phase 3 regression and handoff

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-03.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Remove the duplicate smoke route list**

Export a serializable catalog fixture or derive expected paths from a generated
JSON-safe catalog module. Keep E2E tests independent of React JSX modules.

- [ ] **Step 2: Run the complete phase gate**

```bash
npx tsx src/shared/uiCopy.verify.ts
npx tsx src/shared/gameCatalog.verify.ts
npm run lint
npm run test:e2e
npm run build
git diff --check
```

Expected: PASS with all public and protected-route regressions green.

- [ ] **Step 3: Capture and review home plus all lobbies**

Run the Phase 1 screenshot harness across the canonical matrix for home and all
eleven lobby scenes. Check card baselines, long titles, short landscape, focus,
and absence of per-game full-surface colors. Preserve the printed local
`artifacts/ui/<full-git-sha>/<unique-run-id>/` path and record it in the handoff.

- [ ] **Step 4: Update roadmap and handoff manifest**

Mark Phase 3 implementation complete but pending Codex acceptance. Record exact
base/result SHAs, clean status, commands, local screenshots, lazy-chunk evidence,
internal reviewer result, risks, and the proposed Phase 4 base.

- [ ] **Step 5: Commit and stop**

```bash
git add e2e/smoke.spec.ts ROADMAP.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-03.md
git commit -m "docs: hand off UI redesign phase three" -m "Verified catalog and navigation contracts give the parent agent stable game metadata and entry paths."
```

Do not begin Phase 4. Submit the exact candidate SHA and evidence to Codex and
follow the acceptance contract above.
