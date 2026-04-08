# Round Counter + Session Complete Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-round progress counter visible during gameplay and a session complete screen with star rating that appears after the last round.

**Architecture:** `SessionCompleteOverlay` is a new shared component that receives round stats and computes the star rating. `FindItGame` and `CountingItemsGame` each track `roundsCompleted` and `totalTaps` locally, show the counter pill during play, and swap `SuccessOverlay` for `SessionCompleteOverlay` on the final round. `maxRounds` is added as an optional field on `GameDescriptor` (default 10).

**Tech Stack:** React, TypeScript, Tailwind CSS, motion/react (framer-motion), lucide-react

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/types.ts` | Modify | Add `maxRounds?: number` to `GameDescriptor` |
| `src/shared/components/SessionCompleteOverlay.tsx` | Create | Celebration screen with star rating, auto-closes after 5s |
| `src/shared/components/FindItGame.tsx` | Modify | Add counters, counter pill, session complete trigger |
| `src/games/counting/CountingItemsGame.tsx` | Modify | Add counters, counter pill, session complete trigger |

---

## Task 1: Add `maxRounds` to `GameDescriptor`

**Files:**
- Modify: `src/shared/types.ts`

- [ ] **Step 1: Add `maxRounds` field**

In `src/shared/types.ts`, find the `GameDescriptor<T>` interface (around line 75) and add the optional field:

```typescript
export interface GameDescriptor<T> {
  /** Total cards in the grid including the target. */
  gridSize: number;
  /** Tailwind grid-cols classes, e.g. "grid-cols-2 sm:grid-cols-3" */
  gridColsClass: string;
  /** Maximum correct answers before session ends. Defaults to 10 if omitted. */
  maxRounds?: number;
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
```

- [ ] **Step 2: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/types.ts
git commit -m "feat: add optional maxRounds to GameDescriptor"
```

---

## Task 2: Create `SessionCompleteOverlay`

**Files:**
- Create: `src/shared/components/SessionCompleteOverlay.tsx`

- [ ] **Step 1: Create the component**

Create `src/shared/components/SessionCompleteOverlay.tsx`:

```typescript
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { COLORS } from '../contentRegistry';

interface SessionCompleteOverlayProps {
  show: boolean;
  roundsCompleted: number;
  totalTaps: number;
  maxRounds: number;
  onComplete: () => void;
}

function getStars(roundsCompleted: number, totalTaps: number): number {
  if (totalTaps === 0) return 3;
  const accuracy = roundsCompleted / totalTaps;
  if (accuracy > 0.8) return 3;
  if (accuracy >= 0.5) return 2;
  return 1;
}

export function SessionCompleteOverlay({
  show,
  roundsCompleted,
  totalTaps,
  maxRounds,
  onComplete,
}: SessionCompleteOverlayProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const confetti = useMemo(
    () =>
      [...Array(30)].map((_, i) => ({
        x: Math.random() * window.innerWidth - window.innerWidth / 2,
        duration: 3 + Math.random() * 3,
        delay: Math.random() * 2,
        shape: i % 3,
      })),
    [show] // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (!show) return;
    timerRef.current = setTimeout(onComplete, 5000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [show]); // eslint-disable-line react-hooks/exhaustive-deps

  const stars = getStars(roundsCompleted, totalTaps);
  const starDisplay = ['⭐', '⭐', '⭐']
    .map((s, i) => (i < stars ? s : '☆'))
    .join(' ');

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
              className={`absolute ${
                p.shape === 0
                  ? 'w-16 h-16 rounded-full'
                  : p.shape === 1
                  ? 'w-24 h-12 rounded-full'
                  : 'w-12 h-24 rounded-full'
              } ${COLORS[i % COLORS.length].replace('text-', 'bg-')} opacity-60 blur-[2px]`}
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
            <div className="text-[120px] sm:text-[160px] leading-none mb-2">🎉</div>
            <h3 className="text-primary text-5xl sm:text-7xl font-black tracking-tighter leading-none">
              Hotovo!
            </h3>
            <p className="text-5xl mt-4 tracking-widest">{starDisplay}</p>
            <p
              className="text-2xl sm:text-3xl font-extrabold mt-4"
              style={{ color: '#c06a00' }}
            >
              {roundsCompleted} z {maxRounds} správne
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/SessionCompleteOverlay.tsx
git commit -m "feat: add SessionCompleteOverlay with star rating"
```

---

## Task 3: Update `FindItGame` — counters, pill, session complete

**Files:**
- Modify: `src/shared/components/FindItGame.tsx`

- [ ] **Step 1: Add counters state and session complete import**

Replace the imports block and add new state at the top of `FindItGame`:

```typescript
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'motion/react';
import { Volume2, ArrowLeft } from 'lucide-react';
import { GameDescriptor, SuccessSpec } from '../types';
import { audioManager } from '../services/audioManager';
import { SuccessOverlay } from './SuccessOverlay';
import { SessionCompleteOverlay } from './SessionCompleteOverlay';
import { TIMING } from '../contentRegistry';
```

Inside `FindItGame`, after existing state declarations (after line `const pendingSuccessRef = ...`), add:

```typescript
const maxRounds = descriptor.maxRounds ?? 10;
const [roundsCompleted, setRoundsCompleted] = useState(0);
const [totalTaps, setTotalTaps] = useState(0);
const [showSessionComplete, setShowSessionComplete] = useState(false);
```

- [ ] **Step 2: Update `handleCardClick` to track taps and trigger session complete**

Replace the existing `handleCardClick` function:

```typescript
const handleCardClick = (item: T, index: number) => {
  if (showSuccess || pendingSuccessRef.current || !targetItem || showSessionComplete) return;
  setTotalTaps(prev => prev + 1);
  if (descriptor.getItemId(item) === descriptor.getItemId(targetItem)) {
    pendingSuccessRef.current = true;
    setFeedback(prev => ({ ...prev, [index]: 'correct' }));
    setSuccessSpec(descriptor.getSuccessSpec(targetItem));
    const nextRoundsCompleted = roundsCompleted + 1;
    setRoundsCompleted(nextRoundsCompleted);
    if (nextRoundsCompleted >= maxRounds) {
      setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
    } else {
      setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
    }
  } else {
    setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
    audioManager.play(descriptor.getWrongAudio(targetItem, item));
    setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
  }
};
```

- [ ] **Step 3: Add round counter pill and SessionCompleteOverlay to JSX**

Replace the `return (...)` in `FindItGame` with the following (adding the pill above the audio button and the `SessionCompleteOverlay` below `SuccessOverlay`):

```tsx
return (
  <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8">
    <button
      onClick={onExit}
      className="fixed top-4 left-4 sm:top-8 sm:left-8 w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-full flex items-center justify-center text-text-main shadow-block transition-all active:translate-y-2 active:shadow-block-pressed z-20"
    >
      <ArrowLeft size={24} className="sm:w-7 sm:h-7" />
    </button>

    <div className="flex flex-col items-center gap-4 sm:gap-8 mb-8 sm:mb-12">
      <div className="bg-white rounded-full px-6 py-2 shadow-block font-bold text-lg sm:text-xl text-text-main">
        ✓ {roundsCompleted} / {maxRounds}
      </div>
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
    <SessionCompleteOverlay
      show={showSessionComplete}
      roundsCompleted={roundsCompleted}
      totalTaps={totalTaps}
      maxRounds={maxRounds}
      onComplete={onExit}
    />
  </div>
);
```

- [ ] **Step 4: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/FindItGame.tsx
git commit -m "feat: add round counter pill and session complete to FindItGame"
```

---

## Task 4: Update `CountingItemsGame` — counters, pill, session complete

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

- [ ] **Step 1: Add import and state**

Add `SessionCompleteOverlay` import after the existing `SuccessOverlay` import:

```typescript
import { SessionCompleteOverlay } from '../../shared/components/SessionCompleteOverlay';
```

Inside `CountingItemsGame`, after `const [showOptions, setShowOptions] = useState(false);`, add:

```typescript
const MAX_ROUNDS = 10;
const [roundsCompleted, setRoundsCompleted] = useState(0);
const [totalTaps, setTotalTaps] = useState(0);
const [showSessionComplete, setShowSessionComplete] = useState(false);
```

- [ ] **Step 2: Update `handleOptionClick` to track taps and trigger session complete**

Replace the existing `handleOptionClick` function:

```typescript
const handleOptionClick = (item: SlovakNumber, index: number) => {
  if (showSuccess || showSessionComplete || !targetItem) return;
  setTotalTaps(prev => prev + 1);
  if (item.value === targetItem.value) {
    setFeedback(prev => ({ ...prev, [index]: 'correct' }));
    const nextRoundsCompleted = roundsCompleted + 1;
    setRoundsCompleted(nextRoundsCompleted);
    if (nextRoundsCompleted >= MAX_ROUNDS) {
      setTimeout(() => setShowSessionComplete(true), TIMING.SUCCESS_SHOW_DELAY_MS);
    } else {
      setTimeout(() => setShowSuccess(true), TIMING.SUCCESS_SHOW_DELAY_MS);
    }
  } else {
    setFeedback(prev => ({ ...prev, [index]: 'wrong' }));
    audioManager.play({ sequence: ['phrases/skus-to-znova'], fallbackText: 'Skús to znova.' });
    setTimeout(() => setFeedback(prev => ({ ...prev, [index]: null })), TIMING.FEEDBACK_RESET_MS);
  }
};
```

- [ ] **Step 3: Add round counter pill to the PLAYING JSX**

In the PLAYING state `return (...)`, find this block (around line 168):

```tsx
<div className="flex-1 w-full max-w-4xl flex flex-col gap-8 sm:gap-12 mt-16 sm:mt-20">
```

Replace with:

```tsx
<div className="flex-1 w-full max-w-4xl flex flex-col gap-8 sm:gap-12 mt-16 sm:mt-20">
  <div className="flex justify-center">
    <div className="bg-white rounded-full px-6 py-2 shadow-block font-bold text-lg sm:text-xl text-text-main">
      ✓ {roundsCompleted} / {MAX_ROUNDS}
    </div>
  </div>
```

(Keep all existing children inside the div — just add the pill div as the first child.)

- [ ] **Step 4: Add `SessionCompleteOverlay` to PLAYING return JSX**

After the existing `{targetItem && (<SuccessOverlay ... />)}` block, add:

```tsx
<SessionCompleteOverlay
  show={showSessionComplete}
  roundsCompleted={roundsCompleted}
  totalTaps={totalTaps}
  maxRounds={MAX_ROUNDS}
  onComplete={() => setGameState('HOME')}
/>
```

- [ ] **Step 5: Type-check**

```bash
node_modules/.bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx
git commit -m "feat: add round counter pill and session complete to CountingItemsGame"
```

---

## Final Verification

- [ ] **Manual test: FindItGame (Alphabet)**
  1. Open Alphabet game → start playing
  2. Counter shows `✓ 0 / 10`
  3. Correct answer → counter updates to `✓ 1 / 10`
  4. Wrong tap → counter stays (only correct answers increment)
  5. Complete 10 correct answers → `SessionCompleteOverlay` appears with `🎉 Hotovo!`
  6. All correct → 3 stars (`⭐ ⭐ ⭐`)
  7. Overlay auto-closes after ~5s → back to Alphabet HOME screen
  8. Clicking overlay closes it early

- [ ] **Manual test: CountingItemsGame**
  1. Same flow as above
  2. After session complete, returns to Counting HOME (not app home)

- [ ] **Manual test: Star rating**
  1. Play with ~50% accuracy (answer half wrong before getting correct) → 2 stars
  2. Play with many wrong taps → 1 star
