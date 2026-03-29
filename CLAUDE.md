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

## Architecture

This is a Slovak-language educational web app ("Hravé Učenie") for preschoolers with 4 mini-games: alphabet, syllables, numbers, and counting.

**Screen state machine** (managed in `App.tsx`): HOME → GAME → PARENTS_GATE → SETTINGS

**Game pattern**: Each game in `src/games/` is self-contained with local state for game logic (target letter/number, grid, feedback state). Games receive callbacks from App for exit and settings access.

**Audio**: All audio goes through the `audioManager` singleton (`src/shared/services/audioManager.ts`), which wraps the browser's Web Speech API with Slovak voice preference (`sk-SK`). No external audio libraries. Settings sync from App down to audioManager.

**ParentsGate** (`src/shared/components/ParentsGate.tsx`): 3-second hold-to-enter mechanism that guards the settings screen from children.

**Adding a new game**: Create a component in `src/games/<name>/`, add its entry to the home screen grid in `App.tsx`, add any game-specific data to `src/shared/constants.ts`, and add a PRD doc to `docs/`.

## Key Data

- `src/shared/constants.ts` — alphabet letters, syllables list, colors, emoji sets used across games
- `src/shared/types.ts` — TypeScript interfaces shared across components

## Environment

`GEMINI_API_KEY` is available via env (see `.env.example`). The `@google/genai` package is installed but not yet used in any game component.
