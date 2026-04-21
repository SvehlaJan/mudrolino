# Avatar Staged POC - Design Refinement

**Date:** 2026-04-21
**Status:** Approved for implementation planning
**Extends:** `docs/superpowers/specs/2026-04-19-avatar-companion-design.md`

## Overview

This refinement narrows the approved avatar companion spec into the first staged implementation plan. The POC will use the downloaded stylized character source assets, but the app will only load one web-ready runtime asset: a manually exported `.glb` that contains the base character and idle animation.

The first visible integration is an overlay on the home screen. The avatar must not be integrated into the existing home layout yet.

## Source Assets

The downloaded source package is currently outside the repo at:

- `/Users/svehla/Downloads/Basic/BaseModel.fbx`
- `/Users/svehla/Downloads/Basic/BaseModel.obj`
- `/Users/svehla/Downloads/Basic/BaseModel.mtl`
- `/Users/svehla/Downloads/Basic/Animations/BaseModel@Idle.fbx`
- `/Users/svehla/Downloads/Basic/Animations/BaseModel@Jump.fbx`
- `/Users/svehla/Downloads/Basic/Animations/BaseModel@Running.fbx`

The source package provides idle, jump, and running animations. The first POC will use idle only. Jump and running are deferred because they do not match the original wave/dance assumption and may not fit a calm companion role on preschool screens.

## Runtime Asset Boundary

The app will not load `.fbx`, `.obj`, or `.mtl` files at runtime. Those files remain source assets for manual preparation.

The runtime contract is:

- `public/avatar/base-idle.glb`
- includes the base character mesh
- includes one idle animation clip
- has normalized scale and front-facing orientation
- has stable object/material names where possible for later inspection

The implementation should compile even if `base-idle.glb` is missing, but visible screen integration should be guarded until the asset exists and has been visually checked.

## Architecture

Add a dedicated `src/avatar/` module:

- `avatarTypes.ts`
  - defines `AvatarAnimationName = 'idle'`
  - defines versioned config/progress types
- `avatarStore.ts`
  - owns avatar localStorage state in its own namespace
  - keeps unlock-state placeholders separate from game settings
- `AvatarModel.tsx`
  - loads `/avatar/base-idle.glb`
  - finds and plays the idle animation
  - hides Three.js loader and animation details from screens
- `AvatarScene.tsx`
  - owns `<Canvas>`, camera, lighting, transparent background, and sizing
- `AvatarPresenter.tsx`
  - is the only screen-facing component
  - accepts simple presentation props such as `size`, `className`, and accessible label text

Screen-level code should not know about loaders, animation mixers, clip names, or asset paths. Later asset swaps, clothing slots, and animation expansion should stay inside `src/avatar`.

## Screen Integration

Implementation is staged:

1. Add an internal avatar preview/checkpoint route or render path.
   - Used to validate scale, orientation, lighting, idle playback, and mobile framing.
2. Add the avatar to the home screen as an overlay.
   - It must not change the current header, game grid, settings button, or spacing.
   - It should be positioned responsively above the existing home UI.
   - It should use `pointer-events: none` for the POC unless interactivity is explicitly added later.
3. Consider session-complete and success overlay integration only after home overlay framing is acceptable.
   - Session-complete is the better first candidate.
   - Per-round success can keep the current emoji/praise treatment if the avatar makes the overlay crowded.

If the asset fails to load, the UI remains usable and simply shows no avatar.

## Validation Gates

### Asset Gate

Before visible product integration, confirm that `public/avatar/base-idle.glb` exists and loads in the preview. If the file is missing, the code scaffolding may land, but the home overlay should remain disabled or gracefully hidden.

### Visual Gate

After the `.glb` exists, verify the overlay on desktop and mobile:

- avatar is readable at expected sizes
- no awkward clipping
- no overlap with the settings button
- no meaningful obstruction of game cards
- idle animation plays without breaking layout

## Verification

Run:

- `npm run lint`
- `npm run build`

After the runtime asset is available, also perform browser checks:

- avatar preview route
- home screen desktop viewport
- home screen mobile viewport

## Acceptance Criteria

The staged POC is complete when:

- the avatar module compiles and is isolated under `src/avatar`
- `public/avatar/base-idle.glb` can be loaded by the preview path when present
- the idle avatar can appear as a non-layout-changing home overlay
- missing or failed avatar assets do not break the app
- avatar state is stored separately from existing game settings

The POC is still acceptable if:

- only idle animation ships
- session-complete and success overlays are deferred
- no outfit slots are visible yet
- no asset conversion automation exists
