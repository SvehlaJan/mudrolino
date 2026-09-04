# Simple Addition Game ("Sčítaj") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new mini-game, "Sčítaj" (Addition), where the child sees two small groups (objects or numerals, per settings) separated by "+", and taps the numeral matching their sum from 4 answer tiles.

**Architecture:** A bespoke game component (`AdditionGame.tsx`), NOT built on `FindItGame` — the target (a two-addend problem) and the answer-grid tiles (plain numerals) are different shapes, which `GameDescriptor<T>`'s single-type model doesn't accommodate cleanly. It hand-rolls the same forgiving-retry loop (`MAX_ATTEMPTS` → `FailureOverlay`) that `CompleteSyllableGame.tsx` already uses, including its `sessionTokenRef` guard against stale timers firing after the child backs out mid-round. Round/answer math lives in a pure `additionLogic.ts` + `.verify.ts`, per this repo's convention for bespoke games. Two pieces are extracted to `src/shared/` for reuse by anticipated future arithmetic games: the collision-free scatter layout (relocated from Compare Quantities) and a new `QuantityCluster` presentational component.

**Tech Stack:** React + TypeScript, Vite, Tailwind (via `src/shared/ui/*`), `react-router-dom`, Playwright for e2e.

**Testing note (repo-specific, same as the Compare Quantities plan):** no unit/component test runner. Pure logic gets a `.verify.ts` (`npx tsx`); UI behavior gets a Playwright golden-path spec; `npm run lint` after every file change is the closest thing to a type-checked "red/green" signal.

---

## Task 0: Create a feature branch

- [x] **Step 1**

```bash
git checkout main
git pull
git checkout -b feat/addition-game
```

---

## Task 1: Relocate the scatter-grid layout logic

**Files:**
- Create: `src/shared/scatterGridLogic.ts`
- Create: `src/shared/scatterGridLogic.verify.ts`
- Delete: `src/games/compare/compareGridLogic.ts`
- Delete: `src/games/compare/compareGridLogic.verify.ts`
- Modify: `src/games/compare/CompareQuantitiesGame.tsx`

This is a pure relocation (same function, same behavior) so that Addition doesn't have to import from another game's folder. Per the design doc, names stay exactly as they are — only the file location changes.

- [x] **Step 1: Create the relocated logic file**

`src/shared/utils.ts` already exists as a **file** (it exports `fisherYatesShuffle`), so the relocated module lives at `src/shared/scatterGridLogic.ts` — flat, alongside `contentRegistry.ts` and `gameCatalog.tsx` — rather than under a new `utils/` directory, which would collide with that existing file.

Create `src/shared/scatterGridLogic.ts`:

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { fisherYatesShuffle } from './utils';

export interface CompareGridSlot {
  slotIndex: number;
  emoji: string;
  rotation: number; // -15 to +15 deg
  offsetX: number;  // -4 to +4 px
  offsetY: number;  // -4 to +4 px
}

export const COMPARE_GRID_TOTAL_SLOTS = 12; // 3 cols x 4 rows

export function generateCompareGridSlots(count: number, emoji: string): CompareGridSlot[] {
  const safeCount = Math.max(0, Math.min(count, COMPARE_GRID_TOTAL_SLOTS));
  const selectedSlots = fisherYatesShuffle(
    Array.from({ length: COMPARE_GRID_TOTAL_SLOTS }, (_, i) => i),
  )
    .slice(0, safeCount)
    .sort((a, b) => a - b);

  return selectedSlots.map((slotIndex) => ({
    slotIndex,
    emoji,
    rotation: Math.round((Math.random() * 30 - 15) * 10) / 10,
    offsetX: Math.round((Math.random() * 8 - 4) * 10) / 10,
    offsetY: Math.round((Math.random() * 8 - 4) * 10) / 10,
  }));
}
```

- [x] **Step 2: Create the relocated verify script**

Create `src/shared/scatterGridLogic.verify.ts`:

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { COMPARE_GRID_TOTAL_SLOTS, generateCompareGridSlots } from './scatterGridLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// 1. Verify counts 1 to 10 across randomized iterations
for (let count = 1; count <= 10; count++) {
  for (let iteration = 0; iteration < 50; iteration++) {
    const slots = generateCompareGridSlots(count, '🍎');

    assert(
      slots.length === count,
      `Expected ${count} slots, but got ${slots.length}`,
    );

    for (const slot of slots) {
      assert(
        Number.isInteger(slot.slotIndex) &&
          slot.slotIndex >= 0 &&
          slot.slotIndex < COMPARE_GRID_TOTAL_SLOTS,
        `slotIndex ${slot.slotIndex} out of bounds [0, ${COMPARE_GRID_TOTAL_SLOTS - 1}]`,
      );
      assert(
        slot.emoji === '🍎',
        `Expected emoji to be 🍎, got ${slot.emoji}`,
      );
      assert(
        slot.rotation >= -15 && slot.rotation <= 15,
        `Rotation ${slot.rotation} out of bounds [-15, 15]`,
      );
      assert(
        slot.offsetX >= -4 && slot.offsetX <= 4,
        `offsetX ${slot.offsetX} out of bounds [-4, 4]`,
      );
      assert(
        slot.offsetY >= -4 && slot.offsetY <= 4,
        `offsetY ${slot.offsetY} out of bounds [-4, 4]`,
      );
    }

    const uniqueIndices = new Set(slots.map((s) => s.slotIndex));
    assert(
      uniqueIndices.size === count,
      `Expected ${count} unique slot indices, got ${uniqueIndices.size}`,
    );
  }
}

// 2. Edge case: count = 0
assert(generateCompareGridSlots(0, '🍎').length === 0, 'count=0 should return empty array');

// 3. Edge case: count exceeding total slots
const capped = generateCompareGridSlots(20, '🍎');
assert(
  capped.length === COMPARE_GRID_TOTAL_SLOTS,
  `count > ${COMPARE_GRID_TOTAL_SLOTS} should be capped to ${COMPARE_GRID_TOTAL_SLOTS}`,
);

console.log('scatterGridLogic verify tests passed successfully!');
```

- [x] **Step 3: Run the relocated verify script**

```bash
npx tsx src/shared/scatterGridLogic.verify.ts
```

Expected: `scatterGridLogic verify tests passed successfully!`

- [x] **Step 4: Delete the old files**

```bash
git rm src/games/compare/compareGridLogic.ts src/games/compare/compareGridLogic.verify.ts
```

- [x] **Step 5: Update `CompareQuantitiesGame.tsx`'s import**

Find:

```ts
import { generateCompareGridSlots, COMPARE_GRID_TOTAL_SLOTS, CompareGridSlot } from './compareGridLogic';
```

Replace with:

```ts
import { generateCompareGridSlots, COMPARE_GRID_TOTAL_SLOTS, CompareGridSlot } from '../../shared/scatterGridLogic';
```

- [x] **Step 6: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [x] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: relocate scatter-grid layout logic to src/shared for reuse"
```

---

## Task 2: Shared `QuantityCluster` presentational component

**Files:**
- Create: `src/shared/components/QuantityCluster.tsx`
- Modify: `src/games/compare/CompareQuantitiesGame.tsx` (use the new component instead of its inline JSX)

`CompareQuantitiesGame.tsx` currently inlines the "12-slot scatter grid vs. big numeral" rendering directly (its `mode === 'numerals' ? <span>...</span> : <div className="grid grid-cols-3...">`). Extracting it once removes that duplication now (Addition needs the identical rendering twice per round) and gives any future arithmetic game the same component unchanged.

- [x] **Step 1: Create the component**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { CompareGridSlot, COMPARE_GRID_TOTAL_SLOTS } from '../scatterGridLogic';

interface QuantityClusterProps {
  mode: 'objects' | 'numerals';
  value: number;
  /** Precomputed scatter layout for 'objects' mode — generate once per round (e.g. in round-start logic), never per render, or the objects will visibly jump around on unrelated re-renders. Ignored in 'numerals' mode. */
  slots?: CompareGridSlot[];
  numeralClassName?: string;
}

export function QuantityCluster({ mode, value, slots = [], numeralClassName }: QuantityClusterProps) {
  if (mode === 'numerals') {
    return (
      <span className={numeralClassName ?? 'font-spline text-5xl font-black leading-none sm:text-7xl'}>
        {value}
      </span>
    );
  }

  return (
    <div className="grid h-full w-full grid-cols-3 auto-rows-fr place-items-center p-1 sm:p-2">
      {Array.from({ length: COMPARE_GRID_TOTAL_SLOTS }, (_, slotIndex) => {
        const item = slots.find((s) => s.slotIndex === slotIndex);
        if (!item) {
          return <div key={`empty-${slotIndex}`} className="h-full w-full" aria-hidden="true" />;
        }
        return (
          <span
            key={`slot-${slotIndex}`}
            aria-hidden="true"
            className="relative flex items-center justify-center text-3xl leading-none select-none sm:text-4xl md:text-5xl"
            style={{
              transform: `rotate(${item.rotation}deg) translate(${item.offsetX}px, ${item.offsetY}px)`,
            }}
          >
            {item.emoji}
          </span>
        );
      })}
    </div>
  );
}
```

