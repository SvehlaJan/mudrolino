# AGENTS.md

Guidance for coding agents working in this repository. Claude Code reads this
through `CLAUDE.md`, which imports it. Deeper, area-specific conventions live in
`.claude/rules/` — Claude loads each one automatically when it touches matching
files, and other agents can read them directly.

## Commands and verification

```bash
npm run dev                 # Port 3000, bound to 0.0.0.0
npm run verify:edit         # Select affected browser suites from changed files
npm run verify:integration  # All functional contracts + 3 representative geometry sizes
npm run verify:release      # Aggregate shipping checks, including strict recordings
npm run setup:browsers      # Install matching Chromium/WebKit before first browser run
npm run test:unit           # Fast Node Vitest session/audio/policy tests
npm run verify:pure         # Legacy *.verify.ts under src, e2e and tools
npm run test:audio          # Known pending recordings allowed; unexpected omissions fail
npm run test:audio:strict   # Every recording present and pending list empty
npm run test:e2e            # Build dist-e2e and run integration browser coverage
npm run build              # Production output dist; test output stays in dist-e2e
npm run shots -- --seed=42  # Originals, 320px review copies and manifest
```

Before committing, run lint (zero errors; one known ContentContext react-refresh warning),
unit tests, and the affected pure verifiers. New pure logic gets a behavioral
`*.test.ts` in Vitest; retain existing `*.verify.ts` without duplicating equivalent
coverage. `verify:pure` also discovers screenshot verifiers under tools.

Use `verify:edit` during changes. It includes staged, unstaged and untracked files;
use `-- --base=<ref>` to include committed branch changes. Shared runtime/build changes
and unmapped code conservatively select integration. Use `-- --files=<comma-separated-paths>`
for an explicit source scope, `-- --profile=integration` to broaden, and `-- --dry-run`
to inspect selection. Run integration before accepting routing, session, audio or app-shell
changes. Release includes the full viewport matrix, WebKit, real media/order, parent-data,
offline, production guards and strict audio inventory. Do not deploy with pending recordings.

After npm ci or a Playwright upgrade, run setup:browsers before browser gates.
Playwright and @playwright/test are aligned at 1.60.0 because the previous 1.59.1
installer hangs during extraction on modern Node.

The runners save ignored JSON reports under artifacts/verification and continue independent
gates after a failure. Browser configs require matching build identity and never reuse preview
servers. Each profile preserves traces under its own test-results directory. `--reuse` may reuse successful proof for identical code, environment and profile;
it reports reuse explicitly. `--force` always runs fresh. State what actually ran, which
profile and its result. A verified fast-forward needs a focused integrated smoke, not the
same complete gate again. Never report a failure or reused result as a fresh pass.

Inspect only screenshot review copies resized to at most 320px width. The manifest records
seed, commit/build identity, scene, viewport, errors and failed requests.

## Repository etiquette

- Work on a branch; never commit to `main` unless the user explicitly requests merging into it.
- Use the primary checkout by default. Obtain explicit user authorization before creating or using any worktree; never do either silently.
- Commit messages are `type: imperative summary` (`fix:`, `feat:`, `perf:`, `docs:`, `test:`, `chore:`) with a body explaining why, not what.
- Update `ROADMAP.md` in the same change when you finish, add, or drop a task, and add a Decisions Log row for a significant choice.
- Do not open a pull request unless asked.
- Production deploys from the `release` branch (Vercel production branch); pushes to `main` and feature branches only create preview deployments. Ship by fast-forwarding `release` to a reviewed `main` commit, and only when the user asks.

## Gotchas

- `npm run lint` and every `.verify.ts` need `node_modules` — `typescript` and `tsx` are local deps, not global.
- `npm run dev` binds to `0.0.0.0`, so the dev server is reachable on the local network.
- 3D files (`.blend`, `.glb`) are git-ignored and live in a private R2 bucket: `npm run assets:pull` restores them from `assets/avatar/asset-manifest.json`; after changing models run `assets:manifest`, commit the manifest and `assets:push`.
- e2e specs assert no console errors and no failed requests on every route, so a single unrelated 404 fails tests across many routes. Look for one shared cause before debugging a spec.
- PWA metadata lives in `src/pwa/pwaConfig.ts`. Editing `index.html` achieves nothing — the build overwrites its title and injects the head tags.
- **IMPORTANT**: never statically import `AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay`, or `skinnedGarment` from outside `src/avatar/`. three.js is a lazy chunk behind `AvatarPresenter`; a static import silently puts ~950 kB back into the main bundle.

