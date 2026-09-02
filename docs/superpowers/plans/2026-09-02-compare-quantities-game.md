# Compare Quantities Game ("Viac alebo Menej") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **This plan is self-contained.** It assumes zero prior context about this codebase: every file to touch, every existing pattern being mirrored, and every line of code needed is included below. You do not need to read the design spec first, but it exists at `docs/superpowers/specs/2026-09-02-compare-quantities-game-design.md` if you want the product rationale.

**Goal:** Add a new mini-game, "Viac alebo Menej" (More or Fewer), where a child sees two piles of objects (or two numerals, in a settings-controlled mode) side by side and taps the one with more.

**Architecture:** A new bespoke game component (`CompareQuantitiesGame.tsx`), following the same self-contained state-machine shape as the existing `CountingItemsGame.tsx` — NOT built on the shared `FindItGame` engine, because this game's core mechanic (exactly two choices; a wrong tap disables that side while the correct side stays live so the child self-corrects; every round always ends in success, no failure overlay) doesn't fit `FindItGame`'s N-choice/attempt-counted-failure model. It plugs into the existing settings, content-registry, game-catalog, routing, and e2e infrastructure exactly the way every other game does.

**Tech Stack:** React + TypeScript, Vite, Tailwind (via existing `src/shared/ui/*` primitives), `react-router-dom`, Playwright for e2e.

**Testing note (repo-specific):** This codebase has **no unit/component test runner**. Pure-logic modules get one-shot `.verify.ts` scripts (`npx tsx`); UI behavior is verified via the Playwright e2e suite (`npm run test:e2e`) and manual/browser checks. This plan follows that convention: implement each piece, verify types with `npm run lint` after every file change, and add the Playwright golden-path spec once the component exists (there is no meaningful "red" state to write first for a brand-new route — `npm run test:e2e` builds the whole app, so an e2e-first spec would only ever fail with "page not found," not a specific behavioral signal).

---

## Task 0: Create a feature branch

- [ ] **Step 1: Branch from `main`**

```bash
git checkout main
git pull
git checkout -b feat/compare-quantities-game
```

---

## Task 1: Domain types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add the new `GameId`**

Find this line (near the top of the file):

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY' | 'COMPLETE_SYLLABLE' | 'COMPLETE_LETTER';
```

Replace it with:

```ts
export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS' | 'FIRST_LETTER' | 'ASSEMBLY' | 'COMPLETE_SYLLABLE' | 'COMPLETE_LETTER' | 'COMPARE_QUANTITIES';
```

- [ ] **Step 2: Add the new settings fields**

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
}
```

- [ ] **Step 3: Add the new audio phrase key**

Find:

```ts
export type AudioPhraseKey =
  | 'find' | 'thisIs' | 'number' | 'letter' | 'syllable' | 'word'
  | 'findLetter' | 'thisIsLetter' | 'thisIsSyllable' | 'thisIsWord'
  | 'countItems' | 'whatIsWrittenHere' | 'orderSyllables'
  | 'retry' | 'neverMind' | 'itIs' | 'yesThereAre' | 'noThereAre' | 'correctAnswerIs';
```

Replace with:

```ts
export type AudioPhraseKey =
  | 'find' | 'thisIs' | 'number' | 'letter' | 'syllable' | 'word'
  | 'findLetter' | 'thisIsLetter' | 'thisIsSyllable' | 'thisIsWord'
  | 'countItems' | 'whatIsWrittenHere' | 'orderSyllables'
  | 'retry' | 'neverMind' | 'itIs' | 'yesThereAre' | 'noThereAre' | 'correctAnswerIs' | 'whereIsMore';
```

