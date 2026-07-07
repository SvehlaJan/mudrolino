# Doplň písmeno Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the `Doplň písmeno` mini-game where a child hears a word, sees its emoji and a word with one or more missing Slovak letter units, then fills the blanks in guided order.

**Architecture:** Build a new bespoke game beside `Doplň slabiku` without refactoring that working game. Put Slovak letter parsing, missing-position selection, eligibility, prompt slots, and choice generation in pure helpers; keep the React component focused on round/session state, timers, audio, and overlays. Add a game-specific setting for missing-letter count and wire the game into the existing route/catalog/settings/docs structure.

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, `react-router-dom`, existing content context, shared UI primitives, shared overlays, and `audioManager`.

---

## File Structure

- Create: `src/games/complete-letter/completeLetterLogic.ts`
  - Pure Slovak letter-unit parsing, active-letter filtering, missing-position selection, slot rendering, choice generation, and eligibility.
- Create: `src/games/complete-letter/completeLetterLogic.verify.ts`
  - One-shot executable verifier for the pure logic.
- Create: `src/games/complete-letter/CompleteLetterGame.tsx`
  - Game lobby/play state, prompt rendering, guided blank filling, choices, feedback, audio, overlays, and timer cleanup.
- Modify: `src/shared/types.ts`
  - Add `COMPLETE_LETTER` to `GameId`.
  - Add `CompleteLetterMissingCount` and `completeLetterMissingCount` to `GameSettings`.
- Modify: `src/shared/services/settingsService.ts`
  - Add default and persisted validation for `completeLetterMissingCount`.
- Modify: `src/shared/components/settingsContentData.ts`
  - Add settings subtitle and visibility for `COMPLETE_LETTER`.
  - Add `completeLetterMissingCount` to every visibility row.
- Modify: `src/shared/components/SettingsContent.tsx`
  - Add a segmented control for `completeLetterMissingCount` on the home settings screen and the game settings overlay.
- Modify: `src/shared/gameCatalog.tsx`
  - Add home/lobby metadata for `Doplň písmeno` after `COMPLETE_SYLLABLE`.
- Modify: `src/App.tsx`
  - Import and route `CompleteLetterGame` at `/complete-letter`.
- Modify: `README.md`
  - Update game count/list and architecture notes.
- Modify: `ROADMAP.md`
  - Mark `Doplň písmeno` as complete in the future game backlog when implemented, and add `Doplň slovo` as a later backlog item if it is not already present.

---

### Task 1: Settings Model and UI

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/services/settingsService.ts`
- Modify: `src/shared/components/settingsContentData.ts`
- Modify: `src/shared/components/SettingsContent.tsx`

- [ ] **Step 1: Extend shared types**

In `src/shared/types.ts`, add this type above `GameSettings`:

```ts
export type CompleteLetterMissingCount = 1 | 2 | 'adaptive';
```

Change `GameId` from:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY' | 'COMPLETE_SYLLABLE';
```

to:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY' | 'COMPLETE_SYLLABLE' | 'COMPLETE_LETTER';
```

Add the new setting to `GameSettings`:

```ts
export interface GameSettings {
  music: boolean;
  alphabetGridSize: 4 | 6 | 8;
  alphabetAccents: boolean;
  syllablesGridSize: 4 | 6;
  numbersRange: { start: number; end: number };
  countingRange: { start: number; end: number };
  completeLetterMissingCount: CompleteLetterMissingCount;
}
```

- [ ] **Step 2: Persist the setting**

In `src/shared/services/settingsService.ts`, update the default:

```ts
export const DEFAULT_SETTINGS: GameSettings = {
  music: false,
  alphabetGridSize: 8,
  alphabetAccents: true,
  syllablesGridSize: 6,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
  completeLetterMissingCount: 1,
};
```

Add this helper after `isValidRange`:

```ts
function isValidCompleteLetterMissingCount(value: unknown): value is GameSettings['completeLetterMissingCount'] {
  return value === 1 || value === 2 || value === 'adaptive';
}
```

Add this field in the object returned by `loadSettings()`:

```ts
completeLetterMissingCount: isValidCompleteLetterMissingCount(stored.completeLetterMissingCount)
  ? stored.completeLetterMissingCount
  : DEFAULT_SETTINGS.completeLetterMissingCount,
