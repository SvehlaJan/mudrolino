# Audio Overrides — Design Spec

**Date:** 2026-04-15
**Status:** Approved

**Prerequisite:** `2026-04-15-i18n-prep-design.md` must land first — audio override storage keys are locale-prefixed (`sk/letters/a`), which requires the audio path restructure to be in place.

## Overview

Allow parents to record their own voice clips that override the default audio files for any audio key in the app. Recordings are stored locally in the browser (IndexedDB) for MVP, with a clean abstraction layer that enables migration to Firebase or another backend later.

Overrides are **locale-scoped** — a custom recording for `sk/letters/a` does not affect `cs/letters/a`. This falls out of the i18n path format for free.

---

## 1. Storage Layer

**File:** `src/shared/services/audioOverrideStore.ts`

### Interface

```ts
interface AudioOverrideStore {
  get(key: string): Promise<Blob | null>;
  set(key: string, blob: Blob): Promise<void>;
  delete(key: string): Promise<void>;
  listKeys(): Promise<string[]>;
}
```

- Keys match `AudioClip.path` exactly — which, after the i18n prep, is always locale-prefixed (e.g. `sk/letters/a`, `sk/words/jahoda`, `sk/phrases/najdi-pismenko`)
- Locale scoping is free: different locales use different keys, no extra logic needed
- No translation layer needed anywhere in the app
- `IndexedDBOverrideStore` is the concrete MVP implementation — one IndexedDB object store named `audio-overrides`, keyed by path string, value is a raw `Blob`
- The file exports a singleton `audioOverrideStore` of type `AudioOverrideStore`
- **Firebase migration path:** implement `FirebaseOverrideStore` satisfying the same interface and swap the singleton — nothing else changes

---

## 2. AudioManager Integration

**File:** `src/shared/services/audioManager.ts` — one change to `playClipsAsync`

Before constructing the `/audio/` URL, check the override store:

```ts
private async playClipsAsync(clips: AudioClip[]): Promise<void> {
  this.stop();
  const playbackToken = this.playbackToken;
  for (const clip of clips) {
    // clip.path is locale-prefixed by the content registry, e.g. 'sk/letters/a'
    // The override store key and the /audio/ URL both use this same path.
    const override = await audioOverrideStore.get(clip.path);
    const url = override
      ? URL.createObjectURL(override)
      : `/audio/${clip.path}.mp3`;
    try {
      await this.playSingleClip(url, playbackToken);
    } catch {
      if (playbackToken !== this.playbackToken) return;
      await this.speakAsync(clip.fallbackText);
    } finally {
      if (override) URL.revokeObjectURL(url);
    }
  }
}
```

`audioManager` remains locale-unaware — locale is already encoded in `clip.path` by the content registry. TTS fallback still applies if the override blob fails to play. The rest of `AudioManager` is untouched.

---

## 3. Recording Pipeline

**File:** `src/shared/hooks/useRecorder.ts`

### Hook API

```ts
const { state, level, start, stop } = useRecorder();
// state: 'idle' | 'recording' | 'processing'
// level: 0–1 float for live VU meter
```

### Flow

1. `start()` opens `getUserMedia({ audio: true })`, creates a `MediaRecorder` + `AnalyserNode` on the same stream
2. `AnalyserNode` polls RMS amplitude ~10×/sec to detect silence
3. Auto-stop triggers after **0.8s of continuous silence** (matching the existing Python script default)
4. On stop, raw PCM samples are extracted from the `AudioBuffer`, silence is trimmed from both ends using a **−35 dB amplitude threshold** (matching the Python script), then encoded to MP3 via `lamejs`
5. Returns a `Blob` of type `audio/mpeg`

The hook is storage-agnostic — it returns a `Blob`. The calling component decides what to do with it (save, auto-advance, etc.).

---

## 4. UI Structure

### Entry point

A "Vlastné nahrávky" button added to the existing `SettingsOverlay` (Rodičovská zóna), styled consistently with the other settings sections.

### Route

`/recordings` — added to the router in `App.tsx` alongside the existing game routes. Navigation from settings uses `useNavigate`. The back button returns to the previous screen.

The recording sub-screen (per-item view) is **not a separate route** — it is local component state within `/recordings` (a slide-in panel). This keeps the routing simple and consistent with how overlays work elsewhere in the app.

### AudioRecordingScreen — list view

```
┌─────────────────────────────┐
│ ← Späť    Vlastné nahrávky  │
├─────────────────────────────┤
│ [🔍 Hľadať...             ] │
│ [Letters][Words][Syllables] │  scrollable category tabs
│ [Numbers][Phrases][Praise ] │
├─────────────────────────────┤
│  A  🎤                     │  item with custom recording
│  Á                          │  item without recording
│  B  🎤                     │  item with custom recording
│  ...                        │
└─────────────────────────────┘
```

- Category tabs scroll horizontally: Letters, Words, Syllables, Numbers, Phrases, Praise
- The item list is populated by `getLocaleContent(locale)` for the active locale — the screen only shows and records content for the current locale
- When search is active, tabs are hidden and results span all categories. When search is cleared, tabs reappear.
- Items with a custom recording show a mic badge indicator (checked against `audioOverrideStore.listKeys()` on mount and after each save/delete)

### AudioRecordingScreen — recording sub-screen

Slides in over the list when an item is tapped.

```
┌─────────────────────────────┐
│ ← Späť         A / Auto    │
├─────────────────────────────┤
│                             │
│        [ ████░░░░ ]        │  live VU meter
│                             │
│      ⏺ Nahrať / ⏹ Stop    │  single button, state-driven
│                             │
│   [ Auto-pokračovať: ON ]   │  batch mode toggle
│                             │
│      🗑 Zmazať nahrávku     │  shown only if override exists
└─────────────────────────────┘
```

---

## 5. Auto-Advance Batch Mode

### Two modes (toggled per-session, not persisted)

| Mode | Behaviour |
|------|-----------|
| **Single** (default) | Record one item, save, stay on sub-screen. Parent advances manually. |
| **Batch** | After each auto-stop + save, advance to next item in current list and auto-start after a 1s countdown. |

### Batch mode details

- The 1s pre-recording pause shows a draining progress bar so the parent can prepare
- Tapping anywhere during the countdown cancels it and drops back to single mode
- Reaching the last item in the current list stops batch mode and shows a completion message
- If `getUserMedia` permission is revoked mid-session, batch mode stops gracefully with an error message
- The "current list" respects the active category tab + search filter — batch mode only advances within the visible items

### Why auto-stop is required

Without auto-stop (0.8s silence threshold), the parent must tap Stop before each advance in batch mode, defeating the purpose. Auto-stop is what makes the batch flow equivalent to the Python script workflow.

---

## Dependencies

| Package | Purpose | Size |
|---------|---------|------|
| `lamejs` | MP3 encoding in the browser | ~200 KB |

No backend required for MVP. `lamejs` is the only new dependency.

---

## Out of Scope (MVP)

- Cross-device sync (requires backend/Firebase)
- Export/import of recording sets
- Per-item playback preview in the list view (re-record overwrites)
- Configurable silence threshold (fixed at 0.8s / −35 dB)
