# Words Game & GameDescriptor Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a generic `GameDescriptor<T>` pattern to eliminate the `ContentItem` god object, then add the Words game on top of it.

**Architecture:** Each "find it in a grid" game defines a `GameDescriptor<T>` — an object of pure functions for rendering cards, computing audio specs, and building success display. A shared `FindItGame<T>` component handles the entire round loop generically. Domain models (`Letter`, `Syllable`, `Word`, `SlovakNumber`) replace `ContentItem`. `CountingItemsGame` is a bespoke mechanic and keeps its own component but updates to use `AudioSpec`/`SuccessSpec` directly.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Framer Motion (`motion/react`)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/types.ts` | Rewrite | Domain models, `AudioSpec`, `SuccessSpec`, `GameDescriptor<T>` |
| `src/shared/contentRegistry.ts` | Modify | Retype all item arrays; add `audioKey` to `Word` entries |
| `src/shared/services/audioManager.ts` | Modify | Replace `playX()` methods with `play(spec: AudioSpec)` |
| `src/shared/components/SuccessOverlay.tsx` | Modify | Accept `SuccessSpec` instead of `ContentItem` |
| `src/shared/components/FindItGame.tsx` | Create | Generic "find it in a grid" game engine |
| `src/games/alphabet/alphabetDescriptor.ts` | Create | `GameDescriptor<Letter>` for the alphabet game |
| `src/games/alphabet/AlphabetGame.tsx` | Modify | Thin wrapper: home screen + `<FindItGame>` |
| `src/games/syllables/syllablesDescriptor.ts` | Create | `GameDescriptor<Syllable>` for the syllables game |
| `src/games/syllables/SyllablesGame.tsx` | Modify | Thin wrapper: home screen + `<FindItGame>` |
| `src/games/numbers/numbersDescriptor.ts` | Create | Factory `createNumbersDescriptor(range)` → `GameDescriptor<SlovakNumber>` |
| `src/games/numbers/NumbersGame.tsx` | Modify | Thin wrapper: home screen + `<FindItGame>` |
| `src/games/counting/CountingItemsGame.tsx` | Modify | Update to `AudioSpec` + `SuccessSpec` (no descriptor, bespoke mechanic) |
| `src/games/words/wordsDescriptor.ts` | Create | `GameDescriptor<Word>` for the words game |
| `src/games/words/WordsGame.tsx` | Create | Thin wrapper: home screen + `<FindItGame>` |
| `src/App.tsx` | Modify | Add Words game to registry and screen router |
| `ROADMAP.md` | Modify | Mark tasks complete, add drag-and-drop to backlog |

> **Note on TypeScript errors during migration:** Tasks 1–5 establish the new foundation. Tasks 6–11 migrate consumers one by one. TypeScript errors will exist between tasks — that is expected. `npm run lint` is only expected to pass cleanly after Task 11 Step 7.

---

### Task 1: Rewrite types.ts

**Files:**
- Rewrite: `src/shared/types.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import type { ReactNode } from 'react';

export type Screen = 'HOME' | 'GAME' | 'PARENTS_GATE' | 'SETTINGS';

export type GameId = 'ALPHABET' | 'SYLLABLES' | 'NUMBERS' | 'COUNTING_ITEMS' | 'WORDS';

export interface GameSettings {
  music: boolean;
  numbersRange: { start: number; end: number };
  countingRange: { start: number; end: number };
}

export interface GameMetadata {
  id: GameId;
  title: string;
  description: string;
  icon: string;
  color: string;
}

// ---------------------------------------------------------------------------
// Domain models — pure data, no game logic, no optional cross-game fields
// ---------------------------------------------------------------------------

export interface Letter {
  symbol: string;    // "A", "Š", "DŽ"
  label: string;     // "Auto"
  emoji: string;     // "🚗"
  audioKey: string;  // "a", "s-caron", "dz-caron"
}

export interface Syllable {
  symbol: string;       // "JA"
  audioKey: string;     // "ja"
  sourceWords: Word[];  // used for success echo line
}

export interface Word {
  word: string;       // "Jahoda"
  syllables: string;  // "ja-ho-da"
  emoji: string;      // "🍓"
  audioKey: string;   // "jahoda" (lowercase ASCII, no diacritics)
}

export interface SlovakNumber {
  value: number;    // 3
  audioKey: string; // "3"
}

// ---------------------------------------------------------------------------
// Shared spec types — describe behavior, not domain
// ---------------------------------------------------------------------------

/** Describes a sequence of audio clips to play, with a TTS fallback. */
export interface AudioSpec {
  /** Paths relative to /audio/, without .mp3 — e.g. "phrases/najdi-pismeno", "letters/a" */
  sequence: string[];
  fallbackText: string;
}

/** Describes what the SuccessOverlay shows. */
export interface SuccessSpec {
  echoLine: string; // e.g. "ja-ho-da 🍓" or "A ako Auto 🚗"
}

// ---------------------------------------------------------------------------
// GameDescriptor — registered per "find it in a grid" game type
// ---------------------------------------------------------------------------

export interface GameDescriptor<T> {
  /** Total cards in the grid including the target. */
  gridSize: number;
  /** Tailwind grid-cols classes, e.g. "grid-cols-2 sm:grid-cols-3" */
  gridColsClass: string;
  /** Returns all items in the pool for this game. */
  getItems(): T[];
  /** Returns a stable unique string id for an item — used for dedup and comparison. */
  getItemId(item: T): string;
  /** Renders the card face shown in the grid. */
  renderCard(item: T): ReactNode;
  /**
   * Renders the prompt shown above the grid (e.g. syllabified word for Words game).
   * Return null for audio-only prompts (Alphabet, Syllables, Numbers).
   */
  renderPrompt(target: T): ReactNode;
  /** Audio to play at round start and when the replay button is tapped. */
  getPromptAudio(target: T): AudioSpec;
  /** Audio to play when the child taps a wrong card. */
  getWrongAudio(target: T, selected: T): AudioSpec;
  /** Success overlay content for the correct answer. */
  getSuccessSpec(target: T): SuccessSpec;
}

// ---------------------------------------------------------------------------
// Praise
// ---------------------------------------------------------------------------