```

- [ ] **Step 3: Add settings visibility**

In `src/shared/components/settingsContentData.ts`, add the subtitle row:

```ts
COMPLETE_LETTER: 'Hra s dopĺňaním písmen',
```

Extend the visibility type with a new boolean:

```ts
completeLetterMissingCount: boolean;
```

Set `completeLetterMissingCount: true` for `home` and `COMPLETE_LETTER`.

Set `completeLetterMissingCount: false` for every other target:

```ts
home: {
  music: true,
  avatar: true,
  recordings: true,
  alphabetAccents: true,
  alphabetGridSize: true,
  syllablesGridSize: true,
  numbersRange: true,
  countingRange: true,
  completeLetterMissingCount: true,
},
```

Add a complete row for the new game:

```ts
COMPLETE_LETTER: {
  music: true,
  avatar: false,
  recordings: false,
  alphabetAccents: true,
  alphabetGridSize: false,
  syllablesGridSize: false,
  numbersRange: false,
  countingRange: false,
  completeLetterMissingCount: true,
},
```

- [ ] **Step 4: Add the settings control**

In `src/shared/components/SettingsContent.tsx`, define these constants near the helper interfaces:

```ts
const COMPLETE_LETTER_MISSING_COUNT_OPTIONS = [1, 2, 'adaptive'] as const;
```

Add this local helper component above `SettingsContent`:

```tsx
function CompleteLetterMissingCountCard({
  selected,
  onSelect,
}: {
  selected: GameSettings['completeLetterMissingCount'];
  onSelect: (value: GameSettings['completeLetterMissingCount']) => void;
}) {
  return (
    <SettingsSection>
      <h3 className="text-xl font-bold sm:text-2xl">Chýbajúce písmená</h3>
      <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
        Vyberte, koľko písmen má v slove chýbať.
      </p>
      <div className="mt-5">
        <SegmentedChoice
          options={COMPLETE_LETTER_MISSING_COUNT_OPTIONS}
          selected={selected}
          activeClassName="bg-success"
          columns={3}
          formatLabel={(value) => {
            if (value === 'adaptive') return 'Podľa dĺžky';
            return String(value);
          }}
          onSelect={onSelect}
        />
      </div>
    </SettingsSection>
  );
}
```

In the home settings content, place this after the alphabet group and before the syllables group:

```tsx
{visibility.completeLetterMissingCount && isHome && (
  <GameSettingsGroupCard title="Doplň písmeno">
    <CompleteLetterMissingCountCard
      selected={settings.completeLetterMissingCount}
      onSelect={(value) => onUpdate({ ...settings, completeLetterMissingCount: value })}
    />
  </GameSettingsGroupCard>
)}
```

For game-specific settings, place this after the alphabet accent block:

```tsx
{visibility.completeLetterMissingCount && !isHome && (
  <CompleteLetterMissingCountCard
    selected={settings.completeLetterMissingCount}
    onSelect={(value) => onUpdate({ ...settings, completeLetterMissingCount: value })}
  />
)}
```

- [ ] **Step 5: Verify settings compile**

Run:

```bash
npm run lint
```

Expected:

- exit code `0`
- the existing `react-refresh/only-export-components` warning in `src/shared/contexts/ContentContext.tsx` may still appear
- no TypeScript errors about missing `completeLetterMissingCount` visibility rows or settings fields

- [ ] **Step 6: Commit settings support**

```bash
git add src/shared/types.ts src/shared/services/settingsService.ts src/shared/components/settingsContentData.ts src/shared/components/SettingsContent.tsx
git commit -m "feat: add complete letter settings"
```

---

### Task 2: Complete-Letter Pure Logic

**Files:**
- Create: `src/games/complete-letter/completeLetterLogic.verify.ts`
- Create: `src/games/complete-letter/completeLetterLogic.ts`

- [ ] **Step 1: Write the failing verifier**

Create `src/games/complete-letter/completeLetterLogic.verify.ts`:

```ts
import { Letter, Word } from '../../shared/types';
import {
  buildEligibleCompleteLetterWords,
  buildLetterChoices,
  buildPromptSlots,
  chooseMissingIndexes,
  createCompleteLetterRound,
  getActiveCompleteLetterLetters,
  getActiveMissingIndex,
  parseWordLetterUnits,
  resolveMissingCount,
} from './completeLetterLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const letters: Letter[] = [
  { symbol: 'A', label: 'Auto', emoji: '🚗', audioKey: 'a' },
  { symbol: 'B', label: 'Bubon', emoji: '🥁', audioKey: 'b' },
  { symbol: 'C', label: 'Citrón', emoji: '🍋', audioKey: 'c' },
  { symbol: 'D', label: 'Dom', emoji: '🏠', audioKey: 'd' },
  { symbol: 'E', label: 'Električka', emoji: '🚋', audioKey: 'e' },
  { symbol: 'H', label: 'Hruška', emoji: '🍐', audioKey: 'h' },
  { symbol: 'J', label: 'Jablko', emoji: '🍎', audioKey: 'j' },
  { symbol: 'M', label: 'Mama', emoji: '👩', audioKey: 'm' },
  { symbol: 'T', label: 'Topánka', emoji: '👟', audioKey: 't' },
  { symbol: 'CH', label: 'Chlieb', emoji: '🍞', audioKey: 'ch' },
  { symbol: 'DZ', label: 'Dzedzina', emoji: '🏘️', audioKey: 'dz' },
  { symbol: 'DŽ', label: 'Džem', emoji: '🍯', audioKey: 'dz-caron' },
  { symbol: 'Á', label: 'Áno', emoji: '✅', audioKey: 'a-long' },
  { symbol: 'Č', label: 'Čaj', emoji: '🫖', audioKey: 'c-caron' },
  { symbol: 'Ž', label: 'Žaba', emoji: '🐸', audioKey: 'z-caron' },
];

