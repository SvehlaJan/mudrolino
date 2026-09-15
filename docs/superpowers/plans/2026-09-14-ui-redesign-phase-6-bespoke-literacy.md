# UI Redesign Phase 6: Bespoke Literacy Games Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Prvé písmenko, Doplň písmeno, Doplň slabiku, and Skladaj to the approved tactile, universally responsive game system without changing round generation, attempts, settings, content eligibility, or audio semantics.

**Architecture:** The accepted Phase 5 state/session shell remains the only lifecycle and feedback framework. Three small material components extend its tactile vocabulary for picture prompts, word rails, and inset blanks. Existing pure round builders remain authoritative; Assembly first extracts its board transitions from React so duplicate syllables, return-to-tray behavior, validation, and its bespoke wrong-answer audio sequence are independently verifiable.

**Tech Stack:** React 19, TypeScript, Tailwind v4 semantic tokens, Phase 2 UI primitives, Phase 3 catalog/lobbies, Phase 5 game shell/session/materials, Motion/GSAP only through reduced-motion-safe adapters, Playwright.

---

## Required context and phase boundary

Start from the accepted Phase 5 SHA on `feature/full-app-ui-redesign`. Read
`AGENTS.md`, `docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`,
and Phase 1–5 handoff manifests before changing code. Use
these inherited Phase 5 contracts directly:

- `src/shared/game/gameState.ts`
- `src/shared/game/useGameSession.ts`
- `src/shared/game/GameShell.tsx`
- `src/shared/game/GamePrompt.tsx`
- `src/shared/game/AnswerGroup.tsx`
- `src/shared/game/materials/TactilePiece.tsx`
- `src/shared/game/materials/PlayTray.tsx`
- `src/shared/game/materials/index.ts`
- `src/games/first-letter/FirstLetterGame.tsx`
- `src/games/first-letter/firstLetterLogic.ts`
- `src/games/first-letter/firstLetterLogic.verify.ts`
- `src/games/complete-letter/CompleteLetterGame.tsx`
- `src/games/complete-letter/completeLetterLogic.ts`
- `src/games/complete-letter/completeLetterLogic.verify.ts`
- `src/games/complete-syllable/CompleteSyllableGame.tsx`
- `src/games/complete-syllable/completeSyllableLogic.ts`
- `src/games/complete-syllable/completeSyllableLogic.verify.ts`
- `src/games/assembly/AssemblyGame.tsx`
- `src/games/assembly/assemblyAudioLogic.ts`
- `src/games/assembly/assemblyAudioLogic.verify.ts`
- `src/shared/contentRegistry.ts`
- `src/shared/services/{audioManager,e2eState}.ts`
- `e2e/support/{gameHarness,layoutAssertions,viewports}.ts`

Do not fork or wrap those contracts locally. Keep each existing HOME/PLAYING
lobby boundary from Phase 3. This phase owns only FIRST_LETTER, COMPLETE_LETTER,
COMPLETE_SYLLABLE, ASSEMBLY, and shared literacy materials. Do not migrate the
three bespoke numeracy games, change parent routes, change storage schemas, add
audio keys/assets, or import avatar/three.js modules.

The following behavior is authoritative and must survive the visual migration:

| Game | Rounds | Failure rule | Settings | Correct selection audio | Wrong selection audio |
|---|---:|---|---|---|---|
| FIRST_LETTER | 5 | failure after 3 wrong taps | `alphabetAccents` | selected letter, then success feedback audio | selected letter, shared retry; on exhaustion, existing failure explanation follows |
| COMPLETE_LETTER | 5 words | failure after 3 wrong taps across the word | `alphabetAccents`, `completeLetterMissingCount` | each fitted letter; success feedback audio only after the final blank | selected letter, shared retry; on exhaustion, existing failure explanation follows |
| COMPLETE_SYLLABLE | 5 | failure after 3 wrong taps | none | selected syllable, then success feedback audio | selected syllable, shared retry; on exhaustion, existing failure explanation follows |
| ASSEMBLY | 5 | no attempt cap; a wrong full rail resets to tray | none | each placed syllable; final syllable is not duplicated | **exception:** wrong final syllable, retry phrase, then target word |

Each PLAYING branch configures the inherited Phase 5 session; do not retain a
parallel `showSuccess`/`showFailure`/counter state machine:

```tsx
const session = useGameSession({
  maxRounds: 5,
  maxAttempts: 3,
  onNextRound: buildNextRound,
  onPlayAgain: resetQueueAndBuildRound,
});
```

Pass the matching stable game ID to `GameShell` in each component. FIRST_LETTER
and COMPLETE_SYLLABLE call `resolveAnswer` with ordinary `correct`/`wrong`
outcomes. COMPLETE_LETTER uses the `progress` outcome for non-final fitted
letters and terminal outcomes for final results. ASSEMBLY uses
`maxAttempts: null`; intermediate placements use `progress` with
`countTap: false`, and a full rail uses a terminal result with `countTap: true`,
preserving `totalChecks` semantics. Every new round, replay,
pause, lobby exit, recoverable error, and unmount uses the session cleanup path
so stale timers and audio cannot advance a later round.

