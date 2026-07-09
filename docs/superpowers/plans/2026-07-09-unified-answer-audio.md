# Unified Answer Audio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every game read the tapped item first on both wrong and correct answers (`<item>. Skús to znova.` on wrong, `<item>. <random praise>` on correct), dropping the "Toto je" phrase, via two new shared helpers instead of duplicating the change across each game.

**Architecture:** Add `getItemAudioClip`/`getWrongAnswerAudio` to `src/shared/contentRegistry.ts`, reorder the shared `getSuccessOverlayAudioSpec` to play item audio before praise, then migrate all 9 games' wrong-answer and success-answer audio to use these two helpers. Assembly is excluded from the wrong-answer helper (its mechanic has no single "selected item" the way every other game does) but automatically benefits from the success-audio reorder since it already flows through the same shared overlay.

**Tech Stack:** React 19, TypeScript, existing `AudioSpec`/`AudioClip` types, `audioManager`, one-shot `.verify.ts` scripts run via `npx tsx`.

---

## File Structure

- Modify: `src/shared/contentRegistry.ts` — add `AnswerAudioCategory`, `getItemAudioClip`, `getWrongAnswerAudio`.
- Create: `src/shared/contentRegistry.verify.ts` — one-shot verifier for the two new functions.
- Modify: `src/shared/components/successOverlayAudio.ts` — reorder clips to item-first, praise-last.
- Modify: `src/shared/components/successOverlayAudio.verify.ts` — update assertions to the new order.
- Modify: `src/games/alphabet/alphabetDescriptor.tsx` — use the shared helpers for wrong/success audio.
- Modify: `src/games/syllables/syllablesDescriptor.tsx` — same, plus add the missing success audio clip.
- Modify: `src/games/numbers/numbersDescriptor.tsx` — same, plus add the missing success audio clip.
- Modify: `src/games/words/wordsDescriptor.tsx` — use the shared helpers for wrong/success audio.
- Modify: `src/games/counting/CountingItemsGame.tsx` — use the shared helpers, add the missing success audio clip.
- Modify: `src/games/first-letter/FirstLetterGame.tsx` — use the shared helpers for wrong/success audio.
- Modify: `src/games/complete-syllable/CompleteSyllableGame.tsx` — use the shared helpers for wrong/success audio.
- Modify: `src/games/complete-letter/CompleteLetterGame.tsx` — use the shared helpers for wrong/success audio.

---

### Task 1: Shared Answer-Audio Helpers

**Files:**
- Modify: `src/shared/contentRegistry.ts`
- Create: `src/shared/contentRegistry.verify.ts`

- [ ] **Step 1: Write the failing verifier**

Create `src/shared/contentRegistry.verify.ts`:

```ts
import { getItemAudioClip, getWrongAnswerAudio } from './contentRegistry';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

const itemClip = getItemAudioClip('sk', 'letters', 'a', 'A');
assert(itemClip.path === 'sk/letters/a', 'item clip builds the correct locale/category/audioKey path');
assert(itemClip.fallbackText === 'A', 'item clip preserves the given fallback text');

const wrongAudio = getWrongAnswerAudio('sk', 'numbers', '3', '3');
assert(wrongAudio.clips.length === 2, 'wrong-answer audio has exactly two clips');
assert(wrongAudio.clips[0].path === 'sk/numbers/3', 'wrong-answer audio reads the selected item first');
assert(wrongAudio.clips[0].fallbackText === '3', 'wrong-answer audio item clip keeps its fallback text');
assert(wrongAudio.clips[1].path === 'sk/phrases/skus-to-znova', 'wrong-answer audio ends with the retry phrase');
assert(wrongAudio.clips[1].fallbackText === 'Skús to znova.', 'retry clip keeps its fallback text');

console.log('contentRegistry answer-audio checks passed');
```

- [ ] **Step 2: Run the verifier and confirm it fails**

Run:

```bash
npx tsx src/shared/contentRegistry.verify.ts
```

Expected: failure — `getItemAudioClip`/`getWrongAnswerAudio` are not exported yet.

- [ ] **Step 3: Add the shared helpers**

In `src/shared/contentRegistry.ts`, change the type import on line 5 from:

```ts
import { AudioClip, Letter, Syllable, Word, LocaleContent, AudioPhraseKey } from './types';
```

to:

```ts
import { AudioClip, AudioSpec, Letter, Syllable, Word, LocaleContent, AudioPhraseKey } from './types';
```

