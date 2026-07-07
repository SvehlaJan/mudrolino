# Prvé písmenko Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the sound-first `Prvé písmenko` mini-game where a child hears a word, sees only its emoji, and chooses the word's first Slovak letter from four answer tiles.

**Architecture:** Use a bespoke game loop because the target is a word but the answer tiles are letters. Keep the game small by sharing existing content context, top bar, choice tiles, success/failure overlays, session-complete overlay, audio manager, timing constants, and game lobby.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, `react-router-dom`, existing local content context and audio manager.

---

## File Structure

- Create: `src/games/first-letter/firstLetterLogic.ts`
  - Pure helpers for active letter filtering, longest-prefix first-letter derivation, eligible word mapping, and answer choice generation.
- Create: `src/games/first-letter/firstLetterLogic.verify.ts`
  - One-shot verification script for derivation, accent filtering, eligibility, and choice generation.
- Create: `src/games/first-letter/FirstLetterGame.tsx`
  - Lobby/play state, round loop, prompt rendering, letter choices, feedback, success/failure/session overlays.
- Modify: `src/shared/types.ts`
  - Add `FIRST_LETTER` to `GameId`.
- Modify: `src/shared/gameCatalog.tsx`
  - Add home/lobby metadata between `WORDS` and `ASSEMBLY`.
- Modify: `src/App.tsx`
  - Import `FirstLetterGame`, add `/first-letter` route, and route settings target to `FIRST_LETTER`.
- Modify: `README.md`
  - Update game count, game list, and shared architecture notes.
- Modify: `ROADMAP.md`
  - Add `Prvé písmenko` implementation status once complete; keep `Doplň slabiku` and `Ktoré chýba?` as backlog items.

---

### Task 1: First-Letter Pure Logic

**Files:**
- Create: `src/games/first-letter/firstLetterLogic.verify.ts`
- Create: `src/games/first-letter/firstLetterLogic.ts`

- [ ] **Step 1: Write the failing verification script**

Create `src/games/first-letter/firstLetterLogic.verify.ts`:

```ts
import { Letter, Word } from '../../shared/types';
import {
  buildFirstLetterItems,
  buildLetterChoices,
  getActiveFirstLetterLetters,
  getFirstSlovakLetterSymbol,
} from './firstLetterLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const letters: Letter[] = [
  { symbol: 'A', label: 'Auto', emoji: '🚗', audioKey: 'a' },
  { symbol: 'B', label: 'Baran', emoji: '🐏', audioKey: 'b' },
  { symbol: 'C', label: 'Citrón', emoji: '🍋', audioKey: 'c' },
  { symbol: 'CH', label: 'Chlieb', emoji: '🍞', audioKey: 'ch' },
  { symbol: 'D', label: 'Dúha', emoji: '🌈', audioKey: 'd' },
  { symbol: 'DZ', label: 'Dzúra', emoji: '🕳️', audioKey: 'dz' },
  { symbol: 'DŽ', label: 'Džungľa', emoji: '🌴', audioKey: 'dz-caron' },
  { symbol: 'J', label: 'Jahoda', emoji: '🍓', audioKey: 'j' },
  { symbol: 'M', label: 'Mesiac', emoji: '🌙', audioKey: 'm' },
  { symbol: 'Z', label: 'Zebra', emoji: '🦓', audioKey: 'z' },
  { symbol: 'Ž', label: 'Žaba', emoji: '🐸', audioKey: 'z-caron' },
];

const words: Word[] = [
  { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' },
  { word: 'Žaba', syllables: 'ža-ba', emoji: '🐸', audioKey: 'zaba' },
  { word: 'Chlieb', syllables: 'chlieb', emoji: '🍞', audioKey: 'chlieb' },
  { word: 'Džús', syllables: 'džús', emoji: '🧃', audioKey: 'dzus' },
  { word: 'Dzban', syllables: 'dzban', emoji: '🏺', audioKey: 'dzban' },
  { word: '1auto', syllables: 'au-to', emoji: '🚗', audioKey: '1auto' },
];

const allSymbols = letters.map((letter) => letter.symbol);
assert(getFirstSlovakLetterSymbol('Jahoda', allSymbols) === 'J', 'Jahoda derives J');
assert(getFirstSlovakLetterSymbol('Žaba', allSymbols) === 'Ž', 'Žaba derives Ž');
assert(getFirstSlovakLetterSymbol('Chlieb', allSymbols) === 'CH', 'Chlieb derives CH');
assert(getFirstSlovakLetterSymbol('Džús', allSymbols) === 'DŽ', 'Džús derives DŽ');
assert(getFirstSlovakLetterSymbol('Dzban', allSymbols) === 'DZ', 'Dzban derives DZ');
assert(getFirstSlovakLetterSymbol('1auto', allSymbols) === null, 'word with unavailable first symbol is excluded');

const accentOffLetters = getActiveFirstLetterLetters(letters, false);
assert(accentOffLetters.some((letter) => letter.symbol === 'CH'), 'CH remains active when accents are off');
assert(accentOffLetters.some((letter) => letter.symbol === 'DZ'), 'DZ remains active when accents are off');
assert(!accentOffLetters.some((letter) => letter.symbol === 'Ž'), 'Ž is inactive when accents are off');
assert(!accentOffLetters.some((letter) => letter.symbol === 'DŽ'), 'DŽ is inactive when accents are off');

const accentOnItems = buildFirstLetterItems(words, letters);
assert(accentOnItems.some((item) => item.word.word === 'Žaba' && item.firstLetter.symbol === 'Ž'), 'accented words are eligible when letter is active');
assert(accentOnItems.some((item) => item.word.word === 'Chlieb' && item.firstLetter.symbol === 'CH'), 'CH words are eligible');
assert(!accentOnItems.some((item) => item.word.word === '1auto'), 'words with no active first letter are not eligible');

const accentOffItems = buildFirstLetterItems(words, accentOffLetters);
assert(!accentOffItems.some((item) => item.word.word === 'Žaba'), 'accented words are excluded when accents are off');
assert(!accentOffItems.some((item) => item.word.word === 'Džús'), 'DŽ words are excluded when accents are off');
assert(accentOffItems.some((item) => item.word.word === 'Chlieb'), 'CH words stay eligible when accents are off');

const target = accentOnItems.find((item) => item.word.word === 'Jahoda');
assert(Boolean(target), 'target item exists');
if (target) {
  const choices = buildLetterChoices(target, letters, 4);
  const symbols = choices.map((letter) => letter.symbol);
  assert(choices.length === 4, 'four choices are generated');
  assert(symbols.includes('J'), 'choices include the correct letter');
  assert(new Set(symbols).size === symbols.length, 'choices do not contain duplicate letters');
}

console.log('firstLetterLogic checks passed');
```

- [ ] **Step 2: Run the verification script and confirm it fails**

Run:

```bash
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
```

Expected: failure because `src/games/first-letter/firstLetterLogic.ts` does not exist.

- [ ] **Step 3: Add the pure helper implementation**

Create `src/games/first-letter/firstLetterLogic.ts`:

```ts
import { Letter, Word } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export interface FirstLetterItem {
  word: Word;
  firstLetter: Letter;
}

function hasDiacritic(value: string): boolean {
  return value.normalize('NFD') !== value;
}

export function getActiveFirstLetterLetters(letters: Letter[], includeAccents: boolean): Letter[] {
  return includeAccents ? letters : letters.filter((letter) => !hasDiacritic(letter.symbol));
}

export function getFirstSlovakLetterSymbol(word: string, activeLetterSymbols: string[]): string | null {
  const normalizedWord = word.trim().toLocaleUpperCase('sk-SK');
  if (!normalizedWord) return null;

  const orderedSymbols = [...activeLetterSymbols].sort((a, b) => b.length - a.length);
  for (const symbol of orderedSymbols) {
    if (normalizedWord.startsWith(symbol)) {
      return symbol;
    }
  }

  const [firstCharacter] = Array.from(normalizedWord);
  return activeLetterSymbols.includes(firstCharacter) ? firstCharacter : null;
}

export function buildFirstLetterItems(words: Word[], activeLetters: Letter[]): FirstLetterItem[] {
  const lettersBySymbol = new Map(activeLetters.map((letter) => [letter.symbol, letter]));
  const activeSymbols = activeLetters.map((letter) => letter.symbol);

  return words.flatMap((word) => {
    const firstLetterSymbol = getFirstSlovakLetterSymbol(word.word, activeSymbols);
    if (!firstLetterSymbol) return [];
    const firstLetter = lettersBySymbol.get(firstLetterSymbol);
    return firstLetter ? [{ word, firstLetter }] : [];
  });
}

export function buildLetterChoices(
  target: FirstLetterItem,
  activeLetters: Letter[],
  choiceCount = 4,
): Letter[] {
  const distractors = fisherYatesShuffle(
    activeLetters.filter((letter) => letter.symbol !== target.firstLetter.symbol),
  ).slice(0, Math.max(0, choiceCount - 1));

  return fisherYatesShuffle([target.firstLetter, ...distractors]);
}
```