For the three capped games, a wrong tap always calls
`getWrongAnswerAudio(...)`, including attempt three. Pass the unchanged failure
`audioSpec` as `verdictAudio`; the session plays it only when the computed
resolution is `failure`, after the selected-item-plus-retry sequence has
finished. A correct tap passes `getItemAnnouncementAudio(...)` as selection
audio and the unchanged success `audioSpec` as verdict audio. This preserves
both the global answer-audio ordering and the existing end-of-round explanation.
Assembly alone follows its exact exception in Task 6.

Every game must expose a visible prompt and replay action, visible plus announced
feedback, 48×48 minimum child controls, Phase 5 `AnswerGroup` keyboard behavior, and
the same functionality at every canonical viewport. A parent dialog pauses
audio, timers, animation, and input through the Phase 5 pause contract; closing
it restores the same round, selections, progress, and logical focus target.
Each migrated game uses merge-based `setE2EState` to retain its existing oracle
fields and add `gameId` plus `phase: session.state.phase`; it never assigns the
global object directly.

### Task 1: Add shared picture, rail, and inset material primitives

**Files:**
- Create: `src/shared/game/materials/PictureCard.tsx`
- Create: `src/shared/game/materials/WordRail.tsx`
- Create: `src/shared/game/materials/InsetSlot.tsx`
- Modify: `src/shared/game/materials/index.ts`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Create: `e2e/bespoke-literacy.spec.ts`

- [ ] **Step 1: Write the failing UI-kit material test**

```ts
import { expect, test } from '@playwright/test';
import { expectMinimumTarget, expectNoHorizontalOverflow } from './support/layoutAssertions';

test('UI kit exposes the literacy material vocabulary', async ({ page }) => {
  await page.goto('/ui-kit');
  const section = page.getByRole('region', { name: 'Literárne materiály' });
  await expect(section.getByTestId('picture-card')).toBeVisible();
  await expect(section.getByTestId('word-rail')).toBeVisible();
  await expect(section.getByTestId('inset-slot-active')).toHaveAttribute('data-slot-state', 'active');
  await expect(section.getByTestId('inset-slot-filled')).toHaveAttribute('data-slot-state', 'filled');
  await expectMinimumTarget(page, section.getByRole('button', { name: 'Slabika MA' }), 48);
  await expectNoHorizontalOverflow(page);
});
```

Render the UI-kit case with a `Mama` picture card, a `MA-MA` two-slot rail, one
active blank, one filled slot, and felt `MA`/`LA` pieces in the inherited
`PlayTray`. Add a second rail containing `DŽ-U-N-G-Ľ-A` to prove long Slovak
units wrap or shrink without horizontal clipping.

- [ ] **Step 2: Run the focused test and confirm failure**

Run:

```bash
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "UI kit exposes"
```

Expected: FAIL because the three material components and UI-kit region do not
exist.

- [ ] **Step 3: Implement the three narrow component APIs**

```tsx
// src/shared/game/materials/PictureCard.tsx
import type { HTMLAttributes } from 'react';
import { cn } from '../../ui/variants';

export interface PictureCardProps extends Omit<HTMLAttributes<HTMLElement>, 'aria-label'> {
  emoji: string;
  label: string;
  caption?: string;
}

export function PictureCard({ emoji, label, caption, className = '', ...props }: PictureCardProps) {
  return (
    <figure
      data-testid="picture-card"
      className={cn('grid min-h-32 place-items-center gap-2 rounded-3xl border border-border-subtle bg-surface p-4 shadow-card', className)}
      {...props}
    >
      <span role="img" aria-label={label} className="text-[clamp(4rem,16vmin,8rem)] leading-none">
        {emoji}
      </span>
      {caption ? <figcaption className="text-center font-spline text-xl font-bold text-text-main">{caption}</figcaption> : null}
    </figure>
  );
}
```

```tsx
// src/shared/game/materials/InsetSlot.tsx
import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../../ui/variants';

export type InsetSlotState = 'fixed' | 'active' | 'pending' | 'filled';

export interface InsetSlotProps extends Omit<HTMLAttributes<HTMLLIElement>, 'aria-label'> {
  label: string;
  state: InsetSlotState;
  children?: ReactNode;
}

export function InsetSlot({ label, state, children, className = '', ...props }: InsetSlotProps) {
  return (
    <li
      aria-label={label}
      data-slot-state={state}
      className={cn(
        'grid min-h-14 min-w-14 place-items-center rounded-2xl border-[3px] px-3 py-2 font-spline text-[clamp(1.5rem,6vmin,3.25rem)] font-black leading-none',
        state === 'active' ? 'border-focus bg-selected-surface text-text-main' : 'border-border-subtle bg-surface text-text-main',
        state === 'pending' && 'bg-canvas text-text-muted',
        className,
      )}
      {...props}
    >
      {children ?? <span aria-hidden="true">?</span>}
    </li>
  );
}
```

