# Doplň písmeno Game Design

## Summary

Add `Doplň písmeno`, a letter-completion mini-game where the child hears a full word, sees its emoji, and fills one or more missing Slovak letter units in the written word. The game should feel like a sibling to `Doplň slabiku`, but it operates on letters rather than syllables and supports a configurable missing-letter count.

The first version should keep implementation scoped to the new game. It should be designed around reusable "complete units" ideas so a later `Doplň slovo` game can reuse the same mental model, but it should not refactor the working `Doplň slabiku` implementation yet.

## User Experience

- Home screen card title: `Doplň písmeno`.
- Place the game after `Doplň slabiku` in the game catalog.
- Lobby follows the existing `GameLobby` pattern.
- A round shows:
  - target emoji
  - word split into Slovak letter units
  - one or more blanks in the word
  - four letter choice tiles
  - standard top bar with back, round counter, and replay audio
- Prompt audio plays the full target word only.
- The child fills blanks in guided order:
  - one blank is active at a time
  - correct tap fills the active blank
  - if more blanks remain, the next blank becomes active without showing success yet
  - when all blanks are filled, the normal success overlay runs
- Wrong taps:
  - mark the selected tile wrong briefly
  - play `thisIs` + selected letter audio + `retry`
  - keep the same active blank
- The game uses the standard failure behavior after the maximum wrong attempts for the round.
- The session completes after the same five-round cadence used by the other bespoke games.

## Letter Units

The game must operate on Slovak letter units, not raw JavaScript characters.

- `CH`, `DZ`, and `DŽ` count as single units.
- Diacritics remain attached to their letters, such as `Á`, `Č`, `Ľ`, and `Ž`.
- Matching and display use uppercase Slovak locale normalization.
- Punctuation, whitespace, hyphens, and unsupported symbols are not playable letter units. The first version excludes words containing those symbols from eligibility.

## Settings

`Doplň písmeno` gets its own game setting for the number of missing units:

- allowed values: `1`, `2`, `adaptive`
- default: `1`
- `1`: hide one letter unit
- `2`: hide two letter units when the word has enough playable units
- `adaptive`: hide one unit for words with four or fewer playable units, and two units for words with five or more playable units

The game also respects the existing alphabet accent setting:

- when accents are disabled, eligible words must not require accented missing letters
- distractor choices must come only from active letters
- multi-character Slovak letters remain valid active units when present in the alphabet list

## Eligibility

A word is eligible when all of these are true:

- it can be split into at least two playable Slovak letter units
- every unit required for display exists in the active letter set
- the requested missing-count mode can choose at least one missing unit
- missing positions are distinct positions in the word, even when the same letter appears more than once
- every selected missing unit can produce four unique choices: the correct letter plus three active distractors
- the word has audio metadata and emoji like the existing `Word` content model

If no eligible words exist for the current settings, the lobby should show a parent-facing empty-state message instead of starting a broken round.

## Choice Generation

Each active blank has its own four-choice set:

- always include the correct active letter
- include three unique distractors from active letters
- exclude the current correct letter from distractors
- shuffle the final four choices

When multiple blanks are present, the choice set updates as the active blank advances.

## Audio and Feedback

- Prompt/replay: full word only.
- Correct intermediate blank: no overlay and no extra praise; fill the blank and advance.
- Correct final blank: success overlay with the completed word and emoji.
- Failure overlay: `neverMind` plus full word fallback, matching `Doplň slabiku`.
- Wrong answer: `thisIs` + selected letter + `retry`.
- Maximum wrong attempts are counted across the whole word round, not separately per blank.
- Audio fallback text for letters should use the selected letter symbol.
- Audio fallback text for word success/failure should use the full word, not a spaced-out letter string.

## Architecture

Create a new game folder:

- `src/games/complete-letter/completeLetterLogic.ts`
- `src/games/complete-letter/completeLetterLogic.verify.ts`
- `src/games/complete-letter/CompleteLetterGame.tsx`

Pure logic should cover:

- splitting a word into Slovak letter units
- normalizing letters with Slovak locale rules
- filtering active letters from settings
- building eligible word rounds
- choosing missing positions for `1`, `2`, and `adaptive`
- building prompt slots for visible, pending, active, and filled blanks
- building choices for the current active blank

The React component should be modeled on `CompleteSyllableGame`:

- local `HOME` / `PLAYING` state
- round queue
- prompt timer cleanup
- round end timer cleanup
- wrong-feedback reset timer cleanup
- session token guard for stale timers
- standard `SuccessOverlay`, `FailureOverlay`, and `SessionCompleteOverlay`
- `audioManager.stop()` before terminal success/failure audio paths

Route/catalog/settings changes:

- add a `COMPLETE_LETTER` game id
- add `/complete-letter` route
- add home card and lobby metadata after `COMPLETE_SYLLABLE`
- add settings content for missing-letter count and music
- update `README.md`
- update `ROADMAP.md`

## Testing and Verification

Add `completeLetterLogic.verify.ts` as a one-shot verifier. It should cover:

- Slovak unit parsing for normal letters
- `CH`, `DZ`, and `DŽ` as single units
- diacritic normalization
- active accent filtering
- missing-count modes `1`, `2`, and `adaptive`
- prompt slot states as blanks are filled in order
- four unique choices including the correct letter
- ineligible words when four choices cannot be built

Before completion, run:

- `npx tsx src/games/complete-letter/completeLetterLogic.verify.ts`
- existing focused game/audio verifiers that are relevant to shared overlays
- `npm run test:audio`
- `npm run lint`
- `npm run build`
- Playwright desktop and mobile screenshots for the new route

## Non-Goals

- Do not refactor `Doplň slabiku` into a shared engine in this first implementation.
- Do not implement `Doplň slovo` now.
- Do not add drag-and-drop or manually selectable blanks.
- Do not add new bundled audio files for the prompt phrase; the word-only prompt uses existing word audio/TTS fallback.
