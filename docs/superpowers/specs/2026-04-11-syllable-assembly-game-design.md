# Syllable Assembly Game — Design Spec

**Date:** 2026-04-11
**Status:** Approved

---

## Overview

Introduce a new syllable assembly game where the child hears a target word, sees its picture, and assembles the word from shuffled syllable tiles.

This game is intentionally more active than the existing syllables and words games:
- the child must sequence syllables, not just recognize them
- the interaction supports both tap-to-place and drag-and-drop
- the game shows only picture + audio before success, not the written full word

This is a bespoke game, not a `FindItGame<T>` variant, because it uses slots, a tray of movable tiles, and whole-board answer validation instead of single-tap target selection.

---

## Game Mechanic

**"Listen to the word, then build it from syllables."**

- On round start, the app plays the target word audio
- The child sees the target picture/emoji
- Empty slots appear in the middle of the screen, one slot per syllable
- Shuffled syllable tiles appear in a tray below the slots
- The child can:
  - tap a tray tile to place it into the next empty slot
  - drag a tray tile into a specific slot
  - tap a placed tile to return it to the tray
- When all slots are filled, the game automatically checks the answer
- If the order is correct, show success feedback and advance to the next round
- If the order is wrong, show gentle failure feedback but keep the board editable so the child can fix it

No submit button in v1. Filling the final slot triggers validation automatically.

---

## UX Goals

- Prefer low frustration over mechanical precision
- Support touch-first tablet play
- Make tap-to-place the easiest path
- Keep the cognitive load on syllable ordering, not on remembering the prompt
- Reinforce spoken-word to syllable structure mapping

This means:
- replay audio is always available
- the target picture stays visible throughout the round
- the full written word is hidden until success
- wrong attempts do not wipe the board

---

## Round Flow

### 1. Round start

- Pick a target word from the eligible assembly word pool
- Avoid immediately repeating the previous target when possible
- Show:
  - large emoji / illustration target
  - replay audio button
  - fixed row of empty slots
  - shuffled syllable tray
- Auto-play the target word audio once at round start

### 2. In-progress interaction

- Tap on tray tile:
  - place into the next empty slot
- Drag tray tile:
  - allow dropping into any empty slot
- Tap on placed tile:
  - remove from slot and return it to the tray

Optional implementation detail:
- drag reordering between filled slots is out of scope for v1
- to change order, the child removes a placed tile and places it again

### 3. Validation

- Validation runs automatically when all slots are filled
- If all placed syllables match the target syllable sequence:
  - lock interaction
  - play success flow
- If any placed syllable is incorrect:
  - keep the board visible
  - play a gentle retry message
  - allow the child to continue editing

### 4. Success

- Show `SuccessOverlay`
- Echo line shows the syllabified word with emoji, for example:
  - `ja-ho-da 🍓`
- After praise, replay the full target word audio
- Advance automatically to the next round

### 5. Session completion

- Follow the same shared session-length convention as other games unless implementation pressure suggests otherwise
- Default target: 5 successful rounds per session

---

## Prompt and Feedback

### Before success

Visible:
- picture / emoji
- empty or filled syllable slots
- syllable tray
- replay button

Hidden:
- full written word
- syllabified written word

### Audio behavior

Round start and replay button:
- play the full target word audio, for example `words/jahoda`

Wrong full arrangement:
- play a short gentle retry phrase such as `Skús to znova.`
- do not reveal the answer

Success:
- praise audio from existing praise flow
- then replay the target word audio

### Visual feedback

Recommended:
- placed tile snaps cleanly into slot
- correct completion triggers confetti / celebration via shared success overlay
- wrong full arrangement triggers subtle shake or bounce on the slots row, not a harsh error state

---

## Content Rules

### Source of truth

Use `WORD_ITEMS` from `src/shared/contentRegistry.ts`.

### Eligible words for v1

