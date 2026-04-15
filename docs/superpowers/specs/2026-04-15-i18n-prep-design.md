# i18n Preparation — Design Spec

**Date:** 2026-04-15
**Status:** Approved
**Must land before:** audio-overrides

## Overview

Prepare the codebase and storage layer for multiple locales before building locale-sensitive features (e.g. audio overrides). No locale-switching UI is in scope. The goal is that locale is a first-class concept in types, content, audio paths, and storage keys — so adding Czech (MVP) and later English, French, German, Spanish, Italian, etc. requires no structural migration.

**Planned locales:** `sk` (current), `cs` (MVP), `en`, `fr`, `de`, `es`, `it` and other major European languages later.

---

## 1. AppSettings

**File:** `src/shared/services/appSettingsStore.ts`

```ts
interface AppSettings {
  locale: string; // BCP 47: 'sk' | 'cs' | 'en' | 'fr' | ...
}

const DEFAULT_APP_SETTINGS: AppSettings = { locale: 'sk' };
```

- Persisted to localStorage under a separate key (`appSettings`), independent of `GameSettings`
- Thin localStorage wrapper — exports a singleton `appSettingsStore` with `get()` and `set(settings)`
- `App.tsx` reads this at startup and holds `appSettings` as top-level state, alongside the existing `gameSettings`
- For MVP, only `sk` and `cs` are populated with content — the locale value is the single source of truth for all locale-dependent behaviour

---

## 2. Content Registry Refactor

### Type rename

`SlovakNumber` → `NumberItem` in `src/shared/types.ts` and all callsites (4 files: `types.ts`, `contentRegistry.ts`, `numbersDescriptor.tsx`, `CountingItemsGame.tsx`). The type itself is language-agnostic — `{ value: number, audioKey: string }`.

### New type in `src/shared/types.ts`

```ts
interface LocaleContent {
  letterItems: Letter[];
  wordItems: Word[];
  syllableItems: Syllable[];
  numberItems: NumberItem[];
  audioPhrases: typeof AUDIO_PHRASES;
  praiseEntries: PraiseEntry[];
}
```

### Locale data files

- `src/shared/locales/sk.ts` — current Slovak content (extracted from `contentRegistry.ts`)
- `src/shared/locales/cs.ts` — Czech content (stubbed for now, populated in a later task)

### contentRegistry.ts

Exports a single lookup function:

```ts
export function getLocaleContent(locale: string): LocaleContent
```

A `Record<string, LocaleContent>` map inside the file holds all registered locales. Unknown locales fall back to `sk`.

**Unchanged exports:** `TIMING`, `COLORS`, `BG_COLORS`, `COUNTING_EMOJIS` — not locale-specific, stay as flat exports.

### Callsites

All game descriptors and `FindItGame` that currently import `LETTER_ITEMS`, `WORD_ITEMS`, etc. switch to calling `getLocaleContent(locale)` with the active locale passed down from `App.tsx`.

---

## 3. Audio Path and File Restructure

### File move

All existing audio files gain a `sk/` prefix:

```
public/audio/letters/a.mp3        →  public/audio/sk/letters/a.mp3
public/audio/words/jahoda.mp3     →  public/audio/sk/words/jahoda.mp3
public/audio/phrases/nevadi.mp3   →  public/audio/sk/phrases/nevadi.mp3
public/audio/praise/vyborne.mp3   →  public/audio/sk/praise/vyborne.mp3
public/audio/numbers/1.mp3        →  public/audio/sk/numbers/1.mp3
public/audio/music/background.mp3 →  public/audio/music/background.mp3  (not locale-specific, stays)
```

~200 files total, moved in one pass.

### AudioClip.path format

`AudioClip.path` values change from `letters/a` to `${locale}/letters/a`. The locale prefix is baked in by the content registry when building clips — `audioManager` stays locale-unaware and plays whatever path it receives.

```ts
// Before
{ path: 'letters/a', fallbackText: 'A' }

// After (built by contentRegistry with active locale)
{ path: 'sk/letters/a', fallbackText: 'A' }
```

### audioManager

No structural changes — it continues to construct `/audio/${clip.path}.mp3`. The locale is already encoded in `clip.path`.

### audioOverrideStore keys

Storage keys mirror `clip.path` exactly, so they are automatically locale-prefixed (`sk/letters/a`). No extra work needed — this falls out of the path format change for free.

---

## Out of Scope

- Locale-switching UI (planned, not now)
- Czech content population (structure only for `cs` locale — content in a later task)
- UI string translation (labels, button text, game instructions) — a separate i18n concern, not covered here
- Right-to-left layout support
