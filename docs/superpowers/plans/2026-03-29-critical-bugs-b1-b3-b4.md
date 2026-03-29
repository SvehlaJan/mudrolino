# Critical Bug Fixes (B1, B3, B4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three critical bugs: B1 (music toggle is a no-op), B3 (confetti animations run forever), B4 (`startNewRound` stale closure with infinite-loop risk).

**Architecture:** B1 adds a looping `HTMLAudioElement` to `AudioManager`, wired to `updateSettings()`. B3 removes `repeat: Infinity` from SuccessOverlay confetti particles. B4 replaces the `targetItem` `useCallback` dependency with a `useRef` in AlphabetGame, SyllablesGame, and NumbersGame (CountingItemsGame already has no `targetItem` dep).

**Tech Stack:** React 19, TypeScript, Framer Motion (motion/react), Vite

**Verification:** No test framework — use `npm run lint` (TypeScript type check) after each task, and `npm run dev` for final browser smoke test.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/shared/services/audioManager.ts` | Add background music loop; wire `updateSettings` |
| Modify | `src/shared/components/SuccessOverlay.tsx` | Remove `repeat: Infinity` from confetti |
| Modify | `src/games/alphabet/AlphabetGame.tsx` | Replace `targetItem` dep with ref in `startNewRound` |
| Modify | `src/games/syllables/SyllablesGame.tsx` | Replace `targetItem` dep with ref in `startNewRound` |
| Modify | `src/games/numbers/NumbersGame.tsx` | Replace `targetItem` dep with ref in `startNewRound` |

---

## Task 1: B1 — Wire music toggle in AudioManager

**Files:**
- Modify: `src/shared/services/audioManager.ts`

- [ ] **Step 1: Add music fields to the class**

In `src/shared/services/audioManager.ts`, add two private fields after `private currentAudio`:

```ts
private musicAudio: HTMLAudioElement | null = null;
private musicEnabled = false;
```

- [ ] **Step 2: Replace the stub `updateSettings` method**

```ts
updateSettings(settings: { music: boolean }): void {
  this.musicEnabled = settings.music;
  if (this.musicEnabled) {
    if (!this.musicAudio) {
      this.musicAudio = new Audio('/audio/music/background.mp3');
      this.musicAudio.loop = true;
      this.musicAudio.volume = 0.4;
    }
    this.musicAudio.play().catch(() => {
      // Autoplay blocked or file missing — silently do nothing
    });
  } else {
    if (this.musicAudio) {
      this.musicAudio.pause();
    }
  }
}
```

`App.tsx` passes the full `GameSettings` object which includes `music: boolean` — compatible with the new signature, no change needed there.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/services/audioManager.ts
git commit -m "fix: wire music toggle to background audio loop in AudioManager (B1)"
```

---

## Task 2: B3 — Stop confetti after one fall

**Files:**
- Modify: `src/shared/components/SuccessOverlay.tsx` (line ~52)

The 30 confetti particles use `repeat: Infinity` — they keep animating in the background after the overlay disappears. The fall duration (3–6 s) already covers the overlay lifetime (3 s), so one pass is enough.

- [ ] **Step 1: Remove `repeat: Infinity` from confetti transition (keep `delay`)**

Find this line in `SuccessOverlay.tsx`:

```ts
transition={{ duration: 3 + Math.random() * 3, repeat: Infinity, ease: 'linear', delay: Math.random() * 2 }}
```

Replace with (keep `delay` for staggered start, only remove `repeat`):

```ts
transition={{ duration: 3 + Math.random() * 3, ease: 'linear', delay: Math.random() * 2 }}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/SuccessOverlay.tsx
git commit -m "fix: confetti falls once and stops, remove infinite repeat (B3)"
```

---

## Task 3: B4 — Fix stale closure in AlphabetGame

**Files:**
- Modify: `src/games/alphabet/AlphabetGame.tsx`

`startNewRound` closes over `targetItem` to avoid repeating the same letter, but `targetItem` is also set inside the callback. Every round completion recreates the callback (new `targetItem`), which re-triggers the effect that watches `startNewRound`. Fix: read `targetItem` through a ref inside the callback, removing it from the dep array.

