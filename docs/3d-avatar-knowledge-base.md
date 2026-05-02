# 3D Avatar Knowledge Base

Date: 2026-05-02

This document is the durable project overview for the `teo-learn` 3D avatar work. Use it before changing avatar assets, runtime code, Blender tooling, or the product roadmap.

## Product Direction

The avatar is a local-first companion for the preschool learning app. The current runtime POC proved that the app can render, animate, and preview a 3D companion, but the next product step is a customizable parent/caregiver avatar rather than a single fixed character.

Current target:

- semi-stylized friendly adult
- male-coded parent/caregiver base generated from scratch
- soft average adult body shape
- matte stylized 3D finish
- skin-toned smooth mannequin-like underlayer
- modest and non-anatomical; no explicit body detail
- no fixed clothing in the base mesh
- placeholder face/head for MVP
- head prepared for future generated face decal

Longer-term target:

- male-coded and female-coded base variants
- optional selfie-assisted generated face customization as a later phase
- practical clothing slots:
  - top
  - bottom
  - shoes
  - hair
  - accessory
- one skeleton/armature driving base body and clothing meshes
- clean feedback animations for game responses
- optional body-shape customization after asset support exists

## Current Status

The app already has a React Three Fiber runtime path. The proven hard parts are asset quality, animation cleanup, and modular avatar asset production.

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

Current modular male avatar URL:

- `/avatar/modular/male-base-modular.glb`

Current cleaned animation candidates:

- [public/avatar/meshy/neutral-parent-success-cheer-clean.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-success-cheer-clean.glb)
- [public/avatar/meshy/neutral-parent-sad-react-clean.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-sad-react-clean.glb)

The old placeholder asset `public/avatar/base-idle.glb` was intentionally removed.

The current Meshy character is not the long-term clothing-customization base. Inspection showed it is one fused skinned mesh named `char1` with one material, so there are no separate clothing parts to toggle. Keep it as runtime/animation proof and visual reference; build the customizable avatar on a new modular male-coded base.

## Asset Inventory

Raw Meshy project output:

- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/model.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/model.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/rigged.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/rigged.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/walking.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/walking.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/running.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/running.glb)
- [meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/animated.glb](/Users/svehla/playground/teo-learn/meshy_output/20260423_231608_neutral-parent-base-v1_019dbc31/animated.glb)
- [meshy_output/20260425_065551_neutral-parent-sad-react-shrug-v1_019dc2fd/animated.glb](/Users/svehla/playground/teo-learn/meshy_output/20260425_065551_neutral-parent-sad-react-shrug-v1_019dc2fd/animated.glb)

Published app assets:

- [public/avatar/meshy/neutral-parent-model.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-model.glb)
- [public/avatar/meshy/neutral-parent-rigged.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-rigged.glb)
- [public/avatar/meshy/neutral-parent-walking.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-walking.glb)
- [public/avatar/meshy/neutral-parent-running.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-running.glb)
- [public/avatar/meshy/neutral-parent-victory-cheer.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-victory-cheer.glb)
- [public/avatar/meshy/neutral-parent-shrug.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-shrug.glb)
- [public/avatar/meshy/neutral-parent-success-cheer-clean.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-success-cheer-clean.glb)
- [public/avatar/meshy/neutral-parent-sad-react-clean.glb](/Users/svehla/playground/teo-learn/public/avatar/meshy/neutral-parent-sad-react-clean.glb)

Meshy tasks:

- male modular base preview task: `019de4f3-7e65-7215-a071-0c7f18973e36`
  - project dir: [meshy_output/20260501_211310_male-parent-underlayer-base-v1_019de4f3](/Users/svehla/playground/teo-learn/meshy_output/20260501_211310_male-parent-underlayer-base-v1_019de4f3)
  - downloaded preview GLB: [meshy_output/20260501_211310_male-parent-underlayer-base-v1_019de4f3/preview.glb](/Users/svehla/playground/teo-learn/meshy_output/20260501_211310_male-parent-underlayer-base-v1_019de4f3/preview.glb)
  - cost: `20` credits
  - decision: rejected visually; text-to-3D did not produce a usable modest underlayer base