export interface PraiseEntry {
  emoji: string;    // "🌟"
  text: string;     // "Výborne!"
  audioKey: string; // "vyborne" → praise/vyborne.mp3
}
```

- [ ] **Step 2: Verify the file saves without syntax errors**

Run: `npm run lint 2>&1 | head -30`

Expected: many errors (all consumers still use old types) — that is fine. Verify the error list does NOT include `src/shared/types.ts` itself.

---

### Task 2: Update contentRegistry.ts

**Files:**
- Modify: `src/shared/contentRegistry.ts`

- [ ] **Step 1: Replace the file**

```typescript
import { Letter, Syllable, Word, SlovakNumber, PraiseEntry } from './types';

export const COLORS = ['text-primary', 'text-success', 'text-accent-blue'];
export const BG_COLORS = ['bg-primary', 'bg-success', 'bg-accent-blue'];

export const TIMING = {
  AUDIO_DELAY_MS: 100,
  FEEDBACK_RESET_MS: 500,
  SUCCESS_SHOW_DELAY_MS: 500,
  SUCCESS_OVERLAY_DURATION_MS: 3000,
  COUNTING_OPTIONS_DELAY_MS: 2000,
};

// ---------------------------------------------------------------------------
// Letters — active Slovak alphabet (entries with complete emoji + label only).
// Phase 1 settings UI will introduce ALL_LETTER_SYMBOLS for the full 46.
// ---------------------------------------------------------------------------
export const LETTER_ITEMS: Letter[] = [
  { symbol: 'A',  label: 'Auto',     emoji: '🚗',   audioKey: 'a' },
  { symbol: 'Á',  label: 'Áno',      emoji: '👍',   audioKey: 'a-acute' },
  { symbol: 'B',  label: 'Baran',    emoji: '🐏',   audioKey: 'b' },
  { symbol: 'C',  label: 'Citrón',   emoji: '🍋',   audioKey: 'c' },
  { symbol: 'Č',  label: 'Čajík',    emoji: '🫖',   audioKey: 'c-caron' },
  { symbol: 'D',  label: 'Dúha',     emoji: '🌈',   audioKey: 'd' },
  { symbol: 'Ď',  label: 'Ďakujem',  emoji: '🫶',   audioKey: 'd-caron' },
  { symbol: 'DZ', label: 'Dzúra',    emoji: '🕳️',   audioKey: 'dz' },
  { symbol: 'DŽ', label: 'Džungľa',  emoji: '🌴',   audioKey: 'dz-caron' },
  { symbol: 'E',  label: 'Euro',     emoji: '💶',   audioKey: 'e' },
  { symbol: 'F',  label: 'Farba',    emoji: '🎨',   audioKey: 'f' },
  { symbol: 'G',  label: 'Gitara',   emoji: '🎸',   audioKey: 'g' },
  { symbol: 'H',  label: 'Hrad',     emoji: '🏰',   audioKey: 'h' },
  { symbol: 'CH', label: 'Chlieb',   emoji: '🍞',   audioKey: 'ch' },
  { symbol: 'I',  label: 'Iskra',    emoji: '⚡',   audioKey: 'i' },
  { symbol: 'Í',  label: 'Írsko',    emoji: '🇮🇪',   audioKey: 'i-acute' },
  { symbol: 'J',  label: 'Jahoda',   emoji: '🍓',   audioKey: 'j' },
  { symbol: 'K',  label: 'Kľúč',     emoji: '🗝️',   audioKey: 'k' },
  { symbol: 'L',  label: 'Líška',    emoji: '🦊',   audioKey: 'l' },
  { symbol: 'Ľ',  label: 'Ľad',      emoji: '🧊',   audioKey: 'l-caron' },
  { symbol: 'M',  label: 'Mesiac',   emoji: '🌙',   audioKey: 'm' },
  { symbol: 'N',  label: 'Nos',      emoji: '👃',   audioKey: 'n' },
  { symbol: 'Ň',  label: 'Ňufák',    emoji: '👃',   audioKey: 'n-caron' },
  { symbol: 'O',  label: 'Ovca',     emoji: '🐑',   audioKey: 'o' },
  { symbol: 'P',  label: 'Pes',      emoji: '🐕',   audioKey: 'p' },
  { symbol: 'R',  label: 'Ryba',     emoji: '🐟',   audioKey: 'r' },
  { symbol: 'S',  label: 'Slnko',    emoji: '☀️',   audioKey: 's' },
  { symbol: 'Š',  label: 'Šašo',     emoji: '🤡',   audioKey: 's-caron' },
  { symbol: 'T',  label: 'Tiger',    emoji: '🐯',   audioKey: 't' },
  { symbol: 'Ť',  label: 'Ťava',     emoji: '🐪',   audioKey: 't-caron' },
  { symbol: 'U',  label: 'Ucho',     emoji: '👂',   audioKey: 'u' },
  { symbol: 'Ú',  label: 'Úľ',       emoji: '🛖🐝', audioKey: 'u-acute' },
  { symbol: 'V',  label: 'Vlk',      emoji: '🐺',   audioKey: 'v' },
  { symbol: 'X',  label: 'Xylofón',  emoji: '🎹',   audioKey: 'x' },
  { symbol: 'Z',  label: 'Zebra',    emoji: '🦓',   audioKey: 'z' },
  { symbol: 'Ž',  label: 'Žaba',     emoji: '🐸',   audioKey: 'z-caron' },
];

