# UI Redesign Phase 5: Shared Game Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce the shared responsive game state, shell, prompt, answer-group, feedback/completion, and tactile-material contracts, then migrate Abeceda, Slabiky, Čísla, and Slová without changing their learning rules, content pools, settings, persistence, or answer-audio ordering.

**Architecture:** A pure reducer in `src/shared/game/gameState.ts` owns lifecycle, attempts, progress, pause, feedback, completion, and recovery; `useGameSession.ts` coordinates cancellable timers and ordered audio around it. `GameShell`, `GamePrompt`, and `AnswerGroup` provide one accessible width-and-height-aware round composition, while `TactilePiece` and `PlayTray` establish the Living Toybox vocabulary inherited by Phases 6 and 7. The existing shared `FindItGame` migrates in place so its four callers retain their descriptors and lobby boundaries.

**Tech Stack:** React 19, TypeScript, React Router 7, Tailwind CSS 4, Motion, Phase 2 UI primitives, Phase 3 game catalog, Phase 4 content/settings contexts, Playwright.

---

## Required context and phase boundary

Start from the accepted Phase 4 SHA on `feature/full-app-ui-redesign`. Confirm a
clean worktree, then read `AGENTS.md`,
`docs/superpowers/specs/2026-09-14-full-app-ui-redesign-design.md`, all
accepted Phase 1–4 handoff manifests, and:

- `src/shared/components/FindItGame.tsx`
- `src/shared/components/{SuccessOverlay,FailureOverlay,SessionCompleteOverlay,AuditoryPromptBadge}.tsx`
- `src/shared/components/{successOverlayAudio,sessionCompleteAudio}.ts`
- `src/shared/services/{audioManager,e2eState}.ts`
- `src/shared/types.ts`, `src/shared/gameCatalog.tsx`
- `src/shared/ui/{AppScreen,ChoiceTile,OverlayFrame,RoundCounter,UiKitScreen}.tsx`
- all files under `src/games/{alphabet,syllables,numbers,words}/`
- `e2e/find-it-games.spec.ts`
- `e2e/support/{assertions,e2eHook,layoutAssertions}.ts`

Use Phase 2 controls/tokens/motion, Phase 3 catalog/lobbies, and Phase 4
content/settings contracts. Do not introduce an alternate framework directory,
a second button/focus API, another catalog, or route-specific viewport branches.
Do not change parent routes, home, lobbies, persistence, audio assets/keys, or a
bespoke game. Keep legacy overlays because seven bespoke games still need them.

Preserve these contracts exactly:

- five rounds by default and three wrong attempts per round;
- an exhausted round increments rounds played but not correct rounds;
- one target per unique-ID answer set;
- selected correct item audio precedes praise and any success echo;
- selected wrong item audio precedes the shared retry phrase on every wrong tap,
  including tap three; only then may the correct-answer explanation play;
- Abeceda, Slabiky, and Čísla retain their audio-first opening prompts;
- Slová retains the visible syllabified word, shared find opening prompt, and
  target word clip for explicit replay;
- opening prompt playback does not block answers, but one resolving answer locks
  duplicate taps;
- pools, shuffled target queue, grid sizes, settings, echo lines, and empty-pool
  behavior do not change;
- Assembly's audio exception and all bespoke rules remain untouched.

## Public file map

| Path | Responsibility |
|---|---|
| `src/shared/game/gameState.ts` | Pure lifecycle, attempts, progress, pause, feedback, completion, and error transitions |
| `src/shared/game/gameState.verify.ts` | Executable reducer invariants |
| `src/shared/game/useGameSession.ts` | React reducer adapter, cancellation, ordered audio, replay, pause, and continuation |
| `src/shared/game/GameShell.tsx` | One landmark/title/progress layout, live feedback, pause inertness, recovery, and completion |
| `src/shared/game/GamePrompt.tsx` | Visible instruction, optional visual prompt, and replay |
| `src/shared/game/AnswerGroup.tsx` | Measured grid geometry and composite keyboard behavior |
| `src/shared/game/useElementSize.ts` | Shared ResizeObserver measurement with zero-size initial state and cleanup |
| `src/shared/game/materials/TactilePiece.tsx` | Named materials and visible answer states |
| `src/shared/game/materials/PlayTray.tsx` | Bounded responsive play surface |
| `src/shared/game/materials/index.ts` | Material exports |
| `src/shared/game/index.ts` | Stable public API for Phases 6 and 7 |
| `e2e/game-shell.spec.ts` | Shell, material, responsive, input, pause, feedback, completion, and motion acceptance |
| `e2e/support/gameHarness.ts` | Shared phase/oracle/audio waits that always activate visible controls |

### Task 1: Define the pure game lifecycle

