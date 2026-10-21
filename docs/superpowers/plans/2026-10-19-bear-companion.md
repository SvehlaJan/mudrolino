# Bear Learning Companion Implementation Plan

> **For agentic workers:** Execute the checkboxes sequentially. Use
> `superpowers:executing-plans` if available; the repository files and commands
> below are sufficient for Claude Code or another coding agent without that
> skill, Codex tools or this conversation. Use one author for coupled asset work.

**Goal:** Introduce the approved storybook bear B in all 11 games, wearing one
fixed outfit and celebrating completed correct answers without delaying learning.

**Architecture:** Build a separate bear on the existing 24-bone rig and prove
one outfit plus one dance. A small, tested celebration policy in the shared game
shell controls a decorative companion; `AvatarPresenter` retains the lazy renderer
boundary and gains opt-in one-shot playback. Loading failures and reduced motion
use a still rendered from the same accepted model.

**Tech Stack:** Existing React 19, TypeScript, Three.js, React Three Fiber/Drei,
Blender CLI, Vitest and Playwright. Keep the existing package versions. The
publication task may add `@vercel/blob` as a development-only tool dependency.

## Start here

The user reviewed the written
[design](../specs/2026-10-19-bear-companion-design.md) and authorized this plan on
2026-10-19. The product choices are settled: B, gentle caregiver, feedback-only,
correct answers only, one outfit. Proceed with implementation under those choices;
the actual 3D art still needs its own revision-specific review.

Execution status is recorded in the [handoff](../handoffs/2026-10-19-bear-companion.md).
Checked steps have local evidence; art acceptance, private storage and publication
remain explicit separate gates. This plan does not declare production readiness.
Planning baseline: `0cc7fe4` on `feature/bear-companion-design`. The source checkout
is `/Users/svehla/playground/teo-learn`; on a different machine use the equivalent
repository root. All paths in this plan are relative to that root.

```bash
git status --short --branch
git log -1 --oneline
```

Continue in the primary checkout on the feature branch. Preserve unrelated local
files, including existing untracked B04/F02 fitting reports. If another feature
branch is active or tracked changes overlap this plan, inspect them and coordinate
ownership before switching. A new worktree requires explicit user authorization.
Do not reset the checkout, commit to `main`, open a PR, merge or deploy from this
plan. Publication of the accepted model is distinct from shipping the app.

### Required reading, by task

| When | Read |
| --- | --- |
| Every executor starts | `AGENTS.md`, `CLAUDE.md` if present, the approved design linked above |
| Tasks 1–3: model/dance | `docs/avatar-workflow.md`, `.agents/skills/blender-avatar-pipeline/SKILL.md`, `tools/blender/catalog/README.md`, `.claude/rules/avatar.md` |
| Tasks 4–6: runtime | `.claude/rules/avatar.md`, `.claude/rules/audio.md`, current `GameShell.tsx`, `gameState.ts`, `AvatarPresenter.tsx`, `AvatarModel.tsx` |
| Tasks 6–8: browser | `.claude/rules/e2e.md`, `.agents/skills/playwright-browser-verification/SKILL.md`, `.claude/rules/pwa.md` |

Some old avatar prose still reports problems repaired by 2026-10-09. Read the
specific source/report hashes and later roadmap decisions, not only the old
`catalog-progress.json` stage labels. Human gait proof never proves this bear's
dance, and concept approval never proves model fit.

## Work packages and dependency order

1. [Asset work package](2026-10-19-bear-companion/assets.md): Tasks 1–3.
2. [Runtime work package](2026-10-19-bear-companion/runtime.md): Tasks 4–6.
3. Tasks 7–9 below: publication, complete verification, handoff.

Tasks 4–5 can be developed against fixture assets while art is awaiting review.
Task 6's visual proof needs the bear export from Task 3. Publish or enable a
production model only after the exact revision has technical proof and user art
approval. Keep one Blender author and use the shared queue for every Blender job.

### File ownership map