const mama: Word = { word: 'Mama', syllables: 'ma-ma', emoji: '👩', audioKey: 'mama' };
const chata: Word = { word: 'Chata', syllables: 'cha-ta', emoji: '🏡', audioKey: 'chata' };
const dzem: Word = { word: 'Džem', syllables: 'džem', emoji: '🍯', audioKey: 'dzem' };
const caj: Word = { word: 'Čaj', syllables: 'čaj', emoji: '🫖', audioKey: 'caj' };
const badHyphen: Word = { word: 'A-ha', syllables: 'a-ha', emoji: '😮', audioKey: 'a-ha' };
const badUnknown: Word = { word: 'Figa', syllables: 'fi-ga', emoji: '🧺', audioKey: 'figa' };

assert(parseWordLetterUnits('Mama', letters)?.join('|') === 'M|A|M|A', 'normal letters are parsed as units');
assert(parseWordLetterUnits('Chata', letters)?.join('|') === 'CH|A|T|A', 'CH is parsed as one Slovak letter unit');
assert(parseWordLetterUnits('Dzem', letters)?.join('|') === 'DZ|E|M', 'DZ is parsed as one Slovak letter unit');
assert(parseWordLetterUnits('Džem', letters)?.join('|') === 'DŽ|E|M', 'DŽ is parsed as one Slovak letter unit');
assert(parseWordLetterUnits('A-ha', letters) === null, 'hyphenated words are excluded');
assert(parseWordLetterUnits('Figa', letters) === null, 'words with unavailable letters are excluded');

const activeWithoutAccents = getActiveCompleteLetterLetters(letters, false);
assert(activeWithoutAccents.some((letter) => letter.symbol === 'CH'), 'CH remains active when accents are disabled');
assert(activeWithoutAccents.some((letter) => letter.symbol === 'DZ'), 'DZ remains active when accents are disabled');
assert(!activeWithoutAccents.some((letter) => letter.symbol === 'DŽ'), 'DŽ is disabled with accented letters');
assert(!activeWithoutAccents.some((letter) => letter.symbol === 'Č'), 'Č is disabled with accented letters');

assert(resolveMissingCount(1, 6) === 1, 'fixed one mode resolves to one');
assert(resolveMissingCount(2, 6) === 2, 'fixed two mode resolves to two');
assert(resolveMissingCount('adaptive', 4) === 1, 'adaptive mode uses one blank for four units');
assert(resolveMissingCount('adaptive', 5) === 2, 'adaptive mode uses two blanks for five units');

assert(chooseMissingIndexes(5, 1, () => 0).join('|') === '0', 'one missing index can choose first position');
assert(chooseMissingIndexes(5, 2, () => 0.99).join('|') === '3|4', 'two missing indexes are distinct and sorted');
assert(chooseMissingIndexes(2, 2, () => 0.2).length === 2, 'two-unit words can hide two positions');

const round = createCompleteLetterRound(mama, letters, 2, () => 0);
assert(round.word.word === 'Mama', 'round keeps target word');
assert(round.units.join('|') === 'M|A|M|A', 'round stores normalized units');
assert(round.missingIndexes.join('|') === '0|1', 'round stores guided missing positions');

const firstSlots = buildPromptSlots(round, 0);
assert(firstSlots.map((slot) => `${slot.text}:${slot.state}`).join('|') === '__:active|__:pending|M:visible|A:visible', 'initial slots show active and pending blanks');
assert(getActiveMissingIndex(round, 0) === 0, 'first blank is active before fills');

const secondSlots = buildPromptSlots(round, 1);
assert(secondSlots.map((slot) => `${slot.text}:${slot.state}`).join('|') === 'M:filled|__:active|M:visible|A:visible', 'after one fill, next blank becomes active');
assert(getActiveMissingIndex(round, 1) === 1, 'second blank is active after one fill');

const finalSlots = buildPromptSlots(round, 2);
assert(finalSlots.map((slot) => `${slot.text}:${slot.state}`).join('|') === 'M:filled|A:filled|M:visible|A:visible', 'all blanks are filled after two correct taps');
assert(getActiveMissingIndex(round, 2) === null, 'no active blank remains after all fills');

const firstChoices = buildLetterChoices(round, letters, 0, 4);
assert(firstChoices.length === 4, 'choice generation returns four letters');
assert(firstChoices.some((letter) => letter.symbol === 'M'), 'choices include first active correct letter');
assert(new Set(firstChoices.map((letter) => letter.symbol)).size === 4, 'choices are unique');