```tsx
// src/shared/game/materials/WordRail.tsx
import type { ReactNode } from 'react';
import { cn } from '../../ui/variants';

export interface WordRailProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function WordRail({ label, children, className = '' }: WordRailProps) {
  return (
    <section data-testid="word-rail" aria-label={label} className={cn('w-full rounded-[2rem] bg-surface/80 p-3 shadow-card sm:p-5', className)}>
      <ol className="flex min-w-0 flex-wrap items-center justify-center gap-2 sm:gap-3">
        {children}
      </ol>
    </section>
  );
}
```

Keep `PictureCard` noninteractive; the single visible replay control belongs to
`GameShell`/`GamePrompt`. `InsetSlot` owns only slot appearance and semantics.
Answers remain buttons rendered by `TactilePiece` inside `AnswerGroup` or
`PlayTray`; none of the new materials implements a second answer or keyboard
API. Export all three components and their public types from
`src/shared/game/materials/index.ts`.

- [ ] **Step 4: Add material states to the UI kit and run focused coverage**

Run:

```bash
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "UI kit exposes"
npm run lint
```

Expected: PASS; the 320px project has no horizontal overflow, and lint reports
no new warnings.

- [ ] **Step 5: Commit the literacy materials**

```bash
git add src/shared/game/materials/PictureCard.tsx src/shared/game/materials/WordRail.tsx src/shared/game/materials/InsetSlot.tsx src/shared/game/materials/index.ts src/shared/ui/UiKitScreen.tsx e2e/bespoke-literacy.spec.ts
git commit -m "feat: add tactile literacy materials" -m "Shared picture, rail, and inset primitives give four word games one responsive and accessible visual grammar."
```

### Task 2: Extract Assembly board transitions before changing its UI

**Files:**
- Create: `src/games/assembly/assemblyLogic.ts`
- Create: `src/games/assembly/assemblyLogic.verify.ts`
- Modify: `src/games/assembly/AssemblyGame.tsx`

- [ ] **Step 1: Write the failing board verifier**

```ts
import {
  createAssemblyBoard,
  getCorrectTileOrder,
  isAssemblyBoardComplete,
  isAssemblyBoardCorrect,
  moveTileToFirstOpenSlot,
  returnTileToTray,
} from './assemblyLogic';

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

let nextId = 0;
const board = createAssemblyBoard(['ma', 'ma'], () => `tile-${nextId++}`, items => [...items].reverse());
assert(board.trayTiles.length === 2, 'duplicate syllables keep distinct tiles');
assert(new Set(board.trayTiles.map(tile => tile.id)).size === 2, 'tile IDs are unique');

const correctOrder = getCorrectTileOrder(board, ['ma', 'ma']);
const firstMove = moveTileToFirstOpenSlot(board, correctOrder[0]);
assert(firstMove.placedTiles[0]?.id === correctOrder[0], 'first tap fills first open slot');
const returned = returnTileToTray(firstMove, 0);
assert(returned.placedTiles[0] === null, 'placed tap empties its slot');
assert(returned.trayTiles.some(tile => tile.id === correctOrder[0]), 'returned tile re-enters tray');

const full = correctOrder.reduce(moveTileToFirstOpenSlot, board);
assert(isAssemblyBoardComplete(full), 'all occupied slots form a complete board');
assert(isAssemblyBoardCorrect(full, ['ma', 'ma']), 'duplicate-syllable word validates');
assert(!isAssemblyBoardCorrect(board, ['ma', 'ma']), 'partial board is never correct');
console.log('✓ assembly board logic passed');
```

- [ ] **Step 2: Run and confirm failure**

Run: `npx tsx src/games/assembly/assemblyLogic.verify.ts`

Expected: FAIL because `assemblyLogic.ts` does not exist.

- [ ] **Step 3: Implement immutable board operations**

