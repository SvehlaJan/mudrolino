# Unified Answer Audio Design

## Summary

Every "find it" style game (alphabet, syllables, numbers, words, counting, first-letter, complete-syllable, complete-letter) currently announces a wrong tap as `"Toto je" + <item> + "Skús to znova."` and a correct tap as `<random praise>` optionally followed by `<item>` — inconsistently, since 3 of the 8 games play no item audio at all on success. This design drops `"Toto je"` from every wrong-tap announcement and makes every game read `<item>. Skús to znova.` on a wrong tap and `<item>. <random praise>` on a correct tap, via two new shared helpers instead of hand-editing each game's near-identical audio-building code.

Assembly is excluded from the wrong-tap change (see Non-Goals) since its mechanic doesn't produce a single "selected item" the way every other game does.

## Current State (Audit)

**Wrong-tap audio** — identical 3-clip shape (`thisIs` + item + `retry`) in exactly 8 files, confirmed by grepping every usage of the `thisIs` phrase key in `src/`:

- `src/games/alphabet/alphabetDescriptor.tsx:33-39`
- `src/games/syllables/syllablesDescriptor.tsx:33-39`
- `src/games/numbers/numbersDescriptor.tsx:33-39`
- `src/games/words/wordsDescriptor.tsx:33-39`
- `src/games/counting/CountingItemsGame.tsx:167-173` (inline in `handleOptionClick`)
- `src/games/first-letter/FirstLetterGame.tsx:83-91` (`getWrongAudio`)
- `src/games/complete-syllable/CompleteSyllableGame.tsx:83-91` (`getWrongAudio`)
- `src/games/complete-letter/CompleteLetterGame.tsx:93-101` (`getWrongAudio`)

`src/shared/components/FindItGame.tsx` (the shared engine behind alphabet/syllables/numbers/words) does not define its own wrong-audio — it calls `descriptor.getWrongAudio(targetItem, item)`, so the 4 descriptor files above are the actual definition sites for those 4 games.

`src/games/assembly/AssemblyGame.tsx:87-97` (`getWrongAudio`) does **not** use `thisIs` — it already reads `[selectedSyllable?] + retry + fullWordAudio`, fired once per full-board attempt (not per tile placement), with no `MAX_ATTEMPTS`/failure-overlay concept.

**Correct-tap audio** — every game renders the shared `SuccessOverlay`, whose audio is built by `src/shared/components/successOverlayAudio.ts:getSuccessOverlayAudioSpec`:

```ts
{ clips: [{ path: `${locale}/praise/${praise.audioKey}`, fallbackText: praise.text }, ...(spec.audioSpec?.clips ?? [])] }
```

i.e. praise clip first, then whatever the game's own `getSuccessSpec().audioSpec.clips` contains (if anything). Three games currently provide none (praise-only): `src/games/syllables/syllablesDescriptor.tsx:40-43`, `src/games/numbers/numbersDescriptor.tsx:40`, `src/games/counting/CountingItemsGame.tsx:244-249`. The other six already append their own item's audio after praise: alphabet, words, first-letter, complete-syllable, complete-letter, and assembly (assembly additionally forces a fixed `"vyborne"` praise entry instead of a random one — this is unrelated to clip order and is unaffected by this change).

**Terminal failure audio** (give up after `MAX_ATTEMPTS`) is a separate, third shape (`neverMind [+ itIs] + item`, inconsistent across games) — explicitly out of scope for this change, see Non-Goals.

## Universal Solution

Add two exported helpers to `src/shared/contentRegistry.ts`, alongside the existing `getPhraseClip`:

```ts
export type AnswerAudioCategory = 'letters' | 'syllables' | 'numbers' | 'words';

export function getItemAudioClip(
  locale: string,
  category: AnswerAudioCategory,
  audioKey: string,
  fallbackText: string,
): AudioClip {
  return { path: `${locale}/${category}/${audioKey}`, fallbackText };
}

export function getWrongAnswerAudio(
  locale: string,
  category: AnswerAudioCategory,
  audioKey: string,
  fallbackText: string,
): AudioSpec {
  return {
    clips: [
      getItemAudioClip(locale, category, audioKey, fallbackText),
      getPhraseClip(locale, 'retry'),
    ],
  };
}
```

**Wrong-tap (8 files: every game except assembly):** replace each hand-written 3-clip `getWrongAudio` body with a single call to `getWrongAnswerAudio(locale, category, selected.audioKey, selected.symbol|value|word)`, using the category matching that game's audio folder (`letters` for alphabet/first-letter/complete-letter, `syllables` for syllables/complete-syllable, `numbers` for numbers/counting, `words` for words). This is a pure call-site swap — no change to `AudioSpec`/`AudioClip` shapes, no change to `audioManager.ts`.

**Correct-tap (all 8 games covered by `SuccessOverlay`, including assembly via no change):**

1. Reorder `getSuccessOverlayAudioSpec` in `src/shared/components/successOverlayAudio.ts` to `{ clips: [...(spec.audioSpec?.clips ?? []), praiseClip] }` — item clips first, praise last. This is the one shared change that makes every game's success announcement read `<item>. <praise>` once the item clip exists.
2. The 6 games that already set `audioSpec.clips` to their own item's audio keep working unchanged after the reorder (order of clips within `spec.audioSpec.clips` doesn't change, only where the praise clip is spliced in).
3. The 3 games with no item audio on success (syllables, numbers, counting) gain one: `audioSpec: { clips: [getItemAudioClip(locale, category, target.audioKey, target.symbol|value)] }` added to their `getSuccessSpec`/inline success spec.

**`successOverlayAudio.verify.ts`** (existing one-shot verifier) asserts today's `[praise, ...item]` order — its assertions must be updated to the new `[...item, praise]` order as part of this change, not left stale.

## Non-Goals

- The terminal "gave up after `MAX_ATTEMPTS`" failure overlay/audio is untouched — its own inconsistency (`neverMind [+ itIs] + item` vs `neverMind + item`) is a separate concern not addressed here.
- Assembly's wrong-tap audio is untouched and does **not** use the new `getWrongAnswerAudio` helper. Its mechanic validates a full tile arrangement, not a single selected item — there is no single "selected item" to plug into the shared 2-clip shape the way every other game has, and its wrong condition doesn't always have a `selectedSyllable` at all. Forcing it into the shared helper would require bending the helper's contract or Assembly's own logic for no real consistency benefit, since the two mechanics aren't actually the same shape.
- Assembly's hardcoded phrase paths (`phrases/skus-to-znova`, `phrases/usporiadaj-slabiky` instead of `getPhraseClip(locale, 'retry'/'orderSyllables')`) are untouched — pre-existing, unrelated to this change.
- The round counter change (already shipped separately, commit `923fb43`) and the first-letter landscape layout fix (already shipped separately, commit `1ef7254`) are not part of this plan.
- No new audio phrase keys or bundled `.mp3` files are added — this change only reorders/removes existing clips.

## Testing and Verification

- Update `src/shared/components/successOverlayAudio.verify.ts` to assert the new `[...item, praise]` clip order.
- After the change, re-run the existing e2e suite (`npm run test:e2e`) — the `find-it-games.spec.ts` golden-path tests exercise both wrong-tap (3 attempts → failure overlay) and correct-tap (→ success overlay) paths for alphabet/syllables/numbers/words and should continue to pass unchanged, since they assert on overlay *state* (`window.__E2E__.overlay`), not on audio content.
- Manually verify (or extend e2e coverage for) the 3 games gaining new success audio (syllables, numbers, counting) actually play a real audio file/TTS fallback for the target item, not just a silent no-op.
- `npm run lint` and `npm run build` must pass as usual.