const secondChoices = buildLetterChoices(round, letters, 1, 4);
assert(secondChoices.some((letter) => letter.symbol === 'A'), 'choices update for next active blank');

const eligible = buildEligibleCompleteLetterWords([mama, chata, dzem, caj, badHyphen, badUnknown], letters, true, 1, 4);
assert(eligible.some((word) => word.word === 'Mama'), 'plain word is eligible');
assert(eligible.some((word) => word.word === 'Chata'), 'CH word is eligible');
assert(eligible.some((word) => word.word === 'Džem'), 'DŽ word is eligible when accents are enabled');
assert(eligible.some((word) => word.word === 'Čaj'), 'accented word is eligible when accents are enabled');
assert(!eligible.some((word) => word.word === 'A-ha'), 'punctuated word is ineligible');
assert(!eligible.some((word) => word.word === 'Figa'), 'word with unavailable unit is ineligible');

const eligibleWithoutAccents = buildEligibleCompleteLetterWords([mama, chata, dzem, caj], letters, false, 1, 4);
assert(eligibleWithoutAccents.some((word) => word.word === 'Mama'), 'plain word remains eligible without accents');
assert(eligibleWithoutAccents.some((word) => word.word === 'Chata'), 'CH word remains eligible without accents');
assert(!eligibleWithoutAccents.some((word) => word.word === 'Džem'), 'DŽ word is ineligible without accents');
assert(!eligibleWithoutAccents.some((word) => word.word === 'Čaj'), 'Č word is ineligible without accents');

const tinyLetters = letters.filter((letter) => ['A', 'M', 'CH'].includes(letter.symbol));
const tinyEligible = buildEligibleCompleteLetterWords([mama], tinyLetters, true, 1, 4);
assert(tinyEligible.length === 0, 'word is excluded when four unique choices cannot be built');

console.log('completeLetterLogic checks passed');
```

- [ ] **Step 2: Run the verifier and confirm it fails**

Run:

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
```

Expected: failure because `src/games/complete-letter/completeLetterLogic.ts` does not exist.

- [ ] **Step 3: Implement pure logic**

Create `src/games/complete-letter/completeLetterLogic.ts` with these exports:

```ts
import { CompleteLetterMissingCount, Letter, Word } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export type CompleteLetterSlotState = 'visible' | 'pending' | 'active' | 'filled';

export interface CompleteLetterRound {
  word: Word;
  units: string[];
  missingIndexes: number[];
}

export interface CompleteLetterSlot {
  index: number;
  text: string;
  state: CompleteLetterSlotState;
}

const SLOVAK_MULTI_CHARACTER_LETTERS = ['DŽ', 'DZ', 'CH'];

function normalizeLetter(value: string): string {
  return value.trim().toLocaleUpperCase('sk-SK');
}

function hasDiacritic(value: string): boolean {
  return value.normalize('NFD') !== value;
}

function normalizeLetters(letters: Letter[]): Letter[] {
  const bySymbol = new Map<string, Letter>();
  for (const letter of letters) {
    const symbol = normalizeLetter(letter.symbol);
    if (!bySymbol.has(symbol)) {
      bySymbol.set(symbol, { ...letter, symbol });
    }
  }
  return Array.from(bySymbol.values());
}

export function getActiveCompleteLetterLetters(letters: Letter[], includeAccents: boolean): Letter[] {
  const normalized = normalizeLetters(letters);
  return includeAccents ? normalized : normalized.filter((letter) => !hasDiacritic(letter.symbol));
}

export function parseWordLetterUnits(word: string, activeLetters: Letter[]): string[] | null {
  const activeSymbols = new Set(normalizeLetters(activeLetters).map((letter) => letter.symbol));
  const orderedSymbols = Array.from(activeSymbols).sort((a, b) => b.length - a.length);
  const normalizedWord = normalizeLetter(word);
  const units: string[] = [];
  let index = 0;

  while (index < normalizedWord.length) {
    const rest = normalizedWord.slice(index);
    const match = orderedSymbols.find((symbol) => rest.startsWith(symbol))
      ?? SLOVAK_MULTI_CHARACTER_LETTERS.find((symbol) => rest.startsWith(symbol));

    if (!match || !activeSymbols.has(match)) {
      return null;
    }

    units.push(match);
    index += match.length;
  }

  return units.length >= 2 ? units : null;
}

export function resolveMissingCount(mode: CompleteLetterMissingCount, unitCount: number): number {
  if (unitCount <= 0) return 0;
  if (mode === 'adaptive') {
    return unitCount >= 5 ? 2 : 1;
  }
  return Math.min(mode, unitCount);
}

export function chooseMissingIndexes(
  unitCount: number,
  missingCount: number,
  random = Math.random,
): number[] {
  if (unitCount <= 0 || missingCount <= 0) return [];
  const available = Array.from({ length: unitCount }, (_, index) => index);
  const chosen: number[] = [];
  const resolvedCount = Math.min(missingCount, unitCount);

  while (chosen.length < resolvedCount) {
    const pickIndex = Math.min(available.length - 1, Math.floor(random() * available.length));
    const [picked] = available.splice(pickIndex, 1);
    chosen.push(picked);
  }

  return chosen.sort((a, b) => a - b);
}

export function createCompleteLetterRound(
  word: Word,
  activeLetters: Letter[],
  missingCountMode: CompleteLetterMissingCount,
  random = Math.random,
): CompleteLetterRound {
  const units = parseWordLetterUnits(word.word, activeLetters);
  if (!units) {
    throw new Error(`Word "${word.word}" cannot be split into active Slovak letter units.`);
  }

  const missingCount = resolveMissingCount(missingCountMode, units.length);
  const missingIndexes = chooseMissingIndexes(units.length, missingCount, random);
  if (missingIndexes.length === 0) {
    throw new Error(`Word "${word.word}" does not have a playable missing-letter position.`);
  }

  return { word, units, missingIndexes };
}

export function getActiveMissingIndex(round: CompleteLetterRound, filledCount: number): number | null {
  return round.missingIndexes[filledCount] ?? null;
}

export function buildPromptSlots(round: CompleteLetterRound, filledCount: number): CompleteLetterSlot[] {
  const activeMissingIndex = getActiveMissingIndex(round, filledCount);
  const missingByIndex = new Map(round.missingIndexes.map((index, order) => [index, order]));

  return round.units.map((unit, index) => {
    const missingOrder = missingByIndex.get(index);
    if (missingOrder === undefined) {
      return { index, text: unit, state: 'visible' };
    }
    if (missingOrder < filledCount) {
      return { index, text: unit, state: 'filled' };
    }
    if (index === activeMissingIndex) {
      return { index, text: '__', state: 'active' };
    }
    return { index, text: '__', state: 'pending' };
  });
}

export function buildLetterChoices(
  round: CompleteLetterRound,
  activeLetters: Letter[],
  filledCount: number,
  choiceCount = 4,
): Letter[] {
  const activeMissingIndex = getActiveMissingIndex(round, filledCount);
  if (activeMissingIndex === null) return [];

  const correctSymbol = round.units[activeMissingIndex];
  const uniqueLetters = normalizeLetters(activeLetters);
  const correct = uniqueLetters.find((letter) => letter.symbol === correctSymbol);
  if (!correct) return [];

  const distractors = fisherYatesShuffle(
    uniqueLetters.filter((letter) => letter.symbol !== correctSymbol),
  ).slice(0, Math.max(0, choiceCount - 1));

  if (distractors.length < choiceCount - 1) return [];
  return fisherYatesShuffle([correct, ...distractors]);
}

export function buildEligibleCompleteLetterWords(
  words: Word[],
  letters: Letter[],
  includeAccents: boolean,
  missingCountMode: CompleteLetterMissingCount,
  choiceCount = 4,
): Word[] {
  const activeLetters = getActiveCompleteLetterLetters(letters, includeAccents);
  if (activeLetters.length < choiceCount) return [];

  return words.filter((word) => {
    const units = parseWordLetterUnits(word.word, activeLetters);
    if (!units) return false;
    const missingCount = resolveMissingCount(missingCountMode, units.length);
    return missingCount > 0 && missingCount <= units.length;
  });
}
```

- [ ] **Step 4: Run verifier and fix if needed**

Run:

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
```

Expected:

```text
completeLetterLogic checks passed
```

The Node `DEP0205` warning may appear and is not a failure.

- [ ] **Step 5: Commit pure logic**

```bash
git add src/games/complete-letter/completeLetterLogic.ts src/games/complete-letter/completeLetterLogic.verify.ts
git commit -m "feat: add complete letter game logic"
```

---

### Task 3: Complete-Letter Game Component

**Files:**
- Create: `src/games/complete-letter/CompleteLetterGame.tsx`

- [ ] **Step 1: Create the component**

Create `src/games/complete-letter/CompleteLetterGame.tsx`. Use `CompleteSyllableGame.tsx` as the structural model, with these required differences:

```ts
interface CompleteLetterGameProps {
  settings: GameSettings;
  onExit: () => void;
  onOpenSettings: () => void;
}

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;
const CHOICE_COUNT = 4;
```

Required imports:

```ts
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { FailureSpec, GameSettings, Letter, SuccessSpec, Word } from '../../shared/types';
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
  buildEligibleCompleteLetterWords,
  buildLetterChoices,
  buildPromptSlots,
  CompleteLetterRound,
  createCompleteLetterRound,
  getActiveCompleteLetterLetters,
  getActiveMissingIndex,
} from './completeLetterLogic';
```

Required audio helpers:

```ts
function getPromptAudio(locale: string, round: CompleteLetterRound) {
  return {
    clips: [
      { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
    ],
  };
}

function getCompletedLine(round: CompleteLetterRound): string {
  return `${round.word.word} ${round.word.emoji}`;
}

function getSuccessSpec(locale: string, round: CompleteLetterRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
      ],
    },
  };
}