```ts
export interface AssemblyTile {
  id: string;
  text: string;
  trayIndex: number;
}

export interface AssemblyBoard {
  trayTiles: AssemblyTile[];
  placedTiles: (AssemblyTile | null)[];
}

export type ShuffleTiles = (tiles: AssemblyTile[]) => AssemblyTile[];

export function createAssemblyBoard(
  syllables: string[],
  makeId: () => string,
  shuffle: ShuffleTiles,
): AssemblyBoard {
  const ordered = syllables.map((text, trayIndex) => ({ id: makeId(), text, trayIndex }));
  return { trayTiles: shuffle(ordered), placedTiles: ordered.map(() => null) };
}

export function moveTileToFirstOpenSlot(board: AssemblyBoard, tileId: string): AssemblyBoard {
  const tile = board.trayTiles.find(candidate => candidate.id === tileId);
  const slotIndex = board.placedTiles.findIndex(candidate => candidate === null);
  if (!tile || slotIndex < 0) return board;
  const placedTiles = [...board.placedTiles];
  placedTiles[slotIndex] = tile;
  return {
    trayTiles: board.trayTiles.filter(candidate => candidate.id !== tileId),
    placedTiles,
  };
}

export function returnTileToTray(board: AssemblyBoard, slotIndex: number): AssemblyBoard {
  const tile = board.placedTiles[slotIndex];
  if (!tile) return board;
  const placedTiles = [...board.placedTiles];
  placedTiles[slotIndex] = null;
  return {
    trayTiles: [...board.trayTiles, tile].sort((a, b) => a.trayIndex - b.trayIndex),
    placedTiles,
  };
}

export function isAssemblyBoardComplete(board: AssemblyBoard): boolean {
  return board.placedTiles.every(tile => tile !== null);
}

export function isAssemblyBoardCorrect(board: AssemblyBoard, correctSyllables: string[]): boolean {
  return isAssemblyBoardComplete(board)
    && board.placedTiles.every((tile, index) => tile?.text === correctSyllables[index]);
}

export function getCorrectTileOrder(board: AssemblyBoard, correctSyllables: string[]): string[] {
  const remaining = [...board.trayTiles, ...board.placedTiles.filter((tile): tile is AssemblyTile => tile !== null)];
  return correctSyllables.map(symbol => {
    const index = remaining.findIndex(tile => tile.text === symbol);
    if (index < 0) throw new Error(`Missing assembly tile for ${symbol}`);
    return remaining.splice(index, 1)[0].id;
  });
}
```

Move `AssemblyTile` and board mutation code out of the component. Keep DOM
measurement and animation in `AssemblyGame.tsx`, but make animation call one of
these pure transitions. Add verifier cases for wrong order, nonexistent tile,
full rail, repeated tile taps, returning an empty slot, and two- and
three-syllable words.

- [ ] **Step 4: Prove behavior is unchanged and commit**

```bash
npx tsx src/games/assembly/assemblyLogic.verify.ts
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
npm run lint
```

Expected: both verifiers PASS and lint has no new warnings.

```bash
git add src/games/assembly/assemblyLogic.ts src/games/assembly/assemblyLogic.verify.ts src/games/assembly/AssemblyGame.tsx
git commit -m "refactor: isolate assembly board transitions" -m "Pure immutable placement rules protect duplicate syllables and reset behavior before the presentation migration."
```

### Task 3: Migrate Prvé písmenko to picture cards and letter magnets

**Files:**
- Modify: `src/games/first-letter/FirstLetterGame.tsx`
- Modify: `src/games/first-letter/firstLetterLogic.verify.ts`
- Modify: `e2e/bespoke-literacy.spec.ts`

- [ ] **Step 1: Add failing Prvé písmenko flow tests**

Add tests that enter `/first-letter`, activate **Hrať**, and assert:

```ts
test('Prvé písmenko uses the shared literacy shell', async ({ page }) => {
  await page.goto('/first-letter');
  await page.getByRole('button', { name: 'Hrať' }).click();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Prvé písmenko' })).toBeVisible();
  await expect(page.getByText('Ktorým písmenom sa začína toto slovo?')).toBeVisible();
  await expect(page.getByTestId('picture-card')).toBeVisible();
  await expect(page.getByRole('group', { name: 'Vyber prvé písmeno' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
});
```

Use the merge-based E2E oracle to expose `gameId`, `correctItemId`, and
`answerItemIds` in test mode. Add one test that taps a wrong magnet and sees the
visible polite `Skús ešte raz` status, one that taps the correct magnet and sees
it settle before success, and one keyboard test proving Tab enters the group,
ArrowRight moves, and Space activates exactly one choice.

- [ ] **Step 2: Run and confirm the legacy screen fails**

Run:

```bash
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Prvé písmenko"
```

Expected: FAIL because the legacy round lacks the new heading, instruction,
picture-card material, and announced inline retry state.

- [ ] **Step 3: Replace only the PLAYING presentation**

Compose `GameShell`, `GamePrompt`, and `PictureCard`, then render four magnet
`TactilePiece` buttons inside `AnswerGroup`. Delegate terminal feedback and the
fifth-round completion state to `useGameSession`; remove this game’s imports of
all three legacy overlay components. Keep
`buildFirstLetterItems`, `buildLetterChoices`, the five-round queue,
`alphabetAccents`, three-attempt failure, timers, totals, and lobby availability
copy unchanged.

Use stable answer IDs and `data-answer-id` values based on `letter.symbol`, not
array indexes. The correct
magnet receives `data-piece-state="settled"` before Phase 5 success feedback.
A wrong magnet receives `data-piece-state="retry"`, stays operable after the
brief feedback reset, and is accompanied by visible/live retry text. Input locks
only while an answer event is being resolved, during feedback/completion, or
while the parent dialog is open.

Preserve exact audio construction:

```ts
const correctAudio = getItemAnnouncementAudio(locale, 'letters', letter.audioKey, letter.symbol);
const wrongAudio = getWrongAnswerAudio(locale, 'letters', letter.audioKey, letter.symbol);
```

The prompt remains word audio followed by `na-ake-pismenko-sa-zacina`.
Correct selection audio finishes before shared praise starts; wrong selection
audio is the selected letter followed by `retry`.

- [ ] **Step 4: Extend pure invariants and run focused checks**

Add verifier assertions that four choices contain one correct symbol, no
duplicates, `CH` and `DZ` remain available with accents off, `DŽ` does not, and
an ineligible word never enters the queue.

```bash
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Prvé písmenko"
npm run lint
```

Expected: verifier, focused browser tests, and lint PASS.

- [ ] **Step 5: Commit Prvé písmenko**

```bash
git add src/games/first-letter/FirstLetterGame.tsx src/games/first-letter/firstLetterLogic.verify.ts e2e/bespoke-literacy.spec.ts
git commit -m "feat: rebuild first-letter playfield" -m "Picture prompts and magnetic choices now use the shared session shell without changing Slovak-letter eligibility or answer audio."
```

### Task 4: Migrate Doplň písmeno to a progressive inset word rail

**Files:**
- Modify: `src/games/complete-letter/CompleteLetterGame.tsx`
- Modify: `src/games/complete-letter/completeLetterLogic.verify.ts`
- Modify: `e2e/bespoke-literacy.spec.ts`

- [ ] **Step 1: Add failing multi-blank and settings tests**

Add browser cases for `/complete-letter` that assert the picture card, word
rail, one active blank, pending later blanks, four letter magnets, visible
instruction `Doplň chýbajúce písmeno`, and replay action. Seed
`completeLetterMissingCount: 2` through the Phase 1 persistence fixture and
assert the first correct fit advances the active inset without completing the
round; the second correct fit settles and completes it. Add an accent-off case
whose E2E oracle never reports an accented correct answer.

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Doplň písmeno"
```

Expected: FAIL because the legacy word slots and answer tiles do not implement
the new rail/inset semantics or shared shell states.

- [ ] **Step 3: Render the existing round projection with shared materials**

Map every `buildPromptSlots` result without changing its order:

```tsx
<WordRail label={`Slovo ${targetRound.word.word}`}>
  {buildPromptSlots(targetRound, filledMissingCount).map(slot => (
    <InsetSlot
      key={slot.index}
      label={
        slot.state === 'active'
          ? `Chýbajúce písmeno ${slot.index + 1}, aktívne`
          : slot.state === 'pending'
            ? `Chýbajúce písmeno ${slot.index + 1}, čaká`
            : `Písmeno ${slot.text}`
      }
      state={slot.state === 'visible' ? 'fixed' : slot.state}
    >
      {slot.state === 'active' || slot.state === 'pending' ? null : slot.text}
    </InsetSlot>
  ))}
</WordRail>
```

Compose `GameShell`, `GamePrompt`, `PictureCard`, and `WordRail`, then render
magnet `TactilePiece` buttons in `AnswerGroup`. Delegate terminal feedback and
completion to `useGameSession`; each choice exposes its stable letter symbol as
`data-answer-id`. Remove this game’s legacy overlay imports. Preserve
`getActiveCompleteLetterLetters`,
`buildEligibleCompleteLetterWords`, `createCompleteLetterRound`, guided
`missingIndexes`, the current queue fallback, five rounds, three wrong taps per
word, totals, and both settings. A correct non-final letter calls
`resolveAnswer` with outcome `progress`, speaks and settles, then returns the session to
`awaiting-answer` with regenerated choices. Only the final blank uses the
terminal correct transition. After the third wrong tap, reveal
all missing units before failure feedback.

- [ ] **Step 4: Verify multi-character letters and progressive state**

Keep and extend pure assertions for `CH`, `DZ`, `DŽ`, active/pending/filled slot
order, adaptive count at four/five units, unique choices, and unplayable content.

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Doplň písmeno"
npm run lint
```

Expected: all checks PASS, including two sequential fits without an early
success overlay.

- [ ] **Step 5: Commit Doplň písmeno**

```bash
git add src/games/complete-letter/CompleteLetterGame.tsx src/games/complete-letter/completeLetterLogic.verify.ts e2e/bespoke-literacy.spec.ts
git commit -m "feat: rebuild missing-letter playfield" -m "A progressive inset rail makes active and pending blanks explicit while preserving settings-driven Slovak word rules."
```

### Task 5: Migrate Doplň slabiku to a felt inset word rail

**Files:**
- Modify: `src/games/complete-syllable/CompleteSyllableGame.tsx`
- Modify: `src/games/complete-syllable/completeSyllableLogic.verify.ts`
- Modify: `e2e/bespoke-literacy.spec.ts`

- [ ] **Step 1: Add failing Doplň slabiku tests**