- male modular image reference:
  - generated image copy: [meshy_output/reference_images/male-parent-underlayer-reference-v1.png](/Users/svehla/playground/teo-learn/meshy_output/reference_images/male-parent-underlayer-reference-v1.png)
  - featureless v2 image copy: [meshy_output/reference_images/male-parent-underlayer-reference-v2-featureless.png](/Users/svehla/playground/teo-learn/meshy_output/reference_images/male-parent-underlayer-reference-v2-featureless.png)
- male modular image-to-3D task: `019de4fe-8076-729e-bf73-e5a0ea09078e`
  - project dir: [meshy_output/20260501_212434_male-parent-underlayer-image-base-v1_019de4fe](/Users/svehla/playground/teo-learn/meshy_output/20260501_212434_male-parent-underlayer-image-base-v1_019de4fe)
  - downloaded GLB: [meshy_output/20260501_212434_male-parent-underlayer-image-base-v1_019de4fe/model.glb](/Users/svehla/playground/teo-learn/meshy_output/20260501_212434_male-parent-underlayer-image-base-v1_019de4fe/model.glb)
  - cost: `30` credits
  - validation: `0` errors, `0` warnings, `1` info (`NODE_MATRIX_DEFAULT`)
  - inspect summary: one unrigged triangle mesh, `68,489` vertices, one 2048x2048 base-color texture, no animations
  - decision: rejected visually; thumbnail still shows torso/groin anatomical shading and is not modest enough for the underlayer contract
- male modular textured v2 image-to-3D task: `019de508-335c-74c0-8b12-f5952406b6a0`
  - project dir: [meshy_output/20260501_213540_male-parent-underlayer-image-base-v2-tex_019de508](/Users/svehla/playground/teo-learn/meshy_output/20260501_213540_male-parent-underlayer-image-base-v2-tex_019de508)
  - downloaded GLB: [meshy_output/20260501_213540_male-parent-underlayer-image-base-v2-tex_019de508/model.glb](/Users/svehla/playground/teo-learn/meshy_output/20260501_213540_male-parent-underlayer-image-base-v2-tex_019de508/model.glb)
  - cost: `30` credits
  - decision: rejected visually; stricter reference helped the shape but texture still introduced unacceptable dark body shading
- male modular no-texture v2 image-to-3D task: `019de50b-07c9-77ca-be26-0a30c8fb67fd`
  - project dir: [meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b](/Users/svehla/playground/teo-learn/meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b)
  - downloaded GLB: [meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/model.glb](/Users/svehla/playground/teo-learn/meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/model.glb)
  - cost: `20` credits
  - decision: accepted as the rigging source; no texture avoids anatomical texture shading, and Blender assigns final materials
- male modular no-texture v2 rig task: `019de50e-13bf-764b-8fbc-2bee7c4bc4e4`
  - rigged GLB: [meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/rigged.glb](/Users/svehla/playground/teo-learn/meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/rigged.glb)
  - cost: `5` credits
  - armature summary: `24` bones: `Hips`, legs/feet/toes, spine, shoulders/arms/hands, `neck`, `Head`, `head_end`, `headfront`
- male modular MVP asset:
  - exported GLB: [public/avatar/modular/male-base-modular.glb](/Users/svehla/playground/teo-learn/public/avatar/modular/male-base-modular.glb)
  - export script: [tools/blender/export_male_modular_avatar.py](/Users/svehla/playground/teo-learn/tools/blender/export_male_modular_avatar.py)
  - working blend: [meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/male-base-modular-working.blend](/Users/svehla/playground/teo-learn/meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/male-base-modular-working.blend)
  - object contract: `Armature`, `body_underlayer_male`, `head`, `face_anchor`, `top_blue_tshirt`, `top_green_hoodie`
  - validation: `0` errors; warnings are expected `TEXCOORD_0` unused attributes and `NODE_SKINNED_MESH_NON_ROOT`
- image-to-3D base task: `019dbc31-8f0c-7978-abc6-83ee4c9adabe`
- rig task: `019dbc35-a1cb-746d-910c-f8a564fd13ec`
- victory cheer animation task: `019dbc37-bb1a-74f7-92f5-b7f45ef47ca6`
- shrug animation task: `019dc2fd-df42-7bef-854f-9cb8f6d547dc`

Credits spent so far:

- `30` image-to-3D
- `5` rig
- `3` victory cheer animation
- `3` shrug animation
- `20` male modular base preview
- `30` male modular image-to-3D base
- `30` male modular textured v2 image-to-3D base
- `20` male modular no-texture v2 image-to-3D base
- `5` male modular no-texture v2 rig
- `146` total