- [x] **Step 2: Use it from `CompareQuantitiesGame.tsx`**

Find the import block and add the new component:

```ts
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { setE2EState } from '../../shared/services/e2eState';
import { generateCompareGridSlots, COMPARE_GRID_TOTAL_SLOTS, CompareGridSlot } from '../../shared/scatterGridLogic';
```

Replace with:

```ts
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { setE2EState } from '../../shared/services/e2eState';
import { generateCompareGridSlots, CompareGridSlot } from '../../shared/scatterGridLogic';
import { QuantityCluster } from '../../shared/components/QuantityCluster';
```

(`COMPARE_GRID_TOTAL_SLOTS` is no longer used directly in this file — `QuantityCluster` owns that constant now.)

Find the tile-content JSX:

```tsx
                {mode === 'numerals' ? (
                  <span className="text-5xl font-spline sm:text-7xl">{round[side].value}</span>
                ) : (
                  <div className="grid grid-cols-3 auto-rows-fr h-full w-full p-1 sm:p-2 place-items-center">
                    {Array.from({ length: COMPARE_GRID_TOTAL_SLOTS }, (_, slotIndex) => {
                      const item = (side === 'left' ? round.leftSlots : round.rightSlots).find(
                        (s) => s.slotIndex === slotIndex,
                      );
                      if (!item) {
                        return <div key={`empty-${slotIndex}`} className="w-full h-full" aria-hidden="true" />;
                      }
                      return (
                        <span
                          key={`slot-${slotIndex}`}
                          aria-hidden="true"
                          className="relative flex items-center justify-center text-3xl sm:text-4xl md:text-5xl leading-none select-none"
                          style={{
                            transform: `rotate(${item.rotation}deg) translate(${item.offsetX}px, ${item.offsetY}px)`,
                          }}
                        >
                          {item.emoji}
                        </span>
                      );
                    })}
                  </div>
                )}
```

Replace with:

```tsx
                <QuantityCluster
                  mode={mode}
                  value={round[side].value}
                  slots={side === 'left' ? round.leftSlots : round.rightSlots}
                  numeralClassName="text-5xl font-spline sm:text-7xl"
                />
```

- [x] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [x] **Step 4: Manual smoke check**

```bash
npm run dev
```

Open `/compare`, play a round in both objects and numerals mode (toggle in Settings), confirm rendering is pixel-identical to before (scattered emoji piles / big numerals). Stop the server once confirmed.

- [x] **Step 5: Commit**

```bash
git add src/shared/components/QuantityCluster.tsx src/games/compare/CompareQuantitiesGame.tsx
git commit -m "refactor: extract QuantityCluster component, dedupe Compare's inline rendering"
```

---

## Task 3: Addition round/answer logic (pure)

**Files:**
- Create: `src/games/addition/additionLogic.ts`
- Create: `src/games/addition/additionLogic.verify.ts`

Pure functions only — no rendering, no React. Addend/sum values are constructed directly as `NumberItem`-shaped objects (`{ value, audioKey: String(value) }`) rather than looked up from the locale's `NUMBER_ITEMS` pool, because that pool only covers 1–20 while `additionSumRange` goes up to 100 — audio for anything beyond 20 falls back to TTS automatically, the same as every other missing-audio case in this app (see `.claude/rules/audio.md`).

- [x] **Step 1: Write the module**

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NumberItem } from '../../shared/types';
import { fisherYatesShuffle } from '../../shared/utils';

export interface AdditionProblem {
  a: NumberItem;
  b: NumberItem;
  sum: NumberItem;
}

export function toNumberItem(value: number): NumberItem {
  return { value, audioKey: String(value) };
}

/** Stable key for a pair regardless of order, used to avoid repeating the same problem back-to-back. */
export function pairKey(a: number, b: number): string {
  return [a, b].sort((x, y) => x - y).join('-');
}

/**
 * Picks a target sum uniformly in [2, sumRange], then splits it into two addends
 * a (uniform in [1, sum-1]) and b = sum - a. Requires sumRange >= 2.
 */
export function createAdditionProblem(sumRange: number, random: () => number = Math.random): AdditionProblem {
  if (sumRange < 2) {
    throw new Error(`sumRange must be >= 2, got ${sumRange}`);
  }
  const sumValue = 2 + Math.floor(random() * (sumRange - 1)); // integer in [2, sumRange]
  const aValue = 1 + Math.floor(random() * (sumValue - 1));   // integer in [1, sumValue - 1]
  const bValue = sumValue - aValue;
  return {
    a: toNumberItem(aValue),
    b: toNumberItem(bValue),
    sum: toNumberItem(sumValue),
  };
}

/**
 * Builds `count` numeral answer options including the correct sum. Distractors are
 * near-misses — sum +/- a small offset — so a child can't just tap "the number that
 * looks smallest/biggest" without actually computing. The offset band scales with
 * sumRange (wider band at bigger ranges, since a fixed +/-1..3 would become trivially
 * close at range=100). If the near-miss band can't supply enough distinct in-range
 * candidates (e.g. sum sits right at the top of a small range), a second pass fills
 * the rest from anywhere in [1, sumRange] — this guarantees `count` distinct options
 * whenever sumRange >= count (true for all 4 configured ranges: 5, 10, 20, 100).
 * Returns fewer than `count` items only if the range genuinely doesn't have enough
 * distinct values at all (sumRange < count) — callers should treat a short result as
 * "try a different problem".
 */
export function buildAnswerOptions(
  sum: NumberItem,
  sumRange: number,
  count: number,
  random: () => number = Math.random,
): NumberItem[] {
  const offsetMax = Math.max(2, Math.ceil(sumRange / 10));
  const distractorValues = new Set<number>();

  // Pass 1: prefer near-miss values within the offset band.
  let guard = 0;
  while (distractorValues.size < count - 1 && guard < 200) {
    guard += 1;
    const offset = 1 + Math.floor(random() * offsetMax);
    const sign = random() < 0.5 ? -1 : 1;
    const candidate = sum.value + sign * offset;
    if (candidate < 1 || candidate > sumRange || candidate === sum.value) continue;
    distractorValues.add(candidate);
  }

  // Pass 2: fall back to any other valid value if the near-miss band came up short
  // (e.g. sum is at the very edge of a small range, so half the offsets go out of bounds).
  guard = 0;
  while (distractorValues.size < count - 1 && guard < 200) {
    guard += 1;
    const candidate = 1 + Math.floor(random() * sumRange);
    if (candidate === sum.value || distractorValues.has(candidate)) continue;
    distractorValues.add(candidate);
  }

  if (distractorValues.size < count - 1) return [sum];

  const distractors = Array.from(distractorValues).map(toNumberItem);
  return fisherYatesShuffle([sum, ...distractors]);
}
```

- [x] **Step 2: Write the verify script**

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildAnswerOptions, createAdditionProblem, pairKey, toNumberItem } from './additionLogic';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// toNumberItem
assert(toNumberItem(7).value === 7, 'toNumberItem keeps the value');
assert(toNumberItem(7).audioKey === '7', 'toNumberItem derives audioKey from value');
assert(toNumberItem(47).audioKey === '47', 'toNumberItem works beyond the recorded 1-20 range');

// pairKey
assert(pairKey(2, 3) === pairKey(3, 2), 'pairKey is order-independent');
assert(pairKey(2, 3) !== pairKey(2, 4), 'pairKey differs for different pairs');

// createAdditionProblem: deterministic random for exact assertions
const problem = createAdditionProblem(10, () => 0); // random()=0 picks the minimum of every range
assert(problem.sum.value === 2, `random=0 should pick the minimum sum (2), got ${problem.sum.value}`);
assert(problem.a.value === 1, `random=0 should pick the minimum addend (1), got ${problem.a.value}`);
assert(problem.b.value === 1, `1 + 1 should equal the sum, got a=${problem.a.value} b=${problem.b.value}`);

const problemMax = createAdditionProblem(10, () => 0.999999);
assert(problemMax.sum.value === 10, `random~1 should pick the maximum sum (10), got ${problemMax.sum.value}`);
assert(problemMax.a.value + problemMax.b.value === problemMax.sum.value, 'addends always sum to the target');

// createAdditionProblem: randomized invariants across every configured range
for (const sumRange of [5, 10, 20, 100]) {
  for (let i = 0; i < 200; i++) {
    const p = createAdditionProblem(sumRange);
    assert(p.a.value >= 1 && p.b.value >= 1, `addends must be >= 1, got a=${p.a.value} b=${p.b.value}`);
    assert(p.sum.value >= 2 && p.sum.value <= sumRange, `sum ${p.sum.value} out of [2, ${sumRange}]`);
    assert(p.a.value + p.b.value === p.sum.value, `addends must sum to the target: ${p.a.value}+${p.b.value}!==${p.sum.value}`);
    assert(p.sum.audioKey === String(p.sum.value), 'sum audioKey matches its value');
  }
}

assert(
  (() => { try { createAdditionProblem(1); return false; } catch { return true; } })(),
  'sumRange < 2 throws',
);

// buildAnswerOptions: always 4 distinct, in-range options across every configured range,
// including sums sitting right at the edges (where the near-miss band alone isn't enough).
for (const sumRange of [5, 10, 20, 100]) {
  for (let i = 0; i < 200; i++) {
    const problem = createAdditionProblem(sumRange);
    const options = buildAnswerOptions(problem.sum, sumRange, 4);
    assert(options.length === 4, `expected 4 options, got ${options.length} for sumRange=${sumRange} sum=${problem.sum.value}`);
    assert(
      options.some((o) => o.value === problem.sum.value),
      'the correct sum must be among the options',
    );
    const uniqueValues = new Set(options.map((o) => o.value));
    assert(uniqueValues.size === 4, `options must be distinct, got ${[...uniqueValues]}`);
    for (const option of options) {
      assert(option.value >= 1 && option.value <= sumRange, `option ${option.value} out of [1, ${sumRange}]`);
    }
  }
}

// buildAnswerOptions: near-miss band actually engages when there's ample room (sum comfortably
// inside a large range) — at least one distractor should land within the offset band, not just
// anywhere in [1, sumRange].
{
  const sum = toNumberItem(50);
  const options = buildAnswerOptions(sum, 100, 4);
  const offsetMax = Math.max(2, Math.ceil(100 / 10)); // 10
  const distractors = options.filter((o) => o.value !== 50);
  const nearCount = distractors.filter((o) => Math.abs(o.value - 50) <= offsetMax).length;
  assert(nearCount >= 1, 'at least one distractor should land within the near-miss band when there is ample room');
}

// buildAnswerOptions: sum at the very top of the smallest configured range still produces
// a full set of distinct options, via the pass-2 fallback (the near-miss band alone can't,
// since half the offsets would go above the range ceiling).
{
  const sum = toNumberItem(5);
  const options = buildAnswerOptions(sum, 5, 4);
  assert(options.length === 4, 'edge-of-range sums must still produce a full set of options via the fallback pass');
  assert(new Set(options.map((o) => o.value)).size === 4, 'edge-of-range options must be distinct');
}

// buildAnswerOptions: genuinely too-small a range (fewer distinct values than options needed)
// still returns a short result rather than looping forever or crashing.
const tinyOptions = buildAnswerOptions(toNumberItem(2), 2, 4);
assert(tinyOptions.length === 1 && tinyOptions[0].value === 2, 'falls back to just the sum when the range has too few distinct values overall');

console.log('additionLogic verify tests passed successfully!');
```

