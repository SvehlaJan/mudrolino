# Bear Guide Phase A ("Momentový sprievodca") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Closeout (2026-11-11):** Tasks 1–6 implemented and committed on `feature/bear-guide-phase-a`. Existing integration proof was reused after the runner confirmed identical inputs/environment; the focused production/offline suite passed freshly (8/8). See `docs/superpowers/handoffs/2026-11-11-bear-guide-phase-a.md`. Exact-model art approval and immutable Blob publication completed with explicit user approval on 2026-11-11.

**Goal:** Turn the Mudrolíno 3D bear into a visual moment-based companion guide across Home, round celebrations, exhausted-attempt/zero-score overlays, and a 12-second inactivity nudge while shrinking `model.glb` below `900 KB` gzip, fixing prop clipping and loop/blink life, pausing idle WebGL at `0 fps`, precaching `bear-still.png` offline, and logging deferred phases in `ROADMAP.md`.

**Architecture:** Three independent foundations land first in parallel: documentation/roadmap alignment (Task 1), WebGL `0 fps` post-clip lifecycle + memory release + Workbox offline precache (Task 2), and shared-GPU 3D accessories + frustum fixes + `Head`-parented blinking eyelids/brows in TypeScript and Blender Python (Task 3). On top of those interfaces, two parallel streams deliver the React guide touchpoints + cross-session rotation (Task 4) and the serialized Blender `celebration-v7` asset rebuild + mesh decimation + dead-track pruning + 120 Hz parity/clearance proofs (Task 5), converging in E2E browser/offline proofs and `<= 320 px` visual review sign-off before any Vercel Blob publication (Task 6).

**Tech Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, Three.js / `@react-three/fiber` / `@react-three/drei`, `@gltf-transform/core`, Vitest, Playwright (`1.60.0`), headless Blender Python (`tools/avatar/blender_queue.py`).

**Spec:** `docs/superpowers/specs/2026-11-10-bear-guide-phase-a-design.md`

## Global Constraints

- **Branch & untracked hygiene:** Work on `feature/bear-guide-phase-a` in the primary checkout; stage only explicit file paths (`git add <explicit-paths>`) and leave the 30 pre-existing untracked `assets/avatar/catalog-a/{B04,F02,female}/...` diagnostic files untouched.
- **Zero credit spend & zero new voice clips:** Spend `0` Meshy credits; add no spoken recordings, sound effects, or TTS lines (`tools/audio/pending-recordings.json` and `npm run test:audio:strict` stay unchanged).
- **Bundle & precache boundary:** Never statically import `AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay`, or `skinnedGarment` outside `src/avatar/`; keep `'avatar/**/*.glb'` and `'assets/AvatarScene-*.js'` in Workbox `globIgnores` while precaching `'assets/bear-still-*.png'`.
- **Responsive & audio invariants:** Preserve `scrollHeight <= clientHeight + 1`, `>= 48×48 px` touch targets, and zero pairwise overlap across constrained viewports (`320×568`, `667×375`, `568×320`); never delay or reorder the item-before-verdict answer-audio contract; preserve `LearningCompanion.tsx`'s `{!canRender && <img ... />}` guard (`8d2dc45`).
- **GLB & publication gates:** Single skinned mesh `Bear_fixed_outfit` on the 24-bone `generatedBones` rig, `cameraDistance === 5.6`, `celebrate` duration `1.4s` (`169` frames at `120 Hz`), raw float32 skin weights `|sum - 1| <= 1e-5` (never quantize `WEIGHTS_0`), `endpointError <= 1e-5`, `maxFloorPenetrationM <= 0.007`, `maximum_vertex_error_m <= 30 µm`, `0` new BVH contacts, `<= 900 KB` gzip (`<= 2,100,000` hard cap), serialized via `blender_queue.py`, inspect only `<= 320 px` review copies, and do **not** run `publish_bear_companion.mjs` to Vercel Blob until the user approves `artReview` on the `celebration-v7` renders.

## Review Focus

1. **Non-bear avatars in `/avatar` gallery sprouting giant bear eyelids/brows:** Unlike clip-gated props (`flex`, `bow`), 3D eyelids/brows remain visible on `'idle'` and `null`; because bear `Head` bone coordinates are in centimeters (`~38`), attaching them to human catalog avatars that also have `Head`/`LeftHand`/`RightHand` would cover human models in 40-meter spheres. Guard `ensureAccessories(scene)` on `Boolean(scene.getObjectByName('Bear_fixed_outfit'))` (pinned in Task 3).
2. **Round-5 exhausted failure colliding with `session-complete` event keys or React 19 `<StrictMode>` double-invoking reducers:** Round 5 failure enters `answered-incorrectly` (`roundsPlayed: 5`) before `session-complete` (`roundsPlayed: 5`); sharing `${run}:${roundsPlayed}:${correctRounds}` would suppress the summary clip, whereas breaking `${run}:5:5` on round-5 *success* would violate `avatar-companion.spec.ts:122` (`final correct keeps one event through completion`). Suffix only failure events (`:failure`), and keep `celebrationReducer` / `createCelebrationState` free of module-counter mutations so `<StrictMode>` double-invocation never skips `celebrate` on run 0 (pinned in Task 4).
3. **Blank/stretched canvas on resize or ignored wake-up after `setFrameloop('never')`:** Once `CompanionCanvas` pauses at `0 fps`, rotating the tablet (`ResizeObserver` reconfiguring canvas dimensions) or changing `playback.eventKey` / `animationName` must wake R3F (`setFrameloop('always')` / fresh render) before re-settling, or the canvas turns blank/frozen (pinned in Task 2 and Task 6).
4. **12-second inactivity nudge racing with a child's tap or shifting constrained viewport layout:** If the 12s timer fires right before an answer tap, prompt replay, retry, or pause, the nudge must occupy zero document flow, keep `pointer-events: none`, dismiss synchronously on `pointerdown`/`keydown` capture or exit from `awaiting-answer`, and reset its 12s clock on `wrongAttempts` or `replaying` changes (pinned in Task 4 and Task 6).
5. **Rapid taps on `HomeCompanion` & backward compatibility with `celebration-v6` before Blob publish:** Rapid taps by a child must increment a single monotonic `eventKey` and replace pending settle timers cleanly without cutting the newest clip short; requesting `'idle_breathe'` against a `celebration-v6` GLB that only defines `'idle'` must fall back to `'idle'` cleanly without errors (pinned in Task 2 and Task 4).

## Parallel Execution Map

- **Wave 1 (3 parallel subagents — zero shared files):** Task 1, Task 2, Task 3.
- **Wave 2 (2 parallel subagents — zero shared files, after Wave 1):** Task 4, Task 5.
- **Wave 3 (1 integration subagent + coordinator visual review, after Wave 2):** Task 6.

---

### Task 1: Docs Drift Sync & `ROADMAP.md` Backlog [Wave 1]

