# Building Mudrolíno with coding agents

Mudrolíno began as a learning app for my son and is now also used by a small circle of close friends. The product combines short preschool games with spoken instructions, custom family recordings, and printable activities.

The project is developed entirely with coding agents. My contribution is product direction, scope decisions, design constraints, and evaluation of the resulting experience. Agents implement the application, asset pipeline, and verification tooling. This case study explains decisions I directed and the implementation evidence behind them.

## 1. Bring growing games back to a shared design system

### Problem

As new games and features accumulated, agents produced slightly different versions of similar controls. Buttons, answer tiles, layouts, and feedback states became inconsistent. Every new implementation introduced another place to maintain interaction and appearance.

### Decision

I pushed for reusing shared components instead of allowing each game to invent its own controls. The consolidation introduced a first-party UI library and an in-app component gallery; later redesign work established a shared game shell and tactile answer pieces.

The boundary follows actual repetition. Four grid games use a descriptor-driven `FindItGame`, while assembly and other distinct mechanics retain their own boards. A shared shell handles presentation across all eleven games. Game metadata lives in one catalog, so home cards, routes, and settings draw from the same definitions.

### Tradeoff and verification

Shared primitives make accessibility and interaction fixes available to multiple games. They also increase the reach of a regression: a tile change can affect several layouts. The component gallery exposes representative states, and verification broadens for shared runtime changes.

The initial consolidation deliberately used an in-app gallery instead of adding a separate Storybook toolchain. Bespoke mechanics remain where the games differ; the project does not require every game to fit one generic board.

Evidence:

- [Original consolidation decision](superpowers/specs/2026-04-25-ui-component-library-consolidation-design.md) and [full redesign specification](superpowers/specs/2026-09-14-full-app-ui-redesign-design.md).
- [UI primitives](../src/shared/ui/), [game shell](../src/shared/game/GameShell.tsx), [tactile pieces](../src/shared/game/materials/TactilePiece.tsx), and [component gallery](../src/shared/ui/UiKitScreen.tsx).
- [Game catalog](../src/shared/gameCatalog.tsx), [shared grid-game loop](../src/shared/components/FindItGame.tsx), and [component-gallery browser checks](../e2e/component-gallery.spec.ts).

## 2. Defer accounts to make the MVP achievable

### Problem

Custom words and a parent's recorded voice are central to the idea. Accounts, hosted family data, and automatic cross-device synchronization would introduce additional infrastructure before those features could be useful at home.

### Decision

I kept accounts in the backlog. Words and settings live in browser local storage; recorded audio lives in IndexedDB. Families can export a backup containing settings, content, and recordings, then merge it into another device.

### Tradeoff and verification

There is no automatic sync or server-side recovery. Data belongs to a browser and origin, so changing devices or domains requires an explicit transfer. Browser storage can also be cleared or evicted; the parent area offers backups and requests persistent storage after saves.

Restore merges records by change time, preserves newer local edits, and retains deletion markers so an older backup does not simply resurrect deleted content. This is a defined merge rule for backups; it is not a claim that distributed synchronization is already implemented.

Evidence:

- [Local content repository](../src/shared/services/localContentRepository.ts), [storage persistence](../src/shared/services/storagePersistence.ts), and [parent backup controls](../src/parent/BackupCard.tsx).
- [Merge rules](../src/shared/services/userData/merge.ts), [backup format](../src/shared/services/userData/backupFile.ts), and [behavioral data tests](../src/shared/services/userData/userData.test.ts).
- [Browser backup/restore coverage](../e2e/backup-restore.spec.ts) and the [accounts/sync backlog](../ROADMAP.md#phase-3--cloud-and-accounts).

## 3. Establish feedback beyond an agent's completion claim

### Problem

Generated code and a working-looking screen are insufficient evidence that a feature behaves correctly. In this app, timing matters: audio should finish in order, stale work should stop on navigation, and animations must leave controls reachable on small screens.

### Decision

I introduced automated quality control and directed a verification workflow with different scopes for editing, integration, and release. Fast tests exercise the session controller and audio manager through injected clocks and controlled promises. Browser tests check the actual interaction and layout contracts.

Examples of protected behavior include:

- The item's audio precedes praise or the retry phrase, with assembly retaining its bespoke wrong-answer audio.
- Cancelling an audio lookup cannot start stale playback after the next operation begins.
- Pause, replay, completion, and disposal settle pending work consistently.
- Parent data survives supported backup/restore and migration paths.
- Core games remain usable offline, and optional companion failure cannot block progress.

### Tradeoff and verification

Running the full browser matrix for every edit would slow feedback. The editing profile selects affected suites; shared or unrecognized code broadens to integration. Release adds the full viewport matrix, WebKit, real media, parent data, offline behavior, and production guards.

Test builds and production builds use different output directories. Browser checks require a matching build identity, and reports record the source/environment used. Optional proof reuse is explicit; it is not reported as a fresh run.

Automated checks still have limits. The development-efficiency audit records a visual alignment problem that the then-passing browser suite missed. Screenshot review found it and informed a focused assertion. Passing tests therefore complement visual and product review.

Bundled recordings remain a known unfinished area. Development allows only declared omissions and falls back to speech synthesis. The strict release gate remains failing while recordings are pending; recorded exceptions for particular releases do not turn that gate green.

Evidence:

- [Verification design](superpowers/specs/2026-10-02-development-efficiency-design.md), [historical audit and limits](superpowers/development-efficiency-audit.md), and [implementation handoff](superpowers/handoffs/2026-10-02-development-efficiency.md).
- [Session controller tests](../src/shared/game/gameSessionController.test.ts), [audio cancellation/fallback tests](../src/shared/services/audioManager.test.ts), and [suite selection](../tools/verification/selection.ts).
- [Offline tests](../e2e/offline.spec.ts), [real-media checks](../e2e/real-media.spec.ts), [production guards](../e2e/production-guards.spec.ts), and [release audio-order checks](../e2e/release-audio-order.spec.ts).

## 4. Use the bear to test the path toward parent avatars

### Product hypothesis

The familiar parent voice began as my hypothesis about making learning more personal. A possible extension is a tutor with a parent's face, with dress-up interactions and eventually rewards or paid customization. Those are future product hypotheses. The current bear is a working proof of concept for building experience with 3D models, animation, and integration.

### Experiments and rejected approaches

The path was not linear:

1. **Generated human avatars and clothing:** the original fused character was unsuitable for removable clothing. Later garment experiments exposed fitting, deformation, and repeatable-authoring problems. An authored Blender catalog superseded that approach; customizable human integration is still unfinished.
2. **Procedural bear modeling:** human-derived and procedural drafts passed some technical checks but failed the likeness and proportion review. I rejected the earlier appearance and approved a generated replacement matching the selected reference more closely.
3. **Meshy generation and rigging:** the generated bear model and rig were useful and retained. Meshy as a whole was not abandoned.
4. **Stock humanoid animation:** these presets drove limbs through the bear's broad torso and head. Attempts to adjust the clips left contact problems. Mascot-specific motion authored through Blender scripts replaced them.

The agents built the geometry, motion scripts, and checking tools. I set the visual direction, judged the appearance and movement, requested a more expressive dance, and approved the resulting experience in the app.

### Tradeoff and verification

The bear keeps one fixed outfit. It does not establish that parent likeness, interchangeable clothing, or the full human wardrobe is solved. Geometry checks are scoped to declared body pairs and sampled poses; a clean export or a selected frame alone does not prove an acceptable animated character.

The production implementation loads Three.js lazily, serves the accepted model from Vercel Blob, and supplies a bundled still when motion or 3D rendering is unavailable. The companion must remain optional: its loading, failure, or playback cannot delay a child's answer flow.

The workflow checks actual exported motion in Three.js, compares native and runtime poses, reviews framing in the game, and retains rejected studies. The [published manifest](../src/avatar/companions/bear-v1.json) identifies the accepted runtime bytes; the [current workflow](avatar-workflow.md) distinguishes the active revision from historical candidates.

Evidence:

- [Human-avatar audit](audits/2026-10-03-avatar-workflow.md), [bear product specification](superpowers/specs/2026-10-19-bear-companion-design.md), and [reference rebuild plan](superpowers/plans/2026-10-21-bear-reference-rebuild.md).
- [Bear retrospective, including the rejected stock animations](../assets/avatar/catalog-a/companions/bear-v2/retrospective.md) and [independent reference/runtime review](audits/2026-10-22-generated-bear-final-review.md).
- [Lazy renderer entry](../src/avatar/AvatarPresenter.tsx), [companion browser checks](../e2e/avatar-companion.spec.ts), and [production bundle guard](../tools/release/verify-production-bundle.mjs).

## What this project demonstrates

Mudrolíno makes my approach to AI-assisted delivery visible: define a useful scope, constrain repeated patterns, evaluate generated output, and require evidence before accepting changes. The repository exposes the implementation and its checks alongside the decisions and remaining limitations.
