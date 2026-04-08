# Backlog

Generated 2026-03-29 from codebase analysis.

---

## Critical Bugs

| # | Issue | Location |
|---|-------|----------|
| ~~B1~~ | ~~Music toggle does nothing~~ — `updateSettings` now properly plays/pauses `musicAudio` | ✅ |
| ~~B2~~ | ~~Counting game uses hardcoded color string~~ — fixed, now uses `COLORS` constant | ✅ |
| ~~B3~~ | ~~30 confetti elements in SuccessOverlay animate infinitely~~ — confetti no longer uses `repeat: Infinity`, animates once and stops | ✅ |
| ~~B4~~ | ~~`startNewRound` infinite loop risk~~ — `FindItGame` uses `targetItemRef` pattern to break circular dependency | ✅ |
| ~~B5~~ | ~~Console.log left in production code~~ — removed | ✅ |

---

## High Priority

| # | Issue | Location |
|---|-------|----------|
| ~~H1~~ | ~~No settings persistence~~ — persisted to `localStorage` via `settingsService`, merge-with-defaults on load | ✅ |
| ~~H2~~ | ~~No error boundaries~~ — `ErrorBoundary` component exists and wraps all games in `App.tsx` | ✅ |
| ~~H3~~ | ~~`FindItGame` allows too few distractors~~ — `effectiveGridSize = Math.min(gridSize, pool.length)` applied | ✅ |
| ~~H4~~ | ~~`@google/genai` installed but unused~~ — uninstalled, 37 packages removed | ✅ |
| ~~H5~~ | ~~SYLLABLE_CONSONANTS missing diacritical letters~~ — `SYLLABLE_ITEMS` now derived from `WORD_ITEMS` which includes ž, š, ň, ľ etc. | ✅ |
| ~~H6~~ | ~~SuccessOverlay `onComplete` fires even when component unmounts~~ — timer already cleaned up via effect cleanup | ✅ |
| ~~H7~~ | ~~No ESLint/Prettier configured~~ — ESLint configured with `typescript-eslint`, `react-hooks`, `react-refresh`; 0 errors | ✅ |

---

## Features / UX

| # | Issue | Location |
|---|-------|----------|
| ~~F1~~ | ~~No progress/round counter~~ — `✓ X / Y` pill in all games; `SessionCompleteOverlay` with star rating after last round | ✅ |
| ~~F2~~ | ~~No replay button for audio in Numbers/Counting games~~ — added `Volume2` button to `CountingItemsGame` (Numbers already had one) | ✅ |
| ~~F3~~ | ~~No difficulty setting for Alphabet/Syllables~~ — per-game settings overlays with grid size selector (4/6/8 for Alphabet, 4/6 for Syllables) | ✅ |
| ~~F4~~ | ~~Counting game shows answer options immediately~~ — `TIMING.COUNTING_OPTIONS_DELAY_MS = 2000` used; `showOptions` state controls display | ✅ |
| ~~F5~~ | ~~EMOJIS array in CountingItemsGame hardcoded~~ — exported as `COUNTING_EMOJIS` from `contentRegistry.ts` | ✅ |
| ~~F6~~ | ~~`WORD_ITEMS` exported but empty~~ — populated with 44 Slovak words | ✅ |
| ~~F7~~ | ~~Mobile safe-area padding missing~~ — `safe-top/left/right` CSS utilities added; all corner buttons updated across all games | ✅ |
| ~~F8~~ | ~~No audio files — TTS-only mode not documented~~ — audio files present in `public/audio/` (letters, numbers, phrases, praise) | ✅ |

---

## Architecture / Refactor

| # | Issue | Location |
|---|-------|----------|
| ~~A1~~ | ~~~70% code duplication across game components~~ — Alphabet, Syllables, Numbers all delegate to shared `FindItGame` via descriptors; CountingItems intentionally different | ✅ |
| A2 | **Game registry must be manually synced** — `GAMES` array in `App.tsx` and the `activeGame` render switch are separate and can diverge | `App.tsx:29-65, 194-281` |
| ~~A3~~ | ~~Magic numbers throughout~~ — extracted to `TIMING` constants in `contentRegistry.ts`, applied across all 5 files | ✅ |
| A4 | **Range filtering duplicated** between NumbersGame and CountingItemsGame | Both files |
| A5 | **`AudioManager` has 3 responsibilities** — file playback, TTS fallback, template resolution; should be split | `audioManager.ts` |

---

## Accessibility

| # | Issue | Location |
|---|-------|----------|
| AC1 | **No keyboard navigation** — no arrow key / Enter / Space support on game grids | All games |
| AC2 | **No ARIA labels** on any game buttons — screen readers get no context | All games |
| AC3 | **Emoji in SuccessOverlay has no text alternative** | `SuccessOverlay.tsx` |

---

## Quick Wins (easiest ROI)
~~B2, B5, H4, H6, F2, F6, A3, B1, B3, B4, H2, H5, F4, F8, A1~~ — all done ✅

## Highest Impact
~~H1, B1, H5, A1, H3, F1, F3~~ ✅ — remaining: **H7** (ESLint), **A2** (game registry unification), **F5** (emoji list in contentRegistry)
