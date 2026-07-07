# Prvé písmenko Game Design

## Summary

Add a seventh mini-game, **Prvé písmenko**, that trains first-letter sound awareness. The child sees only a word emoji, hears the spoken word and question, then chooses the word's first Slovak letter from four letter tiles.

This game is intentionally sound-first. It does not show the written word before the answer. After the child answers, success/failure feedback reveals the written relationship so the child connects the heard word, the picture, and the starting letter.

## Goals

- Add a new literacy skill that is distinct from the existing recognition, matching, counting, and syllable assembly games.
- Reuse existing ready word content, including parent-authored custom words.
- Reuse the existing letter content, letter audio, praise, failure, round counter, and session completion patterns.
- Keep v1 small enough for the friends-first release path.

## Non-Goals

- Do not add last-letter, middle-sound, rhyme, or missing-syllable modes in v1.
- Do not add separate settings for this game in v1.
- Do not require new parent-authored metadata beyond the existing custom word, emoji, syllables, and audio recording flow.
- Do not expose the written word before the child answers.

## Current Game Context

The current games cover:

- **Abeceda**: hear a letter and tap the matching letter.
- **Slabiky**: hear a syllable and tap the matching syllable.
- **Čísla**: hear a number and tap the matching number.
- **Spočítaj**: count visible objects and tap a number.
- **Slová**: read a syllabified word and tap the matching emoji.
- **Skladaj**: assemble a word from syllable tiles.

`Prvé písmenko` fills the gap between word recognition and letter knowledge: the child hears a word, sees its picture, and identifies the first letter/sound.

## Game Flow

Each round:

1. The game chooses an eligible ready word.
2. The prompt area shows only the word emoji, large and centered.
3. The prompt audio plays:
   - word audio clip, for example `sk/words/jahoda`
   - spoken fallback/question text: `Jahoda. Na aké písmenko sa začína?`
4. The child chooses from four letter tiles:
   - one correct first-letter tile
   - three distractor letter tiles from the active letter set
5. Correct answer:
   - show existing success overlay
   - reveal `Jahoda začína na J.`
   - play praise plus the word audio / TTS relationship
6. Wrong answer:
   - use existing wrong-answer behavior where possible
   - say the selected letter and invite retry
7. Failure after max attempts:
   - show existing failure overlay
   - reveal the correct relationship
8. Session completion:
   - use the shared session-complete dialog and praise audio behavior.

## Content Eligibility

The game uses ready words from the active content provider:

- default Slovak words
- parent-authored custom words with `status: "ready"`

The game derives the answer from each word at runtime.

Eligibility rules:

- A word is eligible only if a first Slovak letter can be derived.
- A word is eligible only if that first letter exists in the active letter pool.
- The active letter pool respects the existing alphabet accent setting.
- If accent letters are disabled, words beginning with accented letters are excluded.
- Words with unavailable first letters are excluded from this game only; they can still appear in Words, Syllables, and Assembly if otherwise ready.

## Slovak First-Letter Derivation

Use longest-prefix matching against the active Slovak letter symbols:

1. Normalize the candidate word start to uppercase.
2. Check multi-letter Slovak letters before single-letter letters:
   - `DŽ`
   - `DZ`
   - `CH`
3. If none match, use the first uppercase character.
4. Return a letter only if it exists in the active letter pool.

Examples:

| Word | First Letter |
|------|--------------|
| `Jahoda` | `J` |
| `Žaba` | `Ž` |
| `Chlieb` | `CH` |
| `Džús` | `DŽ` |
| `Dz...` | `DZ` |

## Answer Tiles

V1 uses four answer tiles:

- one correct first letter
- three distractors

Distractors come from the active letter pool and must not duplicate the correct answer. If the active pool is too small for four tiles, the game should reduce the tile count safely rather than crash.

## Visual Design

Home placement:

`Slová` → `Prvé písmenko` → `Skladaj`

Home card:

- Title: `Prvé písmenko`
- Description: `Počúvaj slovo a nájdi prvé písmenko`

Lobby:

- Title: `PRVÉ PÍSMENKO`
- Follow the existing `GameLobby` pattern.

Round screen:

- Top bar follows existing game screens: back, round counter, replay audio.
- Prompt area shows a single large emoji.
- Letter choices use the same large letter tile style as Alphabet.
- No written word appears before answering.

Feedback:

- Success/failure overlays reveal the written relationship:
  - `Jahoda začína na J.`
- The reveal can include the emoji if it fits existing overlay style:
  - `Jahoda začína na J. 🍓`

## Audio Design

Prompt audio:

- Play the word clip first:
  - `{ path: "sk/words/jahoda", fallbackText: "Jahoda" }`
- Then ask the question through an audio phrase if available, or fallback text:
  - `Na aké písmenko sa začína?`

Replay button:

- Replays the same word-plus-question prompt.

Wrong answer audio:

- Follow the existing pattern:
  - `Toto je`
  - selected letter clip
  - `Skús to znova.`

Success audio:

- Praise audio from `SuccessOverlay`
- Then the relationship audio:
  - fallback text: `Jahoda začína na J.`

Failure audio:

- Follow existing failure-overlay style:
  - `Nevadí!`
  - correct relationship fallback text: `Jahoda začína na J.`

New phrase audio can be added later for `Na aké písmenko sa začína?` and `začína na`. V1 may rely on TTS fallback for these relationship sentences if no bundled phrase exists.

## Architecture

Prefer reusing `FindItGame` with a new descriptor and a derived item type.

Proposed new game files:

- `src/games/first-letter/FirstLetterGame.tsx`
  - owns lobby/play state
  - reads content through `useContent()`
  - reads `settings.alphabetAccents`
  - builds eligible derived items
  - passes a descriptor into `FindItGame`
- `src/games/first-letter/firstLetterDescriptor.tsx`
  - describes prompt rendering, letter tile rendering, prompt audio, wrong audio, success/failure specs
- `src/games/first-letter/firstLetterLogic.ts`
  - pure helpers for first-letter derivation, active letter filtering, and eligible item construction
- `src/games/first-letter/firstLetterLogic.verify.ts`
  - focused checks for longest-prefix matching, accent filtering, and eligibility

Shared updates:

- `src/shared/types.ts`
  - add `FIRST_LETTER` to `GameId`
- `src/shared/gameCatalog.tsx`
  - add route/home/lobby metadata between Words and Assembly
- `src/App.tsx`
  - add `/first-letter` route
- `README.md`
  - update game count and game list
- `ROADMAP.md`
  - add the game to current/future release status once implemented

## Empty State

If there are not enough eligible words or active letters, the game should show the same friendly empty-state pattern used by Words/Syllables/Assembly:

- clear parent-facing explanation
- back button
- no crash

Suggested text:

`Žiadne slová pre túto hru`

`Pridajte alebo nahrajte slová, ktoré začínajú dostupnými písmenkami.`

## Testing

Focused logic verification:

- `Jahoda` derives `J`
- `Žaba` derives `Ž`
- `Chlieb` derives `CH`
- `Džús` derives `DŽ`
- `DZ...` derives `DZ`
- accented first letters are excluded when accent setting is off
- words with first letters missing from the active letter pool are excluded
- distractor generation never duplicates the correct answer

App verification:

- `npm run lint`
- `npm run build`
- browser smoke test for the new route on mobile and desktop
- verify one round can be played
- verify replay button repeats the word/question prompt
- verify session complete still returns to the lobby/home like other games

## Open Follow-Ups

These are explicitly out of v1:

- Add missing recorded phrase clips for first-letter question/relationship sentences.
- Add a harder sound-only mode that omits the spoken word from the prompt and requires replay.
- Add `last letter` or `middle sound` variants.
- Add `Doplň slabiku` and `Ktoré chýba?` as separate future games from the backlog.