- [ ] **Step 4: Type-check (expect errors — that's correct at this point)**

```bash
npm run lint
```

Expected: FAIL. `src/shared/locales/sk.ts` and `src/shared/locales/cs.ts` now fail to type-check because their `AUDIO_PHRASES: Record<AudioPhraseKey, AudioPhrase>` objects are missing the new `whereIsMore` key, and `src/shared/services/settingsService.ts`'s `DEFAULT_SETTINGS: GameSettings` is missing `compareRange`/`compareMode`. This is expected — fixed in Tasks 2 and 3.

- [ ] **Step 5: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add COMPARE_QUANTITIES game id, settings, and audio phrase key"
```

---

## Task 2: Locale content — new phrase

**Files:**
- Modify: `src/shared/locales/sk.ts`
- Modify: `src/shared/locales/cs.ts`

- [ ] **Step 1: Add the Slovak phrase**

In `src/shared/locales/sk.ts`, find:

```ts
  correctAnswerIs:   { text: 'Správna odpoveď je', audioKey: 'spravna-odpoved' },
};
```

Replace with:

```ts
  correctAnswerIs:   { text: 'Správna odpoveď je', audioKey: 'spravna-odpoved' },
  whereIsMore:       { text: 'Kde je viac?',        audioKey: 'kde-je-viac' },
};
```

- [ ] **Step 2: Add the Czech phrase (stub locale, but the type requires every key)**

In `src/shared/locales/cs.ts`, find:

```ts
  correctAnswerIs:   { text: 'Správná odpověď je', audioKey: 'spravna-odpoved' },
};
```

Replace with:

```ts
  correctAnswerIs:   { text: 'Správná odpověď je', audioKey: 'spravna-odpoved' },
  whereIsMore:       { text: 'Kde je více?',        audioKey: 'kde-je-vice' },
};
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: still FAILS, only on `src/shared/services/settingsService.ts` (`DEFAULT_SETTINGS` missing the new `GameSettings` fields). The locale files now type-check cleanly.

- [ ] **Step 4: Commit**

```bash
git add src/shared/locales/sk.ts src/shared/locales/cs.ts
git commit -m "feat: add 'Kde je viac?' audio phrase for compare quantities game"
```

---

## Task 3: Settings persistence

**Files:**
- Modify: `src/shared/services/settingsService.ts`

- [ ] **Step 1: Add defaults**

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
};
```

- [ ] **Step 2: Add a validator for `compareMode`**

Find:

```ts
function isValidCompleteLetterMissingCount(value: unknown): value is GameSettings['completeLetterMissingCount'] {
  return value === 1 || value === 2 || value === 'adaptive';
}
```

Add immediately after it:

```ts

function isValidCompareMode(value: unknown): value is GameSettings['compareMode'] {
  return value === 'objects' || value === 'numerals';
}
```

- [ ] **Step 3: Load and validate the new fields**

Find:

```ts
      completeLetterMissingCount: isValidCompleteLetterMissingCount(stored.completeLetterMissingCount)
        ? stored.completeLetterMissingCount
        : DEFAULT_SETTINGS.completeLetterMissingCount,
    };
```

Replace with:

```ts
      completeLetterMissingCount: isValidCompleteLetterMissingCount(stored.completeLetterMissingCount)
        ? stored.completeLetterMissingCount
        : DEFAULT_SETTINGS.completeLetterMissingCount,
      compareRange: isValidRange(stored.compareRange) ? stored.compareRange : DEFAULT_SETTINGS.compareRange,
      compareMode: isValidCompareMode(stored.compareMode) ? stored.compareMode : DEFAULT_SETTINGS.compareMode,
    };
```

- [ ] **Step 4: Type-check**

```bash
npm run lint
```

Expected: PASS (no errors). All `GameSettings` consumers now have the fields they need.

- [ ] **Step 5: Commit**

```bash
git add src/shared/services/settingsService.ts
git commit -m "feat: add compareRange/compareMode settings defaults and validation"
```

---

## Task 4: Settings UI — visibility and subtitle

**Files:**
- Modify: `src/shared/components/settingsContentData.ts`

This file controls which settings sections show up on the shared Settings screen, per game (`SettingsTarget` = `'home'` or a `GameId`).

- [ ] **Step 1: Add the subtitle**

Find:

```ts
export const SETTINGS_SUBTITLES: Record<SettingsTarget, string> = {
  home: 'Nastavenia',
  ALPHABET: 'Hra s písmenami',
  SYLLABLES: 'Hra so slabikami',
  NUMBERS: 'Hra s číslami',
  COUNTING_ITEMS: 'Hra s počítaním',
  WORDS: 'Hra so slovami',
  FIRST_LETTER: 'Hra s prvým písmenkom',
  ASSEMBLY: 'Hra so skladaním',
  COMPLETE_SYLLABLE: 'Hra s dopĺňaním slabík',
  COMPLETE_LETTER: 'Hra s dopĺňaním písmen',
};
```

Replace with:

```ts
export const SETTINGS_SUBTITLES: Record<SettingsTarget, string> = {
  home: 'Nastavenia',
  ALPHABET: 'Hra s písmenami',
  SYLLABLES: 'Hra so slabikami',
  NUMBERS: 'Hra s číslami',
  COUNTING_ITEMS: 'Hra s počítaním',
  WORDS: 'Hra so slovami',
  FIRST_LETTER: 'Hra s prvým písmenkom',
  ASSEMBLY: 'Hra so skladaním',
  COMPLETE_SYLLABLE: 'Hra s dopĺňaním slabík',
  COMPLETE_LETTER: 'Hra s dopĺňaním písmen',
  COMPARE_QUANTITIES: 'Hra s porovnávaním',
};
```

- [ ] **Step 2: Add the two new visibility flags to the type, and to every existing entry**

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
}> = {
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
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
  },
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
};
```

