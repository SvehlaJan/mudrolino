---
paths:
  - "src/games/**/*.{ts,tsx}"
  - "src/shared/components/{FindItGame,SuccessOverlay,FailureOverlay,SessionCompleteOverlay}.tsx"
  - "src/shared/{contentRegistry.ts,gameCatalog.tsx,gameModuleRegistry.tsx,gamePlayability.ts,types.ts}"
---

# Games

Eleven games: alphabet, syllables, numbers, words (the shared grid loop), and
counting, compare, addition, first letter, syllable assembly, missing syllable,
missing letter (bespoke).

## Shared grid loop

`FindItGame.tsx` runs alphabet, syllables, numbers, and words. Each supplies a
`GameDescriptor<T>` defining item identity, rendering, prompts, wrong-answer
audio, and overlay content. Reuse it whenever the mechanic is "hear a prompt,
tap one of N tiles".

## Bespoke games

The other seven own their round loops because a single-tap grid does not fit.
All but counting keep their round, answer, or audio rules in a sibling
`*Logic.ts` module with a matching `.verify.ts`:

- `counting/CountingItemsGame.tsx` — count scattered emoji, then pick the number. The loop lives in the component; `countingGridLogic.ts` only lays out the emoji.
- `compare/CompareQuantitiesGame.tsx` — pick the side with more.
- `addition/AdditionGame.tsx` — pick the sum of two numbers.
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

A game's settings are declared as `SettingId`s on its `GAME_DEFINITIONS` entry
in `gameCatalog.tsx`; each ID's control, validation, and dependency logic lives
once in `src/shared/settings/settingsRegistry.ts`. `src/parent/` renders them —
`SettingsRenderer` maps a game's IDs through `SettingField` — in the Parent area's
drill-down only (Home gear, Parent gate, Nastavenia hier, `/settings/games/:gameId`).
A game screen has no settings shortcut. To add a per-game setting, add its ID to
the game's `settings` array and a definition to `SETTINGS_REGISTRY`; no per-game
UI code is needed.

## Adding a game

1. Create `src/games/<name>/`, keeping round and answer rules in a `*Logic.ts` with a `.verify.ts`.
2. Reuse `FindItGame<T>` via a `GameDescriptor<T>` if the mechanic fits; otherwise own the loop like the other bespoke games.
3. Use the shared answer-audio helpers so the game matches the audio contract.
4. Add it to `GAME_DEFINITIONS` in `gameCatalog.tsx` and its lazy module to `gameModuleRegistry.tsx`. `App.tsx` builds every route from `GAME_DEFINITIONS` (rendered by `GameRoute`), and the Home card links to it, so neither needs hand-wiring.
5. If the game needs words or letters to ask anything, add its rule to `getUnplayableReason` in `gamePlayability.ts`, with the reason as a `msg('…')` string and its Czech translation in `cs.ui.ts`. Without a rule an empty pool opens a game that cannot ask.
6. Add the route to `e2e/smoke.spec.ts`, plus an oracle hook and golden-path spec if no shared spec covers it. Enter the game in specs with `startGame` (see `e2e.md`).
7. Update `ROADMAP.md` if it changes scope or delivery status.
