# Immediate Answer Audio Design

## Summary

Builds directly on the just-shipped unified answer audio (docs/superpowers/specs/2026-07-09-unified-answer-audio-design.md). That work made every wrong tap read `<item>. Skús to znova.` immediately, and every correct tap eventually read `<item>. <random praise>` once the success overlay mounted (~500ms after the tap). This design closes the remaining asymmetry: a correct tap should announce the tapped item **immediately**, exactly as a wrong tap already does, decoupled from the overlay. The overlay's own job narrows to "praise, then optional bonus content" (the whole word, for games where the tapped item is part of one). Assembly — excluded from the prior task — is brought into this pattern too.

## Current State (recap, post prior task)

- Wrong tap: `audioManager.play(getWrongAnswerAudio(...))` fires synchronously in the tap handler. Already "immediate." No change needed.
- Correct tap (alphabet/syllables/numbers/words via `FindItGame`, counting, first-letter, complete-syllable, complete-letter): no audio plays at tap time. `finishRound`/equivalent schedules `showSuccess = true` after `TIMING.SUCCESS_SHOW_DELAY_MS` (500ms). Once `SuccessOverlay` mounts, its own effect calls `audioManager.play(getSuccessOverlayAudioSpec(...))`, which plays `[...itemClips, praiseClip]` (item first, then praise — from the prior task).
- Complete-letter's **intermediate** correct taps (2-letter rounds, not the final blank) currently play no audio at all.
- Assembly: already immediately plays the tapped tray tile's syllable sound via `shouldPlaySelectedSyllableAudio` (suppressed only when the tap is the last tile *and* completes a wrong arrangement — a deliberate, sensible choice, not a bug). Its wrong-audio is `[selectedSyllable?, retry(hardcoded path), fullWordAudio]`. Its success audio is `[wholeWordAudio, fixed-"vyborne"-praise]` (already flows through the shared `getSuccessOverlayAudioSpec`, so it already got reordered to word-then-praise by the prior task).

## New Architecture

**Immediate item announcement (new, universal):** every correct tap plays the tapped item's own sound synchronously in the tap handler — the same instant a wrong tap already does. New shared helper in `contentRegistry.ts`:

```ts
export function getItemAnnouncementAudio(
  locale: string,
  category: AnswerAudioCategory,
  audioKey: string,
  fallbackText: string,
): AudioSpec {
  return { clips: [getItemAudioClip(locale, category, audioKey, fallbackText)] };
}
```

**Success overlay reorders again, for a principled reason:** `spec.audioSpec.clips` used to mean "confirm what was tapped" (rightly played before praise). Now that the tap itself announces immediately, `spec.audioSpec.clips` means "optional bonus content" (rightly played after praise, as a reveal). `getSuccessOverlayAudioSpec` flips from `[...content, praise]` back to `[praise, ...content]`.

**Optional content is data-driven, not universal:** only games where the tapped item is part of a larger `Word` with its own audio get optional content (the whole word). Alphabet, numbers, counting, and words do not — their `getSuccessSpec`/success spec gets an empty/absent `audioSpec` (no bonus content, since the item itself has nothing bigger to reveal, or — for the words game — the item already *is* the whole word).

| Game | Immediate announcement (new) | Optional content (success overlay) |
|---|---|---|
| Alphabet | letter | none |
| Syllables | syllable | whole word (`sourceWords`) |
| Numbers | number | none |
| Words | word | none (item already is the word) |
| Counting | number | none |
| First-letter | letter | whole word (`item.word`) |
| Complete-syllable | syllable | whole word (`round.word`) |
| Complete-letter | letter (every blank, including intermediate) | whole word (`round.word`), only on the final blank |
| Assembly | syllable (already existed, migrate to shared helper) | whole word (already existed, just reorders) |

**`GameDescriptor<T>` gains a new required field** (`src/shared/types.ts`) for the 4 `FindItGame`-based games:

```ts
getCorrectAudio: (item: T) => AudioSpec;
```

`FindItGame.tsx`'s `handleCardClick` calls `audioManager.play(descriptor.getCorrectAudio(item))` immediately on a correct tap, before the existing timers/state updates.

**Bespoke games** (counting, first-letter, complete-syllable, complete-letter) get the equivalent `audioManager.play(getItemAnnouncementAudio(...))` call added directly in their own `handleChoice`/`handleOptionClick`, at the point a correct tap is detected — including complete-letter's intermediate-blank branch, which currently has no audio at all.

**Removing now-redundant `.stop()` calls:** complete-syllable and complete-letter each call `audioManager.stop()` immediately before `setSuccessSpec(...)` on a correct tap (to cut off any lingering prompt audio). Since the new immediate `audioManager.play(...)` call already stops any prior playback as its first action (confirmed in `audioManager.ts`), these explicit `.stop()` calls become redundant once the immediate play call is added at the same point, and should be removed rather than left to fire redundantly before the new play call.

## Assembly Integration

- Tile-tap immediate audio: replace the inline `{ clips: [{ path: ..., fallbackText: ... }] }` construction in `handleTrayTileTap` with `getItemAnnouncementAudio(locale, 'syllables', selectedSyllable.toLowerCase(), selectedSyllable)`. Behavior unchanged, just routed through the shared helper.
- Wrong audio: keep the existing 2-or-3-clip shape (selected syllable if any, retry, full word) — Assembly's failure mode is about *arrangement*, not a single wrong item, so the trailing word-context clip stays. Refactor its internals to use `getPhraseClip(locale, 'retry')` (dropping the hardcoded `phrases/skus-to-znova` path) and `getItemAudioClip` for the syllable/word clips, for consistency. No shape change.
- Success audio: `getSuccessAudio` (word audio) becomes the "optional content" — no code change needed beyond the shared `getSuccessOverlayAudioSpec` reorder, since Assembly already routes through it. Its `praiseEntry: 'vyborne'` (fixed, not random) stays exactly as-is — not something this task touches.

## Known Risk (not a non-goal — a flagged assumption)

The immediate item-audio play and the overlay's own praise+content play are two separate `audioManager.play()` calls, ~500ms apart (longer for Assembly, which already has `BOARD_SETTLE_DELAY_MS` on top). Every `play()` call stops whatever's currently playing. If a single item's audio clip ever runs longer than that gap, the overlay's play call would cut it off mid-word. All existing clips are short (single letters/syllables/numbers or short words), so this is not expected to manifest in practice, but it is a real coupling between clip length and this timing constant that isn't enforced anywhere. No code changes proposed to address this now; flagging it so it isn't rediscovered as a surprise later.

## Non-Goals

- Assembly's fixed (not random) praise entry is unchanged.
- No new audio phrase keys or `.mp3` files.
- The terminal "gave up after `MAX_ATTEMPTS`" failure overlay is still untouched (per the prior task's non-goal, unchanged here).
- No change to which games are grid-based vs. bespoke, or to any pure-logic module (`completeLetterLogic.ts`, `completeSyllableLogic.ts`, `firstLetterLogic.ts`, `assemblyAudioLogic.ts`).

## Testing and Verification

- `contentRegistry.verify.ts` gains assertions for the new `getItemAnnouncementAudio` helper.
- `successOverlayAudio.verify.ts` assertions flip again to expect `[praise, ...content]`.
- Re-run the full e2e suite (`npm run test:e2e`) — asserts on overlay state, not audio, so should be unaffected, but is the fastest regression signal if a state-transition timing change breaks something.
- Manually verify (browser network trace, as done for the prior task) that a correct tap now fires the item's audio request immediately (not after a delay), for at least one game in each bucket (e.g., numbers for "no content," syllables for "whole word content").
- `npm run lint`, `npm run build` as usual.
