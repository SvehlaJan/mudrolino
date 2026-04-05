# Syllables Word Dictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 60-item algorithmic syllable generator with a curated `WORD_ITEMS` dictionary; derive syllables from it; show a randomly-picked word + emoji on the success echo line.

**Architecture:** Add `WordItem` to `types.ts` and `sourceWords` to `ContentItem`. Build `WORD_ITEMS` + derived `SYLLABLE_ITEMS` in `contentRegistry.ts`. Update `SuccessOverlay` to pick a random `WordItem` from `sourceWords` when `show` fires and render it in the echo line.

**Tech Stack:** TypeScript, React, Vite (`npm run lint` = tsc --noEmit; no test runner configured)

---

## File Map

| File | Change |
|---|---|
| `src/shared/types.ts` | Add `WordItem` interface; add `sourceWords?: WordItem[]` to `ContentItem` |
| `src/shared/contentRegistry.ts` | Add `WORD_ITEMS`; replace algorithmic generator with derived `SYLLABLE_ITEMS` |
| `src/shared/components/SuccessOverlay.tsx` | Pick random `echoWord` from `sourceWords`; pass to `getEchoLine` |

---

## Task 1: Add `WordItem` type and `sourceWords` field

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add `WordItem` and update `ContentItem`**

Replace the `ContentItem` interface and add the new `WordItem` interface in `src/shared/types.ts`. The full updated types section:

```ts
export interface WordItem {
  word: string;       // "Jahoda"
  syllables: string;  // "ja-ho-da"  (hyphen-separated, lowercase)
  emoji: string;      // "🍓"
}

export interface ContentItem {
  symbol: string;        // Display character: "A", "Š", "MA", "3"
  label?: string;        // Human-readable word, e.g. "Ananás" for A
  emoji?: string;        // Optional emoji, e.g. "🍎" — undefined = TBD, excluded from games
  audioKey: string;      // ASCII slug for audio path: "a", "s-caron", "ma", "3"
  category: 'letter' | 'syllable' | 'number' | 'word';
  sourceWords?: WordItem[]; // non-empty only for category: 'syllable'
}
```

- [ ] **Step 2: Verify types compile**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add WordItem type and sourceWords field to ContentItem"
```

---

## Task 2: Replace algorithmic syllables with word dictionary

**Files:**
- Modify: `src/shared/contentRegistry.ts`

- [ ] **Step 1: Add `WordItem` to imports and replace syllables section**

In `src/shared/contentRegistry.ts`:

1. Add `WordItem` to the import at line 5:

```ts
import { ContentItem, PraiseEntry, WordItem } from './types';
```

2. Replace the entire syllables section (lines 79–90 — the `SYLLABLE_CONSONANTS`, `SYLLABLE_VOWELS`, and `SYLLABLE_ITEMS` definitions) with the following:

```ts
// ---------------------------------------------------------------------------
// Words — curated Slovak words with syllable breakdowns.
// Syllables are derived from this list; extend it to add more game content.
// ---------------------------------------------------------------------------
export const WORD_ITEMS: WordItem[] = [
  { word: 'Jahoda',   syllables: 'ja-ho-da',    emoji: '🍓' },
  { word: 'Mama',     syllables: 'ma-ma',        emoji: '👩' },
  { word: 'Malina',   syllables: 'ma-li-na',     emoji: '🫐' },
  { word: 'Tata',     syllables: 'ta-ta',        emoji: '👨' },
  { word: 'Tulipán',  syllables: 'tu-li-pán',    emoji: '🌷' },
  { word: 'Lipa',     syllables: 'li-pa',        emoji: '🌳' },
  { word: 'Lano',     syllables: 'la-no',        emoji: '🪢' },
  { word: 'Luna',     syllables: 'lu-na',        emoji: '🌙' },
  { word: 'Lopata',   syllables: 'lo-pa-ta',     emoji: '🪣' },
  { word: 'Sova',     syllables: 'so-va',        emoji: '🦉' },
  { word: 'Sito',     syllables: 'si-to',        emoji: '🫙' },
  { word: 'Seno',     syllables: 'se-no',        emoji: '🌾' },
  { word: 'Pero',     syllables: 'pe-ro',        emoji: '✏️' },
  { word: 'Baba',     syllables: 'ba-ba',        emoji: '👵' },
  { word: 'Banán',    syllables: 'ba-nán',       emoji: '🍌' },
  { word: 'Bicykel',  syllables: 'bi-cy-kel',    emoji: '🚲' },
  { word: 'Bota',     syllables: 'bo-ta',        emoji: '👟' },
  { word: 'Bubon',    syllables: 'bu-bon',       emoji: '🥁' },
  { word: 'Voda',     syllables: 'vo-da',        emoji: '💧' },
  { word: 'Vila',     syllables: 'vi-la',        emoji: '🏡' },
  { word: 'Vata',     syllables: 'va-ta',        emoji: '🧶' },
  { word: 'Veda',     syllables: 've-da',        emoji: '🔬' },
  { word: 'Deti',     syllables: 'de-ti',        emoji: '👦' },
  { word: 'Dino',     syllables: 'di-no',        emoji: '🦕' },
  { word: 'Doma',     syllables: 'do-ma',        emoji: '🏠' },
  { word: 'Dúha',     syllables: 'dú-ha',        emoji: '🌈' },
  { word: 'Dolina',   syllables: 'do-li-na',     emoji: '🏔️' },
  { word: 'Noha',     syllables: 'no-ha',        emoji: '🦵' },
  { word: 'Nebo',     syllables: 'ne-bo',        emoji: '☁️' },
  { word: 'Nuda',     syllables: 'nu-da',        emoji: '😴' },
  { word: 'Ryba',     syllables: 'ry-ba',        emoji: '🐟' },
  { word: 'Ruka',     syllables: 'ru-ka',        emoji: '🤚' },
  { word: 'Ruža',     syllables: 'ru-ža',        emoji: '🌹' },
  { word: 'Koza',     syllables: 'ko-za',        emoji: '🐐' },
  { word: 'Kino',     syllables: 'ki-no',        emoji: '🎬' },
  { word: 'Koleso',   syllables: 'ko-le-so',     emoji: '🎡' },
  { word: 'Kukurica', syllables: 'ku-ku-ri-ca',  emoji: '🌽' },
  { word: 'Jelen',    syllables: 'je-len',       emoji: '🦌' },
  { word: 'Meno',     syllables: 'me-no',        emoji: '📛' },
  { word: 'Muha',     syllables: 'mu-ha',        emoji: '🪰' },
  { word: 'Misa',     syllables: 'mi-sa',        emoji: '🥣' },
  { word: 'Roboti',   syllables: 'ro-bo-ti',     emoji: '🤖' },
  { word: 'Kačica',   syllables: 'ka-či-ca',     emoji: '🦆' },
];