| Responsibility | Files to create or modify |
| --- | --- |
| Reproducible character | New `tools/blender/catalog/build_bear_companion.py`; new `assets/avatar/catalog-a/companions/bear-v1/` sources, reports, retrospective |
| Celebration authoring | New `tools/blender/catalog/build_bear_celebration.py` |
| Dance/LOD proof | New `tools/avatar/verify_bear_companion.py`; new `tools/avatar/verify_bear_runtime.mjs`; reuse measured catalog helpers |
| Guarded asset-rendering fixture | Modify `src/avatar/AvatarRuntimeFixture.tsx` for a fixed bear source URL and bounded pose inspection |
| Event identity and expiry | New `src/avatar/companionCelebration.ts` and `.test.ts`; new `useCompanionCelebration.ts` |
| Optional asset loading | New `src/avatar/companionResources.ts` and `.test.ts`; new `useCompanionResources.ts` and `avatarSceneLoader.ts` |
| Fixed manifest and still | New `src/avatar/companions/bear-v1.json`, `bear-still.png`; new `companionConfig.ts` and `.test.ts` |
| One-shot playback | New `src/avatar/avatarPlayback.ts` and `.test.ts`; modify `avatarTypes.ts`, `AvatarModel.tsx`, `AvatarScene.tsx`, `AvatarPresenter.tsx`, `AvatarRuntimeBoundary.tsx` |
| Decorative companion | New `src/avatar/LearningCompanion.tsx`; modify `src/shared/game/GameShell.tsx` and `src/shared/ui/UiKitScreen.tsx` |
| Cross-game browser wiring | New `e2e/avatar-companion.spec.ts`; new `e2e/support/companionFixture.ts`; extend `src/shared/services/e2eState.ts` only for a test-mode fixture override |
| Shipping-matrix and offline coverage | Extend `e2e/release-responsive.spec.ts`, `e2e/release-webkit-smoke.spec.ts`, `e2e/production-guards.spec.ts` and `e2e/offline.spec.ts` |
| Public runtime publication | New `tools/avatar/publish_bear_companion.mjs`; dev dependency/lockfile if required; `.env.example` for the server-side Blob token |
| Asset storage and records | `assets/avatar/asset-manifest.json`, `ROADMAP.md`, `docs/avatar-workflow.md`, new `docs/superpowers/handoffs/2026-10-19-bear-companion.md` |

Task-specific files and new CLI contracts are defined in the work packages. A
command labeled **new** becomes runnable only after its preceding implementation
step; do not treat a named new verifier as existing proof.

## Task 7: Publish accepted runtime bytes and bind their identity

**Public publication depends on:** Tasks 1–3 technical proof and revision-specific
user art approval. Step 7.2's private source storage is also used by Task 3 before
art review so another machine can recover the candidate. Local fixture testing
can finish while public publication credentials are unavailable.

**Files:** Create `tools/avatar/publish_bear_companion.mjs`; modify the manifest
`src/avatar/companions/bear-v1.json`, `.env.example`, `package.json` and lockfile
only as needed for the tool. Read the resource contracts in the runtime package.

- [ ] **7.1 Review the exact candidate.** Check `verification-summary.json` binds
  `outfit-lod.glb`, its embedded `celebrate` clip, `bear-still.png` and source hashes
  to passing proof. Record the user's art approval for that revision in the
  retrospective. Concept B selection alone is insufficient. While waiting,
  continue the fixture tests and report publication as pending review.
- [ ] **7.2 Restore/store the model through the repository workflow.** After
  inspecting the existing manifest diff, regenerate it and push new content
  hashes. Restore unrelated missing sources before regenerating a full manifest,
  so absent local files do not disappear from it. Preserve unrelated changed
  assets rather than silently including them in this task's manifest update.

  ```bash
  npm run assets:manifest
  npm run assets:verify
  npm run assets:push -- --dry-run
  npm run assets:push
  ```

  Expected: manifest retains prior entries and adds only this task's intended
  files; every new source/export is retrievable by hash. If bucket credentials
  are missing, keep the files and record that storage is incomplete. `push` does
  not support `--prefix`; do not invent that flag or upload unrelated changes.
  Task 3 should already have privately stored its candidate before handing off
  between machines. If all hashes remain identical, verify that result rather
  than rebuilding the manifest and reuploading needlessly. Private source storage
  does not need final art approval; public runtime publication does.
