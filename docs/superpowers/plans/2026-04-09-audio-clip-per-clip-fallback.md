# AudioClip, Per-Clip TTS Fallback, Overlay Timing & Stop on Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single-fallback `AudioSpec` with a per-clip `AudioClip` type, make `audioManager.play()` async per-clip, fix overlay dismissal timing, and stop audio on game navigation.

**Architecture:** Types change first (`AudioClip` + new `AudioSpec`), then `AudioManager` gains per-clip fallback and a public `stop()`, then overlays await audio + minimum timer, then all call sites (5 descriptors + `CountingItemsGame`) are migrated. No new files needed.

**Tech Stack:** TypeScript, React hooks, Web Audio API, Web Speech API

> **Note:** No test runner is configured in this project. Verification uses `npm run lint` (tsc + eslint) after each task.

---

### Task 1: Update `AudioClip` and `AudioSpec` types

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Replace `AudioSpec` in `types.ts`**

Replace the existing `AudioSpec` interface (around line 62–67):

```ts
/** A single audio clip with its own TTS fallback if the file is missing. */
export interface AudioClip {
  /** Path relative to /audio/, without .mp3 — e.g. "phrases/najdi-pismeno", "letters/a" */
  path: string;
  /** Spoken by TTS if this specific file fails to load or play. */
  fallbackText: string;
}

/** Describes a sequence of audio clips to play. */
export interface AudioSpec {
  clips: AudioClip[];
  // Extendable: add global fields here (volume, rate, etc.) without touching call sites
}
```

- [ ] **Step 2: Run lint — expect failures for all stale `sequence`/`fallbackText` usages**

```bash
npm run lint 2>&1 | grep error
```

Expected: multiple "Object literal may only specify known properties" errors across descriptors and `CountingItemsGame`. This confirms the migration targets.

---

### Task 2: Rewrite `AudioManager`

**Files:**
- Modify: `src/shared/services/audioManager.ts`

- [ ] **Step 1: Rewrite `audioManager.ts` in full**

```ts
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AudioSpec, AudioClip, PraiseEntry } from '../types';
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

  /** Stop any in-progress audio or TTS immediately. */
  stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
    this.synth.cancel();
  }

  /** Play a sequence of AudioClips. Each clip falls back to its own TTS if the file fails.
   *  Returns a Promise that resolves when the full sequence completes. */
  play(spec: AudioSpec): Promise<void> {
    return this.playClipsAsync(spec.clips);
  }

  playPraise(entry?: PraiseEntry): Promise<void> {
    const chosen = entry ?? PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
    return this.playClipsAsync([{ path: `praise/${chosen.audioKey}`, fallbackText: chosen.text }]);
  }

  private async playClipsAsync(clips: AudioClip[]): Promise<void> {
    this.stop();
    for (const clip of clips) {
      try {
        await this.playSingleClip(`/audio/${clip.path}.mp3`);
      } catch {
        console.warn('[AudioManager] Audio file failed, falling back to TTS:', clip.fallbackText);
        await this.speakAsync(clip.fallbackText);
      }
    }
  }

  private playSingleClip(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const audio = new Audio(path);
      this.currentAudio = audio;
      audio.onended = () => resolve();
      audio.onerror = () => reject(new Error(`Failed to load: ${path}`));
      audio.play().catch(reject);
    });
  }

  private speakAsync(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth) { resolve(); return; }
      this.synth.cancel();
      setTimeout(() => {
        const utterance = new SpeechSynthesisUtterance(text);
        const voices = this.synth.getVoices();
        const skVoice = voices.find(v => v.lang === 'sk-SK' || v.lang.startsWith('sk'));
        if (skVoice) utterance.voice = skVoice;
        utterance.lang = 'sk-SK';
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        if (this.synth.paused) this.synth.resume();
        this.synth.speak(utterance);
      }, 50);
    });
  }
}

export const audioManager = new AudioManager();
```

- [ ] **Step 2: Run lint — expect only descriptor/CountingItemsGame errors to remain**

