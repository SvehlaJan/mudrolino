# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # TypeScript type checking (no emit)
npm run clean     # Remove dist/
```

No test runner is configured.

## Gotchas

- `npm run lint` requires `node_modules` to be present (`npm install` first); `typescript` is a local dep, not global.
- `npm run dev` binds to `0.0.0.0` — the dev server is accessible on the local network, not just localhost.

## Architecture

This is a Slovak-language educational web app ("Hravé Učenie") for preschoolers with 4 mini-games: alphabet, syllables, numbers, and counting.

**Screen state machine** (managed in `App.tsx`): HOME → GAME → PARENTS_GATE → SETTINGS

**Content registry**: `src/shared/contentRegistry.ts` is the single source of truth for all game content — letters (full Slovak alphabet, 46 entries), syllables (60), numbers (1–20). Each item is a typed `ContentItem` with `symbol`, `emoji`, `label`, `audioKey`, and `category`. Letters with TBD emoji/label are scaffolded but excluded from game grids at runtime via `ACTIVE_LETTER_ITEMS`.

**Game pattern**: Each game imports a `ContentItem[]` slice from `contentRegistry`, picks a random target, builds a distractor grid, compares by `item.symbol`, and passes `targetItem` to `<SuccessOverlay>`. Games no longer contain hardcoded strings or inline success overlays.

**Audio**: All audio goes through the `audioManager` singleton (`src/shared/services/audioManager.ts`). It plays clip sequences from `public/audio/` (e.g. `letters/a.mp3`, `phrases/najdi-pismeno.mp3`) and falls back to Web Speech API (Slovak `sk-SK`) if a file is missing. The `public/audio/` tree is pre-created; you drop `.mp3` files in to replace TTS.

**SuccessOverlay** (`src/shared/components/SuccessOverlay.tsx`): Shared success screen used by all 4 games. Shows a random emoji mascot + praise text + echo line derived from `ContentItem` (e.g. "A ako Ananás 🍎"). Fires `onComplete()` after 3 seconds.

**ParentsGate** (`src/shared/components/ParentsGate.tsx`): 3-second hold-to-enter mechanism guarding the settings screen.

**SettingsOverlay** (`src/shared/components/SettingsOverlay.tsx`): Settings panel (music toggle, number/counting range sliders). Rendered by `App.tsx` on top of the current screen.

**Adding a new game**: Create a component in `src/games/<name>/`, import the relevant `ContentItem[]` from `contentRegistry`, use `<SuccessOverlay>` for success state, add the game entry to `App.tsx` and the home screen grid.

## Audio files

Drop recorded `.mp3` files into `public/audio/` subdirectories. File naming follows `audioKey` values from `contentRegistry.ts`:

- `public/audio/letters/a.mp3`, `s-caron.mp3`, `c-caron.mp3` … (bare letter sound)
- `public/audio/syllables/ma.mp3`, `me.mp3` … (bare syllable sound)
- `public/audio/numbers/1.mp3`, `2.mp3` … (number word)
- `public/audio/phrases/najdi-pismeno.mp3`, `toto-je-pismeno.mp3`, `skus-to-znova.mp3` …
- `public/audio/praise/vyborne.mp3`, `skvela-praca.mp3` …

TTS fallback is automatic — missing files cause no errors during development.

## Key Data

- `src/shared/contentRegistry.ts` — all game content (letters, syllables, numbers) as typed `ContentItem` objects
- `src/shared/types.ts` — TypeScript interfaces shared across components

## Environment

`GEMINI_API_KEY` is available via env (see `.env.example`).

## Roadmap

`ROADMAP.md` is the living product roadmap. Keep it up-to-date:
- Mark tasks `[x]` as soon as they are completed.
- Add new tasks as they are identified.
- Record decisions in the Decisions Log table at the bottom when a significant choice is made.
- Move completed phases to a "Done" section if they become noisy.
