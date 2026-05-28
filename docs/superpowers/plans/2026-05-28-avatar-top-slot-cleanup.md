# Avatar Top-Slot Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the obsolete embedded-mesh clothing system (`top_blue_tshirt`, `top_green_hoodie`) and replace it with a single `top_none` option, keeping the `top` slot alive for future external-GLB tops.

**Architecture:** All changes are inside `src/avatar/`. Tasks 1 and 2 are tightly coupled — intermediate lint failures are expected between them. Run `npm run lint` only after Task 2 is complete, then commit Tasks 1 + 2 together. Task 3 (GLB deletion) is independent.

**Tech Stack:** TypeScript, React, Vite — verify with `npm run lint` (tsc --noEmit).

**Spec:** `docs/superpowers/specs/2026-05-28-avatar-top-slot-cleanup-design.md`

---

## File Map

| File | Change |
|---|---|
| `src/avatar/avatarTypes.ts` | Collapse `AvatarTopItemId` union to `'top_none'` |
| `src/avatar/avatarCatalog.ts` | Update source type, replace items array, change DEFAULT, delete helper |
| `src/avatar/avatarAssetResolver.ts` | Remove `embeddedMeshNames` field from interface + computation |
| `src/avatar/AvatarModel.tsx` | Remove embedded-mesh logic + `slotSelections`/`embeddedMeshNames` props |
| `src/avatar/AvatarScene.tsx` | Remove `slotSelections`/`embeddedMeshNames` prop passthrough |
| `src/avatar/AvatarPresenter.tsx` | Remove `slotSelections`/`embeddedMeshNames` prop passthrough |
| `src/avatar/AvatarPreviewScreen.tsx` | Remove `embeddedMeshNames` call-site; top section now shows `top_none` only |
| `src/avatar/HomeAvatarOverlay.tsx` | Remove `slotSelections` prop (was only used for embedded-mesh toggling) |
| `public/avatar/modular/male-base-modular.glb` | **Delete** |

---

## Task 1: Collapse type system and catalog

> ⚠️ Do NOT run `npm run lint` after this task — `AvatarModel.tsx` still imports `getAvatarTopMeshName`, which is deleted here. Proceed directly to Task 2. There is no commit after Task 1.

**Files:**
- Modify: `src/avatar/avatarTypes.ts`
- Modify: `src/avatar/avatarCatalog.ts`

- [ ] **Step 1: Update `AvatarTopItemId` in `avatarTypes.ts`**

  Replace line 6:
  ```typescript
  // Before
  export type AvatarTopItemId = 'top_blue_tshirt' | 'top_green_hoodie';
  // After
  export type AvatarTopItemId = 'top_none';
  ```

- [ ] **Step 2: Update `AvatarTopCatalogItem` source type in `avatarCatalog.ts`**

  Replace lines 19–21:
  ```typescript
  // Before
  export type AvatarTopCatalogItem = AvatarCatalogItemBase<AvatarTopItemId, 'top'> & {
    source: { kind: 'embeddedMesh'; meshName: string };
  };
  // After
  export type AvatarTopCatalogItem = AvatarCatalogItemBase<AvatarTopItemId, 'top'> & {
    source: { kind: 'none' };
  };
  ```

- [ ] **Step 3: Update `DEFAULT_AVATAR_TOP` in `avatarCatalog.ts`**

  Replace line 37:
  ```typescript
  // Before
  export const DEFAULT_AVATAR_TOP: AvatarTopItemId = 'top_blue_tshirt';
  // After
  export const DEFAULT_AVATAR_TOP: AvatarTopItemId = 'top_none';
  ```

- [ ] **Step 4: Replace `AVATAR_TOP_ITEMS` in `avatarCatalog.ts`**

  Replace lines 41–58 (the full array):
  ```typescript
  export const AVATAR_TOP_ITEMS: AvatarTopCatalogItem[] = [
    {
      id: 'top_none',
      slot: 'top',
      label: 'No top',
      compatibleBaseVariants: ['male'],
      source: { kind: 'none' },
    },
  ];
  ```

- [ ] **Step 5: Delete `getAvatarTopMeshName` from `avatarCatalog.ts`**

  Remove lines 122–125 entirely:
  ```typescript
  // DELETE this entire function
  export function getAvatarTopMeshName(itemId: AvatarTopItemId): string {
    const source = getAvatarCatalogItem(itemId)?.source;
    return source?.kind === 'embeddedMesh' ? source.meshName : DEFAULT_AVATAR_TOP;
  }
  ```

---

## Task 2: Strip embedded-mesh pipeline from resolver and components

