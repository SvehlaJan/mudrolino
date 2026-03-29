# Design: Settings Persistence (H1)

**Date:** 2026-03-29
**Status:** Approved

## Overview

`GameSettings` (music toggle, numbers range, counting range) currently resets to defaults on every page reload. This design adds `localStorage` persistence via a small service module, with merge-with-defaults behaviour for stale or partially-valid stored data.

---

## Architecture

A new `settingsService.ts` module owns all localStorage I/O. `App.tsx` calls it at init (lazy `useState` initializer) and on every settings change (existing `useEffect`).

**Storage key:** `hrave-ucenie-settings`

**Two functions:**

### `loadSettings(): GameSettings`

Reads `hrave-ucenie-settings` from `localStorage`. If the key is absent or `JSON.parse` throws, returns `DEFAULT_SETTINGS`. Otherwise merges stored data with defaults field-by-field:

- `music` — kept if `typeof stored.music === 'boolean'`, else default
- `numbersRange` — kept if `stored.numbersRange` is an object with numeric `start` and `end`, else default
- `countingRange` — same validation as `numbersRange`

This ensures any missing or wrong-type field falls back gracefully without discarding valid saved values.

### `saveSettings(settings: GameSettings): void`

Writes `JSON.stringify(settings)` to the same key. Wrapped in `try/catch` — silent fail covers private/incognito mode and storage-quota errors.

---

## Changes

| Action | File | Change |
|--------|------|--------|
| Create | `src/shared/services/settingsService.ts` | `loadSettings` + `saveSettings` + `DEFAULT_SETTINGS` |
| Modify | `src/App.tsx` | `useState(loadSettings)` lazy init; `saveSettings(settings)` in existing `useEffect` |

No other files change.

---

## Default values

```ts
const DEFAULT_SETTINGS: GameSettings = {
  music: false,
  numbersRange: { start: 1, end: 10 },
  countingRange: { start: 1, end: 5 },
};
```

These match the current hardcoded defaults in `App.tsx`.

---

## Error handling

| Scenario | Behaviour |
|----------|-----------|
| No stored data | Returns `DEFAULT_SETTINGS` |
| Corrupt JSON | `JSON.parse` throws → caught → returns `DEFAULT_SETTINGS` |
| Field missing or wrong type | Per-field fallback to default value |
| `localStorage.setItem` throws (quota / incognito) | Caught, silently ignored |

---

## Out of scope

- Migration versioning (no version field needed at this stage; merge-with-defaults handles all current cases)
- Syncing settings across tabs
- Persisting any state other than `GameSettings`