// ---------------------------------------------------------------------------
// Words — Slovak words with syllable breakdowns.
// audioKey = lowercase ASCII transliteration (ž→z, š→s, č→c, ň→n, ľ→l, ú→u, etc.)
// ---------------------------------------------------------------------------
export const WORD_ITEMS: Word[] = [
  { word: 'Jahoda',   syllables: 'ja-ho-da',    emoji: '🍓', audioKey: 'jahoda' },
  { word: 'Mama',     syllables: 'ma-ma',        emoji: '👩', audioKey: 'mama' },
  { word: 'Malina',   syllables: 'ma-li-na',     emoji: '🫐', audioKey: 'malina' },
  { word: 'Tata',     syllables: 'ta-ta',        emoji: '👨', audioKey: 'tata' },
  { word: 'Lipa',     syllables: 'li-pa',        emoji: '🌳', audioKey: 'lipa' },
  { word: 'Lano',     syllables: 'la-no',        emoji: '🪢', audioKey: 'lano' },
  { word: 'Luna',     syllables: 'lu-na',        emoji: '🌙', audioKey: 'luna' },
  { word: 'Lopata',   syllables: 'lo-pa-ta',     emoji: '🪣', audioKey: 'lopata' },
  { word: 'Sova',     syllables: 'so-va',        emoji: '🦉', audioKey: 'sova' },
  { word: 'Sito',     syllables: 'si-to',        emoji: '🫙', audioKey: 'sito' },
  { word: 'Seno',     syllables: 'se-no',        emoji: '🌾', audioKey: 'seno' },
  { word: 'Pero',     syllables: 'pe-ro',        emoji: '✏️', audioKey: 'pero' },
  { word: 'Baba',     syllables: 'ba-ba',        emoji: '👵', audioKey: 'baba' },
  { word: 'Bota',     syllables: 'bo-ta',        emoji: '👟', audioKey: 'bota' },
  { word: 'Voda',     syllables: 'vo-da',        emoji: '💧', audioKey: 'voda' },
  { word: 'Vila',     syllables: 'vi-la',        emoji: '🏡', audioKey: 'vila' },
  { word: 'Vata',     syllables: 'va-ta',        emoji: '🧶', audioKey: 'vata' },
  { word: 'Veda',     syllables: 've-da',        emoji: '🔬', audioKey: 'veda' },
  { word: 'Deti',     syllables: 'de-ti',        emoji: '👦', audioKey: 'deti' },
  { word: 'Dino',     syllables: 'di-no',        emoji: '🦕', audioKey: 'dino' },
  { word: 'Doma',     syllables: 'do-ma',        emoji: '🏠', audioKey: 'doma' },
  { word: 'Dúha',     syllables: 'dú-ha',        emoji: '🌈', audioKey: 'duha' },
  { word: 'Dolina',   syllables: 'do-li-na',     emoji: '🏔️', audioKey: 'dolina' },
  { word: 'Noha',     syllables: 'no-ha',        emoji: '🦵', audioKey: 'noha' },
  { word: 'Nebo',     syllables: 'ne-bo',        emoji: '☁️', audioKey: 'nebo' },
  { word: 'Nuda',     syllables: 'nu-da',        emoji: '😴', audioKey: 'nuda' },
  { word: 'Ryba',     syllables: 'ry-ba',        emoji: '🐟', audioKey: 'ryba' },
  { word: 'Ruka',     syllables: 'ru-ka',        emoji: '🤚', audioKey: 'ruka' },
  { word: 'Ruža',     syllables: 'ru-ža',        emoji: '🌹', audioKey: 'ruza' },
  { word: 'Koza',     syllables: 'ko-za',        emoji: '🐐', audioKey: 'koza' },
  { word: 'Kino',     syllables: 'ki-no',        emoji: '🎬', audioKey: 'kino' },
  { word: 'Koleso',   syllables: 'ko-le-so',     emoji: '🎡', audioKey: 'koleso' },
  { word: 'Kukurica', syllables: 'ku-ku-ri-ca',  emoji: '🌽', audioKey: 'kukurica' },
  { word: 'Meno',     syllables: 'me-no',        emoji: '📛', audioKey: 'meno' },
  { word: 'Muha',     syllables: 'mu-ha',        emoji: '🪰', audioKey: 'muha' },
  { word: 'Misa',     syllables: 'mi-sa',        emoji: '🥣', audioKey: 'misa' },
  { word: 'Roboti',   syllables: 'ro-bo-ti',     emoji: '🤖', audioKey: 'roboti' },
  { word: 'Kačica',   syllables: 'ka-či-ca',     emoji: '🦆', audioKey: 'kacica' },
  { word: 'Žirafa',   syllables: 'ži-ra-fa',     emoji: '🦒', audioKey: 'zirafa' },
  { word: 'Žena',     syllables: 'že-na',        emoji: '👩', audioKey: 'zena' },
  { word: 'Šaty',     syllables: 'ša-ty',        emoji: '👗', audioKey: 'saty' },
  { word: 'Šoféri',   syllables: 'šo-fé-ri',     emoji: '🚗', audioKey: 'soferi' },
  { word: 'Baňa',     syllables: 'ba-ňa',        emoji: '⛏️', audioKey: 'bana' },
  { word: 'Poľana',   syllables: 'po-ľa-na',     emoji: '🌿', audioKey: 'polana' },
];

// Derive SYLLABLE_ITEMS from WORD_ITEMS.
const _syllableWordMap = new Map<string, Word[]>();
for (const wordItem of WORD_ITEMS) {
  for (const syl of wordItem.syllables.split('-')) {
    const key = syl.toUpperCase();
    if (!_syllableWordMap.has(key)) _syllableWordMap.set(key, []);
    const existing = _syllableWordMap.get(key)!;
    if (!existing.includes(wordItem)) existing.push(wordItem);
  }
}

export const SYLLABLE_ITEMS: Syllable[] = Array.from(_syllableWordMap.entries()).map(
  ([symbol, words]) => ({
    symbol,
    audioKey: symbol.toLowerCase(),
    sourceWords: words,
  })
);

// ---------------------------------------------------------------------------
// Numbers 1–20
// ---------------------------------------------------------------------------
export const NUMBER_ITEMS: SlovakNumber[] = Array.from({ length: 20 }, (_, i) => ({
  value: i + 1,
  audioKey: String(i + 1),
}));

