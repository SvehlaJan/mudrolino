# Shuffled Queue Challenge Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-round random selection with a session-level shuffled queue so no target repeats within a pool cycle, and replace the biased `sort()` shuffle with proper Fisher-Yates everywhere.

**Architecture:** Extract a single `fisherYatesShuffle<T>` utility into `src/shared/utils.ts`. In `FindItGame`, replace the `prevTarget` guard with a `queueRef` that is pre-shuffled at session start and consumed one item per round, refilling when exhausted. In `CountingItemsGame` and `AssemblyGame`, apply the same queue pattern via a `useRef`-held queue initialized when the pool is known. Distractor selection already excludes the target; swap its `sort()` call to use `fisherYatesShuffle` as well.

**Tech Stack:** React (hooks, useRef, useCallback), TypeScript

---

## File Map

| Action | File | Change |
|--------|------|--------|
| **Create** | `src/shared/utils.ts` | `fisherYatesShuffle<T>` utility |
| **Modify** | `src/shared/components/FindItGame.tsx` | Queue-based target selection; Fisher-Yates for distractors |
| **Modify** | `src/games/counting/CountingItemsGame.tsx` | Queue-based target selection; Fisher-Yates for options |
| **Modify** | `src/games/assembly/AssemblyGame.tsx` | Queue-based word selection; remove local `shuffleItems` (reuse from utils) |

---

### Task 1: Extract Fisher-Yates shuffle utility

**Files:**
- Create: `src/shared/utils.ts`

- [ ] **Step 1: Create the utility file**

```typescript
export function fisherYatesShuffle<T>(items: T[]): T[] {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
cd /home/skclaw/teo-learn && npm run lint 2>&1 | head -30
```

Expected: no errors mentioning `utils.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/shared/utils.ts
git commit -m "feat: add fisherYatesShuffle utility to shared/utils"
```

---

### Task 2: Update FindItGame — queue-based target selection + Fisher-Yates distractors

**Files:**
- Modify: `src/shared/components/FindItGame.tsx`

**Key changes:**
- Remove the `prevTarget` / `currentItem` arg from `createRoundState` — it no longer needs to filter by previous item.
- `createRoundState` now accepts the target directly (already dequeued externally).
- Add a `queueRef: T[]` to the component.
- Initialize `queueRef` on first render and whenever `descriptor.getItems()` changes pool identity.
- Dequeue from `queueRef` each round; refill with a fresh shuffle when empty.

- [ ] **Step 1: Import the new utility and rewrite `createRoundState`**

Replace the old `createRoundState` function (lines 41–63 in the original) with:

```typescript
import { fisherYatesShuffle } from '../utils';

function buildGrid<T>(descriptor: GameDescriptor<T>, target: T): RoundState<T> {
  const pool = descriptor.getItems();
  const effectiveGridSize = Math.min(descriptor.gridSize, pool.length);
  const others = fisherYatesShuffle(
    pool.filter(item => descriptor.getItemId(item) !== descriptor.getItemId(target))
  ).slice(0, effectiveGridSize - 1);
  return {
    targetItem: target,
    gridItems: fisherYatesShuffle([...others, target]),
  };
}
```

- [ ] **Step 2: Add queue ref and initialization**

Inside `FindItGame`, replace:

```typescript
const [roundState, setRoundState] = useState<RoundState<T>>(() => createRoundState(descriptor));
```

with:

```typescript
const queueRef = useRef<T[]>([]);

function dequeueTarget(): T {
  const pool = descriptor.getItems();
  if (queueRef.current.length === 0) {
    queueRef.current = fisherYatesShuffle(pool);
  }
  return queueRef.current.shift()!;
}

const [roundState, setRoundState] = useState<RoundState<T>>(() => {
  queueRef.current = fisherYatesShuffle(descriptor.getItems());
  const target = queueRef.current.shift()!;
  return buildGrid(descriptor, target);
});
```

- [ ] **Step 3: Update `startNewRound` to use the queue**

Replace:

```typescript
const startNewRound = useCallback(() => {
  setRoundState(createRoundState(descriptor, targetItemRef.current));
  ...
}, [descriptor]);
```

with:

```typescript
const startNewRound = useCallback(() => {
  const target = dequeueTarget();
  setRoundState(buildGrid(descriptor, target));
  setFeedback({});
  setShowSuccess(false);
  setShowFailure(false);
  setWrongAttemptsThisRound(0);
  pendingSuccessRef.current = false;
}, [descriptor]);
```

Note: `dequeueTarget` reads `queueRef` and `descriptor` from closure; `dequeueTarget` itself should be defined outside `useCallback` or inlined. The simplest approach: inline the dequeue logic directly in `startNewRound`:

```typescript
const startNewRound = useCallback(() => {
  const pool = descriptor.getItems();
  if (queueRef.current.length === 0) {
    queueRef.current = fisherYatesShuffle(pool);
  }
  const target = queueRef.current.shift()!;
  setRoundState(buildGrid(descriptor, target));
  setFeedback({});
  setShowSuccess(false);
  setShowFailure(false);
  setWrongAttemptsThisRound(0);
  pendingSuccessRef.current = false;
}, [descriptor]);
```

- [ ] **Step 4: Remove `targetItemRef` (was only used to pass previous target to `createRoundState`)**

Delete these lines (they are no longer needed):

```typescript
const targetItemRef = useRef<T | null>(null);
// ...
useEffect(() => { targetItemRef.current = targetItem; }, [targetItem]);
```

Verify `targetItemRef` is not referenced anywhere else in the file. If it is used elsewhere, keep it but remove the `createRoundState` usage.

- [ ] **Step 5: Verify the app compiles and plays correctly**

```bash
cd /home/skclaw/teo-learn && npm run lint 2>&1 | head -30
```

Expected: no type errors.

Start dev server and manually play the Alphabet game for 6+ rounds — confirm no target repeats within the first ~30 letters.

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/FindItGame.tsx
git commit -m "feat: use shuffled queue for target selection in FindItGame"
```

---

### Task 3: Update CountingItemsGame — queue-based target selection + Fisher-Yates options

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

**Key changes:**
- Add `queueRef` initialized from `availableItems`.
- Re-initialize queue when `availableItems` changes (range/locale change mid-session).
- Replace `sort(() => 0.5 - Math.random())` in option shuffle with `fisherYatesShuffle`.

- [ ] **Step 1: Import Fisher-Yates and add queue ref**

Add import at top of file:

```typescript
import { fisherYatesShuffle } from '../../shared/utils';
```

Add inside `CountingItemsGame` component, before `startNewRound`:

```typescript
const queueRef = useRef<NumberItem[]>([]);