- [x] **Step 3: Run the verify script**

```bash
npx tsx src/games/addition/additionLogic.verify.ts
```

Expected: `additionLogic verify tests passed successfully!`

- [x] **Step 4: Commit**

```bash
git add src/games/addition/additionLogic.ts src/games/addition/additionLogic.verify.ts
git commit -m "feat: add pure addition problem/answer generation logic"
```

---

## Task 4: Domain types

**Files:**
- Modify: `src/shared/types.ts`

- [x] **Step 1: Add the `GameId`**

Find:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY' | 'COMPLETE_SYLLABLE' | 'COMPLETE_LETTER' | 'COMPARE_QUANTITIES';
```

Replace with:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY' | 'COMPLETE_SYLLABLE' | 'COMPLETE_LETTER' | 'COMPARE_QUANTITIES' | 'ADDITION';
```

- [x] **Step 2: Add the settings fields**

Find:

```ts
export interface GameSettings {
  music: boolean;
  alphabetGridSize: 4 | 6 | 8;
  alphabetAccents: boolean;
  syllablesGridSize: 4 | 6;
  numbersRange: { start: number; end: number };
  countingRange: { start: number; end: number };
  completeLetterMissingCount: CompleteLetterMissingCount;
  compareRange: { start: number; end: number };
  compareMode: 'objects' | 'numerals';
}
```

Replace with:

```ts
export interface GameSettings {
  music: boolean;
  alphabetGridSize: 4 | 6 | 8;
  alphabetAccents: boolean;
  syllablesGridSize: 4 | 6;
  numbersRange: { start: number; end: number };
  countingRange: { start: number; end: number };
  completeLetterMissingCount: CompleteLetterMissingCount;
  compareRange: { start: number; end: number };
  compareMode: 'objects' | 'numerals';
  additionSumRange: 5 | 10 | 20 | 100;
  additionRepresentation: 'objects' | 'numerals';
}
```

- [x] **Step 3: Add the audio phrase key**

Find:

```ts
export type AudioPhraseKey =
  | 'find' | 'thisIs' | 'number' | 'letter' | 'syllable' | 'word'
  | 'findLetter' | 'thisIsLetter' | 'thisIsSyllable' | 'thisIsWord'
  | 'countItems' | 'whatIsWrittenHere' | 'orderSyllables'
  | 'retry' | 'neverMind' | 'itIs' | 'yesThereAre' | 'noThereAre' | 'correctAnswerIs' | 'whereIsMore';
```

Replace with:

```ts
export type AudioPhraseKey =
  | 'find' | 'thisIs' | 'number' | 'letter' | 'syllable' | 'word'
  | 'findLetter' | 'thisIsLetter' | 'thisIsSyllable' | 'thisIsWord'
  | 'countItems' | 'whatIsWrittenHere' | 'orderSyllables'
  | 'retry' | 'neverMind' | 'itIs' | 'yesThereAre' | 'noThereAre' | 'correctAnswerIs' | 'whereIsMore'
  | 'howManyTogether';
```

- [x] **Step 4: Type-check (expect failures — fixed in Tasks 5-6)**

```bash
npm run lint
```

Expected: FAIL (`sk.ts`/`cs.ts` missing `howManyTogether`; `settingsService.ts`'s `DEFAULT_SETTINGS` missing the two new fields).

- [x] **Step 5: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add ADDITION game id, settings, and audio phrase key"
```

---

## Task 5: Locale content — new phrase

**Files:**
- Modify: `src/shared/locales/sk.ts`
- Modify: `src/shared/locales/cs.ts`

- [x] **Step 1: Slovak**

Find:

```ts
  correctAnswerIs:   { text: 'Správna odpoveď je', audioKey: 'spravna-odpoved' },
  whereIsMore:       { text: 'Kde je viac?',        audioKey: 'kde-je-viac' },
};
```

Replace with:

```ts
  correctAnswerIs:   { text: 'Správna odpoveď je', audioKey: 'spravna-odpoved' },
  whereIsMore:       { text: 'Kde je viac?',        audioKey: 'kde-je-viac' },
  howManyTogether:   { text: 'Koľko je dokopy?',    audioKey: 'kolko-je-dokopy' },
};
```

- [x] **Step 2: Czech**

Find:

```ts
  correctAnswerIs:   { text: 'Správná odpověď je', audioKey: 'spravna-odpoved' },
  whereIsMore:       { text: 'Kde je více?',        audioKey: 'kde-je-vice' },
```

Replace with:

```ts
  correctAnswerIs:   { text: 'Správná odpověď je', audioKey: 'spravna-odpoved' },
  whereIsMore:       { text: 'Kde je více?',        audioKey: 'kde-je-vice' },
  howManyTogether:   { text: 'Kolik je dohromady?', audioKey: 'kolik-je-dohromady' },
```

(Keep the closing `};` on its own line right after — do not duplicate it.)

- [x] **Step 3: Type-check**

```bash
npm run lint
```

Expected: still FAILS, only on `settingsService.ts` now (fixed in Task 6).

- [x] **Step 4: Commit**

```bash
git add src/shared/locales/sk.ts src/shared/locales/cs.ts
git commit -m "feat: add 'Koľko je dokopy?' audio phrase for the addition game"
```

---

## Task 6: Settings persistence

**Files:**
- Modify: `src/shared/services/settingsService.ts`

- [x] **Step 1: Add defaults**

Find:

```ts
export const DEFAULT_SETTINGS: GameSettings = {
  music: false,
  alphabetGridSize: 8,
  alphabetAccents: true,
  syllablesGridSize: 6,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
  completeLetterMissingCount: 1,
  compareRange: { start: 1, end: 5 },
  compareMode: 'objects',
};
```

Replace with:

```ts
export const DEFAULT_SETTINGS: GameSettings = {
  music: false,
  alphabetGridSize: 8,
  alphabetAccents: true,
  syllablesGridSize: 6,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
  completeLetterMissingCount: 1,
  compareRange: { start: 1, end: 5 },
  compareMode: 'objects',
  additionSumRange: 5,
  additionRepresentation: 'objects',
};
```

- [x] **Step 2: Add validators**

Find:

```ts
function isValidCompareMode(value: unknown): value is GameSettings['compareMode'] {
  return value === 'objects' || value === 'numerals';
}
```

Add immediately after it:

```ts

function isValidAdditionSumRange(value: unknown): value is GameSettings['additionSumRange'] {
  return value === 5 || value === 10 || value === 20 || value === 100;
}

