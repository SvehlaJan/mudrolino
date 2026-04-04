# Syllables Word Dictionary — Design Spec
**Date:** 2026-04-04

## Overview

Replace the 60-item algorithmic `SYLLABLE_ITEMS` generator with a curated `WORD_ITEMS` dictionary. Syllables are derived from the dictionary, and the success screen echo line shows a randomly selected word containing that syllable (with its emoji).

Gameplay is unchanged: the child hears a syllable and picks it from a grid of 6.

---

## Data Model

### New type: `WordItem` (`src/shared/types.ts`)

```ts
export interface WordItem {
  word: string;       // "Jahoda"
  syllables: string;  // "ja-ho-da"  (hyphen-separated, lowercase)
  emoji: string;      // "🍓"
}
```

### Updated type: `ContentItem` (`src/shared/types.ts`)

Add one optional field:

```ts
export interface ContentItem {
  symbol: string;
  label?: string;
  emoji?: string;
  audioKey: string;
  category: 'letter' | 'syllable' | 'number' | 'word';
  sourceWords?: WordItem[];  // non-empty only for category: 'syllable'
}
```

---

## Content Registry (`src/shared/contentRegistry.ts`)

### `WORD_ITEMS`

Replace the algorithmic generator with a curated `WordItem[]`. Each entry has a Slovak word, its hyphen-separated syllable breakdown (lowercase), and an emoji. Example:

```ts
export const WORD_ITEMS: WordItem[] = [
  { word: 'Jahoda',  syllables: 'ja-ho-da',  emoji: '🍓' },
  { word: 'Mama',    syllables: 'ma-ma',      emoji: '👩' },
  { word: 'Mačka',   syllables: 'mač-ka',     emoji: '🐱' },
  // …
];
```

### `SYLLABLE_ITEMS` (derived)

Derived from `WORD_ITEMS`:

1. Parse each entry's `syllables` field by splitting on `'-'`.
2. Uppercase each syllable to get the `symbol`.
3. Group all `WordItem` entries that contain a given syllable into `sourceWords`.
4. One `ContentItem` per unique uppercase syllable, with `audioKey` = lowercase syllable.

```ts
export const SYLLABLE_ITEMS: ContentItem[] = /* derived */
```

When a syllable appears in multiple words (e.g. "MA" in "Mama" and "Mačka"), all matching `WordItem` entries are included in `sourceWords`. The random selection happens at render time in `SuccessOverlay`.

---

## SuccessOverlay (`src/shared/components/SuccessOverlay.tsx`)

The echo line currently uses `item.label` and `item.emoji` directly. Update it to:

- If `item.sourceWords` is present and non-empty → pick a random entry at render time (when `show` flips to `true`), use `entry.word` as label and `entry.emoji` as emoji for the echo line.
- Otherwise → fall back to `item.label` / `item.emoji` (letters, numbers unchanged).

The random pick is computed once per success display (not re-randomised on re-render).

---

## SyllablesGame (`src/games/syllables/SyllablesGame.tsx`)

No logic changes required. The game already passes `targetItem` to `<SuccessOverlay>` — the new `sourceWords` field is carried automatically.

---

## Audio

- `audioManager.playSyllable` continues to announce "Slabika {symbol}" using `item.symbol`. No change.
- `audioKey` on derived syllable items = lowercase syllable (e.g. `"ja"` → `public/audio/syllables/ja.mp3`).
- Only syllables present in `WORD_ITEMS` will have entries in `SYLLABLE_ITEMS`; the 60-item algorithmic pool is removed entirely.

---

## Out of Scope

- No new audio for word names on the success screen (TTS fallback handles it if needed).
- No changes to the syllables game grid UI or game flow.
- No changes to any other game.