useEffect(() => {
  queueRef.current = [];
}, [availableItems]);
```

The effect resets the queue whenever the pool changes (e.g., user changes range in settings), so the next round re-shuffles from the new pool.

- [ ] **Step 2: Update `startNewRound` to use the queue**

Replace lines 82–83 in the original:

```typescript
const startNewRound = useCallback(() => {
  if (availableItems.length === 0) return;
  const target = availableItems[Math.floor(Math.random() * availableItems.length)];
```

with:

```typescript
const startNewRound = useCallback(() => {
  if (availableItems.length === 0) return;
  if (queueRef.current.length === 0) {
    queueRef.current = fisherYatesShuffle(availableItems);
  }
  const target = queueRef.current.shift()!;
```

- [ ] **Step 3: Fix the biased sort for options**

Replace lines 88–91 in the original:

```typescript
const others = allNumbers.filter(n => n.value !== target.value)
  .sort(() => 0.5 - Math.random())
  .slice(0, 3);
const options = [...others, target].sort(() => 0.5 - Math.random());
```

with:

```typescript
const others = fisherYatesShuffle(
  allNumbers.filter(n => n.value !== target.value)
).slice(0, 3);
const options = fisherYatesShuffle([...others, target]);
```

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint 2>&1 | head -30
```

Expected: no type errors.

Play counting game — confirm numbers in a session don't repeat until the full range has been cycled.

- [ ] **Step 5: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx
git commit -m "feat: use shuffled queue for target selection in CountingItemsGame"
```

---

### Task 4: Update AssemblyGame — queue-based word selection + reuse shared shuffle

**Files:**
- Modify: `src/games/assembly/AssemblyGame.tsx`

**Key changes:**
- Remove local `shuffleItems` function (it is identical to `fisherYatesShuffle`).
- Add `queueRef` for word selection, replacing `pickNextWord` / `previousWordKeyRef`.
- Re-initialize queue when `eligibleWords` changes.

- [ ] **Step 1: Import Fisher-Yates and remove local shuffleItems**

Add import:

```typescript
import { fisherYatesShuffle } from '../../shared/utils';
```

Delete the local `shuffleItems` function (lines 63–70 in the original):

```typescript
// DELETE THIS:
function shuffleItems<T>(items: T[]) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}
```

Replace the one call site of `shuffleItems` in `createTiles` (line ~216):

```typescript
// OLD:
const createTiles = useCallback((syllables: string[]) => (
  shuffleItems(syllables).map((text, trayIndex) => ({
```

```typescript
// NEW:
const createTiles = useCallback((syllables: string[]) => (
  fisherYatesShuffle(syllables).map((text, trayIndex) => ({
```

- [ ] **Step 2: Add word queue ref and reset effect**

Add queue ref after `eligibleWords` memo:

```typescript
const wordQueueRef = useRef<Word[]>([]);

useEffect(() => {
  wordQueueRef.current = [];
}, [eligibleWords]);
```

- [ ] **Step 3: Replace `pickNextWord` usage with queue dequeue**

Delete the standalone `pickNextWord` function (lines 109–115 in the original):

```typescript
// DELETE THIS:
function pickNextWord(eligibleWords: Word[], previousWordKey: string | null) {
  const candidates =
    eligibleWords.length > 1
      ? eligibleWords.filter(word => word.audioKey !== previousWordKey)
      : eligibleWords;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
```

Delete `previousWordKeyRef` declaration and all its assignment sites:

```typescript
// DELETE:
const previousWordKeyRef = useRef<string | null>(null);
// DELETE all: previousWordKeyRef.current = nextWord.audioKey;
```

In `prepareRound`, replace:

```typescript
const word = pickNextWord(eligibleWords, previousWordKeyRef.current);
```

with:

```typescript
if (wordQueueRef.current.length === 0) {
  wordQueueRef.current = fisherYatesShuffle(eligibleWords);
}
const word = wordQueueRef.current.shift()!;
```

- [ ] **Step 4: Verify**

```bash
cd /home/skclaw/teo-learn && npm run lint 2>&1 | head -30
```

Expected: no type errors. Check that `previousWordKeyRef` is fully removed — search for all remaining usages:

```bash
grep -n "previousWordKeyRef" /home/skclaw/teo-learn/src/games/assembly/AssemblyGame.tsx
```

Expected: no output.

Play assembly game — confirm words don't repeat within one pool cycle (~10+ words depending on syllable filter).

- [ ] **Step 5: Commit**

```bash
git add src/games/assembly/AssemblyGame.tsx
git commit -m "feat: use shuffled queue for word selection in AssemblyGame; reuse shared shuffle"
```

---

### Task 5: Final verification

- [ ] **Step 1: Run lint on entire project**

```bash
cd /home/skclaw/teo-learn && npm run lint 2>&1
```

Expected: no errors.

- [ ] **Step 2: Verify no remaining biased sort() shuffles**

```bash
grep -rn "sort(() => 0.5 - Math.random\|sort(() => Math.random" /home/skclaw/teo-learn/src/
```

Expected: no output (all replaced with `fisherYatesShuffle`).

- [ ] **Step 3: Verify no remaining pickNextWord or shuffleItems**

```bash
grep -rn "pickNextWord\|shuffleItems" /home/skclaw/teo-learn/src/
```

Expected: no output.
