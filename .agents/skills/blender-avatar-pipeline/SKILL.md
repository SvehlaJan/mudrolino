---
name: blender-avatar-pipeline
description: Use when working on the teo-learn 3D avatar in Blender, especially importing Meshy GLBs, running Blender headlessly from the CLI on macOS, cleaning rigs and animations, retargeting or baking clips, and exporting clean animated GLB assets for the React Three Fiber preview and app runtime.
---

# Blender Avatar Pipeline

Use Blender CLI directly on this machine:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender'
```

Key flags confirmed from the Blender CLI:

- `--background` / `-b`: run headless
- `--python <file>` / `-P <file>`: run a Python script
- `--python-expr <expr>`: run a small inline expression
- `--python-text <name>`: run a text block from a `.blend`
- `--enable-autoexec` / `-y`: allow scripts and drivers
- `--addons <names>`: enable add-ons for the session

## Repo context

- Generated Meshy assets live under `public/avatar/meshy/`
- Raw Meshy task outputs live under `meshy_output/`
- Runtime avatar entrypoint is `src/avatar/`
- Default avatar URL is in `src/avatar/avatarConstants.ts`

Current Meshy files of interest:

- `public/avatar/meshy/neutral-parent-rigged.glb`
- `public/avatar/meshy/neutral-parent-success-cheer-clean.glb`
- `public/avatar/meshy/neutral-parent-victory-cheer.glb`
- `public/avatar/meshy/neutral-parent-walking.glb`
- `public/avatar/meshy/neutral-parent-running.glb`

## Default workflow

1. Use `neutral-parent-rigged.glb` as the base character.
2. Import a Meshy animation GLB only as motion reference.
3. In Blender, retarget or copy usable motion onto the base rig.
4. Bake a clean in-place action.
5. Export a clean `.glb` from Blender for the app.

Do not treat Meshy’s standalone animated GLBs as runtime-ready final assets. They contain baked transform tracks that are not reliable enough for direct use in this app.

## Current working tools

Use these repo-local Blender scripts before inventing new one-off commands:

- `tools/blender/inspect_avatar_glb.py`: imports a GLB and reports objects, armatures, actions, f-curve counts, and action API shape.
- `tools/blender/export_clean_avatar_clip.py`: imports the rigged base plus a reference animation GLB, copies matching bone quaternion curves onto the base rig, removes source actions, and exports an active-action-only cleaned GLB.

Example clean cheer export:

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

## CLI pattern

Open a file in the UI:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' /absolute/path/to/file.blend
```

Run a headless automation script:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python /absolute/path/to/script.py \
  -- /extra/script/args
```

On this machine, Blender 5.1 can crash inside Codex's default sandbox during Metal backend initialization. If a background Blender command crashes before Python output and the crash log mentions GPU/Metal backend detection, rerun the same Blender command outside the sandbox with escalation instead of debugging the Python script.

Avoid parallel Blender invocations for import/export work; run inspections/exports one at a time unless there is a clear reason.

Enable glTF support explicitly if needed:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --addons io_scene_gltf2 \
  --python /absolute/path/to/script.py
```

## Blender Python expectations

For GLB automation scripts:

- import with `bpy.ops.import_scene.gltf(filepath=...)`
- export with `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB')`
- parse script args after Blender's `--` separator; Blender leaves its own CLI flags in `sys.argv`
- select objects explicitly; do not rely on UI state
- clear the default scene before importing unless keeping it is intentional
- bake final actions before export when retargeting is involved

Blender 5.1 action API notes:

- Do not assume `action.fcurves` exists. Imported glTF actions may be layered actions using slots, layers, strips, and channel bags.
- To read f-curves, support both legacy `action.fcurves` and layered `action.layers -> strips -> strip.channelbag(slot).fcurves`.
- To write f-curves, assign the new action to the target armature first, then use `action.fcurve_ensure_for_datablock(...)`.
- When exporting a cleaned GLB, remove unrelated source actions and use:
  - `export_animation_mode="ACTIVE_ACTIONS"`
  - `export_force_sampling=False`
  - `export_nla_strips=False`
  - `export_bake_animation=False`

Without those export options, Blender can re-export extra source actions and sample location/scale tracks back into the GLB.

## Runtime verification

The preview route is `/avatar-preview`. Use Playwright after avatar runtime or asset changes:

```bash
npm run dev
npx playwright install chromium
```

Then run Playwright outside Codex's sandbox on macOS if Chromium fails with a `MachPortRendezvousServer` permission error.

For canvas verification, wait for:

- `Status: available`
- `Clips:` not equal to `none found yet`
- a nonzero canvas `toDataURL("image/png").length`

For this repo, `playwright` is installed as a dev dependency.

Runtime gotchas already fixed once:

- Call `clonedScene.updateMatrixWorld(true)` before measuring bounds in `AvatarModel`.
- Disable frustum culling on avatar mesh/skinned-mesh objects; Meshy skinned mesh bounds can otherwise produce a loaded-but-invisible canvas.
- Give the preview viewport an explicit responsive height. Mobile previously rendered a `318 x 150` canvas.

## App-oriented export target

Prefer one clean base avatar GLB with:

- one armature
- stable bind pose
- in-place actions only
- no baked per-bone scale tracks unless truly required
- no baked locomotion translation for feedback gestures

For this app, the first target clip set should be:

- `idle`
- `success_cheer`
- `sad_react`

## When to stop patching runtime code

If an imported animation GLB requires repeated runtime fixes for:

- foot-only framing
- extreme root drift
- distorted proportions
- oversized shoes or limbs

stop patching the React/Three.js preview and move the cleanup into Blender. That is the correct fix layer for this repo.
