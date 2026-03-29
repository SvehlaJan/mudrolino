# Audio Files, Emoji Images & Content Architecture Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Web Speech API TTS with real audio files, introduce a typed `ContentItem` content model, extract a shared `SuccessOverlay` component, and make all 4 games data-driven against a central content registry.

**Architecture:** A central `contentRegistry.ts` replaces `constants.ts` and owns all game content (letters, syllables, numbers) as typed `ContentItem` objects. `AudioManager` plays file sequences from `public/audio/` with TTS as fallback. A shared `SuccessOverlay` component replaces four identical copy-pasted overlays.

**Tech Stack:** React 19, TypeScript, Vite (static assets in `public/`), Framer Motion, Web Speech API (fallback only)

**Verification:** No test framework is configured — use `npm run lint` (TypeScript type checking) after each task, and `npm run dev` for final browser smoke test.

**Spec:** `docs/superpowers/specs/2026-03-29-audio-images-refactor-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/shared/types.ts` | Add `ContentItem`, `PraiseEntry`, `PhraseTemplate` |
| Create | `src/shared/contentRegistry.ts` | All game content data; replaces `constants.ts` |
| Modify | `src/shared/constants.ts` | Re-export bridge (deleted in Task 10) |
| Modify | `src/shared/services/audioManager.ts` | File-based playback with TTS fallback |
| Create | `src/shared/components/SuccessOverlay.tsx` | Shared success overlay with emoji mascot |
| Modify | `src/games/alphabet/AlphabetGame.tsx` | Data-driven refactor |
| Modify | `src/games/syllables/SyllablesGame.tsx` | Data-driven refactor |
| Modify | `src/games/numbers/NumbersGame.tsx` | Data-driven refactor |
| Modify | `src/games/counting/CountingItemsGame.tsx` | Data-driven refactor |
| Delete | `src/shared/constants.ts` | Removed after all games migrated |
| Create | `public/audio/` directory tree | Static audio asset location |
| Modify | `docs/*.md` + `CLAUDE.md` | Update documentation |

---

## Task 1: Extend types.ts

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add new types**

Open `src/shared/types.ts` and append after the existing exports:

```ts
export interface ContentItem {
  symbol: string;        // Display character: "A", "Š", "MA", "3"
  label?: string;        // Human-readable word, e.g. "Ananás" for A
  emoji?: string;        // Optional emoji, e.g. "🍎" — undefined = TBD, excluded from games
  audioKey: string;      // ASCII slug for audio path: "a", "s-caron", "ma", "3"
  category: 'letter' | 'syllable' | 'number' | 'word';
}

export interface PraiseEntry {
  emoji: string;         // "🌟"
  text: string;          // "Výborne!"
  audioKey: string;      // "vyborne" → praise/vyborne.mp3
}

export type PhraseTemplate =
  | 'find-letter'
  | 'wrong-letter'
  | 'find-number'
  | 'wrong-number'
  | 'find-syllable'
  | 'wrong-syllable'
  | 'count-items'
  | 'correct-count'
  | 'wrong-count';
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add ContentItem, PraiseEntry, PhraseTemplate types"
```

---

## Task 2: Create contentRegistry.ts

**Files:**
- Create: `src/shared/contentRegistry.ts`

- [ ] **Step 1: Create the file**

