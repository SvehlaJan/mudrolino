# 3D Avatar Knowledge Base

Date: 2026-04-24

This document is the durable project overview for the `teo-learn` 3D avatar work. Use it before changing avatar assets, runtime code, Blender tooling, or the product roadmap.

## Product Direction

The avatar is a local-first companion for the preschool learning app. The first useful version is a neutral parent/helper character, not a realistic likeness and not a child profile feature.

Current target:

- semi-stylized friendly adult
- neutral parent base
- soft average adult body shape
- matte stylized 3D finish
- clean modern helper/guide outfit
- placeholder face/head for v1
- no parent-face replacement in the first shipped POC

Longer-term target:

- mother-coded and father-coded variants
- optional parent-face replacement as a later phase
- practical clothing slots:
  - hair/headwear
  - top
  - outer layer
  - bottom
  - shoes
- one skeleton/armature driving base body and clothing meshes
- clean feedback animations for game responses

## Current Status

The app already has a React Three Fiber runtime path. The hard part is asset quality and animation cleanup.

Runtime entrypoints:

- [src/avatar/AvatarModel.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarModel.tsx)
- [src/avatar/AvatarScene.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarScene.tsx)
- [src/avatar/AvatarPresenter.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarPresenter.tsx)
- [src/avatar/AvatarPreviewScreen.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarPreviewScreen.tsx)
- [src/avatar/avatarConstants.ts](/Users/svehla/playground/teo-learn/src/avatar/avatarConstants.ts)

Preview route:

- `/avatar-preview`

Current default avatar URL:

- `/avatar/meshy/neutral-parent-rigged.glb`

Current best cleaned animation candidate:

- [public/avatar/meshy/neutral-parent-success-cheer-clean.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-success-cheer-clean.glb)

The old placeholder asset `public/avatar/base-idle.glb` was intentionally removed.

## Asset Inventory

Raw Meshy project output:

- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/model.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/model.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/rigged.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/rigged.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/walking.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/walking.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/running.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/running.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/animated.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/animated.glb)

Published app assets:

- [public/avatar/meshy/neutral-parent-model.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-model.glb)
- [public/avatar/meshy/neutral-parent-rigged.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-rigged.glb)
- [public/avatar/meshy/neutral-parent-walking.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-walking.glb)
- [public/avatar/meshy/neutral-parent-running.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-running.glb)
- [public/avatar/meshy/neutral-parent-victory-cheer.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-victory-cheer.glb)
- [public/avatar/meshy/neutral-parent-success-cheer-clean.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-success-cheer-clean.glb)

Meshy tasks:

- image-to-3D base task: `019dbc31-8f0c-7978-abc6-83ee4c9adabe`
- rig task: `019dbc35-a1cb-746d-910c-f8a564fd13ec`
- victory cheer animation task: `019dbc37-bb1a-74f7-92f5-b7f45ef47ca6`

Credits spent so far:

- `30` image-to-3D
- `5` rig
- `3` animation
- `38` total

## Technical Architecture

The long-term avatar architecture should use:

- one stable skeleton/armature
- one reusable animation set
- multiple skinned meshes for clothing slots
- no per-user personal data in the POC
- future local avatar state for selected cosmetics

This structure lets the base body and future clothing meshes share animations. It is also the right shape for future unlockable outfits.

Runtime responsibilities:

- `AvatarPresenter`: guards asset availability and runtime error boundary
- `AvatarScene`: owns Canvas, camera, lights, and scene framing
- `AvatarModel`: loads GLBs, clones scenes, normalizes bounds, applies animations
- `AvatarPreviewScreen`: developer inspection route for comparing assets and clips
- `avatarConstants.ts`: default asset URL and feature flag constants

## Blender Pipeline

Use Blender from:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender'
```

Project-local tooling:

- [tools/blender/inspect_avatar_glb.py](/Users/svehla/playground/teo-learn/tools/blender/inspect_avatar_glb.py)
- [tools/blender/export_clean_avatar_clip.py](/Users/svehla/playground/teo-learn/tools/blender/export_clean_avatar_clip.py)

Inspect a GLB:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/inspect_avatar_glb.py \
  -- public/avatar/meshy/neutral-parent-rigged.glb
```

Export the current cleaned cheer candidate:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/export_clean_avatar_clip.py \
  -- \
  --base public/avatar/meshy/neutral-parent-rigged.glb \
  --reference public/avatar/meshy/neutral-parent-victory-cheer.glb \
  --output public/avatar/meshy/neutral-parent-success-cheer-clean.glb \
  --action-name success_cheer