Replace the whole block with:

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
    compareRange: true,
    compareMode: true,
  },
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

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/settingsContentData.ts
git commit -m "feat: add settings visibility/subtitle for compare quantities game"
```

---

## Task 5: Settings UI — the actual controls

**Files:**
- Modify: `src/shared/components/SettingsContent.tsx`

This renders the range picker and the objects/numerals toggle, following the exact pattern already used for `countingRange` (range picker) and `alphabetAccents` (toggle).

- [ ] **Step 1: Import the `Scale` icon**

Find:

```ts
import { Languages, MessageSquare, Mic, Music } from 'lucide-react';
```

Replace with:

```ts
import { Languages, MessageSquare, Mic, Music, Scale } from 'lucide-react';
```

- [ ] **Step 2: Add the `isHome` grouped section**

Find:

```tsx
      {visibility.countingRange && isHome && (
        <GameSettingsGroupCard title="Počítanie">
          <SettingsRangeCard
            title="Rozsah počítania"
            description="Vyberte rozsah pre počítanie predmetov."
            options={[5, 10]}
            selected={settings.countingRange.end}
            activeClassName="bg-soft-watermelon"
            formatLabel={(value) => `1 - ${value}`}
            onSelect={(value) => onUpdate({ ...settings, countingRange: { start: 1, end: value as 5 | 10 } })}
          />
        </GameSettingsGroupCard>
      )}

      {visibility.countingRange && !isHome && (
        <SettingsRangeCard
          title="Počítanie predmetov"
          description="Vyberte rozsah pre počítanie predmetov."
          options={[5, 10]}
          selected={settings.countingRange.end}
          activeClassName="bg-soft-watermelon"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, countingRange: { start: 1, end: value as 5 | 10 } })}
        />
      )}
```

Replace with (adds the new sections right after — same block, with the new one appended):

```tsx
      {visibility.countingRange && isHome && (
        <GameSettingsGroupCard title="Počítanie">
          <SettingsRangeCard
            title="Rozsah počítania"
            description="Vyberte rozsah pre počítanie predmetov."
            options={[5, 10]}
            selected={settings.countingRange.end}
            activeClassName="bg-soft-watermelon"
            formatLabel={(value) => `1 - ${value}`}
            onSelect={(value) => onUpdate({ ...settings, countingRange: { start: 1, end: value as 5 | 10 } })}
          />
        </GameSettingsGroupCard>
      )}

      {visibility.countingRange && !isHome && (
        <SettingsRangeCard
          title="Počítanie predmetov"
          description="Vyberte rozsah pre počítanie predmetov."
          options={[5, 10]}
          selected={settings.countingRange.end}
          activeClassName="bg-soft-watermelon"
          formatLabel={(value) => `1 - ${value}`}
          onSelect={(value) => onUpdate({ ...settings, countingRange: { start: 1, end: value as 5 | 10 } })}
        />
      )}

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
```

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/SettingsContent.tsx
git commit -m "feat: add settings controls for compare quantities range and mode"
```

---

## Task 6: Register the game in the catalog

**Files:**
- Modify: `src/shared/gameCatalog.tsx`

This is what auto-generates the home-screen card and drives the lobby's title/colors — adding an entry here is what makes the game appear on the home screen with no other App.tsx changes needed for the card itself.