- [x] **7.3 Implement a publication tool.** Use the official
  [Vercel Blob `put` reference](https://github.com/vercel/storage/blob/main/_autodocs/api-reference/blob-put.md).
  It was checked on 2026-10-19; recheck it when executing after an SDK change.
  Install the upload SDK as a dev dependency only if it is not already present:

  ```bash
  npm install --save-dev @vercel/blob
  ```

  The script reads `verification-summary.json`, refuses nonpassing or mismatched
  hashes, and requires `BLOB_READ_WRITE_TOKEN` in its process environment. The
  upload core is:

  ```js
  import { createHash } from 'node:crypto';
  import { readFile } from 'node:fs/promises';
  import { put } from '@vercel/blob';

  const file = 'assets/avatar/catalog-a/companions/bear-v1/outfit-lod.glb';
  const bytes = await readFile(file);
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) throw new Error('BLOB_READ_WRITE_TOKEN is required for publication');
  const blob = await put(`avatars/bear-v1/${sha256}.glb`, bytes, {
    token,
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: 'model/gltf-binary',
    cacheControlMaxAge: 31536000,
  });
  ```

  Add the explicit proof checks and retrieval check around this core, and write
  the returned URL into the manifest only after downloading that URL and checking
  the SHA-256 equals `sha256`. On a repeated run, an existing immutable object
  can be reused after the same download/hash check; never overwrite it. A failed
  upload or mismatch leaves the prior manifest intact. Keep the token out of
  output, Vite definitions, app code and JSON. Add its name, not a value, to
  `.env.example` as an upload-tool-only variable.
- [ ] **7.4 Execute publication, then inspect the manifest diff.**

  ```bash
  node --env-file-if-exists=.env tools/avatar/publish_bear_companion.mjs
  npm run test:unit -- src/avatar/companionConfig.test.ts
  ```

  Expected: a real HTTPS public Blob URL, correct hash and byte count, declared
  `celebrate` duration, `accepted: true`, and a still from that exact model.
  Verify a cross-origin browser GET can decode the GLB. This command publishes
  model bytes; it does not deploy the app. If credentials/store access are
  unavailable, leave `accepted: false` and `modelUrl: null`, finish fixture proof,
  and report the feature as unpublished rather than integrated for production.
- [ ] **7.5 Verify and commit this task's exact files.** Run lint, Vitest and
  affected pure verifiers before the commit. Use an imperative `feat:` or `chore:`
  subject and a body explaining why. Update `ROADMAP.md` with publication status.

## Task 8: Prove the full learning flow

**Files:** `e2e/avatar-companion.spec.ts`, `tools/avatar/verify_bear_runtime.mjs`,
the handoff record, and verification artifacts. Read the browser skill first.

- [x] **8.1 Install matching browsers if dependencies/Playwright were installed
  or upgraded.** Run `npm run setup:browsers`. Use the repository's preinstalled
  browser resolver where downloads are unavailable. On macOS launch-permission
  failures, rerun the identical command with the client's normal sandbox
  escalation instead of changing application code. For WebGL proof use the
  browser skill's software-GL flags; record those flags and device/browser.
- [x] **8.2 Run focused behavioral proof.** The fixture helper must route the
  actual locally hash-verified Task 3 GLB, not a synthetic substitute. Run:

  ```bash
  npm run test:unit -- src/avatar/companionCelebration.test.ts src/avatar/companionResources.test.ts src/avatar/companionConfig.test.ts src/avatar/avatarPlayback.test.ts
  npm run build:e2e
  npx playwright test --config=e2e/playwright.config.ts e2e/avatar-companion.spec.ts --project=desktop
  node tools/avatar/verify_bear_runtime.mjs --base=http://127.0.0.1:3003 --output-dir=artifacts/verification/bear-companion
  ```

  The last command is **new**, created by Task 3, and needs its own loopback
  server described there. Stop only servers started for this task. The new
  browser spec imports `support/fixtures`, covers all 11 entries of
  `RELEASE_GAME_CASES`, and runs in normal integration too. A missing source GLB
  fails actionable fixture setup; do not skip the new tests automatically.
- [x] **8.3 Review actual rendering and layout.** Inspect only <=320px-wide
  copies. Capture normal success, last success before/during results, and reduced
  motion at `narrowPhone`, `shortLandscape` and desktop, in Slovak and Czech.
  Record model SHA, commit/build identity, seed, viewport, browser, elapsed clip
  time, console messages and failed requests. Compare two actual animation frames
  with different limb poses; a canvas element alone is not animation proof.
  Assert the entire bear remains framed, text/buttons fit, all controls are
  reachable at 200% zoom, and no pointer/keyboard interaction is intercepted.
  Run the focused shipping-matrix cases from runtime Task 6.8 on the matching
  test build, without claiming a full release-profile pass:

  ```bash
  npx playwright test --config=e2e/playwright.release.config.ts e2e/release-responsive.spec.ts e2e/release-webkit-smoke.spec.ts --grep='bear companion'
  ```
- [x] **8.4 Run the fresh integration profile once the candidate is stable.**

  ```bash
  npm run verify:edit -- --base=0cc7fe4 --dry-run
  npm run verify:integration -- --force
  git diff --check
  ```

  Expected selector: integration for shared shell/renderer/tooling changes. The
  aggregate integration run includes lint, unit, pure, audio inventory, matching
  test build/browser proof, production build and production bundle checks. Do
  not repeat the same full gate merely to collect another green result. Include
  committed changes when selecting edits. Keep unrelated untracked source reports
  visible in the selection record rather than pretending the checkout is clean.
- [x] **8.5 Check production and offline boundaries.** Inspect `dist` and the
  Workbox output: Three.js remains behind `AvatarScene`; test fixture overrides
  and private-source URLs are absent; GLBs and the renderer stay out of precache.
  Run the existing production-guard/offline tests with the proper production
  config. Test cached and uncached/offline avatar conditions through actual game
  controls; gameplay still completes even when the optional avatar cannot load.
  Extend the production tests to intercept the manifest's actual public URL with
  the hash-verified model for deterministic warm/cold/offline cases; production
  cannot use the test fixture flag. Preserve one separate actual public-URL/CORS
  probe in Task 7. If the manifest is still disabled, assert injected fixture
  globals cannot enable it and report public production-avatar proof as pending.

  ```bash
  npm run build
  npm run verify:bundle
  npx playwright test --config=e2e/playwright.production.config.ts e2e/production-guards.spec.ts e2e/offline.spec.ts
  ```

  Keep targeted failure injection scoped to the expected asset/context failure;
  assert no extra console/request failures. An expected injected failure is
  recorded separately, not erased from the suite's global assertions.
- [x] **8.6 Report every gate honestly.** Reused proof, dry-run selection, missing
  publication, unavailable browsers and failing checks are different outcomes.
  The current recording inventory has pending clips; a later executor must report
  its actual inventory result and not inherit the prior one-release recording
  exception as authorization for a new release. No shipping is authorized here.

## Task 9: Close the implementation handoff

- [x] Create/update `docs/superpowers/handoffs/2026-10-19-bear-companion.md` with
  the template below. Update `ROADMAP.md` and the avatar workflow entry point so
  another agent can find this lane without reading old fitting history. Leave
  broader wardrobe/selfie tasks open.
- [x] Record final art approval and exact runtime URLs/hashes separately from
  technical passes. If review/publication is still pending, the task is a tested
  candidate, not a finished product integration.
- [x] Run lint, unit and affected pure checks for new changes since Task 8's proof,
  then commit only owned files. Use `git diff --check` and inspect the staged
  diff. A docs-only close-out does not require replaying the entire browser gate.
- [x] Summarize what shipped in the branch, what actually passed, outstanding
  limitations and the next action. Leave PR, merge and production release to the
  user's explicit request.

## Resume record — use after every task

Put this in the handoff file; fill actual values, never assumed passes:

```markdown
## Task <number>: <name>
- Status: not started / in progress / passed / awaiting art review / blocked
- Commit and branch:
- Owned files and unrelated local files preserved:
- Source/model/still hashes and source paths:
- Commands actually run, profile, exit status, report paths:
- Review captures (<=320px), browser, viewport and build identity:
- User art review, exact revision and date:
- Known failures or missing external prerequisites:
- Next unchecked step and the command to resume it:
```

## Copyable prompt for Claude Code or another agent

```text
Implement docs/superpowers/plans/2026-10-19-bear-companion.md in this repository.
The written design is approved. Start with AGENTS.md, CLAUDE.md if present, the
linked design, and the plan's Start here section. Follow the asset/runtime work
packages in dependency order and resume from the handoff's last proven step.
Use the primary checkout and a feature branch; preserve unrelated work. Use one
author for coupled Blender/model work and the shared Blender queue. Keep tasks,
source hashes, verification results and remaining work in the specified handoff.
Build bear B, one fixed outfit and one success-only dance; include final correct
answers, reduced motion and loading failure behavior without adding game delays.
The plan is executable without Codex tools or global skills. Read repository-local
skills for Blender/browser work. Carry out authorized implementation and local
verification. Present the actual model revision for art acceptance before public
publication/production enablement; continue independent code/tests while waiting.
Do not create a worktree, expose credentials, broaden the wardrobe/selfie scope,
open a PR, merge or deploy without the authorization required by AGENTS.md.
```