**Files:**
- Create: `src/shared/game/gameState.ts`
- Create: `src/shared/game/gameState.verify.ts`

- [ ] **Step 1: Write the failing lifecycle verifier**

```ts
import { canAcceptAnswer, createGameState, gameStateReducer } from './gameState';

let state = createGameState({ maxRounds: 5, maxAttempts: 3 });
if (state.phase !== 'ready' || state.roundsPlayed !== 0 || state.totalTaps !== 0) throw new Error('bad initial state');
state = gameStateReducer(state, { type: 'PROMPT_STARTED' });
if (state.phase !== 'listening' || !canAcceptAnswer(state)) throw new Error('opening audio must remain answerable');
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'B' });
if (canAcceptAnswer(state) || state.selectedAnswerId !== 'B') throw new Error('answer in flight must lock taps');
state = gameStateReducer(state, { type: 'ANSWER_WRONG' });
if (state.phase !== 'answered-incorrectly' || state.wrongAttempts !== 1 || state.totalTaps !== 1) throw new Error('bad retry');
state = gameStateReducer(state, { type: 'RETRY_READY' });
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'C' });
state = gameStateReducer(state, { type: 'ANSWER_WRONG' });
state = gameStateReducer(state, { type: 'RETRY_READY' });
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'D' });
state = gameStateReducer(state, { type: 'ANSWER_WRONG' });
if (state.feedback !== 'failure' || state.roundsPlayed !== 1 || state.correctRounds !== 0) throw new Error('bad exhaustion');
state = gameStateReducer(state, { type: 'NEXT_ROUND' });
state = gameStateReducer(state, { type: 'ANSWER_STARTED', answerId: 'A' });
state = gameStateReducer(state, { type: 'ANSWER_CORRECT' });
if (state.feedback !== 'success' || state.roundsPlayed !== 2 || state.correctRounds !== 1) throw new Error('bad success');
const phase = state.phase;
state = gameStateReducer(state, { type: 'PAUSE' });
if (!state.paused || canAcceptAnswer(state)) throw new Error('pause must block input');
state = gameStateReducer(state, { type: 'RESUME' });
if (state.paused || state.phase !== phase) throw new Error('resume lost phase');
state = gameStateReducer(state, { type: 'ERROR', message: 'Obsah sa nepodarilo načítať.' });
if (state.phase !== 'recoverable-error' || !state.errorMessage) throw new Error('error missing');
state = gameStateReducer(state, { type: 'PLAY_AGAIN' });
if (state.phase !== 'ready' || state.roundsPlayed !== 0 || state.totalTaps !== 0) throw new Error('reset failed');
console.log('✓ shared game state contract passed');
```

In the same verifier, create a state with `maxAttempts: null`: assert
`ANSWER_PROGRESS` with `countTap: false` returns to awaiting-answer without
changing totals, and assert five consecutive wrong resolutions never produce
failure or increment `roundsPlayed`. Repeat progress with default `countTap` and
assert it increments `totalTaps` exactly once.

- [ ] **Step 2: Run it and confirm the intended failure**

Run: `npx tsx src/shared/game/gameState.verify.ts`

Expected: FAIL with `Cannot find module './gameState'`.

- [ ] **Step 3: Implement the exact state contract**

```ts
export type GamePhase = 'loading' | 'ready' | 'listening' | 'awaiting-answer'
  | 'resolving-answer' | 'answered-incorrectly' | 'answered-correctly'
  | 'transitioning' | 'session-complete' | 'recoverable-error';
export type GameFeedback = 'success' | 'failure' | null;

export interface GameState {
  phase: GamePhase;
  resumePhase: GamePhase | null;
  paused: boolean;
  maxRounds: number;
  maxAttempts: number | null;
  wrongAttempts: number;
  roundsPlayed: number;
  correctRounds: number;
  totalTaps: number;
  selectedAnswerId: string | null;
  feedback: GameFeedback;
  errorMessage: string | null;
}

export type GameEvent =
  | { type: 'LOAD' } | { type: 'ROUND_READY' } | { type: 'PROMPT_STARTED' }
  | { type: 'PROMPT_FINISHED' } | { type: 'ANSWER_STARTED'; answerId: string }
  | { type: 'ANSWER_PROGRESS'; countTap?: boolean }
  | { type: 'ANSWER_WRONG'; countTap?: boolean }
  | { type: 'ANSWER_CORRECT'; countTap?: boolean }
  | { type: 'RETRY_READY' } | { type: 'NEXT_ROUND' }
  | { type: 'SHOW_SESSION_COMPLETE' } | { type: 'PLAY_AGAIN' }
  | { type: 'PAUSE' } | { type: 'RESUME' }
  | { type: 'ERROR'; message: string };
```

