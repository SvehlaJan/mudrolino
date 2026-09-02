# Compare Quantities Game ("Viac alebo Menej") Design

## Summary

A new game for the 3-year-old target user, who can rote-count to 20 and reliably counts small groups of objects (the existing Counting game), but whose grasp of cardinality/magnitude ("5 is more than 2") isn't confirmed yet. This game builds that specific skill: each round shows two groups of objects side by side, and the child taps the one with **more**. It's the first of a planned two-step sequence — this game (quantity comparison) now, **Simple Addition with Objects** (combine two small groups, tap the matching numeral) as a follow-up game to be brainstormed and spec'd separately once this one ships.

## Game Mechanics (v1)

- Each round picks two **distinct** random values from the configured range and renders each as a pile of emoji objects (reusing `COUNTING_EMOJIS`), laid out side by side as two tappable `Card`s — not a scattered layout like Counting, just left/right.
- Prompt (audio + text): "Kde je viac?" (Where is more?). **Only "more" in v1** — not alternating with "fewer" — to keep the first version to one consistent question. Asking "fewer" too is a natural v2 addition (setting or per-round randomization), deferred for now.
- **Correct tap:** immediate success — the tapped pile's value is announced (mirroring the existing "immediate correct-answer announcement" pattern from `getItemAnnouncementAudio`, see `docs/superpowers/specs/2026-07-09-immediate-answer-audio-design.md`), then `SuccessOverlay` (praise, confetti).
- **Wrong tap:** the wrong pile dims/shakes with a gentle nudge (reusing `getWrongAnswerAudio`) and becomes non-tappable. The correct pile stays live. The child taps it himself to finish the round with a win.
- **No `FailureOverlay`, no attempt counter, no session-fail path.** With only two choices, a wrong tap already narrows it to one remaining (correct) option — every round always resolves to a win, sometimes after one gentle nudge. This is a deliberate divergence from `FindItGame`'s `maxAttempts`/failure-overlay model.
- Session structure matches every other game: 5 rounds (`MAX_ROUNDS`), `RoundCounter`, `SessionCompleteOverlay`.

## Why Bespoke, Not `FindItGame`

`FindItGame` assumes an N-choice grid with attempt-counted failure (`maxAttempts` → `FailureOverlay`) and uniform tile rendering. This game's mechanic — exactly two choices, wrong pile disables while the correct one stays live, every round ends in success — doesn't fit that model and isn't worth generalizing the shared engine for (one new shape, YAGNI). It follows the same precedent as `CountingItemsGame` and `AssemblyGame`: a bespoke component reusing shared primitives (`AppScreen`, `Card`, `ChoiceTile`, overlays, `GameLobby`) but owning its own round state machine.

## Settings

New `GameSettings` fields (`src/shared/types.ts`):

```ts
compareRange: { start: number; end: number }; // default { start: 1, end: 5 }, selectable end: 5 | 10 — mirrors countingRange
compareMode: 'objects' | 'numerals';          // default 'objects'
```

- `compareRange`: same UI pattern as the existing counting-range picker in `SettingsContent.tsx` (5/10 buttons), defaulted and validated in `settingsService.ts` the same way as `numbersRange`/`countingRange`.
- `compareMode`: a toggle in the same settings section. `'objects'` (default) renders emoji piles as described above. `'numerals'` renders each side as a big numeral card instead (same visual language as the Numbers game's card) — everything else (prompt, tap/dim/self-correct flow) is identical. This mode exists because comparing two printed numerals ("7" vs "3") is a different, useful skill (magnitude-from-symbol) once object comparison is solid, but it skips the concrete "why" — hence default off.

## Content & Audio

Minimal new content needed:
- One new phrase: `phrases/kde-je-viac` ("Kde je viac?"), with a TTS fallback string so it works even unrecorded.
- Reuses existing number audio clips (1–10, already recorded/TTS-covered for the Numbers game) for pile-value announcements.
- Reuses `COUNTING_EMOJIS` for object piles — no new emoji set.
- Reuses `getWrongAnswerAudio` for the wrong-tap nudge — no new audio needed.

## Architecture & Registration

New bespoke component `src/games/compare/CompareQuantitiesGame.tsx`, mirroring `CountingItemsGame`'s HOME/PLAYING state shape but simpler (two fixed piles, not a scattered layout). Registration follows the existing "adding a new grid-based game" checklist in `CLAUDE.md`, adapted for a bespoke (non-`FindItGame`) game:

1. `GameId` union gets `'COMPARE_QUANTITIES'` (`src/shared/types.ts`).
2. Defaults + validation for `compareRange`/`compareMode` in `src/shared/services/settingsService.ts`.
3. Lobby metadata entry (title "Viac alebo Menej", icon, colors, decorations) in `src/shared/gameCatalog.ts`.
4. Route (`/compare`) + home-screen card in `src/App.tsx`.
5. Settings UI additions in `src/shared/components/SettingsContent.tsx` (range picker + mode toggle), no new settings-overlay component needed — consistent with how numbers/counting ranges are handled inline there today.
6. `e2e/smoke.spec.ts` route entry.
7. A small oracle hook via `window.__E2E__` (`setE2EState()`) exposing the current round's correct value/side, plus a golden-path spec — this game doesn't fit `FindItGame`, so it needs its own spec file rather than folding into `find-it-games.spec.ts`.

## Edge Cases

- Range guard: if `compareRange` can't produce two distinct values (shouldn't happen with the 1–5 default, but defensive nonetheless), reuse the same fallback pattern already established for other games' "pool size = 1" fixes (see `ROADMAP.md` bug B4).
- Avoid repeating the exact same pair twice in a row, same spirit as other games' shuffle/queue logic.

## Deferred: Follow-up Game

**Simple Addition with Objects** (see brainstorming discussion) is the planned next step after this game ships: two small object groups (e.g. 2 apples + 1 apple), child counts the combined total and taps the matching numeral. Not designed here — tracked as a `ROADMAP.md` follow-up item, to be brainstormed as its own spec once quantity comparison is in the child's hands and validated.