function isValidAdditionRepresentation(value: unknown): value is GameSettings['additionRepresentation'] {
  return value === 'objects' || value === 'numerals';
}
```

- [x] **Step 3: Load and validate, with the same self-consistency guarantee as every other stored field**

Find:

```ts
      compareRange: isValidRange(stored.compareRange) ? stored.compareRange : DEFAULT_SETTINGS.compareRange,
      compareMode: isValidCompareMode(stored.compareMode) ? stored.compareMode : DEFAULT_SETTINGS.compareMode,
    };
```

Replace with:

```ts
      compareRange: isValidRange(stored.compareRange) ? stored.compareRange : DEFAULT_SETTINGS.compareRange,
      compareMode: isValidCompareMode(stored.compareMode) ? stored.compareMode : DEFAULT_SETTINGS.compareMode,
      additionSumRange: isValidAdditionSumRange(stored.additionSumRange) ? stored.additionSumRange : DEFAULT_SETTINGS.additionSumRange,
      additionRepresentation: isValidAdditionRepresentation(stored.additionRepresentation) ? stored.additionRepresentation : DEFAULT_SETTINGS.additionRepresentation,
    };
```

Note: the "`'objects'` only valid when sum range is 5 or 10" constraint is enforced where the setting is *written* (Step 4 below), not here — `loadSettings` only needs to validate shape/enum membership, matching how every other field here works. A previously-stored `{ additionSumRange: 100, additionRepresentation: 'objects' }` combination (e.g. from a settings export/import feature, if one existed) would still load as-is; `AdditionGame.tsx` reads `additionRepresentation` directly assuming the UI kept it consistent, exactly as `CompareQuantitiesGame.tsx` already trusts `compareMode` without re-validating it against `compareRange`.

- [x] **Step 4: Add a tested, named function for the range→representation auto-switch**

This is real branching logic (not just shape validation), so per `AGENTS.md`'s "prefer a `.verify.ts` over reasoning about pure logic" convention, it gets extracted into a small, named, tested function rather than living inline in a settings-screen click handler. `settingsService.ts` doesn't have a `.verify.ts` yet — this creates its first one.

Add to the end of `src/shared/services/settingsService.ts`:

```ts

/**
 * Applies a new additionSumRange, auto-switching additionRepresentation to 'numerals'
 * if the new range makes 'objects' invalid (20 or 100). One-directional: dropping the
 * range back to 5/10 later does NOT restore 'objects' automatically — whatever is
 * stored is always exactly what's displayed, with no separate remembered preference.
 */
export function applyAdditionSumRangeChange(
  settings: GameSettings,
  nextRange: GameSettings['additionSumRange'],
): GameSettings {
  const forcesNumerals = nextRange === 20 || nextRange === 100;
  return {
    ...settings,
    additionSumRange: nextRange,
    additionRepresentation: forcesNumerals ? 'numerals' : settings.additionRepresentation,
  };
}
```

- [x] **Step 5: Write its verify script**

Create `src/shared/services/settingsService.verify.ts`:

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { applyAdditionSumRangeChange, DEFAULT_SETTINGS } from './settingsService';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// Dropping to/staying at 5 or 10 never touches representation, either direction.
const objectsAt5 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 5);
assert(objectsAt5.additionRepresentation === 'objects', 'range=5 leaves objects untouched');
assert(objectsAt5.additionSumRange === 5, 'range is always updated to the new value');

const objectsAt10 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 10);
assert(objectsAt10.additionRepresentation === 'objects', 'range=10 leaves objects untouched');

// Crossing into 20 or 100 forces numerals when it was objects.
const forcedAt20 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 20);
assert(forcedAt20.additionRepresentation === 'numerals', 'range=20 forces numerals when it was objects');

const forcedAt100 = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'objects' }, 100);
assert(forcedAt100.additionRepresentation === 'numerals', 'range=100 forces numerals when it was objects');

// Already-numerals stays numerals at 20/100 (no-op, not an error).
const stillNumerals = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'numerals' }, 100);
assert(stillNumerals.additionRepresentation === 'numerals', 'already-numerals stays numerals');

// One-directional: dropping the range back to 5/10 does NOT restore objects.
const staysNumeralsOnDrop = applyAdditionSumRangeChange({ ...DEFAULT_SETTINGS, additionRepresentation: 'numerals' }, 5);
assert(
  staysNumeralsOnDrop.additionRepresentation === 'numerals',
  'auto-switch is one-directional; dropping the range does not restore objects',
);

console.log('settingsService verify tests passed successfully!');
```

- [x] **Step 6: Run the verify script**

```bash
npx tsx src/shared/services/settingsService.verify.ts
```

Expected: `settingsService verify tests passed successfully!`

- [x] **Step 7: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [x] **Step 8: Commit**

```bash
git add src/shared/services/settingsService.ts src/shared/services/settingsService.verify.ts
git commit -m "feat: add additionSumRange/additionRepresentation settings and auto-switch logic"
```

---

## Task 7: `SegmentedChoice` gains a `disabledOptions` prop

**Files:**
- Modify: `src/shared/ui/FormControls.tsx`

Needed so the "Predmety" (objects) tile can be shown-but-unselectable when `additionSumRange` is 20 or 100. This is additive — every existing `SegmentedChoice` call site omits the new prop and behaves identically to before.

- [x] **Step 1: Add the prop to the interface**

Find:

```ts
interface SegmentedChoiceProps<T extends string | number> {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  formatLabel?: (option: T) => React.ReactNode;
  activeClassName?: string;
  columns?: 2 | 3 | 4;
}
```

Replace with:

```ts
interface SegmentedChoiceProps<T extends string | number> {
  options: readonly T[];
  selected: T;
  onSelect: (option: T) => void;
  formatLabel?: (option: T) => React.ReactNode;
  activeClassName?: string;
  columns?: 2 | 3 | 4;
  /** Options rendered visibly but non-selectable (dimmed, unclickable) — e.g. a choice that's invalid for the current settings combination. */
  disabledOptions?: readonly T[];
}
```

- [x] **Step 2: Use it in the render**

Find:

```tsx
export function SegmentedChoice<T extends string | number>({
  options,
  selected,
  onSelect,
  formatLabel = option => option,
  activeClassName = 'bg-accent-blue',
  columns,
}: SegmentedChoiceProps<T>) {
  const gridClass =
    columns === 4
      ? 'grid-cols-4'
      : columns === 2 || options.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  return (
    <div className={cx('grid gap-3', gridClass)}>
      {options.map(option => (
        <ChoiceTile
          key={String(option)}
          shape="option"
          state={selected === option ? 'selected' : 'neutral'}
          unstyledState={selected !== option}
          className={
            selected === option
              ? resolveActiveClassName(activeClassName)
              : 'bg-bg-light text-text-main opacity-70 shadow-none'
          }
          onClick={() => onSelect(option)}
        >
          {formatLabel(option)}
        </ChoiceTile>
      ))}
    </div>
  );
}
```

Replace with:

```tsx
export function SegmentedChoice<T extends string | number>({
  options,
  selected,
  onSelect,
  formatLabel = option => option,
  activeClassName = 'bg-accent-blue',
  columns,
  disabledOptions,
}: SegmentedChoiceProps<T>) {
  const gridClass =
    columns === 4
      ? 'grid-cols-4'
      : columns === 2 || options.length === 2
      ? 'grid-cols-2'
      : 'grid-cols-3';

  return (
    <div className={cx('grid gap-3', gridClass)}>
      {options.map(option => {
        const isSelected = selected === option;
        const isDisabled = disabledOptions?.includes(option) ?? false;
        return (
          <ChoiceTile
            key={String(option)}
            shape="option"
            state={isSelected ? 'selected' : 'neutral'}
            disabled={isDisabled}
            unstyledState={!isSelected && !isDisabled}
            className={
              isSelected
                ? resolveActiveClassName(activeClassName)
                : isDisabled
                  ? undefined
                  : 'bg-bg-light text-text-main opacity-70 shadow-none'
            }
            onClick={() => onSelect(option)}
          >
            {formatLabel(option)}
          </ChoiceTile>
        );
      })}
    </div>
  );
}
```

Why `unstyledState={!isSelected && !isDisabled}`: when `isDisabled` is true, `unstyledState` must be `false` so `ChoiceTile`'s own `stateClasses['disabled']` (`bg-bg-light text-text-main opacity-50`, applied automatically whenever its `disabled` prop is true) actually renders — otherwise the unselected-option `className` override (`opacity-70`) would be the only styling present and the option wouldn't visually read as disabled. Every existing call site never sets `disabledOptions`, so `isDisabled` is always `false` there and this exactly reproduces the prior `unstyledState={selected !== option}` behavior.

- [x] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [x] **Step 4: Commit**

```bash
git add src/shared/ui/FormControls.tsx
git commit -m "feat: add disabledOptions support to SegmentedChoice"
```

---

## Task 8: Settings visibility and subtitle

**Files:**
- Modify: `src/shared/components/settingsContentData.ts`

- [ ] **Step 1: Add the subtitle**

Find:

```ts
  COMPARE_QUANTITIES: 'Hra s porovnávaním',
};
```