```ts
/**
 * Central content registry — single source of truth for all game content.
 * Replaces constants.ts.
 */
import { ContentItem, PraiseEntry } from './types';

// UI colour helpers (moved from constants.ts)
export const COLORS = ['text-primary', 'text-success', 'text-accent-blue'];
export const BG_COLORS = ['bg-primary', 'bg-success', 'bg-accent-blue'];

// ---------------------------------------------------------------------------
// Letters — full Slovak alphabet (46 entries).
// Items with emoji: undefined are TBD and filtered out of game grids at runtime.
// ---------------------------------------------------------------------------
export const LETTER_ITEMS: ContentItem[] = [
  { symbol: 'A',  label: 'Ananás',   emoji: '🍎', audioKey: 'a',            category: 'letter' },
  { symbol: 'Á',  label: 'Áuto',     emoji: '🚗', audioKey: 'a-acute',      category: 'letter' },
  { symbol: 'Ä',  label: undefined,  emoji: undefined, audioKey: 'a-umlaut', category: 'letter' },
  { symbol: 'B',  label: 'Baran',    emoji: '🐏', audioKey: 'b',            category: 'letter' },
  { symbol: 'C',  label: 'Citrón',   emoji: '🍋', audioKey: 'c',            category: 'letter' },
  { symbol: 'Č',  label: 'Čerešňa',  emoji: '🍒', audioKey: 'c-caron',      category: 'letter' },
  { symbol: 'D',  label: 'Dúha',     emoji: '🌈', audioKey: 'd',            category: 'letter' },
  { symbol: 'Ď',  label: 'Ďakujem',  emoji: '🫶', audioKey: 'd-caron',      category: 'letter' },
  { symbol: 'DZ', label: undefined,  emoji: undefined, audioKey: 'dz',       category: 'letter' },
  { symbol: 'DŽ', label: 'Džungľa',  emoji: '🌴', audioKey: 'dzh',          category: 'letter' },
  { symbol: 'E',  label: 'Ežko',     emoji: '🦔', audioKey: 'e',            category: 'letter' },
  { symbol: 'É',  label: undefined,  emoji: undefined, audioKey: 'e-acute',  category: 'letter' },
  { symbol: 'F',  label: 'Farba',    emoji: '🎨', audioKey: 'f',            category: 'letter' },
  { symbol: 'G',  label: 'Gitara',   emoji: '🎸', audioKey: 'g',            category: 'letter' },
  { symbol: 'H',  label: 'Hrad',     emoji: '🏰', audioKey: 'h',            category: 'letter' },
  { symbol: 'CH', label: 'Chlieb',   emoji: '🍞', audioKey: 'ch',           category: 'letter' },
  { symbol: 'I',  label: 'Iskra',    emoji: '⚡', audioKey: 'i',            category: 'letter' },
  { symbol: 'Í',  label: 'Íbis',     emoji: '🦢', audioKey: 'i-acute',      category: 'letter' },
  { symbol: 'J',  label: 'Jahoda',   emoji: '🍓', audioKey: 'j',            category: 'letter' },
  { symbol: 'K',  label: 'Kľúč',     emoji: '🗝️', audioKey: 'k',            category: 'letter' },
  { symbol: 'L',  label: 'Líška',    emoji: '🦊', audioKey: 'l',            category: 'letter' },
  { symbol: 'Ľ',  label: 'Ľad',      emoji: '🧊', audioKey: 'l-caron',      category: 'letter' },
  { symbol: 'Ĺ',  label: undefined,  emoji: undefined, audioKey: 'l-acute',  category: 'letter' },
  { symbol: 'M',  label: 'Mesiac',   emoji: '🌙', audioKey: 'm',            category: 'letter' },
  { symbol: 'N',  label: 'Nebe',     emoji: '☁️', audioKey: 'n',            category: 'letter' },
  { symbol: 'Ň',  label: undefined,  emoji: undefined, audioKey: 'n-caron',  category: 'letter' },
  { symbol: 'O',  label: 'Ovca',     emoji: '🐑', audioKey: 'o',            category: 'letter' },
  { symbol: 'Ó',  label: undefined,  emoji: undefined, audioKey: 'o-acute',  category: 'letter' },
  { symbol: 'Ô',  label: undefined,  emoji: undefined, audioKey: 'o-circumflex', category: 'letter' },
  { symbol: 'P',  label: 'Pes',      emoji: '🐕', audioKey: 'p',            category: 'letter' },
  { symbol: 'Q',  label: undefined,  emoji: undefined, audioKey: 'q',        category: 'letter' },
  { symbol: 'R',  label: 'Ryba',     emoji: '🐟', audioKey: 'r',            category: 'letter' },
  { symbol: 'Ŕ',  label: undefined,  emoji: undefined, audioKey: 'r-acute',  category: 'letter' },
  { symbol: 'S',  label: 'Slnko',    emoji: '☀️', audioKey: 's',            category: 'letter' },
  { symbol: 'Š',  label: 'Šnek',     emoji: '🐌', audioKey: 's-caron',      category: 'letter' },
  { symbol: 'T',  label: 'Tiger',    emoji: '🐯', audioKey: 't',            category: 'letter' },
  { symbol: 'Ť',  label: 'Ťava',     emoji: '🐪', audioKey: 't-caron',      category: 'letter' },
  { symbol: 'U',  label: 'Ucho',     emoji: '👂', audioKey: 'u',            category: 'letter' },
  { symbol: 'Ú',  label: 'Úsvit',    emoji: '🌅', audioKey: 'u-acute',      category: 'letter' },
  { symbol: 'V',  label: 'Vlk',      emoji: '🐺', audioKey: 'v',            category: 'letter' },
  { symbol: 'W',  label: undefined,  emoji: undefined, audioKey: 'w',        category: 'letter' },
  { symbol: 'X',  label: 'Xylofón',  emoji: '🎹', audioKey: 'x',            category: 'letter' },
  { symbol: 'Y',  label: undefined,  emoji: undefined, audioKey: 'y',        category: 'letter' },
  { symbol: 'Ý',  label: undefined,  emoji: undefined, audioKey: 'y-acute',  category: 'letter' },
  { symbol: 'Z',  label: 'Zebra',    emoji: '🦓', audioKey: 'z',            category: 'letter' },
  { symbol: 'Ž',  label: 'Žaba',     emoji: '🐸', audioKey: 'z-caron',      category: 'letter' },
];

/** Letters that have emoji/label defined — safe to use in game grids */
export const ACTIVE_LETTER_ITEMS = LETTER_ITEMS.filter(
  (item): item is ContentItem & { emoji: string; label: string } =>
    item.emoji !== undefined && item.label !== undefined
);

// ---------------------------------------------------------------------------
// Syllables — 60 simple consonant+vowel pairs (no diacritical syllables)
// ---------------------------------------------------------------------------
const SYLLABLE_CONSONANTS = ['M','T','L','S','P','B','V','D','N','R','K','J'];
const SYLLABLE_VOWELS = ['A','E','I','O','U'];

export const SYLLABLE_ITEMS: ContentItem[] = SYLLABLE_CONSONANTS.flatMap(c =>
  SYLLABLE_VOWELS.map(v => ({
    symbol: `${c}${v}`,
    audioKey: `${c}${v}`.toLowerCase(),
    category: 'syllable' as const,
  }))
);

// ---------------------------------------------------------------------------
// Numbers 1–20
// ---------------------------------------------------------------------------
export const NUMBER_ITEMS: ContentItem[] = Array.from({ length: 20 }, (_, i) => ({
  symbol: String(i + 1),
  audioKey: String(i + 1),
  category: 'number' as const,
}));

// ---------------------------------------------------------------------------
// Words — scaffold for future word games
// ---------------------------------------------------------------------------
export const WORD_ITEMS: ContentItem[] = [];

// ---------------------------------------------------------------------------
// Praise entries — one per audio file in public/audio/praise/
// ---------------------------------------------------------------------------
export const PRAISE_ENTRIES: PraiseEntry[] = [
  { emoji: '🌟', text: 'Výborne!',     audioKey: 'vyborne' },
  { emoji: '🎉', text: 'Skvelá práca!', audioKey: 'skvela-praca' },
  { emoji: '⭐', text: 'Si šikovný!',  audioKey: 'si-sikovny' },
  { emoji: '🏆', text: 'To je ono!',   audioKey: 'to-je-ono' },
  { emoji: '🌈', text: 'Úžasné!',      audioKey: 'uzasne' },
  { emoji: '🎊', text: 'Paráda!',      audioKey: 'parada' },
];
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/contentRegistry.ts
git commit -m "feat: add content registry with typed ContentItem data"
```