- [ ] **Step 1: Add `useRef` to the React import**

```ts
import React, { useState, useEffect, useCallback, useRef } from 'react';
```

- [ ] **Step 2: Add the ref and sync effect after the `useState` declarations**

```ts
const targetItemRef = useRef<ContentItem | null>(null);
useEffect(() => {
  targetItemRef.current = targetItem;
}, [targetItem]);
```

- [ ] **Step 3: Replace `startNewRound`**

```ts
const startNewRound = useCallback(() => {
  const pool = ACTIVE_LETTER_ITEMS;
  let target = pool[Math.floor(Math.random() * pool.length)];
  const current = targetItemRef.current;
  if (current && pool.length > 1) {
    while (target.symbol === current.symbol) {
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
}, []); // no targetItem dependency — reads via ref
```

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/alphabet/AlphabetGame.tsx
git commit -m "fix: use ref for targetItem in AlphabetGame startNewRound (B4)"
```

---

## Task 4: B4 — Fix stale closure in SyllablesGame

**Files:**
- Modify: `src/games/syllables/SyllablesGame.tsx`

Same pattern as Task 3.

- [ ] **Step 1: Add `useRef` to imports**

```ts
import React, { useState, useEffect, useCallback, useRef } from 'react';
```

- [ ] **Step 2: Add ref and sync effect after `useState` declarations**

```ts
const targetItemRef = useRef<ContentItem | null>(null);
useEffect(() => {
  targetItemRef.current = targetItem;
}, [targetItem]);
```

- [ ] **Step 3: Replace `startNewRound`**

```ts
const startNewRound = useCallback(() => {
  const pool = SYLLABLE_ITEMS;
  let target = pool[Math.floor(Math.random() * pool.length)];
  const current = targetItemRef.current;
  if (current && pool.length > 1) {
    while (target.symbol === current.symbol) {
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
}, []); // no targetItem dependency — reads via ref
```

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/syllables/SyllablesGame.tsx
git commit -m "fix: use ref for targetItem in SyllablesGame startNewRound (B4)"
```

---

## Task 5: B4 — Fix stale closure in NumbersGame

**Files:**
- Modify: `src/games/numbers/NumbersGame.tsx`

`NumbersGame.startNewRound` deps are `[targetItem, availableItems]`. `availableItems` is a stable `useMemo` — keep that dep. Only `targetItem` moves to a ref.

- [ ] **Step 1: Add `useRef` to imports**

```ts
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
```

- [ ] **Step 2: Add ref and sync effect after the `availableItems` useMemo**

```ts
const targetItemRef = useRef<ContentItem | null>(null);
useEffect(() => {
  targetItemRef.current = targetItem;
}, [targetItem]);
```

- [ ] **Step 3: Replace `startNewRound`**

```ts
const startNewRound = useCallback(() => {
  if (availableItems.length === 0) return;
  let target = availableItems[Math.floor(Math.random() * availableItems.length)];
  const current = targetItemRef.current;
  if (current && availableItems.length > 1) {
    while (target.symbol === current.symbol) {
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
}, [availableItems]); // targetItem replaced by ref; availableItems stays
```

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/numbers/NumbersGame.tsx
git commit -m "fix: use ref for targetItem in NumbersGame startNewRound (B4)"
```

---

## Final: Browser smoke test

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify B1** — Go to Settings (hold the settings button for 3 s to pass ParentsGate). Toggle "Hudba" on. No console errors (music tries `/audio/music/background.mp3`, fails silently if missing). Toggle off — no crash.

- [ ] **Step 3: Verify B3** — Start any game, get a correct answer. Confetti falls once during the success overlay and stops. After the overlay disappears, no particles continue animating.

- [ ] **Step 4: Verify B4** — Play 5+ rounds in each of the 3 affected games (Alphabet, Syllables, Numbers). Rounds advance smoothly with no double-firing or skipped rounds.