Replace with:

```ts
  COMPARE_QUANTITIES: 'Hra s porovnávaním',
  ADDITION: 'Hra so sčítaním',
};
```

- [ ] **Step 2: Add the visibility flags**

Find:

```ts
export const SETTINGS_VISIBILITY: Record<SettingsTarget, {
  music: boolean;
  avatar: boolean;
  recordings: boolean;
  alphabetAccents: boolean;
  alphabetGridSize: boolean;
  syllablesGridSize: boolean;
  numbersRange: boolean;
  countingRange: boolean;
  completeLetterMissingCount: boolean;
  compareRange: boolean;
  compareMode: boolean;
}> = {
```

Replace with:

```ts
export const SETTINGS_VISIBILITY: Record<SettingsTarget, {
  music: boolean;
  avatar: boolean;
  recordings: boolean;
  alphabetAccents: boolean;
  alphabetGridSize: boolean;
  syllablesGridSize: boolean;
  numbersRange: boolean;
  countingRange: boolean;
  completeLetterMissingCount: boolean;
  compareRange: boolean;
  compareMode: boolean;
  additionSumRange: boolean;
  additionRepresentation: boolean;
}> = {
```

- [ ] **Step 3: Add the two new fields to `home`**

Find:

```ts
    compareRange: true,
    compareMode: true,
  },
```

Replace with:

```ts
    compareRange: true,
    compareMode: true,
    additionSumRange: true,
    additionRepresentation: true,
  },
```

The remaining 9 entries (`ALPHABET`, `SYLLABLES`, `NUMBERS`, `COUNTING_ITEMS`, `WORDS`, `FIRST_LETTER`, `ASSEMBLY`, `COMPLETE_SYLLABLE`, `COMPLETE_LETTER`) all get `additionSumRange: false, additionRepresentation: false,` added — but several of their bodies are textually identical to each other (`WORDS`, `ASSEMBLY`, and `COMPLETE_SYLLABLE` are all-`false` blocks with no distinguishing field), so each of the following 9 steps matches the **entire entry**, keyed by its unique opening line, rather than just the tail — a blind "replace this 3-line block, it appears 9 times" instruction would be genuinely ambiguous here (an editor could easily apply one occurrence's replacement to the wrong entry, or a naive replace-all could silently succeed while still being impossible to tell which entry got which edit from the diff alone).

- [ ] **Step 4: `ALPHABET`**

Find:

```ts
  ALPHABET: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: true,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

```ts
  ALPHABET: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: true,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 5: `SYLLABLES`**

Find:

```ts
  SYLLABLES: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: true,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

```ts
  SYLLABLES: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: true,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 6: `NUMBERS`**

Find:

```ts
  NUMBERS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: true,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

```ts
  NUMBERS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: true,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 7: `COUNTING_ITEMS`**

Find:

```ts
  COUNTING_ITEMS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: true,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

```ts
  COUNTING_ITEMS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: true,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 8: `WORDS`**

Find:

```ts
  WORDS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

```ts
  WORDS: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 9: `FIRST_LETTER`**

Find:

```ts
  FIRST_LETTER: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

```ts
  FIRST_LETTER: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: true,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 10: `ASSEMBLY`**

Find:

```ts
  ASSEMBLY: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

```ts
  ASSEMBLY: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 11: `COMPLETE_SYLLABLE`**

Find:

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
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

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
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 12: `COMPLETE_LETTER`**

Find:

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
    compareRange: false,
    compareMode: false,
  },
```

Replace with:

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
    compareRange: false,
    compareMode: false,
    additionSumRange: false,
    additionRepresentation: false,
  },
```

- [ ] **Step 13: Add the `COMPARE_QUANTITIES` entry's two new fields, then the new `ADDITION` entry**

Find:

```ts
  COMPARE_QUANTITIES: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: true,
    compareMode: true,
  },
};
```

Replace with:

```ts
  COMPARE_QUANTITIES: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: true,
    compareMode: true,
    additionSumRange: false,
    additionRepresentation: false,
  },
  ADDITION: {
    music: true,
    avatar: false,
    recordings: false,
    alphabetAccents: false,
    alphabetGridSize: false,
    syllablesGridSize: false,
    numbersRange: false,
    countingRange: false,
    completeLetterMissingCount: false,
    compareRange: false,
    compareMode: false,
    additionSumRange: true,
    additionRepresentation: true,
  },
};
```

- [ ] **Step 14: Type-check**

```bash
npm run lint
```

Expected: PASS. (If it fails with a missing-property error on any `SETTINGS_VISIBILITY` entry, one of Steps 3-13 was skipped or mistyped — search the file for any `compareMode: false,` or `compareMode: true,` not immediately followed by `additionSumRange:` and fix it.)

- [ ] **Step 15: Commit**

```bash
git add src/shared/components/settingsContentData.ts
git commit -m "feat: add settings visibility/subtitle for the addition game"
```

---

## Task 9: Settings UI — controls, plus the Compare Quantities retrofit

**Files:**
- Modify: `src/shared/components/SettingsContent.tsx`

Two changes here: (1) swap Compare's `compareMode` `ToggleControl` for a `SegmentedChoice` tile picker (behavior-neutral — same field, same values), and (2) add the addition game's two new controls, including the range→representation auto-switch and the disabled-tile constraint.

- [ ] **Step 1: Retrofit Compare's `isHome` block**

Find:

```tsx
      {visibility.compareRange && isHome && (
        <GameSettingsGroupCard title="Viac alebo Menej">
          <ToggleControl
            label="Porovnávaj čísla"
            description="Namiesto predmetov porovnávať napísané čísla."
            icon={<Scale size={24} className="sm:h-7 sm:w-7" />}
            iconBackgroundClassName="bg-accent-blue/35"
            checked={settings.compareMode === 'numerals'}
            onToggle={() => onUpdate({ ...settings, compareMode: settings.compareMode === 'numerals' ? 'objects' : 'numerals' })}
            activeColorClassName="bg-accent-blue"
          />
          <SettingsRangeCard
            title="Rozsah porovnávania"
            description="Vyberte rozsah čísel pre porovnávanie."
            options={[5, 10]}
            selected={settings.compareRange.end}
            activeClassName="bg-accent-blue"
            formatLabel={(value) => `1 - ${value}`}
            onSelect={(value) => onUpdate({ ...settings, compareRange: { start: 1, end: value as 5 | 10 } })}
          />
        </GameSettingsGroupCard>
      )}
```

Replace with:

```tsx
      {visibility.compareRange && isHome && (
        <GameSettingsGroupCard title="Viac alebo Menej">
          <SettingsSection>
            <h3 className="text-xl font-bold sm:text-2xl">Zobrazenie</h3>
            <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
              Predmety na počítanie, alebo napísané čísla.
            </p>
            <div className="mt-5">
              <SegmentedChoice
                options={['objects', 'numerals'] as const}
                selected={settings.compareMode}
                activeClassName="bg-accent-blue"
                formatLabel={(value) => (value === 'objects' ? 'Predmety' : 'Čísla')}
                onSelect={(value) => onUpdate({ ...settings, compareMode: value })}
                columns={2}
              />
            </div>
          </SettingsSection>
          <SettingsRangeCard
            title="Rozsah porovnávania"
            description="Vyberte rozsah čísel pre porovnávanie."
            options={[5, 10]}
            selected={settings.compareRange.end}
            activeClassName="bg-accent-blue"
            formatLabel={(value) => `1 - ${value}`}
            onSelect={(value) => onUpdate({ ...settings, compareRange: { start: 1, end: value as 5 | 10 } })}
          />
        </GameSettingsGroupCard>
      )}
```

- [ ] **Step 2: Retrofit Compare's `!isHome` block**

Find:

```tsx
      {visibility.compareMode && !isHome && (
        <SettingsCard>
          <ToggleControl
            label="Porovnávaj čísla"
            description="Namiesto predmetov porovnávať napísané čísla."
            icon={<Scale size={24} className="sm:h-7 sm:w-7" />}
            iconBackgroundClassName="bg-accent-blue/35"
            checked={settings.compareMode === 'numerals'}
            onToggle={() => onUpdate({ ...settings, compareMode: settings.compareMode === 'numerals' ? 'objects' : 'numerals' })}
            activeColorClassName="bg-accent-blue"
          />
        </SettingsCard>
      )}
```

Replace with:

```tsx
      {visibility.compareMode && !isHome && (
        <SettingsSection>
          <h3 className="text-xl font-bold sm:text-2xl">Zobrazenie</h3>
          <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
            Predmety na počítanie, alebo napísané čísla.
          </p>
          <div className="mt-5">
            <SegmentedChoice
              options={['objects', 'numerals'] as const}
              selected={settings.compareMode}
              activeClassName="bg-accent-blue"
              formatLabel={(value) => (value === 'objects' ? 'Predmety' : 'Čísla')}
              onSelect={(value) => onUpdate({ ...settings, compareMode: value })}
              columns={2}
            />
          </div>
        </SettingsSection>
      )}
```

- [ ] **Step 3: Add the addition game's settings, right after Compare's `!isHome` range block**

