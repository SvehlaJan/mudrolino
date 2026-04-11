# Hravé Učenie

Hravé Učenie is a Slovak-language educational web app for preschoolers. It is built around short, touch-friendly mini-games with spoken prompts, encouraging feedback, and a parent-protected settings area.

## Features

- Five mini-games: alphabet, syllables, numbers, counting, and words.
- Audio-first gameplay with recorded `.mp3` clips when present and Slovak TTS fallback when files are missing.
- Shared success, failure, and session-complete overlays across the grid-based games.
- Parent-protected settings flow via a 3-second hold gate.
- Mobile-first UI with oversized controls, safe-area spacing, and animated transitions.

## Games

- `Abeceda`: hear a letter prompt and tap the correct letter card.
- `Slabiky`: hear a syllable and identify it from a grid.
- `Čísla`: hear a number and tap the correct numeral.
- `Spočítaj`: count scattered emoji items, then choose the correct number.
- `Slová`: read a syllabified word prompt and match it to the right emoji.

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- `motion/react`
- `react-router-dom`
- Lucide React

## Architecture

- `src/App.tsx` owns the routed app shell, home screen, parents gate, and settings overlays.
- `src/shared/types.ts` defines the domain models (`Letter`, `Syllable`, `Word`, `SlovakNumber`) and the generic `GameDescriptor<T>` contract.
- `src/shared/components/FindItGame.tsx` implements the shared round loop for the alphabet, syllables, numbers, and words games.
- `src/games/counting/CountingItemsGame.tsx` is a bespoke mechanic and does not use `FindItGame`.
- `src/shared/contentRegistry.ts` is the main content registry for letters, derived syllables, numbers, timing constants, and praise entries.
- `src/shared/services/audioManager.ts` plays audio clip sequences and falls back per clip to Web Speech API (`sk-SK`) when files are missing.

## Content Pipeline

- Words are authored in `data/words.csv`.
- Run `npm run codegen` after editing the CSV to regenerate `src/shared/wordItems.generated.ts`.
- `SYLLABLE_ITEMS` are derived from `WORD_ITEMS` in `src/shared/contentRegistry.ts`.
- Audio validation lives in `public/audio/_review/check_audio.ts` and can be run with `npm run test:audio`.

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
- If you edit `data/words.csv`, regenerate `src/shared/wordItems.generated.ts` with `npm run codegen`.
- If you add, remove, or rename audio files, run `npm run test:audio` to catch missing or orphaned assets.
- The app is currently Slovak-only.