---

## Task 3: Bridge constants.ts

Update `constants.ts` to re-export everything from `contentRegistry.ts`. Existing import sites continue to work unchanged while the game components are migrated in Tasks 6–9.

**Files:**
- Modify: `src/shared/constants.ts`

- [ ] **Step 1: Replace contents**

Replace the entire file with:

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Backward-compat re-exports — this file is deleted after all games are migrated.
 */
export { COLORS, BG_COLORS, LETTER_ITEMS, ACTIVE_LETTER_ITEMS, SYLLABLE_ITEMS, NUMBER_ITEMS, WORD_ITEMS, PRAISE_ENTRIES } from './contentRegistry';

// Legacy flat arrays — kept only until game components are migrated
import { LETTER_ITEMS, SYLLABLE_ITEMS } from './contentRegistry';
export const ALPHABET = LETTER_ITEMS.map(item => item.symbol);
export const SYLLABLES = SYLLABLE_ITEMS.map(item => item.symbol);
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/constants.ts
git commit -m "refactor: constants.ts now re-exports from contentRegistry"
```

---

## Task 4: Refactor AudioManager

**Files:**
- Modify: `src/shared/services/audioManager.ts`

- [ ] **Step 1: Replace the entire file**

```ts
/**
 * AudioManager handles all auditory feedback.
 * Primary: file-based playback from public/audio/.
 * Fallback: Web Speech API (TTS) when a file is missing or unavailable.
 */
import { ContentItem, PraiseEntry, PhraseTemplate } from '../types';
import { PRAISE_ENTRIES } from '../contentRegistry';

const CATEGORY_DIR: Record<ContentItem['category'], string> = {
  letter: 'letters',
  syllable: 'syllables',
  number: 'numbers',
  word: 'words',
};

// Internal phrase template map.
// '{target}' = correct ContentItem; '{selected}' = what the player tapped (wrong-letter only).
const PHRASE_TEMPLATES: Record<PhraseTemplate, Array<string | '{target}' | '{selected}'>> = {
  'find-letter':   ['phrases/najdi-pismeno', '{target}'],
  'wrong-letter':  ['phrases/toto-je-pismeno', '{selected}', 'phrases/skus-to-znova'],
  'find-number':   ['phrases/cislo', '{target}'],
  'wrong-number':  ['phrases/skus-to-znova'],
  'find-syllable': ['phrases/slabika', '{target}'],
  'wrong-syllable':['phrases/slabika', '{target}', 'phrases/skus-to-znova'],
  'count-items':   ['phrases/spocitaj-predmety'],
  'correct-count': ['phrases/ano-je-ich', '{target}'],
  'wrong-count':   ['phrases/nie-je-ich', '{target}', 'phrases/skus-to-znova'],
};

// TTS fallback text for each template
const FALLBACK_TEXT: Record<
  PhraseTemplate,
  (target: ContentItem, selected?: ContentItem) => string
> = {
  'find-letter':   (t)    => `Nájdi písmenko ${t.symbol}`,
  'wrong-letter':  (t, s) => `Toto je písmenko ${s?.symbol ?? t.symbol}. Skús to znova.`,
  'find-number':   (t)    => `Číslo ${t.symbol}`,
  'wrong-number':  ()     => 'Skús to znova.',
  'find-syllable': (t)    => `Slabika ${t.symbol}`,
  'wrong-syllable':(t)    => `Slabika ${t.symbol}. Skús to znova.`,
  'count-items':   ()     => 'Spočítaj predmety',
  'correct-count': (t)    => `Áno, je ich ${t.symbol}.`,
  'wrong-count':   (t)    => `Nie, je ich ${t.symbol}. Skús to znova.`,
};

export class AudioManager {
  private synth: SpeechSynthesis = window.speechSynthesis;
  private currentAudio: HTMLAudioElement | null = null;

