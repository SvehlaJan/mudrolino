# 3D Avatar Handoff

Date: 2026-04-24

This document is the handoff for the current 3D avatar work in `teo-learn`. It is meant to be enough context for a new session to continue the work without reconstructing prior research, design decisions, or file history from chat.

## Goal

Build a customizable animated humanoid avatar for the app, eventually with:

- a neutral parent base first
- later mother-coded and father-coded variants
- future parent-face replacement on the head
- future customizable clothing slots
- clean `.glb` assets usable in the React Three Fiber runtime

The immediate target is a usable neutral parent base plus clean feedback animations such as:

- `idle`
- positive response like `success_cheer`
- negative response like `sad_react`

## Product and Design Decisions

These were explicitly chosen during the design discussion:

- Style direction: semi-stylized friendly adult, closer to “friendly teacher/helper” than realism
- Character identity: neutral parent base
- Body shape: soft average adult
- Surface finish: matte stylized 3D
- Outfit direction: clean modern helper/guide
- Face strategy for v1: placeholder head only; real parent-face insertion is a second phase
- Clothing modularity target: practical slots

Practical clothing slots means:

- hair/headwear
- top
- outer layer
- bottom
- shoes

Important implication: this should be treated as a modular avatar system, not a single fixed final character.

## Core Runtime Constraint

The app already has a Three.js / React Three Fiber avatar path. This means the blocker is asset production and animation cleanup, not basic runtime support.

Relevant runtime files:

- [src/avatar/AvatarModel.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarModel.tsx)
- [src/avatar/AvatarScene.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarScene.tsx)
- [src/avatar/AvatarPresenter.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarPresenter.tsx)
- [src/avatar/AvatarPreviewScreen.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarPreviewScreen.tsx)
- [src/avatar/avatarConstants.ts](/Users/svehla/playground/teo-learn/src/avatar/avatarConstants.ts)

Current default avatar URL:

- `/avatar/meshy/neutral-parent-rigged.glb`

The previous placeholder asset `public/avatar/base-idle.glb` was deleted on purpose because the plan is to move forward with the Meshy-generated base.

## Internet Research Summary

### General pipeline findings

The initial conclusion was:

- the app can already load animated GLBs
- the real problem is getting a usable rigged and animated asset pipeline
- Blender is installed locally and usable from CLI

The early viable pipelines considered were:

1. Ready Player Me -> Blender -> app
2. VRoid Studio -> Blender -> app
3. Meshy -> Blender cleanup -> app

Meshy was chosen for experimentation.

### Meshy findings

Useful official findings:

- `Image to 3D` is the right mode when you want style control from a specific reference
- keep the prompt simple: subject + modifiers + style
- ask for one clear humanoid subject, plain background, clean pose, no clutter
- avoid thin accessories, busy detail, multiple objects, and realism
- for rigging/animation, use a clean humanoid biped

Meshy API features confirmed useful:

- `image-to-3d`
- `rig`
- `animate`
- `.glb` download

Pricing learned during the run:

- `image-to-3d`: 30 credits in this run
- `rig`: 5 credits
- `animate`: 3 credits per animation

### Three.js / glTF findings

Important runtime finding:

- for a web avatar with swappable clothing, the correct long-term structure is one skeleton / armature, one animation set, and multiple skinned meshes for slots
- the same clips can then drive body and clothing together

This is structurally correct for a final app avatar, but the current Meshy exported animation GLBs were not clean enough to use directly.

### Blender findings

