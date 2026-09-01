---
paths:
  - "src/games/**/*.{ts,tsx}"
  - "src/shared/components/{FindItGame,SuccessOverlay,FailureOverlay,SessionCompleteOverlay,GameLobby}.tsx"
  - "src/shared/{contentRegistry.ts,gameCatalog.tsx,types.ts}"
---

# Games

Nine games: alphabet, syllables, numbers, counting, words, first letter,
syllable assembly, missing syllable, missing letter.

## Shared grid loop

`FindItGame.tsx` runs alphabet, syllables, numbers, and words. Each supplies a
`GameDescriptor<T>` defining item identity, rendering, prompts, wrong-answer
audio, and overlay content. Reuse it whenever the mechanic is "hear a prompt,
tap one of N tiles".

## Bespoke games

The other five own their round loops because a single-tap grid does not fit.
All but counting keep their round, answer, or audio rules in a sibling
`*Logic.ts` module with a matching `.verify.ts`:

- `counting/CountingItemsGame.tsx` — count scattered emoji, then pick the number. No logic module; the loop lives in the component.
- `first-letter/FirstLetterGame.tsx` — hear a word, pick its first Slovak letter unit.
- `assembly/AssemblyGame.tsx` — order shuffled syllable tiles into the word.
- `complete-syllable/CompleteSyllableGame.tsx` — pick the one missing syllable.
- `complete-letter/CompleteLetterGame.tsx` — fill missing letter units in guided order.

## Answer audio

Build success audio with `getSuccessOverlayAudioSpec()` in
`successOverlayAudio.ts`, which appends praise after the `SuccessSpec` clips, and
wrong-answer audio with `getWrongAnswerAudio()` in `contentRegistry.ts`, which
appends the shared retry phrase after the item's own clip. Assembly keeps its
bespoke `assemblyAudioLogic.ts` and a fixed praise clip; leave it alone.

## Settings

There are no per-game settings overlays. `SettingsContent.tsx` renders every
section and `SETTINGS_VISIBILITY` in `settingsContentData.ts` maps each target
(`home` or a `GameId`) to the sections it shows. It is presented as an in-game
`SettingsOverlay` and as the `/settings` screen behind the parent gate. To add a
per-game setting, add a flag to `SETTINGS_VISIBILITY` and a section to
`SettingsContent`.

## Adding a game

1. Create `src/games/<name>/`, keeping round and answer rules in a `*Logic.ts` with a `.verify.ts`.
2. Reuse `FindItGame<T>` via a `GameDescriptor<T>` if the mechanic fits; otherwise own the loop like the other bespoke games.
3. Use the shared answer-audio helpers so the game matches the audio contract.
4. Add it to `GAME_DEFINITIONS` in `gameCatalog.tsx` and add the route in `App.tsx`.
5. Add the route to `e2e/smoke.spec.ts`, plus an oracle hook and golden-path spec if no shared spec covers it.
6. Update `ROADMAP.md` if it changes scope or delivery status.