  constructor() {
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = () => {
        console.log(`[AudioManager] Voices loaded: ${this.synth.getVoices().length}`);
      };
    }
  }

  updateSettings(_settings: unknown) {
    // Voice is always enabled
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  playAnnouncement(template: PhraseTemplate, target: ContentItem, selected?: ContentItem): void {
    const rawParts = PHRASE_TEMPLATES[template];
    const resolved = rawParts.map(part => {
      if (part === '{target}') return target;
      if (part === '{selected}') return selected ?? target;
      return part; // static path like 'phrases/najdi-pismeno'
    });
    const fallback = FALLBACK_TEXT[template](target, selected);
    this.playSequence(resolved, fallback);
  }

  playLetter(target: ContentItem): void {
    this.playAnnouncement('find-letter', target);
  }

  playNumber(target: ContentItem): void {
    this.playAnnouncement('find-number', target);
  }

  playSyllable(target: ContentItem): void {
    this.playAnnouncement('find-syllable', target);
  }

  playPraise(entry?: PraiseEntry): void {
    const chosen = entry ?? PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    this.playSequence([`praise/${chosen.audioKey}`], chosen.text);
  }

  // ---------------------------------------------------------------------------
  // Internal: file-based playback with TTS fallback
  // ---------------------------------------------------------------------------

  private getItemAudioPath(item: ContentItem): string {
    return `/audio/${CATEGORY_DIR[item.category]}/${item.audioKey}.mp3`;
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

  private async playSequenceAsync(
    parts: Array<string | ContentItem>,
    fallbackText: string
  ): Promise<void> {
    this.stopCurrent();
    try {
      for (const part of parts) {
        const path = typeof part === 'string'
          ? `/audio/${part}.mp3`
          : this.getItemAudioPath(part);
        await this.playSingleClip(path);
      }
    } catch {
      console.warn('[AudioManager] Audio file failed, falling back to TTS:', fallbackText);
      this.speak(fallbackText);
    }
  }

  private playSequence(parts: Array<string | ContentItem>, fallbackText: string): void {
    this.playSequenceAsync(parts, fallbackText).catch(() => this.speak(fallbackText));
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

- [ ] **Step 2: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/audioManager.ts
git commit -m "feat: refactor AudioManager to file-based playback with TTS fallback"
```

---

## Task 5: Create SuccessOverlay component

**Files:**
- Create: `src/shared/components/SuccessOverlay.tsx`

- [ ] **Step 1: Create the file**

```tsx
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ContentItem, PraiseEntry } from '../types';
import { PRAISE_ENTRIES, COLORS } from '../contentRegistry';
import { audioManager } from '../services/audioManager';

interface SuccessOverlayProps {
  show: boolean;
  item: ContentItem;
  onComplete: () => void;
}

function getEchoLine(item: ContentItem): string {
  if (item.category === 'letter' && item.label) {
    return `${item.symbol} ako ${item.label} ${item.emoji ?? ''}`.trim();
  }
  if (item.category === 'number') {
    return `Správne, je ich ${item.symbol} ${item.emoji ?? '⭐'}`.trim();
  }
  if (item.category === 'syllable') {
    return `${item.symbol} ${item.emoji ?? '🗣️'}`.trim();
  }
  return `${item.symbol} ${item.emoji ?? ''}`.trim();
}

export function SuccessOverlay({ show, item, onComplete }: SuccessOverlayProps) {
  const [praise, setPraise] = useState<PraiseEntry>(PRAISE_ENTRIES[0]);

  useEffect(() => {
    if (!show) return;
    const entry = PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    setPraise(entry);
    audioManager.playPraise(entry);
    const timer = setTimeout(onComplete, 3000);
    return () => clearTimeout(timer);
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-light/80 backdrop-blur-sm"
        >
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ y: -500, x: Math.random() * window.innerWidth - window.innerWidth / 2, rotate: 0 }}
              animate={{ y: window.innerHeight + 500, rotate: 360 }}
              transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
              className={`absolute ${i % 3 === 0 ? 'w-16 h-16 rounded-full' : i % 3 === 1 ? 'w-24 h-12 rounded-full' : 'w-12 h-24 rounded-full'} ${COLORS[i % COLORS.length].replace('text-', 'bg-')} opacity-60 blur-[2px]`}
            />
          ))}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-shadow px-8 py-12 sm:px-24 sm:py-20 rounded-[40px] sm:rounded-[80px] relative z-10 border-8 border-white shadow-2xl mx-6 max-w-[90vw] w-auto text-center"
          >
            <div className="text-8xl sm:text-[120px] leading-none mb-2">{praise.emoji}</div>
            <h3 className="text-primary text-5xl sm:text-[100px] font-black tracking-tighter leading-none whitespace-nowrap">
              {praise.text}
            </h3>
            <p className="text-shadow text-2xl sm:text-4xl font-bold mt-4 opacity-70">
              {getEchoLine(item)}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/SuccessOverlay.tsx