- [ ] **Step 1: Import the `Scale` icon**

Find:

```tsx
import { Apple, BookOpen, Gamepad2, Play, Puzzle, Type, WandSparkles } from 'lucide-react';
```

Replace with:

```tsx
import { Apple, BookOpen, Gamepad2, Play, Puzzle, Scale, Type, WandSparkles } from 'lucide-react';
```

- [ ] **Step 2: Add the game definition**

Find the `COUNTING_ITEMS` entry (it ends right before the `WORDS` entry):

```tsx
  {
    id: 'COUNTING_ITEMS',
    path: '/counting',
    title: 'Spočítaj',
    description: 'Koľko jabĺčok vidíš?',
    icon: <Apple size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
    lobby: {
      title: 'SPOČÍTAJ',
      playButtonColorClassName: 'bg-soft-watermelon',
    },
  },
  {
    id: 'WORDS',
```

Replace with (inserts the new entry between `COUNTING_ITEMS` and `WORDS`):

```tsx
  {
    id: 'COUNTING_ITEMS',
    path: '/counting',
    title: 'Spočítaj',
    description: 'Koľko jabĺčok vidíš?',
    icon: <Apple size={48} className="sm:w-16 sm:h-16" />,
    color: 'bg-soft-watermelon',
    lobby: {
      title: 'SPOČÍTAJ',
      playButtonColorClassName: 'bg-soft-watermelon',
    },
  },
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

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS. (`GAME_METADATA`, `GAME_PATH`, and `GAME_DEFINITIONS_BY_ID` are all derived from `GAME_DEFINITIONS` via `.map`/`Object.fromEntries`, so nothing else needs updating for the catalog itself. The home screen will now show this card automatically — verified in Task 8.)

- [ ] **Step 4: Commit**

```bash
git add src/shared/gameCatalog.tsx
git commit -m "feat: register compare quantities game in the game catalog"
```

---

## Task 7: The game component

**Files:**
- Create: `src/games/compare/CompareQuantitiesGame.tsx`

This is the main new file. It mirrors `src/games/counting/CountingItemsGame.tsx`'s structure (HOME/PLAYING state, `useContent()` for locale + number items, the same overlay components) but implements the two-pile, self-correcting mechanic instead of a 4-option grid with a failure path.

- [ ] **Step 1: Create the directory and write the component**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2 } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { TIMING, COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
import { useContent } from '../../shared/contexts/ContentContext';
import { fisherYatesShuffle } from '../../shared/utils';
import { NumberItem } from '../../shared/types';
import { AppScreen, BackButton, ChoiceTile, IconButton, RoundCounter, TopBar } from '../../shared/ui';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
import { GameLobby } from '../../shared/components/GameLobby';
import { GAME_DEFINITIONS_BY_ID } from '../../shared/gameCatalog';
import { setE2EState } from '../../shared/services/e2eState';

interface CompareQuantitiesGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
  mode: 'objects' | 'numerals';
}

type Side = 'left' | 'right';

interface RoundState {
  left: NumberItem;
  right: NumberItem;
  correctSide: Side;
  emoji: string;
}

function pairKey(a: number, b: number): string {
  return [a, b].sort((x, y) => x - y).join('-');
}

export function CompareQuantitiesGame({ onExit, onOpenSettings, range, mode }: CompareQuantitiesGameProps) {
  const { numberItems, locale } = useContent();
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const lobby = GAME_DEFINITIONS_BY_ID.COMPARE_QUANTITIES.lobby;
  const [round, setRound] = useState<RoundState | null>(null);
  const [pileState, setPileState] = useState<Record<Side, 'neutral' | 'correct'>>({ left: 'neutral', right: 'neutral' });
  const [wrongSide, setWrongSide] = useState<Side | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const MAX_ROUNDS = 5;
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [correctRounds, setCorrectRounds] = useState(0);
  const [totalTaps, setTotalTaps] = useState(0);
  const [showSessionComplete, setShowSessionComplete] = useState(false);
  const lastPairKeyRef = useRef<string | null>(null);

  const availableItems = useMemo(
    () => numberItems.filter((n) => n.value >= range.start && n.value <= range.end),
    [numberItems, range],
  );

  useEffect(() => {
    return () => audioManager.stop();
  }, []);

  const startNewRound = useCallback(() => {
    if (availableItems.length < 2) return;
    let a: NumberItem;
    let b: NumberItem;
    let attempts = 0;
    do {
      [a, b] = fisherYatesShuffle(availableItems).slice(0, 2);
      attempts += 1;
    } while (lastPairKeyRef.current === pairKey(a.value, b.value) && attempts < 10);
    lastPairKeyRef.current = pairKey(a.value, b.value);

    const emoji = COUNTING_EMOJIS[Math.floor(Math.random() * COUNTING_EMOJIS.length)];
    const correctSide: Side = a.value > b.value ? 'left' : 'right';

    setRound({ left: a, right: b, correctSide, emoji });
    setPileState({ left: 'neutral', right: 'neutral' });
    setWrongSide(null);
    setShowSuccess(false);
  }, [availableItems]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !round) startNewRound();
  }, [gameState, round, startNewRound]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setTimeout(
        () => audioManager.play({ clips: [getPhraseClip(locale, 'whereIsMore')] }),
        TIMING.AUDIO_DELAY_MS,
      );
      return () => clearTimeout(timer);
    }
  }, [gameState, locale]);

  useEffect(() => {
    const overlay = showSessionComplete ? 'session-complete' : showSuccess ? 'success' : null;
    setE2EState({
      overlay,
      correctSide: round?.correctSide ?? null,
      wrongSide,
    });
  }, [round, showSuccess, showSessionComplete, wrongSide]);

  const handleTap = (side: Side) => {
    if (!round || showSuccess || showSessionComplete) return;
    setTotalTaps((prev) => prev + 1);
    const item = round[side];

    if (side === round.correctSide) {
      audioManager.play(getItemAnnouncementAudio(locale, 'numbers', item.audioKey, String(item.value)));
      setPileState((prev) => ({ ...prev, [side]: 'correct' }));
      const nextRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(nextRoundsPlayed);
      setCorrectRounds((prev) => prev + 1);
      if (nextRoundsPlayed >= MAX_ROUNDS) {
        setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      } else {
        setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
      }
    } else {
      audioManager.play(getWrongAnswerAudio(locale, 'numbers', item.audioKey, String(item.value)));
      setWrongSide(side);
    }
  };

  if (gameState === 'HOME') {
    return (
      <GameLobby
        title={lobby.title}
        playButtonColorClassName={lobby.playButtonColorClassName}
        subtitle={<>Rozsah: {range.start} - {range.end}</>}
        onPlay={() => setGameState('PLAYING')}
        onBack={onExit}
        onOpenSettings={onOpenSettings}
        topDecorationClassName={lobby.topDecorationClassName}
        bottomDecorationClassName={lobby.bottomDecorationClassName}
      />
    );
  }

  return (
    <AppScreen contentClassName="gap-3 sm:gap-4 md:gap-5">
      <TopBar
        left={<BackButton onClick={() => setGameState('HOME')} />}
        center={<RoundCounter completed={roundsPlayed} total={MAX_ROUNDS} />}
        right={(
          <IconButton label="Prehrať zvuk" onClick={() => audioManager.play({ clips: [getPhraseClip(locale, 'whereIsMore')] })}>
            <Volume2 size={24} className="sm:w-7 sm:h-7" />
          </IconButton>
        )}
      />

      {round && (
        <div className="grid grid-cols-2 gap-4 sm:gap-6 flex-1 min-h-0">
          {(['left', 'right'] as const).map((side) => (
            <ChoiceTile
              key={side}
              shape="option"
              state={pileState[side] === 'correct' ? 'correct' : 'neutral'}
              disabled={wrongSide === side}
              onClick={() => handleTap(side)}
              aria-label={side === 'left' ? 'Ľavá skupina' : 'Pravá skupina'}
              className="h-full !rounded-[30px] sm:!rounded-[40px]"
            >
              {mode === 'numerals' ? (
                <span className="text-6xl font-spline sm:text-8xl">{round[side].value}</span>
              ) : (
                <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 max-w-[85%]">
                  {Array.from({ length: round[side].value }).map((_, i) => (
                    <span key={i} aria-hidden="true" className="text-3xl sm:text-5xl select-none">
                      {round.emoji}
                    </span>
                  ))}
                </div>
              )}
            </ChoiceTile>
          ))}
        </div>
      )}

      {round && (
        <SuccessOverlay
          show={showSuccess}
          spec={{ echoLine: `${round[round.correctSide].value} ⭐` }}
          onComplete={startNewRound}
        />
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
```