function getFailureSpec(locale: string, round: CompleteLetterRound): FailureSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [
        getPhraseClip(locale, 'neverMind'),
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
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
```

- [ ] **Step 2: Implement state and eligibility**

Inside the component:

```ts
const { wordItems, letterItems, locale } = useContent();
const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
const [targetRound, setTargetRound] = useState<CompleteLetterRound | null>(null);
const [roundQueue, setRoundQueue] = useState<Word[]>([]);
const [choices, setChoices] = useState<Letter[]>([]);
const [feedback, setFeedback] = useState<Record<string, 'correct' | 'wrong' | null>>({});
const [wrongAttemptsThisRound, setWrongAttemptsThisRound] = useState(0);
const [filledMissingCount, setFilledMissingCount] = useState(0);
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
```

Compute active and eligible items:

```ts
const activeLetters = useMemo(
  () => getActiveCompleteLetterLetters(letterItems, settings.alphabetAccents),
  [letterItems, settings.alphabetAccents],
);

const eligibleWords = useMemo(
  () => buildEligibleCompleteLetterWords(
    wordItems,
    letterItems,
    settings.alphabetAccents,
    settings.completeLetterMissingCount,
    CHOICE_COUNT,
  ),
  [letterItems, settings.alphabetAccents, settings.completeLetterMissingCount, wordItems],
);

const lobby = GAME_DEFINITIONS_BY_ID.COMPLETE_LETTER.lobby;
```

- [ ] **Step 3: Implement round selection**

Use the same timer cleanup helpers as `CompleteSyllableGame`.

`findPlayableRound` must scan candidate words and skip any invalid word:

```ts
const findPlayableRound = useCallback((candidateQueue: Word[]) => {
  for (let index = 0; index < candidateQueue.length; index += 1) {
    try {
      const round = createCompleteLetterRound(
        candidateQueue[index],
        activeLetters,
        settings.completeLetterMissingCount,
      );
      const roundChoices = buildLetterChoices(round, activeLetters, 0, CHOICE_COUNT);
      if (roundChoices.length === CHOICE_COUNT) {
        return {
          round,
          choices: roundChoices,
          remainingQueue: candidateQueue.slice(index + 1),
        };
      }
    } catch {
      continue;
    }
  }
  return null;
}, [activeLetters, settings.completeLetterMissingCount]);
```

`startRound` must clear timers, reset `filledMissingCount` to `0`, and return to lobby if no playable round exists. Match the `CompleteSyllableGame` fallback behavior: try the existing queue, then a fresh shuffled eligible queue.

- [ ] **Step 4: Implement choice handling**

Correct behavior:

```ts
const handleChoice = (letter: Letter) => {
  clearTimer(promptTimerRef);
  if (!targetRound || showSuccess || showFailure || showSessionComplete || pendingRoundEndRef.current) return;
  setTotalTaps((value) => value + 1);

  const activeMissingIndex = getActiveMissingIndex(targetRound, filledMissingCount);
  if (activeMissingIndex === null) return;
  const correctSymbol = targetRound.units[activeMissingIndex];

  if (letter.symbol === correctSymbol) {
    const nextFilledCount = filledMissingCount + 1;
    setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
    setFilledMissingCount(nextFilledCount);

    if (nextFilledCount < targetRound.missingIndexes.length) {
      setChoices(buildLetterChoices(targetRound, activeLetters, nextFilledCount, CHOICE_COUNT));
      const sessionToken = sessionTokenRef.current;
      const feedbackResetTimer = setTimeout(() => {
        feedbackResetTimersRef.current.delete(feedbackResetTimer);
        if (sessionTokenRef.current !== sessionToken) return;
        setFeedback((current) => ({ ...current, [letter.symbol]: null }));
      }, TIMING.FEEDBACK_RESET_MS);
      feedbackResetTimersRef.current.add(feedbackResetTimer);
      return;
    }

    pendingRoundEndRef.current = true;
    audioManager.stop();
    setSuccessSpec(getSuccessSpec(locale, targetRound));
    finishRound(true);
    return;
  }

  // Wrong path mirrors CompleteSyllableGame: increment wrong attempts across the whole word round.
};
```

Wrong behavior must mirror `CompleteSyllableGame`:

- increment `wrongAttemptsThisRound`
- set selected tile to `wrong`
- if attempts reach `MAX_ATTEMPTS`, set `filledMissingCount` to `targetRound.missingIndexes.length`, set failure spec, stop audio, and finish the round as incorrect
- otherwise play `getWrongAudio(locale, letter)` and reset tile feedback after `TIMING.FEEDBACK_RESET_MS`

- [ ] **Step 5: Render prompt and choices**

Prompt rendering requirements:

- Use the emoji size and top-bar structure from `CompleteSyllableGame`.
- Render letter units as wrapped inline boxes with no hyphens.
- Use distinct styles:
  - `visible` and `filled`: white tile with text
  - `active`: dashed primary border and text `__`
  - `pending`: dashed muted border and text `__`
- The prompt must not overflow on mobile. Use `flex-wrap`, `max-w-full`, and smaller letter boxes than the syllable game.

Use this class mapping in the component:

```ts
const slotClassName = {
  visible: 'rounded-2xl bg-white px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-text-main shadow-sm sm:px-4 sm:py-3',
  filled: 'rounded-2xl bg-white px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-text-main shadow-sm sm:px-4 sm:py-3',
  active: 'min-w-[3.25rem] rounded-2xl border-4 border-dashed border-primary/40 bg-white/80 px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-primary shadow-sm sm:min-w-[4rem] sm:px-4 sm:py-3',
  pending: 'min-w-[3.25rem] rounded-2xl border-4 border-dashed border-shadow/35 bg-white/65 px-3 py-2 font-spline text-[clamp(1.35rem,5vw,2.7rem)] font-black leading-none text-text-main/45 shadow-sm sm:min-w-[4rem] sm:px-4 sm:py-3',
} satisfies Record<string, string>;
```

Choice tile sizing should match the fixed-height option pattern that avoided overlap in `CompleteSyllableGame`:

```tsx
<ChoiceTile
  key={letter.symbol}
  onClick={() => handleChoice(letter)}
  aria-label={letter.symbol}
  state={feedback[letter.symbol] ?? 'neutral'}
  shape="option"
  className="h-[clamp(8.5rem,21vh,13rem)] rounded-[22px] sm:rounded-[28px]"
>
  <span className="font-spline text-[clamp(2.35rem,10vw,5.25rem)] font-bold leading-none">
    {letter.symbol}
  </span>
</ChoiceTile>
```

Lobby empty-state text:

```tsx
eligibleWords.length === 0
  ? <>Pridajte slová z aktívnych písmen alebo upravte nastavenia písmen.</>
  : undefined
```

- [ ] **Step 6: Run focused checks**

Run:

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
npm run lint
```

Expected:

- verifier prints `completeLetterLogic checks passed`
- lint exits `0` with the existing Fast Refresh warning only

- [ ] **Step 7: Commit component**

```bash
git add src/games/complete-letter/CompleteLetterGame.tsx
git commit -m "feat: add complete letter game shell"
```

---

### Task 4: Route, Catalog, Settings Registration, and Docs

**Files:**
- Modify: `src/shared/gameCatalog.tsx`
- Modify: `src/App.tsx`
- Modify: `README.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Add catalog metadata**

In `src/shared/gameCatalog.tsx`, keep the existing import line and add a new game object immediately after `COMPLETE_SYLLABLE`:

```tsx
{
  id: 'COMPLETE_LETTER',
  path: '/complete-letter',
  title: 'Doplň písmeno',
  description: 'Doplň písmenko v slove',
  icon: <Type size={48} className="sm:h-16 sm:w-16" />,
  color: 'bg-success',
  lobby: {
    title: 'DOPLŇ PÍSMENO',
    playButtonColorClassName: 'bg-success',
    topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
    bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-soft-watermelon opacity-20 translate-y-10 blur-md pointer-events-none',
  },
},
```

`Type` is already imported for `Abeceda`, so no icon import change is needed.

- [ ] **Step 2: Add route**

In `src/App.tsx`, import the component:

```ts
import { CompleteLetterGame } from './games/complete-letter/CompleteLetterGame';
```

Add this route immediately after `/complete-syllable`:

```tsx
<Route
  path="/complete-letter"
  element={
    <ErrorBoundary>
      <CompleteLetterGame settings={settings} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('COMPLETE_LETTER')} />
    </ErrorBoundary>
  }
