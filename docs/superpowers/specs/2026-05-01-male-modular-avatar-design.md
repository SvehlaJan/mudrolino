# Male Modular Avatar Design

Date: 2026-05-01

## Goal

Create the next avatar foundation for `teo-learn`: a scratch-built male-coded parent/caregiver avatar that supports simple clothing customization now and future face/body customization later.

The current Meshy avatar proved the React Three Fiber runtime, preview route, and Blender animation cleanup workflow. It is not a good clothing-customization base because it is one fused clothed mesh with one material. The next asset should be generated as a modest underlayer base and then extended into a modular GLB.

## Product Direction

The first canonical customizable base is male-coded and should read as a warm parent/caregiver, not a teacher, mascot, or realistic adult.

Visual direction:

- semi-stylized friendly adult
- warm, calm, supportive parent/caregiver presence
- soft average adult proportions
- skin-toned smooth mannequin-like underlayer
- modest and non-anatomical; no explicit body detail
- simple placeholder face
- head prepared for future generated face decal
- neutral front-facing pose, arms slightly away from torso
- matte preschool-safe 3D style
- no fixed clothing, no accessories, no busy detail, no photorealism

## MVP Scope

The MVP implements only the `top` clothing slot, while the app data model and catalog should be ready for additional slots.

In scope:

- generate a new male-coded underlayer base from scratch
- rig or retarget it to a stable humanoid armature
- create/fix two top variants in Blender after the base exists
- export one modular GLB for the male base
- update runtime state/catalog to represent slot selections
- render exactly one selected top at a time
- persist future-ready `face` and `bodyShape` fields
- prepare a face anchor for later generated face decals

Out of scope for this MVP:

- female-coded base
- separate clothing GLBs
- bottom/shoes/hair/accessory slots
- selfie capture and Gemini processing
- UV-based face texture replacement
- visible body-shape sliders or morph-target rendering
- cloud sync or account storage

## Asset Contract

The MVP asset format is one modular GLB per base. Separate clothing GLBs are the preferred long-term architecture, but should wait until the first modular base works end to end.

Target runtime asset:

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

- `body_underlayer_male`, `head`, and `face_anchor` are always present.
- Exactly one `top_*` mesh is visible at a time.
- Default top is `top_blue_tshirt`.
- `top_green_hoodie` is the first alternate.
- Future slots should follow the same naming pattern: `bottom_*`, `shoes_*`, `hair_*`, `accessory_*`.

Armature requirements:

- Preserve stable named humanoid bones where possible: `Hips`, spine, neck/head, arms, hands, legs, feet.
- Keep bone names compatible with the existing animation cleanup pipeline if feasible.
- Base and clothing meshes should be skinned to the same armature.
- Feedback animations should be reusable across body and clothing meshes without runtime-specific bone remapping.

Head and face requirements:

- Include a named `face_anchor`.
- `face_anchor` should be a small prepared face patch mesh from day one, with a neutral placeholder material.
- The placeholder face should look acceptable without generated face customization.
- The head should avoid topology or material choices that block later face decal placement.

## Asset Pipeline

Use the repo-local Meshy helper for Meshy work. Follow the `meshy-3d-generation` skill:

- load `MESHY_API_KEY` only from the shell environment or repo-local `.env`
- keep outputs under `meshy_output/`
- never read or write shell profile files
- summarize expected credits before any spending command
- wait for explicit approval before passing `--confirm-spend`

Proposed sequence:

1. Use Meshy to generate the male-coded parent/caregiver underlayer base from scratch.
2. Inspect the downloaded GLB for mesh/material count, visual quality, and suitability as a base.
3. Rig the base through Meshy if the generated asset is worth continuing.
4. Inspect the rigged GLB in Blender with `tools/blender/inspect_avatar_glb.py`.
5. Validate or retarget animations using the existing Blender cleanup workflow.
6. Create and fit `top_blue_tshirt` and `top_green_hoodie` in Blender after the base exists.
7. Export `male-base-modular.glb` with stable object names.
8. Verify it in `/avatar-preview` on desktop and mobile.

The top meshes should not be generated as part of the first Meshy base prompt. They should be created/fitted in Blender after the base exists so mesh names, fit, and slot behavior are controlled.

