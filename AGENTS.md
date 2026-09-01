# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 3000
npm run build     # Production build to dist/
npm run preview   # Preview production build
npm run lint      # TypeScript type checking (no emit) + ESLint over src and e2e
npm run clean     # Remove dist/
npm run test:audio # Validate expected audio files vs. content/audio keys
npm run test:e2e  # Run the Playwright end-to-end suite (builds a test-mode bundle first)
npm run build:e2e # Build the test-mode bundle on its own
npm run pwa:icons # Regenerate public/pwa/ icons from the SVG source
```

An end-to-end Playwright suite exists under `e2e/` (run via `npm run test:e2e`). There is still no unit/component test runner — pure logic modules use one-shot `.verify.ts` scripts run via `npx tsx` (see `npm run test:audio` and any `*.verify.ts` file for the pattern).

## Gotchas

- `npm run lint` requires `node_modules` to be present (`npm install` first); `typescript` is a local dep, not global.
- `npm run dev` binds to `0.0.0.0` — the dev server is accessible on the local network, not just localhost.
- `npm run test:e2e` does not need `npx playwright install` in a sandbox that pre-stages a browser (Claude Code on the web, some CI images); see the browser resolution note below.

## End-to-End Testing

- `e2e/` holds the Playwright Test suite: `e2e/playwright.config.ts`, shared helpers in `e2e/support/`, and `*.spec.ts` files.
- Run the full suite with `npm run test:e2e` (this runs `vite build --mode test` first, then starts `vite preview` and runs Playwright against it).
- Games publish a small, additive `window.__E2E__` object via `setE2EState()` from `src/shared/services/e2eState.ts`, active only in dev mode or the `test` build mode — never in the real production build. Specs read it via `e2e/support/e2eHook.ts`'s `getE2EState()` to know the correct answer for the current round deterministically, instead of guessing from rendered content.
- When adding a new game (see "Adding a new game" below), also add its route to `e2e/smoke.spec.ts`, and add an oracle hook + golden-path spec if the game doesn't fit an existing shared spec (`e2e/find-it-games.spec.ts` covers any game built on `FindItGame`).
- Specs assert that a route produces no console errors and no failed requests, so an unrelated 404 (a missing favicon, say) fails every test rather than one. Check the whole suite's failures for a single shared cause before debugging a spec.
- **Browser resolution**: `e2e/browserResolver.ts` decides which Chromium to launch. Normally it returns `undefined` and Playwright uses its own managed browser. In a sandbox that pre-stages one under `PLAYWRIGHT_BROWSERS_PATH` and blocks `cdn.playwright.dev` (so `npx playwright install` 403s), it launches `$PLAYWRIGHT_BROWSERS_PATH/chromium` instead, and the run prints which binary it picked. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to force a specific binary. Verify with `npx tsx e2e/browserResolver.verify.ts`.

## Architecture

This is a Slovak-language educational web app ("Hravé Učenie") for preschoolers with 9 mini-games: alphabet, syllables, numbers, counting, words, first letter, syllable assembly, missing syllable, and missing letter.

**Routing shell**: `src/App.tsx` uses `react-router-dom` for the main app shell and routes (`/`, `/alphabet`, `/syllables`, `/numbers`, `/counting`, `/words`, `/first-letter`, `/assembly`, `/complete-syllable`, `/complete-letter`, `/settings`, `/content`, `/avatar-preview`, `/ui-kit`; `/recordings` redirects to `/content`). It also owns the home screen, parent gate flow, settings overlays, and route transition animations.

**Game catalog**: `src/shared/gameCatalog.tsx` holds `GAME_DEFINITIONS` — the single source for each game's id, route, home-screen card, and lobby metadata. Add a game here rather than hand-wiring the home screen.

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

**Bespoke games**: the other 5 games manage their own round loops because their mechanics do not fit the single-tap grid. All but counting keep their round, answer, or audio rules in a sibling `*Logic.ts` module with a matching `.verify.ts` script:
- `src/games/counting/CountingItemsGame.tsx` — count scattered emoji, then pick the number (no logic module; the loop lives in the component).
- `src/games/first-letter/FirstLetterGame.tsx` — hear a word, pick its first Slovak letter unit.
- `src/games/assembly/AssemblyGame.tsx` — order shuffled syllable tiles into the word.
- `src/games/complete-syllable/CompleteSyllableGame.tsx` — pick the one missing syllable.
- `src/games/complete-letter/CompleteLetterGame.tsx` — fill missing letter units in guided order.

**Content registry**: `src/shared/contentRegistry.ts` is the main content registry for:
- `LETTER_ITEMS`
- `WORD_ITEMS` from locale modules
- derived `SYLLABLE_ITEMS`
- `NUMBER_ITEMS`
- `AUDIO_PHRASES`
- praise entries and shared timing constants
- the shared answer-audio helpers `getItemAudioClip()` and `getWrongAnswerAudio()`

**Word and custom-content pipeline**:
- Default Slovak words live in `src/shared/locales/sk.ts`
- Czech is stubbed in `src/shared/locales/cs.ts` and falls back to Slovak until populated
- User-managed words and praise entries live in local storage through `src/shared/services/localContentRepository.ts`
- `/content` lets parents add/delete local words and praise and record audio overrides

**Audio**: All audio goes through `src/shared/services/audioManager.ts`. It plays clip sequences from `public/audio/` and falls back per clip to Web Speech API (`sk-SK`) when a file is missing or fails to play.

**Answer audio contract**: all 9 games follow one order, so a child always hears the item itself before the verdict:
- Correct answer — the target item's own audio, then a praise clip. Built by `getSuccessOverlayAudioSpec()` in `src/shared/components/successOverlayAudio.ts`, which appends praise after the `SuccessSpec` clips.
- Wrong answer — the tapped item's own audio, then the shared retry phrase. Built by `getWrongAnswerAudio()` in `contentRegistry.ts`.

Do not reintroduce per-game "Toto je …" phrasing or put praise before the item. Assembly is the one exception: it keeps its own bespoke wrong-answer audio in `assemblyAudioLogic.ts` and a fixed praise clip.

**Shared overlays**:
- `SuccessOverlay.tsx`
- `FailureOverlay.tsx`
- `SessionCompleteOverlay.tsx`

These power the end-of-round and end-of-session feedback used across the games.

**ParentsGate** (`src/shared/components/ParentsGate.tsx`): 3-second hold-to-enter mechanism guarding the settings screen.

**Settings**: there are no per-game settings overlays any more. One `src/shared/components/SettingsContent.tsx` renders every section, and `SETTINGS_VISIBILITY` in `settingsContentData.ts` maps each target (`home` or a `GameId`) to the sections it shows — music, avatar, recordings, alphabet accents, alphabet/syllables grid size, number/counting ranges, and missing-letter count. It is presented two ways:
- `SettingsOverlay.tsx` — in-game overlay, opened from a game's top bar.
- `SettingsScreen.tsx` — the full `/settings` screen behind the parent gate.

To add a per-game setting, add a flag to `SETTINGS_VISIBILITY` and a section to `SettingsContent`.

**PWA**: `src/pwa/` owns installability. `pwaConfig.ts` centralizes the manifest, the injected HTML head tags (title, theme color, favicons, Apple metadata), and the workbox precache rules; `pwaConfig.verify.ts` asserts them. `usePwaInstall.ts` and `PwaHomeControl.tsx` drive the home-screen install/update prompt. Change PWA metadata in `pwaConfig.ts`, never in `index.html` — `vite.config.ts` overwrites the title and injects head tags at build time.

**Avatar**: `src/avatar/` owns the optional 3D companion behind `VITE_AVATAR_POC_ENABLED`, with `/avatar-preview` as its workbench. `AvatarPresenter.tsx` lazy-loads `AvatarScene` so three.js, `@react-three/fiber`, and drei stay out of the main bundle — keep every three.js import behind that boundary and never statically import `AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay`, or `skinnedGarment` from outside `src/avatar/`. The renderer chunk and the avatar GLBs are both excluded from the PWA precache; a failed chunk load is caught by `AvatarRuntimeBoundary`, which hides the avatar.

**Adding a new game**:
1. Create a component in `src/games/<name>/`, keeping round/answer rules in a `*Logic.ts` module with a `.verify.ts` script.
2. Define a `GameDescriptor<T>` and reuse `FindItGame<T>` if the mechanic fits the shared grid pattern; otherwise manage the round loop in the component like the other bespoke games.
3. Use the shared answer-audio helpers so the game matches the answer audio contract above.
4. Add the game to `GAME_DEFINITIONS` in `src/shared/gameCatalog.tsx` and the route in `App.tsx`.
5. Add its route to `e2e/smoke.spec.ts`, plus an oracle hook and golden-path spec if it does not fit an existing shared spec.
6. Update `ROADMAP.md` if the new game changes scope or delivery status.

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
- `src/shared/gameCatalog.tsx` — game ids, routes, home-screen cards, and lobby metadata
- `src/shared/services/localContentRepository.ts` — local-first custom words and praise storage
- `src/shared/services/audioOverrideStore.ts` — IndexedDB-backed custom audio overrides
- `src/pwa/pwaConfig.ts` — PWA manifest, injected HTML head tags, and precache rules

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
