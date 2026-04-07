# Words Game — Design Spec

**Date:** 2026-04-07
**Status:** Approved

---

## Overview

Introduce a Words game and refactor the shared game infrastructure to eliminate the `ContentItem` god object. The refactor introduces a `GameDescriptor<T>` pattern so future games can be added without touching shared infrastructure.

This spec covers two things:
1. The architectural refactor (breaking change)
2. The Words game built on top of it

---

## Game Mechanic

**"See the syllabified word, tap the emoji."**

- The prompt area shows the target word in syllabified form (e.g. `JA-HO-DA`) in large bold text
- An audio button replays the prompt: "Čo tu je napísané?" followed by the word spoken aloud
- Audio plays automatically on round start
- A 6-card emoji grid is shown; the child taps the emoji that matches the written word
- Wrong tap: shake animation, no audio hint (just "Skús to znova.")
- Correct tap: `SuccessOverlay` with echo line `ja-ho-da 🍓`
- After overlay: next round automatically

**Content source:** `WORD_ITEMS` from `contentRegistry.ts` (44 words, all with emoji). No new content entries needed beyond adding `audioKey` to each `Word`.

---

## Architecture: GameDescriptor Pattern

### Motivation

`ContentItem` is a god object — it accumulates optional fields per game type, and consumers (`SuccessOverlay`, `audioManager`) switch on `category` to vary behavior. This doesn't scale.

### New domain models

Replace `ContentItem` with four pure domain types (no `category` field, no optional cross-game fields):

```typescript
interface Letter {
  symbol: string;    // "A", "Š", "DŽ"
  label: string;     // "Auto"
  emoji: string;     // "🚗"
  audioKey: string;  // "a", "s-caron"
}

interface Syllable {
  symbol: string;      // "JA"
  audioKey: string;    // "ja"
  sourceWords: Word[]; // for success echo line
}

interface Word {
  word: string;       // "Jahoda"
  syllables: string;  // "ja-ho-da"
  emoji: string;      // "🍓"
  audioKey: string;   // "jahoda"
}

interface SlovakNumber {
  value: number;    // 3
  audioKey: string; // "3"
}
```

### Shared spec types

```typescript
// Describes what audio to play — computed by descriptors, consumed by audioManager
interface AudioSpec {
  sequence: string[]; // resolved file paths e.g. ["phrases/co-tu-je-napisane", "words/jahoda"]
  fallbackText: string;
}

// Describes what the success overlay shows — computed by descriptors, consumed by SuccessOverlay
interface SuccessSpec {
  echoLine: string; // "ja-ho-da 🍓"
}
```

### GameDescriptor interface

```typescript
interface GameDescriptor<T> {
  gridSize: number;
  getItems(): T[];
  getItemId(item: T): string;                          // used for dedup/comparison
  renderCard(item: T): ReactNode;
  renderPrompt(target: T): ReactNode;                  // null = audio-only prompt
  getPromptAudio(target: T): AudioSpec;
  getWrongAudio(target: T, selected: T): AudioSpec;
  getSuccessSpec(target: T): SuccessSpec;
}
```

### FindItGame<T> — generic game engine

A single generic component that handles all "find it in a grid" games:

```typescript
interface FindItGameProps<T> {
  descriptor: GameDescriptor<T>;
  onExit: () => void;
  onOpenSettings: () => void;
}
```

Responsibilities:
- Picks a random target from `descriptor.getItems()`, avoiding repeating the previous target
- Builds a distractor grid of `descriptor.gridSize` items
- Calls `audioManager.play(descriptor.getPromptAudio(target))` on round start and on replay button tap
- Renders `descriptor.renderPrompt(target)` and the grid of `descriptor.renderCard(item)` cards
- On wrong tap: shake animation + `audioManager.play(descriptor.getWrongAudio(target, selected))`
- On correct tap: shows `SuccessOverlay` with `descriptor.getSuccessSpec(target)`
- On overlay complete: starts next round

### Infrastructure changes

**`audioManager`:**
- Remove: `playLetter`, `playSyllable`, `playNumber`, `playAnnouncement`, `PhraseTemplate` registry
- Add: `play(spec: AudioSpec): void`
- Keep: `playPraise`, `updateSettings`

**`SuccessOverlay`:**
- Prop `item: ContentItem` → `spec: SuccessSpec`
- Delete `getEchoLine()` — echo line is `spec.echoLine`, already computed by the descriptor
- All other UI (praise, confetti, pause button) unchanged

**`types.ts`:**
- Remove `ContentItem`, `PhraseTemplate`, `GameId` (or update `GameId` to include `'WORDS'`)
- Add `Letter`, `Syllable`, `Word` (rename from `WordItem`), `SlovakNumber`, `AudioSpec`, `SuccessSpec`, `GameDescriptor<T>`

**`contentRegistry.ts`:**
- `LETTER_ITEMS`: typed as `Letter[]` (entries with undefined emoji/label either removed or kept in a separate `ALL_LETTER_ITEMS` constant)
- `WORD_ITEMS`: typed as `Word[]`, each entry gains `audioKey` (lowercase ASCII word, e.g. `"jahoda"`, `"zirafa"`)
- `SYLLABLE_ITEMS`: re-derived as `Syllable[]` instead of `ContentItem[]`
- `NUMBER_ITEMS`: typed as `SlovakNumber[]`

---

## Migrating Existing Games

The counting game (`CountingItemsGame`) has a different mechanic; it stays bespoke but updates to use `AudioSpec` directly instead of `PhraseTemplate`.