// Derive SYLLABLE_ITEMS from WORD_ITEMS.
// Each unique uppercase syllable becomes one ContentItem; all source words
// that contain it are collected into sourceWords for the success echo line.
const _syllableWordMap = new Map<string, WordItem[]>();
for (const wordItem of WORD_ITEMS) {
  for (const syl of wordItem.syllables.split('-')) {
    const key = syl.toUpperCase();
    if (!_syllableWordMap.has(key)) _syllableWordMap.set(key, []);
    _syllableWordMap.get(key)!.push(wordItem);
  }
}

export const SYLLABLE_ITEMS: ContentItem[] = Array.from(_syllableWordMap.entries()).map(
  ([symbol, words]) => ({
    symbol,
    audioKey: symbol.toLowerCase(),
    category: 'syllable' as const,
    sourceWords: words,
  })
);
```

- [ ] **Step 2: Verify types compile**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/contentRegistry.ts
git commit -m "feat: replace algorithmic syllables with WORD_ITEMS dictionary"
```

---

## Task 3: Update SuccessOverlay to render sourceWords echo line

**Files:**
- Modify: `src/shared/components/SuccessOverlay.tsx`

- [ ] **Step 1: Import `WordItem` and add `echoWord` state**

In `src/shared/components/SuccessOverlay.tsx`, update the import at line 4:

```ts
import { ContentItem, PraiseEntry, WordItem } from '../types';
```

Inside `SuccessOverlay`, add a new state variable directly after the `paused` state declaration (line 30):

```ts
const [echoWord, setEchoWord] = useState<WordItem | null>(null);
```

- [ ] **Step 2: Pick random `echoWord` when success shows**

Replace the existing `useEffect` (lines 32–40) with:

```ts
useEffect(() => {
  if (!show) { setPaused(false); return; }
  const entry = PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
  setPraise(entry);
  setPaused(false);
  if (item.sourceWords && item.sourceWords.length > 0) {
    setEchoWord(item.sourceWords[Math.floor(Math.random() * item.sourceWords.length)]);
  } else {
    setEchoWord(null);
  }
  audioManager.playPraise(entry);
  timerRef.current = setTimeout(onComplete, TIMING.SUCCESS_OVERLAY_DURATION_MS);
  return () => { if (timerRef.current) clearTimeout(timerRef.current); };
}, [show]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Update `getEchoLine` to accept `echoWord`**

Replace the `getEchoLine` function (lines 14–25) with:

```ts
function getEchoLine(item: ContentItem, echoWord?: WordItem): string {
  if (item.category === 'letter' && item.label) {
    return `${item.symbol} ako ${item.label} ${item.emoji ?? ''}`.trim();
  }
  if (item.category === 'number') {
    return `Správne, je ich ${item.symbol} ${item.emoji ?? '⭐'}`.trim();
  }
  if (item.category === 'syllable') {
    if (echoWord) return `${item.symbol} ako ${echoWord.word} ${echoWord.emoji}`.trim();
    return `${item.symbol} 🗣️`;
  }
  return `${item.symbol} ${item.emoji ?? ''}`.trim();
}
```

- [ ] **Step 4: Pass `echoWord` to `getEchoLine` in the render**

Find the line that calls `getEchoLine(item)` (line 88) and update it to:

```tsx
{getEchoLine(item, echoWord ?? undefined)}
```

- [ ] **Step 5: Verify types compile**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 6: Smoke test in browser**

```bash
npm run dev
```

Open the Syllables game. Complete a round. The success overlay should show an echo line like `JA ako Jahoda 🍓`. Play several more rounds — rounds with the same syllable should occasionally show different words.

- [ ] **Step 7: Commit**

```bash
git add src/shared/components/SuccessOverlay.tsx
git commit -m "feat: show random source word echo line on syllable success"
```