## Technical Architecture

The long-term avatar architecture should use:

- one stable skeleton/armature
- one reusable animation set
- multiple skinned meshes for clothing slots
- no per-user personal data in the POC
- future local avatar state for selected cosmetics

This structure lets the base body and future clothing meshes share animations. It is also the right shape for future unlockable outfits.

MVP architecture decision:

- Use one modular GLB per base variant for the first customizable avatar.
- Generate a new male-coded underlayer base from scratch rather than editing the current clothed Meshy character.
- Implement only the `top` slot first.
- Keep separate clothing GLBs in the backlog after the first modular base is stable.
- Store face and body-shape config now, but render only placeholder face and average body for MVP.

Runtime responsibilities:

- `AvatarPresenter`: guards asset availability and runtime error boundary
- `AvatarScene`: owns Canvas, camera, lights, and scene framing
- `AvatarModel`: loads GLBs, clones scenes, normalizes bounds, applies animations
- `AvatarPreviewScreen`: developer inspection route for comparing assets and clips
- `avatarConstants.ts`: default asset URL and feature flag constants

Current runtime implementation status:

- `avatarConstants.ts` includes `AVATAR_MODULAR_MALE_MODEL_URL`.
- Avatar storage version is `2`.
- Avatar state now persists `baseVariant`, `slotSelections`, `face`, and `bodyShape`.
- `AvatarModel` toggles `top_*` mesh visibility from `slotSelections.top`.
- `/avatar-preview` includes the modular male asset and top selector controls.
- Home avatar overlay loads the modular male GLB and saved top selection.
- Home settings include a parent-facing avatar top selector.

## Male Modular Avatar Design

Authoritative design spec:

- [docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md)

MVP asset contract:

```text
male-base-modular.glb
  Armature
  body_underlayer_male
  head
  face_anchor
  top_blue_tshirt
  top_green_hoodie
```

Visibility rules:

- `body_underlayer_male`, `head`, and `face_anchor` are always visible.
- Exactly one `top_*` mesh is visible at a time.
- Default top is `top_blue_tshirt`.
- First alternate is `top_green_hoodie`.
- Future naming pattern: `bottom_*`, `shoes_*`, `hair_*`, `accessory_*`.

Visual generation direction:

- male-coded parent/caregiver, not teacher-coded
- warm, calm, supportive adult helper presence
- semi-stylized, preschool-safe, matte 3D
- skin-toned smooth mannequin-like underlayer
- modest and non-anatomical
- no fixed outfit, accessories, busy detail, or photorealism
- neutral front-facing pose with arms slightly away from torso
- simple placeholder face
- prepared face patch/anchor for later generated face decal

The top meshes should be created and fitted in Blender after the base exists. Do not ask Meshy to generate final modular clothing in the initial base prompt.

## Male Base Generation Lessons

Use these lessons before spending more Meshy credits on avatar bases.

### Meshy input strategy

- Prefer Meshy image-to-3D over text-to-3D for avatar base generation.
- The image reference should be generated or curated first, then copied into `meshy_output/reference_images/` so the Meshy input is durable.
- Text-to-3D produced a visually unusable male underlayer despite a detailed prompt. Do not repeat text-to-3D for this base style unless there is a new reason.
- Textured image-to-3D can reintroduce unwanted torso/groin shadows even when the reference image is mostly featureless.
- For modest mannequin underlayers, prefer `image-to-3d --no-texture --disable-pbr`, then assign clean skin/clothing materials in Blender.
- The no-texture image-to-3D output is gray and unmaterialed by design. That is acceptable and preferable for this base because Blender owns final material color.
- If the no-texture request appears to hang at task creation, check balance/history before retrying. In this session, Meshy had not charged or recorded a project when the request timed out before returning a task id.
- The local Meshy helper now uses a `180` second API request timeout because the previous `60` second timeout was too short for no-texture image-to-3D task creation.
- Current standing approval from the user: Meshy spends are pre-approved while the balance is above `1000`, as long as the spend matches the agreed avatar-base plan. Continue reporting each spend and resulting balance.

### Reference image guidance

The successful reference direction was:

- full-body, centered, front-facing A-pose
- smooth toy/clay mannequin
- male-coded but non-anatomical
- no clothing, no underwear lines, no nipples, no navel, no chest definition, no groin definition
- simplified hands/feet
- plain white background
- no dramatic lighting or shadows

The first generated reference still led to anatomical texture shading after Meshy. The better v2 reference was more featureless, but texture still added dark body shading. The accepted path used that v2 reference with texture disabled.

### Accepted generation path

The accepted source path for the MVP male modular asset is:

1. Generate featureless reference image:
   - [meshy_output/reference_images/male-parent-underlayer-reference-v2-featureless.png](/Users/svehla/playground/teo-learn/meshy_output/reference_images/male-parent-underlayer-reference-v2-featureless.png)
2. Meshy image-to-3D with no texture:
   - task `019de50b-07c9-77ca-be26-0a30c8fb67fd`
   - command shape: `image-to-3d --ai-model latest --no-texture --disable-pbr --wait --download-glb`
   - cost: `20` credits
3. Meshy rigging:
   - task `019de50e-13bf-764b-8fbc-2bee7c4bc4e4`
   - cost: `5` credits
4. Blender modular export:
   - [tools/blender/export_male_modular_avatar.py](/Users/svehla/playground/teo-learn/tools/blender/export_male_modular_avatar.py)
   - output [public/avatar/modular/male-base-modular.glb](/Users/svehla/playground/teo-learn/public/avatar/modular/male-base-modular.glb)

### Blender export lessons

- Meshy rigged imports can have tiny object transforms with large local mesh coordinates. Do not assume local mesh coordinates are the final GLB coordinate space.
- Creating new unskinned meshes from imported local coordinates can blow up exported bounds. This happened with `face_anchor`.
- For the current automated `face_anchor`, use explicit tiny final GLB-space coordinates near the face instead of deriving size from the imported mesh local coordinates.
- Blender `Solidify` on copied Meshy body shells created oversized bounds because thickness was interpreted in the wrong scale context. Avoid Solidify for automated MVP top shells unless transforms are normalized first.
- The current `top_blue_tshirt` and `top_green_hoodie` are automated skinned shell proofs made from cropped duplicate body meshes. They are good enough to prove runtime slot selection, but final clothing quality should still be hand-fitted or generated as separate clothing assets later.
- The exported modular GLB intentionally has no animations. It relies on compatible external animation files or future animation integration.
- Expected glTF validator warnings for the modular asset:
  - `UNUSED_OBJECT` on `TEXCOORD_0`
  - `NODE_SKINNED_MESH_NON_ROOT`
  These are acceptable for now because validation reports `0` errors and runtime rendering works.

### Meshy helper and asset hygiene

- Keep accepted generated source assets under `meshy_output/` and publish only runtime assets under `public/avatar/`.
- Commit rejected task metadata and lessons, but do not commit every rejected heavy GLB unless it is needed for reproducibility.
- Blender may create `.blend1` backup files. Do not stage those backups.

## Runtime State and Catalog

The current `modelId` + `outfitId` state should migrate to a slot-ready config.

Target MVP shape:

```ts
export type AvatarBaseVariant = 'male';
export type AvatarSlot = 'top' | 'bottom' | 'shoes' | 'hair' | 'accessory';
export type AvatarAnimationName = 'idle' | 'success' | 'failure';

export interface AvatarConfig {
  baseVariant: AvatarBaseVariant;
  animation: AvatarAnimationName;
  slotSelections: {
    top: 'top_blue_tshirt' | 'top_green_hoodie';
  };
  face: {
    mode: 'placeholder' | 'generated_decal';
    assetUrl: string | null;
  };
  bodyShape: {
    scale: number;
    build: 'average' | 'slim' | 'sturdy';
    height: 'average' | 'short' | 'tall';
  };
}
```

Default config:

```ts
{
  baseVariant: 'male',
  animation: 'idle',
  slotSelections: { top: 'top_blue_tshirt' },
  face: { mode: 'placeholder', assetUrl: null },
  bodyShape: { scale: 1, build: 'average', height: 'average' },
}
```

Catalog items should keep UI labels and mesh names centralized:

```ts
interface AvatarCatalogItem {
  id: string;
  slot: AvatarSlot;
  label: string;
  meshName: string;
  compatibleBaseVariants: AvatarBaseVariant[];
}
```

MVP catalog:

- `top_blue_tshirt`: `Modré tričko`, mesh `top_blue_tshirt`, compatible with `male`
- `top_green_hoodie`: `Zelená mikina`, mesh `top_green_hoodie`, compatible with `male`

Future catalog shape should allow one logical clothing item to map to separate fitted assets per base variant, for example male and female GLBs for the same shirt.

## Face and Body Customization Backlog

Face customization should start with the easier generated-decal path, not head replacement.

Future flow:

1. Parent opens face customization behind the parent gate.
2. User captures or uploads a selfie.
3. Browser sends the image to a backend/serverless endpoint.
4. Backend calls Gemini image generation/editing to transform the selfie into a friendly stylized face PNG.
5. Backend returns the generated face.
6. App stores the generated stylized face asset, not the raw selfie by default.
7. Runtime applies the generated PNG as a decal or texture on `face_anchor`.

Rules:

- Do not expose Gemini API keys in browser code.
- Do not store raw selfies by default.
- Provide reset/delete controls for generated face customization.
- Treat UV-based head texture replacement as a later quality upgrade.

Body-shape customization should be represented in state now but not rendered in the MVP. Safe progression:

1. Uniform scale for preview/debug only.
2. Discrete fitted base variants if needed.
3. Morph targets for `slim`, `sturdy`, `short`, and `tall`.

Do not expose build/height controls until clipping, clothing fit, and animation behavior are acceptable.

## Meshy Pipeline

Use the repo-local Meshy helper for all Meshy work:

- [tools/meshy/meshy_ops.py](/Users/svehla/playground/teo-learn/tools/meshy/meshy_ops.py)
- [tools/meshy/README.md](/Users/svehla/playground/teo-learn/tools/meshy/README.md)

Rules:

- Load `MESHY_API_KEY` only from the current shell environment or repo-local `.env`.
- Never read or write shell profile files.
- Save outputs only under `meshy_output/`.
- Before any credit-spending Meshy command, summarize the expected cost and wait for user approval.
- Only pass `--confirm-spend` after approval.
- Skip 3D printing and 2D image endpoints.

Planned male-base sequence:

1. Check balance with `python3 tools/meshy/meshy_ops.py balance`.
2. Summarize intended operation and expected credits.
3. Prefer Meshy image-to-3D over text-to-3D for character base generation. Use a clean generated reference image so Meshy has an explicit silhouette, pose, and modest underlayer target.
4. Inspect the downloaded GLB before spending on rigging.
5. Rig only if the base is worth continuing.
6. Bring the rigged base into Blender for inspection, cleanup, top fitting, and modular export.

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
- apply `top_*` slot visibility after cloning and before measuring bounds

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
- `/tmp/avatar-sad-clean-desktop.png`
- `/tmp/avatar-sad-clean-mobile.png`
- `/tmp/avatar-preview-male-modular-desktop.png`

Recent modular avatar browser verification:

- `/avatar-preview` desktop check passed outside the sandbox on 2026-05-01.
- Selected `Male modular base`, clicked `Zelená mikina`, and verified a nonblank `720 x 648` canvas with `toDataURL("image/png").length === 15658`.
- No page errors were reported in that preview check.
- A follow-up home/settings mobile check had not yet been completed at the time of this note; the first attempt did not open settings, so it only proved home loaded without page errors.

## Current Roadmap

### Done

- Generated neutral parent base via Meshy image-to-3D.
- Auto-rigged the base in Meshy.
- Generated first Meshy victory cheer animation.
- Generated first Meshy shrug animation as a negative reaction candidate.
- Published Meshy outputs under `public/avatar/meshy/`.
- Added `/avatar-preview` route for asset comparison.
- Replaced old placeholder default URL with the Meshy rigged asset.
- Added Blender inspection and clean-export scripts.
- Exported first rotation-only cleaned cheer candidate.
- Exported first rotation-only cleaned `sad_react` candidate.
- Verified cleaned `sad_react` candidate renders in `/avatar-preview` on desktop and mobile.
- Fixed preview rendering for skinned mesh visibility and responsive canvas height.
- Installed Playwright for browser verification.
- Generated, rigged, and exported the first male modular MVP GLB at `public/avatar/modular/male-base-modular.glb`.
- Added slot-ready avatar state/catalog migration.
- Added runtime top-slot mesh visibility toggling.
- Added `/avatar-preview` controls for modular male top selection.
- Added parent-facing avatar top selector in home settings.

