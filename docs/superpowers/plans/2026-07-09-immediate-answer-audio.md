# Immediate Answer Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every correct tap immediately announce the tapped item, exactly as wrong taps already do, decoupling the item's own sound from the success overlay — which now plays praise, then optional bonus content (the whole word, for games where the tapped item is part of one).

**Architecture:** A new shared helper (`getItemAnnouncementAudio`) wraps a single item clip for immediate playback. `GameDescriptor<T>` gains a required `getCorrectAudio` field so the shared `FindItGame` engine can play it synchronously on a correct tap. The 4 bespoke games get the equivalent call added directly in their own tap handlers. `getSuccessOverlayAudioSpec` reorders back to praise-first now that the item is no longer its job. Assembly (previously excluded from unified audio) is brought in.

**Tech Stack:** React 19, TypeScript, existing `AudioSpec`/`AudioClip`/`GameDescriptor<T>` types, `audioManager`, one-shot `.verify.ts` scripts run via `npx tsx`.

---

## File Structure

- Modify: `src/shared/contentRegistry.ts` — add `getItemAnnouncementAudio`.
- Modify: `src/shared/contentRegistry.verify.ts` — add assertions for the new helper.
- Modify: `src/shared/components/successOverlayAudio.ts` — reorder to praise-first.
- Modify: `src/shared/components/successOverlayAudio.verify.ts` — update assertions to match.
- Modify: `src/shared/types.ts` — add `getCorrectAudio` to `GameDescriptor<T>`.
- Modify: `src/shared/components/FindItGame.tsx` — call `getCorrectAudio` immediately on a correct tap.
- Modify: `src/games/alphabet/alphabetDescriptor.tsx`, `src/games/numbers/numbersDescriptor.tsx`, `src/games/words/wordsDescriptor.tsx` — implement `getCorrectAudio`; drop the now-redundant item clip from `getSuccessSpec` (none of these 3 games have "optional content").
- Modify: `src/games/syllables/syllablesDescriptor.tsx` — implement `getCorrectAudio`; repoint its `getSuccessSpec` clip from the syllable itself to its whole source word (syllables is the one FindItGame descriptor with "optional content" per the design doc's table).
- Modify: `src/games/counting/CountingItemsGame.tsx` — immediate announcement; drop the now-redundant item clip from its success spec.
- Modify: `src/games/first-letter/FirstLetterGame.tsx` — immediate letter announcement; success spec's whole-word content is unchanged (it never had the letter mixed in).
- Modify: `src/games/complete-syllable/CompleteSyllableGame.tsx` — immediate syllable announcement, replacing a now-redundant `audioManager.stop()`; success spec unchanged.
- Modify: `src/games/complete-letter/CompleteLetterGame.tsx` — immediate letter announcement on every blank (including intermediate ones), replacing a now-redundant `audioManager.stop()` on the final blank; success spec unchanged.
- Modify: `src/games/assembly/AssemblyGame.tsx` — migrate its already-existing immediate syllable announcement to the shared helper; refactor wrong/success audio to use shared helpers (same shape, no behavior change beyond the automatic praise-reorder).

---

### Task 1: Shared Immediate-Announcement Helper

**Files:**
- Modify: `src/shared/contentRegistry.ts`
- Modify: `src/shared/contentRegistry.verify.ts`

- [ ] **Step 1: Update the verifier first**

In `src/shared/contentRegistry.verify.ts`, change the import on line 1 from:

```ts
import { getItemAudioClip, getWrongAnswerAudio } from './contentRegistry';
```

to:

```ts
import { getItemAnnouncementAudio, getItemAudioClip, getWrongAnswerAudio } from './contentRegistry';
```

Add this block immediately before the final `console.log('contentRegistry answer-audio checks passed');` line:

```ts
const announcementAudio = getItemAnnouncementAudio('sk', 'syllables', 'ma', 'MA');
assert(announcementAudio.clips.length === 1, 'immediate announcement audio has exactly one clip');
assert(announcementAudio.clips[0].path === 'sk/syllables/ma', 'immediate announcement audio plays the item itself');
assert(announcementAudio.clips[0].fallbackText === 'MA', 'immediate announcement audio keeps its fallback text');
```

- [ ] **Step 2: Run the verifier and confirm it fails**

Run:

```bash
npx tsx src/shared/contentRegistry.verify.ts
```

Expected: failure — `getItemAnnouncementAudio` is not exported yet.

- [ ] **Step 3: Add the helper**

In `src/shared/contentRegistry.ts`, add this immediately after the existing `getWrongAnswerAudio` function (after its closing `}`, before `getAlphabetItems`):

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

- [ ] **Step 4: Run the verifier and confirm it passes**

Run:

```bash
npx tsx src/shared/contentRegistry.verify.ts
```

Expected:

```text
contentRegistry answer-audio checks passed
```

- [ ] **Step 5: Verify lint**

Run:

```bash
npm run lint
```

Expected: exit code `0`, only the pre-existing warning.

- [ ] **Step 6: Commit**

```bash
git add src/shared/contentRegistry.ts src/shared/contentRegistry.verify.ts
git commit -m "feat: add immediate item-announcement audio helper"
```

---

### Task 2: Reorder Success Overlay to Praise-First

**Files:**
- Modify: `src/shared/components/successOverlayAudio.ts`
- Modify: `src/shared/components/successOverlayAudio.verify.ts`

- [ ] **Step 1: Update the verifier's expected order first**

In `src/shared/components/successOverlayAudio.verify.ts`, replace the assertions block:

```ts
assert(audioSpec.clips.length === 2, 'success audio includes echo and praise audio');
assert(audioSpec.clips[0].path === 'sk/words/jahoda', 'echo audio plays first');
assert(audioSpec.clips[1].path === 'sk/praise/skvela-praca', 'praise audio matches displayed praise');
assert(audioSpec.clips[1].fallbackText === 'Skvelá práca!', 'praise fallback text matches displayed praise');
```

with:

```ts
assert(audioSpec.clips.length === 2, 'success audio includes praise and optional content');
assert(audioSpec.clips[0].path === 'sk/praise/skvela-praca', 'praise audio plays first');
assert(audioSpec.clips[0].fallbackText === 'Skvelá práca!', 'praise fallback text matches displayed praise');
assert(audioSpec.clips[1].path === 'sk/words/jahoda', 'optional content plays after praise');
```

- [ ] **Step 2: Run the verifier and confirm it now fails**

Run:

```bash
npx tsx src/shared/components/successOverlayAudio.verify.ts
```

Expected: failure — the current implementation still puts content first.

- [ ] **Step 3: Reorder the implementation**

In `src/shared/components/successOverlayAudio.ts`, replace the function body:

```ts
export function getSuccessOverlayAudioSpec(
  locale: string,
  praise: PraiseEntry,
  spec: SuccessSpec,
): AudioSpec {
  return {
    clips: [
      ...(spec.audioSpec?.clips ?? []),
      { path: `${locale}/praise/${praise.audioKey}`, fallbackText: praise.text },
    ],
  };
}
```

with:

```ts
export function getSuccessOverlayAudioSpec(
  locale: string,
  praise: PraiseEntry,
  spec: SuccessSpec,
): AudioSpec {
  return {
    clips: [
      { path: `${locale}/praise/${praise.audioKey}`, fallbackText: praise.text },
      ...(spec.audioSpec?.clips ?? []),
    ],
  };
}
```

- [ ] **Step 4: Run the verifier and confirm it passes**

Run:

```bash
npx tsx src/shared/components/successOverlayAudio.verify.ts
```

Expected:

```text
successOverlayAudio checks passed
```

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/successOverlayAudio.ts src/shared/components/successOverlayAudio.verify.ts
git commit -m "fix: play praise before optional content on success"
```

---

### Task 3: Immediate Correct-Answer Audio for FindItGame Games

**Files:**
- Modify: `src/shared/types.ts`
- Modify: `src/shared/components/FindItGame.tsx`
- Modify: `src/games/alphabet/alphabetDescriptor.tsx`
- Modify: `src/games/syllables/syllablesDescriptor.tsx`
- Modify: `src/games/numbers/numbersDescriptor.tsx`
- Modify: `src/games/words/wordsDescriptor.tsx`

This task must land as one commit: adding a required field to `GameDescriptor<T>` without updating every implementer in the same commit would break the build.

- [ ] **Step 1: Add `getCorrectAudio` to the `GameDescriptor<T>` interface**

In `src/shared/types.ts`, in the `GameDescriptor<T>` interface, add this immediately before the existing `getWrongAudio` field:

```ts
  /** Audio to play immediately when the child taps the correct card, before the success overlay appears. */
  getCorrectAudio(target: T): AudioSpec;
```

So the interface reads (only the relevant portion shown, rest of the interface unchanged):

```ts
  /** Audio to play immediately when the child taps the correct card, before the success overlay appears. */
  getCorrectAudio(target: T): AudioSpec;
  /** Audio to play when the child taps a wrong card. */
  getWrongAudio(target: T, selected: T): AudioSpec;
```

- [ ] **Step 2: Call it immediately on a correct tap in `FindItGame.tsx`**

In `src/shared/components/FindItGame.tsx`, in `handleCardClick`, change:

```ts
    if (descriptor.getItemId(item) === descriptor.getItemId(targetItem)) {
      pendingSuccessRef.current = true;
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setSuccessSpec(descriptor.getSuccessSpec(targetItem));
```

to:

```ts
    if (descriptor.getItemId(item) === descriptor.getItemId(targetItem)) {
      pendingSuccessRef.current = true;
      audioManager.play(descriptor.getCorrectAudio(item));
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
      setSuccessSpec(descriptor.getSuccessSpec(targetItem));
```

- [ ] **Step 3: Implement `getCorrectAudio` in `alphabetDescriptor.tsx`, drop the now-redundant success clip**

Change the import from:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

Replace:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'letters', s.audioKey, s.symbol),
    getSuccessSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [getItemAudioClip(locale, 'letters', l.audioKey, `${l.symbol} ako ${l.label}`)],
      },
    }),
```

with:

```ts
    getCorrectAudio: (l) => getItemAnnouncementAudio(locale, 'letters', l.audioKey, l.symbol),
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'letters', s.audioKey, s.symbol),
    getSuccessSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
    }),
```

(Alphabet has no natural "optional content" — a `Letter` has no associated `Word` with its own audio.)

- [ ] **Step 4: Implement `getCorrectAudio` in `syllablesDescriptor.tsx`, redirect its success clip from the syllable to the whole word**

Change the import from:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAnnouncementAudio, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

(`getItemAudioClip` stays — per the design doc's table, syllables is the one FindItGame descriptor with "optional content": the tapped syllable is part of a larger `Word` via `sourceWords`, so `getSuccessSpec` keeps a bonus clip, just repointed from the syllable itself to that word.)

Replace:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'syllables', s.audioKey, s.symbol),
    getSuccessSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return {
        echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}`,
        audioSpec: { clips: [getItemAudioClip(locale, 'syllables', s.audioKey, s.symbol)] },
      };
    },
```

with:

```ts
    getCorrectAudio: (s) => getItemAnnouncementAudio(locale, 'syllables', s.audioKey, s.symbol),
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'syllables', s.audioKey, s.symbol),
    getSuccessSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return {
        echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}`,
        audioSpec: { clips: [getItemAudioClip(locale, 'words', w.audioKey, w.word)] },
      };
    },
```

Before this task, `getSuccessSpec`'s `audioSpec` replayed the syllable itself (`category: 'syllables'`) after praise — redundant now that `getCorrectAudio` already announces the syllable immediately on tap. This step repoints that same clip slot to the syllable's whole source word (`category: 'words'`, using the same `w` already computed for `echoLine`), matching the design doc's table (Syllables → optional content: whole word via `sourceWords`) and the same pattern used by first-letter, complete-syllable, and complete-letter.

- [ ] **Step 5: Implement `getCorrectAudio` in `numbersDescriptor.tsx`, drop the now-redundant success clip**

Change the import from:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

Replace:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'numbers', s.audioKey, String(s.value)),
    getSuccessSpec: (n) => ({
      echoLine: `Číslo ${n.value} 🎉`,
      audioSpec: { clips: [getItemAudioClip(locale, 'numbers', n.audioKey, String(n.value))] },
    }),
```

with:

```ts
    getCorrectAudio: (n) => getItemAnnouncementAudio(locale, 'numbers', n.audioKey, String(n.value)),
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'numbers', s.audioKey, String(s.value)),
    getSuccessSpec: (n) => ({
      echoLine: `Číslo ${n.value} 🎉`,
    }),
```

- [ ] **Step 6: Implement `getCorrectAudio` in `wordsDescriptor.tsx`, drop the now-redundant success clip**

Change the import from:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

Replace:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'words', s.audioKey, s.word),
    getSuccessSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
      audioSpec: { clips: [getItemAudioClip(locale, 'words', w.audioKey, w.word)] },
    }),