// ---------------------------------------------------------------------------
// Praise entries
// ---------------------------------------------------------------------------
export const PRAISE_ENTRIES: PraiseEntry[] = [
  { emoji: '🌟', text: 'Výborne!',      audioKey: 'vyborne' },
  { emoji: '🎉', text: 'Skvelá práca!', audioKey: 'skvela-praca' },
  { emoji: '⭐', text: 'Si šikovný!',   audioKey: 'si-sikovny' },
  { emoji: '🏆', text: 'To je ono!',    audioKey: 'to-je-ono' },
  { emoji: '🌈', text: 'Úžasné!',       audioKey: 'uzasne' },
  { emoji: '🎊', text: 'Paráda!',       audioKey: 'parada' },
];
```

- [ ] **Step 2: Verify no syntax errors in this file**

Run: `npm run lint 2>&1 | grep "contentRegistry"`

Expected: no errors in `contentRegistry.ts` itself.

---

### Task 3: Update audioManager.ts

**Files:**
- Rewrite: `src/shared/services/audioManager.ts`

- [ ] **Step 1: Replace the file**

```typescript
import { AudioSpec, PraiseEntry } from '../types';
import { PRAISE_ENTRIES } from '../contentRegistry';

export class AudioManager {
  private synth: SpeechSynthesis = window.speechSynthesis;
  private currentAudio: HTMLAudioElement | null = null;
  private musicAudio: HTMLAudioElement | null = null;
  private musicEnabled = false;

  constructor() {
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {};
    }
  }

  updateSettings(settings: { music: boolean }): void {
    this.musicEnabled = settings.music;
    if (this.musicEnabled) {
      if (!this.musicAudio) {
        this.musicAudio = new Audio('/audio/music/background.mp3');
        this.musicAudio.loop = true;
        this.musicAudio.volume = 0.4;
      }
      this.musicAudio.play().catch(() => {});
    } else {
      if (this.musicAudio) {
        this.musicAudio.pause();
      }
    }
  }

  /** Play a sequence of audio clips described by an AudioSpec. Falls back to TTS on any failure. */
  play(spec: AudioSpec): void {
    this.playSequenceAsync(
      spec.sequence.map(path => `/audio/${path}.mp3`),
      spec.fallbackText
    ).catch(() => this.speak(spec.fallbackText));
  }

  playPraise(entry?: PraiseEntry): void {
    const chosen = entry ?? PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    this.playSequenceAsync([`/audio/praise/${chosen.audioKey}.mp3`], chosen.text)
      .catch(() => this.speak(chosen.text));
  }

  private stopCurrent(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.synth.cancel();
  }

  private async playSingleClip(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      this.currentAudio = audio;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error(`Failed to load: ${path}`));
      audio.play().catch(reject);
    });
  }

  private async playSequenceAsync(paths: string[], fallbackText: string): Promise<void> {
    this.stopCurrent();
    try {
      for (const path of paths) {
        await this.playSingleClip(path);
      }
    } catch {
      console.warn('[AudioManager] Audio file failed, falling back to TTS:', fallbackText);
      this.speak(fallbackText);
    }
  }

  private speak(text: string): void {
    if (!this.synth) return;
    this.synth.cancel();
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = this.synth.getVoices();
      const skVoice = voices.find(v => v.lang === 'sk-SK' || v.lang.startsWith('sk'));
      if (skVoice) utterance.voice = skVoice;
      utterance.lang = 'sk-SK';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      if (this.synth.paused) this.synth.resume();
      this.synth.speak(utterance);
    }, 50);
  }
}

export const audioManager = new AudioManager();
```

- [ ] **Step 2: Verify the file has no errors**

Run: `npm run lint 2>&1 | grep "audioManager"`

Expected: no errors in `audioManager.ts` itself.

---

### Task 4: Update SuccessOverlay.tsx

**Files:**
- Modify: `src/shared/components/SuccessOverlay.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pause, X } from 'lucide-react';
import { SuccessSpec, PraiseEntry } from '../types';
import { PRAISE_ENTRIES, COLORS, TIMING } from '../contentRegistry';
import { audioManager } from '../services/audioManager';

interface SuccessOverlayProps {
  show: boolean;
  spec: SuccessSpec;
  onComplete: () => void;
}

