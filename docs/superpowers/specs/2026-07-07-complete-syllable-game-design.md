# Doplň slabiku Game Design

## Summary

Add a new mini-game, **Doplň slabiku**, that trains syllable completion. The child hears a full word, sees the word's emoji plus syllable slots with one missing syllable, and chooses the missing syllable from four tiles.

Example round:

`🍓 ja - __ - da`

The game sits after the existing syllable and word-building games: it is more advanced than recognizing a spoken syllable and more constrained than assembling every syllable of a word.

## Goals

- Add a syllable reasoning game that complements **Slabiky**, **Slová**, and **Skladaj**.
- Reuse existing ready word content, including parent-authored custom words.
- Reuse existing derived syllable content for distractors.
- Keep v1 small: no new parent settings, no new content schema, and no new audio recording categories.
- Preserve the current app rhythm: short rounds, large touch targets, supportive audio feedback, shared overlays, and five-round sessions.

## Non-Goals

- Do not add drag-and-drop in v1.
- Do not add a difficulty setting for missing syllable position in v1.
- Do not generate artificial syllables.
- Do not require new phrase audio before the game can ship.
- Do not change the existing custom-content word validation.

## Current Game Context

The current literacy games cover adjacent skills:

- **Slabiky**: hear a syllable and identify it from a grid.
- **Slová**: read a syllabified word and match it to an emoji.
- **Skladaj**: assemble all syllables of a word in order.
- **Prvé písmenko**: hear a word and identify its starting letter.

`Doplň slabiku` focuses on a narrower missing-piece task: the child sees most of the syllable structure and chooses the syllable that completes it.

## Game Flow

Each round:

1. Choose an eligible ready word with 2-4 hyphen-separated syllables.
2. Choose one missing syllable position at random. The missing syllable can be first, middle, or last.
3. Show the word emoji and syllable slots with one blank:
   - `🍓 ja - __ - da`
   - `🐔 __ - ra`
   - `🦆 ka - či - __`
4. Play only the full word audio, for example `sk/words/jahoda` with fallback text `Jahoda`.
5. Show four syllable answer tiles:
   - one correct missing syllable
   - three distractor syllables from the existing derived syllable pool
6. Correct answer:
   - fill the blank visually
   - show the existing success overlay
   - reveal the full syllabified word with emoji, for example `ja-ho-da 🍓`
7. Wrong answer:
   - mark the selected tile wrong briefly
   - play the selected syllable audio and retry phrase using the existing wrong-answer pattern
8. Failure after max attempts:
   - show the existing failure overlay
   - reveal the correct full syllabified word with emoji
9. Session completion:
   - use the shared session-complete dialog and praise audio behavior after five rounds.

## Content Eligibility

The game uses ready words from the active content provider:

- default Slovak words
- parent-authored custom words with `status: "ready"`

Eligibility rules:

- A word is eligible only if its `syllables` value splits into 2-4 non-empty parts.
- The game uses the existing custom content format: hyphen-separated syllables.
- A round is playable only when the derived syllable pool can supply four unique answer choices including the correct syllable.
- Words that cannot produce a four-choice round are excluded from this game only.

## Missing Position

The missing syllable can be at any position:

- first syllable: `__ - ho - da`
- middle syllable: `ja - __ - da`
- last syllable: `ja - ho - __`

This gives better replay value and teaches the child to inspect the whole syllable sequence. There is no v1 progression or setting for easier positions.

## Answer Tiles

V1 uses four answer tiles:

- one correct syllable
- three distractors

Distractors come from the existing derived `syllableItems` pool. They must:

- not duplicate the correct syllable
- not duplicate each other
- use the same display casing as the existing syllable game
- use existing syllable audio when tapped, with TTS fallback when no clip exists

No artificial syllables are generated. This avoids unnatural Slovak combinations and keeps custom content behavior predictable.

## Visual Design

Home placement:

`Slová` → `Prvé písmenko` → `Skladaj` → `Doplň slabiku`

Home card:

- Title: `Doplň slabiku`
- Description: `Vyber slabiku, ktorá chýba`

Lobby:

- Title: `DOPLŇ SLABIKU`
- Follow the existing `GameLobby` pattern.

Round screen:

- Top bar follows existing game screens: back, round counter, replay audio.
- Prompt area shows:
  - large emoji
  - syllable slots in order
  - a visibly blank missing slot
- Answer area shows four large syllable tiles.
- The blank should be clearly tappable-looking but not interactive; the child answers through the four tiles.

Suggested prompt styling:

- emoji above or beside the syllable row depending on viewport height
- syllable row uses large text chips
- blank chip uses a dashed or pale fill treatment and `__`
- hyphen separators stay visible between syllables

## Audio Design

Prompt audio:

- Play only the full word clip:
  - `{ path: "sk/words/jahoda", fallbackText: "Jahoda" }`

Replay button:

- Replays the same full word audio.

Wrong answer audio:

- Follow the existing wrong-answer pattern:
  - `Toto je`
  - selected syllable clip, for example `sk/syllables/ma`
  - `Skús to znova.`

Success audio:

- Existing praise audio from `SuccessOverlay`.
- Then the completed word audio or TTS fallback:
  - fallback text: `ja-ho-da`

Failure audio:

- Existing failure phrase:
  - `Nevadí!`
- Then reveal/play the completed word:
  - fallback text: `ja-ho-da`

No new bundled phrase audio is required for v1.

## Architecture

Use a bespoke game loop for the play screen while reusing shared UI primitives and overlays.

`FindItGame` is not a clean fit because the round target is a word/missing-position pair while selectable answers are syllable strings. The game needs to render a custom prompt with a blank slot and fill it after a correct answer.

Proposed new game files:

- `src/games/complete-syllable/CompleteSyllableGame.tsx`
  - owns lobby/play state
  - reads `wordItems`, `syllableItems`, and `locale` through `useContent()`
  - owns the round loop, answer choices, attempts, feedback, and session completion trigger
- `src/games/complete-syllable/completeSyllableLogic.ts`
  - pure helpers for eligible word filtering, missing-position selection, prompt slot construction, and choice generation
- `src/games/complete-syllable/completeSyllableLogic.verify.ts`
  - focused checks for eligibility, position selection, slot construction, distractor uniqueness, and exclusion of unplayable words

Shared updates:

- `src/shared/types.ts`
  - add a `COMPLETE_SYLLABLE` game id
- `src/shared/gameCatalog.tsx`
  - add route/home/lobby metadata after Assembly
- `src/App.tsx`
  - add `/complete-syllable` route
- `src/shared/components/settingsContentData.ts`
  - add settings metadata for this game; v1 should expose only music controls
- `README.md`
  - update game count and game list
- `ROADMAP.md`
  - mark `Doplň slabiku` complete once implemented

## Empty State

If there are not enough eligible words or unique syllables for four choices, the lobby should show a friendly empty state and the play action should not start a round.

Suggested text:

`Žiadne slová pre túto hru`

`Pridajte slová s dvomi až štyrmi slabikami.`

## Testing

Focused logic verification should cover:

- `ja-ho-da` splits into three slots.
- Any missing index can produce exactly one blank slot.
- Choice generation includes the correct syllable.
- Choice generation produces four unique choices when the pool is large enough.
- A word is excluded when its syllable string has fewer than 2 or more than 4 parts.
- A word is excluded when unique distractors are insufficient.
- Distractors never duplicate the correct syllable.

Integration verification should cover:

- Home card appears after `Skladaj`.
- `/complete-syllable` route opens the lobby.
- Starting a round shows emoji, syllable slots, one blank, and four answer tiles.
- Prompt and replay play the full word audio only.
- Wrong tap plays selected syllable plus retry audio.
- Correct tap fills the blank and shows the completed word in the success overlay.
- Failure reveals the completed word.
- Session completion appears after five rounds.
- Back navigation clears pending timers and stops audio.

## Decisions

- Game name: `Doplň slabiku`
- Prompt: emoji plus syllable slots with one blank
- Missing position: any syllable position
- Prompt audio: full word only
- Wrong answer: selected syllable plus retry phrase
- Distractors: existing derived syllable pool
- V1 settings: no new game-specific settings