- [ ] **Step 4: Run the verification script and confirm it passes**

Run:

```bash
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
```

Expected: `firstLetterLogic checks passed`

- [ ] **Step 5: Commit**

Run:

```bash
git add src/games/first-letter/firstLetterLogic.ts src/games/first-letter/firstLetterLogic.verify.ts
git commit -m "feat: add first letter game logic"
```

---

### Task 2: First-Letter Game Screen

**Files:**
- Create: `src/games/first-letter/FirstLetterGame.tsx`

- [ ] **Step 1: Create the game component**

Create `src/games/first-letter/FirstLetterGame.tsx`:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { GameSettings, Letter, SuccessSpec, FailureSpec } from '../../shared/types';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { AppScreen, BackButton, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { FailureOverlay } from '../../shared/components/FailureOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { TIMING, getPhraseClip } from '../../shared/contentRegistry';
import { audioManager } from '../../shared/services/audioManager';
import { fisherYatesShuffle } from '../../shared/utils';
import {
  buildFirstLetterItems,
  buildLetterChoices,
  FirstLetterItem,
  getActiveFirstLetterLetters,
} from './firstLetterLogic';

interface FirstLetterGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;

function getPromptAudio(locale: string, item: FirstLetterItem) {
  return {
    clips: [
      { path: `${locale}/words/${item.word.audioKey}`, fallbackText: item.word.word },
      { path: `${locale}/phrases/na-ake-pismenko-sa-zacina`, fallbackText: 'Na aké písmenko sa začína?' },
    ],
  };
}

function getRelationshipLine(item: FirstLetterItem): string {
  return `${item.word.word} začína na ${item.firstLetter.symbol}. ${item.word.emoji}`;
}

function getSuccessSpec(locale: string, item: FirstLetterItem): SuccessSpec {
  return {
    echoLine: getRelationshipLine(item),
    audioSpec: {
      clips: [
        { path: `${locale}/words/${item.word.audioKey}`, fallbackText: `${item.word.word} začína na ${item.firstLetter.symbol}.` },
      ],
    },
  };
}

function getFailureSpec(locale: string, item: FirstLetterItem): FailureSpec {
  return {
    echoLine: getRelationshipLine(item),
    audioSpec: {
      clips: [
        getPhraseClip(locale, 'neverMind'),
        { path: `${locale}/words/${item.word.audioKey}`, fallbackText: `${item.word.word} začína na ${item.firstLetter.symbol}.` },
      ],
    },
  };
}

function getWrongAudio(locale: string, selected: Letter) {
  return {
    clips: [
      getPhraseClip(locale, 'thisIs'),
      { path: `${locale}/letters/${selected.audioKey}`, fallbackText: selected.symbol },
      getPhraseClip(locale, 'retry'),
    ],
  };
}

export function FirstLetterGame({ settings, onExit, onOpenSettings }: FirstLetterGameProps) {
  const { wordItems, letterItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<FirstLetterItem | null>(null);
  const [roundQueue, setRoundQueue] = useState<FirstLetterItem[]>([]);
  const [choices, setChoices] = useState<Letter[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});
  const [wrongAttemptsThisRound, setWrongAttemptsThisRound] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [successSpec, setSuccessSpec] = useState<SuccessSpec | null>(null);
  const [failureSpec, setFailureSpec] = useState<FailureSpec | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const pendingRoundEndRef = useRef(false);

  const activeLetters = useMemo(
    () => getActiveFirstLetterLetters(letterItems, settings.alphabetAccents),
    [letterItems, settings.alphabetAccents],
  );
  const eligibleItems = useMemo(
    () => buildFirstLetterItems(wordItems, activeLetters),
    [wordItems, activeLetters],
  );
  const lobby = GAME_DEFINITIONS_BY_ID.FIRST_LETTER.lobby;

  const startRound = useCallback((queueOverride?: FirstLetterItem[]) => {
    const currentQueue = queueOverride && queueOverride.length > 0
      ? queueOverride
      : roundQueue.length > 0
        ? roundQueue
        : fisherYatesShuffle(eligibleItems);
    const [nextTarget, ...rest] = currentQueue;
    if (!nextTarget) return;

    setTargetItem(nextTarget);
    setRoundQueue(rest);
    setChoices(buildLetterChoices(nextTarget, activeLetters, 4));
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setShowSuccess(false);
    setShowFailure(false);
    pendingRoundEndRef.current = false;
  }, [activeLetters, eligibleItems, roundQueue]);

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !targetItem || showSuccess || showFailure || showSessionComplete) return;
    const timer = setTimeout(() => {
      audioManager.play(getPromptAudio(locale, targetItem));
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimeout(timer);
  }, [gameState, targetItem, locale, showFailure, showSessionComplete, showSuccess]);

  const handlePlay = () => {
    if (eligibleItems.length === 0 || activeLetters.length < 2) return;
    const queue = fisherYatesShuffle(eligibleItems);
    setRoundQueue(queue);
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalTaps(0);
    setShowSessionComplete(false);
    setGameState('PLAYING');
    startRound(queue);
  };

  const finishRound = (wasCorrect: boolean, item: FirstLetterItem) => {
    const nextRoundsPlayed = roundsPlayed + 1;
    setRoundsPlayed(nextRoundsPlayed);
    if (wasCorrect) setCorrectRounds((value) => value + 1);

    if (nextRoundsPlayed >= MAX_ROUNDS) {
      setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      return;
    }

    setTimeout(() => {
      if (wasCorrect) {
        setShowSuccess(true);
      } else {
        setShowFailure(true);
      }
    }, TIMING.SUCCESS_SHOW_DELAY_MS);
  };

  const handleChoice = (letter: Letter) => {
    if (!targetItem || showSuccess || showFailure || showSessionComplete || pendingRoundEndRef.current) return;
    setTotalTaps((value) => value + 1);

    if (letter.symbol === targetItem.firstLetter.symbol) {
      pendingRoundEndRef.current = true;
      setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
      setSuccessSpec(getSuccessSpec(locale, targetItem));
      finishRound(true, targetItem);
      return;
    }

    const nextWrongAttempts = wrongAttemptsThisRound + 1;
    setWrongAttemptsThisRound(nextWrongAttempts);
    setFeedback((current) => ({ ...current, [letter.symbol]: 'wrong' }));

    if (nextWrongAttempts >= MAX_ATTEMPTS) {
      pendingRoundEndRef.current = true;
      setFailureSpec(getFailureSpec(locale, targetItem));
      finishRound(false, targetItem);
      return;
    }

    audioManager.play(getWrongAudio(locale, letter));
    setTimeout(() => {
      setFeedback((current) => ({ ...current, [letter.symbol]: null }));
    }, TIMING.FEEDBACK_RESET_MS);
  };

  if (gameState === 'PLAYING') {
    return (
      <AppScreen>
        <TopBar
          left={<BackButton onClick={() => setGameState('HOME')} />}
          center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
          right={
            <IconButton
              onClick={() => targetItem && audioManager.play(getPromptAudio(locale, targetItem))}
              label="Prehrať zvuk"
            >
              <Volume2 size={24} className="sm:h-7 sm:w-7" />
            </IconButton>
          }
        />

        <div className="flex shrink-0 flex-col items-center justify-center pb-4 text-center">
          <div role="img" aria-label="Hľadané slovo" className="text-[clamp(6rem,24vw,12rem)] leading-none">
            {targetItem?.word.emoji}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="grid w-full max-w-2xl grid-cols-2 gap-3 px-1 sm:gap-4 sm:px-2">
            {choices.map((letter) => (
              <ChoiceTile
                key={letter.symbol}
                onClick={() => handleChoice(letter)}
                aria-label={letter.symbol}
                state={feedback[letter.symbol] ?? 'neutral'}
                className="aspect-square"
              >
                <span className="font-spline text-[clamp(2.75rem,12vw,6rem)] font-bold leading-none">
                  {letter.symbol}
                </span>
              </ChoiceTile>
            ))}
          </div>
        </div>

        {successSpec && (
          <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={() => startRound()} />
        )}
        {failureSpec && (
          <FailureOverlay show={showFailure} spec={failureSpec} onComplete={() => startRound()} />
        )}
        <SessionCompleteOverlay
          show={showSessionComplete}
          roundsCompleted={correctRounds}
          totalTaps={totalTaps}
          maxRounds={MAX_ROUNDS}
          onComplete={() => setGameState('HOME')}
        />
      </AppScreen>
    );
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={
        eligibleItems.length === 0 || activeLetters.length < 2
          ? <>Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.</>
          : undefined
      }
      onPlay={handlePlay}
      onBack={onExit}
      onOpenSettings={onOpenSettings}
      topDecorationClassName={lobby.topDecorationClassName}
      bottomDecorationClassName={lobby.bottomDecorationClassName}
    />
  );
}
```

- [ ] **Step 2: Run type checking**

Run:

```bash
npm run lint
```

Expected: TypeScript fails because `GAME_DEFINITIONS_BY_ID.FIRST_LETTER` does not exist yet. This is expected until Task 3 registers the game.

- [ ] **Step 3: Commit**

Do not commit this task until Task 3 has made type checking pass. The component intentionally references the catalog entry that will be added in the next task.

---

### Task 3: Register Route, Catalog, and Types

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/gameCatalog.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add the game id**

In `src/shared/types.ts`, replace:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'ASSEMBLY';
```

with:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY';
```

- [ ] **Step 2: Add catalog metadata**

In `src/shared/gameCatalog.tsx`, update the lucide import:

```tsx
import { Apple, BookOpen, Gamepad2, Play, Puzzle, Type, WandSparkles } from 'lucide-react';
```

Add this game definition between `WORDS` and `ASSEMBLY`:

```tsx
  {
    id: 'FIRST_LETTER',
    path: '/first-letter',
    title: 'Prvé písmenko',
    description: 'Počúvaj slovo a nájdi prvé písmenko',
    icon: <WandSparkles size={48} className="sm:h-16 sm:w-16" />,
    color: 'bg-success',
    lobby: {
      title: 'PRVÉ PÍSMENKO',
      playButtonColorClassName: 'bg-success',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-soft-watermelon opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
```

- [ ] **Step 3: Register the route**

In `src/App.tsx`, add the import:

```tsx
import { FirstLetterGame } from './games/first-letter/FirstLetterGame';
```

Add the route between `/words` and `/assembly`:

```tsx
          <Route
            path="/first-letter"
            element={
              <ErrorBoundary>
                <FirstLetterGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('FIRST_LETTER')} />
              </ErrorBoundary>
            }
          />
```

- [ ] **Step 4: Run focused and full checks**

Run:

```bash
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
npm run lint
```

Expected:

- `firstLetterLogic checks passed`
- `npm run lint` exits 0 with the existing `ContentContext.tsx` Fast Refresh warning.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/games/first-letter/FirstLetterGame.tsx src/shared/types.ts src/shared/gameCatalog.tsx src/App.tsx
git commit -m "feat: add first letter game shell"
```

---

### Task 4: Docs and Roadmap

**Files:**
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update README feature count and game list**

In `README.md`, replace:

```md
- Six mini-games: alphabet, syllables, numbers, counting, words, and syllable assembly.
```

with:

```md
- Seven mini-games: alphabet, syllables, numbers, counting, words, first-letter sounds, and syllable assembly.
```

Add this game bullet between `Slová` and `Skladaj`:

```md
- `Prvé písmenko`: hear a word, see its emoji, and choose the first Slovak letter.
```

Update the architecture bullets:

```md
- `src/games/first-letter/FirstLetterGame.tsx` is a bespoke word-to-first-letter mechanic that shares the app's standard overlays and controls.
```

- [ ] **Step 2: Update roadmap**

In `ROADMAP.md`, add a Phase 1.7 done item above the future backlog candidates once implementation is complete:

```md
- [x] **Prvé písmenko** — sound-first word-to-starting-letter game using ready words and active alphabet settings.
```

Keep the existing backlog entries for `Doplň slabiku` and `Ktoré chýba?` unchecked.

- [ ] **Step 3: Run docs-safe checks**

Run:

```bash
npm run lint
```

Expected: exits 0 with the existing `ContentContext.tsx` Fast Refresh warning.

- [ ] **Step 4: Commit**

Run:

```bash
git add README.md ROADMAP.md
git commit -m "docs: document first letter game"
```

---

### Task 5: Browser Verification

**Files:**
- Modify only if verification finds a real bug:
  - `src/games/first-letter/FirstLetterGame.tsx`
  - `src/shared/gameCatalog.tsx`
  - `src/App.tsx`

- [ ] **Step 1: Build production assets**

Run:

```bash
npm run build
```

Expected: exits 0. The existing chunk-size warning is acceptable.

- [ ] **Step 2: Start preview**

Run:

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

Expected: preview server starts at `http://127.0.0.1:4173/`.

- [ ] **Step 3: Verify the new game route with Playwright**

Run from another terminal:

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] }); for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) { const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' }); await page.getByRole('button', { name: /Prvé písmenko/ }).click(); await page.getByRole('button', { name: 'Hrať' }).click(); await page.waitForTimeout(1000); const body = await page.locator('body').innerText(); const tileCount = await page.locator('button[aria-label]').count(); await page.screenshot({ path: '/tmp/teo-first-letter-' + vp.name + '.png', fullPage: false }); console.log(JSON.stringify({ viewport: vp.name, errors, hasRoundCounter: body.includes('/'), tileCount }, null, 2)); await page.close(); } await browser.close(); })().catch(e => { console.error(e); process.exit(1); });"
```

Expected:

- no page errors
- a screenshot exists for desktop and mobile under `/tmp`
- the game route launches and shows letter choices

If Chromium fails with the macOS `MachPortRendezvousServer` sandbox error, rerun the same Playwright command outside the sandbox with escalation, as documented in `.agents/skills/playwright-browser-verification/SKILL.md`.

- [ ] **Step 4: Stop preview**

Stop the preview process with `Ctrl-C`.

- [ ] **Step 5: Fix verification issues if any**

If Playwright shows clipped text, blank route, missing game card, or runtime errors, fix only the files involved in the first-letter game integration. After each fix, rerun:

```bash
npm run lint
npm run build
```

Then rerun the Playwright command from Step 3.

- [ ] **Step 6: Commit verification fixes**

If Step 5 changed files, run:

```bash
git add src/games/first-letter/FirstLetterGame.tsx src/shared/gameCatalog.tsx src/App.tsx README.md ROADMAP.md
git commit -m "fix: polish first letter game"
```

If Step 5 changed no files, do not create an empty commit.

---

### Task 6: Final Verification and Push Readiness

**Files:**
- No planned changes.

- [ ] **Step 1: Run all focused checks**

Run:

```bash
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
npx tsx src/shared/components/sessionCompleteAudio.verify.ts
npx tsx src/shared/components/successOverlayAudio.verify.ts
npm run test:audio
```

Expected:

- `firstLetterLogic checks passed`
- `sessionCompleteAudio checks passed`
- `successOverlayAudio checks passed`
- all 6 audio categories pass

- [ ] **Step 2: Run full static/build checks**

Run:

```bash
npm run lint
npm run build
```

Expected:

- `npm run lint` exits 0 with the existing `ContentContext.tsx` Fast Refresh warning.
- `npm run build` exits 0 with the existing large chunk warning.

- [ ] **Step 3: Inspect git state**

Run:

```bash
git status --short --branch
git log --oneline --decorate --max-count=8
```

Expected:

- working tree is clean
- recent commits show the first-letter game logic, shell, docs, and any verification fix commit

- [ ] **Step 4: Report**

Report:

- what was implemented
- verification commands and outcomes
- current branch and whether it is ahead of origin
- whether a push is still needed