> Resolves the lint breakage introduced in Task 1. Run `npm run lint` at the end of this task and confirm it passes, then commit all Task 1 + Task 2 changes together.

**Files:**
- Modify: `src/avatar/avatarAssetResolver.ts`
- Modify: `src/avatar/AvatarModel.tsx`
- Modify: `src/avatar/AvatarScene.tsx`
- Modify: `src/avatar/AvatarPresenter.tsx`
- Modify: `src/avatar/AvatarPreviewScreen.tsx`
- Modify: `src/avatar/HomeAvatarOverlay.tsx`

### avatarAssetResolver.ts

- [ ] **Step 6: Remove `embeddedMeshNames` from `ResolvedAvatarAssets`**

  In the `ResolvedAvatarAssets` interface (around line 27), delete:
  ```typescript
  embeddedMeshNames: string[];  // DELETE this line
  ```

- [ ] **Step 7: Remove `embeddedMeshNames` computation**

  Delete these 3 lines (around line 67):
  ```typescript
  const embeddedMeshNames = selectedItems.flatMap((item) =>
    item.source.kind === 'embeddedMesh' ? [item.source.meshName] : [],
  );
  ```

- [ ] **Step 8: Remove `embeddedMeshNames` from the return object**

  In the `return { ... }` block, delete:
  ```typescript
  embeddedMeshNames,  // DELETE this line
  ```

### AvatarModel.tsx

- [ ] **Step 9: Remove catalog import**

  Delete the entire line:
  ```typescript
  import { DEFAULT_AVATAR_TOP, getAvatarTopMeshName } from './avatarCatalog';
  ```

- [ ] **Step 10: Remove `AvatarSlotSelections` from types import**

  Change line:
  ```typescript
  // Before
  import { AvatarBodyShapeConfig, AvatarGarmentFit, AvatarSceneData, AvatarSlotSelections } from './avatarTypes';
  // After
  import { AvatarBodyShapeConfig, AvatarGarmentFit, AvatarSceneData } from './avatarTypes';
  ```

- [ ] **Step 11: Delete `EMBEDDED_MESH_PREFIXES` constant**

  Delete line 27:
  ```typescript
  const EMBEDDED_MESH_PREFIXES = ['top_'];  // DELETE
  ```

- [ ] **Step 12: Delete `applyEmbeddedMeshVisibility` function**

  Delete lines 68–74:
  ```typescript
  // DELETE this entire function
  function applyEmbeddedMeshVisibility(scene: Object3D, selectedMeshNames: string[]) {
    const selectedMeshNameSet = new Set(selectedMeshNames);
    scene.traverse((object) => {
      if (!EMBEDDED_MESH_PREFIXES.some((prefix) => object.name.startsWith(prefix))) return;
      object.visible = selectedMeshNameSet.has(object.name);
    });
  }
  ```

- [ ] **Step 13: Remove `slotSelections` and `embeddedMeshNames` from `AvatarModelProps`**

  In the interface, delete:
  ```typescript
  slotSelections?: AvatarSlotSelections;  // DELETE
  embeddedMeshNames?: string[];           // DELETE
  ```

- [ ] **Step 14: Remove params from `AvatarModel` function destructuring**

  In the function signature destructuring, delete:
  ```typescript
  slotSelections,    // DELETE
  embeddedMeshNames, // DELETE
  ```

- [ ] **Step 15: Delete `selectedEmbeddedMeshNames` memo**

  Delete the entire useMemo block (around lines 216–221):
  ```typescript
  // DELETE this entire block
  const selectedEmbeddedMeshNames = useMemo(() => {
    if (embeddedMeshNames) return embeddedMeshNames;
    const selectedTop = slotSelections?.top ?? DEFAULT_AVATAR_TOP;
    return [getAvatarTopMeshName(selectedTop)];
  }, [embeddedMeshNames, slotSelections]);
  ```

- [ ] **Step 16: Remove `applyEmbeddedMeshVisibility` call and update memo deps**

  In the large `useMemo` for `{ scene, garmentScenes, ... }`, delete the call:
  ```typescript
  applyEmbeddedMeshVisibility(clonedScene, selectedEmbeddedMeshNames);  // DELETE
  ```

  Update the memo's dependency array — remove `selectedEmbeddedMeshNames`:
  ```typescript
  // Before
  }, [bodyShape, externalAssets, externalGltfs, gltf.scene, selectedEmbeddedMeshNames]);
  // After
  }, [bodyShape, externalAssets, externalGltfs, gltf.scene]);
  ```

### AvatarScene.tsx

