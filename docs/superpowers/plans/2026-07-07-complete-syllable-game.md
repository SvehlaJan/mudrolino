# Doplň slabiku Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `Doplň slabiku` mini-game where the child hears a word, sees its emoji and syllable slots with one blank, then chooses the missing syllable from four tiles.

**Architecture:** Use a bespoke game loop because the target is a word plus missing-position state while answer tiles are syllables. Keep the implementation close to `FirstLetterGame`: pure logic helpers, a focused game component, shared content context, shared UI primitives, shared overlays, and explicit timer cleanup.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, `react-router-dom`, existing local content context and audio manager.

---

## File Structure

- Create: `src/games/complete-syllable/completeSyllableLogic.ts`
  - Pure helpers for parsing syllables, filtering playable words, choosing a missing position, building prompt slots, and generating four unique answer choices.
- Create: `src/games/complete-syllable/completeSyllableLogic.verify.ts`
  - One-shot verification script for eligibility, slot construction, deterministic missing-position selection, and choice generation.
- Create: `src/games/complete-syllable/CompleteSyllableGame.tsx`
  - Lobby/play state, bespoke round loop, prompt rendering, syllable choices, feedback, success/failure/session overlays, timer cleanup.
- Modify: `src/shared/types.ts`
  - Add `COMPLETE_SYLLABLE` to `GameId`.
- Modify: `src/shared/gameCatalog.tsx`
  - Add home/lobby metadata after `ASSEMBLY`.
- Modify: `src/App.tsx`
  - Import `CompleteSyllableGame` and add `/complete-syllable` route after `/assembly`.
- Modify: `src/shared/components/settingsContentData.ts`
  - Add settings subtitle and visibility for `COMPLETE_SYLLABLE`; expose music only.
- Modify: `README.md`
  - Update game count, game list, and bespoke-game architecture notes.
- Modify: `ROADMAP.md`
  - Mark `Doplň slabiku` complete once implemented.

---

### Task 1: Complete-Syllable Pure Logic

**Files:**
- Create: `src/games/complete-syllable/completeSyllableLogic.verify.ts`
- Create: `src/games/complete-syllable/completeSyllableLogic.ts`

- [ ] **Step 1: Write the failing verification script**

Create `src/games/complete-syllable/completeSyllableLogic.verify.ts`:

```ts
import { Syllable, Word } from '../../shared/types';
import {
  buildEligibleCompleteSyllableWords,
  buildPromptSlots,
  buildSyllableChoices,
  chooseMissingIndex,
  createCompleteSyllableRound,
  parseWordSyllables,
} from './completeSyllableLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const jahoda: Word = { word: 'Jahoda', syllables: 'ja-ho-da', emoji: '🍓', audioKey: 'jahoda' };
const kura: Word = { word: 'Kura', syllables: 'ku-ra', emoji: '🐔', audioKey: 'kura' };
const badShort: Word = { word: 'Pes', syllables: 'pes', emoji: '🐶', audioKey: 'pes' };
const badLong: Word = { word: 'Nepouzite', syllables: 'ne-po-u-zi-te', emoji: '🧩', audioKey: 'nepouzite' };
const spaced: Word = { word: 'Medzera', syllables: ' ma - ma ', emoji: '👩', audioKey: 'mama' };

const syllables: Syllable[] = [
  { symbol: 'JA', audioKey: 'ja', sourceWords: [jahoda] },
  { symbol: 'HO', audioKey: 'ho', sourceWords: [jahoda] },
  { symbol: 'DA', audioKey: 'da', sourceWords: [jahoda] },
  { symbol: 'KU', audioKey: 'ku', sourceWords: [kura] },
  { symbol: 'RA', audioKey: 'ra', sourceWords: [kura] },
  { symbol: 'MA', audioKey: 'ma', sourceWords: [spaced] },
  { symbol: 'TO', audioKey: 'to', sourceWords: [] },
];

assert(parseWordSyllables('ja-ho-da').join('|') === 'ja|ho|da', 'hyphen-separated syllables are parsed');
assert(parseWordSyllables(' ma - ma ').join('|') === 'ma|ma', 'syllable parser trims whitespace');
assert(parseWordSyllables('a--b').join('|') === 'a|b', 'empty split parts are removed');

assert(chooseMissingIndex(3, () => 0) === 0, 'random 0 picks first index');
assert(chooseMissingIndex(3, () => 0.5) === 1, 'random 0.5 picks middle index');
assert(chooseMissingIndex(3, () => 0.99) === 2, 'random 0.99 picks last index');

const round = createCompleteSyllableRound(jahoda, 1);
assert(round.word.word === 'Jahoda', 'round keeps target word');
assert(round.correctSyllable === 'HO', 'round stores uppercase correct syllable');
assert(round.syllables.join('-') === 'JA-HO-DA', 'round stores uppercase syllables');

const hiddenSlots = buildPromptSlots(round, false);
assert(hiddenSlots.length === 3, 'prompt has one slot per syllable');
assert(hiddenSlots.filter((slot) => slot.isMissing).length === 1, 'prompt has exactly one missing slot');
assert(hiddenSlots.map((slot) => slot.text).join('-') === 'JA-__-DA', 'hidden prompt renders one blank');

const revealedSlots = buildPromptSlots(round, true);
assert(revealedSlots.map((slot) => slot.text).join('-') === 'JA-HO-DA', 'revealed prompt fills the missing syllable');

const choices = buildSyllableChoices(round, syllables, 4);
const choiceSymbols = choices.map((choice) => choice.symbol);
assert(choices.length === 4, 'choice generation returns four syllables');
assert(choiceSymbols.includes('HO'), 'choices include the correct syllable');
assert(new Set(choiceSymbols).size === choiceSymbols.length, 'choices are unique');

const eligible = buildEligibleCompleteSyllableWords([jahoda, kura, badShort, badLong, spaced], syllables, 4);
assert(eligible.some((word) => word.word === 'Jahoda'), 'three-syllable word is eligible');
assert(eligible.some((word) => word.word === 'Kura'), 'two-syllable word is eligible');
assert(eligible.some((word) => word.word === 'Medzera'), 'trimmed repeated-syllable word is eligible');
assert(!eligible.some((word) => word.word === 'Pes'), 'one-syllable word is excluded');
assert(!eligible.some((word) => word.word === 'Nepouzite'), 'five-syllable word is excluded');

const tinyPool = syllables.filter((syllable) => ['JA', 'HO', 'DA'].includes(syllable.symbol));
const tinyEligible = buildEligibleCompleteSyllableWords([jahoda], tinyPool, 4);
assert(tinyEligible.length === 0, 'word is excluded when four unique answer choices cannot be built');

console.log('completeSyllableLogic checks passed');
```

- [ ] **Step 2: Run the verification script and confirm it fails**

Run:

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
```

Expected: failure because `src/games/complete-syllable/completeSyllableLogic.ts` does not exist.

- [ ] **Step 3: Add the pure helper implementation**

Create `src/games/complete-syllable/completeSyllableLogic.ts`:

```ts
import { Syllable, Word } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export interface CompleteSyllableRound {
  word: Word;
  syllables: string[];
  missingIndex: number;
  correctSyllable: string;
}

export interface CompleteSyllableSlot {
  text: string;
  isMissing: boolean;
}

