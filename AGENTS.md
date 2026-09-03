# AGENTS.md

Guidance for coding agents working in this repository. Claude Code reads this
through `CLAUDE.md`, which imports it. Deeper, area-specific conventions live in
`.claude/rules/` — Claude loads each one automatically when it touches matching
files, and other agents can read them directly.

## Commands

```bash
npm run dev        # Dev server on port 3000, bound to 0.0.0.0
npm run build      # Production build to dist/
npm run lint       # tsc --noEmit + ESLint over src and e2e
npm run test:audio # Check expected audio files against locale audio keys
npm run test:e2e   # Playwright suite (builds a test-mode bundle first)
npm run pwa:icons  # Regenerate public/pwa/ icons from the SVG source
```

## Verify before you commit

There is no unit test runner. Verification is these four, cheapest first. Run
what your change touches, and say what you ran and what it returned — never
report a change as working without one of them.

1. `npm run lint` — must be clean. One known warning: react-refresh in `ContentContext.tsx`.
2. `npx tsx <module>.verify.ts` for any pure-logic module you touched. Each `*Logic.ts`, `contentRegistry.ts`, `pwaConfig.ts`, `browserResolver.ts`, and the overlay audio helpers has one. A new logic module needs one too.
3. `npm run test:audio` when you add, rename, or remove audio files or audio keys.
4. `npm run test:e2e` before anything touching routing, a game loop, or the app shell.

## Repository etiquette

- Work on a branch; never commit to `main`.
- Commit messages are `type: imperative summary` (`fix:`, `feat:`, `perf:`, `docs:`, `test:`, `chore:`) with a body explaining why, not what.
- Update `ROADMAP.md` in the same change when you finish, add, or drop a task, and add a Decisions Log row for a significant choice.
- Do not open a pull request unless asked.

## Gotchas

- `npm run lint` and every `.verify.ts` need `node_modules` — `typescript` and `tsx` are local deps, not global.
- `npm run dev` binds to `0.0.0.0`, so the dev server is reachable on the local network.
- e2e specs assert no console errors and no failed requests on every route, so a single unrelated 404 fails all 28 tests. Look for one shared cause before debugging a spec.
- PWA metadata lives in `src/pwa/pwaConfig.ts`. Editing `index.html` achieves nothing — the build overwrites its title and injects the head tags.
- **IMPORTANT**: never statically import `AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay`, or `skinnedGarment` from outside `src/avatar/`. three.js is a lazy chunk behind `AvatarPresenter`; a static import silently puts ~950 kB back into the main bundle.

## Architecture

A Slovak-language educational PWA for preschoolers ("Hravé Učenie") with 9
mini-games. React 19, TypeScript, Vite, Tailwind v4. Local-first: no backend, no
accounts.

- `src/App.tsx` owns the routed shell, home screen, parent gate, and settings overlays.
- `src/shared/gameCatalog.tsx` — `GAME_DEFINITIONS` is the single source for a game's id, route, home card, and lobby metadata. Register a game here rather than hand-wiring the home screen.
- `src/shared/components/FindItGame.tsx` — the shared round loop for the 4 grid games (alphabet, syllables, numbers, words), driven by a `GameDescriptor<T>` from `src/shared/types.ts`. The other 5 games are bespoke and own their loops.
- `src/shared/contentRegistry.ts` — locale-aware content and the shared answer-audio helpers.
- `src/shared/services/audioManager.ts` — all audio. It falls back per clip to `sk-SK` Web Speech TTS, so a missing file is never an error.
- `src/shared/ui/` — shared UI primitives. Use them before writing one-off Tailwind strings, and update the hidden `/ui-kit` route in the same change.

**Answer audio contract** (all 9 games): the tapped or target item's own audio
plays first, then the verdict — a praise clip on success, the shared retry
phrase on a wrong answer. Never reintroduce per-game "Toto je …" phrasing and
never put praise before the item. Assembly is the one exception and keeps its
own bespoke wrong-answer audio.

**Content**: Slovak defaults live in `src/shared/locales/sk.ts`; Czech is a stub
that falls back to Slovak. Parents add words, praise, and recorded audio
overrides locally through `/content`. Custom audio beats bundled MP3, which
beats TTS.

Do not start a broad UI redesign unless the task asks for one. Prefer shared
component consistency over preserving old one-off spacing, color, or radii.

## Environment

`GEMINI_API_KEY` is exposed in `vite.config.ts` (see `.env.example`); `APP_URL`
is a leftover from the starter template and unused. The avatar is behind
`VITE_AVATAR_POC_ENABLED`, and the feedback form needs `VITE_WEB3FORMS_KEY`.

## Skills

Detailed workflows are skills rather than always-loaded context: Meshy 3D
generation in `.claude/skills/meshy-3d-generation/` (mirrored for Cursor in
`.cursor/skills/`), browser verification and the Blender avatar pipeline in
`.agents/skills/`. Read the matching skill before doing that kind of work.

One rule is here rather than only in the skill, because it spends real money:
**Meshy commands cost credits — always summarize the expected cost and wait for
the user to approve before passing `--confirm-spend`.** Keep `MESHY_API_KEY` to
the environment or a repo-local `.env`, and keep downloads under
`meshy_output/`.