- [ ] **Step 17: Remove `slotSelections` and `embeddedMeshNames` from `AvatarSceneProps`**

  In the interface, delete:
  ```typescript
  slotSelections?: AvatarSlotSelections;  // DELETE
  embeddedMeshNames?: string[];           // DELETE
  ```

- [ ] **Step 18: Remove from `AvatarScene` function destructuring and `AvatarModel` JSX**

  Delete from the destructuring:
  ```typescript
  slotSelections,    // DELETE
  embeddedMeshNames, // DELETE
  ```

  Delete from the `<AvatarModel>` JSX:
  ```typescript
  slotSelections={slotSelections}       // DELETE
  embeddedMeshNames={embeddedMeshNames} // DELETE
  ```

- [ ] **Step 19: Remove `AvatarSlotSelections` from the types import in `AvatarScene.tsx`**

  ```typescript
  // Before
  import { AvatarBodyShapeConfig, AvatarSceneData, AvatarSlotSelections } from './avatarTypes';
  // After
  import { AvatarBodyShapeConfig, AvatarSceneData } from './avatarTypes';
  ```

  (Check the actual import line; remove only `AvatarSlotSelections`.)

### AvatarPresenter.tsx

- [ ] **Step 20: Remove `slotSelections` and `embeddedMeshNames` from `AvatarPresenterProps`**

  In the top-level interface, delete:
  ```typescript
  slotSelections?: AvatarSlotSelections;  // DELETE
  embeddedMeshNames?: string[];           // DELETE
  ```

- [ ] **Step 21: Remove from all three internal components**

  `AvatarPresenter`, `CheckedAvatarPresenter`, and `AvatarPresenterContent` each destructure and forward these props. For each:
  - Remove `slotSelections,` and `embeddedMeshNames,` from the destructuring
  - Remove `slotSelections={slotSelections}` and `embeddedMeshNames={embeddedMeshNames}` from the JSX

  Also remove `AvatarSlotSelections` from the types import if it is now unused.

### AvatarPreviewScreen.tsx

- [ ] **Step 22: Remove `embeddedMeshNames` from the `AvatarPresenter` call**

  Around line 486, delete:
  ```typescript
  embeddedMeshNames={resolvedAssets.embeddedMeshNames}  // DELETE
  ```

### HomeAvatarOverlay.tsx

- [ ] **Step 23: Remove `slotSelections` prop and `useAvatarState` from `HomeAvatarOverlay.tsx`**

  `avatarState` was only used to read `slotSelections` — remove it entirely. The full file becomes:

  ```typescript
  import { AvatarPresenter } from './AvatarPresenter';
  import { AVATAR_MODULAR_MALE_MODEL_URL } from './avatarConstants';

  export function HomeAvatarOverlay() {
    return (
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-10 m-auto h-[min(36svh,280px)] min-h-[170px] w-[min(36vw,280px)] min-w-[170px] translate-y-[7svh] sm:h-[min(42svh,340px)] sm:w-[min(30vw,340px)] lg:h-[min(46svh,380px)] lg:w-[min(26vw,380px)]"
      >
        <AvatarPresenter
          className="h-full w-full"
          modelUrl={AVATAR_MODULAR_MALE_MODEL_URL}
        />
      </div>
    );
  }
  ```

### Verify and commit

- [ ] **Step 24: Run lint**

  ```bash
  npm run lint
  ```

  Expected: no errors. If errors appear, fix before committing.

- [ ] **Step 25: Commit Tasks 1 + 2**

  ```bash
  git add src/avatar/avatarTypes.ts \
          src/avatar/avatarCatalog.ts \
          src/avatar/avatarAssetResolver.ts \
          src/avatar/AvatarModel.tsx \
          src/avatar/AvatarScene.tsx \
          src/avatar/AvatarPresenter.tsx \
          src/avatar/AvatarPreviewScreen.tsx \
          src/avatar/HomeAvatarOverlay.tsx
  git commit -m "refactor(avatar): remove embedded-mesh clothing system, collapse top slot to top_none"
  ```

---

## Task 3: Delete the modular GLB

> Independent of Tasks 1 + 2. Can be done in any order but commit separately.

**Files:**
- Delete: `public/avatar/modular/male-base-modular.glb`

- [ ] **Step 26: Delete the file**

  ```bash
  rm public/avatar/modular/male-base-modular.glb
  ```

- [ ] **Step 27: Commit**

  ```bash
  git add -u public/avatar/modular/male-base-modular.glb
  git commit -m "chore(assets): delete male-base-modular.glb (embedded clothing removed)"
  ```