**Files:**
- Modify: `docs/avatar-workflow.md`
- Modify: `.agents/skills/blender-avatar-pipeline/SKILL.md`
- Modify: `ROADMAP.md`
- Include (already updated): `docs/superpowers/specs/2026-11-10-bear-guide-phase-a-design.md`

**Interfaces:**
- Consumes: Approved spec `docs/superpowers/specs/2026-11-10-bear-guide-phase-a-design.md`.
- Produces: Reconciled workflow/skill docs matching current runtime symbols (`AvatarScene.tsx`, `LearningCompanion.tsx`, `HomeCompanion.tsx`, `CompanionNudge.tsx`, `companionAccessories.ts`) and `ROADMAP.md` entries for Phase A + 4 deferred backlog items + `2026-11-10` Decisions Log row.

- [x] **Step 1: Inspect stale symbol and revision references in `docs/avatar-workflow.md` and `.agents/skills/blender-avatar-pipeline/SKILL.md`**

Read `docs/avatar-workflow.md` and `.agents/skills/blender-avatar-pipeline/SKILL.md` and locate retired references (`CompanionPreview.tsx`, `magnifyingGlass`/`lightbulb`/`superheroMask`/`topHat`/`flag`/`maracas`, 16-clip counts, and outdated revision notes).

- [x] **Step 2: Update `docs/avatar-workflow.md` and `.agents/skills/blender-avatar-pipeline/SKILL.md`**

Update both files so they accurately name:
- Runtime components: `AvatarPresenter.tsx` -> lazy `AvatarScene.tsx` -> `AvatarModel.tsx`, consumed by `LearningCompanion.tsx`, `HomeCompanion.tsx`, and `CompanionNudge.tsx`.
- Procedural bone-parented nodes in `src/avatar/companionAccessories.ts` (mirrored in `tools/blender/catalog/bear_accessories.py` for scenes containing `Bear_fixed_outfit`): `searchGlass`, `thinkBulb`, `flexMask`, `bowHat`, `marchFlag`, `wiggleLeftMaraca`, `wiggleRightMaraca`, plus `Head` facial nodes `leftEyelid`, `rightEyelid`, `leftBrow`, `rightBrow`.
- 18 character actions (`celebrate`, `wave`, `clap`, `jump`, `finale`, `idle`, `idle_breathe`, `search`, `think`, `listen`, `encourage`, `shrug`, `flex`, `bow`, `march`, `wiggle`, `peekaboo`, `stretch`) and the `celebration-v7` decimation + static-track pruning pipeline (`tools/avatar/optimize_generated_bear.mjs`).

- [x] **Step 3: Update `ROADMAP.md` (`## Phase 5 — Avatar Expansion` and `## Decisions Log`)**

In `ROADMAP.md`:
1. Under `## Phase 5 — Avatar Expansion`, add the Phase A item (Moment-based visual guide: Home welcome/tap, cross-session celebration rotation, empathetic failure/`0/5` reactions, 12s inactivity nudge, `celebration-v7` `< 900 KB` gzip optimization, 3D blinking/brows, `0 fps` idle pause, offline `bear-still.png` precache) and four `[ ]` deferred backlog items:
   - `Bear Guide Phase B — Persistent in-round GamePrompt companion & single shared WebGL context` (tap to replay prompt, live `listen`/`search` during prompt audio, inline 1st/2nd wrong-attempt reaction, single cross-route WebGL portal).
   - `Bear Guide Voice Pack (SK + CZ)` (recorded caregiver lines for Home welcome, idle encouragement, and warm retry hints in `contentRegistry.ts` and `tools/audio/pending-recordings.json`).
   - `Bear Guide Bespoke Pedagogical Clips` (`talk_explain`, `point_down`, `gentle_try_again`, `count_one_two_three`, `sleepy_yawn`).
   - `Bear Mascot App Icon & Open Graph Branding` (cross-referenced with `1.0 P3` Mudrolíno icon task via `npm run pwa:icons`).
2. Append a `2026-11-10` row to `## Decisions Log` recording the choice of Option A (visual moment-based guide first) and deferral of Option B and spoken bear voice clips.

- [x] **Step 4: Run lint to verify workspace cleanliness**

Run: `npm run lint`
Expected: `0` errors (only the known `ContentContext` `react-refresh` warning).

- [x] **Step 5: Commit docs, spec, plan, and roadmap**

```bash
git add docs/avatar-workflow.md .agents/skills/blender-avatar-pipeline/SKILL.md ROADMAP.md docs/superpowers/specs/2026-11-10-bear-guide-phase-a-design.md docs/superpowers/plans/2026-11-10-bear-guide-phase-a.md
git commit -m "docs: record bear guide phase A spec, plan, and deferred roadmap"
```

---

### Task 2: Offline Precache, Raw GLB Byte Release & Zero-FPS Post-Clip WebGL Lifecycle [Wave 1]

**Files:**
- Modify: `src/pwa/pwaConfig.ts:165-181`
- Create: `src/pwa/pwaConfig.test.ts`
- Modify: `src/avatar/companionResources.ts:15-88`
- Modify: `src/avatar/companionResources.test.ts`
- Modify: `src/avatar/companionModelLoader.ts:34-40`
- Modify: `src/avatar/companionModelLoader.test.ts`
- Modify: `src/avatar/AvatarScene.tsx:80-177,206-308`
- Modify: `src/avatar/AvatarModel.tsx:15-35,270-345`
- Create: `src/avatar/avatarFrameloop.ts`
- Create: `src/avatar/avatarFrameloop.test.ts`

**Interfaces:**
- Consumes: `AvatarPlaybackOptions` (`src/avatar/avatarTypes.ts`), `applyAvatarPlayback` (`src/avatar/avatarPlayback.ts`).
- Produces:
  - `CompanionResourceStore.releaseModelBytes(url: string): void` in `src/avatar/companionResources.ts`.
  - `shouldPauseAvatarFrameloop(options: { mode?: 'loop' | 'once' | 'still'; isInspection: boolean; actionPaused: boolean; actionTime: number; duration: number; settledFramesRendered: number }): boolean` in `src/avatar/avatarFrameloop.ts`.
  - `AvatarModelProps.onPlaybackComplete?: () => void` in `src/avatar/AvatarModel.tsx` and `AvatarSceneProps.onPlaybackComplete?: () => void` in `src/avatar/AvatarScene.tsx` (also forwarded through `src/avatar/AvatarPresenter.tsx` in Task 4 if needed, or exposed on `AvatarSceneProps` now).
  - `resolveCompanionClipName(requested: string | null | undefined, available: readonly string[]): string | undefined` in `src/avatar/avatarFrameloop.ts` (prefers exact match, falls back `'idle_breathe'` -> `'idle'`, then case-insensitive `'idle'`, then `available[0]`).

- [x] **Step 1: Write failing unit tests for Workbox precache, byte release, clip fallback, and frameloop pause policy**