Notes on deliberate choices (so you don't "fix" these later by accident):
- No `FailureOverlay`, no `maxAttempts`, no attempt counter — by design (see plan header). A wrong tap sets `wrongSide`, which passes `disabled={true}` to that `ChoiceTile`. `ChoiceTile` (`src/shared/ui/ChoiceTile.tsx`) resolves `disabled` to its `'disabled'` visual state (dimmed, non-interactive) regardless of the `state` prop, and sets the real HTML `disabled` attribute — so the wrong pile becomes genuinely untappable and the correct pile stays live. That's the whole "self-correct" mechanic.
- `startNewRound` picks 2 distinct items directly from `availableItems` (not a shuffled-queue-of-singles like `CountingItemsGame`), because this game draws *pairs*, not individual targets — a queue model doesn't map cleanly. The `pairKey`/`lastPairKeyRef` guard only prevents showing the exact same pair twice in a row; it does not guarantee full coverage of the range, which is an acceptable simplification for this game (see design doc's Edge Cases section).
- Prompt audio ("Kde je viac?") plays once per PLAYING-session mount (via the `[gameState, locale]` effect), not every round — same pattern as `CountingItemsGame`'s `countItems` phrase. The speaker `IconButton` lets it be replayed on demand.

- [ ] **Step 2: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/games/compare/CompareQuantitiesGame.tsx
git commit -m "feat: implement CompareQuantitiesGame component"
```

---

## Task 8: Wire it into the app shell

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Import the component**

Find:

```tsx
import { CountingItemsGame } from './games/counting/CountingItemsGame';
```

Replace with:

```tsx
import { CountingItemsGame } from './games/counting/CountingItemsGame';
import { CompareQuantitiesGame } from './games/compare/CompareQuantitiesGame';
```

- [ ] **Step 2: Add the route**

Find:

```tsx
          <Route
            path="/counting"
            element={
              <ErrorBoundary>
                <CountingItemsGame range={settings.countingRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('COUNTING_ITEMS')} />
              </ErrorBoundary>
            }
          />
          <Route
            path="/words"
