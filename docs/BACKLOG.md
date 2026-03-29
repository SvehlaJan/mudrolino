# Backlog

Generated 2026-03-29 from codebase analysis.

---

## Critical Bugs

| # | Issue | Location |
|---|-------|----------|
| B1 | **Music toggle does nothing** — `audioManager.updateSettings()` ignores all settings; music setting is wired up but has zero effect | `audioManager.ts:58`, `App.tsx:73` |
| ~~B2~~ | ~~Counting game uses hardcoded color string~~ — fixed, now uses `COLORS` constant | ✅ |
| B3 | **30 confetti elements in SuccessOverlay animate infinitely** (`repeat: Infinity`) — never cleaned up, keeps running in background after overlay hides | `SuccessOverlay.tsx:47-55` |
| B4 | **`startNewRound` infinite loop risk** — all games: callback depends on `targetItem`, which it also sets; edge case with pool size 1 | All game files |
| ~~B5~~ | ~~Console.log left in production code~~ — removed | ✅ |

---

## High Priority

| # | Issue | Location |
|---|-------|----------|
| H1 | **No settings persistence** — number range, counting range, music toggle reset on every page reload | `App.tsx` |
| H2 | **No error boundaries** — any JS error crashes entire app with no recovery | Entire app |
| H3 | **Alphabet game allows too few distractors** — if pool shrinks below 8, `slice(0, 7)` silently returns fewer; no guard | `AlphabetGame.tsx:37` |
| ~~H4~~ | ~~`@google/genai` installed but unused~~ — uninstalled, 37 packages removed | ✅ |
| H5 | **SYLLABLE_CONSONANTS missing diacritical letters** (ň, š, ž, etc.) — Slovak syllables like ŠA, ŽE not in the game | `contentRegistry.ts:73` |
| ~~H6~~ | ~~SuccessOverlay `onComplete` fires even when component unmounts~~ — timer already cleaned up via effect cleanup | ✅ |
| H7 | **No ESLint/Prettier configured** — inconsistent code style, no unused import detection | `package.json` |

---

## Features / UX

| # | Issue | Location |
|---|-------|----------|
| F1 | **No progress/round counter** — child and parent have no visibility into session progress | All games |
| ~~F2~~ | ~~No replay button for audio in Numbers/Counting games~~ — added `Volume2` button to `CountingItemsGame` (Numbers already had one) | ✅ |
| F3 | **No difficulty setting for Alphabet/Syllables** — grid size fixed at 8 and 6 respectively; no way to make easier for younger children | `AlphabetGame.tsx`, `SyllablesGame.tsx` |
| F4 | **Counting game shows answer options immediately** — child can guess before counting; needs a short delay | `CountingItemsGame.tsx` |
| F5 | **EMOJIS array in CountingItemsGame hardcoded** — should live in `contentRegistry.ts` | `CountingItemsGame.tsx:20` |
| ~~F6~~ | ~~`WORD_ITEMS` exported but empty~~ — removed | ✅ |
| F7 | **Mobile safe-area padding missing** — buttons at screen edge hidden by browser chrome on phones with notches | All games |
| F8 | **No audio files — TTS-only mode not documented** — `public/audio/` is empty; users don't know TTS is the fallback | `public/audio/` |

---

## Architecture / Refactor

| # | Issue | Location |
|---|-------|----------|
| A1 | **~70% code duplication across 4 game components** — home screen, game loop, feedback handling all identical; extract shared `BaseGame` component | All games |
| A2 | **Game registry must be manually synced** — `GAMES` array in `App.tsx` and the `activeGame` render switch are separate and can diverge | `App.tsx:25-54, 192-252` |
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
~~B2, B5, H4, H6, F2, F6, A3~~ — all done ✅

## Highest Impact
H1 (settings persistence), B1 (music toggle fix), H5 (more Slovak syllables), F1 (progress counter), A1 (deduplicate games)