For `/complete-syllable`, assert heading `Doplň slabiku`, visible instruction
`Doplň chýbajúcu slabiku`, picture card, one active inset in a word rail, four
felt answer pieces, and visible replay. Cover one wrong answer with visible/live
retry, one correct answer that fills the exact missing index before success, and
the three-wrong-attempt reveal/failure path.

- [ ] **Step 2: Run and confirm failure**

Run:

```bash
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Doplň slabiku"
```

Expected: FAIL against the legacy slot/card treatment.

- [ ] **Step 3: Recompose the unchanged round model**

Compose `GameShell`, `GamePrompt`, `PictureCard`, and `WordRail`. Render fixed
syllables and the one missing position with `InsetSlot`; render hyphen separators
visually with `aria-hidden="true"` so assistive text does not become noisy.
Render `buildSyllableChoices` through `AnswerGroup` as felt `TactilePiece`
buttons, each with its stable normalized symbol as `data-answer-id`. Delegate
terminal feedback and completion to `useGameSession`; remove
this game’s legacy overlay imports.

Keep `parseWordSyllables`, two-to-four-syllable eligibility, random missing
index, uppercase normalized comparison, four unique choices, five rounds, three
attempts, queue fallback, and lobby empty state unchanged. Correct selection
plays:

```ts
getItemAnnouncementAudio(locale, 'syllables', syllable.audioKey, syllable.symbol)
```

Wrong selection plays:

```ts
getWrongAnswerAudio(locale, 'syllables', syllable.audioKey, syllable.symbol)
```

Set the missing slot to filled before success or terminal failure feedback.

- [ ] **Step 4: Verify repeated syllables and keyboard behavior**

Retain verifier cases proving `MA-MA` can hide either position independently,
mixed-case content normalizes, empty split parts are removed, five-syllable
words are ineligible, and a pool with fewer than four choices is ineligible.
Run:

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Doplň slabiku"
npm run lint
```

Expected: pure and browser checks PASS; arrow navigation keeps one roving
tabstop and Enter/Space activates once.

- [ ] **Step 5: Commit Doplň slabiku**

```bash
git add src/games/complete-syllable/CompleteSyllableGame.tsx src/games/complete-syllable/completeSyllableLogic.verify.ts e2e/bespoke-literacy.spec.ts
git commit -m "feat: rebuild missing-syllable playfield" -m "Felt choices and an inset word rail expose the missing part clearly without changing syllable eligibility or attempts."
```

### Task 6: Migrate Skladaj while preserving its audio exception

**Files:**
- Modify: `src/games/assembly/AssemblyGame.tsx`
- Modify: `src/games/assembly/assemblyAudioLogic.ts`
- Modify: `src/games/assembly/assemblyAudioLogic.verify.ts`
- Modify: `e2e/bespoke-literacy.spec.ts`

- [ ] **Step 1: Add failing rail/reset/audio tests**

Add Skladaj cases that expose the correct and one incorrect tile order through
the test-only merged E2E oracle, then assert:

- picture card, visible `Usporiadaj slabiky`, replay, felt answer tray, and empty
  `WordRail` are present;
- tapping tray pieces fills the first open rail slot and tapping a placed piece
  returns that exact tile to its stable tray position;
- a correct full rail settles before success;
- a wrong full rail shows and announces `Skús ešte raz`, plays its special
  sequence once, then returns all tiles without counting a completed round;
- repeated syllables remain independently operable by stable tile ID.

- [ ] **Step 2: Write the failing explicit audio-decision verifier**

Import `getAssemblySelectionAudioDecision` in
`assemblyAudioLogic.verify.ts` and assert three exact cases: a non-final tile
returns `selected-now`, a correct final tile returns `selected-now`, and a wrong
final tile returns `defer-to-wrong-sequence` so the bespoke wrong sequence owns
it once. Keep the existing Boolean-helper assertions as compatibility coverage.

Run: `npx tsx src/games/assembly/assemblyAudioLogic.verify.ts`

Expected: FAIL because `getAssemblySelectionAudioDecision` is not exported.

- [ ] **Step 3: Implement the audio decision, then confirm only the UI fails**

Replace the Boolean-only seam with an explicit decision while retaining the
same exported helper name for callers:

```ts
export type AssemblySelectionAudio = 'selected-now' | 'defer-to-wrong-sequence';

export function getAssemblySelectionAudioDecision({
  placingLastTile,
  nextPlaced,
  correctSyllables,
}: SelectedSyllableAudioDecision): AssemblySelectionAudio {
  if (!placingLastTile) return 'selected-now';
  const correct = nextPlaced.every((tile, index) => tile?.text === correctSyllables[index]);
  return correct ? 'selected-now' : 'defer-to-wrong-sequence';
}

