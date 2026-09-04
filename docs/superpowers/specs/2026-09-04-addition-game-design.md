# Simple Addition Game ("Sčítaj") Design

## Summary

The planned follow-up to Compare Quantities (`docs/superpowers/specs/2026-09-02-compare-quantities-game-design.md`, shipped 2026-09-03): the child sees two small groups of objects (or two numerals, depending on a settings-controlled representation mode), separated by a "+", and taps the numeral matching their combined total from a row of answer options. This is the first of an anticipated small family of arithmetic games (subtraction is the next likely candidate), so this design deliberately extracts the two pieces that are genuinely, immediately reusable — without speculatively abstracting the parts that would differ per operation.

## Game Mechanics (v1)

- **Problem generation:** pick a target sum `S` uniformly from `[2, sumRange]` (the configured `additionSumRange`), then split it into two addends: `a` random in `[1, S-1]`, `b = S - a`. This gives even coverage across the whole configured range — the same "1 up to N" ceiling semantics every other range setting in the app already uses.
- **Prompt:** two scattered object clusters (or two big numerals, in `'numerals'` mode) separated by a "+", e.g. `🍎🍎 + 🍎🍎🍎`. Audio prompt: "Koľko je dokopy?" ("How many are there together?").
- **Answer grid:** 4 numeral tiles (the correct sum + 3 distractors drawn from nearby numbers), `MAX_ROUNDS = 5`, `MAX_ATTEMPTS = 3` before a `FailureOverlay` reveals the answer — identical retry semantics to every `FindItGame`-based game and to `CountingItemsGame`, so the "how many tries do I get" feel is consistent app-wide.
- **No-repeat guard:** the same pair-key idea Compare uses, applied to the addend pair, so the same problem doesn't repeat back-to-back.
- **Success echo:** following Compare's shipped evolution (a spoken "5 je viac ako 2" sentence), Addition plays a spoken echo on success too — "2 a 3 je dokopy 5" — with its own locale-prefixed audio path and TTS fallback.

## Why Bespoke, Not `FindItGame`

Superficially this looks like `FindItGame`'s shape (prompt → tap 1 of N tiles → forgiving retry → reveal on failure). It isn't a fit: `GameDescriptor<T>` uses **one** type `T` for both the prompt/target and every tile in the answer grid — sound for alphabet/syllables/numbers/words, where a distractor is genuinely the same kind of thing as the target. Here it isn't: the target is a *problem* (two addends), but the grid tiles are *plain numerals* (candidate sums). Forcing both into one type would mean generating a throwaway fake addend-pair for every distractor tile just to satisfy the shape.

**Decision:** a bespoke component, `src/games/addition/AdditionGame.tsx`, hand-rolling the same forgiving-retry loop `FindItGame` provides elsewhere. Per this repo's convention (`.claude/rules/games.md`), round/answer rules live in a sibling `src/games/addition/additionLogic.ts` with a matching `.verify.ts` — pure, testable, no rendering.

## Extensibility for Future Arithmetic Games

The user flagged that follow-up arithmetic games (subtraction, etc.) are likely. Two pieces are extracted now because they are *concretely, immediately* reusable — not because of speculative generality:

1. **Scatter-layout logic relocates out of `games/compare/`.** `generateCompareGridSlots`/`CompareGridSlot`/`COMPARE_GRID_TOTAL_SLOTS` (the 12-slot collision-free scatter layout with random rotation/offset) currently lives under a specific game's folder. Addition needs the exact same utility for its two clusters; importing it from `games/compare/` would be an odd cross-game dependency. It moves to `src/shared/utils/scatterGridLogic.ts` unchanged (same function, same `.verify.ts` semantics, just relocated), and Compare's import updates accordingly. Any future game gets it for free.
2. **A small shared presentational component, `src/shared/components/QuantityCluster.tsx`**, renders either a scattered object cluster (count + emoji, via the relocated scatter logic) or a big numeral, depending on mode. Addition needs this rendering twice per round (once per addend) regardless of future games — extracting it once avoids duplicating that JSX inline, and a future Subtraction/Multiplication game reuses it unchanged.

What is **deliberately not** abstracted yet:
- **`additionLogic.ts` stays addition-specific.** A future Subtraction game has real differences (avoiding negative results, minuend ≥ subtrahend ordering) that would make a shared "generic arithmetic generator" premature and likely wrong-shaped. It should stay a clean, easy-to-copy *pattern* (small pure functions: pick problem, generate distractors, no-repeat guard) that `subtractionLogic.ts` can mirror later. Real shared logic gets extracted once a second operation shows genuine duplication, not before.
- **Settings stay per-game** (`additionSumRange`, `additionRepresentation`), not a shared "arithmetic settings" object — mirrors how `numbersRange`/`countingRange`/`compareRange` are already independent per-game settings despite being conceptually related. A parent may reasonably want a different range for addition than for a future subtraction game.

## Settings

New `GameSettings` fields:

```ts
additionSumRange: 5 | 10 | 20 | 100;       // default 5
additionRepresentation: 'objects' | 'numerals'; // default 'objects'
```