Add this immediately after the existing `getPhraseClip` function (after its closing `}` around line 82), before `getAlphabetItems`:

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

- [ ] **Step 4: Run the verifier and confirm it passes**

Run:

```bash
npx tsx src/shared/contentRegistry.verify.ts
```

Expected:

```text
contentRegistry answer-audio checks passed
```

- [ ] **Step 5: Verify the rest of the app still compiles**

Run:

```bash
npm run lint
```

Expected: exit code `0`, only the pre-existing `react-refresh/only-export-components` warning in `ContentContext.tsx`.

- [ ] **Step 6: Commit**

```bash
git add src/shared/contentRegistry.ts src/shared/contentRegistry.verify.ts
git commit -m "feat: add shared answer-audio helpers"
```

---

### Task 2: Reorder Success-Overlay Audio

**Files:**
- Modify: `src/shared/components/successOverlayAudio.ts`
- Modify: `src/shared/components/successOverlayAudio.verify.ts`

- [ ] **Step 1: Update the verifier's expected order first**

In `src/shared/components/successOverlayAudio.verify.ts`, replace the assertions block (lines 23-26):

```ts
assert(audioSpec.clips.length === 2, 'success audio includes praise and echo audio');
assert(audioSpec.clips[0].path === 'sk/praise/skvela-praca', 'praise audio matches displayed praise');
assert(audioSpec.clips[0].fallbackText === 'Skvelá práca!', 'praise fallback text matches displayed praise');
assert(audioSpec.clips[1].path === 'sk/words/jahoda', 'echo audio plays after praise');
```

with:

```ts
assert(audioSpec.clips.length === 2, 'success audio includes echo and praise audio');
assert(audioSpec.clips[0].path === 'sk/words/jahoda', 'echo audio plays first');
assert(audioSpec.clips[1].path === 'sk/praise/skvela-praca', 'praise audio matches displayed praise');
assert(audioSpec.clips[1].fallbackText === 'Skvelá práca!', 'praise fallback text matches displayed praise');
```

- [ ] **Step 2: Run the verifier and confirm it now fails**

Run:

```bash
npx tsx src/shared/components/successOverlayAudio.verify.ts
```

Expected: failure — the current implementation still puts praise first, so `clips[0].path` is `sk/praise/skvela-praca`, not `sk/words/jahoda`.

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
      { path: `${locale}/praise/${praise.audioKey}`, fallbackText: praise.text },
      ...(spec.audioSpec?.clips ?? []),
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
      ...(spec.audioSpec?.clips ?? []),
      { path: `${locale}/praise/${praise.audioKey}`, fallbackText: praise.text },
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
git commit -m "fix: play item audio before praise on success"
```

---

### Task 3: Migrate FindItGame Descriptor Games (Alphabet, Syllables, Numbers, Words)

**Files:**
- Modify: `src/games/alphabet/alphabetDescriptor.tsx`
- Modify: `src/games/syllables/syllablesDescriptor.tsx`
- Modify: `src/games/numbers/numbersDescriptor.tsx`
- Modify: `src/games/words/wordsDescriptor.tsx`

- [ ] **Step 1: Update `alphabetDescriptor.tsx`**

Change the import on line 8 from:

```ts
import { getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

Replace `getWrongAudio` (lines 33-39):

```ts
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/letters/${s.audioKey}`, fallbackText: s.symbol },
        getPhraseClip(locale, 'retry'),
      ],
    }),
```

with:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'letters', s.audioKey, s.symbol),
```

Replace `getSuccessSpec` (lines 40-47), keeping the existing compound fallback text exactly as-is:

```ts
    getSuccessSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [
          { path: `${locale}/letters/${l.audioKey}`, fallbackText: `${l.symbol} ako ${l.label}` },
        ],
      },
    }),
```

with:

```ts
    getSuccessSpec: (l) => ({
      echoLine: `${l.symbol} ako ${l.label} ${l.emoji}`,
      audioSpec: {
        clips: [getItemAudioClip(locale, 'letters', l.audioKey, `${l.symbol} ako ${l.label}`)],
      },
    }),
```

Do NOT touch `getPromptAudio` or `getFailureSpec` — both still use `getPhraseClip` for `'find'`/`'neverMind'`/`'itIs'`, which remain unchanged.

- [ ] **Step 2: Update `syllablesDescriptor.tsx`**