```

with:

```ts
    getCorrectAudio: (w) => getItemAnnouncementAudio(locale, 'words', w.audioKey, w.word),
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'words', s.audioKey, s.word),
    getSuccessSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
    }),
```

(The words game's "item" already IS the whole word — no separate optional content needed.)

- [ ] **Step 7: Verify**

Run:

```bash
npx tsx src/shared/contentRegistry.verify.ts
```

Then run separately:

```bash
npm run lint
```

Expected: verifier passes; lint exits `0` with only the pre-existing warning — this is the critical check confirming every `GameDescriptor<T>` implementer got the new required field (a missing one would be a TypeScript error here).

- [ ] **Step 8: Commit**

```bash
git add src/shared/types.ts src/shared/components/FindItGame.tsx src/games/alphabet/alphabetDescriptor.tsx src/games/syllables/syllablesDescriptor.tsx src/games/numbers/numbersDescriptor.tsx src/games/words/wordsDescriptor.tsx
git commit -m "feat: immediately announce correct answers in alphabet, syllables, numbers, and words"
```

---

### Task 4: Immediate Correct-Answer Audio for Counting Game

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

- [ ] **Step 1: Update the import**

Change:

```ts
import { TIMING, COUNTING_EMOJIS, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, COUNTING_EMOJIS, getItemAnnouncementAudio, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Add the immediate announcement**

In `handleOptionClick`, change:

```ts
    if (item.value === targetItem.value) {
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
```

to:

```ts
    if (item.value === targetItem.value) {
      audioManager.play(getItemAnnouncementAudio(locale, 'numbers', item.audioKey, String(item.value)));
      setFeedback(prev => ({ ...prev, [index]: 'correct' }));
```

- [ ] **Step 3: Drop the now-redundant success clip**

Replace:

```tsx
      {targetItem && (
        <SuccessOverlay
          show={showSuccess}
          spec={{
            echoLine: `Správne, je ich ${targetItem.value} ⭐`,
            audioSpec: { clips: [getItemAudioClip(locale, 'numbers', targetItem.audioKey, String(targetItem.value))] },
          }}
          onComplete={startNewRound}
        />
      )}
```

with:

```tsx
      {targetItem && (
        <SuccessOverlay
          show={showSuccess}
          spec={{ echoLine: `Správne, je ich ${targetItem.value} ⭐` }}
          onComplete={startNewRound}
        />
      )}
```

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
```

Expected: exit code `0`, only the pre-existing warning.

- [ ] **Step 5: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx
git commit -m "feat: immediately announce correct answers in counting game"
```

---

### Task 5: Immediate Correct-Answer Audio for First-Letter Game

**Files:**
- Modify: `src/games/first-letter/FirstLetterGame.tsx`

- [ ] **Step 1: Update the import**

Change:

```ts
import { TIMING, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, getItemAnnouncementAudio, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

(`getItemAudioClip` stays — it still builds the whole-word optional content in `getSuccessSpec`, which is unchanged by this task.)

- [ ] **Step 2: Add the immediate letter announcement**

In `handleChoice`, change:

```ts
    if (letter.symbol === targetItem.firstLetter.symbol) {
      pendingRoundEndRef.current = true;
      setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
      setSuccessSpec(getSuccessSpec(locale, targetItem));
      finishRound(true);
      return;
    }
```

to:

```ts
    if (letter.symbol === targetItem.firstLetter.symbol) {
      pendingRoundEndRef.current = true;
      audioManager.play(getItemAnnouncementAudio(locale, 'letters', letter.audioKey, letter.symbol));
      setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
      setSuccessSpec(getSuccessSpec(locale, targetItem));
      finishRound(true);
      return;
    }
```

`getSuccessSpec` itself is unchanged — it already only ever contained the whole-word audio, never the letter.

- [ ] **Step 3: Verify**

Run:

```bash
npm run lint
```

Expected: exit code `0`, only the pre-existing warning.

- [ ] **Step 4: Commit**

```bash
git add src/games/first-letter/FirstLetterGame.tsx
git commit -m "feat: immediately announce correct answers in first-letter game"
```

---

### Task 6: Immediate Correct-Answer Audio for Complete-Syllable Game

**Files:**
- Modify: `src/games/complete-syllable/CompleteSyllableGame.tsx`

- [ ] **Step 1: Update the import**

Change:

```ts
import { TIMING, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, getItemAnnouncementAudio, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Replace the redundant `stop()` with the immediate announcement**

In `handleChoice`, change:

```ts
    if (syllable.symbol === targetRound.correctSyllable) {
      pendingRoundEndRef.current = true;
      audioManager.stop();
      setFeedback((current) => ({ ...current, [syllable.symbol]: 'correct' }));
      setShowMissingSyllable(true);
      setSuccessSpec(getSuccessSpec(locale, targetRound));
      finishRound(true);
      return;
    }
```

to:

```ts
    if (syllable.symbol === targetRound.correctSyllable) {
      pendingRoundEndRef.current = true;
      audioManager.play(getItemAnnouncementAudio(locale, 'syllables', syllable.audioKey, syllable.symbol));
      setFeedback((current) => ({ ...current, [syllable.symbol]: 'correct' }));
      setShowMissingSyllable(true);
      setSuccessSpec(getSuccessSpec(locale, targetRound));
      finishRound(true);
      return;
    }
```

`audioManager.play(...)` already stops any prior playback as its first action, so the explicit `.stop()` is redundant once this line plays new audio in its place. `getSuccessSpec` itself is unchanged — it already only ever contained the whole-word audio.

- [ ] **Step 3: Verify**

Run:

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
```

Then run separately:

```bash
npm run lint
```

Expected: verifier still prints `completeSyllableLogic checks passed` (its pure logic is untouched); lint exits `0` with only the pre-existing warning.

- [ ] **Step 4: Commit**

```bash
git add src/games/complete-syllable/CompleteSyllableGame.tsx
git commit -m "feat: immediately announce correct answers in complete-syllable game"
```

---

### Task 7: Immediate Correct-Answer Audio for Complete-Letter Game

**Files:**
- Modify: `src/games/complete-letter/CompleteLetterGame.tsx`

This game has multi-blank rounds — the immediate announcement applies to every correct tap, including intermediate blanks (currently silent) and the final blank (currently had a redundant `stop()`).

- [ ] **Step 1: Update the import**

Change:

```ts
import { TIMING, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, getItemAnnouncementAudio, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Add the immediate letter announcement for every correct tap**

In `handleChoice`, change:

```ts
    if (letter.symbol === correctSymbol) {
      const nextFilledCount = filledMissingCount + 1;
      setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
      setFilledMissingCount(nextFilledCount);

      if (nextFilledCount < targetRound.missingIndexes.length) {
        // activeLetters reflects live settings; a mid-round settings change (rare) could shift
        // distractors for the next blank — correct answer is unaffected.
        setChoices(buildLetterChoices(targetRound, activeLetters, nextFilledCount, CHOICE_COUNT));
        scheduleFeedbackReset(letter.symbol);
        return;
      }

      pendingRoundEndRef.current = true;
      audioManager.stop();
      setSuccessSpec(getSuccessSpec(locale, targetRound));
      finishRound(true);
      return;
    }
```

to:

```ts
    if (letter.symbol === correctSymbol) {
      const nextFilledCount = filledMissingCount + 1;
      setFeedback((current) => ({ ...current, [letter.symbol]: 'correct' }));
      setFilledMissingCount(nextFilledCount);
      audioManager.play(getItemAnnouncementAudio(locale, 'letters', letter.audioKey, letter.symbol));

      if (nextFilledCount < targetRound.missingIndexes.length) {
        // activeLetters reflects live settings; a mid-round settings change (rare) could shift
        // distractors for the next blank — correct answer is unaffected.
        setChoices(buildLetterChoices(targetRound, activeLetters, nextFilledCount, CHOICE_COUNT));
        scheduleFeedbackReset(letter.symbol);
        return;
      }

      pendingRoundEndRef.current = true;
      setSuccessSpec(getSuccessSpec(locale, targetRound));
      finishRound(true);
      return;
    }
```

Note the `audioManager.stop()` that used to precede `setSuccessSpec` on the final-blank path is removed — the new `audioManager.play(...)` call two lines above already stops any prior playback (e.g. lingering prompt audio) before it plays the letter, so the explicit stop would otherwise immediately cut off the very audio just started. `getSuccessSpec` itself is unchanged — it already only ever contained the whole-word audio.

- [ ] **Step 3: Verify**

Run:

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
```

Then run separately:

```bash
npm run lint
```

Expected: verifier still prints `completeLetterLogic checks passed`; lint exits `0` with only the pre-existing warning.

- [ ] **Step 4: Commit**

```bash
git add src/games/complete-letter/CompleteLetterGame.tsx
git commit -m "feat: immediately announce correct answers in complete-letter game"
```

---

### Task 8: Bring Assembly Into the Unified Pattern

**Files:**
- Modify: `src/games/assembly/AssemblyGame.tsx`

- [ ] **Step 1: Update the import**

Change:

```ts
import { TIMING } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAnnouncementAudio, getItemAudioClip, getPhraseClip, TIMING } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Route the tile-tap immediate announcement through the shared helper**

Replace:

```ts
      audioManager.play({
        clips: [
          { path: `${locale}/syllables/${selectedSyllable.toLowerCase()}`, fallbackText: selectedSyllable },
        ],
      });
```

with:

```ts
      audioManager.play(getItemAnnouncementAudio(locale, 'syllables', selectedSyllable.toLowerCase(), selectedSyllable));
```

Behavior is unchanged — this is purely routing through the shared helper for consistency. The surrounding `shouldPlaySelectedSyllableAudio` gating (which already suppresses this exact call on the tap that completes a wrong arrangement) is untouched.

- [ ] **Step 3: Refactor `getWrongAudio` to use shared helpers, same shape**

Replace:

```ts
function getWrongAudio(locale: string, word: Word, selectedSyllable?: string) {
  return {
    clips: [
      ...(selectedSyllable
        ? [{ path: `${locale}/syllables/${selectedSyllable.toLowerCase()}`, fallbackText: selectedSyllable }]
        : []),
      { path: `${locale}/phrases/skus-to-znova`, fallbackText: 'Skús to znova.' },
      { path: `${locale}/words/${word.audioKey}`, fallbackText: word.word },
    ],
  };
}
```

with:

```ts
function getWrongAudio(locale: string, word: Word, selectedSyllable?: string) {
  return {
    clips: [
      ...(selectedSyllable
        ? [getItemAudioClip(locale, 'syllables', selectedSyllable.toLowerCase(), selectedSyllable)]
        : []),
      getPhraseClip(locale, 'retry'),
      getItemAudioClip(locale, 'words', word.audioKey, word.word),
    ],
  };
}
```

This keeps the exact same 2-or-3-clip shape and content (selected syllable if any, retry, full word) — Assembly's failure mode is about arrangement, not a single wrong item, so the trailing word-context clip is intentionally kept, not reduced to the generic 2-clip `getWrongAnswerAudio` shape. Only the hardcoded `phrases/skus-to-znova` path is replaced with the registered `getPhraseClip(locale, 'retry')` lookup (same underlying audio file).

- [ ] **Step 4: Refactor `getSuccessAudio` to use the shared helper, same shape**

Replace:

```ts
function getSuccessAudio(locale: string, word: Word) {
  return {
    clips: [{ path: `${locale}/words/${word.audioKey}`, fallbackText: word.word }],
  };
}
```

with:

```ts
function getSuccessAudio(locale: string, word: Word) {
  return { clips: [getItemAudioClip(locale, 'words', word.audioKey, word.word)] };
}
```

No other change needed here — this word-audio automatically becomes the "optional content" (played after praise) once combined with Task 2's reorder, since Assembly already routes through the shared `getSuccessOverlayAudioSpec`. Its `praiseEntry: 'vyborne'` (fixed, not random) is untouched.

- [ ] **Step 5: Verify**

Run:

```bash
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
```

Then run separately:

```bash
npm run lint
```

Expected: verifier still prints its `checks passed` line (its pure logic — `shouldPlaySelectedSyllableAudio` — is untouched); lint exits `0` with only the pre-existing warning.

- [ ] **Step 6: Commit**

```bash
git add src/games/assembly/AssemblyGame.tsx
git commit -m "fix: route assembly audio through shared answer-audio helpers"
```

---

### Task 9: Final Verification

**Files:**
- No planned file edits.

- [ ] **Step 1: Run all focused verifiers**

```bash
npx tsx src/shared/contentRegistry.verify.ts
```

```bash
npx tsx src/shared/components/successOverlayAudio.verify.ts
```

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
```

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
```

```bash
npx tsx src/games/first-letter/firstLetterLogic.verify.ts
```

```bash
npx tsx src/games/assembly/assemblyAudioLogic.verify.ts
```

```bash
npx tsx src/shared/components/sessionCompleteAudio.verify.ts
```

Expected: each prints its own `checks passed` line, exit `0`.

- [ ] **Step 2: Run audio content validation**

```bash
npm run test:audio
```

Expected: all 6 audio categories pass.

- [ ] **Step 3: Run the e2e suite**

```bash
npm run test:e2e
```

Expected: all 28 tests pass. These specs assert on overlay state, not audio, so a failure here would mean the immediate-audio change broke a state transition, not just audio content.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
```

```bash
npm run build
```

Expected: both exit `0`.

- [ ] **Step 5: Manually verify immediate timing in the browser**

Start the preview server, open a "no optional content" game (e.g. `/numbers`) and a "whole word content" game (e.g. `/syllables`), and for each: use `window.__E2E__.correctItemId` to tap the correct choice, then inspect network requests immediately after the tap (before the success overlay appears).

Expected for `/numbers`: the item's own audio file (e.g. `audio/sk/numbers/4.mp3`) requests fire immediately on tap, and after the overlay delay, only a praise clip request follows (no second numbers clip).

Expected for `/syllables`: the syllable's own audio file requests fire immediately on tap, and after the overlay delay, a praise clip request fires followed by the whole source word's audio clip request (e.g. `audio/sk/words/jahoda.mp3`) — confirming the praise-then-content order from Task 2.

- [ ] **Step 6: Check git state**

```bash
git status --short --branch
```

```bash
git log --oneline --decorate --max-count=10
```

Expected: working tree clean; latest commits show Tasks 1-8 in order.

---

## Review Guidance for the Implementing Agent

Before handing back:

- Confirm every game's correct tap plays the item's own sound immediately (synchronously, in the tap handler) — not after the ~500ms overlay delay.
- Confirm the success overlay now plays praise first, then optional content (if any) — never item-then-praise (that ordering belonged to the prior task and is now superseded).
- Confirm alphabet, numbers, counting, and words have NO audio in their success spec at all (immediate announcement is their only correct-answer audio).
- Confirm syllables (FindItGame variant), first-letter, complete-syllable, complete-letter, and assembly still play the whole word as optional content after praise.
- Confirm complete-letter's intermediate blanks (2-letter rounds) now audibly announce each correct letter, where they previously played nothing.
- Confirm no `audioManager.stop()` call was left immediately before a now-added `audioManager.play(...)` call in the same branch (that would cut off the very audio just started).
- Confirm Assembly's wrong-answer audio still has its 2-or-3-clip shape (syllable if any, retry, full word) — not the generic 2-clip `getWrongAnswerAudio` shape.
- Confirm Assembly's `praiseEntry: 'vyborne'` (fixed, not random) is unchanged.
- Confirm no new audio phrase keys or `.mp3` files were added.