1. Create `src/pwa/pwaConfig.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { pwaPluginOptions } from './pwaConfig';

describe('pwaConfig workbox precache rules', () => {
  it('precaches hashed bear-still fallback PNGs while keeping 3D GLBs and AvatarScene chunk excluded', () => {
    expect(pwaPluginOptions.workbox?.globPatterns).toContain('assets/bear-still-*.png');
    expect(pwaPluginOptions.workbox?.globIgnores).toEqual(
      expect.arrayContaining(['avatar/**/*.glb', 'assets/AvatarScene-*.js']),
    );
  });
});
```
2. In `src/avatar/companionResources.test.ts`, add a test asserting `store.releaseModelBytes(url)` clears `store.getModelBytes(url)` to `null` while keeping `store.getSnapshot(url).status === 'ready'`.
3. In `src/avatar/companionModelLoader.test.ts`, add a test asserting that once the `load` callback resolves a `GLTF` and caches `loader.getLoaded(url)`, `companionResources.releaseModelBytes(url)` is invoked so duplicate raw `ArrayBuffer` bytes are freed while subsequent `loader(url)` calls return the cached `GLTF` without re-reading bytes.
4. Create `src/avatar/avatarFrameloop.test.ts` testing:
   - `shouldPauseAvatarFrameloop`: returns `false` in `'loop'` mode or when `isInspection` is `true`; returns `false` on the frame where `'once'` reaches `actionTime >= duration - 1e-6` (`settledFramesRendered === 0`, so the final pose with hidden accessories renders once) and `true` once `settledFramesRendered >= 1`; returns `false` for `'still'` when `settledFramesRendered === 0` and `true` when `settledFramesRendered >= 1`.
   - `resolveCompanionClipName`: returns `'idle_breathe'` when present in `available`; falls back cleanly to `'idle'` when `'idle_breathe'` is requested against `celebration-v6`'s 17-clip list (Review Focus #5).

- [x] **Step 2: Run Vitest on the new/updated tests to verify they fail**

Run: `npx vitest run src/pwa/pwaConfig.test.ts src/avatar/companionResources.test.ts src/avatar/companionModelLoader.test.ts src/avatar/avatarFrameloop.test.ts`
Expected: FAIL (`assets/bear-still-*.png` missing, `releaseModelBytes` undefined, `./avatarFrameloop` missing).

- [x] **Step 3: Implement Workbox precache rule and raw byte release**

1. In `src/pwa/pwaConfig.ts`, add `'assets/bear-still-*.png'` to `workbox.globPatterns` (keeping `globIgnores` unchanged).
2. In `src/avatar/companionResources.ts`, add `releaseModelBytes(url: string): void` to `CompanionResourceStore` (`const entry = entries.get(url); if (entry) entry.bytes = null;`).
3. In `src/avatar/companionModelLoader.ts`, inside `loadCompanionModel`, chain `.then(gltf => { companionResources.releaseModelBytes(url); return gltf; })` after `new GLTFLoader().parseAsync(bytes, basePath)`.

- [x] **Step 4: Implement `avatarFrameloop.ts` and wire `0 fps` post-clip pause + resize wake in `AvatarModel.tsx` and `AvatarScene.tsx`**