`createGameState` accepts `maxAttempts: number | null` and returns ready with
zero totals. `null` means an uncapped self-correcting mechanic. Implement an exhaustive switch.
`ANSWER_STARTED` works only from ready/listening/awaiting-answer. `ANSWER_WRONG`
increments taps unless `countTap` is false, increments attempts, produces inline
retry below the limit, and at the numeric limit sets failure plus
`roundsPlayed + 1`; a `null` limit never exhausts. `ANSWER_PROGRESS` optionally
increments taps, clears the selected answer, and returns to awaiting-answer
without changing the round. `ANSWER_CORRECT` increments taps unless suppressed,
rounds, correct rounds, and success. `NEXT_ROUND` preserves totals but resets
round-local fields. Pause stores/restores the phase. Play again recreates initial
state with the same limits. Invalid transitions return the same object.
`canAcceptAnswer` requires not paused and ready/listening/awaiting-answer.

- [ ] **Step 4: Verify and commit**

Run: `npx tsx src/shared/game/gameState.verify.ts`

Expected: `✓ shared game state contract passed`.

Run: `npm run lint`

Expected: PASS with no new warning beyond the documented `ContentContext.tsx` warning.

```bash
git add src/shared/game/gameState.ts src/shared/game/gameState.verify.ts
git commit -m "feat: define shared game lifecycle" -m "A verified reducer gives every migrated game one attempt, progress, pause, feedback, completion, and recovery contract."
```

### Task 2: Build the cancellable session and audio coordinator

**Files:**
- Create: `src/shared/game/useGameSession.ts`
- Modify: `src/shared/services/e2eState.ts`
- Create: `e2e/game-shell.spec.ts`
- Create: `e2e/support/gameHarness.ts`

- [ ] **Step 1: Write failing ordered-audio browser tests**

Add a test-mode audio observer and assert logical clip order rather than time:

```ts
test('selection audio finishes before verdict audio', async ({ page }) => {
  await page.goto('/alphabet');
  await page.getByRole('button', { name: 'Hrať' }).click();
  const state = await getE2EState<FindItE2EState>(page);
  const wrong = state.gridItemIds.find(id => id !== state.correctItemId)!;
  await page.locator(`[data-answer-id="${wrong}"]`).click();
  await expect.poll(() => getAudioEvents(page)).toEqual([
    `start:${wrong}`, `finish:${wrong}`, 'start:retry', 'finish:retry',
  ]);
});
```

Define the reusable helper in `e2e/support/gameHarness.ts`:

```ts
async function getAudioEvents(page: Page): Promise<string[]> {
  return page.evaluate(() => window.__E2E__?.audioEvents ?? []);
}
```

Also export `readGamePhase(page)`, `waitForGamePhase(page, phase)`, and
`pressAnswerById(page, id)`. The last helper clicks a visible
`[data-answer-id]`; the harness may read oracle data but must never invoke a
React handler inside `page.evaluate`.

Add correct item → praise and third wrong item → retry → correct-answer
explanation assertions. Extend the existing test-mode audio adapter at the
`audioManager` boundary; production playback is unchanged.

- [ ] **Step 2: Run and confirm failure**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts -g "audio"`

Expected: FAIL because the observer/session contract is absent and final-wrong ordering is not enforced.

- [ ] **Step 3: Implement the reusable hook API**

```ts
export interface ResolveAnswerInput {
  answerId: string;
  outcome: 'progress' | 'wrong' | 'correct';
  countTap?: boolean;
  selectionAudio: AudioSpec;
  verdictAudio?: AudioSpec;
}
export interface UseGameSessionOptions {
  maxRounds?: number;
  maxAttempts?: number | null;
  onNextRound(): void;
  onPlayAgain(): void;
}
export type AnswerResolution = 'progress' | 'retry' | 'failure' | 'success' | 'cancelled';
export interface UseGameSessionResult {
  state: GameState;
  canAnswer: boolean;
  replaying: boolean;
  startPrompt(audio: AudioSpec): Promise<void>;
  replayPrompt(audio: AudioSpec): Promise<void>;
  resolveAnswer(input: ResolveAnswerInput): Promise<AnswerResolution>;
  continueAfterFeedback(): void;
  playAgain(): void;
  pause(): void;
  resume(): void;
  fail(message: string): void;
}
```

Use `useReducer`, a monotonic operation ID, and a timer set. Prompt, answer,
pause, replay, new round, reset, error, and unmount invalidate stale work.
`resolveAnswer` dispatches `ANSWER_STARTED`, awaits selection audio, ignores stale
completion, dispatches progress/correct/wrong with `countTap`, then plays optional
verdict audio only for `success` or terminal `failure` (never for progress or an
ordinary retry). It returns the actual resolution so bespoke games can distinguish
retry from exhaustion without duplicating attempt math. Below the wrong limit,
schedule `RETRY_READY` after `TIMING.FEEDBACK_RESET_MS`; at the limit, play
failure verdict only after the full wrong-item-plus-retry selection spec. A
progress outcome immediately returns to awaiting-answer after audio and never
changes the round. After a terminal result reaches `maxRounds`, finish its audio
and dispatch `SHOW_SESSION_COMPLETE` automatically; do not require an extra
Continue click. `continueAfterFeedback` advances non-final feedback only. Keep FindIt
queue/descriptor/JSX/locale knowledge out of the hook.

- [ ] **Step 4: Publish the test-only observer safely**

Record logical start/finish events only in Vite test mode and expose them through
the existing merge-based E2E state. Never assign `window.__E2E__`, expose the
observer in production, or erase the parent-gate adapter.

- [ ] **Step 5: Verify and commit**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts -g "audio"`