```bash
npm run lint 2>&1 | grep error
```

Expected: errors only in descriptor files and `CountingItemsGame.tsx`, none in `audioManager.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts src/shared/services/audioManager.ts
git commit -m "feat: replace AudioSpec sequence/fallback with per-clip AudioClip type and async play()"
```

---

### Task 3: Stop audio on `FindItGame` unmount

**Files:**
- Modify: `src/shared/components/FindItGame.tsx`

- [ ] **Step 1: Add stop-on-unmount effect**

After the existing `useEffect` that syncs `targetItemRef` (line ~40), add:

```ts
useEffect(() => {
  return () => audioManager.stop();
}, []);
```

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | grep 'FindItGame'
```

Expected: no errors for `FindItGame.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/FindItGame.tsx
git commit -m "fix: stop audio when FindItGame unmounts (back navigation)"
```

---

### Task 4: Fix `SuccessOverlay` dismissal timing

**Files:**
- Modify: `src/shared/components/SuccessOverlay.tsx`

- [ ] **Step 1: Replace the `useEffect` and `handlePause` in `SuccessOverlay`**

Replace the `timerRef` declaration and the `useEffect` block (lines ~22–43) and `handlePause` (lines ~45–48) with:

```ts
const cancelledRef = useRef(false);

useEffect(() => {
  if (!show) { setPaused(false); return; }
  const entry = PRAISE_ENTRIES[Math.floor(Math.random() * PRAISE_ENTRIES.length)];
  setPraise(entry);
  setPaused(false);
  cancelledRef.current = false;

  const minTimer = new Promise<void>(resolve =>
    setTimeout(resolve, TIMING.SUCCESS_OVERLAY_DURATION_MS)
  );
  const audio = audioManager.playPraise(entry);

  Promise.all([minTimer, audio]).then(() => {
    if (!cancelledRef.current) onComplete();
  });

  return () => {
    cancelledRef.current = true;
    audioManager.stop();
  };
}, [show]); // eslint-disable-line react-hooks/exhaustive-deps

const handlePause = () => {
  cancelledRef.current = true;
  audioManager.stop();
  setPaused(true);
};
```

Also remove the `timerRef` declaration (`const timerRef = useRef...`) since it is no longer used.

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | grep 'SuccessOverlay'
```

Expected: no errors for `SuccessOverlay.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/SuccessOverlay.tsx
git commit -m "fix: success overlay waits for audio to finish before dismissing"
```

---

### Task 5: Fix `FailureOverlay` dismissal timing

**Files:**
- Modify: `src/shared/components/FailureOverlay.tsx`

- [ ] **Step 1: Replace `useEffect` in `FailureOverlay`**

Replace the existing imports, `timerRef`, and `useEffect` (lines ~6–27) with:

```ts
import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FailureSpec } from '../types';
import { audioManager } from '../services/audioManager';

const FAILURE_DURATION_MS = 2500;

interface FailureOverlayProps {
  show: boolean;
  spec: FailureSpec;
  onComplete: () => void;
}

export function FailureOverlay({ show, spec, onComplete }: FailureOverlayProps) {
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!show) return;
    cancelledRef.current = false;

    const minTimer = new Promise<void>(resolve =>
      setTimeout(resolve, FAILURE_DURATION_MS)
    );
    const audio = audioManager.play(spec.audioSpec);

    Promise.all([minTimer, audio]).then(() => {
      if (!cancelledRef.current) onComplete();
    });

    return () => {
      cancelledRef.current = true;
      audioManager.stop();
    };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps
```

Replace the `onClick` on the outer `motion.div` (line ~36):