/>
```

- [ ] **Step 3: Update README**

In `README.md`:

- Change `Eight mini-games` to `Nine mini-games`.
- Extend the feature list sentence to include `missing-letter completion`.
- Add this game bullet after `Doplň slabiku`:

```md
- `Doplň písmeno`: hear a word and fill missing Slovak letter units in order.
```

- Add this architecture bullet after the complete-syllable bullet:

```md
- `src/games/complete-letter/CompleteLetterGame.tsx` is a bespoke missing-letter mechanic with guided blanks and configurable difficulty.
```

- [ ] **Step 4: Update ROADMAP**

In `ROADMAP.md`, under `### 1.7 Future Game Backlog`, add:

```md
- [x] **Doplň písmeno** — show a word with one or more missing Slovak letter units and let the child fill them in guided order.
- [ ] **Doplň slovo** — future word-level completion game using the same guided missing-unit idea.
```

Keep existing `Ktoré chýba?` unchanged.

- [ ] **Step 5: Run checks**

Run:

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
npm run lint
```

Expected:

- verifier passes
- lint exits `0` with the existing Fast Refresh warning only

- [ ] **Step 6: Commit registration and docs**

```bash
git add src/shared/gameCatalog.tsx src/App.tsx README.md ROADMAP.md
git commit -m "feat: register complete letter game"
```

---

### Task 5: Browser Verification and Layout Polish

**Files:**
- Modify only files required by the visual check.

- [ ] **Step 1: Build production bundle**

Run:

```bash
npm run build
```

Expected:

- exit code `0`
- Vite may warn about large chunks
- PWA precache output is expected

- [ ] **Step 2: Start preview server**

Run:

```bash
npm run preview -- --host 127.0.0.1 --port 4173
```

Keep the session running until screenshots are complete.

- [ ] **Step 3: Verify desktop and mobile with Playwright**

Run this from another shell. If Chromium fails with the macOS `MachPortRendezvousServer` sandbox error, rerun the exact command outside the sandbox with escalation.

```bash
node -e "const { chromium } = require('playwright'); (async () => { const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--use-gl=angle'] }); const results = []; for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: 'mobile', width: 390, height: 844 }]) { const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } }); const errors = []; page.on('pageerror', e => errors.push(e.message)); page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); }); await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' }); await page.getByText('Doplň písmeno').click(); await page.waitForTimeout(400); await page.screenshot({ path: '/tmp/complete-letter-lobby-' + vp.name + '.png', fullPage: false }); await page.getByRole('button', { name: /hrať/i }).click(); await page.waitForTimeout(1000); await page.screenshot({ path: '/tmp/complete-letter-playing-' + vp.name + '.png', fullPage: false }); const body = await page.locator('body').innerText(); results.push({ viewport: vp.name, url: page.url(), hasPromptControls: body.includes('__') || body.includes('Prehrať zvuk'), errors }); await page.close(); } await browser.close(); console.log(JSON.stringify(results, null, 2)); })().catch(e => { console.error(e); process.exit(1); });"
```

Expected:

- route URL is `http://127.0.0.1:4173/complete-letter`
- `hasPromptControls` is `true` for desktop and mobile
- `errors` arrays are empty
- screenshots exist in `/tmp`