export function shouldPlaySelectedSyllableAudio(input: SelectedSyllableAudioDecision): boolean {
  return getAssemblySelectionAudioDecision(input) === 'selected-now';
}
```

```bash
npx tsx src/games/assembly/assemblyLogic.verify.ts
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Skladaj"
```

Expected: both pure verifiers PASS and the browser cases FAIL because the legacy
board does not use the Phase 5 shell/material semantics.

- [ ] **Step 4: Rebuild the board with shared shell and materials**

Compose `GameShell`, `GamePrompt`, and `PictureCard`. Render placed positions as
`InsetSlot` children of `WordRail`, and unplaced felt `TactilePiece` buttons in
`PlayTray`. Put the stable tile ID on every tray/rail action as `data-tile-id`.
Both tray and rail pieces are 48×48 or larger buttons. Use the Phase
5 composite keyboard rules separately for tray and occupied rail; after placing a piece,
move logical focus to the next available tray piece, and after returning one,
restore focus to that piece in the tray.

Replace raw GSAP setup with the Phase 5 motion adapter or a locally scoped GSAP
branch that checks the shared reduced-motion preference. Normal motion may fly a
clone between measured positions; reduced motion mutates the board immediately
and uses opacity only. Kill clones/tweens on pause, round change, lobby exit, and
unmount. Rotation must never reset board state or leave a clone at stale
coordinates.

Delegate successful full rails and fifth-round completion to `useGameSession`;
remove this game’s `SuccessOverlay` and `SessionCompleteOverlay` imports. Keep
two-to-three-syllable eligibility, shuffled word queue, five correct
rounds, `totalChecks`, no maximum attempts, placed-tile removal, and wrong-board
reset timing. Do not add `FailureOverlay`.

- [ ] **Step 5: Encode the Assembly exception at the audio call site**

For non-final and correct-final placements, play selected syllable audio. For a
wrong final placement, skip that immediate call and play exactly:

```ts
function getWrongAudio(locale: string, word: Word, selectedSyllable: string) {
  return {
    clips: [
      getItemAudioClip(locale, 'syllables', selectedSyllable.toLowerCase(), selectedSyllable),
      getPhraseClip(locale, 'retry'),
      getItemAudioClip(locale, 'words', word.audioKey, word.word),
    ],
  };
}
```

On a correct full rail, the selected syllable finishes before shared praise;
the existing success audio may then speak the completed word. Never play praise
before the selected syllable and never duplicate the wrong final syllable.

- [ ] **Step 6: Run focused regression and commit**

```bash
npx tsx src/games/assembly/assemblyLogic.verify.ts
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts -g "Skladaj"
npm run lint
```

Expected: all checks PASS, including correct/reset orders, duplicate syllables,
single-play wrong audio, reduced motion, and no stale floating nodes.

```bash
git add src/games/assembly e2e/bespoke-literacy.spec.ts
git commit -m "feat: rebuild assembly playfield" -m "A felt tray and word rail now share the game shell while preserving reversible placement and the documented wrong-answer audio sequence."
```

### Task 7: Close responsive, pause, focus, and announcement gaps across the cluster

**Files:**
- Modify: `e2e/bespoke-literacy.spec.ts`
- Modify: `e2e/playwright.config.ts`
- Modify: `e2e/support/gameHarness.ts`
- Modify: `tools/screenshots/capture.mjs`
- Modify: `src/games/first-letter/FirstLetterGame.tsx`
- Modify: `src/games/complete-letter/CompleteLetterGame.tsx`
- Modify: `src/games/complete-syllable/CompleteSyllableGame.tsx`
- Modify: `src/games/assembly/AssemblyGame.tsx`
- Modify: `src/shared/game/materials/PictureCard.tsx`
- Modify: `src/shared/game/materials/WordRail.tsx`
- Modify: `src/shared/game/materials/InsetSlot.tsx`

- [ ] **Step 1: Add the complete responsive matrix test**

Iterate `CANONICAL_VIEWPORTS` from `e2e/support/viewports.ts` for all four paths.
At each size, enter play and call `expectNoHorizontalOverflow`, assert the
picture/prompt/answers intersect the viewport, and assert all interactive child
controls are at least 48×48. Child playfields may compress or vertically scroll
inside the bounded shell, but the current answer region, replay, progress, and
back action must not be clipped.

Use the full approved matrix: 320×568, 360×640, 390×844, 667×375, 844×390,
768×1024, 1024×768, 1280×900, 1440×900, and 1920×1080. Keep the regular CI
project subset to 320×568, 667×375, 768×1024, and 1280×900; screenshot review
covers every size.

- [ ] **Step 2: Add pause/rotation/focus tests**

For every game, select at least one answer or place one Assembly tile, open the
parent dialog through the Phase 5 shell control, and assert audio/timers/input
do not advance. Close it and assert route, round, progress, fitted/placed state,
and focus target are restored. Resize portrait to landscape mid-round and assert
the same state plus no clipping. Press Escape only where the inherited parent
dialog contract permits it; do not add game-local dialog handling.

- [ ] **Step 3: Add assistive and reduced-motion checks**

Assert one `main`, one game heading, visible prompt text, replay, progress label,
roving tabstop per answer group, visible/live retry, visible/live correct state,
and completion focus. Emulate `prefers-reduced-motion: reduce`; assert no
infinite animation, no translational tile flight, immediate logical settlement,
and no delayed input lock beyond duplicate-event prevention.

Extend `gameHarness.ts` to record audio clip paths in test mode and to wait for
the inherited session phase without arbitrary sleeps. Register `first-letter`,
`complete-letter`, `complete-syllable`, and `assembly` lobby/round/retry/success/
failure/completion scenes in `tools/screenshots/capture.mjs`; protected setup
continues to use the Phase 1 gate adapter, and game setup interacts through the
real **Hrať** and answer controls.

- [ ] **Step 4: Run the cluster suite and fix only Phase 6 regressions**

```bash
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/bespoke-literacy.spec.ts
npm run lint
```

Expected: PASS in every configured Phase 6 project with no console errors,
failed requests, clipping, undersized targets, lost state, or duplicate audio
events.

- [ ] **Step 5: Commit cluster hardening**

```bash
git add e2e/bespoke-literacy.spec.ts e2e/playwright.config.ts e2e/support/gameHarness.ts tools/screenshots/capture.mjs src/games/first-letter/FirstLetterGame.tsx src/games/complete-letter/CompleteLetterGame.tsx src/games/complete-syllable/CompleteSyllableGame.tsx src/games/assembly/AssemblyGame.tsx src/shared/game/materials/PictureCard.tsx src/shared/game/materials/WordRail.tsx src/shared/game/materials/InsetSlot.tsx
git commit -m "test: harden bespoke literacy playfields" -m "Canonical viewports, keyboard input, pause restoration, and reduced motion now protect the complete literacy cluster."
```

### Task 8: Complete Phase 6 verification and handoff

**Files:**
- Modify: `ROADMAP.md`
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-06.md`

