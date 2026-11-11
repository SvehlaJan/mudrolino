# Bear learning companion — Phase A: Moment-based visual guide

Date: 2026-11-10

Status: approved by user (2026-11-11) following selection of **Option A ("Momentový sprievodca")**, visual-only guide behavior, and backlog tracking for deferred phases. Implementation plan: `docs/superpowers/plans/2026-11-10-bear-guide-phase-a.md`.

## Intent and why

Mudrolíno already ships a warm, recognizable 3D storybook bear (`bear-v2` / runtime manifest ID `bear-v1`, revision `celebration-v6`) on Vercel Blob across all 11 mini-games, containing **17 character animations** and **6 procedural 3D accessories** (`28` bone-parented meshes). However, the audit of `celebration-v6` and the game shell revealed three major gaps preventing the bear from feeling like a true companion guide (*"sprievodca pre deti"*):

1. **71% of authored content is unreachable in production:** Because `maxRounds` is hardcoded to `5` (`src/shared/game/gameState.ts`) and `selectCelebrationClip` resets its index on every `PLAY_AGAIN` or route change (`src/avatar/companionCelebration.ts`), children only ever see `celebrate`, `wave`, `clap`, `jump`, and `finale`. Four celebration clips (`flex`, `bow`, `march`, `wiggle`), all eight guide/reaction clips (`idle`, `search`, `think`, `listen`, `encourage`, `shrug`, `peekaboo`, `stretch`), and all six 3D accessories have **0% production reachability**.
2. **Absent at key emotional guide moments:** Children are not greeted on the home screen (`GroupedHomeScreen.tsx`), see a cold static `🤗` emoji when they exhaust their attempts on a hard round (`GameShell.tsx`), see a celebratory `'finale'` disco dance even on a `0 / 5` summary, and get no friendly visual nudge if they hesitate silently for 10+ seconds during a round.
3. **Asset payload, rig/loop, prop framing, and runtime efficiency debt:**
   - `web-v1/model.glb` sits at `2,078,070` gzip bytes against the `2,100,000` byte cap (`21.9 KB` headroom) due to an undecimated `51,311`-triangle Meshy mesh and `export_optimize_animation_size=False` baking dead scale/translation tracks on all 24 bones.
   - All 17 clips freeze at the stiff `16°` A-pose on loop boundaries (`envelope = 0` at `phase = 0` and `1`), `pose_idle` still uses legacy rest-space `world_rotation` instead of posed-space `rotate_world`, five clips rotate child `Spine` before parent `Spine02`, and the face never blinks.
   - `flexMask` cuts across the bear's pupils (`cy = 41.8`), `bowHat` (`NDC_X = -1.045`) and `marchFlag` (`NDC_X = -1.009`) clip the left camera frustum at `cameraDistance = 5.6`, and `thinkBulb` (`NDC_Y = +0.977`) sits `1.5 px` from the top edge.
   - `src/pwa/pwaConfig.ts` omits `bear-still-*.png` from Workbox `globPatterns` (breaking offline/reduced-motion fallback on unseen installs), `CompanionCanvas` redraws at `60 fps` forever after a one-shot clip finishes, `companionAccessories.ts` leaks per-clone geometries/materials, and `companionResources.ts` retains a duplicate `3.55 MB` `ArrayBuffer` after `GLTF` parsing.

Phase A turns the bear into a **moment-based visual guide** across the app while fixing the underlying 3D asset, prop framing, memory/FPS lifecycle, and offline fallback — without risking answer-grid geometry on small phones or adding pending voice recordings.

## Goals, non-goals, and anti-goals

### Goals

- **100% production reachability** for all 17 existing character themes plus a seamless breathing loop (`idle_breathe` / repaired `idle`) and all 6 procedural 3D accessories.
- **Friendly visual guide touchpoints** at four child-facing moments:
  1. **Home screen welcome & tap interaction** (`GroupedHomeScreen.tsx`), prewarming the 3D runtime before the first game starts.
  2. **Varied round celebrations** rotating across sessions and games so `flex`, `bow`, `march`, and `wiggle` (with their props) appear naturally.
  3. **Empathetic exhausted-attempt & zero-score reactions** (`encourage` / `shrug`) replacing the static `🤗` emoji in `GameShell.tsx` and avoiding a disco `'finale'` when `correctRounds === 0`.
  4. **Gentle 12-second inactivity nudge** (`think`, `search`, `listen`) during `awaiting-answer` that cues the child toward replaying/answering without shifting layout or stealing focus.
