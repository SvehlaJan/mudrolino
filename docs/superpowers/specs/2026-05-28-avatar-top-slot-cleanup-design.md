# Avatar Top-Slot Cleanup Design

**Date:** 2026-05-28
**Status:** Approved

## Background

The avatar system was originally built with "embedded mesh" clothing: `top_blue_tshirt` and
`top_green_hoodie` were baked into `male-base-modular.glb` and toggled visible/invisible at
runtime. The product decision has changed — the base is now always a naked body and all garments
are separate external GLBs. The embedded-mesh clothing items are therefore obsolete.

## Goal

Remove the embedded-mesh clothing system entirely while keeping the `top` slot alive in the type
system, ready for future external-GLB tops. The workbench shows a single "No top" option for now.

## Out of Scope

- Adding any new top garments
- Changing the shoes or accessory slots
- Any changes outside `src/avatar/`

---

## Design

### Approach

Single atomic change across all affected files. The `embeddedMeshNames` prop chain is tightly
coupled across 5 layers; partial removal leaves the codebase broken. One commit, clear intent.

### Section 1 — Type system

**`avatarTypes.ts`**
- `AvatarTopItemId` collapses to the single literal `'top_none'`.

**`avatarCatalog.ts`**
- `AvatarTopCatalogItem.source` changes from `{ kind: 'embeddedMesh'; meshName: string }` to
  `{ kind: 'none' }` — matching the existing `none` arm on shoes/accessories.
- `AVATAR_TOP_ITEMS` becomes a single-entry array: `top_none` (no swatch, `source: { kind: 'none' }`).
- `DEFAULT_AVATAR_TOP` becomes `'top_none'`.
- `getAvatarTopMeshName` helper removed (only existed to extract mesh names from embedded items).
- `isAvatarTopItemId` kept — still needed by `avatarStore.ts` for localStorage coercion.

### Section 2 — Asset resolver (`avatarAssetResolver.ts`)

- `embeddedMeshNames` computation removed (the `source.kind === 'embeddedMesh'` flatMap always
  yielded `[]` with `top_none`).
- `embeddedMeshNames` field removed from `ResolvedAvatarAssets`.
- No other logic changes.

### Section 3 — Component prop chain

`embeddedMeshNames` prop removed from all three component interfaces and their call sites:
- `AvatarPresenter` — prop removed from interface and forwarded call
- `AvatarScene` — prop removed from interface and forwarded call
- `AvatarModel` — prop, `EMBEDDED_MESH_PREFIXES` constant, `applyEmbeddedMeshVisibility` function,
  and `selectedEmbeddedMeshNames` derived memo all removed. The `DEFAULT_AVATAR_TOP` and
  `getAvatarTopMeshName` imports (now deleted) are also removed.

`AvatarModel`'s `slotSelections` prop was only used to derive `selectedEmbeddedMeshNames`. With
that memo gone, `slotSelections` is also removed from `AvatarModel`.

### Section 4 — Workbench UI (`AvatarPreviewScreen.tsx`)

- "Top" `WorkbenchSection` stays; renders the single `top_none` button (same `OptionButton`
  pattern as shoes/accessory none options).
- `embeddedMeshNames={resolvedAssets.embeddedMeshNames}` prop call-site removed.
- `AvatarTopItemId` import kept (used by URL param parsing for the `?top=` query param).

### Section 5 — Store migration

No `AVATAR_STATE_VERSION` bump required. `loadAvatarState` already coerces unknown `top` values:
`isAvatarTopItemId` returns `false` for stale `'top_blue_tshirt'` / `'top_green_hoodie'` values,
which fall back to `DEFAULT_AVATAR_TOP` (`'top_none'`) silently on next load.

### Section 6 — Asset file deletion

`public/avatar/modular/male-base-modular.glb` deleted. This file's only purpose was to hold the
`top_blue_tshirt` and `top_green_hoodie` embedded meshes. No other public files are affected.

---

## Files Changed

| File | Change |
|---|---|
| `src/avatar/avatarTypes.ts` | Collapse `AvatarTopItemId` to `'top_none'` |
| `src/avatar/avatarCatalog.ts` | Replace items + type, remove `getAvatarTopMeshName` |
| `src/avatar/avatarAssetResolver.ts` | Remove `embeddedMeshNames` field + computation |
| `src/avatar/AvatarModel.tsx` | Remove embedded-mesh logic and prop |
| `src/avatar/AvatarScene.tsx` | Remove `embeddedMeshNames` prop passthrough |
| `src/avatar/AvatarPresenter.tsx` | Remove `embeddedMeshNames` prop passthrough |
| `src/avatar/AvatarPreviewScreen.tsx` | Remove prop call-site; top section shows `top_none` |
| `src/avatar/avatarStore.ts` | Remove `DEFAULT_AVATAR_TOP` / `getAvatarTopMeshName` imports |
| `public/avatar/modular/male-base-modular.glb` | **Deleted** |
