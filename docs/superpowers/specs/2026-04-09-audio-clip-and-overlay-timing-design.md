# Design: AudioClip, Per-Clip TTS Fallback, Overlay Timing, and Stop on Navigation

## Context

Three related audio UX problems need to be solved together:

1. **Coarse TTS fallback**: `AudioSpec` holds one `fallbackText` for the whole clip sequence. If clip 2 of 3 fails, TTS speaks the entire fallback text — re-reading what was already played.
2. **Overlay dismisses before audio finishes**: `SuccessOverlay` and `FailureOverlay` use a fixed `setTimeout` to dismiss. Long audio sequences outlast the timer, so the overlay disappears mid-playback.
3. **Audio continues after navigation**: Starting a game triggers auto-play; tapping back doesn't stop it.

## Types (`src/shared/types.ts`)

### `AudioClip` (new)

```ts
export interface AudioClip {
  /** Path relative to /audio/, without .mp3 — e.g. "phrases/najdi-pismeno", "letters/a" */
  path: string;
  /** Spoken by TTS if this specific file fails to load or play. */
  fallbackText: string;
}
```

### `AudioSpec` (updated)

```ts
export interface AudioSpec {
  clips: AudioClip[];
  // Extendable: add global fields here (volume, rate, etc.) without touching call sites
}
```

`AudioSpec.sequence: string[]` and `AudioSpec.fallbackText: string` are removed. All descriptor methods that returned the old shape now return the new `AudioSpec`.

`FailureSpec.audioSpec: AudioSpec` keeps its name; its type becomes the new `AudioSpec`.

## `AudioManager` (`src/shared/services/audioManager.ts`)

### `play(spec: AudioSpec): Promise<void>`

- Returns a `Promise` that resolves when the full sequence completes (all clips played or TTS-substituted).
- Per-clip fallback: if a file fails, call `speak(clip.fallbackText)` (await TTS), then continue to the next clip.
- Signature change: was `void`, now `Promise<void>`. Callers that don't need the promise can ignore it.

### `stop()` (new public method, replaces private `stopCurrent()`)

- Cancels any in-progress `HTMLAudioElement` playback and calls `synth.cancel()`.
- Called by `FindItGame` on unmount and by overlays on manual dismiss.

### `playPraise(entry?: PraiseEntry): Promise<void>`

- Same as above — returns `Promise<void>` so `SuccessOverlay` can await it.

## Overlay Timing

Both overlays use the same pattern:

```ts
useEffect(() => {
  if (!show) return;
  let cancelled = false;
  const minTimer = new Promise<void>(resolve =>
    setTimeout(resolve, MIN_DISPLAY_MS)
  );
  const audio = audioManager.play(spec.audioSpec); // or playPraise for success
  Promise.all([minTimer, audio]).then(() => {
    if (!cancelled) onComplete();
  });
  return () => { cancelled = true; audioManager.stop(); };
}, [show]);
```

- `MIN_DISPLAY_MS`: `TIMING.SUCCESS_OVERLAY_DURATION_MS` (3000ms) for `SuccessOverlay`; existing `FAILURE_DURATION_MS` (2500ms) for `FailureOverlay`. Both are already defined constants — no change needed.
- Manual dismiss (tap overlay / tap pause-then-close): call `audioManager.stop()` then `onComplete()` immediately, same as today.
- The cleanup function sets `cancelled = true` and calls `audioManager.stop()` — guards against stale callbacks if the overlay hides before the promise resolves.

## Stop on Navigation (`src/shared/components/FindItGame.tsx`)

```ts
useEffect(() => {
  return () => audioManager.stop();
}, []);
```

A single mount/unmount effect. When `FindItGame` unmounts (user taps back), audio is stopped immediately.

## Call-Site Migration

All descriptors (`alphabetDescriptor`, `syllablesDescriptor`, `numbersDescriptor`, `wordsDescriptor`) and `countingDescriptor` must update their `AudioSpec` return values from:

```ts
{ sequence: ['phrases/foo', 'letters/a'], fallbackText: 'Foo A' }
```

to:

```ts
{ clips: [
    { path: 'phrases/foo', fallbackText: 'Foo' },
    { path: 'letters/a',   fallbackText: 'A'   },
] }
```

`fallbackText` per clip should be the minimal spoken equivalent of that single clip (the phrase text or the symbol/word).

## Files to Modify

- `src/shared/types.ts` — `AudioClip`, updated `AudioSpec`
- `src/shared/services/audioManager.ts` — per-clip fallback, `stop()`, `Promise<void>` returns
- `src/shared/components/SuccessOverlay.tsx` — await audio + min timer
- `src/shared/components/FailureOverlay.tsx` — await audio + min timer
- `src/shared/components/FindItGame.tsx` — `audioManager.stop()` on unmount
- `src/games/alphabet/alphabetDescriptor.tsx` — migrate `AudioSpec` call sites
- `src/games/syllables/syllablesDescriptor.tsx` — migrate `AudioSpec` call sites
- `src/games/numbers/numbersDescriptor.tsx` — migrate `AudioSpec` call sites
- `src/games/words/wordsDescriptor.tsx` — migrate `AudioSpec` call sites
- `src/games/counting/CountingItemsGame.tsx` — migrate 3 inline `audioManager.play()` call sites

## Verification

1. `npm run lint` — no type errors
2. Words game: remove one audio file, start a round — only that clip's `fallbackText` is spoken, playback continues with next clip
3. Success overlay: add a long audio sequence — overlay stays visible until audio finishes (minimum 3s)
4. Failure overlay: same check with 2.5s minimum
5. Start a game, trigger auto-play, tap back immediately — audio stops
6. All other games: verify behavior unchanged