Change the import on line 8 from:

```ts
import { getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

Replace `getWrongAudio` (lines 33-39):

```ts
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/syllables/${s.audioKey}`, fallbackText: s.symbol },
        getPhraseClip(locale, 'retry'),
      ],
    }),
```

with:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'syllables', s.audioKey, s.symbol),
```

Replace `getSuccessSpec` (lines 40-43) — this game currently has NO audio on success at all, so this adds a new clip:

```ts
    getSuccessSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return { echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}` };
    },
```

with:

```ts
    getSuccessSpec: (s) => {
      const w = s.sourceWords[Math.floor(Math.random() * s.sourceWords.length)];
      return {
        echoLine: `${s.symbol} ako ${w.syllables} ${w.emoji}`,
        audioSpec: { clips: [getItemAudioClip(locale, 'syllables', s.audioKey, s.symbol)] },
      };
    },
```

Do NOT touch `getPromptAudio` or `getFailureSpec`.

- [ ] **Step 3: Update `numbersDescriptor.tsx`**

Change the import on line 8 from:

```ts
import { getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

Replace `getWrongAudio` (lines 33-39):

```ts
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/numbers/${s.audioKey}`, fallbackText: String(s.value) },
        getPhraseClip(locale, 'retry'),
      ],
    }),
```

with:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'numbers', s.audioKey, String(s.value)),
```

Replace `getSuccessSpec` (line 40) — this game currently has NO audio on success at all:

```ts
    getSuccessSpec: (n) => ({ echoLine: `Číslo ${n.value} 🎉` }),
```

with:

```ts
    getSuccessSpec: (n) => ({
      echoLine: `Číslo ${n.value} 🎉`,
      audioSpec: { clips: [getItemAudioClip(locale, 'numbers', n.audioKey, String(n.value))] },
    }),
