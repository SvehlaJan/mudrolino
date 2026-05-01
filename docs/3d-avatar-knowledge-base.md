# 3D Avatar Knowledge Base

Date: 2026-05-01

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
- `61` total

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
3. Generate the male-coded underlayer base from scratch.
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

### Next

- Review and execute [docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md).
- Generate a new male-coded parent/caregiver underlayer base from scratch with Meshy.
- Inspect the generated GLB before spending credits on rigging.
- Rig the base only if the generated asset is worth continuing.
- Fit `top_blue_tshirt` and `top_green_hoodie` in Blender after the base exists.
- Export `male-base-modular.glb` with stable mesh names.
- Update runtime state/catalog from `outfitId` to slot selections.
- Update `AvatarModel` to toggle `top_*` mesh visibility.
- Add parent-facing top selection in Settings.
- Verify `/avatar-preview` on desktop and mobile.

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

## Related Context

- [docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md)
- [docs/superpowers/specs/2026-04-19-avatar-companion-design.md](/Users/svehla/playground/teo-learn/docs/superpowers/specs/2026-04-19-avatar-companion-design.md)
- [docs/superpowers/plans/2026-04-21-avatar-staged-poc.md](/Users/svehla/playground/teo-learn/docs/superpowers/plans/2026-04-21-avatar-staged-poc.md)
- [.agents/skills/blender-avatar-pipeline/SKILL.md](/Users/svehla/playground/teo-learn/.agents/skills/blender-avatar-pipeline/SKILL.md)
- [.agents/skills/playwright-browser-verification/SKILL.md](/Users/svehla/playground/teo-learn/.agents/skills/playwright-browser-verification/SKILL.md)