export function SuccessOverlay({ show, spec, onComplete }: SuccessOverlayProps) {
  const [praise, setPraise] = useState<PraiseEntry>(PRAISE_ENTRIES[0]);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confetti = useMemo(() =>
    [...Array(30)].map((_, i) => ({
      x: Math.random() * window.innerWidth - window.innerWidth / 2,
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 2,
      shape: i % 3,
    })),
    [show] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!show) { setPaused(false); return; }
    const entry = PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    setPraise(entry);
    setPaused(false);
    audioManager.playPraise(entry);
    timerRef.current = setTimeout(onComplete, TIMING.SUCCESS_OVERLAY_DURATION_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePause = () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPaused(true);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onComplete}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/80 backdrop-blur-sm"
        >
          {confetti.map((p, i) => (
            <motion.div
              key={i}
              initial={{ y: -500, x: p.x, rotate: 0 }}
              animate={{ y: window.innerHeight + 500, rotate: 360 }}
              transition={{ duration: p.duration, ease: 'linear', delay: p.delay }}
              className={`absolute ${p.shape === 0 ? 'w-16 h-16 rounded-full' : p.shape === 1 ? 'w-24 h-12 rounded-full' : 'w-12 h-24 rounded-full'} ${COLORS[i % COLORS.length].replace('text-', 'bg-')} opacity-60 blur-[2px]`}
            />
          ))}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="relative z-10 border-[6px] border-white rounded-[48px] px-12 py-12 sm:px-20 sm:py-16 mx-6 max-w-[90vw] w-auto text-center"
            style={{
              background: 'linear-gradient(150deg, #fff8f0 0%, #ffecd2 100%)',
              boxShadow: '0 8px 0 #f0c99a, 0 20px 60px rgba(0,0,0,.10)',
            }}
          >
            <button
              onClick={paused ? onComplete : handlePause}
              className="absolute top-4 right-4 w-10 h-10 bg-white rounded-full flex items-center justify-center text-[#aaa] transition-colors hover:text-[#666]"
              style={{ boxShadow: '0 2px 8px rgba(0,0,0,.10)' }}
            >
              {paused ? <X size={20} /> : <Pause size={20} />}
            </button>
            <div className="text-[100px] sm:text-[140px] leading-none mb-2">{praise.emoji}</div>
            <h3 className="text-primary text-5xl sm:text-[80px] font-black tracking-tighter leading-none">
              {praise.text}
            </h3>
            <p className="text-2xl sm:text-4xl font-extrabold mt-5" style={{ color: '#c06a00' }}>
              {spec.echoLine}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify the file has no errors**

Run: `npm run lint 2>&1 | grep "SuccessOverlay"`

Expected: no errors in `SuccessOverlay.tsx` itself (errors in consumers are expected).

---

### Task 5: Create FindItGame.tsx

**Files:**
- Create: `src/shared/components/FindItGame.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft } from 'lucide-react';
import { GameDescriptor, SuccessSpec } from '../types';
import { audioManager } from '../services/audioManager';
import { SuccessOverlay } from './SuccessOverlay';
import { TIMING } from '../contentRegistry';

interface FindItGameProps<T> {
  descriptor: GameDescriptor<T>;
  /** Called when the child taps the back button — typically sets parent gameState back to 'HOME'. */
  onExit: () => void;
}

export function FindItGame<T>({ descriptor, onExit }: FindItGameProps<T>) {
  const [targetItem, setTargetItem] = useState<T | null>(null);
  const [gridItems, setGridItems] = useState<T[]>([]);
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'wrong' | null>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [successSpec, setSuccessSpec] = useState<SuccessSpec | null>(null);

  const targetItemRef = useRef<T | null>(null);
  useEffect(() => { targetItemRef.current = targetItem; }, [targetItem]);

  const startNewRound = useCallback(() => {
    const pool = descriptor.getItems();
    if (pool.length === 0) return;
    const current = targetItemRef.current;
    const currentId = current ? descriptor.getItemId(current) : null;
    const eligible = currentId
      ? pool.filter(item => descriptor.getItemId(item) !== currentId)
      : pool;
    const candidates = eligible.length > 0 ? eligible : pool;
    const target = candidates[Math.floor(Math.random() * candidates.length)];
    const others = pool
      .filter(item => descriptor.getItemId(item) !== descriptor.getItemId(target))
      .sort(() => 0.5 - Math.random())
      .slice(0, descriptor.gridSize - 1);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    setTargetItem(target);
    setGridItems(grid);
    setFeedback({});
    setShowSuccess(false);
  }, [descriptor]);

  useEffect(() => {
    if (!targetItem) startNewRound();
  }, [targetItem, startNewRound]);

  useEffect(() => {
    if (!targetItem) return;
    const timer = setTimeout(
      () => audioManager.play(descriptor.getPromptAudio(targetItem)),
      TIMING.AUDIO_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [targetItem, descriptor]);

  const handleCardClick = (item: T, index: number) => {
    if (showSuccess || !targetItem) return;
    if (descriptor.getItemId(item) === descriptor.getItemId(targetItem)) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setSuccessSpec(descriptor.getSuccessSpec(targetItem));
      setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.play(descriptor.getWrongAudio(targetItem, item));
      setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
    }
  };

  const prompt = targetItem ? descriptor.renderPrompt(targetItem) : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={onExit}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => targetItem && audioManager.play(descriptor.getPromptAudio(targetItem))}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
        >
          <Volume2 size={32} className="sm:w-10 sm:h-10" />
        </motion.button>
        {prompt && <div className="text-center">{prompt}</div>}
      </div>

      <div className={`grid ${descriptor.gridColsClass} gap-4 sm:gap-8 w-full max-w-4xl px-4`}>
        {gridItems.map((item, i) => (
          <motion.button
            key={descriptor.getItemId(item)}
            onClick={() => handleCardClick(item, i)}
            animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`
              w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {descriptor.renderCard(item)}
          </motion.button>
        ))}
      </div>

      {successSpec && (
        <SuccessOverlay show={showSuccess} spec={successSpec} onComplete={startNewRound} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify no errors in the new file**

Run: `npm run lint 2>&1 | grep "FindItGame"`

Expected: no errors in `FindItGame.tsx`.

- [ ] **Step 3: Commit foundation**

```bash
git add src/shared/types.ts src/shared/contentRegistry.ts src/shared/services/audioManager.ts src/shared/components/SuccessOverlay.tsx src/shared/components/FindItGame.tsx
git commit -m "refactor: introduce GameDescriptor pattern — new types, AudioSpec, FindItGame"
```

---

### Task 6: Migrate Alphabet game

**Files:**
- Create: `src/games/alphabet/alphabetDescriptor.ts`
- Rewrite: `src/games/alphabet/AlphabetGame.tsx`

- [ ] **Step 1: Create alphabetDescriptor.ts**

```typescript
import React from 'react';
import { GameDescriptor, Letter } from '../../shared/types';
import { LETTER_ITEMS } from '../../shared/contentRegistry';

export const alphabetDescriptor: GameDescriptor<Letter> = {
  gridSize: 8,
  gridColsClass: 'grid-cols-2 sm:grid-cols-4',
  getItems: () => LETTER_ITEMS,
  getItemId: (l) => l.symbol,
  renderCard: (l) => (
    <span className="text-6xl sm:text-[100px] font-bold font-spline">{l.symbol}</span>
  ),
  renderPrompt: () => null,
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

- [ ] **Step 2: Rewrite AlphabetGame.tsx**

```tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { COLORS } from '../../shared/contentRegistry';
import { FindItGame } from '../../shared/components/FindItGame';
import { alphabetDescriptor } from './alphabetDescriptor';

interface AlphabetGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AlphabetGame({ onExit, onOpenSettings }: AlphabetGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={alphabetDescriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex gap-4 z-20">
        <button
          onClick={onExit}
          className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
        >
          <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
        </button>
      </div>
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
      >
        <Settings size={24} className="sm:w-8 sm:h-8" />
      </button>
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
          <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
            {'ABECEDA'.split('').map((char, i) => (
              <span
                key={i}
                className={`${COLORS[i % COLORS.length]} inline-block py-2`}
                style={{
                  transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
                  textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
                }}
              >
                {char}
              </span>
            ))}
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95, y: 5 }}
          onClick={() => setGameState('PLAYING')}
          className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-success rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
        >
          <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
        </motion.button>
      </div>
      <div className="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-accent-blue opacity-30 -rotate-12 blur-sm pointer-events-none" />
      <div className="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-primary opacity-20 translate-y-10 blur-md pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 3: Verify no errors in these files**

Run: `npm run lint 2>&1 | grep -E "alphabet"`

Expected: no errors in alphabet files.

- [ ] **Step 4: Commit**

```bash
git add src/games/alphabet/
git commit -m "refactor: migrate AlphabetGame to GameDescriptor pattern"
```

---

### Task 7: Migrate Syllables game

**Files:**
- Create: `src/games/syllables/syllablesDescriptor.ts`
- Rewrite: `src/games/syllables/SyllablesGame.tsx`

- [ ] **Step 1: Create syllablesDescriptor.ts**

```typescript
import React from 'react';
import { GameDescriptor, Syllable } from '../../shared/types';
import { SYLLABLE_ITEMS } from '../../shared/contentRegistry';

export const syllablesDescriptor: GameDescriptor<Syllable> = {
  gridSize: 6,
  gridColsClass: 'grid-cols-2 sm:grid-cols-3',
  getItems: () => SYLLABLE_ITEMS,
  getItemId: (s) => s.symbol,
  renderCard: (s) => (
    <span className="text-4xl sm:text-7xl font-bold font-spline">{s.symbol}</span>
  ),
  renderPrompt: () => null,
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

- [ ] **Step 2: Rewrite SyllablesGame.tsx**

```tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { COLORS } from '../../shared/contentRegistry';
import { FindItGame } from '../../shared/components/FindItGame';
import { syllablesDescriptor } from './syllablesDescriptor';

interface SyllablesGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function SyllablesGame({ onExit, onOpenSettings }: SyllablesGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={syllablesDescriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex gap-4 z-20">
        <button
          onClick={onExit}
          className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
        >
          <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
        </button>
      </div>
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
      >
        <Settings size={24} className="sm:w-8 sm:h-8" />
      </button>
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
          <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
            {'SLABIKY'.split('').map((char, i) => (
              <span
                key={i}
                className={`${COLORS[i % COLORS.length]} inline-block py-2`}
                style={{
                  transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
                  textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
                }}
              >
                {char}
              </span>
            ))}
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95, y: 5 }}
          onClick={() => setGameState('PLAYING')}
          className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-primary rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
        >
          <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
        </motion.button>
      </div>
      <div className="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-success opacity-30 -rotate-12 blur-sm pointer-events-none" />
      <div className="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-accent-blue opacity-20 translate-y-10 blur-md pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/games/syllables/
git commit -m "refactor: migrate SyllablesGame to GameDescriptor pattern"
```

---

### Task 8: Migrate Numbers game

**Files:**
- Create: `src/games/numbers/numbersDescriptor.ts`
- Rewrite: `src/games/numbers/NumbersGame.tsx`

- [ ] **Step 1: Create numbersDescriptor.ts**

The numbers game filters the pool by range at runtime, so a factory function is used instead of a plain object.

```typescript
import React from 'react';
import { GameDescriptor, SlovakNumber } from '../../shared/types';
import { NUMBER_ITEMS } from '../../shared/contentRegistry';

export function createNumbersDescriptor(
  range: { start: number; end: number }
): GameDescriptor<SlovakNumber> {
  return {
    gridSize: 4,
    gridColsClass: 'grid-cols-2',
    getItems: () => NUMBER_ITEMS.filter(n => n.value >= range.start && n.value <= range.end),
    getItemId: (n) => String(n.value),
    renderCard: (n) => (
      <span className="text-6xl sm:text-[100px] font-bold font-spline">{n.value}</span>
    ),
    renderPrompt: () => null,
    getPromptAudio: (n) => ({
      sequence: ['phrases/cislo', `numbers/${n.audioKey}`],
      fallbackText: `Číslo ${n.value}`,
    }),
    getWrongAudio: () => ({
      sequence: ['phrases/skus-to-znova'],
      fallbackText: 'Skús to znova.',
    }),
    getSuccessSpec: (n) => ({ echoLine: `Číslo ${n.value} 🎉` }),
  };
}
```

- [ ] **Step 2: Rewrite NumbersGame.tsx**

```tsx
import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { COLORS } from '../../shared/contentRegistry';
import { FindItGame } from '../../shared/components/FindItGame';
import { createNumbersDescriptor } from './numbersDescriptor';

interface NumbersGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

export function NumbersGame({ onExit, onOpenSettings, range }: NumbersGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const descriptor = useMemo(() => createNumbersDescriptor(range), [range]);

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={descriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex gap-4 z-20">
        <button
          onClick={onExit}
          className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
        >
          <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
        </button>
      </div>
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
      >
        <Settings size={24} className="sm:w-8 sm:h-8" />
      </button>
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
          <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
            {'ČÍSLA'.split('').map((char, i) => (
              <span
                key={i}
                className={`${COLORS[i % COLORS.length]} inline-block py-2`}
                style={{
                  transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
                  textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
                }}
              >
                {char}
              </span>
            ))}
          </h1>
          <p className="text-2xl sm:text-3xl font-bold opacity-50 mt-4">
            Rozsah: {range.start} - {range.end}
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95, y: 5 }}
          onClick={() => setGameState('PLAYING')}
          className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-accent-blue rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
        >
          <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
        </motion.button>
      </div>
      <div className="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none" />
      <div className="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/games/numbers/
git commit -m "refactor: migrate NumbersGame to GameDescriptor pattern"
```

---

### Task 9: Update CountingItemsGame.tsx

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

CountingItemsGame has a bespoke mechanic (scatter display + delayed options) so it doesn't use `FindItGame`. It does need to stop using `ContentItem` and the old `audioManager` methods.

- [ ] **Step 1: Update imports and NUMBER_ITEMS usage**

Replace the top of the file (imports through interface) with:

```tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft, Play, Settings, RefreshCw } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { NUMBER_ITEMS, COLORS, TIMING } from '../../shared/contentRegistry';
import { SlovakNumber, SuccessSpec } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';

interface CountingItemsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

const EMOJIS = ['🍎', '⭐️', '🚗', '🐶', '🍦', '🎈', '🍭', '⚽️', '🦋', '🌈'];

interface ItemPosition {
  x: number;
  y: number;
  emoji: string;
  rotation: number;
  scale: number;
}
```

- [ ] **Step 2: Update state and availableItems**

Replace the `useState`/`useMemo` block inside the component function:

```typescript
const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
const [targetItem, setTargetItem] = useState<SlovakNumber | null>(null);
const [itemPositions, setItemPositions] = useState<ItemPosition[]>([]);
const [optionItems, setOptionItems] = useState<SlovakNumber[]>([]);
const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
const [showSuccess, setShowSuccess] = useState(false);
const [showOptions, setShowOptions] = useState(false);
const optionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const containerRef = useRef<HTMLDivElement>(null);

const availableItems = useMemo(
  () => NUMBER_ITEMS.filter(n => n.value >= range.start && n.value <= range.end),
  [range]
);
```

- [ ] **Step 3: Update startNewRound**

```typescript
const startNewRound = useCallback(() => {
  if (availableItems.length === 0) return;
  const target = availableItems[Math.floor(Math.random() * availableItems.length)];
  const positions = generatePositions(target.value);
  const allNumbers = NUMBER_ITEMS.filter(n => n.value <= Math.max(range.end, 10));
  const others = allNumbers
    .filter(n => n.value !== target.value)
    .sort(() => 0.5 - Math.random())
    .slice(0, 3);
  const options = [...others, target].sort(() => 0.5 - Math.random());
  setTargetItem(target);
  setItemPositions(positions);
  setOptionItems(options);
  setFeedback({});
  setShowSuccess(false);
  setShowOptions(false);
  if (optionsTimerRef.current) clearTimeout(optionsTimerRef.current);
  optionsTimerRef.current = setTimeout(() => setShowOptions(true), TIMING.COUNTING_OPTIONS_DELAY_MS);
}, [availableItems, range.end, generatePositions]);
```

- [ ] **Step 4: Update audio calls and click handler**

Replace the two `useEffect` blocks and `handleOptionClick`:

```typescript
useEffect(() => {
  if (gameState === 'PLAYING' && !targetItem) startNewRound();
}, [gameState, targetItem, startNewRound]);

useEffect(() => {
  if (gameState === 'PLAYING') {
    const timer = setTimeout(
      () => audioManager.play({ sequence: ['phrases/spocitaj-predmety'], fallbackText: 'Spočítaj predmety' }),
      TIMING.AUDIO_DELAY_MS
    );
    return () => clearTimeout(timer);
  }
}, [gameState]);

const handleOptionClick = (item: SlovakNumber, index: number) => {
  if (showSuccess || !targetItem) return;
  if (item.value === targetItem.value) {
    setFeedback(prev => ({ ...prev, [index]: 'correct' }));
    setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
  } else {
    setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
    audioManager.play({ sequence: ['phrases/skus-to-znova'], fallbackText: 'Skús to znova.' });
    setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
  }
};
```

- [ ] **Step 5: Update the replay audio button in the PLAYING JSX**

Find the `onClick` on the `Volume2` button and replace it:

```tsx
onClick={() => audioManager.play({ sequence: ['phrases/spocitaj-predmety'], fallbackText: 'Spočítaj predmety' })}
```

- [ ] **Step 6: Update item display and SuccessOverlay in the PLAYING JSX**

Replace `{item.symbol}` with `{item.value}` in the options grid.

Replace the SuccessOverlay call at the bottom:

```tsx
{targetItem && (
  <SuccessOverlay
    show={showSuccess}
    spec={{ echoLine: `Správne, je ich ${targetItem.value} ⭐` }}
    onComplete={startNewRound}
  />
)}
```

- [ ] **Step 7: Update the scattered items key**

Find `key={\`${targetItem?.symbol}-${i}\`}` and replace with `key={\`${targetItem?.value}-${i}\`}`.

- [ ] **Step 8: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx
git commit -m "refactor: update CountingItemsGame to AudioSpec + SuccessSpec"
```

---

### Task 10: Create Words game

**Files:**
- Create: `src/games/words/wordsDescriptor.ts`
- Create: `src/games/words/WordsGame.tsx`

- [ ] **Step 1: Create wordsDescriptor.ts**

```typescript
import React from 'react';
import { GameDescriptor, Word } from '../../shared/types';
import { WORD_ITEMS } from '../../shared/contentRegistry';

export const wordsDescriptor: GameDescriptor<Word> = {
  gridSize: 6,
  gridColsClass: 'grid-cols-2 sm:grid-cols-3',
  getItems: () => WORD_ITEMS,
  getItemId: (w) => w.word,
  renderCard: (w) => (
    <span className="text-5xl sm:text-7xl">{w.emoji}</span>
  ),
  renderPrompt: (w) => (
    <h2 className="text-5xl sm:text-7xl font-black tracking-widest text-text-main">
      {w.syllables.toUpperCase()}
    </h2>
  ),
  getPromptAudio: (w) => ({
    sequence: ['phrases/co-tu-je-napisane', `words/${w.audioKey}`],
    fallbackText: `Čo tu je napísané? ${w.word}`,
  }),
  getWrongAudio: () => ({
    sequence: ['phrases/skus-to-znova'],
    fallbackText: 'Skús to znova.',
  }),
  getSuccessSpec: (w) => ({ echoLine: `${w.syllables} ${w.emoji}` }),
};
```

- [ ] **Step 2: Create WordsGame.tsx**

```tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Settings } from 'lucide-react';
import { COLORS } from '../../shared/contentRegistry';
import { FindItGame } from '../../shared/components/FindItGame';
import { wordsDescriptor } from './wordsDescriptor';

interface WordsGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function WordsGame({ onExit, onOpenSettings }: WordsGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');

  if (gameState === 'PLAYING') {
    return <FindItGame descriptor={wordsDescriptor} onExit={() => setGameState('HOME')} />;
  }

  return (
    <div className="min-h-screen relative bg-bg-light flex flex-col">
      <div className="absolute top-4 left-4 sm:top-8 sm:left-8 flex gap-4 z-20">
        <button
          onClick={onExit}
          className="w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95"
        >
          <ArrowLeft size={24} className="sm:w-8 sm:h-8" />
        </button>
      </div>
      <button
        onClick={onOpenSettings}
        className="absolute top-4 right-4 sm:top-8 sm:right-8 w-12 h-12 sm:w-16 sm:h-16 bg-white rounded-full shadow-block flex items-center justify-center text-shadow transition-transform active:scale-95 z-20"
      >
        <Settings size={24} className="sm:w-8 sm:h-8" />
      </button>
      <div className="flex-1 flex flex-col items-center justify-center p-4 py-8 sm:py-12">
        <div className="mb-8 sm:mb-12 md:mb-20 text-center w-full px-4 py-4 shrink-0">
          <h1 className="text-5xl sm:text-7xl md:text-[120px] font-black flex flex-wrap justify-center gap-2 sm:gap-4 select-none leading-tight">
            {'SLOVÁ'.split('').map((char, i) => (
              <span
                key={i}
                className={`${COLORS[i % COLORS.length]} inline-block py-2`}
                style={{
                  transform: `rotate(${Math.sin(i) * 10}deg) translateY(${Math.cos(i) * 10}px)`,
                  textShadow: '0px 4px 0px white, 0px 8px 0px var(--color-shadow)',
                }}
              >
                {char}
              </span>
            ))}
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.05, y: -5 }}
          whileTap={{ scale: 0.95, y: 5 }}
          onClick={() => setGameState('PLAYING')}
          className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-soft-watermelon rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
        >
          <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
        </motion.button>
      </div>
      <div className="absolute top-1/4 left-4 sm:left-10 w-20 h-20 sm:w-32 sm:h-32 rounded-3xl bg-primary opacity-30 -rotate-12 blur-sm pointer-events-none" />
      <div className="absolute bottom-10 right-4 sm:bottom-20 sm:right-20 w-32 h-32 sm:w-48 sm:h-48 rounded-full bg-success opacity-20 translate-y-10 blur-md pointer-events-none" />
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/games/words/
git commit -m "feat: add WordsGame with GameDescriptor"
```

---

### Task 11: Wire up App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add import**

After the existing game imports, add:

```typescript
import { WordsGame } from './games/words/WordsGame';
```

- [ ] **Step 2: Add to GAMES array**

After the `COUNTING_ITEMS` entry in the `GAMES` array:

```typescript
{
  id: 'WORDS',
  title: 'Slová',
  description: 'Prečítaj slovo a nájdi obrázok',
  icon: 'BookOpen',
  color: 'bg-soft-watermelon'
},
```

- [ ] **Step 3: Add BookOpen to lucide imports**

In the lucide import line, add `BookOpen`:

```typescript
import { Settings, Play, Gamepad2, Type, Apple, BookOpen } from 'lucide-react';
```

- [ ] **Step 4: Add icon render in the game grid**

In the game grid JSX, after the `COUNTING_ITEMS` icon line, add:

```tsx
{game.id === 'WORDS' && <BookOpen size={48} className="sm:w-16 sm:h-16" />}
```

- [ ] **Step 5: Add Words game screen case**

After the `COUNTING_ITEMS` `AnimatePresence` block and before the "coming soon" fallback:

```tsx
{screen === 'GAME' && activeGame === 'WORDS' && (
  <motion.div
    key="words"
    initial={{ opacity: 0, x: 100 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -100 }}
    className="w-full min-h-screen"
  >
    <ErrorBoundary>
      <WordsGame
        onExit={handleExitGame}
        onOpenSettings={handleOpenSettings}
      />
    </ErrorBoundary>
  </motion.div>
)}
```

- [ ] **Step 6: Update the "coming soon" guard**

Update the condition to include `'WORDS'`:

```tsx
{screen === 'GAME' && !['ALPHABET', 'SYLLABLES', 'NUMBERS', 'COUNTING_ITEMS', 'WORDS'].includes(activeGame as string) && (
```

- [ ] **Step 7: Run lint — should now be clean**

Run: `npm run lint`

Expected: 0 errors. If there are errors, fix them before proceeding.

- [ ] **Step 8: Start the dev server and verify all 5 games launch**

Run: `npm run dev`

Open `http://localhost:3000` and verify:
- Home screen shows 5 game cards (Abeceda, Slabiky, Čísla, Spočítaj, Slová)
- Each game's home screen loads and the Play button starts a round
- Each game's round shows a grid, tapping wrong shakes, tapping correct shows SuccessOverlay
- SuccessOverlay shows the echo line and closes after ~3 seconds
- Words game shows syllabified text as prompt and emoji cards

- [ ] **Step 9: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add Words game to home screen and router"
```

---

### Task 12: Update ROADMAP.md

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Mark words game tasks complete**

In the "Words game (new)" section, mark all four tasks as done:

```markdown
- [x] Spec for words game (`docs/superpowers/specs/`)
- [x] Words game component (`src/games/words/WordsGame.tsx`)
- [x] Words game content entries in `contentRegistry.ts`
- [x] Add words game to `App.tsx` game registry and home screen grid
```

- [ ] **Step 2: Add drag-and-drop to the backlog**

After the Words game section, add a new subsection:

```markdown
### Syllable assembly game (new)
> Drag-and-drop mechanic: child sees shuffled syllable tiles and drags them into the correct order to form the word. Needs its own spec before implementation.

- [ ] Spec for syllable assembly game (`docs/superpowers/specs/`)
- [ ] Syllable assembly game component (`src/games/assembly/AssemblyGame.tsx`)
- [ ] Add assembly game to `App.tsx` game registry and home screen grid
```

- [ ] **Step 3: Update the Decisions Log**

Add a row:

```markdown
| 2026-04-07 | GameDescriptor<T> pattern replaces ContentItem god object | ContentItem accumulated optional cross-game fields; descriptor pattern makes each game self-contained |
| 2026-04-07 | Words game mechanic: see syllabified word, tap emoji | Reading-focused; distinct from syllables game which shows the syllable and has child recognize it |
```

- [ ] **Step 4: Commit**

```bash
git add ROADMAP.md
git commit -m "docs: update ROADMAP — words game complete, add syllable assembly to backlog"
```
