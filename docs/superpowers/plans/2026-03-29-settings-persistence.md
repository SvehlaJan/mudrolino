# Settings Persistence (H1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist `GameSettings` (music toggle, numbers range, counting range) to `localStorage` so settings survive page reloads.

**Architecture:** A new `settingsService.ts` module provides `loadSettings()` (reads + merges with defaults) and `saveSettings()` (writes, silent fail). `App.tsx` uses `loadSettings` as a lazy `useState` initializer and calls `saveSettings` in the existing `useEffect` that already fires on every settings change.

**Tech Stack:** React 19, TypeScript, Vite
**Verification:** No test framework — use `npm run lint` (TypeScript type check) after each task, and `npm run dev` for final browser smoke test.

**Spec:** `docs/superpowers/specs/2026-03-29-settings-persistence-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/shared/services/settingsService.ts` | `loadSettings` + `saveSettings` + `DEFAULT_SETTINGS` |
| Modify | `src/App.tsx:59` | Replace inline default object with `loadSettings` lazy initializer |
| Modify | `src/App.tsx:72-74` | Add `saveSettings(settings)` to existing `useEffect` |

---

## Task 1: Create settingsService.ts

**Files:**
- Create: `src/shared/services/settingsService.ts`

- [ ] **Step 1: Create the file with the full implementation**

```ts
import { GameSettings } from '../types';

const STORAGE_KEY = 'hrave-ucenie-settings';

export const DEFAULT_SETTINGS: GameSettings = {
  music: false,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
};

function isValidRange(value: unknown): value is { start: number; end: number } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).start === 'number' &&
    typeof (value as Record<string, unknown>).end === 'number'
  );
}

export function loadSettings(): GameSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const stored = JSON.parse(raw) as Record<string, unknown>;
    return {
      music: typeof stored.music === 'boolean' ? stored.music : DEFAULT_SETTINGS.music,
      numbersRange: isValidRange(stored.numbersRange) ? stored.numbersRange : DEFAULT_SETTINGS.numbersRange,
      countingRange: isValidRange(stored.countingRange) ? stored.countingRange : DEFAULT_SETTINGS.countingRange,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: GameSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Silent fail: private/incognito mode or storage quota exceeded
  }
}
```

- [ ] **Step 2: Lint**

```bash
cd /Users/svehla/playground/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/shared/services/settingsService.ts
git commit -m "feat: add settingsService with loadSettings and saveSettings (H1)"
```

---

## Task 2: Wire settingsService into App.tsx

**Files:**
- Modify: `src/App.tsx`

Current state of relevant lines in `App.tsx`:

```ts
// Line 16 area — imports
import { audioManager } from './shared/services/audioManager';

// Line 59 — useState with inline defaults
const [settings, setSettings] = useState<GameSettings>({
  music: false,
  numbersRange: {
    start: 1,
    end: 10,
  },
  countingRange: {
    start: 1,
    end: 5,
  },
});

// Lines 72-74 — existing useEffect
useEffect(() => {
  audioManager.updateSettings(settings);
}, [settings]);
```

- [ ] **Step 1: Add import for settingsService**

After the `audioManager` import line, add:

```ts
import { loadSettings, saveSettings } from './shared/services/settingsService';
```

- [ ] **Step 2: Replace the useState initializer with lazy loadSettings**

Replace:

```ts
const [settings, setSettings] = useState<GameSettings>({
  music: false,
  numbersRange: {
    start: 1,
    end: 10,
  },
  countingRange: {
    start: 1,
    end: 5,
  },
});
```

With:

```ts
const [settings, setSettings] = useState<GameSettings>(loadSettings);
```

- [ ] **Step 3: Add saveSettings to the existing useEffect**

Replace:

```ts
useEffect(() => {
  audioManager.updateSettings(settings);
}, [settings]);
```

With:

```ts
useEffect(() => {
  audioManager.updateSettings(settings);
  saveSettings(settings);
}, [settings]);
```

- [ ] **Step 4: Lint**

```bash
cd /Users/svehla/playground/teo-learn && npm run lint
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: persist GameSettings to localStorage via settingsService (H1)"
```

---

## Final: Browser smoke test

- [ ] **Step 1: Run dev server**

```bash
cd /Users/svehla/playground/teo-learn && npm run dev
```

- [ ] **Step 2: Verify persistence** — Open Settings (hold the gear icon 3 s). Change the numbers range to 1–20. Close settings. Hard-reload the page (`Cmd+Shift+R`). Re-open Settings — numbers range should still show 1–20.

- [ ] **Step 3: Verify music toggle persists** — Enable "Hudba", reload, re-open Settings — toggle should still be on.

- [ ] **Step 4: Verify defaults on first load** — Open DevTools → Application → Local Storage. Delete the `hrave-ucenie-settings` key. Reload — settings should be back to defaults (1–10, music off).