```

Replace with:

```tsx
          <Route
            path="/counting"
            element={
              <ErrorBoundary>
                <CountingItemsGame range={settings.countingRange} onExit={handleExitGame} onOpenSettings={() => handleOpenSettings('COUNTING_ITEMS')} />
              </ErrorBoundary>
            }
          />
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

- [ ] **Step 3: Type-check**

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 4: Manual smoke check**

```bash
npm run dev
```

Open `http://localhost:3000/` in a browser:
- Confirm a "Viac alebo Menej" card appears on the home screen and navigates to `/compare`.
- Confirm the lobby shows "VIAC ALEBO MENEJ" and a "Rozsah: 1 - 5" subtitle, and tapping play starts a round with two piles of emoji.
- Tap the pile with fewer objects: it should dim and become untappable; the other pile should still be tappable.
- Tap the remaining pile: the success overlay should appear.
- Go to Settings → Viac alebo Menej: confirm the "Porovnávaj čísla" toggle and the 5/10 range picker are present and work (switching the toggle on should make future rounds show numerals instead of emoji piles).

Stop the dev server (`Ctrl+C`) once confirmed.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire compare quantities game into routing"
```

---

## Task 9: End-to-end tests

**Files:**
- Modify: `e2e/smoke.spec.ts`
- Create: `e2e/compare-quantities.spec.ts`

- [ ] **Step 1: Add the route to the smoke suite**

In `e2e/smoke.spec.ts`, find:

```ts
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
```

Replace with:

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

- [ ] **Step 2: Write the golden-path spec**

This game doesn't fit the shared `FindItGame` oracle (`e2e/find-it-games.spec.ts` expects `correctItemId`/`gridItemIds`), so it gets its own spec file, using the `overlay`/`correctSide`/`wrongSide` fields the component's `setE2EState` call (Task 7) already exposes on `window.__E2E__`.

Create `e2e/compare-quantities.spec.ts`:

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

interface CompareE2EState extends E2EGlobalState {
  correctSide: 'left' | 'right' | null;
  wrongSide: 'left' | 'right' | null;
}

const SIDE_LABEL: Record<'left' | 'right', string> = {
  left: 'Ľavá skupina',
  right: 'Pravá skupina',
};

function otherSide(side: 'left' | 'right'): 'left' | 'right' {
  return side === 'left' ? 'right' : 'left';
}

test('compare quantities: correct tap reaches the success overlay', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<CompareE2EState>(page);
  expect(state.correctSide, 'expected an active round').not.toBeNull();
  await page.getByRole('button', { name: SIDE_LABEL[state.correctSide!] }).click();
  await waitForOverlay(page, 'success');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});

test('compare quantities: wrong tap disables that pile and lets the child self-correct', async ({ page }) => {
  const errors = trackConsoleErrors(page);
  const failedRequests = trackFailedRequests(page);
  await page.goto('/compare');
  await page.getByRole('button', { name: 'Hrať' }).click();

  const state = await getE2EState<CompareE2EState>(page);
  expect(state.correctSide, 'expected an active round').not.toBeNull();
  const wrong = otherSide(state.correctSide!);

  const wrongButton = page.getByRole('button', { name: SIDE_LABEL[wrong] });
  await wrongButton.click();
  await expect(wrongButton).toBeDisabled();

  const correctButton = page.getByRole('button', { name: SIDE_LABEL[state.correctSide!] });
  await expect(correctButton).toBeEnabled();
  await correctButton.click();
  await waitForOverlay(page, 'success');

  expectNoConsoleErrors(errors);
  expectNoFailedRequests(failedRequests);
});
```