- `additionSumRange`: a 4-option range picker (`SegmentedChoice` already supports up to 4 columns — direct reuse, no new component).
- `additionRepresentation`: a 2-option tile picker, same `SegmentedChoice` component, reusing the **exact same value vocabulary as Compare's `compareMode`** (`'objects' | 'numerals'`, labeled "Predmety" / "Čísla") rather than a second vocabulary for the same concept.
- **Constraint:** `'objects'` mode is only available when `additionSumRange` is 5 or 10 (individual objects stop being sensible to render/count much beyond that). When `additionSumRange` changes to 20 or 100 while representation is `'objects'`, the settings-update handler auto-switches representation to `'numerals'` (storage is always self-consistent — no fallback checks needed at read time in game logic). The "Predmety" tile is greyed out (present but unselectable) whenever range is 20 or 100.
- This constraint needs one small, generically useful addition to the shared `SegmentedChoice` component (`src/shared/ui/FormControls.tsx`): an optional `disabledOptions` prop, rendering the matching `ChoiceTile` with `disabled` (reusing `ChoiceTile`'s existing disabled visual, the same one Compare's wrong-pile already uses) instead of making the option vanish.

## Game 1 Retrofit — `compareMode` Toggle → Tile Picker

Small, behavior-neutral UI change bundled into the same implementation work: `SettingsContent.tsx`'s Compare Quantities section currently uses `ToggleControl` for `compareMode`. Since `SegmentedChoice` already renders exactly the desired two-option tile row, it replaces `ToggleControl` there — same settings field, same stored values (`'objects' | 'numerals'`), just a visually consistent control with what Addition now uses for the identical concept.

## Content & Audio

- New audio phrase, `howManyTogether`: "Koľko je dokopy?" — added to `AudioPhraseKey`, `sk.ts`, and `cs.ts`, same TTS-fallback pattern as every other phrase. Expect the same one-time `test:audio` gap as `whereIsMore` did, until recorded.
- Correct/wrong answer audio reuses the shared `getItemAnnouncementAudio`/`getWrongAnswerAudio` helpers for the `'numbers'` category — no new audio plumbing, matches the app-wide answer-audio contract (item's own audio first, then verdict).
- Success echo audio: a new locale-prefixed path per problem (mirroring Compare's `compare/<n>-je-viac-ako-<m>` pattern), e.g. `addition/<a>-a-<b>-je-<sum>`, with a TTS fallback sentence — not pre-recordable per-combination, relies entirely on TTS in practice (same as Compare's comparison sentences do today).

## Architecture & Registration

Files touched, following the established "adding a game" checklist (`.claude/rules/games.md`):

1. `src/shared/utils/scatterGridLogic.ts` — relocated from `src/games/compare/compareGridLogic.ts` (with its `.verify.ts`); `CompareQuantitiesGame.tsx`'s import updates.
2. `src/shared/components/QuantityCluster.tsx` — new shared presentational component.
3. `src/games/addition/additionLogic.ts` + `.verify.ts` — problem generation, distractor generation, no-repeat guard.
4. `src/games/addition/AdditionGame.tsx` — the bespoke component.
5. `GameId` gets `'ADDITION'`; `GameSettings` gets `additionSumRange`/`additionRepresentation` (`src/shared/types.ts`).
6. Defaults + validation in `src/shared/services/settingsService.ts`, including the range→representation auto-switch on write.
7. `SETTINGS_VISIBILITY`/`SETTINGS_SUBTITLES` entries (`settingsContentData.ts`) and the settings UI section (`SettingsContent.tsx`), including the `compareMode` retrofit above.
8. `SegmentedChoice`'s new `disabledOptions` prop (`src/shared/ui/FormControls.tsx`).
9. Lobby metadata entry in `gameCatalog.tsx`, route + home card in `App.tsx`.
10. `e2e/smoke.spec.ts` route entry, oracle hook via `window.__E2E__`, and a golden-path spec (this game doesn't fit the shared `FindItGame` oracle any more than Compare did).
11. `ROADMAP.md`: mark this game done in the "Future Game Backlog" section once shipped.

## Edge Cases

- Range guard: if the number pool can't produce a valid problem for the configured range (shouldn't happen for any of the 4 fixed options, but defensive nonetheless), fall back the same way Compare's `availableItems` guard does.
- Distractor generation must avoid duplicate values and avoid accidentally reusing the correct sum as a distractor.
- `additionSumRange` of 100 with `'numerals'` mode can produce two-and-three-digit numeral tiles — the numeral tile's font sizing needs a lower clamp so 3-digit sums stay legible at the same tile size as single-digit ones (existing `font-spline` numeral styling already scales via `clamp()`-friendly Tailwind sizes elsewhere in the app; reuse that approach rather than a fixed size).

## Deferred: Future Arithmetic Games

Subtraction (and any further arithmetic game) is anticipated but not designed here. It would follow the same shape (bespoke component, own `*Logic.ts`, reusing `scatterGridLogic.ts` and `QuantityCluster.tsx`, its own settings pair) and gets its own brainstorming session when it's actually taken up.