export function parseWordSyllables(value: string): string[] {
  return value
    .split('-')
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeSyllable(value: string): string {
  return value.trim().toLocaleUpperCase('sk-SK');
}

function getUniqueSyllables(syllableItems: Syllable[]): Syllable[] {
  const bySymbol = new Map<string, Syllable>();
  for (const syllable of syllableItems) {
    if (!bySymbol.has(syllable.symbol)) {
      bySymbol.set(syllable.symbol, syllable);
    }
  }
  return Array.from(bySymbol.values());
}

export function chooseMissingIndex(syllableCount: number, random = Math.random): number {
  if (syllableCount <= 0) {
    throw new Error('Cannot choose a missing syllable from an empty word.');
  }
  return Math.min(syllableCount - 1, Math.floor(random() * syllableCount));
}

export function createCompleteSyllableRound(word: Word, missingIndex?: number): CompleteSyllableRound {
  const syllables = parseWordSyllables(word.syllables).map(normalizeSyllable);
  const resolvedMissingIndex = missingIndex ?? chooseMissingIndex(syllables.length);
  const correctSyllable = syllables[resolvedMissingIndex];

  if (!correctSyllable) {
    throw new Error(`Word "${word.word}" does not have a syllable at index ${resolvedMissingIndex}.`);
  }

  return {
    word,
    syllables,
    missingIndex: resolvedMissingIndex,
    correctSyllable,
  };
}

export function buildPromptSlots(round: CompleteSyllableRound, revealMissing: boolean): CompleteSyllableSlot[] {
  return round.syllables.map((syllable, index) => {
    const isMissing = index === round.missingIndex;
    return {
      text: isMissing && !revealMissing ? '__' : syllable,
      isMissing,
    };
  });
}

export function buildSyllableChoices(
  round: CompleteSyllableRound,
  syllableItems: Syllable[],
  choiceCount = 4,
): Syllable[] {
  const uniqueSyllables = getUniqueSyllables(syllableItems);
  const correct = uniqueSyllables.find((syllable) => syllable.symbol === round.correctSyllable);
  if (!correct) return [];

  const distractors = fisherYatesShuffle(
    uniqueSyllables.filter((syllable) => syllable.symbol !== round.correctSyllable),
  ).slice(0, Math.max(0, choiceCount - 1));

  if (distractors.length < choiceCount - 1) return [];
  return fisherYatesShuffle([correct, ...distractors]);
}

export function buildEligibleCompleteSyllableWords(
  words: Word[],
  syllableItems: Syllable[],
  choiceCount = 4,
): Word[] {
  const uniqueSymbols = new Set(getUniqueSyllables(syllableItems).map((syllable) => syllable.symbol));

  return words.filter((word) => {
    const syllables = parseWordSyllables(word.syllables).map(normalizeSyllable);
    if (syllables.length < 2 || syllables.length > 4) return false;

    return syllables.every((syllable) => (
      uniqueSymbols.has(syllable) &&
      Array.from(uniqueSymbols).filter((symbol) => symbol !== syllable).length >= choiceCount - 1
    ));
  });
}
```

- [ ] **Step 4: Run the verification script and confirm it passes**

Run:

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
```

Expected: `completeSyllableLogic checks passed`

- [ ] **Step 5: Commit**

Run:

```bash
git add src/games/complete-syllable/completeSyllableLogic.ts src/games/complete-syllable/completeSyllableLogic.verify.ts
git commit -m "feat: add complete syllable game logic"
```

---

### Task 2: Complete-Syllable Game Screen

**Files:**
- Create: `src/games/complete-syllable/CompleteSyllableGame.tsx`

- [ ] **Step 1: Create the game component**

Create `src/games/complete-syllable/CompleteSyllableGame.tsx`:

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { FailureSpec, SuccessSpec, Syllable, Word } from '../../shared/types';
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
  buildEligibleCompleteSyllableWords,
  buildPromptSlots,
  buildSyllableChoices,
  CompleteSyllableRound,
  createCompleteSyllableRound,
} from './completeSyllableLogic';

interface CompleteSyllableGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;
const CHOICE_COUNT = 4;

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function clearTimers(timersRef: React.MutableRefObject<Set<ReturnType<typeof setTimeout>>>) {
  timersRef.current.forEach(clearTimeout);
  timersRef.current.clear();
}

function getPromptAudio(locale: string, round: CompleteSyllableRound) {
  return {
    clips: [
      { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
    ],
  };
}

function getCompletedLine(round: CompleteSyllableRound): string {
  return `${round.word.syllables} ${round.word.emoji}`;
}

function getSuccessSpec(locale: string, round: CompleteSyllableRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.syllables },
      ],
    },
  };
}

function getFailureSpec(locale: string, round: CompleteSyllableRound): FailureSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [
        getPhraseClip(locale, 'neverMind'),
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.syllables },
      ],
    },
  };
}

function getWrongAudio(locale: string, selected: Syllable) {
  return {
    clips: [
      getPhraseClip(locale, 'thisIs'),
      { path: `${locale}/syllables/${selected.audioKey}`, fallbackText: selected.symbol },
      getPhraseClip(locale, 'retry'),
    ],
  };
}