## Architecture

A Slovak-language educational PWA for preschoolers ("Mudrolíno") with 11
mini-games. React 19, TypeScript, Vite, Tailwind v4. Local-first: no backend, no
accounts.

- `src/App.tsx` owns the routed shell, home screen, parent gate, and settings overlays.
- `src/shared/gameCatalog.tsx` — `GAME_DEFINITIONS` is the single source for a game's id, route, home card, and lobby metadata. Register a game here rather than hand-wiring the home screen.
- `src/shared/components/FindItGame.tsx` — the shared round loop for the 4 grid games (alphabet, syllables, numbers, words), driven by a `GameDescriptor<T>` from `src/shared/types.ts`. The other 7 games are bespoke and own their loops.
- `src/shared/contentRegistry.ts` — locale-aware content and the shared answer-audio helpers.
- `src/shared/services/audioManager.ts` — all audio. It falls back per clip to `sk-SK` Web Speech TTS, so a missing file is never an error.
- `src/shared/ui/` — shared UI primitives. Use them before writing one-off Tailwind strings, and update the hidden `/ui-kit` route in the same change.

**Answer audio contract** (all games): the tapped or target item's own audio
plays first, then the verdict — a praise clip on success, the shared retry
phrase on a wrong answer. Never reintroduce per-game "Toto je …" phrasing and
never put praise before the item. Assembly is the one exception and keeps its
own bespoke wrong-answer audio.

**Content**: Slovak and Czech defaults live in `src/shared/locales/sk.ts` and
`cs.ts` (Czech is a draft awaiting the user's review and recordings). Parents add
words, praise, and recorded audio overrides locally per language through
`/content`. Custom audio beats bundled MP3, which beats TTS.

**UI text**: game and home text uses keys in `src/shared/uiCopy.ts`. Other UI text
is written in Slovak and wrapped in `t('…')` from `useT()`, or marked with
`msg('…')` where it is defined outside a component and translated where shown
(`src/shared/i18n.ts`). Czech goes in `src/shared/locales/cs.ui.ts`, keyed by the
Slovak text; `src/shared/i18n.test.ts` fails on any marked string without a
translation. Never build UI text with template literals inside `t()`; use
`{placeholders}`.

Do not start a broad UI redesign unless the task asks for one. Prefer shared
component consistency over preserving old one-off spacing, color, or radii.

## Environment

Variables are listed in `.env.example`. Never inline a secret through `define`
in `vite.config.ts`; anything defined there ships in the public bundle. The avatar
gallery is development-only; `VITE_AVATAR_POC_ENABLED` enables its tool-only
candidate rendering fixture. Product avatar integration awaits accepted catalog
assets. The feedback form needs `VITE_WEB3FORMS_KEY`. Error reports need
`VITE_SENTRY_DSN` and run only in production builds; source maps upload when
`SENTRY_AUTH_TOKEN` is set. Vercel Web Analytics loads only on the Vercel
production deployment.

## Skills

Detailed workflows are skills rather than always-loaded context: Meshy 3D
generation in `.claude/skills/meshy-3d-generation/` (mirrored for Cursor in
`.cursor/skills/`), browser verification and the Blender avatar pipeline in
`.agents/skills/`. Read the matching skill before doing that kind of work. For catalog
models or selfie personalization, start with `docs/avatar-workflow.md`; Claude
has a skill entry point linking to the same Blender instructions.

One rule is here rather than only in the skill, because it spends real money:
**Meshy commands cost credits — always summarize the expected cost and wait for
the user to approve before passing `--confirm-spend`.** Keep `MESHY_API_KEY` to
the environment or a repo-local `.env`, and keep downloads under
`meshy_output/`.