- **Shrink the runtime GLB substantially** (target `<= 900 KB` gzip, expected `~550–750 KB` gzip, down from `2.08 MB`) at **0 Meshy credits**, preserving all repo geometry/parity gates (`maximum_weight_error <= 1e-5`, `maximum_vertex_error_m <= 30 µm`, `0` new `arm-torso-leg` and `0` new `arm-head` contacts).
- **Add natural eye blinking and warm brow expressions** via lightweight bone-parented 3D facial attachments on `Head` (`companionAccessories.ts` + `bear_accessories.py`) and repair continuous breathing motion so the bear feels alive rather than frozen.
- **Zero idle GPU/CPU drain (`0 fps`)** once a reaction or welcome window settles, clean GPU resource sharing, released raw `ArrayBuffer` bytes after parse, and guaranteed offline availability of `bear-still.png`.
- **Track all deferred phases cleanly in `ROADMAP.md`** (Option B persistent in-round `GamePrompt` companion + single persistent WebGL context, SK/CZ spoken bear lines, additional bespoke clips, and bear app icon).

### Non-goals (deferred to `ROADMAP.md` backlog)

- **No persistent in-round `GamePrompt` bear slot** during active answering and no single-canvas cross-route WebGL portal refactor (Option B).
- **No new spoken voice clips, sound effects, or TTS lines** for the bear (`pending-recordings.json` and `npm run test:audio:strict` counts remain unchanged).
- **No new Meshy API calls or credit spend** (`0` credits).
- **No customizable outfits or parent-selfie integration** on the bear (`Bear_fixed_outfit` remains a single fused mesh).

### Anti-goals (what would make this a failure even if it works)

- **Any vertical or horizontal overflow or answer-tile shrinkage** on constrained viewports (`320×568`, `667×375`, `568×320`) in `e2e/release-responsive.spec.ts` (`scrollHeight <= clientHeight + 1`, `>= 48×48 px` targets, zero pairwise overlap).
- **Breaking the answer-audio contract** (tapped/target item audio must still play before verdict audio; the bear adds zero audio delay or extra promises to `useGameSession`).
- **Breaking the lazy Three.js bundle boundary** (`AvatarScene`, `AvatarModel`, `AvatarSkeletonOverlay`, and `skinnedGarment` must never be statically imported outside `src/avatar/`, and `AvatarScene-*.js` + `*.glb` remain excluded from Workbox precache).
- **Continuous `60 fps` WebGL rendering** while an overlay or the home screen sits idle on a child's tablet.
- **Publishing a new GLB to Vercel Blob without explicit user art review approval** recorded in `verification-summary.json`.

## Constraints

- **Checkout & branch hygiene:** Work on `feature/bear-guide-phase-a` in the primary checkout; leave the 30 untracked historical `assets/avatar/catalog-a/{B04,F02,female}/...` diagnostic files untouched.
- **Blender execution:** Run all headless Blender jobs sequentially through `python3 tools/avatar/blender_queue.py -- python3 tools/avatar/blender_cli.py ...`.
- **GLB runtime contract (`tools/avatar/sample_generated_bear_runtime.mjs` & `tools/avatar/publish_bear_companion.mjs`):**
  - Single skinned mesh named `Bear_fixed_outfit` on the 24-bone `generatedBones` rig (`Hips` stationary in XY within `1e-5 m`, `maxFloorPenetrationM <= 0.007 m`).
  - Raw float32 skin weights normalized per vertex within `1e-5` (`KHR_mesh_quantization` on `WEIGHTS_0` is **not** used because uint8/uint16 weight quantization exceeds `1e-5`; `NORMAL`/`TANGENT`/`TEXCOORD_*` quantization remains allowed as in `optimize_generated_bear.mjs`).
  - Primary clip `celebrate` retains exact duration `1.4s` (`169` subframes at `120 Hz`) and `cameraDistance` remains `5.6` (`still.camera.distance === 5.6` in `publish_bear_companion.mjs:103`).
  - Start and end poses of every clip must match within `1e-5 m` (`endpointError <= 1e-5`) and `1e-5` bone matrix delta (`endpointBoneError <= 1e-5`). Note: a periodic loop whose `phase = 0` and `phase = 1` evaluate to the **same relaxed breathing pose with matching non-zero harmonic velocity** satisfies `endpointError == 0` without freezing at the stiff rest A-pose.
  - `AvatarModel.tsx` (`sanitizeAnimationClips`) retains only `.quaternion` and `Hips.position` tracks; facial blinking/brow motion therefore uses bone-parented 3D attachments on `Head` (`companionAccessories.ts` / `bear_accessories.py`) rather than glTF morph-target weight tracks.