- [ ] **Step 4: Inspect screenshots**

Use the local image viewer for:

```text
/tmp/complete-letter-lobby-desktop.png
/tmp/complete-letter-lobby-mobile.png
/tmp/complete-letter-playing-desktop.png
/tmp/complete-letter-playing-mobile.png
```

Pass criteria:

- no overlapping top bar, prompt, choices, or overlays
- letter prompt wraps cleanly on mobile
- active blank is visually distinct from pending blank
- choice tiles are large enough and text fits
- PWA prompt on home does not cover the new game card in a way that prevents navigation

- [ ] **Step 5: Fix and commit visual polish only if needed**

If visual fixes are required, keep them scoped. After fixes:

```bash
npm run lint
npm run build
```

Then commit:

```bash
git add src/games/complete-letter/CompleteLetterGame.tsx
git commit -m "fix: polish complete letter layout"
```

- [ ] **Step 6: Stop preview server**

Stop the preview server with `Ctrl-C`.

---

### Task 6: Final Verification

**Files:**
- No planned file edits.

- [ ] **Step 1: Run focused verifiers**

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
npx tsx src/shared/components/sessionCompleteAudio.verify.ts
npx tsx src/shared/components/successOverlayAudio.verify.ts
```

Expected:

- each verifier exits `0`
- each prints its `checks passed` line
- Node `DEP0205` warnings are acceptable

- [ ] **Step 2: Run audio content validation**

```bash
npm run test:audio
```

Expected:

- all six audio categories pass

- [ ] **Step 3: Run lint**

```bash
npm run lint
```

Expected:

- exit code `0`
- existing Fast Refresh warning in `ContentContext.tsx` may appear

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected:

- exit code `0`
- Vite large chunk warning may appear
- PWA precache output is expected

- [ ] **Step 5: Check git state**

```bash
git status --short --branch
git log --oneline --decorate --max-count=12
```

Expected:

- worktree is clean
- latest commits include the complete-letter logic, settings, registration/docs, and optional layout polish

---

## Review Guidance for the Implementing Agent

Before handing back:

- Confirm `Doplň písmeno` respects `alphabetAccents`.
- Confirm `completeLetterMissingCount` persists across reload.
- Confirm the game can play at least one full five-round session.
- Confirm wrong attempts are counted across the whole word, not per blank.
- Confirm completing an intermediate blank does not show success early.
- Confirm failure reveals the completed word in the prompt and speaks the full word fallback.
- Confirm no implementation refactors `Doplň slabiku`.

If using `superpowers:subagent-driven-development`, run a spec compliance review after each implementation task and then a code-quality review. Fix any Critical or Important findings before moving to the next task.