```

Important Blender 5.1 lessons:

- Blender may crash inside Codex's default sandbox before Python starts because Metal/GPU backend detection fails. Rerun outside the sandbox when the crash log points to GPU/Metal initialization.
- Do not run parallel Blender imports/exports unless necessary.
- Parse Blender script args after the `--` separator.
- Imported glTF actions may be layered actions, not legacy actions. Support slots/layers/strips/channel bags.
- `action.fcurve_ensure_for_datablock(...)` requires the action to be assigned to the target armature first.
- Use active-action-only glTF export settings for cleaned clips:
  - `export_animation_mode="ACTIVE_ACTIONS"`
  - `export_force_sampling=False`
  - `export_nla_strips=False`
  - `export_bake_animation=False`
- Remove unrelated source actions before export.

## Animation Findings

Raw Meshy animation GLBs are not runtime-ready for this app.

Observed raw action structure:

- same 24-bone armature as the base rig
- `72` location f-curves
- `96` quaternion f-curves
- `72` scale f-curves

This means the animation is a baked full-transform clip, not a clean rotation-only humanoid action. Runtime attempts to anchor hips, discard position/scale tracks, or normalize bounds in React were not enough by themselves.

Current cleaned cheer candidate:

- one 24-bone armature
- one action named `Animation` after glTF export
- `96` quaternion f-curves only
- no exported location or scale channels
- renders in the preview after runtime frustum-culling fix

Interpretation:

- The cleaned cheer is materially better as a glTF structure.
- The pose/motion still needs human review before it becomes an in-game response animation.
- If visual quality is still not good enough, the next Blender step is proper retargeting/baking, not more React patching.

## Runtime Lessons

The avatar can load while rendering as a blank canvas if skinned mesh culling/bounds are wrong.

Fixes now in `AvatarModel`:

- call `clonedScene.updateMatrixWorld(true)` before measuring bounds
- disable frustum culling for mesh/skinned-mesh objects
- normalize cloned scene to a target height
- support separate `modelUrl` and `animationUrl`
- expose animation names back to the preview screen

Preview framing fixes:

- camera moved farther back for inspection
- responsive preview viewport has explicit height
- mobile canvas now renders at useful height instead of `318 x 150`

Known nonblocking warning:

- Three/Drei logs `THREE.Clock: This module has been deprecated. Please use THREE.Timer instead.`

## Verification Workflow

Run:

```bash
npm run lint
npm run build
npm run dev
```

The dev server binds to `0.0.0.0`; if port `3000` is occupied, Vite will choose another port.

Playwright is installed as a dev dependency:

```bash
npx playwright install chromium
```

On macOS inside Codex, Playwright's Chromium may fail with:

```text
MachPortRendezvousServer... Permission denied
```

When that happens, rerun Playwright browser verification outside the sandbox with escalation.

Minimum avatar preview assertions:

- `/avatar-preview` loads
- selected asset says `Status: available`
- selected asset says `Clips: Animation` or another real clip name
- canvas dimensions are nonzero
- `canvas.toDataURL("image/png").length` is nonzero and materially larger than a blank shell
- desktop and mobile screenshots show the avatar, not just the background panel

Recent verified screenshot artifacts:

- `/tmp/avatar-preview-playwright-final-desktop-2.png`
- `/tmp/avatar-preview-playwright-final-mobile.png`

## Current Roadmap

### Done

- Generated neutral parent base via Meshy image-to-3D.
- Auto-rigged the base in Meshy.
- Generated first Meshy victory cheer animation.
- Published Meshy outputs under `public/avatar/meshy/`.
- Added `/avatar-preview` route for asset comparison.
- Replaced old placeholder default URL with the Meshy rigged asset.
- Added Blender inspection and clean-export scripts.
- Exported first rotation-only cleaned cheer candidate.
- Fixed preview rendering for skinned mesh visibility and responsive canvas height.
- Installed Playwright for browser verification.

### Next

- Visually evaluate whether `neutral-parent-success-cheer-clean.glb` is acceptable as a correct-answer reaction.
- If acceptable, generate or clean a negative reaction candidate for `sad_react`.
- Add a neutral idle candidate or clean base idle export.
- Decide whether cleaned clips should be combined into one multi-action runtime GLB or kept as separate GLBs during POC.
- Add a small scripted GLB validation check for expected action/channel counts.

### Later

- Create a stronger Blender retarget/bake workflow if direct quaternion-copy cleanup is not enough.
- Split the avatar into practical clothing slots.
- Keep a clean head/neck boundary for future face replacement.
- Optimize geometry and textures for production delivery.
- Decide whether avatar assets should be lazy-loaded only on screens where the companion appears.
- Add in-game integration after the preview asset quality is acceptable.

## Decision Log

| Date | Decision | Reason |
| --- | --- | --- |
| 2026-04-19 | Avatar POC is local-first with one stylized character and no parent likeness. | Avoids personal data handling and keeps the first release small. |
| 2026-04-24 | Meshy animated GLBs should be treated as references, not final runtime clips. | They contain baked location/rotation/scale tracks that caused framing and deformation issues. |
| 2026-04-24 | Blender is the correct cleanup layer for avatar animation. | React-side fixes could not reliably repair baked transform clips. |
| 2026-04-24 | First cleaned cheer candidate uses base rig plus copied quaternion curves only. | Produces a standard glTF animation with no location/scale channels. |
| 2026-04-24 | Runtime disables frustum culling for avatar meshes. | Meshy skinned mesh bounds made loaded avatars render invisibly. |

## Related Context

- [docs/2026-04-24-3d-avatar-handoff.md](/Users/svehla/playground/teo-learn/docs/2026-04-24-3d-avatar-handoff.md)
- [docs/superpowers/specs/2026-04-19-avatar-companion-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-04-19-avatar-companion-design.md)
- [docs/superpowers/plans/2026-04-21-avatar-staged-poc.md](/Users/svehla/playground/teo-learn/docs/superpowers/plans/2026-04-21-avatar-staged-poc.md)
- [.agents/skills/blender-avatar-pipeline/SKILL.md](/Users/svehla/playground/teo-learn/.agents/skills/blender-avatar-pipeline/SKILL.md)
- [.agents/skills/playwright-browser-verification/SKILL.md](/Users/svehla/playground/teo-learn/.agents/skills/playwright-browser-verification/SKILL.md)