- **Localization:** Every new child-facing or accessible label (`aria-label`) uses `t('…')` / `uiCopy.ts` in Slovak with a matching Czech entry in `src/shared/locales/cs.ui.ts` / `src/shared/locales/cs.ts` verified by `src/shared/i18n.test.ts`.
- **Visual review rule:** Inspect only screenshot/render review copies resized to `<= 320 px` width.
- **Publication gate (`docs/avatar-authoring.md` & `publish_bear_companion.mjs`):** Local candidate construction, automated technical/browser proof (`celebration-v7`), and public Vercel Blob activation (`bear-v1.json`) are distinct stages. Note `.env` contains `BLOB_READ_WRITE_TOKEN` (for Vercel Blob) while R2 env vars (`R2_*`) are not configured in this checkout; `assets/avatar/asset-manifest.json` indexes local 3D files as in `celebration-v6` (`304aba1`), and `publish_bear_companion.mjs` is run **only after** the user inspects the `<= 320 px` `celebration-v7` renders and approves visual sign-off. All frontend Phase A code must remain backward-compatible with `celebration-v6` in the meantime.

## Approaches considered

1. **Option A — Moment-based Visual Guide ("Momentový sprievodca") [Selected by user]:**
   - Keep the bear out of the tight in-round `GamePrompt` flow; instead bring the bear to life on the **Home hero header**, **round celebrations (all 8 clips + props)**, **exhausted-attempt & 0-score overlays (`encourage`/`shrug`)**, and a **non-layout-shifting 12s inactivity nudge (`think`/`search`/`listen`)**, backed by an optimized `celebration-v7` GLB, fixed prop framing, seamless breathing + 3D blinking/brows, `0 fps` idle pause, and offline `bear-still.png` precache.
   - *Trade-off:* Zero risk to active round tile sizing on `320×568` / `568×320` screens and minimal battery usage, while deferring continuous Duolingo-style side-by-side prompt presence to Phase B.
2. **Option B — Persistent In-Round Prompt Companion ("Stály živý sprievodca pri zadaní") [Deferred to `ROADMAP.md`]:**
   - Embed a permanent bear slot inside `GamePrompt.tsx` across all 11 games (reacting to prompt audio, 1st/2nd retries, and taps to replay) backed by a single persistent WebGL context ported across screens.
   - *Trade-off:* Strongest continuous guide presence, but requires responsive reflow of `GamePrompt` on short landscape viewports and replacing E2E invariants that currently assert zero `<canvas>` elements during `awaiting-answer`.
3. **Option A + Spoken Bear Voice Lines [Deferred to `ROADMAP.md`]:**
   - Pair Home welcome, idle nudges, and empathetic failure reactions with dedicated SK/CZ spoken audio clips.
   - *Trade-off:* Adds warmth for pre-readers, but introduces new pending SK/CZ recordings that block strict release gates until recorded by the user; visual-only guide was explicitly chosen for now.

## Detailed design

### 1. 3D asset & Blender pipeline (`celebration-v7`)

Create revision `assets/avatar/catalog-a/companions/bear-v2/revisions/celebration-v7/` via `tools/blender/catalog/build_generated_bear_celebration.py` and `tools/blender/catalog/bear_companion_common.py` (retaining `celebration-v6` history intact):

- **Controlled mesh decimation before animation sampling:**
  - Apply a deterministic Blender `DECIMATE` (`COLLAPSE`, UV-seam/boundary-aware, target ratio `~0.28`, yielding `~14,000` triangles / `~11,000` vertices from `51,311` triangles) on `Bear_fixed_outfit` before action floor-sampling and `.blend` save, pruning sub-`1e-3` bone weights and re-normalizing the 4 skin weights per vertex so `|sum - 1| <= 1e-5` holds identically in `celebration.blend` and `web-v1/model.glb` (`maximum_vertex_error_m <= 30 µm` parity preserved).
