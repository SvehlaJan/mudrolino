# Hravé Učenie

Hravé Učenie is a Slovak-language educational web app for preschoolers. It is built around short, touch-friendly mini-games with spoken prompts, encouraging feedback, and a parent-protected settings area.

## Features

- Nine mini-games: alphabet, syllables, numbers, counting, words, first-letter sounds, syllable assembly, missing-syllable completion, and missing-letter completion.
- Audio-first gameplay with recorded `.mp3` clips when present and Slovak TTS fallback when files are missing.
- Shared success, failure, and session-complete overlays across the grid-based games.
- Parent-protected settings flow via a 3-second hold gate.
- Parent-managed local content for custom words, praise, and recorded audio overrides.
- Parent feedback form backed by Web3Forms on the deployed build.
- Installable PWA support with generated icons, a mobile install prompt, and offline core games.
- Optional local avatar customization and preview tooling behind the avatar feature flag.
- Mobile-first UI with oversized controls, safe-area spacing, and animated transitions.

## Games

- `Abeceda`: hear a letter prompt and tap the correct letter card.
- `Slabiky`: hear a syllable and identify it from a grid.
- `Čísla`: hear a number and tap the correct numeral.
- `Spočítaj`: count scattered emoji items, then choose the correct number.
- `Slová`: read a syllabified word prompt and match it to the right emoji.
- `Prvé písmenko`: hear a word, see its emoji, and choose the first Slovak letter.
- `Skladaj`: arrange shuffled syllable tiles into the correct word.
- `Doplň slabiku`: hear a word and choose the missing syllable from four tiles.
- `Doplň písmeno`: hear a word and fill missing Slovak letter units in order.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- `motion/react`
- `react-router-dom`
- Lucide React
- `vite-plugin-pwa`
- React Three Fiber / Three.js for the avatar preview and companion runtime

## Architecture

- `src/App.tsx` owns the routed app shell, home screen, parents gate, and settings overlays.
- `src/shared/types.ts` defines the domain models (`Letter`, `Syllable`, `Word`, `SlovakNumber`) and the generic `GameDescriptor<T>` contract.
- `src/shared/components/FindItGame.tsx` implements the shared round loop for the alphabet, syllables, numbers, and words games.
- `src/games/counting/CountingItemsGame.tsx` is a bespoke mechanic and does not use `FindItGame`.
- `src/games/first-letter/FirstLetterGame.tsx` is a bespoke word-to-first-letter mechanic that shares the app's standard overlays and controls.
- `src/games/assembly/AssemblyGame.tsx` is a bespoke tap-to-place syllable ordering game.
- `src/games/complete-syllable/CompleteSyllableGame.tsx` is a bespoke missing-syllable mechanic that shares the app's standard overlays and controls.
- `src/games/complete-letter/CompleteLetterGame.tsx` is a bespoke missing-letter mechanic with guided blanks and configurable difficulty.
- `src/shared/contentRegistry.ts` is the locale-aware content registry for letters, derived syllables, numbers, shared phrase audio metadata, timing constants, and praise entries.
- `src/shared/services/audioManager.ts` plays audio clip sequences and falls back per clip to Web Speech API (`sk-SK`) when files are missing.
- `src/content/CustomContentScreen.tsx` is the parent-facing local content and recording surface.
- `src/pwa/` owns the PWA manifest metadata, install/update prompt state, and home-screen PWA control.
- `src/avatar/` owns the local avatar runtime, preview route, clothing catalog, and avatar persistence.

## UI Component Library

Reusable UI primitives live in `src/shared/ui/`. They standardize the current app shell, top bars, buttons, cards, selectable tiles, form controls, overlays, and game counters.

The hidden `/ui-kit` route shows the component inventory with real app labels and representative states for UX review. It is not linked from the child-facing home screen.

When changing shared UI, keep three things aligned:

- the primitive implementation in `src/shared/ui/`
- the matching example or state on `/ui-kit`
- this README and agent instructions if the usage contract changes

## Content Pipeline

- Slovak default words live in `src/shared/locales/sk.ts`.
- Parents can add local custom words and praise entries from `/content`; those are stored per locale in local storage.
- Parents can record local audio overrides for bundled content and custom entries; custom audio is stored locally in IndexedDB and played before bundled MP3/TTS fallback.
- Syllable items are derived from ready word items in `src/shared/contentRegistry.ts`.
- Audio validation lives in `public/audio/_review/check_audio.ts` and can be run with `npm run test:audio`.

## PWA and Deployment

- PWA metadata and service worker options live in `src/pwa/pwaConfig.ts` and `vite.config.ts`.
- Generated app icons live under `public/pwa/`; regenerate them with `npm run pwa:icons`.
- The home screen shows a floating install/offline/update prompt when the browser exposes a relevant PWA state.
- Core app routes and audio needed for the current games are cached for offline use. Avatar asset preloading remains a later performance task.
- The deployed friends-first build has Web3Forms feedback submissions verified.

## Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the dev server on port `3000`:
   ```bash
   npm run dev
   ```
3. Run the typecheck + ESLint combo:
   ```bash
   npm run lint
   ```
4. Build for production:
   ```bash
   npm run build
   ```

## Contributor Notes

- `npm run dev` binds to `0.0.0.0`, so the app is reachable on the local network.
- `npm run lint` requires `node_modules` to exist because `typescript` and `eslint` are local dependencies.
- If you edit default words, update `src/shared/locales/sk.ts` directly and run the app/audio checks.
- If you add, remove, or rename audio files, run `npm run test:audio` to catch missing or orphaned assets.
- The app is currently Slovak-only.