Find:

```tsx
      {visibility.compareRange && !isHome && (
        <SettingsRangeCard
          title="Viac alebo Menej"
          description="Vyberte rozsah čísel pre porovnávanie."
          options={[5, 10]}
          selected={settings.compareRange.end}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, compareRange: { start: 1, end: value as 5 | 10 } })}
        />
      )}

      {hasFeedbackKey() && (
```

Replace with:

```tsx
      {visibility.compareRange && !isHome && (
        <SettingsRangeCard
          title="Viac alebo Menej"
          description="Vyberte rozsah čísel pre porovnávanie."
          options={[5, 10]}
          selected={settings.compareRange.end}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, compareRange: { start: 1, end: value as 5 | 10 } })}
        />
      )}

      {visibility.additionSumRange && isHome && (
        <GameSettingsGroupCard title="Sčítaj">
          <AdditionRepresentationCard settings={settings} onUpdate={onUpdate} />
          <AdditionSumRangeCard settings={settings} onUpdate={onUpdate} />
        </GameSettingsGroupCard>
      )}

      {visibility.additionRepresentation && !isHome && (
        <AdditionRepresentationCard settings={settings} onUpdate={onUpdate} />
      )}

      {visibility.additionSumRange && !isHome && (
        <AdditionSumRangeCard settings={settings} onUpdate={onUpdate} />
      )}

      {hasFeedbackKey() && (
```

- [ ] **Step 4: Import the auto-switch function**

Find:

```ts
import { GameSettings, SettingsTarget } from '../types';
import { audioManager } from '../services/audioManager';
```

Replace with:

```ts
import { GameSettings, SettingsTarget } from '../types';
import { audioManager } from '../services/audioManager';
import { applyAdditionSumRangeChange } from '../services/settingsService';
```

- [ ] **Step 5: Add the two new helper components**

These encapsulate the disabled-tile logic in one place, reused by both the `isHome` and per-game sections above (mirrors how `CompleteLetterMissingCountCard` is already factored out as a shared helper for the same reason). The auto-switch itself is the tested `applyAdditionSumRangeChange` from Task 6 — `AdditionSumRangeCard` just calls it, it doesn't reimplement the branching logic here. Find:

```tsx
function CompleteLetterMissingCountCard({
```

Insert immediately **before** it:

```tsx
const ADDITION_SUM_RANGE_OPTIONS = [5, 10, 20, 100] as const;

function AdditionRepresentationCard({
  settings,
  onUpdate,
}: {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}) {
  const objectsDisabled = settings.additionSumRange === 20 || settings.additionSumRange === 100;
  return (
    <SettingsSection>
      <h3 className="text-xl font-bold sm:text-2xl">Zobrazenie</h3>
      <p className="mt-1 text-sm font-medium opacity-55 sm:text-base">
        {objectsDisabled
          ? 'Predmety sú dostupné len pri rozsahu 5 alebo 10.'
          : 'Predmety na počítanie, alebo napísané čísla.'}
      </p>
      <div className="mt-5">
        <SegmentedChoice
          options={['objects', 'numerals'] as const}
          selected={settings.additionRepresentation}
          disabledOptions={objectsDisabled ? (['objects'] as const) : undefined}
          activeClassName="bg-accent-blue"
          formatLabel={(value) => (value === 'objects' ? 'Predmety' : 'Čísla')}
          onSelect={(value) => onUpdate({ ...settings, additionRepresentation: value })}
          columns={2}
        />
      </div>
    </SettingsSection>
  );
}

function AdditionSumRangeCard({
  settings,
  onUpdate,
}: {
  settings: GameSettings;
  onUpdate: (settings: GameSettings) => void;
}) {
  return (
    <SettingsRangeCard
      title="Rozsah sčítania"
      description="Vyberte najväčší možný súčet."
      options={ADDITION_SUM_RANGE_OPTIONS}
      selected={settings.additionSumRange}
      activeClassName="bg-accent-blue"
      formatLabel={(value) => `1 - ${value}`}
      onSelect={(value) => onUpdate(applyAdditionSumRangeChange(settings, value as GameSettings['additionSumRange']))}
    />
  );
}

```

- [ ] **Step 6: Type-check**

```bash
npm run lint
```

Expected: PASS. (`Scale` import may now be unused if nothing else in the file references it — check: the `Scale` icon was only used by the two `ToggleControl` blocks just replaced. If ESLint flags an unused import, remove `Scale` from the `lucide-react` import line at the top of the file.)

- [ ] **Step 7: Remove the now-unused `Scale` import if flagged**

If Step 6 reports `Scale` as unused, find:

```ts
import { Languages, MessageSquare, Mic, Music, Scale, Type } from 'lucide-react';
```

Replace with:

```ts
import { Languages, MessageSquare, Mic, Music, Type } from 'lucide-react';
```

Then re-run `npm run lint` — PASS.

- [ ] **Step 8: Manual smoke check**

```bash
npm run dev
```

Open Settings → home screen:
- "Viac alebo Menej" section now shows a "Predmety / Čísla" tile row instead of a toggle, same behavior as before.
- New "Sčítaj" section shows a "Predmety / Čísla" tile row and a "5 / 10 / 20 / 100" range row.
- Select range "20": the "Predmety" tile should grey out and become unclickable; if "Predmety" was selected, it should have flipped to "Čísla" automatically.
- Select range "5" again: "Predmety" should become selectable again (still showing whatever representation was last chosen, per the auto-switch behavior — selecting "5" does not un-force it back to objects automatically, only crossing *into* 20/100 forces the switch).

Stop the server once confirmed.

- [ ] **Step 9: Commit**

```bash
git add src/shared/components/SettingsContent.tsx
git commit -m "feat: add addition game settings, retrofit compareMode to a tile picker"
```

---

## Task 10: Register the game in the catalog

**Files:**
- Modify: `src/shared/gameCatalog.tsx`

- [ ] **Step 1: Import an icon**

Find:

```tsx
import { Apple, BookOpen, Gamepad2, Play, Puzzle, Scale, Type, WandSparkles } from 'lucide-react';
```

Replace with:

```tsx
import { Apple, BookOpen, Gamepad2, Plus, Play, Puzzle, Scale, Type, WandSparkles } from 'lucide-react';
```

- [ ] **Step 2: Add the game definition**

Find the `COMPARE_QUANTITIES` entry (it ends right before `WORDS`):

```tsx
  {
    id: 'COMPARE_QUANTITIES',
    path: '/compare',
    title: 'Viac alebo Menej',
    description: 'Kde je viac predmetov?',
    icon: <Scale size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-accent-blue',
    lobby: {
      title: 'VIAC ALEBO MENEJ',
      playButtonColorClassName: 'bg-accent-blue',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
  {
    id: 'WORDS',
```

Replace with:

```tsx
  {
    id: 'COMPARE_QUANTITIES',
    path: '/compare',
    title: 'Viac alebo Menej',
    description: 'Kde je viac predmetov?',
    icon: <Scale size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-accent-blue',
    lobby: {
      title: 'VIAC ALEBO MENEJ',
      playButtonColorClassName: 'bg-accent-blue',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
  {
    id: 'ADDITION',
    path: '/addition',
    title: 'Sčítaj',
    description: 'Koľko je to dokopy?',
    icon: <Plus size={48} className="sm:w-16 sm:h-16" strokeWidth={3} />,
    color: 'bg-soft-watermelon',
    lobby: {
      title: 'SČÍTAJ',
      playButtonColorClassName: 'bg-soft-watermelon',
      topDecorationClassName: 'absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none',
      bottomDecorationClassName: 'absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none',
    },
  },
  {
    id: 'WORDS',
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/gameCatalog.tsx
git commit -m "feat: register addition game in the game catalog"
```

---

## Task 11: The `AdditionGame` component

**Files:**
- Create: `src/games/addition/AdditionGame.tsx`

Mirrors `CompleteSyllableGame.tsx`'s structure closely: `sessionTokenRef`-guarded timers (so a stale `setTimeout` from a round the child already backed out of can never mutate state after the fact — this exact class of bug was fixed after the fact in Compare's history, so this plan builds it in from the start), `MAX_ROUNDS`/`MAX_ATTEMPTS` → `FailureOverlay`, and a `findPlayableRound`-style retry loop for the no-repeat-pair guard.

- [ ] **Step 1: Write the component**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { FailureSpec, NumberItem, SuccessSpec } from '../../shared/types';
import { useContent } from '../../shared/contexts/ContentContext';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { AppScreen, BackButton, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { QuantityCluster } from '../../shared/components/QuantityCluster';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { FailureOverlay } from '../../shared/components/FailureOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { TIMING, COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { generateCompareGridSlots, CompareGridSlot } from '../../shared/scatterGridLogic';
import { audioManager } from '../../shared/services/audioManager';
import { setE2EState } from '../../shared/services/e2eState';
import { buildAnswerOptions, createAdditionProblem, pairKey } from './additionLogic';

interface AdditionGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  sumRange: 5 | 10 | 20 | 100;
  representation: 'objects' | 'numerals';
}

