# Avatar Preview Workbench Design

Date: 2026-05-02

## Goal

Rework `/avatar-preview` from a historical Meshy asset gallery into the main development and verification workbench for the modular avatar system.

The page should support all planned avatar customization surfaces, while only fully implementing the currently available male base and `top` clothing slot. Old fixed-avatar POC assets and animation comparisons can be removed from the preview.

## Scope

In scope:

- Show the current modular male avatar as the primary preview asset.
- Remove old Meshy asset and animation choices from `/avatar-preview`.
- Expose slot-ready controls for `top`, `bottom`, `shoes`, `hair`, and `accessory`.
- Fully wire the `top` slot to the existing `top_blue_tshirt` and `top_green_hoodie` meshes.
- Show planned/disabled controls for future slots so the page documents the intended customization model.
- Expose face customization state with placeholder/generated-decal readiness, without implementing selfie upload or backend processing.
- Expose body-shape controls for `scale`, `build`, and `height`; wire local preview state now, with visual behavior limited to safe model scaling unless asset support exists.
- Expose runtime-facing animation modes: `idle`, `success`, and `failure`.
- Add developer diagnostics for asset URL, selected config, local storage shape, mesh/slot names, asset load status, and animation names.
- Provide reset controls for preview state and persisted avatar state.
- Update default runtime avatar URL to the modular male GLB.
- Remove app-facing dependency on old Meshy public GLBs if no current runtime path needs them.

Out of scope:

- Creating new clothing assets.
- Creating the female-coded base.
- Implementing selfie capture, Gemini processing, storage upload, or generated face texture application.
- Retargeting or creating new animations.
- Building production parent customization beyond what already exists in settings.

## Architecture

`/avatar-preview` becomes a workbench around the same runtime components used by the app:

- `AvatarPreviewScreen` owns preview-only UI state and state reset actions.
- `AvatarPresenter`, `AvatarScene`, and `AvatarModel` continue to render the avatar.
- `avatarCatalog.ts` remains the source of clothing item metadata.
- `avatarStore.ts` remains the source of persisted avatar config shape and migration behavior.
- `avatarConstants.ts` points the runtime default model URL at `/avatar/modular/male-base-modular.glb`.

The preview should not introduce a second renderer. It should exercise the real renderer so browser screenshots catch runtime regressions.

## UI Design

Use a two-panel workbench:

- Left panel: compact controls grouped by customization area.
- Right panel: large live avatar canvas with a diagnostics strip below it.

Control groups:

- Base: `male` active, `female` shown disabled/planned.
- Animation: `idle`, `success`, `failure`.
- Clothing: `top` active; future slots visible as planned.
- Face: placeholder/generated decal state shown, with generated decal disabled until the backend exists.
- Body shape: scale slider and build/height segmented choices.
- State: persist current config, reset preview, reset persisted avatar.

The page is a developer tool, so labels should be direct and operational. It should avoid historical asset descriptions and old Meshy comparison copy.

## Data Flow

Initial preview state loads from `loadAvatarState()` so the workbench reflects persisted app state.

Changing controls updates local preview state immediately. A separate persist action writes the preview state through `saveAvatarState()`. Reset actions recreate the default avatar state from `createDefaultAvatarState()`.

The renderer receives:

- `modelUrl: AVATAR_MODULAR_MALE_MODEL_URL`
- `slotSelections`
- `animationName`
- `bodyShape`
- future `face` config once decal rendering exists

For this implementation, body shape may affect uniform scale only. Build and height are kept in state and diagnostics so future asset support has a stable contract.

## Asset Cleanup

The old Meshy files under `public/avatar/meshy/` were useful for the POC, but the preview should no longer select them.

If no production code references those files after `AVATAR_MODEL_URL` switches to the modular male base, remove the old app-facing GLBs from `public/avatar/meshy/`. Source Meshy outputs and accepted modular generation artifacts remain in `meshy_output/` for provenance.

## Error Handling

- If the modular GLB is unavailable, show a clear missing-asset state instead of a blank page.
- If WebGL fails, keep relying on `AvatarRuntimeBoundary`.
- If local storage fails, keep the preview usable with in-memory state and surface the current in-memory config in diagnostics.
- Disabled future controls should communicate their planned status without implying the feature is broken.

## Verification

Run:

- `npm run lint`
- `npm run build`
- Browser verification on `/avatar-preview` desktop and mobile.

Browser checks should confirm:

- the modular male avatar renders nonblank
- `top_blue_tshirt` and `top_green_hoodie` can be toggled
- old Meshy asset choices are gone
- planned future slots are visible but disabled
- body scale control changes the rendered model without breaking framing
- persist/reset controls update local storage correctly