## Runtime Data Model

The current state shape uses `modelId`, `outfitId`, and `animation`. Replace it with a slot-ready configuration and migrate old state to the new default.

Recommended TypeScript shape:

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

MVP default:

```ts
{
  baseVariant: 'male',
  animation: 'idle',
  slotSelections: {
    top: 'top_blue_tshirt',
  },
  face: {
    mode: 'placeholder',
    assetUrl: null,
  },
  bodyShape: {
    scale: 1,
    build: 'average',
    height: 'average',
  },
}
```

`face` and `bodyShape` are persisted now so storage migration has a stable place to grow. The MVP should render only the placeholder face. It should not visually apply `build` or `height` until the base/clothing assets have morph targets or fitted variants. `scale` can remain persisted but unused unless a later preview/debug task explicitly enables it.

## Avatar Catalog

Add a small catalog layer so UI and renderer code do not hard-code mesh names in multiple places.

```ts
interface AvatarCatalogItem {
  id: string;
  slot: AvatarSlot;
  label: string;
  meshName: string;
  compatibleBaseVariants: AvatarBaseVariant[];
}
```

MVP catalog items:

```ts
[
  {
    id: 'top_blue_tshirt',
    slot: 'top',
    label: 'Modré tričko',
    meshName: 'top_blue_tshirt',
    compatibleBaseVariants: ['male'],
  },
  {
    id: 'top_green_hoodie',
    slot: 'top',
    label: 'Zelená mikina',
    meshName: 'top_green_hoodie',
    compatibleBaseVariants: ['male'],
  },
]
```

Future catalog shape should allow one logical clothing item to map to separate fitted GLBs per base variant.

## Renderer Behavior

`AvatarModel` should load the modular GLB, clone it as it does today, and apply slot visibility after cloning.

For MVP:

- find all objects whose names start with `top_`
- make only the selected `slotSelections.top` mesh visible
- keep body, head, armature, and face anchor visible
- preserve the existing model normalization and frustum-culling fixes
- keep animation playback based on named runtime states: `idle`, `success`, `failure`

If the modular GLB contains action clips directly, the renderer can use them from the model. If cleaned animation GLBs remain separate, the renderer can continue using the existing `modelUrl` plus `animationUrl` pattern as long as the armature is compatible.

The first modular GLB should contain only MVP meshes: body underlayer, head, face patch, and top variants. Do not add placeholder meshes for future slots until those slots are implemented.

## Face Customization Backlog

The first face customization should use a generated face decal, not full head replacement.

Future flow:

1. Parent opens face customization behind the parent gate.
2. User captures or uploads a selfie.
3. Browser sends the image to a backend or serverless endpoint.
4. Backend calls Gemini image generation/editing to transform the selfie into a friendly stylized face PNG.
5. Backend returns the generated image.
6. App stores the generated stylized face asset, not the raw selfie by default.
7. Runtime applies that PNG as a decal or texture on `face_anchor`.

Rules:

- Do not expose Gemini API keys in browser code.
- Do not store raw selfies by default.
- Provide reset/delete controls for generated face customization.
- Treat UV-based head texture replacement as a later quality upgrade after the decal approach is validated.

## Body Shape Backlog

Persist `bodyShape` now, but do not make it visible in the MVP.

Backlog levels:

1. Uniform scale for preview/debug only.
2. Discrete fitted base variants if needed.
3. Morph targets for `slim`, `sturdy`, `short`, and `tall`.

Morph targets are the best long-term shape system, but clothing assets need compatible morphs or fitted variants. Do not expose build/height controls until clipping and animation behavior are acceptable.

## Verification

Minimum verification after asset/runtime changes:

- `npm run lint`
- `npm run build`
- `/avatar-preview` loads the modular male base
- selected asset reports available
- exactly one top mesh is visible for each top selection
- animation clips still play without pose distortion or invisible canvas
- desktop and mobile screenshots show the customized avatar
- missing or invalid stored top selection falls back to `top_blue_tshirt`

## Implementation Follow-Up Checks

- After inspecting the generated/rigged male base, decide whether the cleaned current cheer/sad animations can be reused directly or need retargeted exports.
- Put the MVP customization UI inside the parent-facing Settings flow rather than adding a dedicated avatar route.
