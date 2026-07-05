# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # TypeScript type checking (no emit)
npm run clean     # Remove dist/
npm run test:audio # Validate expected audio files vs. content/audio keys
```

No test runner is configured.

## Gotchas

- `npm run lint` requires `node_modules` to be present (`npm install` first); `typescript` is a local dep, not global.
- `npm run dev` binds to `0.0.0.0` — the dev server is accessible on the local network, not just localhost.

## Architecture

This is a Slovak-language educational web app ("Hravé Učenie") for preschoolers with 6 mini-games: alphabet, syllables, numbers, counting, words, and syllable assembly.

**Routing shell**: `src/App.tsx` uses `react-router-dom` for the main app shell and routes (`/`, `/alphabet`, `/syllables`, `/numbers`, `/counting`, `/words`, `/assembly`, `/settings`, `/content`, `/avatar-preview`, `/ui-kit`). It also owns the home screen, parent gate flow, settings overlays, and route transition animations.

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

**Assembly game**: `src/games/assembly/AssemblyGame.tsx` is intentionally bespoke. It uses shuffled syllable tiles and answer slots instead of the shared single-tap grid loop.

**Content registry**: `src/shared/contentRegistry.ts` is the main content registry for:
- `LETTER_ITEMS`
- `WORD_ITEMS` from locale modules
- derived `SYLLABLE_ITEMS`
- `NUMBER_ITEMS`
- `AUDIO_PHRASES`
- praise entries and shared timing constants

**Word and custom-content pipeline**:
- Default Slovak words live in `src/shared/locales/sk.ts`
- Czech is stubbed in `src/shared/locales/cs.ts` and falls back to Slovak until populated
- User-managed words and praise entries live in local storage through `src/shared/services/localContentRepository.ts`
- `/content` lets parents add/delete local words and praise and record audio overrides

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

## UI Component Library

Shared UI primitives live in `src/shared/ui/`. New UI should use these primitives before adding one-off Tailwind class strings:

- `AppScreen` for full-screen shells and standard responsive padding.
- `TopBar`, `BackButton`, `IconButton`, and `RoundCounter` for game and parent-screen navigation.
- `Button`, `Card`, `ChoiceTile`, and form controls for repeated actions, surfaces, selectable tiles, and settings/feedback inputs.
- `OverlayFrame` for modal feedback shells.

The hidden `/ui-kit` route is the designer-review surface for shared UI components and states. When adding or changing a shared component, update its `/ui-kit` example in the same change. If the component API or usage contract changes, update this file and `README.md`.

This consolidation phase standardizes the current playful UI. Do not introduce a broad redesign unless the task explicitly asks for one, but prefer shared component consistency over preserving old one-off spacing, colors, typography, or radii.

## Audio files

Drop recorded `.mp3` files into locale-prefixed `public/audio/` subdirectories. File naming follows `audioKey` values from locale content:

- `public/audio/sk/letters/a.mp3`, `s-caron.mp3`, `c-caron.mp3` … (bare letter sound)
- `public/audio/sk/syllables/ma.mp3`, `me.mp3` … (bare syllable sound, derived from words)
- `public/audio/sk/words/jahoda.mp3`, `mama.mp3` … (full spoken word clips)
- `public/audio/sk/numbers/1.mp3`, `2.mp3` … (number word)
- `public/audio/sk/phrases/najdi-pismenko.mp3`, `toto-je-pismenko.mp3`, `co-tu-je-napisane.mp3`, `toto-je-slovo.mp3`, `nevadi.mp3`, `spravna-odpoved.mp3` …
- `public/audio/sk/praise/vyborne.mp3`, `skvela-praca.mp3` …
- `public/audio/music/background.mp3` (optional background music)

TTS fallback is automatic — missing files cause no errors during development.

## Key Data

- `src/shared/locales/sk.ts` — default Slovak letters, words, numbers, phrases, and praise
- `src/shared/contentRegistry.ts` — locale registry helpers, derived syllables, counting emoji, and timing
- `src/shared/types.ts` — domain types plus `GameDescriptor<T>`, `AudioSpec`, `SuccessSpec`, and `FailureSpec`
- `src/shared/services/localContentRepository.ts` — local-first custom words and praise storage
- `src/shared/services/audioOverrideStore.ts` — IndexedDB-backed custom audio overrides

## Environment

`GEMINI_API_KEY` is exposed in `vite.config.ts` (see `.env.example`). `APP_URL` is still present in `.env.example` from the starter template but is not part of the current app flow.

## Local Meshy Helper

This repo includes a project-local Meshy helper for 3D generation flows:
- Helper CLI: `tools/meshy/meshy_ops.py`
- Operator reference: `tools/meshy/README.md`

Use it when the user asks for Meshy operations such as:
- text-to-3d
- image-to-3d
- multi-image-to-3d
- retexture
- remesh
- auto-rigging
- animation
- Meshy balance checks
- downloading `.glb` outputs

Rules:
- Load `MESHY_API_KEY` only from the current shell environment or repo-local `.env`.
- Never read or write `~/.zshrc`, `~/.bashrc`, or other shell profile files.
- Keep downloads inside `meshy_output/`.
- Before any credit-spending Meshy command, summarize expected cost and wait for user approval.
- Only pass `--confirm-spend` to the helper after the user approves.
- Do not use the 3D printing workflow in this repo.

## Roadmap

`ROADMAP.md` is the living product roadmap. Keep it up-to-date:
- Mark tasks `[x]` as soon as they are completed.
- Add new tasks as they are identified.
- Record decisions in the Decisions Log table at the bottom when a significant choice is made.
- Move completed phases to a "Done" section if they become noisy.