```

Do NOT touch `getPromptAudio` or `getFailureSpec`.

- [ ] **Step 4: Update `wordsDescriptor.tsx`**

Change the import on line 8 from:

```ts
import { getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

Replace `getWrongAudio` (lines 33-39):

```ts
    getWrongAudio: (_t, s) => ({
      clips: [
        getPhraseClip(locale, 'thisIs'),
        { path: `${locale}/words/${s.audioKey}`, fallbackText: s.word },
        getPhraseClip(locale, 'retry'),
      ],
    }),
```

with:

```ts
    getWrongAudio: (_t, s) => getWrongAnswerAudio(locale, 'words', s.audioKey, s.word),
```

Replace `getSuccessSpec` (lines 40-43):

```ts
    getSuccessSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
      audioSpec: { clips: [{ path: `${locale}/words/${w.audioKey}`, fallbackText: w.word }] },
    }),
```

with:

```ts
    getSuccessSpec: (w) => ({
      echoLine: `${w.syllables} ${w.emoji}`,
      audioSpec: { clips: [getItemAudioClip(locale, 'words', w.audioKey, w.word)] },
    }),
```

Do NOT touch `getPromptAudio`, `getReplayAudio`, or `getFailureSpec`.

- [ ] **Step 5: Verify**

Run:

```bash
npx tsx src/shared/contentRegistry.verify.ts
```

```bash
npm run lint
```

Expected: verifier prints `contentRegistry answer-audio checks passed`; lint exits `0` with only the pre-existing warning.

- [ ] **Step 6: Commit**

```bash
git add src/games/alphabet/alphabetDescriptor.tsx src/games/syllables/syllablesDescriptor.tsx src/games/numbers/numbersDescriptor.tsx src/games/words/wordsDescriptor.tsx
git commit -m "fix: unify answer audio for alphabet, syllables, numbers, and words"
```

---

### Task 4: Migrate Counting Game

**Files:**
- Modify: `src/games/counting/CountingItemsGame.tsx`

- [ ] **Step 1: Update the import**

Change line 9 from:

```ts
import { TIMING, COUNTING_EMOJIS, getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, COUNTING_EMOJIS, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Replace the inline wrong-answer audio**

In `handleOptionClick`, replace (lines 167-173):

```ts
        audioManager.play({
          clips: [
            getPhraseClip(locale, 'thisIs'),
            { path: `${locale}/numbers/${item.audioKey}`, fallbackText: String(item.value) },
            getPhraseClip(locale, 'retry'),
          ],
        });
```

with:

```ts
        audioManager.play(getWrongAnswerAudio(locale, 'numbers', item.audioKey, String(item.value)));
```

- [ ] **Step 3: Add the missing success audio**

Replace the inline `SuccessOverlay` spec (lines 244-249):

```tsx
      {targetItem && (
        <SuccessOverlay
          show={showSuccess}
          spec={{ echoLine: `Správne, je ich ${targetItem.value} ⭐` }}
          onComplete={startNewRound}
        />
      )}
```

with:

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

Do NOT touch the failure spec (`getPhraseClip(locale, 'neverMind')`/`'itIs'` block) or the `countItems` prompt phrase.

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
```

Expected: exit code `0`, only the pre-existing warning.

- [ ] **Step 5: Commit**

```bash
git add src/games/counting/CountingItemsGame.tsx
git commit -m "fix: unify answer audio for counting game"
```

---

### Task 5: Migrate First-Letter Game

**Files:**
- Modify: `src/games/first-letter/FirstLetterGame.tsx`

- [ ] **Step 1: Update the import**

Change line 16 from:

```ts
import { TIMING, getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Replace `getWrongAudio`**

Replace (lines 83-91):

```ts
function getWrongAudio(locale: string, selected: Letter) {
  return {
    clips: [
      getPhraseClip(locale, 'thisIs'),
      { path: `${locale}/letters/${selected.audioKey}`, fallbackText: selected.symbol },
      getPhraseClip(locale, 'retry'),
    ],
  };
}
```

with:

```ts
function getWrongAudio(locale: string, selected: Letter) {
  return getWrongAnswerAudio(locale, 'letters', selected.audioKey, selected.symbol);
}
```

- [ ] **Step 3: Update `getSuccessSpec`**

Replace (lines 60-69), keeping the existing compound fallback sentence exactly as-is:

```ts
function getSuccessSpec(locale: string, item: FirstLetterItem): SuccessSpec {
  return {
    echoLine: getRelationshipLine(item),
    audioSpec: {
      clips: [
        { path: `${locale}/words/${item.word.audioKey}`, fallbackText: `${item.word.word} začína na ${item.firstLetter.symbol}.` },
      ],
    },
  };
}
```

with:

```ts
function getSuccessSpec(locale: string, item: FirstLetterItem): SuccessSpec {
  return {
    echoLine: getRelationshipLine(item),
    audioSpec: {
      clips: [
        getItemAudioClip(locale, 'words', item.word.audioKey, `${item.word.word} začína na ${item.firstLetter.symbol}.`),
      ],
    },
  };
}
```

Do NOT touch `getFailureSpec` or the prompt audio.

- [ ] **Step 4: Verify**

Run:

```bash
npm run lint
```

Expected: exit code `0`, only the pre-existing warning.

- [ ] **Step 5: Commit**

```bash
git add src/games/first-letter/FirstLetterGame.tsx
git commit -m "fix: unify answer audio for first-letter game"
```

---

### Task 6: Migrate Complete-Syllable Game

**Files:**
- Modify: `src/games/complete-syllable/CompleteSyllableGame.tsx`

- [ ] **Step 1: Update the import**

Change the contentRegistry import line from:

```ts
import { TIMING, getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Replace `getWrongAudio`**

Replace:

```ts
function getWrongAudio(locale: string, selected: Syllable) {
  return {
    clips: [
      getPhraseClip(locale, 'thisIs'),
      { path: `${locale}/syllables/${selected.audioKey}`, fallbackText: selected.symbol },
      getPhraseClip(locale, 'retry'),
    ],
  };
}
```

with:

```ts
function getWrongAudio(locale: string, selected: Syllable) {
  return getWrongAnswerAudio(locale, 'syllables', selected.audioKey, selected.symbol);
}
```

- [ ] **Step 3: Update `getSuccessSpec`**

Replace:

```ts
function getSuccessSpec(locale: string, round: CompleteSyllableRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
      ],
    },
  };
}
```

with:

```ts
function getSuccessSpec(locale: string, round: CompleteSyllableRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [getItemAudioClip(locale, 'words', round.word.audioKey, round.word.word)],
    },
  };
}
```

Do NOT touch `getFailureSpec` or `getPromptAudio`.

- [ ] **Step 4: Verify**

Run:

```bash
npx tsx src/games/complete-syllable/completeSyllableLogic.verify.ts
```

```bash
npm run lint
```

Expected: verifier still prints `completeSyllableLogic checks passed` (its pure logic is untouched by this task); lint exits `0` with only the pre-existing warning.

- [ ] **Step 5: Commit**

```bash
git add src/games/complete-syllable/CompleteSyllableGame.tsx
git commit -m "fix: unify answer audio for complete-syllable game"
```

---

### Task 7: Migrate Complete-Letter Game

**Files:**
- Modify: `src/games/complete-letter/CompleteLetterGame.tsx`

- [ ] **Step 1: Update the import**

Change the contentRegistry import line from:

```ts
import { TIMING, getPhraseClip } from '../../shared/contentRegistry';
```

to:

```ts
import { TIMING, getItemAudioClip, getPhraseClip, getWrongAnswerAudio } from '../../shared/contentRegistry';
```

- [ ] **Step 2: Replace `getWrongAudio`**

Replace:

```ts
function getWrongAudio(locale: string, selected: Letter) {
  return {
    clips: [
      getPhraseClip(locale, 'thisIs'),
      { path: `${locale}/letters/${selected.audioKey}`, fallbackText: selected.symbol },
      getPhraseClip(locale, 'retry'),
    ],
  };
}
```

with:

```ts
function getWrongAudio(locale: string, selected: Letter) {
  return getWrongAnswerAudio(locale, 'letters', selected.audioKey, selected.symbol);
}
```

- [ ] **Step 3: Update `getSuccessSpec`**

Replace:

```ts
function getSuccessSpec(locale: string, round: CompleteLetterRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [
        { path: `${locale}/words/${round.word.audioKey}`, fallbackText: round.word.word },
      ],
    },
  };
}
```

with:

```ts
function getSuccessSpec(locale: string, round: CompleteLetterRound): SuccessSpec {
  return {
    echoLine: getCompletedLine(round),
    audioSpec: {
      clips: [getItemAudioClip(locale, 'words', round.word.audioKey, round.word.word)],
    },
  };
}
```

Do NOT touch `getFailureSpec` or `getPromptAudio`.

- [ ] **Step 4: Verify**

Run:

```bash
npx tsx src/games/complete-letter/completeLetterLogic.verify.ts
```

```bash
npm run lint
```

Expected: verifier still prints `completeLetterLogic checks passed`; lint exits `0` with only the pre-existing warning.

- [ ] **Step 5: Commit**

```bash
git add src/games/complete-letter/CompleteLetterGame.tsx
git commit -m "fix: unify answer audio for complete-letter game"
```

---

### Task 8: Final Verification

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

Expected: all 6 audio categories pass (this change reuses only existing audio files/keys, adds no new ones).

- [ ] **Step 3: Run the e2e suite**

```bash
npm run test:e2e
```

Expected: all 28 tests pass. These specs assert on overlay *state* (`window.__E2E__.overlay`), not audio content, so they should be unaffected by this change — a failure here would mean something broke beyond the intended audio scope.

- [ ] **Step 4: Run lint and build**

```bash
npm run lint
```

```bash
npm run build
```

Expected: both exit `0` (build may show the existing large-chunk warning and PWA precache output — both expected).

- [ ] **Step 5: Check git state**

```bash
git status --short --branch
```

```bash
git log --oneline --decorate --max-count=10
```

Expected: working tree clean; latest commits show Tasks 1-7's commits in order.

---

## Review Guidance for the Implementing Agent

Before handing back:

- Confirm a wrong tap in each of the 9 games plays `<item audio>` then `<retry phrase>`, with no `"Toto je"` anywhere except Assembly (which never had it).
- Confirm a correct tap in each of the 9 games plays `<item audio>` then `<random praise>` (Assembly plays its fixed `"vyborne"` praise instead of random, per its pre-existing, unrelated behavior — only the order relative to item audio matters here).
- Confirm the 3 previously-silent-on-success games (syllables, numbers, counting) now audibly play the target's own sound before praise — this is new behavior, not just a reorder, so it's worth actually listening to (or checking via browser devtools network/audio calls) rather than trusting the code alone.
- Confirm Assembly's wrong-answer audio is completely untouched (no `getWrongAnswerAudio` call, still its own bespoke `getWrongAudio`).
- Confirm no new audio phrase keys or `.mp3` files were added — this change only reorders/reuses existing ones.
- Confirm `src/games/assembly/AssemblyGame.tsx` itself was never modified in any task.