export function CompleteSyllableGame({ onExit, onOpenSettings }: CompleteSyllableGameProps) {
  const { wordItems, syllableItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetRound, setTargetRound] = useState<CompleteSyllableRound | null>(null);
  const [roundQueue, setRoundQueue] = useState<Word[]>([]);
  const [choices, setChoices] = useState<Syllable[]>([]);
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});
  const [wrongAttemptsThisRound, setWrongAttemptsThisRound] = useState(0);
  const [showMissingSyllable, setShowMissingSyllable] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [successSpec, setSuccessSpec] = useState<SuccessSpec | null>(null);
  const [failureSpec, setFailureSpec] = useState<FailureSpec | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const pendingRoundEndRef = useRef(false);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackResetTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const sessionTokenRef = useRef(0);

  const eligibleWords = useMemo(
    () => buildEligibleCompleteSyllableWords(wordItems, syllableItems, CHOICE_COUNT),
    [wordItems, syllableItems],
  );
  const lobby = GAME_DEFINITIONS_BY_ID.COMPLETE_SYLLABLE.lobby;

  const clearTransientTimers = useCallback(() => {
    clearTimer(promptTimerRef);
    clearTimer(roundEndTimerRef);
    clearTimers(feedbackResetTimersRef);
  }, []);

  const cleanupPlayEffects = useCallback(() => {
    clearTransientTimers();
    audioManager.stop();
  }, [clearTransientTimers]);

  const startRound = useCallback((queueOverride?: Word[]) => {
    clearTransientTimers();
    const currentQueue = queueOverride && queueOverride.length > 0
      ? queueOverride
      : roundQueue.length > 0
        ? roundQueue
        : fisherYatesShuffle(eligibleWords);
    const [nextWord, ...rest] = currentQueue;
    if (!nextWord) return;

    const nextRound = createCompleteSyllableRound(nextWord);
    const nextChoices = buildSyllableChoices(nextRound, syllableItems, CHOICE_COUNT);
    if (nextChoices.length !== CHOICE_COUNT) return;

    setTargetRound(nextRound);
    setRoundQueue(rest);
    setChoices(nextChoices);
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setShowMissingSyllable(false);
    setShowSuccess(false);
    setShowFailure(false);
    pendingRoundEndRef.current = false;
  }, [clearTransientTimers, eligibleWords, roundQueue, syllableItems]);

  useEffect(() => {
    return cleanupPlayEffects;
  }, [cleanupPlayEffects]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !targetRound || showSuccess || showFailure || showSessionComplete) return;
    const sessionToken = sessionTokenRef.current;
    clearTimer(promptTimerRef);
    promptTimerRef.current = setTimeout(() => {
      promptTimerRef.current = null;
      if (sessionTokenRef.current !== sessionToken) return;
      audioManager.play(getPromptAudio(locale, targetRound));
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimer(promptTimerRef);
  }, [gameState, locale, showFailure, showSessionComplete, showSuccess, targetRound]);

  const handlePlay = () => {
    if (eligibleWords.length === 0) return;
    sessionTokenRef.current += 1;
    cleanupPlayEffects();
    const queue = fisherYatesShuffle(eligibleWords);
    setRoundQueue(queue);
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalTaps(0);
    setShowSessionComplete(false);
    setGameState('PLAYING');
    startRound(queue);
  };

  const finishRound = (wasCorrect: boolean) => {
    const sessionToken = sessionTokenRef.current;
    const nextRoundsPlayed = roundsPlayed + 1;
    setRoundsPlayed(nextRoundsPlayed);
    if (wasCorrect) setCorrectRounds((value) => value + 1);

    clearTimer(roundEndTimerRef);
    if (nextRoundsPlayed >= MAX_ROUNDS) {
      roundEndTimerRef.current = setTimeout(() => {
        roundEndTimerRef.current = null;
        if (sessionTokenRef.current !== sessionToken) return;
        setShowSessionComplete(true);
      }, TIMING.SUCCESS_SHOW_DELAY_MS);
      return;
    }

    roundEndTimerRef.current = setTimeout(() => {
      roundEndTimerRef.current = null;
      if (sessionTokenRef.current !== sessionToken) return;
      if (wasCorrect) {
        setShowSuccess(true);
      } else {
        setShowFailure(true);
      }
    }, TIMING.SUCCESS_SHOW_DELAY_MS);
  };

  const handleChoice = (syllable: Syllable) => {
    if (!targetRound || showSuccess || showFailure || showSessionComplete || pendingRoundEndRef.current) return;
    setTotalTaps((value) => value + 1);

    if (syllable.symbol === targetRound.correctSyllable) {
      pendingRoundEndRef.current = true;
      setFeedback((current) => ({ ...current, [syllable.symbol]: 'correct' }));
      setShowMissingSyllable(true);
      setSuccessSpec(getSuccessSpec(locale, targetRound));
      finishRound(true);
      return;
    }

    const nextWrongAttempts = wrongAttemptsThisRound + 1;
    setWrongAttemptsThisRound(nextWrongAttempts);
    setFeedback((current) => ({ ...current, [syllable.symbol]: 'wrong' }));

    if (nextWrongAttempts >= MAX_ATTEMPTS) {
      pendingRoundEndRef.current = true;
      setShowMissingSyllable(true);
      setFailureSpec(getFailureSpec(locale, targetRound));
      finishRound(false);
      return;
    }

    audioManager.play(getWrongAudio(locale, syllable));
    const sessionToken = sessionTokenRef.current;
    const feedbackResetTimer = setTimeout(() => {
      feedbackResetTimersRef.current.delete(feedbackResetTimer);
      if (sessionTokenRef.current !== sessionToken) return;
      setFeedback((current) => ({ ...current, [syllable.symbol]: null }));
    }, TIMING.FEEDBACK_RESET_MS);
    feedbackResetTimersRef.current.add(feedbackResetTimer);
  };

  const handleBackToLobby = () => {
    sessionTokenRef.current += 1;
    cleanupPlayEffects();
    setTargetRound(null);
    setRoundQueue([]);
    setChoices([]);
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setShowMissingSyllable(false);
    setShowSuccess(false);
    setShowFailure(false);
    setSuccessSpec(null);
    setFailureSpec(null);
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalTaps(0);
    setShowSessionComplete(false);
    pendingRoundEndRef.current = false;
    setGameState('HOME');
  };

  if (gameState === 'PLAYING') {
    const slots = targetRound ? buildPromptSlots(targetRound, showMissingSyllable) : [];

    return (
      <AppScreen>
        <TopBar
          left={<BackButton onClick={handleBackToLobby} />}
          center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
          right={
            <IconButton
              onClick={() => targetRound && audioManager.play(getPromptAudio(locale, targetRound))}
              label="Prehrať zvuk"
            >
              <Volume2 size={24} className="sm:h-7 sm:w-7" />
            </IconButton>
          }
        />

        <div className="flex shrink-0 flex-col items-center justify-center gap-4 pb-4 text-center sm:gap-5">
          <div role="img" aria-label="Hľadané slovo" className="text-[clamp(4.5rem,18vw,9rem)] leading-none">
            {targetRound?.word.emoji}
          </div>
          <div className="flex max-w-full flex-wrap items-center justify-center gap-2 px-2 sm:gap-3">
            {slots.map((slot, index) => (
              <React.Fragment key={`${slot.text}-${index}`}>
                {index > 0 && (
                  <span className="font-spline text-[clamp(1.5rem,5vw,3rem)] font-black text-text-main/45">-</span>
                )}
                <span
                  className={
                    slot.isMissing
                      ? 'min-w-[4.25rem] rounded-3xl border-4 border-dashed border-primary/35 bg-white/80 px-4 py-3 font-spline text-[clamp(1.75rem,6vw,3.5rem)] font-black leading-none text-primary shadow-sm sm:min-w-[5.5rem] sm:px-5 sm:py-4'
                      : 'rounded-3xl bg-white px-4 py-3 font-spline text-[clamp(1.75rem,6vw,3.5rem)] font-black leading-none text-text-main shadow-sm sm:px-5 sm:py-4'
                  }
                >
                  {slot.text}
                </span>
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="grid w-full max-w-2xl grid-cols-2 gap-3 px-1 sm:gap-4 sm:px-2">
            {choices.map((syllable) => (
              <ChoiceTile
                key={syllable.symbol}
                onClick={() => handleChoice(syllable)}
                aria-label={syllable.symbol}
                state={feedback[syllable.symbol] ?? 'neutral'}
                className="aspect-[1.35]"
              >
                <span className="font-spline text-[clamp(2.35rem,10vw,5.25rem)] font-bold leading-none">
                  {syllable.symbol}
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
          onComplete={handleBackToLobby}
        />
      </AppScreen>
    );
  }

  return (
    <GameLobby
      title={lobby.title}
      playButtonColorClassName={lobby.playButtonColorClassName}
      subtitle={
        eligibleWords.length === 0
          ? <>Pridajte slová s dvomi až štyrmi slabikami.</>
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

- [ ] **Step 2: Run type checking and record the expected registration failure**

Run:

```bash
npm run lint
```

Expected: TypeScript fails because `GAME_DEFINITIONS_BY_ID.COMPLETE_SYLLABLE` does not exist yet. Task 3 registers the game and makes type checking pass.

- [ ] **Step 3: Hold the component commit until Task 3**

Do not create a commit for Task 2 alone. The component intentionally references the catalog entry that Task 3 adds.

---

### Task 3: Register Route, Catalog, Types, and Settings Metadata

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/gameCatalog.tsx`
- Modify: `src/App.tsx`
- Modify: `src/shared/components/settingsContentData.ts`

- [ ] **Step 1: Add the game id**

In `src/shared/types.ts`, replace:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY';
```

with:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY' | 'COMPLETE_SYLLABLE';
```

- [ ] **Step 2: Add catalog metadata**

In `src/shared/gameCatalog.tsx`, add this game definition after the `ASSEMBLY` definition:

```tsx
  {
    id: 'COMPLETE_SYLLABLE',
    path: '/complete-syllable',
    title: 'Doplň slabiku',
    description: 'Vyber slabiku, ktorá chýba',
    icon: <Puzzle size={48} className="sm:h-16 sm:w-16" />,
    color: 'bg-accent-blue',
    lobby: {
      title: 'DOPLŇ SLABIKU',
      playButtonColorClassName: 'bg-accent-blue',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-success opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
```

- [ ] **Step 3: Register settings metadata**

In `src/shared/components/settingsContentData.ts`, add this subtitle entry after `ASSEMBLY`:

```ts
  COMPLETE_SYLLABLE: 'Hra s dopĺňaním slabík',
```

Add this visibility entry after `ASSEMBLY`:

```ts
  COMPLETE_SYLLABLE: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
  },
```

- [ ] **Step 4: Register the route**

In `src/App.tsx`, add the import:

```tsx
import { CompleteSyllableGame } from './games/complete-syllable/CompleteSyllableGame';
```

Add the route after `/assembly`:

```tsx
          <Route
            path="/complete-syllable"
            element={
              <ErrorBoundary>
                <CompleteSyllableGame onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('COMPLETE_SYLLABLE')} />
              </ErrorBoundary>
            }
          />
```

- [ ] **Step 5: Run focused and full checks**

Run:

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
npm run lint
```

Expected:

- `completeSyllableLogic checks passed`
- `npm run lint` exits 0 with the existing `ContentContext.tsx` Fast Refresh warning.

- [ ] **Step 6: Commit**

Run:

```bash
git add src/games/complete-syllable/CompleteSyllableGame.tsx src/shared/types.ts src/shared/gameCatalog.tsx src/App.tsx src/shared/components/settingsContentData.ts
git commit -m "feat: add complete syllable game shell"
```

---

### Task 4: Docs and Roadmap

**Files:**
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Update README feature count and game list**

In `README.md`, replace:

```md
- Seven mini-games: alphabet, syllables, numbers, counting, words, first-letter sounds, and syllable assembly.
```

with:

```md
- Eight mini-games: alphabet, syllables, numbers, counting, words, first-letter sounds, syllable assembly, and missing-syllable completion.
```

Add this game bullet after `Skladaj`:

```md
- `Doplň slabiku`: complete a syllabified word by choosing the missing syllable.
```

Add this architecture bullet after the Assembly game bullet:

```md
- `src/games/complete-syllable/CompleteSyllableGame.tsx` is a bespoke missing-syllable mechanic that shares the app's standard overlays and controls.
```

- [ ] **Step 2: Update roadmap**

In `ROADMAP.md`, replace the unchecked backlog item:

```md
- [ ] **Doplň slabiku** — show a word with one missing syllable and let the child choose the missing tile.
```

with:

```md
- [x] **Doplň slabiku** — show a word with one missing syllable and let the child choose the missing tile.
```

Keep `Ktoré chýba?` unchecked.

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
git commit -m "docs: document complete syllable game"
```

---

### Task 5: Browser Verification and Polish

**Files:**
- Modify only when verification finds a real bug:
  - `src/games/complete-syllable/CompleteSyllableGame.tsx`
  - `src/shared/gameCatalog.tsx`
  - `src/App.tsx`

- [ ] **Step 1: Build production assets**

Run:

```bash
npm run build
```

Expected: exits 0. The existing large chunk warning is acceptable.

- [ ] **Step 2: Start preview**

Run:

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

Expected: preview server starts at `http://127.0.0.1:4173/`.

- [ ] **Step 3: Verify the new game route with Playwright**

Run from another terminal:

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] }); for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) { const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' }); await page.getByRole('button', { name: /Doplň slabiku/ }).click(); await page.getByRole('button', { name: 'Hrať' }).click(); await page.waitForTimeout(1000); const body = await page.locator('body').innerText(); const answerTileCount = await page.locator('button[aria-label]').count(); const hasBlank = body.includes('__'); await page.screenshot({ path: '/tmp/teo-complete-syllable-' + vp.name + '.png', fullPage: false }); console.log(JSON.stringify({ viewport: vp.name, errors, hasRoundCounter: body.includes('/'), hasBlank, answerTileCount }, null, 2)); await page.close(); } await browser.close(); })().catch(e => { console.error(e); process.exit(1); });"
```

Expected:

- no page errors
- a screenshot exists for desktop and mobile under `/tmp`
- route launches a round
- body text includes the blank `__`
- `button[aria-label]` count is at least 6 because it includes back, replay, and four answer tiles

If Chromium fails with the macOS `MachPortRendezvousServer` sandbox error, rerun the same Playwright command outside the sandbox with escalation.

- [ ] **Step 4: Stop preview**

Stop the preview process with `Ctrl-C`.

- [ ] **Step 5: Fix verification issues**

When Playwright shows clipped text, a blank route, missing game card, missing blank slot, fewer than four answer tiles, or runtime errors, fix only the files involved in complete-syllable integration. After each fix, rerun:

```bash
npm run lint
npm run build
```

Then rerun the Playwright command from Step 3.

- [ ] **Step 6: Commit verification fixes**

When Step 5 changes files, run:

```bash
git add src/games/complete-syllable/CompleteSyllableGame.tsx src/shared/gameCatalog.tsx src/App.tsx
git commit -m "fix: polish complete syllable game"
```

When Step 5 changes no files, leave the commit history unchanged.

---

### Task 6: Final Verification and Push Readiness

**Files:**
- No planned changes.

- [ ] **Step 1: Run all focused checks**

Run:

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
npx tsx src/shared/components/sessionCompleteAudio.verify.ts
npx tsx src/shared/components/successOverlayAudio.verify.ts
npm run test:audio
```

Expected:

- `completeSyllableLogic checks passed`
- `firstLetterLogic checks passed`
- `assemblyAudioLogic checks passed`
- `sessionCompleteAudio checks passed`
- `successOverlayAudio checks passed`
- all 6 audio categories pass

- [ ] **Step 2: Run full static/build checks sequentially**

Run:

```bash
npm run lint
npm run build
```

Expected:

- `npm run lint` exits 0 with the existing `ContentContext.tsx` Fast Refresh warning.
- `npm run build` exits 0 with the existing large chunk warning.

Do not run `npm run lint` and `npm run build` in parallel because `vite build` rewrites `dist/` while TypeScript can scan it.

- [ ] **Step 3: Inspect git state**

Run:

```bash
git status --short --branch
git log --oneline --decorate --max-count=10
```

Expected:

- working tree is clean
- recent commits show complete-syllable logic, shell, docs, and verification fix commits

- [ ] **Step 4: Report**

Report:

- what was implemented
- verification commands and outcomes
- current branch and whether it is ahead of origin
- whether a push is still needed
