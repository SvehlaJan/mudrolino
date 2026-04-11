# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # TypeScript type checking (no emit)
npm run clean     # Remove dist/
npm run codegen   # Regenerate src/shared/wordItems.generated.ts from data/words.csv
npm run test:audio # Validate expected audio files vs. content/audio keys
```

No test runner is configured.

## Gotchas

- `npm run lint` requires `node_modules` to be present (`npm install` first); `typescript` is a local dep, not global.
- `npm run dev` binds to `0.0.0.0` — the dev server is accessible on the local network, not just localhost.

## Architecture

This is a Slovak-language educational web app ("Hravé Učenie") for preschoolers with 5 mini-games: alphabet, syllables, numbers, counting, and words.

**Routing shell**: `src/App.tsx` uses `react-router-dom` for the main app shell and routes (`/`, `/alphabet`, `/syllables`, `/numbers`, `/counting`, `/words`). It also owns the home screen, parent gate flow, settings overlays, and route transition animations.

**Domain types**: `src/shared/types.ts` defines the current domain models:
- `Letter`
- `Syllable`
- `Word`
- `SlovakNumber`

It also defines the reusable `GameDescriptor<T>` interface, plus `AudioSpec`, `SuccessSpec`, and `FailureSpec`.

**Shared game loop**: `src/shared/components/FindItGame.tsx` is the generic engine for the 4 grid-based "find it" games:
- alphabet
- syllables
- numbers
- words

Each game provides a `GameDescriptor<T>` that defines item identity, rendering, prompts, wrong-answer audio, and overlay content.

**Counting game**: `src/games/counting/CountingItemsGame.tsx` is intentionally bespoke. It manages its own round loop because its mechanic differs from the shared grid-based games.

**Content registry**: `src/shared/contentRegistry.ts` is the main content registry for:
- `LETTER_ITEMS`
- `WORD_ITEMS` (re-exported from generated code)
- derived `SYLLABLE_ITEMS`
- `NUMBER_ITEMS`
- `AUDIO_PHRASES`
- praise entries and shared timing constants

**Word content pipeline**:
- Source of truth: `data/words.csv`
- Generated file: `src/shared/wordItems.generated.ts`
- Regenerate with: `npm run codegen`

**Audio**: All audio goes through `src/shared/services/audioManager.ts`. It plays clip sequences from `public/audio/` and falls back per clip to Web Speech API (`sk-SK`) when a file is missing or fails to play.

**Shared overlays**:
- `SuccessOverlay.tsx`
- `FailureOverlay.tsx`
- `SessionCompleteOverlay.tsx`

These power the end-of-round and end-of-session feedback used across the games.

**ParentsGate** (`src/shared/components/ParentsGate.tsx`): 3-second hold-to-enter mechanism guarding the settings screen.

**Settings**:
- `src/shared/components/SettingsOverlay.tsx` handles shared settings like music and number/counting ranges.
- `src/games/alphabet/AlphabetSettingsOverlay.tsx` handles alphabet card-count settings.
- `src/games/syllables/SyllablesSettingsOverlay.tsx` handles syllable card-count settings.

**Adding a new grid-based game**:
1. Create a component in `src/games/<name>/`.
2. Define a `GameDescriptor<T>` for the game.
3. Reuse `FindItGame<T>` if the mechanic fits the shared pattern.
4. Add the route and home-screen card in `App.tsx`.
5. Update `ROADMAP.md` if the new game changes scope or delivery status.

## Audio files

Drop recorded `.mp3` files into `public/audio/` subdirectories. File naming follows `audioKey` values from `contentRegistry.ts`:

- `public/audio/letters/a.mp3`, `s-caron.mp3`, `c-caron.mp3` … (bare letter sound)
- `public/audio/syllables/ma.mp3`, `me.mp3` … (bare syllable sound, derived from words)
- `public/audio/words/jahoda.mp3`, `mama.mp3` … (full spoken word clips)
- `public/audio/numbers/1.mp3`, `2.mp3` … (number word)
- `public/audio/phrases/najdi-pismeno.mp3`, `toto-je-pismeno.mp3`, `co-tu-je-napisane.mp3`, `toto-je-slovo.mp3`, `nevadi.mp3`, `spravna-odpoved.mp3` …
- `public/audio/praise/vyborne.mp3`, `skvela-praca.mp3` …
- `public/audio/music/background.mp3` (optional background music)

TTS fallback is automatic — missing files cause no errors during development.

## Key Data

- `src/shared/contentRegistry.ts` — registry for letters, words, derived syllables, numbers, praise, and timing
- `src/shared/types.ts` — domain types plus `GameDescriptor<T>`, `AudioSpec`, `SuccessSpec`, and `FailureSpec`
- `data/words.csv` — editable word list used by the words game and syllable derivation
- `src/shared/wordItems.generated.ts` — generated word data; do not edit by hand

## Environment

`GEMINI_API_KEY` is exposed in `vite.config.ts` (see `.env.example`). `APP_URL` is still present in `.env.example` from the starter template but is not part of the current app flow.

## Roadmap

`ROADMAP.md` is the living product roadmap. Keep it up-to-date:
- Mark tasks `[x]` as soon as they are completed.
- Add new tasks as they are identified.
- Record decisions in the Decisions Log table at the bottom when a significant choice is made.
- Move completed phases to a "Done" section if they become noisy.