git commit -m "feat: add shared SuccessOverlay component with emoji mascot"
```

---

## Task 6: Refactor AlphabetGame

**Files:**
- Modify: `src/games/alphabet/AlphabetGame.tsx`

- [ ] **Step 1: Replace the file**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft, Play, Settings } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { ACTIVE_LETTER_ITEMS, COLORS } from '../../shared/contentRegistry';
import { ContentItem } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';

interface AlphabetGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function AlphabetGame({ onExit, onOpenSettings }: AlphabetGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<ContentItem | null>(null);
  const [gridItems, setGridItems] = useState<ContentItem[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const startNewRound = useCallback(() => {
    const pool = ACTIVE_LETTER_ITEMS;
    let target = pool[Math.floor(Math.random() * pool.length)];
    if (targetItem && pool.length > 1) {
      while (target.symbol === targetItem.symbol) {
        target = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    const others = pool.filter(l => l.symbol !== target.symbol)
      .sort(() => 0.5 - Math.random())
      .slice(0, 7);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    setTargetItem(target);
    setGridItems(grid);
    setFeedback({});
    setShowSuccess(false);
  }, [targetItem]);

  useEffect(() => {
    if (gameState === 'PLAYING' && targetItem) {
      const timer = setTimeout(() => audioManager.playLetter(targetItem), 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, targetItem]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetItem) startNewRound();
  }, [gameState, targetItem, startNewRound]);

  const handleLetterClick = (item: ContentItem, index: number) => {
    if (showSuccess || !targetItem) return;
    if (item.symbol === targetItem.symbol) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setTimeout(() => setShowSuccess(true), 500);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.playAnnouncement('wrong-letter', targetItem, item);
      setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), 500);
    }
  };

  if (gameState === 'HOME') {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={() => setGameState('HOME')}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => targetItem && audioManager.playLetter(targetItem)}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
        >
          <Volume2 size={32} className="sm:w-10 sm:h-10" />
        </motion.button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 w-full max-w-5xl px-4">
        {gridItems.map((item, i) => (
          <motion.button
            key={i}
            onClick={() => handleLetterClick(item, i)}
            animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`
              w-full aspect-[4/5] rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-6xl sm:text-[120px] font-bold font-spline transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {item.symbol}
          </motion.button>
        ))}
      </div>

      {targetItem && (
        <SuccessOverlay
          show={showSuccess}
          item={targetItem}
          onComplete={startNewRound}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/games/alphabet/AlphabetGame.tsx
git commit -m "refactor: AlphabetGame uses ContentItem and shared SuccessOverlay"
```

---

## Task 7: Refactor SyllablesGame

**Files:**
- Modify: `src/games/syllables/SyllablesGame.tsx`

- [ ] **Step 1: Replace the file**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft, Play, Settings } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { SYLLABLE_ITEMS, COLORS } from '../../shared/contentRegistry';
import { ContentItem } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';

interface SyllablesGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
}

export function SyllablesGame({ onExit, onOpenSettings }: SyllablesGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<ContentItem | null>(null);
  const [gridItems, setGridItems] = useState<ContentItem[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const startNewRound = useCallback(() => {
    const pool = SYLLABLE_ITEMS;
    let target = pool[Math.floor(Math.random() * pool.length)];
    if (targetItem && pool.length > 1) {
      while (target.symbol === targetItem.symbol) {
        target = pool[Math.floor(Math.random() * pool.length)];
      }
    }
    const others = pool.filter(s => s.symbol !== target.symbol)
      .sort(() => 0.5 - Math.random())
      .slice(0, 5);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    setTargetItem(target);
    setGridItems(grid);
    setFeedback({});
    setShowSuccess(false);
  }, [targetItem]);

  useEffect(() => {
    if (gameState === 'PLAYING' && targetItem) {
      const timer = setTimeout(() => audioManager.playSyllable(targetItem), 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, targetItem]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetItem) startNewRound();
  }, [gameState, targetItem, startNewRound]);

  const handleSyllableClick = (item: ContentItem, index: number) => {
    if (showSuccess || !targetItem) return;
    if (item.symbol === targetItem.symbol) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setTimeout(() => setShowSuccess(true), 500);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.playAnnouncement('wrong-syllable', targetItem);
      setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), 500);
    }
  };

  if (gameState === 'HOME') {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={() => setGameState('HOME')}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>
      <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => targetItem && audioManager.playSyllable(targetItem)}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
        >
          <Volume2 size={32} className="sm:w-10 sm:h-10" />
        </motion.button>
        <h2 className="text-4xl sm:text-6xl font-black text-shadow">
          Nájdi <span className="text-primary">{targetItem?.symbol}</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-8 w-full max-w-4xl px-4">
        {gridItems.map((item, i) => (
          <motion.button
            key={i}
            onClick={() => handleSyllableClick(item, i)}
            animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`
              w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-4xl sm:text-7xl font-bold font-spline transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {item.symbol}
          </motion.button>
        ))}
      </div>
      {targetItem && (
        <SuccessOverlay show={showSuccess} item={targetItem} onComplete={startNewRound} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/games/syllables/SyllablesGame.tsx
git commit -m "refactor: SyllablesGame uses ContentItem and shared SuccessOverlay"
```

---

## Task 8: Refactor NumbersGame

**Files:**
- Modify: `src/games/numbers/NumbersGame.tsx`

- [ ] **Step 1: Replace the file**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft, Play, Settings } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { NUMBER_ITEMS, COLORS } from '../../shared/contentRegistry';
import { ContentItem } from '../../shared/types';
import { SuccessOverlay } from '../../shared/components/SuccessOverlay';

interface NumbersGameProps {
  onExit: () => void;
  onOpenSettings: () => void;
  range: { start: number; end: number };
}

export function NumbersGame({ onExit, onOpenSettings, range }: NumbersGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<ContentItem | null>(null);
  const [gridItems, setGridItems] = useState<ContentItem[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const availableItems = useMemo(
    () => NUMBER_ITEMS.filter(item => {
      const n = parseInt(item.symbol, 10);
      return n >= range.start && n <= range.end;
    }),
    [range]
  );

  const startNewRound = useCallback(() => {
    if (availableItems.length === 0) return;
    let target = availableItems[Math.floor(Math.random() * availableItems.length)];
    if (targetItem && availableItems.length > 1) {
      while (target.symbol === targetItem.symbol) {
        target = availableItems[Math.floor(Math.random() * availableItems.length)];
      }
    }
    const others = availableItems.filter(n => n.symbol !== target.symbol)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const grid = [...others, target].sort(() => 0.5 - Math.random());
    setTargetItem(target);
    setGridItems(grid);
    setFeedback({});
    setShowSuccess(false);
  }, [targetItem, availableItems]);

  useEffect(() => {
    if (gameState === 'PLAYING' && targetItem) {
      const timer = setTimeout(() => audioManager.playNumber(targetItem), 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, targetItem]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetItem) startNewRound();
  }, [gameState, targetItem, startNewRound]);

  const handleNumberClick = (item: ContentItem, index: number) => {
    if (showSuccess || !targetItem) return;
    if (item.symbol === targetItem.symbol) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setTimeout(() => setShowSuccess(true), 500);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.playAnnouncement('wrong-number', targetItem);
      setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), 500);
    }
  };

  if (gameState === 'HOME') {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
      <button
        onClick={() => setGameState('HOME')}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>
      <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => targetItem && audioManager.playNumber(targetItem)}
          className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full shadow-block flex items-center justify-center text-text-main"
        >
          <Volume2 size={32} className="sm:w-10 sm:h-10" />
        </motion.button>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:gap-8 w-full max-w-3xl px-4">
        {gridItems.map((item, i) => (
          <motion.button
            key={i}
            onClick={() => handleNumberClick(item, i)}
            animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
            className={`
              w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-6xl sm:text-[120px] font-bold font-spline transition-all
              ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
              ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
            `}
          >
            {item.symbol}
          </motion.button>
        ))}
      </div>
      {targetItem && (
        <SuccessOverlay show={showSuccess} item={targetItem} onComplete={startNewRound} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/games/numbers/NumbersGame.tsx
git commit -m "refactor: NumbersGame uses ContentItem and shared SuccessOverlay"
```

---

## Task 9: Refactor CountingItemsGame

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

- [ ] **Step 1: Replace the file**

```tsx
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Play, Settings, RefreshCw } from 'lucide-react';
import { audioManager } from '../../shared/services/audioManager';
import { NUMBER_ITEMS } from '../../shared/contentRegistry';
import { ContentItem } from '../../shared/types';
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

export function CountingItemsGame({ onExit, onOpenSettings, range }: CountingItemsGameProps) {
  const [gameState, setGameState] = useState<'HOME' | 'PLAYING'>('HOME');
  const [targetItem, setTargetItem] = useState<ContentItem | null>(null);
  const [itemPositions, setItemPositions] = useState<ItemPosition[]>([]);
  const [optionItems, setOptionItems] = useState<ContentItem[]>([]);
  const [feedback, setFeedback] = useState<{ [key: number]: 'correct' | 'wrong' | null }>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const availableItems = useMemo(
    () => NUMBER_ITEMS.filter(item => {
      const n = parseInt(item.symbol, 10);
      return n >= range.start && n <= range.end;
    }),
    [range]
  );

  const generatePositions = useCallback((count: number): ItemPosition[] => {
    const emoji = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    const slots = Array.from({ length: 16 }, (_, i) => i)
      .sort(() => Math.random() - 0.5)
      .slice(0, count);
    const padding = 15;
    const usableSize = 100 - 2 * padding;
    const cellSize = usableSize / 4;
    return slots.map(slotIndex => {
      const row = Math.floor(slotIndex / 4);
      const col = slotIndex % 4;
      const centerX = padding + (col + 0.5) * cellSize;
      const centerY = padding + (row + 0.5) * cellSize;
      return {
        x: centerX + (Math.random() - 0.5) * cellSize * 0.4,
        y: centerY + (Math.random() - 0.5) * cellSize * 0.4,
        emoji,
        rotation: Math.random() * 40 - 20,
        scale: 0.9 + Math.random() * 0.3,
      };
    });
  }, []);

  const startNewRound = useCallback(() => {
    if (availableItems.length === 0) return;
    const target = availableItems[Math.floor(Math.random() * availableItems.length)];
    const count = parseInt(target.symbol, 10);
    const positions = generatePositions(count);

    // Build 4 options (target + 3 others from full NUMBER_ITEMS range up to max)
    const allNumbers = NUMBER_ITEMS.filter(item => parseInt(item.symbol, 10) <= Math.max(range.end, 10));
    const others = allNumbers.filter(n => n.symbol !== target.symbol)
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const options = [...others, target].sort(() => 0.5 - Math.random());

    setTargetItem(target);
    setItemPositions(positions);
    setOptionItems(options);
    setFeedback({});
    setShowSuccess(false);
  }, [availableItems, range.end, generatePositions]);

  useEffect(() => {
    if (gameState === 'PLAYING' && !targetItem) startNewRound();
  }, [gameState, targetItem, startNewRound]);

  useEffect(() => {
    if (gameState === 'PLAYING') {
      const timer = setTimeout(
        () => audioManager.playAnnouncement('count-items', NUMBER_ITEMS[0]),
        100
      );
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const handleOptionClick = (item: ContentItem, index: number) => {
    if (showSuccess || !targetItem) return;
    if (item.symbol === targetItem.symbol) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      audioManager.playAnnouncement('correct-count', targetItem);
      setTimeout(() => setShowSuccess(true), 500);
    } else {
      setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
      audioManager.playAnnouncement('wrong-count', targetItem);
      setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), 500);
    }
  };

  if (gameState === 'HOME') {
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
              {'SPOČÍTAJ'.split('').map((char, i) => (
                <span
                  key={i}
                  className={`${'text-primary text-success text-accent-blue'.split(' ')[i % 3]} inline-block py-2`}
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
            className="w-32 h-32 sm:w-48 md:w-60 sm:h-48 md:h-60 bg-soft-watermelon rounded-full shadow-block flex items-center justify-center text-white transition-all shrink-0"
          >
            <Play size={48} className="sm:w-20 sm:h-20 md:w-[100px] md:h-[100px] ml-2 sm:ml-4" fill="currentColor" />
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center p-4 sm:p-8 relative overflow-hidden">
      <button
        onClick={() => setGameState('HOME')}
        className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
      >
        <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
      </button>

      <div className="flex-1 w-full max-w-4xl flex flex-col gap-8 sm:gap-12 mt-16 sm:mt-20">
        <div
          ref={containerRef}
          className="relative flex-1 bg-white/50 rounded-[40px] sm:rounded-[60px] border-4 border-dashed border-shadow/20 overflow-hidden min-h-[300px]"
        >
          {itemPositions.map((pos, i) => (
            <motion.div
              key={`${targetItem?.symbol}-${i}`}
              initial={{ scale: 0, opacity: 0, rotate: -180 }}
              animate={{ scale: pos.scale, opacity: 1, rotate: pos.rotation }}
              exit={{ scale: 0, opacity: 0, rotate: 180 }}
              transition={{ type: 'spring', damping: 12, stiffness: 100, delay: i * 0.05 }}
              className="absolute text-6xl sm:text-8xl select-none"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              {pos.emoji}
            </motion.div>
          ))}
          <button
            onClick={startNewRound}
            className="absolute bottom-4 right-4 w-12 h-12 bg-white/50 rounded-full flex items-center justify-center text-shadow/40 hover:text-shadow transition-colors"
          >
            <RefreshCw size={24} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4 sm:gap-8 w-full shrink-0 mb-8 sm:mb-12">
          {optionItems.map((item, i) => (
            <motion.button
              key={i}
              onClick={() => handleOptionClick(item, i)}
              animate={feedback[i] === 'wrong' ? { x: [-10, 10, -10, 10, 0] } : {}}
              className={`
                w-full aspect-square rounded-[24px] sm:rounded-[32px] flex items-center justify-center text-5xl sm:text-8xl font-bold font-spline transition-all
                ${feedback[i] === 'correct' ? 'bg-success text-primary shadow-block-correct -translate-y-1' : 'bg-white text-text-main shadow-block'}
                ${feedback[i] === 'wrong' ? 'opacity-50 shadow-block-pressed scale-95' : 'active:translate-y-2 active:shadow-block-pressed'}
              `}
            >
              {item.symbol}
            </motion.button>
          ))}
        </div>
      </div>

      {targetItem && (
        <SuccessOverlay show={showSuccess} item={targetItem} onComplete={startNewRound} />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npm run lint
```

- [ ] **Step 3: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx
git commit -m "refactor: CountingItemsGame uses ContentItem and shared SuccessOverlay"
```

---

## Task 10: Cleanup, audio directory, and docs update

**Files:**
- Delete: `src/shared/constants.ts`
- Create: `public/audio/` directory structure
- Modify: `CLAUDE.md`
- Modify: `docs/ALPHABET_PRD.md`, `docs/SYLLABLES_PRD.md`, `docs/NUMBERS_PRD.md`, `docs/COUNTING_ITEMS_PRD.md`

- [ ] **Step 1: Audit remaining references to constants.ts, then delete it**

First check which files still import from `constants.ts`:

```bash
grep -r "from.*constants" src/
```

Expected output: nothing (Tasks 6–9 replaced all game files; `App.tsx` and other shared files don't import from `constants.ts`). If any files appear, update their import to use `contentRegistry` directly before deleting.

Then delete:

```bash
rm src/shared/constants.ts
```

Verify:

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 2: Create audio directory structure**

```bash
mkdir -p public/audio/letters public/audio/syllables public/audio/numbers public/audio/phrases public/audio/praise
```

Add a `.gitkeep` in each so the empty directories are tracked:

```bash
touch public/audio/letters/.gitkeep public/audio/syllables/.gitkeep public/audio/numbers/.gitkeep public/audio/phrases/.gitkeep public/audio/praise/.gitkeep
```

- [ ] **Step 3: Update CLAUDE.md**

In `CLAUDE.md`, update the **Architecture** section to reflect the new structure:

Replace the existing architecture paragraph with:

```markdown
## Architecture

**Screen state machine** (managed in `App.tsx`): HOME → GAME → PARENTS_GATE → SETTINGS

**Content registry**: `src/shared/contentRegistry.ts` is the single source of truth for all game content — letters (full Slovak alphabet, 46 entries), syllables (60), numbers (1–20). Each item is a typed `ContentItem` with `symbol`, `emoji`, `label`, `audioKey`, and `category`. Letters with TBD emoji/label are scaffolded but excluded from game grids at runtime via `ACTIVE_LETTER_ITEMS`.

**Game pattern**: Each game imports a `ContentItem[]` slice from `contentRegistry`, picks a random target, builds a distractor grid, compares by `item.symbol`, and passes `targetItem` to `<SuccessOverlay>`. Games no longer contain hardcoded strings or inline success overlays.

**Audio**: All audio goes through the `audioManager` singleton (`src/shared/services/audioManager.ts`). It plays clip sequences from `public/audio/` (e.g. `letters/a.mp3`, `phrases/najdi-pismeno.mp3`) and falls back to Web Speech API (Slovak `sk-SK`) if a file is missing. The `public/audio/` tree is pre-created; you drop `.mp3` files in to replace TTS.

**SuccessOverlay** (`src/shared/components/SuccessOverlay.tsx`): Shared success screen used by all 4 games. Shows a random emoji mascot + praise text + echo line derived from `ContentItem` (e.g. "A ako Ananás 🍎"). Fires `onComplete()` after 3 seconds.

**ParentsGate** (`src/shared/components/ParentsGate.tsx`): 3-second hold-to-enter mechanism guarding the settings screen.

**Adding a new game**: Create a component in `src/games/<name>/`, import the relevant `ContentItem[]` from `contentRegistry`, use `<SuccessOverlay>` for success state, add the game entry to `App.tsx` and the home screen grid.

## Audio files

Drop recorded `.mp3` files into `public/audio/` subdirectories. File naming follows `audioKey` values from `contentRegistry.ts`:

- `public/audio/letters/a.mp3`, `s-caron.mp3`, `c-caron.mp3` … (bare letter sound)
- `public/audio/syllables/ma.mp3`, `me.mp3` … (bare syllable sound)
- `public/audio/numbers/1.mp3`, `2.mp3` … (number word)
- `public/audio/phrases/najdi-pismeno.mp3`, `toto-je-pismeno.mp3`, `skus-to-znova.mp3` …
- `public/audio/praise/vyborne.mp3`, `skvela-praca.mp3` …

TTS fallback is automatic — missing files cause no errors during development.
```

- [ ] **Step 4: Update PRDs**

In each PRD, replace the existing section 4.2 Audio System with the text below.

**`docs/ALPHABET_PRD.md`** — replace section 4.2:
```markdown
### 4.2 Audio System
- **Voiceovers**: Each letter has a corresponding audio file in `public/audio/letters/`. Files are named by `audioKey` (e.g. `a.mp3`, `s-caron.mp3` for Š). When a file is missing, the Web Speech API (`sk-SK`) is used as fallback.
- **Phrase announcements**: Composed from fragment clips in `public/audio/phrases/` (e.g. `najdi-pismeno.mp3` + letter clip = "Nájdi písmenko A", `toto-je-pismeno.mp3` + letter + `skus-to-znova.mp3` for wrong answers).
- **Praise Audio**: 6 praise variants in `public/audio/praise/` (e.g. `vyborne.mp3`, `skvela-praca.mp3`).
- **SFX**: Removed (not in scope).
- **Music**: Not yet implemented.
```

**`docs/SYLLABLES_PRD.md`** — replace section 4.2:
```markdown
### 4.2 Audio System
- **Voiceovers**: Each syllable has a corresponding audio file in `public/audio/syllables/`. Files are named by `audioKey` (e.g. `ma.mp3`, `se.mp3`). When a file is missing, the Web Speech API (`sk-SK`) is used as fallback.
- **Phrase announcements**: Composed from fragment clips in `public/audio/phrases/` (e.g. `slabika.mp3` + syllable clip = "Slabika MA", `slabika.mp3` + target + `skus-to-znova.mp3` for wrong answers).
- **Praise Audio**: 6 praise variants in `public/audio/praise/`.
- **SFX**: Removed (not in scope).
- **Music**: Not yet implemented.
```

**`docs/NUMBERS_PRD.md`** — replace section 4.2:
```markdown
### 4.2 Audio System
- **Voiceovers**: Each number has a corresponding audio file in `public/audio/numbers/`. Files are named by `audioKey` (e.g. `1.mp3`, `10.mp3`). When a file is missing, the Web Speech API (`sk-SK`) is used as fallback.
- **Phrase announcements**: Composed from fragment clips in `public/audio/phrases/` (e.g. `cislo.mp3` + number clip = "Číslo 3"; wrong answers play `skus-to-znova.mp3` only).
- **Praise Audio**: 6 praise variants in `public/audio/praise/`.
- **SFX**: Removed (not in scope).
- **Music**: Not yet implemented.
```

**`docs/COUNTING_ITEMS_PRD.md`** — replace section 4.2:
```markdown
### 4.2 Audio System
- **Voiceovers**: Number clips from `public/audio/numbers/` are used in correct/wrong feedback (e.g. `ano-je-ich.mp3` + `3.mp3` = "Áno, je ich 3"). When a file is missing, the Web Speech API (`sk-SK`) is used as fallback.
- **Phrase announcements**: `spocitaj-predmety.mp3` prompts the child to count; `ano-je-ich.mp3` + number for correct; `nie-je-ich.mp3` + number + `skus-to-znova.mp3` for wrong.
- **Praise Audio**: 6 praise variants in `public/audio/praise/`.
- **SFX**: Removed (not in scope).
- **Music**: Not yet implemented.
```

- [ ] **Step 5: Verify final build**

```bash
npm run lint && npm run build
```

Expected: no errors, build succeeds.

- [ ] **Step 6: Smoke test in browser**

```bash
npm run dev
```

Open http://localhost:3000 and verify:
- All 4 games launch and play through at least one round
- Wrong answers trigger the shake animation
- Correct answers show the SuccessOverlay with emoji mascot, echo line, and confetti
- After 3 seconds the overlay dismisses and a new round starts
- The replay (🔊) button re-triggers audio
- TTS fallback fires (audio files are empty — you should hear speech synthesis)

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: complete audio/content refactor — file-based audio, ContentItem registry, shared SuccessOverlay"
```