Blender CLI is installed and available at:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender'
```

Current Blender CLI knowledge confirmed from official docs and local help:

- `--background` / `-b`
- `--python` / `-P`
- `--python-expr`
- `--python-text`
- `--enable-autoexec` / `-y`
- `--addons`

This is enough to automate import/export, retargeting helpers, and batch cleanup scripts.

## Reference Images Created

Generated reference images used during exploration:

- concept sheet:
  - [/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea72c5ac2481919b54fd762b105c53.png](/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea72c5ac2481919b54fd762b105c53.png)
- variant references:
  - [/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea756ea0ac81919224df2e2de205a2.png](/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea756ea0ac81919224df2e2de205a2.png)
  - [/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea75a9a2e4819191db39e240022028.png](/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea75a9a2e4819191db39e240022028.png)
  - [/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea75dfac148191952328664c2795f8.png](/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea75dfac148191952328664c2795f8.png)
- strict front-view Meshy-ready reference:
  - [/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea8b1afb0c819195d1e00990825c62.png](/Users/svehla/.codex/generated_images/019dbbc6-eb84-7e13-b232-2c335c9503d0/ig_0e46440aab8ee0990169ea8b1afb0c819195d1e00990825c62.png)

The strict front-view image was used for the first Meshy `image-to-3d` run.

## Meshy Skill and API Setup

The session used a repo-local Meshy helper through a local skill:

- installed local skill path:
  - `/Users/svehla/.agents/skills/meshy-3d-generation/SKILL.md`
- helper script:
  - [tools/meshy/meshy_ops.py](/Users/svehla/playground/teo-learn/tools/meshy/meshy_ops.py)
  - [tools/meshy/README.md](/Users/svehla/playground/teo-learn/tools/meshy/README.md)

Important helper rule:

- every credit-spending Meshy action required explicit approval before `--confirm-spend`

The repo-local `.env` contained `MESHY_API_KEY` and the balance check succeeded.

Initial balance confirmed:

- `1600`

Balance after current avatar work:

- `1562`

Credits spent so far:

- `30` image-to-3d
- `5` rig
- `3` animation
- total `38`

## Meshy Execution History

### 1. Image to 3D

Command intent:

- generate a neutral parent base from the strict front-view reference image

Result:

- task id: `019dbc31-8f0c-7978-abc6-83ee4c9adabe`
- project dir:
  - [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31)
- downloaded GLB:
  - [model.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/model.glb)
- thumbnail:
  - [thumbnail.png](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/thumbnail.png)

### 2. Auto-rigging

Command intent:

- auto-rig the generated Meshy base

Result:

- rig task id: `019dbc35-a1cb-746d-910c-f8a564fd13ec`
- outputs:
  - [rigged.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/rigged.glb)
  - [walking.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/walking.glb)
  - [running.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/running.glb)

### 3. First animation

Command intent:

- generate a positive reaction clip for correct answers

Action chosen:

- `Victory_Cheer`
- action id `59`

Result:

- animation task id: `019dbc37-bb1a-74f7-92f5-b7f45ef47ca6`
- output:
  - [animated.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/animated.glb)

## Published Working Copies Under public/

The Meshy outputs were copied into the app’s public tree for preview/testing:

- [public/avatar/meshy/neutral-parent-model.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-model.glb)
- [public/avatar/meshy/neutral-parent-rigged.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-rigged.glb)
- [public/avatar/meshy/neutral-parent-walking.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-walking.glb)
- [public/avatar/meshy/neutral-parent-running.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-running.glb)
- [public/avatar/meshy/neutral-parent-victory-cheer.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-victory-cheer.glb)

## Preview and Runtime Work Completed

### Preview route

There is a local preview route:

- `/avatar-preview`

Key file:

- [src/avatar/AvatarPreviewScreen.tsx](/Users/svehla/playground/teo-learn/src/avatar/AvatarPreviewScreen.tsx)

The preview now lists:

- Meshy base model
- Meshy rigged
- Meshy walking
- Meshy running
- Meshy victory cheer

The old placeholder asset was removed from the preview and from the default runtime path.

### Current runtime changes

Implemented so far:

- default avatar path switched to Meshy rigged asset
- model normalization by bounding box and target height
- explicit camera framing in `AvatarScene`
- support for separate `modelUrl` and `animationUrl`
- preview attempts to apply animation clips from one GLB onto the rigged base mesh

## What Was Tried in Runtime and Why It Failed

Multiple runtime patch attempts were made in the browser preview. These are worth documenting because they explain why the next step should be Blender cleanup rather than more Three.js patching.

### Attempt 1: plain animated GLB preview

Observed result:

- base model preview looked decent
- animated GLBs were zoomed badly toward the feet
- shoes looked huge in some clips

### Attempt 2: normalize scale and center by bounding box

Implemented:

- scale all loaded scenes to a target height
- reposition by bounds center and floor

Result:

- helpful for the base model
- not sufficient for animated GLBs

### Attempt 3: remove root-motion drift

Finding:

- `Hips.position` in the animated Meshy clips had very large translation values

Implemented:

- fixed `Hips.position` during playback

Result:

- still not enough

### Attempt 4: anchor animated hips to the rigged base

Finding:

- animated GLBs did not even start from the same hips baseline as the rigged base

Implemented:

- anchor `Hips.position` to the loaded rig’s own hips position

Result:

- still not enough

### Attempt 5: discard per-bone position and scale tracks

Finding:

- Meshy animation GLBs contain:
  - `24` `position` tracks
  - `24` `quaternion` tracks
  - `24` `scale` tracks
- that means the clips are not “clean rotation-only animation clips”
- they are effectively baked full-transform clips for the entire skeleton

Implemented:

- keep only `quaternion` tracks plus anchored `Hips.position`
- discard other `*.position` and `*.scale` tracks

Result:

- user still reported no meaningful improvement

### Runtime conclusion

This is the key conclusion for future sessions:

- the Meshy standalone animated GLBs are not structurally clean enough to use directly in-app
- continuing to patch these clips in React/Three.js is likely wasted time
- the correct fix layer is Blender

This is the most important technical conclusion in the whole handoff.

## Current Best Understanding of the Problem

The asset situation now appears to be:

- `neutral-parent-rigged.glb` is usable as a base avatar
- Meshy’s standalone animation GLBs are not reliable runtime-ready final clips
- the animation data likely needs retargeting, rebaking, or cleanup in Blender
- trying to reuse the baked Meshy animation GLBs directly causes framing / pose / foot-space distortion

## Planned Final Pipeline

The intended pipeline from this point onward should be:

1. use `neutral-parent-rigged.glb` as the base character
2. open Blender
3. import one Meshy animated GLB only as motion reference
4. retarget or copy usable motion onto the base rig
5. bake a clean in-place action
6. export a clean `.glb`
7. repeat for:
   - `idle`
   - `success_cheer`
   - `sad_react`
8. only after clean actions exist:
   - split clothing into slots
   - preserve a clean head seam for future face replacement
   - optimize for runtime

## Blender Skill Created

A repo-local skill was created to capture the Blender workflow and CLI knowledge:

- [.agents/skills/blender-avatar-pipeline/SKILL.md](/Users/svehla/playground/teo-learn/.agents/skills/blender-avatar-pipeline/SKILL.md)

That skill documents:

- Blender CLI path
- useful CLI flags
- repo context
- recommended workflow
- export expectations
- when to stop patching runtime code and move into Blender

## What Should Happen Next

Recommended next action in a future session:

1. create one Blender CLI or Blender UI workflow using:
   - base: `public/avatar/meshy/neutral-parent-rigged.glb`
   - reference animation: one of the Meshy animated GLBs
2. test whether the motion can be baked cleanly onto the base rig
3. export one clean `success_cheer.glb`
4. replace the preview to use that Blender-cleaned asset

After that, do the same for a negative reaction clip.

## Suggested Files for Next Session

Very likely files to touch next:

- `tools/blender/` new automation scripts
- `public/avatar/meshy/` cleaned exports from Blender
- `src/avatar/AvatarModel.tsx`
- `src/avatar/AvatarPreviewScreen.tsx`
- maybe a new `.blend` working file stored outside git or under a dedicated asset folder if desired

## Current Working Tree State

At the time of writing, relevant local changes include:

- old placeholder `public/avatar/base-idle.glb` deleted
- `src/App.tsx` modified
- `src/avatar/AvatarModel.tsx` modified
- `src/avatar/AvatarPresenter.tsx` modified
- `src/avatar/AvatarPreviewScreen.tsx` modified
- `src/avatar/AvatarScene.tsx` modified
- `src/avatar/avatarConstants.ts` modified
- `.agents/` added
- `meshy_output/` added
- `public/avatar/meshy/` added

Nothing in this area should be assumed committed unless verified in git.

## Source Links Used During Research

Meshy:

- [Meshy prompt practices](https://help.meshy.ai/en/articles/11972484-best-practices-for-creating-a-text-prompt)
- [Meshy Text to 3D](https://help.meshy.ai/en/articles/9996858-how-to-use-the-text-to-3d-feature)
- [Meshy Image to 3D](https://help.meshy.ai/en/articles/9996860-how-to-use-the-image-to-3d-feature)
- [Meshy text-to-3d API](https://docs.meshy.ai/en/api/text-to-3d)
- [Meshy rigging docs](https://docs.meshy.ai/en/api/rigging)
- [Meshy rigging and animation docs](https://docs.meshy.ai/en/api/rigging-and-animation)
- [Meshy API pricing](https://docs.meshy.ai/api/pricing)

Blender:

- [Blender CLI arguments](https://docs.blender.org/manual/en/5.0/advanced/command_line/arguments)
- [Blender macOS CLI launch](https://docs.blender.org/manual/en/5.0/advanced/command_line/launch/macos)
- [Blender scripting security / autoexec](https://docs.blender.org/manual/en/5.0/advanced/scripting/security)

glTF / Three.js:

- [glTF skins tutorial](https://github.khronos.org/glTF-Tutorials/gltfTutorial/gltfTutorial_020_Skins.html)
- [glTF animations tutorial](https://github.khronos.org/glTF-Tutorials/gltfTutorial/gltfTutorial_007_Animations.html)
- [Three.js SkinnedMesh bind mode docs](https://github.com/mrdoob/three.js/blob/dev/docs/pages/SkinnedMesh.html.md)
- [Three.js shared skeleton example](https://github.com/mrdoob/three.js/blob/dev/examples/webgl_animation_multiple.html)
- [Three.js renderer info](https://threejs.org/docs/pages/WebGLRenderer.html)

Other pipeline references considered earlier:

- [Ready Player Me GLB API](https://docs.readyplayer.me/ready-player-me/api-reference/rest-api/avatars/get-3d-avatars)
- [Ready Player Me full-body avatars](https://docs.readyplayer.me/ready-player-me/api-reference/avatars/full-body-avatars)
- [Ready Player Me animations](https://docs.readyplayer.me/ready-player-me/integration-guides/unity/animations)
- [Mixamo FAQ](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html)
- [Mixamo rigging and animation help](https://helpx.adobe.com/creative-cloud/help/mixamo-rigging-animation.html)
- [VRoid VRM export](https://vroid.pixiv.help/hc/en-us/articles/38726063278233-How-do-I-export-a-model-as-VRM)
- [VRM add-on for Blender](https://vrm-addon-for-blender.info/en-us/)

## Final Recommendation

If continuing this work in a new session, do not start by debugging the React preview again.

Start in Blender with:

- `neutral-parent-rigged.glb` as the only base mesh
- one Meshy animated GLB as motion reference

The next milestone should be:

- one Blender-cleaned, in-place, app-usable cheer clip

Only after that should the app runtime be revisited.

## 2026-04-24 Continuation Progress

The next milestone was started with a repeatable Blender CLI workflow.

Added tools:

- [tools/blender/inspect_avatar_glb.py](/Users/svehla/playground/teo-learn/tools/blender/inspect_avatar_glb.py)
- [tools/blender/export_clean_avatar_clip.py](/Users/svehla/playground/teo-learn/tools/blender/export_clean_avatar_clip.py)

Important Blender 5.1 finding:

- Blender 5.1 uses layered actions and action slots, so scripts cannot rely on `action.fcurves` directly.
- Use action layers/strips/channel bags for reading f-curves.
- Use `action.fcurve_ensure_for_datablock(...)` for writing f-curves.
- That write helper requires the action to be assigned to the armature before it is called.

The first cleaned cheer export was created at:

- [public/avatar/meshy/neutral-parent-success-cheer-clean.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-success-cheer-clean.glb)

Inspection evidence:

- raw base: one 24-bone armature; one action with `72` location, `96` quaternion, and `72` scale f-curves
- raw Meshy cheer: one matching 24-bone armature; one action with `72` location, `96` quaternion, and `72` scale f-curves
- cleaned cheer candidate: one matching 24-bone armature; one action with `96` quaternion f-curves only

Exporter settings that mattered:

- `export_animation_mode="ACTIVE_ACTIONS"`
- `export_force_sampling=False`
- `export_nla_strips=False`
- `export_bake_animation=False`

Without these settings, Blender exported extra source actions and sampled location/scale tracks back into the GLB.

The avatar preview now defaults to the cleaned candidate with label:

- `Blender-cleaned cheer`

The React preview also needed two runtime fixes before the avatar rendered visibly:

- `AvatarModel` now forces `clonedScene.updateMatrixWorld(true)` before measuring bounds.
- `AvatarModel` disables frustum culling for avatar mesh/skinned-mesh objects. Without this, the skinned avatar could load and expose clips while rendering as an empty canvas.

The preview camera and preview viewport were adjusted so the avatar is inspectable:

- desktop camera moved farther back
- preview canvas now has an explicit responsive height instead of relying on unresolved `h-full`
- mobile canvas now renders at roughly `318 x 607` instead of the previous `318 x 150`

Verification:

- `npm run lint` passed
- `npm run build` passed with the existing Vite large chunk warning
- Playwright Chromium was installed for browser verification
- Playwright desktop screenshot confirmed `Status: available`, clip `Animation`, and visible full-body avatar
- Playwright mobile screenshot confirmed the avatar canvas renders after scrolling it into view

Current next step:

1. visually validate `/avatar-preview` on desktop and mobile viewport sizes
2. if the cleaned cheer is materially better than the raw Meshy cheer, use the same Blender workflow for `sad_react`
3. if the motion is still poor, move from direct quaternion-copy cleanup to a stronger Blender retarget/bake workflow