- [ ] **Step 3: Run the e2e suite**

```bash
npm run test:e2e
```

Expected: PASS for all tests, including the two new `compare-quantities.spec.ts` tests and the new `compare: route loads and lobby renders` smoke test.

- [ ] **Step 4: Commit**

```bash
git add e2e/smoke.spec.ts e2e/compare-quantities.spec.ts
git commit -m "test: add e2e coverage for compare quantities game"
```

---

## Task 10: Final verification and roadmap update

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Run the full verification pass**

```bash
npm run lint
npm run test:audio
npm run test:e2e
```

Expected:
- `npm run lint` — PASS.
- `npm run test:audio` — the `phrases` category will report **one missing file**: `sk/phrases/kde-je-viac.mp3` (5 of 6 categories pass; `phrases` fails). **This is expected, not a bug** — per `CLAUDE.md`'s audio workflow, new phrases ship with a TTS fallback (`text: 'Kde je viac?'`) and get a real recording dropped in later at `public/audio/sk/phrases/kde-je-viac.mp3`; the game works correctly without it (Web Speech API speaks the fallback text). Do not attempt to fabricate a placeholder mp3 to make this pass — leave it failing and mention it to the user.
- `npm run test:e2e` — PASS.

- [ ] **Step 2: Update the roadmap**

In `ROADMAP.md`, find:

```markdown
- [ ] **Viac alebo Menej** — quantity comparison game (two object piles, tap the one with more; numeral-comparison mode as a setting). Spec: `docs/superpowers/specs/2026-09-02-compare-quantities-game-design.md`.
```

Replace with:

```markdown
- [x] **Viac alebo Menej** — quantity comparison game (two object piles, tap the one with more; numeral-comparison mode as a setting). Spec: `docs/superpowers/specs/2026-09-02-compare-quantities-game-design.md`.
```

- [ ] **Step 3: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: mark Viac alebo Menej game complete in roadmap"
```

- [ ] **Step 4: Push and open a PR (if the user wants one)**

```bash
git push -u origin feat/compare-quantities-game
```

Then open a pull request against `main` summarizing the change (link the design doc and this plan). Confirm with the user before pushing/opening a PR if that wasn't already agreed.

---

## Follow-up (not part of this plan)

**Simple Addition with Objects** — the next planned game after this one (two small object groups combined, tap the matching numeral total) is tracked in `ROADMAP.md` but intentionally **not** designed or planned here. It needs its own brainstorming session once this game has been used and validated.