- **Dead animation track pruning:**
  - Keep `export_optimize_animation_size=False` on animated quaternion tracks if needed to preserve exact 30fps SLERP parity (`<= 30 µm`), OR strip **only** constant `.scale` tracks, non-`Hips` `.translation` tracks, and constant identity `.quaternion` tracks on un-animated bones (`LeftFoot`, `RightFoot`, `LeftToeBase`, `RightToeBase`, `head_end`, `headfront`) in a deterministic post-export step inside `tools/avatar/optimize_generated_bear.mjs` (matching `AvatarModel.tsx`'s `sanitizeAnimationClips`, which already drops non-`Hips` translations and all scales). Combined with mesh decimation, this brings `web-v1/model.glb` from `2.08 MB` gzip down to **`~550–750 KB` gzip** while keeping `0.0 µm` track-pruning error.
- **Seamless breathing `idle` (`2.8s`) + `idle_breathe` (`3.6s`) & spine-order repairs:**
  - Rewrite `pose_idle` to use posed-space `rotate_world` in strict parent-to-child order (`Hips → Spine02 → Spine01 → Spine → Shoulders/Arms/Head`) around a natural relaxed neutral base (`relaxedArm = 16°`, `relaxedForearm = 6°`) with periodic `sin(2π·phase)` / `cos(2π·phase)` chest breathing, subtle weight sway, and soft head tilt so `pose(0) === pose(1)` with continuous velocity (no freeze at loop boundary) while keeping `frame 0` aligned with the friendly upright neutral silhouette used for `bear-still.png`.
  - Add `idle_breathe` (`3.6s`, `108` frames) as a slower, calmer multi-harmonic caregiver breathing loop (`COMPANION_CLIP_NAMES` gains `'idle_breathe'`, with runtime fallback to `'idle'` when running against `celebration-v6` before Blob publication).
  - Fix parent-before-child spine rotation ordering (`Spine02 → Spine01 → Spine` before arms/hands) in `pose_bow`, `pose_march`, `pose_wiggle`, `pose_peekaboo`, and `pose_stretch`, and re-verify `0` new `arm-torso-leg` and `0` new `arm-head` BVH contacts across all sampled `120 Hz` frames.
- **Accessory & camera-frustum fixes (`src/avatar/companionAccessories.ts` & `tools/blender/catalog/bear_accessories.py`):**
  - Keep `cameraDistance = 5.6` so bear pixel height and `still-report.json` contract remain unchanged; fix all four clipping/alignment defects in local bone coordinates identically in TypeScript and Python:
    1. **`flexMask` (`Head`):** Lower mask center `cy` from `41.8` to `~37.8` (and adjust `snoutBulge` reference `y` accordingly, verified in `flex-peak-review.png` at `<= 320 px`) so the eye apertures center cleanly over the bear's pupils and leave eyebrows above the upper rim.
    2. **`bowHat` (`RightHand`):** Reduce lateral reach (`hatOffset.z` / holder axis) and/or trim `pose_bow`'s peak right-arm abduction by `~4°` so the hat crown stays within `NDC_X >= -0.92` at aspect `0.875`.
    3. **`marchFlag` (`RightHand`):** Tilt holder `x` axis slightly inward (`-0.114 -> +0.02`) and shorten pole `52 -> 46` so finial and pennant stay within `NDC_X >= -0.92` and `NDC_Y <= +0.93`.
    4. **`thinkBulb` (`Head`):** Move bulb root from `[-22, 80.5, 16]` to `[-20, 73.0, 16]` and ray radius `13.0 -> 10.8` so upper rays stay comfortably inside both perspective (`NDC_Y <= +0.90`) and studio ortho review renders.
- **Procedural 3D blinking & brow expressions (`Head` bone):**
  - Add lightweight honey-fur **upper eyelid caps** (`leftEyelid`, `rightEyelid`) and **dark-brown expressive brow arcs** (`leftBrow`, `rightBrow`) parented to `Head` in `companionAccessories.ts` (and mirrored for expression checks in `bear_accessories.py`), calibrated to the exact `Head`-local eye coordinates:
    - **Natural blink:** Smooth `150 ms` eyelid close/open pulse driven deterministically from elapsed animation time (`~3.4 s` cadence, plus an expressive blink mid-gesture on `wave`, `encourage`, `shrug`, `think`, `listen`, `idle`, `idle_breathe`), automatically hidden when `activeClipName === 'flex'` (mask on) or during `peekaboo`'s paw-over-eyes window.
    - **Warm brow micro-expressions:** Subtle `±6°` brow tilt/lift per clip category — cheerful lift on celebrations (`celebrate`, `clap`, `jump`, `finale`, `wave`), sympathetic inner-brow lift on `encourage` / `shrug`, and curious asymmetric lift on `search` / `think` / `listen`.

### 2. WebGL runtime, memory & offline PWA fixes

- **Offline precache for `bear-still.png` (`src/pwa/pwaConfig.ts`):**
  - Add `'assets/bear-still-*.png'` to `workbox.globPatterns` (`~116 KB` hashed asset) while keeping `'avatar/**/*.glb'` and `'assets/AvatarScene-*.js'` in `globIgnores`. Verify via `e2e/offline.spec.ts` / bundle check that offline game completion and Home screen render the fallback still with zero failed requests.
- **Zero-FPS idle pause after clip completion (`src/avatar/AvatarScene.tsx` & `src/avatar/AvatarModel.tsx`):**
  - Preserve `LearningCompanion.tsx`'s `{!canRender && <img ... />}` guard (which prevents the 2D-to-3D swap flash fixed in `8d2dc45`).
  - In `AvatarModel.tsx` / `CompanionCanvas`, when `playback.mode === 'once'` finishes (`action.paused` at clip end, after rendering the settled final frame with accessories hidden and eyelids open) — or when `playback.mode === 'still'` renders its initial frame — switch the R3F store to `setFrameloop('never')` so WebGL draw calls drop to **`0 fps`**. Automatically resume `setFrameloop('always')` (or `invalidate()`) whenever `animationName`, `playback.eventKey`, `playback.mode`, or container `ResizeObserver` dimensions change.
- **Shared GPU geometries/materials (`src/avatar/companionAccessories.ts`):**
  - Hoist all accessory `BufferGeometry` and `MeshStandardMaterial` instances into lazy module-level singletons so cloning a `Group` for a new `scene` allocates only lightweight `Group`/`Mesh` wrappers (`0` duplicate GPU buffers or leaked shaders across rounds).
- **Release duplicate raw GLB buffer (`src/avatar/companionResources.ts` & `src/avatar/companionModelLoader.ts`):**
  - Add `companionResources.releaseModelBytes(url)` called by `companionModelLoader.ts` once `GLTFLoader.parseAsync` resolves and caches the `GLTF` object in `resolved`, freeing the `ArrayBuffer` (`3.55 MB` today / `~1.1 MB` after `v7`).

### 3. Moment-based visual guide UX

#### 3a. Cross-session & cross-game celebration rotation (`src/avatar/companionCelebration.ts`)
- Maintain a session rotation offset (`celebrationOffset`) in a tiny module store (resettable in unit tests; starts at `0` on fresh page load):
  - On `run === 0` of the first mounted game in a page visit (`offset === 0`), non-final correct rounds `1..4` play `celebrate`, `wave`, `clap`, `jump`, and round `5` plays `finale`.
  - Whenever a session restarts (`PLAY_AGAIN`, incrementing `run`) or a new game session mounts after prior celebrations, advance the offset by `4` (or by completed non-final celebrations) so the very next session plays `flex` (mask), `bow` (top hat), `march` (flag), and `wiggle` (maracas)!
  - All 8 `ROUND_CELEBRATION_CLIPS` and their 4 celebration props become reachable within two 5-round games (10 rounds total).

#### 3b. Empathetic exhausted-attempt & `0 / 5` summary bear (`src/avatar/companionCelebration.ts` & `src/shared/game/GameShell.tsx`)
- Extend `companionCelebration.ts` (keeping existing export names compatible or clearly typed) to observe **three** overlay moments + **one** optional idle-nudge moment:
  1. **Correct round (`answered-correctly` + `feedback === 'success'`):** Plays rotated `ROUND_CELEBRATION_CLIPS` (or `'finale'` on final correct round).
  2. **Exhausted wrong round (`answered-incorrectly` + `feedback === 'failure'`):** Emits a companion event with `kind: 'encouragement'` alternating between **`'encourage'`** and **`'shrug'`** (`(roundsPlayed + run) % 2 === 0 ? 'encourage' : 'shrug'`).
     - In `GameShell.tsx`, `showCompanionInOverlay` becomes `Boolean(companionConfig && (showCompletion || feedback?.kind === 'success' || feedback?.kind === 'failure'))`, replacing the static `🤗` emoji with the empathetic bear while keeping `OverlayFrame` `tone="failure"` (and fallback `🤗` only when `companionConfig` is `null`).
     - If the **5th (final) round** fails: during the final round's failure audio (`transientFeedback`), the bear plays `'encourage'` / `'shrug'`; when `SHOW_SESSION_COMPLETE` fires:
       - If `correctRounds >= 1` (e.g., `4 / 5`), the summary transitions to `'finale'` (preserving `avatar-companion.spec.ts:134` *"final exhausted failure after successes still shows the finale bear on session-complete"*).
       - If `correctRounds === 0` (`0 / 5`), the summary plays `'encourage'` (and suppresses celebratory `confetti` on `0 / 5`? **Builder call:** keep `OverlayFrame` layout identical, play `'encourage'` instead of `'finale'` when `correctRounds === 0` so the bear comforts rather than disco-dancing on zero points).

#### 3c. Home screen welcome & tap-interactive guide (`src/home/GroupedHomeScreen.tsx` & `src/avatar/HomeCompanion.tsx`)
- Add `HomeCompanion` inside the `GroupedHomeScreen.tsx` header row (`flex justify-between items-start`), positioned between the title/subtitle column and the `Nastavenia` `IconButton` (never floating bottom-right where `PwaHomeControl` sits):
  - **Responsive sizing:** Compact fixed box so category headings and the 2-column game grid remain above the fold across all 10 canonical viewports: `h-20 w-[72px] sm:h-28 sm:w-24 lg:h-32 lg:w-28 shrink-0`.
  - **Prewarming:** Calls `useCompanionResources` on Home (when `!reducedMotion`), pre-fetching the GLB and `AvatarScene` chunk while the child browses game cards so the first in-game celebration is instant.
  - **Lifecycle & battery:**
    - On initial Home mount in a visit, plays `'wave'` (`once`), then 1 cycle of `'idle_breathe'` (falling back to `'idle'` if `'idle_breathe'` is absent in `celebration-v6`), then settles to **`0 fps`**.
    - Wrapped in a tactile, accessible `<button type="button">` (`>= 48×48 px`, `aria-label={t('Zamávaj medvedíkovi')}`, CZ `'Zamával medvídkovi'` / `'Zamávat medvídkovi'` — exact natural Czech `'Zamávat medvídkovi'`): tapping wakes the bear (`eventKey` increments) and cycles through `[ 'peekaboo', 'stretch', 'clap', 'wiggle', 'bow', 'search', 'listen' ]`, then settles back to `0 fps`.
    - Under `prefers-reduced-motion` (or when `companionConfig` is disabled/failed, or offline before GLB cache), renders the crisp `bear-still.png` inside the exact same dimensions without requesting `AvatarScene` or `.glb`. In `mode === 'test'` without `window.__E2E__?.companionFixture`, `getCompanionConfig()` returns `null` (same as `GameShell.tsx`), so existing non-companion Home E2E tests remain untouched; when `companionFixture` is installed (or in production/dev), `HomeCompanion` renders and is covered by dedicated tests in `e2e/avatar-companion.spec.ts`.

#### 3d. Gentle 12-second in-game inactivity nudge (`src/shared/game/GameShell.tsx` & `src/avatar/CompanionNudge.tsx`)
- When `state.phase === 'awaiting-answer' && !state.paused && !contentLocked`:
  - Start a `12,000 ms` inactivity timer inside `GameShell` that resets on any `pointerdown`, `keydown`, `state.roundsPlayed`, `state.wrongAttempts`, or prompt `replaying` change.
  - If `12,000 ms` elapse with no interaction (and `companionConfig` is active):
    - Render a non-blocking, **zero-flow-height** floating guide badge (`position: fixed` bottom-left/bottom-end safe inset or anchored beside the prompt header with `pointer-events-none` decorative container, `z-20`, hidden immediately on any pointer/key interaction or phase exit) showing a compact bear (`h-24 w-20 max-sm:h-20 max-sm:w-16 [@media(max-height:480px)]:h-16 [@media(max-height:480px)]:w-14`) playing one of `[ 'think', 'search', 'listen' ]` (`once`, then `0 fps`), paired with a gentle subtle pulse ring on the existing `Zopakovať zadanie` button (disabled under `prefers-reduced-motion`).
    - **Strict layout safety:** Because the nudge only appears after `12 s` of complete inactivity, uses `pointer-events-none` so clicks pass straight through to any underlying UI, and dismisses synchronously on the first `pointerdown`/`keydown` (`capture: true`) or phase change, it **never** blocks an answer tap, **never** changes `main.scrollHeight` / `main.scrollWidth`, and **never** fires during normal `< 12 s` gameplay or existing responsive E2E suites.

### 4. Documentation sync & `ROADMAP.md` backlog updates

- **Fix documentation drift:** Update `docs/avatar-workflow.md` and `.agents/skills/blender-avatar-pipeline/SKILL.md` so accessory names (`searchGlass`, `thinkBulb`, `flexMask`, `bowHat`, `marchFlag`, `wiggleLeftMaraca`/`wiggleRightMaraca` + facial blink/brows in `companionAccessories.ts`), component names (`AvatarScene.tsx` / `LearningCompanion.tsx`), clip list/durations, and revision hashes/sizes match reality rather than retired `6400f7a` names.
- **Record Phase A + deferred backlog items in `ROADMAP.md`:**
  - Mark Phase A work under `## Phase 5 — Avatar Expansion` and add explicit `[ ]` backlog items for:
    1. **Bear Guide Phase B — Persistent in-round `GamePrompt` companion & shared single WebGL canvas:** Compact interactive bear beside the task prompt across all 11 games (tap to replay prompt, live `listen`/`search` during prompt playback, inline `gentle_try_again` on 1st/2nd wrong attempt) backed by a persistent single-context WebGL portal so round transitions never recreate `WebGLRenderer`.
    2. **Bear Guide Voice Pack (SK + CZ):** Short recorded caregiver lines for Home welcome, idle encouragement, and warm retry hints, integrated into `contentRegistry.ts` and `tools/audio/pending-recordings.json`.
    3. **Bear Guide Bespoke Pedagogical Clips:** `talk_explain`, `point_down` (pointing toward answer cards), `gentle_try_again` (head shake + encouraging wave), `count_one_two_three` (paw-counting for numeracy games), and `sleepy_yawn` (long inactivity).
    4. **Bear Mascot App Icon & Open Graph Branding** (cross-referenced with `1.0 P3` Mudrolíno logo/icon task via `npm run pwa:icons`).
  - Add a dated `2026-11-10` row to `## Decisions Log` recording the choice of Option A (visual moment-based guide first, deferred Option B and voice pack).

## What is left to the builder

- Exact `DECIMATE` ratio (`~0.25–0.35`) and static-track pruning filter in `optimize_generated_bear.mjs`, chosen empirically so `web-v1/model.glb` lands as small as possible (`<= 900 KB` gzip, target `~600 KB`) with zero visible silhouette degradation at `320 px` review scale and `<= 30 µm` Blender ↔ Three.js parity.
- Exact `Head`-local coordinates and curve radii for `leftEyelid`/`rightEyelid`, `leftBrow`/`rightBrow`, and the shifted `flexMask` (`cy`), derived directly from `Bear_fixed_outfit`'s eye UV/vertex landmarks in Blender and verified via `320 px` Cycles & Playwright review captures.
- Clean decomposition of `companionCelebration.ts` (or a sibling `companionGuide.ts`) so existing pure unit tests stay readable while covering rotation offsets, failure empathy, `0 / 5` completion, Home tap cycling, and the `12 s` inactivity timer.
- Updating `/ui-kit` specimens (`src/shared/ui/gallery/`) if new shared UI states or companion specimens (`companion-failure`, `home-companion`) belong in the component gallery inventory (`componentInventory.generated.ts`).