### Next

- Review and execute [docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md).
- Complete home/settings browser verification, including the parent gate and top selection persistence.
- Verify `/avatar-preview` on mobile.
- Decide whether to visually polish the automated top shells now or keep them as an MVP slot-toggle proof before hand-fitted clothing.
- Update the implementation plan/roadmap after final verification.

### Later

- Create a stronger Blender retarget/bake workflow if direct quaternion-copy cleanup is not enough.
- Expand clothing beyond `top` into `bottom`, `shoes`, `hair`, and `accessory`.
- Add a female-coded underlayer base as a separate `baseVariant`.
- Move from one modular GLB per base toward separate clothing GLBs.
- Add per-base fitted clothing assets and compatibility metadata.
- Keep a clean head/neck boundary for future face replacement.
- Add selfie-to-generated-face decal customization through a backend/serverless Gemini endpoint.
- Add body-shape customization only after asset support exists.
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
| 2026-04-25 | First negative reaction candidate uses Meshy `Shrug` action `317`. | It is a gentle wrong-answer reaction and avoids angry, scary, or falling motions for preschool feedback. |
| 2026-05-01 | The customizable avatar should use a new scratch-built male-coded underlayer base. | The current clothed Meshy asset is one fused mesh with one material, so it cannot support real clothing slots. |
| 2026-05-01 | The clothing MVP uses one modular GLB per base and implements only the `top` slot. | This is simpler than separate runtime-loaded clothing GLBs while preserving a slot-ready state/catalog model. |
| 2026-05-01 | MVP top variants are `top_blue_tshirt` and `top_green_hoodie`. | Two tops are enough to prove slot selection, mesh visibility toggling, persistence, and preview verification. |
| 2026-05-01 | Top meshes should be created/fitted in Blender after the base exists. | Blender gives better control over mesh names, fit, skinning, and modular export than asking Meshy for final clothing in the base prompt. |
| 2026-05-01 | Face customization starts later with a generated face decal on `face_anchor`. | It is easier and safer than full head replacement or UV texture replacement, and it keeps selfie processing behind a backend. |
| 2026-05-01 | Persist `face` and `bodyShape` config now, but render only placeholder face and average body for MVP. | This avoids repeated storage migrations while not exposing controls before assets support them. |
| 2026-05-01 | Prefer Meshy image-to-3D over text-to-3D for avatar base generation. | The first text-to-3D male base was rejected visually; generated image references give stronger control over silhouette, pose, and modest underlayer styling. |
| 2026-05-01 | Reject the first textured image-to-3D male base for rigging. | It validates technically, but still contains torso/groin anatomical shading that violates the modest underlayer requirement. |
| 2026-05-01 | Use the no-texture Meshy image-to-3D male base for MVP rigging and modular export. | The no-texture output avoids texture-driven anatomical shading; Blender owns skin/clothing materials and exports the first modular GLB. |
| 2026-05-01 | Automated top shells are acceptable for proving slot toggling but not final clothing quality. | Cropped skinned body duplicates preserve rig compatibility quickly; polished clothing should be hand-fitted in Blender or delivered later as separate clothing GLBs. |
| 2026-05-01 | Increase Meshy helper API request timeout from 60 seconds to 180 seconds. | No-texture image-to-3D task creation exceeded 60 seconds twice without charging; the longer timeout let the request return a task id and complete normally. |
| 2026-05-02 | Meshy spends are pre-approved while balance stays above 1000 credits. | The user explicitly approved continued avatar-base plan spends under that threshold, but each spend and resulting balance should still be reported. |

## Related Context

- [docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md)
- [docs/superpowers/specs/2026-04-19-avatar-companion-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-04-19-avatar-companion-design.md)
- [docs/superpowers/plans/2026-04-21-avatar-staged-poc.md](/Users/svehla/playground/teo-learn/docs/superpowers/plans/2026-04-21-avatar-staged-poc.md)
- [.agents/skills/blender-avatar-pipeline/SKILL.md](/Users/svehla/playground/teo-learn/.agents/skills/blender-avatar-pipeline/SKILL.md)
- [.agents/skills/playwright-browser-verification/SKILL.md](/Users/svehla/playground/teo-learn/.agents/skills/playwright-browser-verification/SKILL.md)