```tsx
onClick={() => {
  cancelledRef.current = true;
  audioManager.stop();
  onComplete();
}}
```

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | grep 'FailureOverlay'
```

Expected: no errors for `FailureOverlay.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/FailureOverlay.tsx
git commit -m "fix: failure overlay waits for audio to finish before dismissing"
```

---

### Task 6: Migrate `alphabetDescriptor`

**Files:**
- Modify: `src/games/alphabet/alphabetDescriptor.tsx`

- [ ] **Step 1: Update all `AudioSpec` return values**

Replace the three audio return objects:

```ts
getPromptAudio: (l) => ({
  clips: [
    { path: 'phrases/najdi-pismeno', fallbackText: 'Nájdi písmenko' },
    { path: `letters/${l.audioKey}`, fallbackText: l.symbol },
  ],
}),
getWrongAudio: (_t, s) => ({
  clips: [
    { path: 'phrases/toto-je-pismeno', fallbackText: 'Toto je písmenko' },
    { path: `letters/${s.audioKey}`, fallbackText: s.symbol },
    { path: 'phrases/skus-to-znova', fallbackText: 'Skús to znova.' },
  ],
}),
getFailureSpec: (l) => ({
  echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
  audioSpec: {
    clips: [
      { path: 'phrases/nevadi', fallbackText: 'Nevadí!' },
      { path: 'phrases/spravna-odpoved', fallbackText: 'Správna odpoveď je' },
      { path: `letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
    ],
  },
}),
```

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | grep 'alphabetDescriptor'
```

Expected: no errors.

---

### Task 7: Migrate `syllablesDescriptor`

**Files:**
- Modify: `src/games/syllables/syllablesDescriptor.tsx`

- [ ] **Step 1: Update all `AudioSpec` return values**

```ts
getPromptAudio: (s) => ({
  clips: [
    { path: 'phrases/slabika', fallbackText: 'Slabika' },
    { path: `syllables/${s.audioKey}`, fallbackText: s.symbol },
  ],
}),
getWrongAudio: (t, _s) => ({
  clips: [
    { path: 'phrases/slabika', fallbackText: 'Slabika' },
    { path: `syllables/${t.audioKey}`, fallbackText: t.symbol },
    { path: 'phrases/skus-to-znova', fallbackText: 'Skús to znova.' },
  ],
}),
getFailureSpec: (s) => {
  const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
  return {
    echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}`,
    audioSpec: {
      clips: [
        { path: 'phrases/nevadi', fallbackText: 'Nevadí!' },
        { path: 'phrases/spravna-odpoved', fallbackText: 'Správna odpoveď je' },
        { path: `syllables/${s.audioKey}`, fallbackText: `slabika ${s.symbol}` },
      ],
    },
  };
},
```

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | grep 'syllablesDescriptor'
```

Expected: no errors.

---

### Task 8: Migrate `numbersDescriptor`

**Files:**
- Modify: `src/games/numbers/numbersDescriptor.tsx`

- [ ] **Step 1: Update all `AudioSpec` return values**

```ts
getPromptAudio: (n) => ({
  clips: [
    { path: 'phrases/cislo', fallbackText: 'Číslo' },
    { path: `numbers/${n.audioKey}`, fallbackText: String(n.value) },
  ],
}),
getWrongAudio: () => ({
  clips: [
    { path: 'phrases/skus-to-znova', fallbackText: 'Skús to znova.' },
  ],
}),
getFailureSpec: (n) => ({
  echoLine: `Číslo ${n.value} 🎉`,
  audioSpec: {
    clips: [
      { path: 'phrases/nevadi', fallbackText: 'Nevadí!' },
      { path: 'phrases/spravna-odpoved', fallbackText: 'Správna odpoveď je' },
      { path: `numbers/${n.audioKey}`, fallbackText: `číslo ${n.value}` },
    ],
  },
}),
```

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | grep 'numbersDescriptor'
```

Expected: no errors.

---

### Task 9: Migrate `wordsDescriptor`

**Files:**
- Modify: `src/games/words/wordsDescriptor.tsx`

- [ ] **Step 1: Update all `AudioSpec` return values**

```ts
getPromptAudio: (_w) => ({
  clips: [
    { path: 'phrases/co-tu-je-napisane', fallbackText: 'Čo tu je napísané?' },
  ],
}),
getReplayAudio: (w) => ({
  clips: [
    { path: `words/${w.audioKey}`, fallbackText: w.word },
  ],
}),
getWrongAudio: () => ({
  clips: [
    { path: 'phrases/skus-to-znova', fallbackText: 'Skús to znova.' },
  ],
}),
getFailureSpec: (w) => ({
  echoLine: `${w.syllables} ${w.emoji}`,
  audioSpec: {
    clips: [
      { path: 'phrases/nevadi', fallbackText: 'Nevadí!' },
      { path: 'phrases/spravna-odpoved', fallbackText: 'Správna odpoveď je' },
      { path: `words/${w.audioKey}`, fallbackText: w.word },
    ],
  },
}),
```

- [ ] **Step 2: Run lint**

```bash
npm run lint 2>&1 | grep 'wordsDescriptor'
```

Expected: no errors.

- [ ] **Step 3: Commit Tasks 6–9 together**

```bash
git add src/games/alphabet/alphabetDescriptor.tsx src/games/syllables/syllablesDescriptor.tsx src/games/numbers/numbersDescriptor.tsx src/games/words/wordsDescriptor.tsx
git commit -m "feat: migrate all game descriptors to per-clip AudioClip format"
```

---

### Task 10: Migrate `CountingItemsGame` inline audio calls

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

- [ ] **Step 1: Update 3 inline `audioManager.play()` calls**

Find and replace each occurrence:

**Occurrence 1** — auto-play on game start (inside `useEffect`, around line 102):
```ts
// Before:
audioManager.play({ sequence: ['phrases/spocitaj-predmety'], fallbackText: 'Spočítaj predmety' })
// After:
audioManager.play({ clips: [{ path: 'phrases/spocitaj-predmety', fallbackText: 'Spočítaj predmety' }] })
```

**Occurrence 2** — wrong answer audio (around line 136):
```ts
// Before:
audioManager.play({ sequence: ['phrases/skus-to-znova'], fallbackText: 'Skús to znova.' });
// After:
audioManager.play({ clips: [{ path: 'phrases/skus-to-znova', fallbackText: 'Skús to znova.' }] });
```

**Occurrence 3** — speaker button `onClick` (around line 207):
```ts
// Before:
audioManager.play({ sequence: ['phrases/spocitaj-predmety'], fallbackText: 'Spočítaj predmety' })
// After:
audioManager.play({ clips: [{ path: 'phrases/spocitaj-predmety', fallbackText: 'Spočítaj predmety' }] })
```

**Occurrence 4** — `FailureSpec` inline object (around line 130–132):
```ts
// Before:
{
  sequence: ['phrases/nevadi', 'phrases/spravna-odpoved', `numbers/${targetItem.audioKey}`],
  fallbackText: `Nevadí! Správna odpoveď je ${targetItem.value}.`,
}
// After:
{
  clips: [
    { path: 'phrases/nevadi', fallbackText: 'Nevadí!' },
    { path: 'phrases/spravna-odpoved', fallbackText: 'Správna odpoveď je' },
    { path: `numbers/${targetItem.audioKey}`, fallbackText: String(targetItem.value) },
  ],
}
```

- [ ] **Step 2: Run full lint — expect zero errors**

```bash
npm run lint
```

Expected: clean exit with no output.

- [ ] **Step 3: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx
git commit -m "feat: migrate CountingItemsGame inline audio to per-clip AudioClip format"
```

---

## Verification Checklist

After all tasks complete:

1. `npm run lint` — zero errors
2. Open Words game → start round → only "Čo tu je napísané?" plays; tap speaker → only the word plays
3. Remove a word audio file temporarily → only that clip's fallback TTS fires; next clip plays normally → restore the file
4. Trigger success overlay with long audio sequence → overlay stays until audio finishes (minimum 3s)
5. Trigger failure overlay → overlay stays until audio finishes (minimum 2.5s)
6. Tap the overlay manually mid-audio → overlay dismisses immediately, audio stops
7. Start any game, trigger auto-play, tap back → audio stops immediately
8. Verify alphabet, syllables, numbers, counting games — behavior unchanged