The other three existing games each get a descriptor file and shrink to a thin wrapper:

### `src/games/alphabet/alphabetDescriptor.ts`
```typescript
export const alphabetDescriptor: GameDescriptor<Letter> = {
  gridSize: 8,
  getItems: () => ACTIVE_LETTER_ITEMS,
  getItemId: (l) => l.symbol,
  renderCard: (l) => <span>{l.symbol}</span>,
  renderPrompt: (_l) => null,
  getPromptAudio: (l) => ({
    sequence: ['phrases/najdi-pismeno', `letters/${l.audioKey}`],
    fallbackText: `Nájdi písmenko ${l.symbol}`,
  }),
  getWrongAudio: (_t, s) => ({
    sequence: ['phrases/toto-je-pismeno', `letters/${s.audioKey}`, 'phrases/skus-to-znova'],
    fallbackText: `Toto je písmenko ${s.symbol}. Skús to znova.`,
  }),
  getSuccessSpec: (l) => ({ echoLine: `${l.symbol} ako ${l.label} ${l.emoji}` }),
};
```

### `src/games/syllables/syllablesDescriptor.ts`
```typescript
export const syllablesDescriptor: GameDescriptor<Syllable> = {
  gridSize: 6,
  getItems: () => SYLLABLE_ITEMS,
  getItemId: (s) => s.symbol,
  renderCard: (s) => <span>{s.symbol}</span>,
  renderPrompt: (_s) => null,
  getPromptAudio: (s) => ({
    sequence: ['phrases/slabika', `syllables/${s.audioKey}`],
    fallbackText: `Slabika ${s.symbol}`,
  }),
  getWrongAudio: (t, _s) => ({
    sequence: ['phrases/slabika', `syllables/${t.audioKey}`, 'phrases/skus-to-znova'],
    fallbackText: `Slabika ${t.symbol}. Skús to znova.`,
  }),
  getSuccessSpec: (s) => {
    const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
    return { echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}` };
  },
};
```

### `src/games/numbers/numbersDescriptor.ts`
Same pattern, uses `SlovakNumber[]`.

---

## Words Game

### Files

- `src/games/words/wordsDescriptor.ts`
- `src/games/words/WordsGame.tsx`

### Descriptor

```typescript
export const wordsDescriptor: GameDescriptor<Word> = {
  gridSize: 6,
  getItems: () => WORD_ITEMS,
  getItemId: (w) => w.word,
  renderCard: (w) => <span className="text-6xl">{w.emoji}</span>,
  renderPrompt: (w) => (
    <h2 className="text-5xl sm:text-7xl font-black tracking-widest">
      {w.syllables.toUpperCase()}
    </h2>
  ),
  getPromptAudio: (w) => ({
    sequence: ['phrases/co-tu-je-napisane', `words/${w.audioKey}`],
    fallbackText: `Čo tu je napísané? ${w.word}`,
  }),
  getWrongAudio: (_t, _s) => ({
    sequence: ['phrases/skus-to-znova'],
    fallbackText: 'Skús to znova.',
  }),
  getSuccessSpec: (w) => ({ echoLine: `${w.syllables} ${w.emoji}` }),
};
```

### WordsGame.tsx

Thin wrapper — home screen with "SLOVÁ" title + Play button, then `<FindItGame descriptor={wordsDescriptor} ... />`.

Home screen accent color: `text-accent-blue` / `bg-accent-blue` (distinct from alphabet green and syllables primary/pink).

### New audio file

`public/audio/phrases/co-tu-je-napisane.mp3` — TTS fallback covers development.

### WORD_ITEMS audioKey additions

Each `Word` entry needs `audioKey`: lowercase ASCII transliteration of the word.
Examples: `jahoda`, `zirafa` (ž→z), `saty` (š→s), `kacica` (č→c), `ruzа` (ž→z).

---

## Backlog Addition

**Drag-and-drop syllable assembly game** — child sees shuffled syllable tiles and drags them into the correct order to form the word. To be specced separately before implementation.

---

## Files Touched

| File | Change |
|------|--------|
| `src/shared/types.ts` | Replace `ContentItem`/`PhraseTemplate` with `Letter`, `Syllable`, `Word`, `SlovakNumber`, `AudioSpec`, `SuccessSpec`, `GameDescriptor<T>` |
| `src/shared/contentRegistry.ts` | Retype all item arrays; add `audioKey` to each `Word` entry |
| `src/shared/services/audioManager.ts` | Replace `playLetter`/etc. + template registry with `play(spec)` |
| `src/shared/components/SuccessOverlay.tsx` | Accept `SuccessSpec` instead of `ContentItem` |
| `src/shared/components/FindItGame.tsx` | New generic game engine |
| `src/games/alphabet/AlphabetGame.tsx` | Shrink to thin wrapper |
| `src/games/alphabet/alphabetDescriptor.ts` | New |
| `src/games/syllables/SyllablesGame.tsx` | Shrink to thin wrapper |
| `src/games/syllables/syllablesDescriptor.ts` | New |
| `src/games/numbers/NumbersGame.tsx` | Shrink to thin wrapper |
| `src/games/numbers/numbersDescriptor.ts` | New |
| `src/games/counting/CountingItemsGame.tsx` | Update to use `AudioSpec` directly |
| `src/games/words/WordsGame.tsx` | New |
| `src/games/words/wordsDescriptor.ts` | New |
| `src/App.tsx` | Add words game to registry and home screen grid |
| `ROADMAP.md` | Mark words game tasks in progress; add drag-and-drop to backlog |