1. Create `src/avatar/avatarFrameloop.ts` implementing `shouldPauseAvatarFrameloop` and `resolveCompanionClipName`.
2. In `src/avatar/AvatarModel.tsx`:
   - Add optional `onPlaybackComplete?: () => void` to `AvatarModelProps`.
   - Use `resolveCompanionClipName(animationName, names)` in the playback `useLayoutEffect`.
   - Use `useThree((s) => s.setFrameloop)` and a `settledFramesRef = useRef(0)` + `completionNotifiedRef = useRef(false)`:
     - In the playback `useLayoutEffect` (whenever `animationName`, `playbackMode`, `playbackEventKey`, or `playbackStartedAtMs` changes), reset `settledFramesRef.current = 0`, `completionNotifiedRef.current = false`, and if `!isInspection` call `setFrameloop('always')` so R3F wakes immediately on any new event or clip change (Review Focus #3).
     - In `useFrame`, keep the existing 3-argument `syncCompanionAccessories(scene, finishedOnce ? null : action.getClip().name, norm)` call (so Wave 1 Task 2 compiles independently of Task 3); when `finishedOnce || playbackMode === 'still'`, pause `action.paused = true`, fire `onPlaybackComplete?.()` once when `finishedOnce` first becomes true, increment `settledFramesRef.current`, and when `shouldPauseAvatarFrameloop(...)` returns `true`, call `setFrameloop('never')`.
3. In `src/avatar/AvatarScene.tsx`:
   - Add `onPlaybackComplete?: () => void` to `AvatarSceneProps` and forward it to `AvatarModel`.
   - In `CompanionCanvas`'s `ResizeObserver` callback (`configure().then(...)`), after `configure()` updates `size` on a live root (`if (active && store)`), if `store.getState().frameloop === 'never'`, call `store.getState().invalidate()` (or `renderer?.render(store.getState().scene, store.getState().camera)`) so rotating/resizing a paused `0 fps` companion immediately redraws at the new aspect/resolution without staying blank or resuming `60 fps` (Review Focus #3).

- [x] **Step 5: Run unit tests and lint to verify Task 2 passes**

Run: `npx vitest run src/pwa/pwaConfig.test.ts src/avatar/companionResources.test.ts src/avatar/companionModelLoader.test.ts src/avatar/avatarFrameloop.test.ts && npm run lint`
Expected: PASS (`0` lint errors).

- [x] **Step 6: Commit Task 2**

```bash
git add src/pwa/pwaConfig.ts src/pwa/pwaConfig.test.ts src/avatar/companionResources.ts src/avatar/companionResources.test.ts src/avatar/companionModelLoader.ts src/avatar/companionModelLoader.test.ts src/avatar/avatarFrameloop.ts src/avatar/avatarFrameloop.test.ts src/avatar/AvatarModel.tsx src/avatar/AvatarScene.tsx
git commit -m "perf: pause settled companion WebGL at 0fps, free raw GLB bytes, and precache bear still"
```

---

### Task 3: Shared GPU Accessories, Prop Frustum Fixes & 3D Facial Blink/Brows [Wave 1]

**Files:**
- Modify: `src/avatar/companionAccessories.ts`
- Create: `src/avatar/companionAccessories.test.ts`
- Modify: `tools/blender/catalog/bear_accessories.py`

**Interfaces:**
- Consumes: Three.js `Object3D` hierarchy containing `Bear_fixed_outfit`, `Head`, `RightHand`, `LeftHand`.
- Produces:
  - `syncCompanionAccessories(scene: Object3D, activeClipName: string | undefined | null, normalizedProgress?: number, elapsedSeconds?: number): void` in `src/avatar/companionAccessories.ts`.
  - Exported pure helpers for testing: `computeBlinkAmount(activeClipName: string | null | undefined, normalizedProgress: number, elapsedSeconds: number): number` (`0` = open, `1` = closed) and `computeBrowPose(activeClipName: string | null | undefined): { liftY: number; leftTiltRad: number; rightTiltRad: number }`.
  - Matching Python accessory/facial geometry in `tools/blender/catalog/bear_accessories.py` (`attach_bear_accessories`, `sync_bear_accessories`).

- [x] **Step 1: Write failing unit tests in `src/avatar/companionAccessories.test.ts`**

Create `src/avatar/companionAccessories.test.ts` testing:
1. **Non-bear rig safety (Review Focus #1):** Calling `syncCompanionAccessories(humanScene, 'idle', 0.5, 1.0)` on a scene with `Head`, `LeftHand`, `RightHand` but **without** an object named `'Bear_fixed_outfit'` attaches `0` `__bear_companion_accessory__` groups.
2. **Singleton GPU resource sharing:** Calling `syncCompanionAccessories` on two distinct cloned bear scenes (`sceneA`, `sceneB`, each containing `Bear_fixed_outfit`, `Head`, `LeftHand`, `RightHand`) shares the exact same `BufferGeometry` and `MeshStandardMaterial` object references (`===`) across corresponding meshes in `sceneA` and `sceneB` rather than allocating new geometries/materials per clone.
3. **Prop frustum-safe bounds & clip visibility:**
   - `flexMask` vertex `Y` bounds center lower (`cy = 37.8` instead of `41.8`, mean `Y < 40.5`), visible only when `activeClipName === 'flex'`.
   - `thinkBulb` root position is `[-20, 73, 16]` (lowered from `80.5`), visible during `think` (`normalizedProgress` in `[0.50, 0.92]`) and hidden otherwise.
   - `marchFlag` pole height is `<= 46` and holder tilts inward (`x >= 0`), visible only during `'march'`.
   - `bowHat` crown reach is pulled inward (`<= 31` along holder `Y`), visible only during `'bow'`.
4. **3D blinking & brow expressions:**
   - Bear scenes receive `leftEyelid`, `rightEyelid`, `leftBrow`, `rightBrow` under `Head`.
   - `computeBlinkAmount` returns `0` at `t = 0` (`bear-still.png` / frame 0 stays eyes-open!), pulses smoothly up to `>= 0.9` during periodic `~3.4 s` `150 ms` blink windows (e.g., `elapsedSeconds = 1.75` on `'idle_breathe'`) and mid-gesture expressive blinks on `'wave'` / `'encourage'`, and forces eyelids hidden (`visible = false`) when `activeClipName === 'flex'` (mask covers eyes) or during `'peekaboo'` paw-cover window (`normalizedProgress` in `[0.22, 0.78]`).
   - `computeBrowPose` returns positive cheerful lift on `'celebrate'`, sympathetic inner-brow tilt on `'encourage'` / `'shrug'`, and asymmetric curious lift on `'think'` / `'search'` / `'listen'`, and neutral `0` on `null` / `'idle'`.

- [x] **Step 2: Run Vitest to confirm `companionAccessories.test.ts` fails**

Run: `npx vitest run src/avatar/companionAccessories.test.ts`
Expected: FAIL (`computeBlinkAmount` / `computeBrowPose` not exported, geometries not shared, non-bear scene attaches meshes).

- [x] **Step 3: Implement shared GPU resources, frustum-safe transforms, and 3D eyelids/brows in `src/avatar/companionAccessories.ts`**

Update `src/avatar/companionAccessories.ts`:
1. Require `scene.getObjectByName('Bear_fixed_outfit')` inside `ensureAccessories(scene)` before attaching anything (Review Focus #1).
2. Lazily cache all `BufferGeometry` and `MeshStandardMaterial` instances in a module-level singleton (`getSharedAccessoryResources()`), so `createMagnifyingGlass`, `createLightbulb`, `createSuperheroMask`, `createTopHat`, `createPennantFlag`, `createMaraca`, `createEyelid`, and `createBrow` instantiate only lightweight `Group` and `Mesh` wrappers referencing shared GPU buffers/materials.
3. Apply the four frustum/alignment fixes from Spec §1:
   - `flexMask` (`maskPoint`): lower `cy` from `41.8 + 0.6 * v` to `37.8 + 0.6 * v`, adjust minimum `y` clamp (`32.8` / `29.8`) and `snoutBulge` / curvature center (`38.5` / `38.0`) so eye cutouts sit squarely over the bear's pupils (`Head`-local `x ≈ ±13.5, y ≈ 37.8, z ≈ 43.5`).
   - `bowHat`: orient holder at `[0, 10.5, 2.0]` along `[-0.22, 0.88, -0.42]` with `hatOffset` at `[0, 26.0, 0]` so the crown stays inside `NDC_X >= -0.92` at `cameraDistance = 5.6`.
   - `marchFlag`: orient holder at `[0, 11.5, 2.0]` along `[0.02, 0.965, 0.26]`, pole height `46` (centered at `y = 20`), finial at `y = 43.6`, pennant `y` centered at `34.5` so finial and pennant stay within `NDC_X >= -0.92` and `NDC_Y <= +0.93`.
   - `thinkBulb`: root position `[-20, 73.0, 16]` and ray ring radius `10.8` (down from `13.0`) so upper rays stay within `NDC_Y <= +0.90`.
4. Add `leftEyelid`, `rightEyelid`, `leftBrow`, `rightBrow` parented to `Head`:
   - Honey-fur upper eyelid caps (`SphereGeometry(6.4, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52)`, material `#c9823b`, `roughness: 0.72`) placed at `[±13.5, 38.2, 42.2]` (`scale.set(1.08, 0.95, 0.72)`), rotating around `X` from retracted (`-1.05 rad`, `visible = blink > 0.02`) to closed (`+0.18 rad` at `blink = 1`) so open eyes look 100% identical at `blink = 0` (`frame 0`) and smoothly sweep shut over the painted pupils during a blink!
   - Dark-brown expressive brow arcs (`TorusGeometry(5.6, 1.05, 8, 16, Math.PI * 0.68)`, material `#4a2811`, `roughness: 0.75`) placed slightly proud of the fur above the eyes (`[±13.8, 45.2, 43.2]`), hidden when `activeClipName === 'flex'` and subtly offset/tilted by `computeBrowPose(activeClipName)` when an expressive clip is active (`visible = activeClipName !== 'flex' && activeClipName !== null && (Math.abs(pose.liftY) > 0 || Math.abs(pose.leftTiltRad) > 0)` so `frame 0` / `'idle'` neutral still remains silhouette-identical while expressive clips gain warm brow motion, or subtle `±6°` lift on active clips).
   - Implement `computeBlinkAmount(activeClipName, normalizedProgress, elapsedSeconds)`: `0` when `elapsedSeconds <= 0.05` (preserving frame-0 still parity), smooth `sin(π * u)` `150 ms` blink pulse every `3.4 s` (`t = 1.68..1.83`, `5.08..5.23`, …) plus an expressive mid-clip blink window (`normalizedProgress` in `[0.46, 0.56]`) on `'wave'`, `'encourage'`, `'shrug'`, `'think'`, `'listen'`.

- [x] **Step 4: Mirror the exact prop coordinates and facial helpers in `tools/blender/catalog/bear_accessories.py`**

Update `tools/blender/catalog/bear_accessories.py` so `mask_point`, `bowHat`, `marchFlag`, `thinkBulb`, and optional `eyelid`/`brow` preview nodes match `src/avatar/companionAccessories.ts` 1:1 in Blender local bone coordinates.

- [x] **Step 5: Run Vitest, Python syntax check, and ESLint**

Run: `npx vitest run src/avatar/companionAccessories.test.ts && python3 -m py_compile tools/blender/catalog/bear_accessories.py && npm run lint`
Expected: PASS (`0` errors).

- [x] **Step 6: Commit Task 3**

```bash
git add src/avatar/companionAccessories.ts src/avatar/companionAccessories.test.ts tools/blender/catalog/bear_accessories.py
git commit -m "feat: share companion GPU resources, fix prop framing, and add 3D blink and brows"
```

---

### Task 4: Moment-Based Visual Guide State & UI Touchpoints [Wave 2]

**Files:**
- Modify: `src/avatar/companionCelebration.ts`
- Modify: `src/avatar/companionCelebration.test.ts`
- Modify: `src/avatar/useCompanionCelebration.ts`
- Modify: `src/avatar/AvatarModel.tsx`
- Modify: `src/avatar/AvatarPresenter.tsx`
- Modify: `src/shared/uiCopy.ts`
- Create: `src/avatar/HomeCompanion.tsx`
- Create: `src/avatar/HomeCompanion.test.ts`
- Create: `src/avatar/CompanionNudge.tsx`
- Create: `src/avatar/CompanionNudge.test.ts`
- Modify: `src/home/GroupedHomeScreen.tsx`
- Modify: `src/shared/game/GamePrompt.tsx`
- Modify: `src/shared/game/GameShell.tsx`
- Modify: `src/shared/ui/UiKitScreen.tsx`
- Modify: `src/shared/ui/gallery/componentInventory.generated.ts`

**Interfaces:**
- Consumes: `AvatarSceneProps.onPlaybackComplete` and `resolveCompanionClipName` from Task 2; `syncCompanionAccessories` from Task 3.
- Produces:
  - Updated `COMPANION_CLIP_NAMES` in `src/avatar/companionCelebration.ts` including `'idle_breathe'`.
  - Pure session-rotation & empathy state in `src/avatar/companionCelebration.ts`:
    - `CelebrationEvent.kind?: 'celebration' | 'encouragement'`
    - `CelebrationState.offset: number`
    - `advanceCelebrationRotation(step?: number): void` and `resetCelebrationRotation(): void`
    - `HOME_TAP_CLIPS = ['peekaboo', 'stretch', 'clap', 'wiggle', 'bow', 'search', 'listen'] as const`
    - `IDLE_NUDGE_CLIPS = ['think', 'search', 'listen'] as const`
    - `selectIdleNudgeClip(roundsPlayed: number, nudgeIndex: number): CompanionClipName`
  - `HomeCompanion` (`data-testid="home-companion"`) in `src/avatar/HomeCompanion.tsx`, rendered in `src/home/GroupedHomeScreen.tsx`.
  - `CompanionNudge` (`data-testid="companion-idle-nudge"`, `IDLE_NUDGE_DELAY_MS = 12_000`) in `src/avatar/CompanionNudge.tsx`, rendered in `src/shared/game/GameShell.tsx`.
  - `'home.companionGreet'` in `src/shared/uiCopy.ts` (`SK_COPY`: `'Zamávaj medvedíkovi'`, `CS_COPY`: `'Zamávat medvídkovi'`).

- [x] **Step 1: Write failing unit tests in `companionCelebration.test.ts`, `HomeCompanion.test.ts`, and `CompanionNudge.test.ts`**

1. Expand `src/avatar/companionCelebration.test.ts`:
   - **Run 0 vs Run 1 rotation (`PLAY_AGAIN`):** Run 0 rounds 1–4 select `['celebrate', 'wave', 'clap', 'jump']` and round 5 selects `'finale'`; after `PLAY_AGAIN` (`roundsPlayed` resets to `0`), Run 1 rounds 1–4 select `['flex', 'bow', 'march', 'wiggle']` and round 5 selects `'finale'`; Run 2 wraps cleanly back to `'celebrate'`.
   - **StrictMode purity (Review Focus #2):** Calling `createCelebrationState()` twice or invoking `celebrationReducer` twice with identical inputs produces identical state and `offset === 0` without mutating module state; calling `advanceCelebrationRotation(4)` advances the initial `offset` of the *next* `createCelebrationState()` to `4` (cross-game rotation), and `resetCelebrationRotation()` restores `0`.
   - **Exhausted failure & round-5 transitions (Review Focus #2):**
     - `phase: 'answered-incorrectly', feedback: 'failure', roundsPlayed: 1, correctRounds: 0` emits `kind: 'encouragement'`, `eventKey: '0:1:0:failure'`, `animationName: 'encourage'`; round 2 failure emits `'shrug'`.
     - Round 5 exhausted failure after 4 successes (`roundsPlayed: 5, correctRounds: 4, phase: 'answered-incorrectly', feedback: 'failure'`) emits `'0:5:4:failure'` (`'encourage'`), and when `phase` becomes `'session-complete'` (`roundsPlayed: 5, correctRounds: 4`), transitions to `'0:5:4'` with `animationName: 'finale'`.
     - Round 5 exhausted failure with zero points (`roundsPlayed: 5, correctRounds: 0`) transitions on `'session-complete'` to `'0:5:0'` with `animationName: 'encourage'` (not `'finale'`).
     - Round 5 *correct* answer (`phase: 'answered-correctly', roundsPlayed: 5, correctRounds: 5`) -> `'session-complete'` preserves the **same** `eventKey: '0:5:5'` and `'finale'`.
2. Create `src/avatar/HomeCompanion.test.ts` (server-render / pure state reducer tests matching `LearningCompanion.test.ts` style):
   - Renders nothing when `config === null`.
   - Under `reducedMotion === true`, renders `<button type="button" aria-label="Zamávaj medvedíkovi">` with `bear-still.png` (`data-companion-representation="still"`) and never mounts `AvatarPresenter`.
   - Home state machine (`createHomeCompanionState`, `homeCompanionReducer`): starts on `'wave'` (`mode: 'once'`); on `playbackComplete` from `'wave'`, advances once to `'idle_breathe'` (`mode: 'once'`); on `playbackComplete` from `'idle_breathe'`, settles (`settled: true` at `0 fps`); rapid `tap` actions (`5` taps in sequence, Review Focus #5) monotonically increment `eventKey` and cycle `HOME_TAP_CLIPS` (`'peekaboo'`, `'stretch'`, `'clap'`, `'wiggle'`, `'bow'`, `'search'`, `'listen'`) without going through `'idle_breathe'` after a tap clip finishes.
3. Create `src/avatar/CompanionNudge.test.ts`:
   - Tests pure `shouldArmIdleNudge(state, contentLocked, companionEnabled)` (`true` only when `phase === 'awaiting-answer' && !paused && !contentLocked && companionEnabled`) and `selectIdleNudgeClip` cycling `['think', 'search', 'listen']`.
   - Renders `data-testid="companion-idle-nudge"` with `aria-hidden="true"` and `pointer-events-none` when active, and `null` when inactive (Review Focus #4).

- [x] **Step 2: Run Vitest on the three test files to verify they fail**

Run: `npx vitest run src/avatar/companionCelebration.test.ts src/avatar/HomeCompanion.test.ts src/avatar/CompanionNudge.test.ts`
Expected: FAIL.

- [x] **Step 3: Implement `companionCelebration.ts`, `useCompanionCelebration.ts`, `AvatarPresenter.tsx`, and `uiCopy.ts`**

1. In `src/avatar/companionCelebration.ts`:
   - Add `'idle_breathe'` to `COMPANION_CLIP_NAMES`, export `HOME_TAP_CLIPS`, `IDLE_NUDGE_CLIPS`, `selectIdleNudgeClip`, `advanceCelebrationRotation`, and `resetCelebrationRotation`.
   - Add `offset: number` to `CelebrationState` (initialized from `sessionRotationOffset` in `createCelebrationState()`, incremented purely by `+ 4` mod `8` on `restarted` inside `celebrationReducer`).
   - Support exhausted failure target (`observation.phase === 'answered-incorrectly' && observation.feedback === 'failure' && observation.roundsPlayed > 0`) with `:failure` key suffix and `(observation.roundsPlayed + next.run) % 2 === 1 ? 'encourage' : 'shrug'`, plus `observation.phase === 'session-complete' && observation.correctRounds === 0 ? 'encourage' : 'finale'`.
2. In `src/avatar/useCompanionCelebration.ts`:
   - Track `playedRef.current = true` inside `useEffect` once `celebration.roundsPlayed > 0`, and on unmount (`return () => { if (playedRef.current) advanceCelebrationRotation(4); }`) advance cross-game rotation without StrictMode mount side effects.
3. In `src/avatar/AvatarPresenter.tsx`, forward `onPlaybackComplete?: () => void` to `AvatarScene`, and in `src/avatar/AvatarModel.tsx` pass monotonic `action.getMixer().time` as the 4th argument to `syncCompanionAccessories(scene, finishedOnce ? null : action.getClip().name, norm, action.getMixer().time)` so periodic blinks stay smooth across loop boundaries while frame `0` stays eyes-open (`0`).
4. In `src/shared/uiCopy.ts`, add `'home.companionGreet': 'Zamávaj medvedíkovi'` to `SK_COPY` and `'home.companionGreet': 'Zamávat medvídkovi'` to `CS_COPY`.

- [x] **Step 4: Implement `HomeCompanion.tsx` and wire into `GroupedHomeScreen.tsx`**

1. Create `src/avatar/HomeCompanion.tsx`:
   - Reads `getCompanionConfig()`, `useReducedMotion()`, and `useCompanionResources(reducedMotion ? null : config?.modelUrl ?? null)`. Returns `null` when `!config`.
   - Renders `<button type="button" data-testid="home-companion" aria-label={getUiCopy(locale, 'home.companionGreet')} onClick={onTap} data-companion-animation={activeClip} data-companion-representation={rendered ? 'rendered3D' : 'still'} className="group relative h-20 w-[72px] sm:h-28 sm:w-24 lg:h-32 lg:w-28 shrink-0 rounded-2xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 active:scale-95 transition-transform">`.
   - Inside `<span aria-hidden="true" className="pointer-events-none relative block h-full w-full">`: `{!canRender && <img src={bearStill} alt="" className="absolute inset-0 h-full w-full object-contain" />}` and `{canRender && <AvatarPresenter ... cameraDistance={5.6} preserveHipsPosition interactive={false} playback={{ mode: 'once', eventKey: state.eventKey, startedAtMs: state.startedAtMs }} onPlaybackComplete={onPlaybackComplete} />}`.
   - Initial mount plays `'wave'` -> `onPlaybackComplete` transitions once to `'idle_breathe'` -> `onPlaybackComplete` stays settled at `0 fps`; clicking dispatches `tap` to cycle `HOME_TAP_CLIPS` (`mode: 'once'`, settling directly at `0 fps` when done).
2. In `src/home/GroupedHomeScreen.tsx`, render `<HomeCompanion locale={locale} />` inside the header row (`flex justify-between items-start gap-3 sm:gap-4`) between the title/subtitle column and the `Nastavenia` `IconButton` wrapper.

- [x] **Step 5: Implement `CompanionNudge.tsx` and wire empathetic failure + 12s inactivity nudge into `GameShell.tsx`, `GamePrompt.tsx`, and `UiKitScreen.tsx`**

1. Create `src/avatar/CompanionNudge.tsx`:
   - Exports `IDLE_NUDGE_DELAY_MS = 12_000`, `shouldArmIdleNudge`, and `CompanionNudge` (`data-testid="companion-idle-nudge"`, `aria-hidden="true"`, `pointer-events-none fixed bottom-3 left-3 sm:bottom-5 sm:left-5 z-20 h-24 w-20 max-sm:h-20 max-sm:w-16 [@media(max-height:480px)]:h-16 [@media(max-height:480px)]:w-14`). Uses `{!canRender && <img ... />}` + `<AvatarPresenter ... playback={{ mode: 'once', eventKey, startedAtMs }} />` so it settles to `0 fps` once its `'think'`/`'search'`/`'listen'` gesture finishes.
2. In `src/shared/game/GamePrompt.tsx`, add optional `nudgeReplay?: boolean` to `GamePromptProps` (or detect via data attribute / CSS class on `[data-testid="game-Shell"]` — cleaner: a CSS group attribute `data-idle-nudge="true"` on `GameShell`'s interactive wrapper + `group-data-[idle-nudge=true]:ring-4 group-data-[idle-nudge=true]:ring-amber-400/70 motion-safe:group-data-[idle-nudge=true]:animate-pulse` on `GamePrompt`'s replay `Button`, requiring zero prop plumbing across all 11 bespoke game files!).
3. In `src/shared/game/GameShell.tsx`:
   - Change `showCompanionInOverlay` (`line 105`) to `Boolean(companionConfig && (showCompletion || feedback?.kind === 'success' || feedback?.kind === 'failure'))` and `confetti={showCompletion && (completion?.correctRounds ?? state.correctRounds) > 0}`.
   - Add the `12,000 ms` inactivity effect when `shouldArmIdleNudge(state, contentLocked, Boolean(companionConfig))` is true: resets on `state.roundsPlayed`, `state.wrongAttempts`, and `window` `{ capture: true, passive: true }` `pointerdown` / `keydown` listeners; sets `idleNudge` active after `12_000 ms` and dismisses synchronously on the first `pointerdown` / `keydown` capture or when `shouldArmIdleNudge` turns false (Review Focus #4).
   - Set `group` + `data-idle-nudge={idleNudge ? 'true' : undefined}` on `game-interactive-content` and render `<CompanionNudge ... />` outside flow.
4. In `src/shared/ui/UiKitScreen.tsx`:
   - Add `'companion-failure'` and `'companion-zero-score'` to `GAME_SHELL_DEMO_STATES` (`companion-failure`: `phase: 'answered-incorrectly', roundsPlayed: 1, feedback: 'failure'`; `companion-zero-score`: `phase: 'session-complete', roundsPlayed: 5, correctRounds: 0, feedback: 'failure'`), pass `correctRounds: state.phase === 'session-complete' ? state.correctRounds : 5` to `GameShell`'s `completion` prop, and include `feedback` for `'companion-failure'`.
5. Regenerate the checked-in component gallery inventory:
   Run: `node --import tsx tools/ui-gallery/generate.ts`

- [x] **Step 6: Run unit tests, pure verifiers, and ESLint**

Run: `npm run test:unit && npm run verify:pure && npm run lint`
Expected: ALL unit tests (including `src/shared/i18n.test.ts` and `tools/ui-gallery/inventory.test.ts`), pure verifiers (`uiCopy.verify.ts`), and lint PASS with `0` errors.

- [x] **Step 7: Commit Task 4**

```bash
git add src/avatar/companionCelebration.ts src/avatar/companionCelebration.test.ts src/avatar/useCompanionCelebration.ts src/avatar/AvatarModel.tsx src/avatar/AvatarPresenter.tsx src/shared/uiCopy.ts src/avatar/HomeCompanion.tsx src/avatar/HomeCompanion.test.ts src/avatar/CompanionNudge.tsx src/avatar/CompanionNudge.test.ts src/home/GroupedHomeScreen.tsx src/shared/game/GamePrompt.tsx src/shared/game/GameShell.tsx src/shared/ui/UiKitScreen.tsx src/shared/ui/gallery/componentInventory.generated.ts
git commit -m "feat: add moment-based bear guide on home, failure overlays, rotation, and idle nudge"
```

---

### Task 5: Blender `celebration-v7` Rebuild, Payload Optimization & Source-Bound Proofs [Wave 2 — Serialized Blender]

**Files:**
- Modify: `tools/blender/catalog/bear_companion_common.py`
- Modify: `tools/blender/catalog/build_generated_bear_celebration.py`
- Modify: `tools/avatar/optimize_generated_bear.mjs`
- Modify: `e2e/support/companionFixture.ts`
- Modify: `tools/avatar/localCompanionServer.ts`
- Modify: `assets/avatar/asset-manifest.json`
- Modify: `src/avatar/companions/bear-still.png`
- Create: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/{runtime-report.json,native-runtime-parity.json,arm-clearance-audit.json,still-v1/still-report.json,verification-progress.json,verification-summary.json,retrospective.md}`

**Interfaces:**
- Consumes: Updated `tools/blender/catalog/bear_accessories.py` from Task 3; `tools/avatar/sample_generated_bear_runtime.mjs`; `tools/blender/catalog/verify_generated_bear_motion.py`; `tools/blender/catalog/audit_generated_bear_clearance.py`.
- Produces: Verified local `celebration-v7` candidate (`web-v1/model.glb` `<= 900 KB` gzip, 18 clips including `idle_breathe`, `still-v1/bear-still.png` `352×400`), indexed in `assets/avatar/asset-manifest.json` and wired into `e2e/support/companionFixture.ts` and `tools/avatar/localCompanionServer.ts`.

- [x] **Step 1: Add deterministic mesh decimation + weight re-normalization and animation fixes in Blender scripts**

1. In `tools/blender/catalog/bear_companion_common.py` / `tools/blender/catalog/build_generated_bear_celebration.py`:
   - Before sampling actions in `build_generated_bear_celebration.py`, apply a deterministic `DECIMATE` modifier (`decimate_type='COLLAPSE'`, `ratio=0.28`, `use_collapse_triangulate=True`, `delimit={'UV'}`) on `Bear_fixed_outfit`, apply the modifier, prune vertex group weights `< 1e-3`, cap to top 4 bone weights per vertex, and normalize each vertex's weights in float32 so `|sum - 1| <= 1e-6` holds identically in `celebration.blend` and exported `model.glb`.
   - Rewrite `pose_idle` to use `rotate_world` in strict parent-to-child order (`Hips -> Spine02 -> Spine01 -> Spine -> Shoulders/Arms/Head`) with `2π`-periodic harmonic chest breathing + subtle weight/head sway so `pose(0.0) === pose(1.0)` with continuous non-zero harmonic velocity and friendly frame-0 posture matching `bear-still.png`.
   - Add `pose_idle_breathe` (`('idle_breathe', 3.6, pose_idle_breathe)`, `108` frames at `30 fps`) as a calm caregiver breathing loop.
   - Reorder `Spine02 -> Spine01 -> Spine` before shoulder/arm/hand `rotate_world` calls in `pose_bow` (trimming peak right-arm abduction by `~4°` for `bowHat` clearance), `pose_march`, `pose_wiggle`, `pose_peekaboo`, and `pose_stretch`.
2. In `tools/avatar/optimize_generated_bear.mjs`:
   - Keep raw float32 `WEIGHTS_0` unquantized (`|sum - 1| <= 1e-5`).
   - Add deterministic dead-track pruning across all `Animation` channels: dispose any channel targeting `'scale'`, any channel targeting `'translation'` where `targetNode.getName() !== 'Hips'`, and any `'rotation'` channel whose keyframe quaternions never deviate from rest/first keyframe by more than `1e-6`, followed by `prune()`.

- [x] **Step 2: Build `celebration-v7` and `still-v1/bear-still.png` sequentially via `blender_queue.py`**

Run sequentially through `blender_queue.py`:
1. Build `celebration.blend` and raw GLB into `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/`.
2. Run `node tools/avatar/optimize_generated_bear.mjs` to produce `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/model.glb` (`gzip <= 900,000` bytes).
3. Render `still-v1/bear-still.png` (`352×400`, `cameraDistance = 5.6`) via `render_bear_still.py` and copy to `src/avatar/companions/bear-still.png` if updated.

- [x] **Step 3: Run 120 Hz runtime contract, Blender ↔ Three.js parity, and BVH arm-clearance gates**

1. Run: `node tools/avatar/sample_generated_bear_runtime.mjs --glb assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/web-v1/model.glb --report assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/runtime-report.json --samples assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/runtime-samples/samples.json`
   Expected: `status: "passed"`, `gzipBytes <= 900000`, `maxWeightSumError <= 1e-5`, `maxEndpointError <= 1e-5`, `maxFloorPenetrationM <= 0.007`, `18` clips.
2. Run via `blender_queue.py`: `verify_generated_bear_motion.py` -> `native-runtime-parity.json`
   Expected: `status: "passed"`, `maximum_vertex_error_m <= 0.00003` (`30 µm`) across all 18 clips.
3. Run via `blender_queue.py`: `audit_generated_bear_clearance.py` -> `arm-clearance-audit.json`
   Expected: `status: "passed"`, `0` new `arm-torso-leg` contacts and `0` new `arm-head` contacts across all 18 clips.

- [x] **Step 4: Render `<= 320 px` review studies for props & facial rig and write candidate verification files**

1. Render `<= 320 px` Cycles/workbench review studies (`flex-peak`, `bow-peak`, `march-peak`, `think-peak`, `idle_breathe`, `encourage`) via `blender_queue.py` and verify every prop stays comfortably inside the `cameraDistance = 5.6` frame (`NDC` within `[-0.95, +0.95]`) and `flexMask` aligns over the pupils.
2. Run `npm run assets:manifest` so `assets/avatar/asset-manifest.json` records `celebration-v7` SHA-256 hashes.
3. Update `assetPath` in `e2e/support/companionFixture.ts` and `tools/avatar/localCompanionServer.ts` from `celebration-v6` to `celebration-v7`.
4. Write `verification-progress.json`, `verification-summary.json` (with exact SHA-256 hashes, `storage.private: "stored"`, `artReview.status: "pending"` awaiting user sign-off), and `retrospective.md` under `revisions/celebration-v7/`.

- [x] **Step 5: Verify unit tests and asset manifest integrity**

Run: `npm run test:unit && npm run lint`
Expected: PASS.

- [x] **Step 6: Commit Task 5**

```bash
git add tools/blender/catalog/bear_companion_common.py tools/blender/catalog/build_generated_bear_celebration.py tools/avatar/optimize_generated_bear.mjs e2e/support/companionFixture.ts tools/avatar/localCompanionServer.ts assets/avatar/asset-manifest.json src/avatar/companions/bear-still.png assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/runtime-report.json assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/native-runtime-parity.json assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/arm-clearance-audit.json assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/still-v1/still-report.json assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/verification-progress.json assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/verification-summary.json assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/retrospective.md
git commit -m "feat: build celebration-v7 bear model with decimated mesh, pruned tracks, and repaired idle"
```

---

### Task 6: E2E Companion & Offline Proofs, 30-View Browser Study & Visual Review Handover [Wave 3]

**Files:**
- Modify: `e2e/avatar-companion.spec.ts`
- Modify: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/verification-summary.json`
- Modify: `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/verification-progress.json`

**Interfaces:**
- Consumes: All Wave 1 & Wave 2 deliverables (`HomeCompanion`, `CompanionNudge`, `companionCelebration` rotation + empathy, `0 fps` frameloop pause, `pwaConfig` precache, `celebration-v7` fixture).
- Produces: Passing `verify:integration` + `test:e2e:offline` + 30-view browser study (`browser-verification.json`) + `<= 320 px` review copies ready for user `artReview` approval.

- [x] **Step 1: Update and expand `e2e/avatar-companion.spec.ts`**

Update existing assertions affected by Phase A and add coverage for every new guide touchpoint and Review Focus edge case:
1. **Second-run celebration rotation (`line 129`):** After clicking `'Hrať znova'`, assert round 1 of run 2 plays `data-companion-animation="flex"` (instead of repeating `'celebrate'`).
2. **Route-exit canvas cleanup (`lines 198–201`):** Navigating away from `/alphabet` to `/content` removes all `<canvas>` elements (`toHaveCount(0)`), and navigating to `/` removes `[data-testid="learning-companion"]` while mounting `[data-testid="home-companion"]`.
3. **Empathetic exhausted failure & `0 / 5` completion (Review Focus #2):**
   - Exhausting 3 wrong attempts on round 1 shows `[data-testid="learning-companion"]` with `data-companion-animation="encourage"` inside the failure overlay (`Nevadí, poďme ďalej`).
   - Exhausting all 5 rounds (`0 / 5`) shows `data-companion-animation="encourage"` on `session-complete` (while `4 / 5` continues to show `'finale'`).
   - Include `'companion-failure'` and `'companion-zero-score'` in `/ui-kit` `@geometry` fit checks.
4. **Home screen welcome, tap cycling & reduced motion (Review Focus #5):**
   - Visiting `'/'` with `installCompanionFixture` renders `[data-testid="home-companion"]` (`>= 48×48 px`, `aria-label="Zamávaj medvedíkovi"` in SK / `"Zamávat medvídkovi"` in CS, zero horizontal overflow, no overlap with `Nastavenia` or game cards); clicking it cycles `data-companion-animation` to `'peekaboo'` then `'stretch'`; under `reducedMotion: 'reduce'`, renders `still` with zero GLB/chunk requests.
5. **12-second inactivity nudge (Review Focus #4):**
   - Using `page.clock.install()`, advance `11,900 ms` in `awaiting-answer` -> `[data-testid="companion-idle-nudge"]` count is `0`; advance `+200 ms` -> `[data-testid="companion-idle-nudge"]` appears with `pointerEvents: 'none'`, `data-companion-animation="think"`, and unchanged `document.scrollingElement.scrollHeight`; dispatching `pointerdown` dismisses it immediately.
6. **Zero-FPS post-clip WebGL pause & resize wake (Review Focus #3):**
   - Hold the celebration overlay open past clip duration (`~2.0 s`), count WebGL `drawElements`/`drawArrays` over 10 `requestAnimationFrame` ticks -> assert `0` new draw calls (`0 fps`); resize viewport while paused -> assert canvas dimensions update and remain non-empty without resuming continuous `60 fps` drawing.

- [x] **Step 2: Run the 30-view browser verification study for `celebration-v7`**

Run `tools/avatar/verify_model_studies.mjs` for `bear-v2` / `celebration-v7` and record the 30-view browser study metadata into `revisions/celebration-v7/verification-summary.json` (`browser.results.length === 30`, keeping `artReview.status: "pending"`).

- [x] **Step 3: Run full verification gates**

Run:
1. `npm run lint`
2. `npm run test:unit`
3. `npm run verify:pure`
4. `npm run test:audio`
5. `npm run verify:integration`
6. `npm run test:e2e:offline`

Expected: ALL gates PASS with zero console errors, zero failed requests, and offline precached `bear-still-*.png` verified.

- [x] **Step 4: Inspect `<= 320 px` review copies and commit Task 6**

1. Copy `<= 320 px` review PNGs (`flex-peak`, `bow-peak`, `march-peak`, `think-peak`, Home companion, empathetic failure overlay, 12s nudge) to the conversation artifact directory and inspect ONLY those `<= 320 px` copies to confirm visual quality, pupil alignment, brow/blink warmth, and framing.
2. Commit E2E spec and `celebration-v7` browser verification metadata:
```bash
git add e2e/avatar-companion.spec.ts assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/verification-summary.json assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/verification-progress.json
git commit -m "test: verify bear guide phase A touchpoints, 0fps lifecycle, offline still, and v7 studies"
```
- [x] **Step 5: Obtain exact-model art approval and publish**

Present the `<= 320 px` review renders to the user and ask whether to mark `artReview.status = "approved"` and publish `celebration-v7` to Vercel Blob (`node tools/avatar/publish_bear_companion.mjs --candidate=bear-v2`).