interface AdditionRound {
  a: NumberItem;
  b: NumberItem;
  sum: NumberItem;
  options: NumberItem[];
  emoji: string;
  aSlots: CompareGridSlot[];
  bSlots: CompareGridSlot[];
}

const MAX_ROUNDS = 5;
const MAX_ATTEMPTS = 3;
const OPTION_COUNT = 4;

function clearTimer(timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }
}

function formatAddition(locale: string, a: number, b: number, sum: number): string {
  if (locale === 'cs') {
    return `${a} a ${b} je dohromady ${sum}`;
  }
  return `${a} a ${b} je dokopy ${sum}`;
}

function getAdditionAudioClip(locale: string, a: number, b: number, sum: number) {
  const fallbackText = formatAddition(locale, a, b, sum);
  const audioKey = locale === 'cs' ? `${a}-a-${b}-je-dohromady-${sum}` : `${a}-a-${b}-je-dokopy-${sum}`;
  return { path: `${locale}/addition/${audioKey}`, fallbackText };
}

function getSuccessSpec(locale: string, round: AdditionRound): SuccessSpec {
  return {
    echoLine: formatAddition(locale, round.a.value, round.b.value, round.sum.value),
    audioSpec: { clips: [getAdditionAudioClip(locale, round.a.value, round.b.value, round.sum.value)] },
  };
}

function getFailureSpec(locale: string, round: AdditionRound): FailureSpec {
  return {
    echoLine: formatAddition(locale, round.a.value, round.b.value, round.sum.value),
    audioSpec: {
      clips: [
        getPhraseClip(locale, 'neverMind'),
        getAdditionAudioClip(locale, round.a.value, round.b.value, round.sum.value),
      ],
    },
  };
}