Include only words that:
- have 2 or 3 syllables
- have a complete `syllables` breakdown in the existing dictionary
- have an emoji
- have a usable `audioKey`

Exclude 4+ syllable words in v1 to keep the mechanic approachable.

### Tile generation

For a target word:
- split `word.syllables` by `-`
- preserve original order as the correct answer
- shuffle the syllables for tray presentation

No distractor syllables in v1.

---

## Interaction Model

### Tap-to-place

Tap-to-place is the primary interaction model.

Behavior:
- tapping a tray tile fills the next empty slot from left to right
- if no slots are empty, tapping does nothing

Why:
- more reliable for young children
- easier on touch devices
- preserves the "build the word" feeling without fine-motor frustration

### Drag-and-drop

Drag-and-drop is also supported.

Behavior:
- tray tile can be dragged into a specific empty slot
- dropping onto a filled slot is rejected in v1
- dropping outside a slot returns the tile to the tray

Why:
- matches the expected play fantasy of assembling tiles
- gives more direct control to children who enjoy dragging

### Removing placed tiles

Placed tiles are removable.

Behavior:
- tapping a placed tile sends it back to the tray
- returned tiles keep their identity and become available again

This is the main correction path after a wrong full arrangement.

---

## Failure and Attempt Policy

Unlike `FindItGame`, this game should not use a strict "3 wrong taps then failure overlay" model in v1.

Recommended policy:
- track wrong full-board validations for analytics / future tuning if needed
- do not hard-fail the round after a fixed number of mistakes
- keep the experience open-ended and self-correcting

Rationale:
- sequencing tasks are more exploratory than recognition tasks
- forcing a fail state too early risks frustration
- the child already has to do more work per round than in the grid games

If a failure cap is desired later, it can be added after observing real use.

---

## Proposed Component Shape

### Main component

- `src/games/assembly/AssemblyGame.tsx`

### Suggested state

```ts
type AssemblySlot = {
  syllable: string | null;
};

type RoundState = {
  targetWord: Word;
  correctSyllables: string[];
  traySyllables: string[];
  placedSyllables: (string | null)[];
  status: 'playing' | 'checking' | 'success';
  wrongValidations: number;
};
```

### Core behaviors

- `startNewRound()`
- `handleTrayTileTap(syllable: string)`
- `handleTileDrop(syllable: string, slotIndex: number)`
- `handlePlacedTileTap(slotIndex: number)`
- `validateBoardIfComplete()`

This game owns its own loop similarly to `CountingItemsGame`.

---

## Shared Type and Catalog Changes

Expected implementation changes:

- add a new `GameId` entry for the assembly game
- add a new game definition in `src/shared/gameCatalog.tsx`
- add a route in `src/App.tsx`
- add lobby metadata and home card content

Recommended display copy:
- title: `Skladaj slabiky`
- short description: `Poskladaj slovo zo slabík`

Final naming can still change during implementation if a better child-facing label emerges.

---

## Out of Scope

Not part of v1:
- distractor syllable tiles
- 4+ syllable target words
- showing the written word before success
- drag-to-reorder already placed tiles
- per-game difficulty settings
- custom content authoring
- analytics instrumentation

---

## Acceptance Criteria

- A new game route exists for syllable assembly
- Each round plays a target word and shows its picture
- The child can complete the round using only tap-to-place
- The child can also drag a tray tile into an empty slot
- The child can remove placed tiles and try again
- The board auto-validates when the final slot is filled
- Wrong full arrangements do not reveal the answer and do not reset the board
- Success shows the shared overlay with a syllabified echo line and target emoji
- The game advances through a normal multi-round session

---

## Implementation Notes

- Reuse existing word audio from `public/audio/words/`
- Reuse existing success/session overlays where possible
- Keep the first implementation visually simple and large-touch-target focused
- Prioritize robust touch behavior over fancy drag interactions

If drag-and-drop proves flaky on mobile, tap-to-place remains the required accessibility path and drag support can stay best-effort rather than blocking release.