- [ ] **Step 1: Run all affected pure checks**

```bash
npx tsx src/shared/game/gameState.verify.ts
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
npx tsx src/games/assembly/assemblyLogic.verify.ts
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
npm run lint
```

Expected: every verifier prints its success line; TypeScript and ESLint are
clean apart from the repository's documented pre-existing ContentContext
react-refresh warning.

- [ ] **Step 2: Run application regression checks**

```bash
npm run test:e2e
npm run build
git diff --check
rg "SuccessOverlay|FailureOverlay|SessionCompleteOverlay" src/games
rg "shared/game" src/games/first-letter src/games/complete-letter src/games/complete-syllable src/games/assembly
```

Expected: the complete Playwright suite passes with no console/request failures,
the production build emits separate lazy game chunks with avatar/three.js still
isolated, and the diff has no whitespace errors. The legacy-overlay search lists
only the three Phase 7 numeracy games, while all four literacy directories import
the canonical shared game framework. Do not run `npm run test:audio` unless an
audio key or asset changed; this plan requires neither.

- [ ] **Step 3: Capture and review the full visual matrix**

With the test-mode preview running at `127.0.0.1:4173`, execute:

```bash
npm run shots -- --base=http://127.0.0.1:4173 --scene=first-letter --scene=complete-letter --scene=complete-syllable --scene=assembly
```

Review all ten canonical viewport captures for hierarchy, prompt/answer balance,
short-landscape fit, long `CH`/`DŽ` and syllable content, active/pending/filled
insets, two- and three-piece rails, visible feedback, safe areas, and absence of
mixed legacy surfaces. Capture additional states for wrong retry, correct
settlement, Assembly reset, session completion, and reduced motion.

- [ ] **Step 4: Verify persistence and audio compatibility explicitly**

Run the Phase 1 persistence compatibility suite and load fixtures containing
`alphabetAccents` and `completeLetterMissingCount`. Confirm the exact existing
localStorage keys, IndexedDB database/store names, custom content envelopes,
recorded-audio keys, and PWA metadata remain unchanged. In a test-mode trace,
confirm these sequences:

```text
FIRST_LETTER correct: selected letter -> praise
FIRST_LETTER wrong: selected letter -> retry
COMPLETE_LETTER correct: each selected letter -> final praise
COMPLETE_LETTER wrong: selected letter -> retry
COMPLETE_SYLLABLE correct: selected syllable -> praise
COMPLETE_SYLLABLE wrong: selected syllable -> retry
ASSEMBLY wrong full rail: wrong final syllable -> retry -> target word
```

- [ ] **Step 5: Update roadmap, write the manifest, commit, and stop**

Record the accepted Phase 5 base SHA, every Phase 6 commit SHA, final clean
status, commands/outcomes, screenshot locations, reviewer result, unchanged
storage/audio contracts, known risks, and exact Phase 7 preconditions in
`docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-06.md`.

```bash
git add ROADMAP.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-06.md
git commit -m "docs: hand off UI redesign phase six" -m "Verified bespoke literacy playfields give the numeracy migration a stable shell, material, and accessibility baseline."
```

Do not begin Phase 7.