Expected: ordered success, retry, and exhausted-answer tests PASS.

Run: `npm run lint`

Expected: PASS.

```bash
git add src/shared/game/useGameSession.ts src/shared/services/e2eState.ts e2e/game-shell.spec.ts e2e/support/gameHarness.ts
git commit -m "fix: serialize game answer audio" -m "Cancellable session coordination preserves item-before-verdict ordering, including the final wrong attempt."
```

### Task 3: Build the shared shell, visible prompt, and answer group

**Files:**
- Create: `src/shared/game/GameShell.tsx`
- Create: `src/shared/game/GamePrompt.tsx`
- Create: `src/shared/game/AnswerGroup.tsx`
- Create: `src/shared/game/useElementSize.ts`
- Create: `src/shared/game/index.ts`
- Modify: `src/shared/ui/RoundCounter.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `src/shared/uiCopy.ts`
- Modify: `src/shared/uiCopy.verify.ts`
- Modify: `e2e/game-shell.spec.ts`

- [ ] **Step 1: Write failing shell/keyboard tests**

```ts
test('shared shell exposes the complete round contract', async ({ page }) => {
  await page.goto('/ui-kit?example=game-shell');
  await expect(page.getByRole('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1, name: 'Abeceda' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Postup v hre' })).toHaveAttribute('aria-valuenow', '1');
  await expect(page.getByText('Nájdi písmeno, ktoré počuješ.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zopakovať zadanie' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Možnosti odpovede' })).toBeVisible();
});
test('answer group uses one tab stop and spatial arrows', async ({ page }) => {
  await page.goto('/ui-kit?example=game-shell');
  const first = page.getByRole('button', { name: 'Písmeno A' });
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('button', { name: 'Písmeno B' })).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('button', { name: 'Písmeno D' })).toBeFocused();
});
```

Also add failing retry live-region, recoverable error, pause inertness,
success/failure status, explicit completion, and focus-restoration cases.

- [ ] **Step 2: Run and confirm failure**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts -g "shared shell|answer group"`

Expected: FAIL because the example/components do not exist.

- [ ] **Step 3: Implement `GamePrompt`**

```tsx
export interface GamePromptProps {
  instruction: string;
  visual?: React.ReactNode;
  replaying?: boolean;
  onReplay(): void;
}
```

Render a labelled section with always-visible instruction text, optional visual
content, and a Phase 2 native child-size Button named **Zopakovať zadanie**.
Put `data-testid="game-visible-instruction"` on the instruction element.
Replay feedback is finite and opacity-only under reduced motion.

- [ ] **Step 4: Implement `AnswerGroup`**

```tsx
export interface AnswerGroupProps {
  label: string;
  disabled?: boolean;
  orientation?: 'grid' | 'horizontal';
  children: React.ReactNode;
  className?: string;
}
```

Create `useElementSize(ref)` in its own module: observe the element with
`ResizeObserver`, return `{ width: 0, height: 0 }` before measurement, update only
when either dimension changes, and disconnect on cleanup. Render `role="group"`
with `data-testid="game-answer-region"` and measure only its container with that hook.
Evaluate column counts `1..itemCount`, compute rows and square size fitting width
and height after gaps, choose the largest cell, and break ties toward fewer rows
below 420px height. Apply geometry through CSS variables. Never shrink an
interactive target below 48×48; compact shell gaps before scrolling. Implement
roving `tabIndex`, Arrow/Home/End movement, native Enter/Space activation, and
disabled-button skipping. Resize without replacing children or focus.

- [ ] **Step 5: Implement `GameShell` including feedback/completion**

```tsx
export interface GameShellFeedback {
  kind: 'retry' | 'success' | 'failure';
  title: string;
  detail?: string;
  onContinue?: () => void;
}
export interface GameShellCompletion {
  praise: PraiseEntry;
  correctRounds: number;
  totalTaps: number;
  maxRounds: number;
  onPlayAgain(): void;
  onHome(): void;
}
export interface GameShellProps {
  gameId: GameId;
  state: GameState;
  onBack(): void;
  prompt: React.ReactNode;
  feedback?: GameShellFeedback | null;
  completion?: GameShellCompletion | null;
  onRetryError?: () => void;
  children: React.ReactNode;
}
```