export function AdditionGame({ onExit, onOpenSettings, sumRange, representation }: AdditionGameProps) {
  const { locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const lobby = GAME_DEFINITIONS_BY_ID.ADDITION.lobby;

  const [round, setRound] = useState<AdditionRound | null>(null);
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
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
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackResetTimersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const sessionTokenRef = useRef(0);
  const lastPairKeyRef = useRef<string | null>(null);

  const clearTransientTimers = useCallback(() => {
    clearTimer(promptTimerRef);
    clearTimer(roundEndTimerRef);
    feedbackResetTimersRef.current.forEach(clearTimeout);
    feedbackResetTimersRef.current.clear();
  }, []);

  const cleanupPlayEffects = useCallback(() => {
    clearTransientTimers();
    audioManager.stop();
  }, [clearTransientTimers]);

  const resetPlayState = useCallback(() => {
    setRound(null);
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setShowSuccess(false);
    setShowFailure(false);
    setSuccessSpec(null);
    setFailureSpec(null);
    setRoundsPlayed(0);
    setCorrectRounds(0);
    setTotalTaps(0);
    setShowSessionComplete(false);
    pendingRoundEndRef.current = false;
  }, []);

  const returnToLobby = useCallback(() => {
    sessionTokenRef.current += 1;
    cleanupPlayEffects();
    resetPlayState();
    setGameState('HOME');
  }, [cleanupPlayEffects, resetPlayState]);

  const startRound = useCallback(() => {
    clearTransientTimers();

    let problem = createAdditionProblem(sumRange);
    let attempts = 0;
    while (lastPairKeyRef.current === pairKey(problem.a.value, problem.b.value) && attempts < 10) {
      problem = createAdditionProblem(sumRange);
      attempts += 1;
    }
    lastPairKeyRef.current = pairKey(problem.a.value, problem.b.value);

    const options = buildAnswerOptions(problem.sum, sumRange, OPTION_COUNT);
    const emoji = COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)];

    setRound({
      a: problem.a,
      b: problem.b,
      sum: problem.sum,
      options,
      emoji,
      aSlots: generateCompareGridSlots(problem.a.value, emoji),
      bSlots: generateCompareGridSlots(problem.b.value, emoji),
    });
    setFeedback({});
    setWrongAttemptsThisRound(0);
    setShowSuccess(false);
    setShowFailure(false);
    pendingRoundEndRef.current = false;
  }, [clearTransientTimers, sumRange]);

  useEffect(() => cleanupPlayEffects, [cleanupPlayEffects]);

  useEffect(() => {
    if (gameState !== 'PLAYING' || !round || showSuccess || showFailure || showSessionComplete) return;
    const sessionToken = sessionTokenRef.current;
    clearTimer(promptTimerRef);
    promptTimerRef.current = setTimeout(() => {
      promptTimerRef.current = null;
      if (sessionTokenRef.current !== sessionToken) return;
      audioManager.play({ clips: [getPhraseClip(locale, 'howManyTogether')] });
    }, TIMING.AUDIO_DELAY_MS);
    return () => clearTimer(promptTimerRef);
  }, [gameState, locale, round, showFailure, showSessionComplete, showSuccess]);

  useEffect(() => {
    const overlay = showSessionComplete ? 'session-complete' : showSuccess ? 'success' : showFailure ? 'failure' : null;
    setE2EState({
      overlay,
      correctSum: round?.sum.value ?? null,
      optionValues: round?.options.map((o) => o.value) ?? [],
    });
  }, [round, showFailure, showSessionComplete, showSuccess]);

  const playPromptAudio = useCallback(() => {
    clearTimer(promptTimerRef);
    audioManager.play({ clips: [getPhraseClip(locale, 'howManyTogether')] });
  }, [locale]);

  const handlePlay = () => {
    sessionTokenRef.current += 1;
    cleanupPlayEffects();
    resetPlayState();
    setGameState('PLAYING');
    startRound();
  };

  const handleBackToLobby = () => {
    returnToLobby();
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

  const handleChoice = (option: NumberItem, index: number) => {
    clearTimer(promptTimerRef);
    if (!round || showSuccess || showFailure || showSessionComplete || pendingRoundEndRef.current) return;
    setTotalTaps((value) => value + 1);

    if (option.value === round.sum.value) {
      pendingRoundEndRef.current = true;
      audioManager.play(getItemAnnouncementAudio(locale, 'numbers', option.audioKey, String(option.value)));
      setFeedback((current) => ({ ...current, [index]: 'correct' }));
      setSuccessSpec(getSuccessSpec(locale, round));
      finishRound(true);
      return;
    }

    const nextWrongAttempts = wrongAttemptsThisRound + 1;
    setWrongAttemptsThisRound(nextWrongAttempts);
    setFeedback((current) => ({ ...current, [index]: 'wrong' }));

    if (nextWrongAttempts >= MAX_ATTEMPTS) {
      pendingRoundEndRef.current = true;
      audioManager.stop();
      setFailureSpec(getFailureSpec(locale, round));
      finishRound(false);
      return;
    }

    audioManager.play(getWrongAnswerAudio(locale, 'numbers', option.audioKey, String(option.value)));
    const sessionToken = sessionTokenRef.current;
    const feedbackResetTimer = setTimeout(() => {
      feedbackResetTimersRef.current.delete(feedbackResetTimer);
      if (sessionTokenRef.current !== sessionToken) return;
      setFeedback((current) => ({ ...current, [index]: null }));
    }, TIMING.FEEDBACK_RESET_MS);
    feedbackResetTimersRef.current.add(feedbackResetTimer);
  };

  if (gameState === 'HOME') {
    return (
      <GameLobby
        title={lobby.title}
        playButtonColorClassName={lobby.playButtonColorClassName}
        subtitle={<>Súčet do {sumRange}</>}
        onPlay={handlePlay}
        onBack={onExit}
        onOpenSettings={onOpenSettings}
        topDecorationClassName={lobby.topDecorationClassName}
        bottomDecorationClassName={lobby.bottomDecorationClassName}
      />
    );
  }

  const numeralClassName = 'font-spline text-[clamp(2.5rem,9vw,5rem)] font-black leading-none';

  return (
    <AppScreen contentClassName="gap-3 sm:gap-4 md:gap-5">
      <TopBar
        left={<BackButton onClick={handleBackToLobby} />}
        center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
        right={(
          <IconButton label="Prehrať zvuk" onClick={playPromptAudio}>
            <Volume2 size={24} className="sm:w-7 sm:h-7" />
          </IconButton>
        )}
      />

      {round && (
        <div className="flex flex-1 min-h-0 items-center justify-center gap-2 px-2 sm:gap-4">
          <div className="grid h-full max-h-[220px] w-full max-w-[9.5rem] grid-cols-1 rounded-[24px] bg-white/50 sm:max-h-[280px] sm:max-w-[12rem] sm:rounded-[32px]">
            <QuantityCluster mode={representation} value={round.a.value} slots={round.aSlots} numeralClassName={numeralClassName} />
          </div>
          <span className="font-spline text-4xl font-black text-text-main/60 sm:text-6xl" aria-hidden="true">+</span>
          <div className="grid h-full max-h-[220px] w-full max-w-[9.5rem] grid-cols-1 rounded-[24px] bg-white/50 sm:max-h-[280px] sm:max-w-[12rem] sm:rounded-[32px]">
            <QuantityCluster mode={representation} value={round.b.value} slots={round.bSlots} numeralClassName={numeralClassName} />
          </div>
        </div>
      )}

      <div className="grid shrink-0 grid-cols-4 auto-rows-fr gap-3 pb-1 sm:gap-4 sm:pb-2">
        {round?.options.map((option, i) => (
          <ChoiceTile
            key={i}
            onClick={() => handleChoice(option, i)}
            state={feedback[i] ?? 'neutral'}
            className="w-full !aspect-[4/5] text-4xl font-spline sm:!aspect-square sm:text-6xl md:text-7xl"
          >
            {option.value}
          </ChoiceTile>
        ))}
      </div>

      {successSpec && (
        <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startRound} />
      )}
      {failureSpec && (
        <FailureOverlay show={showFailure} spec={failureSpec} onComplete={startRound} />
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
```

- [ ] **Step 2: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/games/addition/AdditionGame.tsx
git commit -m "feat: implement AdditionGame component"
```

---

## Task 12: Wire it into the app shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the component**

Find:

```tsx
import { CompareQuantitiesGame } from './games/compare/CompareQuantitiesGame';
```

Replace with:

```tsx
import { CompareQuantitiesGame } from './games/compare/CompareQuantitiesGame';
import { AdditionGame } from './games/addition/AdditionGame';
```

- [ ] **Step 2: Add the route**

Find:

```tsx
          <Route
            path="/compare"
            element={
              <ErrorBoundary>
                <CompareQuantitiesGame
                  range={settings.compareRange}
                  mode={settings.compareMode}
                  onExit={handleExitGame}
                  onOpenSettings={() => handleOpenSettings('COMPARE_QUANTITIES')}
                />
              </ErrorBoundary>
            }
          />
          <Route
            path="/words"
```

Replace with:

```tsx
          <Route
            path="/compare"
            element={
              <ErrorBoundary>
                <CompareQuantitiesGame
                  range={settings.compareRange}
                  mode={settings.compareMode}
                  onExit={handleExitGame}
                  onOpenSettings={() => handleOpenSettings('COMPARE_QUANTITIES')}
                />
              </ErrorBoundary>
            }
          />
          <Route
            path="/addition"
            element={
              <ErrorBoundary>
                <AdditionGame
                  sumRange={settings.additionSumRange}
                  representation={settings.additionRepresentation}
                  onExit={handleExitGame}
                  onOpenSettings={() => handleOpenSettings('ADDITION')}
                />
              </ErrorBoundary>
            }
          />
          <Route
            path="/words"
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Manual smoke check**

```bash
npm run dev
```

- Home screen shows a "Sčítaj" card; tapping it opens the lobby, "Hrať" starts a round.
- Objects mode (default, range 5): two scattered emoji clusters with a "+" between them; tap the numeral tile matching the total.
- Tap a wrong tile 3 times: `FailureOverlay` shows the correct sum, then the next round starts (or session-complete after round 5).
- Settings → Sčítaj → range 100, representation forced to "Čísla": two big numerals shown, sums can be up to 3 digits and stay legible in the answer tiles.

Stop the server once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire addition game into routing"
```

---

## Task 13: End-to-end tests

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Create: `e2e/addition.spec.ts`

- [ ] **Step 1: Add the route to the smoke suite**

Find:

```ts
const ALL_GAME_ROUTES: SmokeCase[] = [
  { name: 'alphabet', path: '/alphabet' },
  { name: 'syllables', path: '/syllables' },
  { name: 'numbers', path: '/numbers' },
  { name: 'counting', path: '/counting' },
  { name: 'compare', path: '/compare' },
  { name: 'words', path: '/words' },
  { name: 'first-letter', path: '/first-letter' },
  { name: 'assembly', path: '/assembly' },
  { name: 'complete-syllable', path: '/complete-syllable' },
  { name: 'complete-letter', path: '/complete-letter' },
];
```

Replace with:

```ts
const ALL_GAME_ROUTES: SmokeCase[] = [
  { name: 'alphabet', path: '/alphabet' },
  { name: 'syllables', path: '/syllables' },
  { name: 'numbers', path: '/numbers' },
  { name: 'counting', path: '/counting' },
  { name: 'compare', path: '/compare' },
  { name: 'addition', path: '/addition' },
  { name: 'words', path: '/words' },
  { name: 'first-letter', path: '/first-letter' },
  { name: 'assembly', path: '/assembly' },
  { name: 'complete-syllable', path: '/complete-syllable' },
  { name: 'complete-letter', path: '/complete-letter' },
];
```

- [ ] **Step 2: Write the golden-path spec**

This game doesn't fit `find-it-games.spec.ts`'s oracle (`correctItemId`/`gridItemIds`), so — same as Compare — it gets its own spec, using the `overlay`/`correctSum`/`optionValues` fields `AdditionGame`'s `setE2EState` call already exposes.

Create `e2e/addition.spec.ts`:

```ts
import { test, expect } from '@playwright/test';
import { getE2EState } from './support/e2eHook';
import {
  trackConsoleErrors,
  expectNoConsoleErrors,
  trackFailedRequests,
  expectNoFailedRequests,
  waitForOverlay,
} from './support/assertions';
import type { E2EGlobalState } from '../src/shared/services/e2eState';

interface AdditionE2EState extends E2EGlobalState {
  correctSum: number | null;
  optionValues: number[];
}

async function tapCorrectOption(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<AdditionE2EState>(page);
  expect(state.correctSum, 'expected an active round').not.toBeNull();
  await page.getByRole('button', { name: String(state.correctSum), exact: true }).click();
}

async function tapWrongOption(page: import('@playwright/test').Page): Promise<void> {
  const state = await getE2EState<AdditionE2EState>(page);
  const wrongValue = state.optionValues.find((v) => v !== state.correctSum);
  expect(wrongValue, 'expected at least one distractor option').toBeDefined();
  await page.getByRole('button', { name: String(wrongValue), exact: true }).click();
}

test('addition: correct answer reaches the success overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/addition');
  await page.getByRole('button', { name: 'Hrať' }).click();

  await tapCorrectOption(page);
  await waitForOverlay(page, 'success');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('addition: three wrong answers reach the failure overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/addition');
  await page.getByRole('button', { name: 'Hrať' }).click();

  await tapWrongOption(page);
  await tapWrongOption(page);
  await tapWrongOption(page);
  await waitForOverlay(page, 'failure');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
```

- [ ] **Step 3: Run the e2e suite**

```bash
npm run test:e2e
```

Expected: PASS for all tests, including the two new `addition.spec.ts` tests and the new `addition: route loads and lobby renders` smoke test.

- [ ] **Step 4: Commit**

```bash
git add e2e/smoke.spec.ts e2e/addition.spec.ts
git commit -m "test: add e2e coverage for the addition game"
```

---

## Task 14: Final verification and roadmap update

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run the full verification pass**

```bash
npm run lint
npx tsx src/shared/scatterGridLogic.verify.ts
npx tsx src/games/addition/additionLogic.verify.ts
npx tsx src/shared/services/settingsService.verify.ts
npm run test:audio
npm run test:e2e
```

Expected:
- `npm run lint` — PASS.
- All three `.verify.ts` scripts — PASS with their success messages.
- `npm run test:audio` — the `phrases` category reports **two** missing files: `sk/phrases/kde-je-viac.mp3` (pre-existing, from Compare) and `sk/phrases/kolko-je-dokopy.mp3` (new). **This is expected**, same reasoning as Compare's: TTS fallback covers it until recorded. The `addition/<a>-a-<b>-je-dokopy-<sum>` success-echo clips are per-problem (not a fixed set) and are **not** checked by `check_audio.ts` at all (it only validates the fixed `letters`/`syllables`/`words`/`numbers`/`praise`/`phrases` categories) — they rely on TTS in practice, same as Compare's comparison sentences.
- `npm run test:e2e` — PASS.

- [ ] **Step 2: Update the roadmap**

In `ROADMAP.md`, find:

```markdown
- [ ] **Sčítaj** — simple addition game (two object/numeral groups combined, tap the matching sum; sum range and representation mode as settings). Spec: `docs/superpowers/specs/2026-09-04-addition-game-design.md`.
```

Replace with:

```markdown
- [x] **Sčítaj** — simple addition game (two object/numeral groups combined, tap the matching sum; sum range and representation mode as settings). Spec: `docs/superpowers/specs/2026-09-04-addition-game-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark Sčítaj addition game complete in roadmap"
```

- [ ] **Step 4: Push and open a PR (if the user wants one)**

```bash
git push -u origin feat/addition-game
```

Confirm with the user before pushing/opening a PR if that wasn't already agreed.

---

## Follow-up (not part of this plan)

Further arithmetic games (subtraction, etc.) are anticipated but not designed here — see the "Deferred" section of the design doc. They'd reuse `src/shared/scatterGridLogic.ts` and `src/shared/components/QuantityCluster.tsx` unchanged, and get their own `*Logic.ts` module mirroring `additionLogic.ts`'s shape rather than sharing one directly, per the design's YAGNI reasoning.