Resolve title from the Phase 3 catalog. Compose Phase 2 `AppScreen`,
`PageHeader`, `RoundCounter`, Button, `OverlayFrame`, and motion presets. Render
one `main` and `h1`; expose round `min(roundsPlayed + 1, maxRounds)` as a labelled
progressbar. Inline retry is visible and polite. Finite success/failure statuses
lock answers and expose **Pokračovať** when timing/audio resolve for a non-final
round. A final result transitions directly to completion. Completion
stays indefinitely with textual stars/result and **Hrať znova**/**Domov**.
Recoverable error shows message, **Skúsiť znova**, and **Domov**. Paused content
is inert while the hook stops work and later restores state/focus. Mark the
smallest containers holding Back, progress, replay, and answer/completion actions
with `data-testid="game-critical-controls"` so shared layout assertions never
depend on visual class names.

- [ ] **Step 6: Add exact copy/UI-kit states and verify**

Add Slovak/fallback keys for replay, answer group, continue, play again, home,
retry error, retry/failure/completion messages; assert every key in
`uiCopy.verify.ts`. Document audio-only/visual prompts and ready, listening,
retry, success, failure, paused, error, completion, reduced-motion, 320×568, and
667×375 states.

Run: `npx tsx src/shared/uiCopy.verify.ts`

Expected: PASS.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts -g "shared shell|answer group|completion|pause"`

Expected: shell, keyboard, feedback, completion, error, and pause cases PASS.

```bash
git add src/shared/game/GameShell.tsx src/shared/game/GamePrompt.tsx src/shared/game/AnswerGroup.tsx src/shared/game/useElementSize.ts src/shared/game/index.ts src/shared/ui/RoundCounter.tsx src/shared/ui/UiKitScreen.tsx src/shared/uiCopy.ts src/shared/uiCopy.verify.ts e2e/game-shell.spec.ts
git commit -m "feat: build accessible game shell" -m "One responsive composition now owns visible prompts, progress, answer navigation, pause, feedback, recovery, and completion."
```

### Task 4: Establish the Living Toybox material vocabulary

**Files:**
- Create: `src/shared/game/materials/TactilePiece.tsx`
- Create: `src/shared/game/materials/PlayTray.tsx`
- Create: `src/shared/game/materials/index.ts`
- Modify: `src/shared/game/index.ts`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `e2e/game-shell.spec.ts`

- [ ] **Step 1: Write failing material tests**

```ts
test('base materials expose meaning without color or motion', async ({ page }) => {
  await page.goto('/ui-kit?example=game-materials');
  const region = page.getByRole('region', { name: 'Materiály hier' });
  for (const material of ['wood', 'magnet', 'felt', 'picture', 'counter', 'paper']) {
    await expect(region.locator(`[data-material="${material}"]`).first()).toBeVisible();
  }
  await expect(region.getByRole('button', { name: 'Písmeno A' })).toHaveAttribute('data-piece-state', 'settled');
  await expect(region.getByRole('button', { name: 'Písmeno B' })).toContainText('Skús ešte raz');
  await expect(region.getByTestId('play-tray')).toBeVisible();
});
```

Also assert 48×48, focus, disabled semantics, reduced motion, and no serious or
critical axe violations.

- [ ] **Step 2: Run and confirm failure**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts -g "base materials"`

Expected: FAIL because material exports/examples do not exist.

- [ ] **Step 3: Implement `TactilePiece`**

```tsx
export type TactileMaterial = 'wood' | 'magnet' | 'felt' | 'picture' | 'counter' | 'paper';
export type TactilePieceState = 'idle' | 'pressed' | 'retry' | 'settled' | 'disabled';
export interface TactilePieceProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'span' | 'button';
  material: TactileMaterial;
  state?: TactilePieceState;
  label?: string;
  disabled?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
}
```

Default `span` is noninteractive. `as="button"` requires a label, renders native
`type="button"`, meets 48×48, and invokes `onPress` once. CVA variants express
wood block edge, magnet rim, felt border, picture card, counter token, and paper
sticker using semantic tokens. Retry/settled include visible icon and state text;
press motion uses Phase 2 presets and opacity-only reduced motion.

- [ ] **Step 4: Implement `PlayTray` and exports**

```tsx
export interface PlayTrayProps extends React.HTMLAttributes<HTMLElement> {
  label: string;
  density?: 'comfortable' | 'compact';
  children: React.ReactNode;
}
```

Render a labelled `section` with `data-testid="play-tray"`, semantic inset
surface, container ownership, `min-h-0`, and decorative clipping only after
child measurement. Compact density reduces gaps/padding, never targets or
capability. Export types/components from both index files.

- [ ] **Step 5: Verify and commit**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts -g "base materials"`

Expected: PASS at narrow phone, short landscape, tablet, and desktop.

```bash
git add src/shared/game/materials/TactilePiece.tsx src/shared/game/materials/PlayTray.tsx src/shared/game/materials/index.ts src/shared/game/index.ts src/shared/ui/UiKitScreen.tsx e2e/game-shell.spec.ts
git commit -m "feat: add Living Toybox materials" -m "Typed tactile pieces and trays provide a shared physical vocabulary without unrelated game themes."
```

### Task 5: Migrate the shared FindIt loop in place

**Files:**
- Modify: `src/shared/components/FindItGame.tsx`
- Modify: `src/shared/types.ts`
- Modify: `src/shared/services/e2eState.ts`
- Modify: `e2e/find-it-games.spec.ts`
- Modify: `e2e/game-shell.spec.ts`

- [ ] **Step 1: Strengthen FindIt tests before refactoring**

Extend the oracle without renaming existing fields:

```ts
interface FindItE2EState extends E2EGlobalState {
  gameId: 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'WORDS';
  phase: GamePhase;
  correctItemId: string | null;
  gridItemIds: string[];
  wrongAttempts: number;
  roundsPlayed: number;
  replaying: boolean;
}
```

For all four games assert one target, unique IDs, configured answer count,
answer availability during opening audio, correct→success, wrong one/two→retry,
wrong three→failure, exhausted-round score, and representative five-round
completion. Assert completion remains after 5.5 seconds with both actions.

- [ ] **Step 2: Run and record expected failures**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/find-it-games.spec.ts e2e/game-shell.spec.ts`

Expected: legacy flow cases PASS; new shell, oracle, final-wrong order, keyboard,
and explicit completion cases FAIL.

- [ ] **Step 3: Extend `GameDescriptor` only with semantic presentation**

Keep it in `src/shared/types.ts` and retain all callbacks. Remove raw `gridCols`;
add `getAccessibleLabel(item): string`, `material: 'wood' | 'magnet' | 'picture'`,
and `instruction: string`. Do not rename render/audio/spec callbacks or move
round/audio construction into descriptors.

- [ ] **Step 4: Replace local lifecycle state with `useGameSession`**

Keep the current shuffled queue and `buildGrid`, including pool-size capping and
target injection. Add a development invariant for unique IDs/one target. Replace
independent overlay/attempt/score booleans with the hook. Schedule opening prompt
after `TIMING.AUDIO_DELAY_MS`. Pass outcome `correct` with
`getCorrectAudio(selected)` or outcome `wrong` with
`getWrongAudio(target, selected)` as selection audio. Build success verdict with
`getSuccessOverlayAudioSpec`; use failure spec audio only as the exhausted
verdict. Pick praise once per transition so visible and spoken praise match.

- [ ] **Step 5: Compose the canonical framework**

```tsx
<GameShell gameId={gameId} state={session.state} onBack={onExit}
  prompt={<GamePrompt instruction={descriptor.instruction}
    visual={targetItem ? descriptor.renderPrompt(targetItem) : null}
    replaying={session.replaying}
    onReplay={() => targetItem && void session.replayPrompt(descriptor.getReplayAudio?.(targetItem) ?? descriptor.getPromptAudio(targetItem))} />}
  feedback={feedback} completion={completion}>
  <PlayTray label="Hracia plocha">
    <AnswerGroup label="Možnosti odpovede" disabled={!session.canAnswer}>
      {gridItems.map(item => <TactilePiece key={descriptor.getItemId(item)} as="button"
        material={descriptor.material} label={descriptor.getAccessibleLabel(item)}
        data-answer-id={descriptor.getItemId(item)}
        state={answerStates[descriptor.getItemId(item)] ?? 'idle'}
        onPress={() => void chooseAnswer(item)}>{descriptor.renderCard(item)}</TactilePiece>)}
    </AnswerGroup>
  </PlayTray>
</GameShell>
```

Render empty-pool recovery through `GameShell`; retry re-reads the pool and home
returns to lobby. On transition to `session-complete`, play
`getSessionCompleteAudioSpec(locale, praise)` once and invalidate it on reset,
home, pause, or unmount. Publish the oracle via merge-based `setE2EState`.

- [ ] **Step 6: Remove only superseded local presentation and verify**

Remove direct `AuditoryPromptBadge`, `AppScreen`/`TopBar`/`ChoiceTile`, viewport
listener, local observer, and direct legacy overlay imports from `FindItGame`.
Do not delete those shared files.

Run: `npx tsx src/shared/game/gameState.verify.ts`

Expected: PASS.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/find-it-games.spec.ts e2e/game-shell.spec.ts`

Expected: state, oracle, audio, shell, retry, failure, completion, and five-round cases PASS.

- [ ] **Step 7: Commit the controller migration**

```bash
git add src/shared/components/FindItGame.tsx src/shared/types.ts src/shared/services/e2eState.ts e2e/find-it-games.spec.ts e2e/game-shell.spec.ts
git commit -m "refactor: run FindIt through shared game session" -m "The four-game controller delegates lifecycle and presentation while retaining its queue, content, and audio specifications."
```

### Task 6: Migrate the four FindIt games to semantic materials

**Files:**
- Modify: `src/games/alphabet/AlphabetGame.tsx`
- Modify: `src/games/alphabet/alphabetDescriptor.tsx`
- Modify: `src/games/syllables/SyllablesGame.tsx`
- Modify: `src/games/syllables/syllablesDescriptor.tsx`
- Modify: `src/games/numbers/NumbersGame.tsx`
- Modify: `src/games/numbers/numbersDescriptor.tsx`
- Modify: `src/games/words/WordsGame.tsx`
- Modify: `src/games/words/wordsDescriptor.tsx`
- Modify: `e2e/find-it-games.spec.ts`

- [ ] **Step 1: Add failing per-game assertions**

```ts
const EXPECTED = [
  { path: '/alphabet', title: 'Abeceda', instruction: 'Nájdi písmeno, ktoré počuješ.', material: 'wood' },
  { path: '/syllables', title: 'Slabiky', instruction: 'Nájdi slabiku, ktorú počuješ.', material: 'magnet' },
  { path: '/numbers', title: 'Čísla', instruction: 'Nájdi číslo, ktoré počuješ.', material: 'wood' },
  { path: '/words', title: 'Slová', instruction: 'Nájdi obrázok k slovu.', material: 'picture' },
] as const;
```

For each route assert h1, instruction, replay, answer group, and material; for
Slová also assert the uppercase syllabified target remains visible.

- [ ] **Step 2: Run and confirm failure**

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/find-it-games.spec.ts -g "shared shell and material"`

Expected: FAIL because game IDs and descriptor fields are absent.

- [ ] **Step 3: Pass stable IDs without changing lobby behavior**

Pass `gameId="ALPHABET"`, `SYLLABLES`, `NUMBERS`, or `WORDS` to `FindItGame` in
each PLAYING branch. Keep Phase 3 runtime props, memoization, filtering,
availability, settings links, and HOME/PLAYING boundaries unchanged.

- [ ] **Step 4: Add exact descriptor fields**

```ts
// alphabet
material: 'wood', instruction: 'Nájdi písmeno, ktoré počuješ.',
getAccessibleLabel: item => `Písmeno ${item.symbol}`,
// syllables
material: 'magnet', instruction: 'Nájdi slabiku, ktorú počuješ.',
getAccessibleLabel: item => `Slabika ${item.symbol}`,
// numbers
material: 'wood', instruction: 'Nájdi číslo, ktoré počuješ.',
getAccessibleLabel: item => `Číslo ${item.value}`,
// words
material: 'picture', instruction: 'Nájdi obrázok k slovu.',
getAccessibleLabel: item => `${item.word}, ${item.syllables}`,
```

Leave all grid sizes, pools, IDs, render functions, clip paths/fallbacks,
prompt/replay differences, correct/wrong audio, and echo/explanation specs unchanged.

- [ ] **Step 5: Verify and commit**

Run: `npm run lint`

Expected: PASS.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/find-it-games.spec.ts e2e/game-shell.spec.ts e2e/catalog-home-lobbies.spec.ts`

Expected: four rounds and all eleven catalog/lobby paths PASS.

```bash
git add src/games/alphabet src/games/syllables src/games/numbers src/games/words e2e/find-it-games.spec.ts
git commit -m "feat: give FindIt games tactile materials" -m "Four FindIt games now share the Living Toybox grammar without changing learning or lobby contracts."
```

### Task 7: Prove responsive, keyboard, rotation, pause, and reduced-motion behavior

**Files:**
- Modify: `e2e/game-shell.spec.ts`
- Modify: `e2e/find-it-games.spec.ts`
- Modify: `e2e/support/layoutAssertions.ts`
- Modify: `tools/screenshots/capture.mjs`
- Modify: `src/shared/ui/UiKitScreen.tsx`

- [ ] **Step 1: Add objective viewport tests**

At 320×568 and 667×375 for all four games, plus 768×1024 and 1280×900 for
Abeceda/Slová, assert no horizontal overflow, every answer and replay intersects
the viewport, every answer is at least 48×48, and answer pairs do not overlap.
Active rounds may not scroll to reveal an answer.

- [ ] **Step 2: Add rotation preservation**

Start 390×844; record target, grid IDs, rounds, and focus; resize 844×390; assert
all persist and remain visible. Repeat after one wrong attempt. Resize must not
replay the prompt or regenerate the queue.

- [ ] **Step 3: Add keyboard and pause paths**

For each game, keyboard-enter the round, Tab once into the composite, use arrows,
activate the known answer with Enter, replay with Space, and operate Continue,
Play again, and Home without pointer. Open a permitted parent dialog in a
representative round, assert audio/input/timers pause, close it, and assert round,
attempt, progress, and logical focus restoration.

- [ ] **Step 4: Add announcement, zoom, and reduced-motion checks**

Under reduced motion run retry, success, failure, completion; assert finite
animation and matching visible/live text. Run axe on four rounds/completion with
no serious/critical violations. At 200% zoom assert instruction, replay, answers,
and completion actions remain reachable without two-dimensional scrolling.

- [ ] **Step 5: Extend screenshots and run acceptance**

Add deterministic success, failure, completion, paused, and Slová visual-prompt
scenes. Capture 320×568, 390×844, 667×375, 844×390, 768×1024, 1280×900, and
1920×1080. DOM checks remain the pass/fail gate.

Run: `npm run build:e2e && npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts e2e/find-it-games.spec.ts`

Expected: containment, rotation, input, pause, zoom, motion, announcement,
audio-order, feedback, and completion cases PASS.

- [ ] **Step 6: Commit responsive acceptance**

```bash
git add e2e/game-shell.spec.ts e2e/find-it-games.spec.ts e2e/support/layoutAssertions.ts tools/screenshots/capture.mjs src/shared/ui/UiKitScreen.tsx
git commit -m "test: harden shared game framework" -m "Objective viewport, state, input, pause, motion, and announcement checks protect the common shell."
```

### Task 8: Complete Phase 5 verification, handoff, and stop

**Files:**
- Create: `docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-05.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run pure and audio checks**

```bash
npx tsx src/shared/game/gameState.verify.ts
npx tsx src/shared/uiCopy.verify.ts
npx tsx src/shared/gameCatalog.verify.ts
npx tsx src/shared/components/successOverlayAudio.verify.ts
npx tsx src/shared/components/sessionCompleteAudio.verify.ts
npm run test:audio
```

Expected: every check PASS; audio inventory reports no missing/orphaned expected clips.

- [ ] **Step 2: Run repository gates**

```bash
npm run lint
npm run build:e2e
npx playwright test --config=e2e/playwright.config.ts e2e/game-shell.spec.ts e2e/find-it-games.spec.ts e2e/catalog-home-lobbies.spec.ts
npm run test:e2e
npm run build
git diff --check
```

Expected: PASS, only the documented lint warning may remain, and avatar/three.js
stays lazy with no static import from `src/shared/game/`.

- [ ] **Step 3: Capture and review Phase 5 surfaces**

Use the Phase 1 screenshot harness for all four round, retry, success, failure,
completion, paused, and Slová visual-prompt scenes across the Phase 5 matrix.
Review containment, targets, material consistency, prompt/replay, focus, state
text, finite motion, shared palette, and short-landscape density.

- [ ] **Step 4: Verify the boundary**

```bash
rg "game-framework" src
rg "from '../game'" src/shared/components/FindItGame.tsx
rg "FindItGame" src/games/alphabet src/games/syllables src/games/numbers src/games/words
rg "SuccessOverlay|FailureOverlay|SessionCompleteOverlay" src/games
git diff --name-only HEAD~7..HEAD
```

Expected: first command has no matches; the shared FindIt controller consumes
the new framework and exactly four game directories consume that controller;
seven bespoke games retain legacy rounds/overlays; no parent, storage, avatar,
or unrelated game file changed.

- [ ] **Step 5: Update roadmap and handoff**

Mark only Phase 5 complete. Record branch, accepted Phase 4 base SHA, result SHA,
clean status, exact `src/shared/game/index.ts` exports, state transition table,
final-wrong audio evidence, actual commands/outcomes, screenshot artifact,
reviewer result, legacy consumers, risks, and Phase 6 preconditions. Obtain SHAs
and status from Git.

- [ ] **Step 6: Commit and stop**

```bash
git add ROADMAP.md docs/superpowers/handoffs/2026-09-14-ui-redesign-phase-05.md
git commit -m "docs: hand off UI redesign phase five" -m "Verified shell, session, and FindIt contracts give Phase 6 a stable framework."
```

Do not begin Phase 6 and do not open a pull request. Return the manifest, result
SHA, verification summary, screenshot artifact, and accepted residual risk for
explicit phase acceptance.
