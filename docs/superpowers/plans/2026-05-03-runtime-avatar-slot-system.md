# Runtime Avatar Slot System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace baked combined avatar preview GLBs with a runtime slot system that loads the base avatar and selected garment GLBs as separate assets.

**Architecture:** Keep `AvatarPresenter -> AvatarScene -> AvatarModel` as the public runtime path, but move asset selection out of URL switching and into a catalog-driven resolver. The renderer should mount the base GLB plus selected external slot GLBs under one normalized root group; embedded base meshes such as the prototype `top_*` meshes still use visibility toggles until top garments are exported as separate GLBs. Shoe animation remains available in `/avatar-preview` as a debug path even when a selected shoe is not production-ready, so walking/running defects can be inspected against the real runtime slot loader.

**Tech Stack:** React, TypeScript, React Three Fiber, drei `useGLTF`, Three.js `SkeletonUtils.clone`, Vite public GLB assets, browser localStorage.

---

## File Structure

- Modify `src/avatar/avatarTypes.ts`: add shoe slot IDs and richer slot selection types.
- Modify `src/avatar/avatarCatalog.ts`: replace top-only catalog helpers with slot-aware item metadata for embedded and external garment assets.
- Add `src/avatar/avatarAssetResolver.ts`: convert `AvatarConfig` into base URL, animation URL, embedded mesh selections, external garment URLs, and animation compatibility.
- Modify `src/avatar/avatarStore.ts`: migrate missing/old shoe selections to `shoes_none`.
- Modify `src/avatar/AvatarModel.tsx`: load and render selected external garment GLBs alongside the base GLB under one normalized transform.
- Modify `src/avatar/AvatarScene.tsx`: pass resolved runtime assets instead of only base URL and top selections.
- Modify `src/avatar/AvatarPresenter.tsx`: check availability for all required GLB URLs and pass runtime assets through.
- Modify `src/avatar/useAvatarAssetAvailability.ts`: add a multi-asset availability hook.
- Modify `src/avatar/AvatarPreviewScreen.tsx`: remove baked shoe preview URL switching and drive shoes through persisted slot state.
- Modify `src/avatar/AvatarCustomizationSettings.tsx`: expose shoes as a real slot in settings, with animation limitations hidden from parent settings.
- Modify `src/avatar/avatarConstants.ts`: remove baked combined preview constants after callers are migrated.
- Modify `docs/avatar-clothing-pipeline.md`: record the runtime slot contract and retire baked previews as workbench shortcuts.
- Modify `ROADMAP.md`: mark the separate-GLB runtime move as in progress/done and keep animation-ready shoes as separate future work.

---

### Task 1: Slot Catalog and State Contract

**Files:**
- Modify: `src/avatar/avatarTypes.ts`
- Modify: `src/avatar/avatarCatalog.ts`
- Modify: `src/avatar/avatarStore.ts`

- [ ] **Step 1: Extend avatar slot types**

Update `src/avatar/avatarTypes.ts` so shoes are represented in persisted state:

```ts
export type AvatarBaseVariant = 'male';
export type AvatarSlot = 'top' | 'bottom' | 'shoes' | 'hair' | 'accessory';
export type AvatarAnimationName = 'idle' | 'walk' | 'run' | 'success' | 'failure';
export type AvatarTopItemId = 'top_blue_tshirt' | 'top_green_hoodie';
export type AvatarShoesItemId = 'shoes_none' | 'shoes_blue_sneakers_v1';

export interface AvatarSlotSelections {
  top: AvatarTopItemId;
  shoes: AvatarShoesItemId;
}
```

- [ ] **Step 2: Replace top-only catalog with slot-aware catalog metadata**

Update `src/avatar/avatarCatalog.ts` to describe embedded top meshes and external shoe GLBs:

```ts
import {
  AvatarBaseVariant,
  AvatarShoesItemId,
  AvatarSlot,
  AvatarTopItemId,
} from './avatarTypes';

export type AvatarCatalogItemId = AvatarTopItemId | AvatarShoesItemId;

export interface AvatarCatalogItem {
  id: AvatarCatalogItemId;
  slot: AvatarSlot;
  label: string;
  swatchClassName?: string;
  compatibleBaseVariants: AvatarBaseVariant[];
  source:
    | { kind: 'embeddedMesh'; meshName: string }
    | { kind: 'externalGltf'; url: string; animationReady: boolean }
    | { kind: 'none' };
}

export const DEFAULT_AVATAR_TOP: AvatarTopItemId = 'top_blue_tshirt';
export const DEFAULT_AVATAR_SHOES: AvatarShoesItemId = 'shoes_none';

export const AVATAR_TOP_ITEMS: AvatarCatalogItem[] = [
  {
    id: 'top_blue_tshirt',
    slot: 'top',
    label: 'Modré tričko',
    swatchClassName: 'bg-accent-blue',
    compatibleBaseVariants: ['male'],
    source: { kind: 'embeddedMesh', meshName: 'top_blue_tshirt' },
  },
  {
    id: 'top_green_hoodie',
    slot: 'top',
    label: 'Zelená mikina',
    swatchClassName: 'bg-success',
    compatibleBaseVariants: ['male'],
    source: { kind: 'embeddedMesh', meshName: 'top_green_hoodie' },
  },
];

export const AVATAR_SHOES_ITEMS: AvatarCatalogItem[] = [
  {
    id: 'shoes_none',
    slot: 'shoes',
    label: 'Bare feet',
    compatibleBaseVariants: ['male'],
    source: { kind: 'none' },
  },
  {
    id: 'shoes_blue_sneakers_v1',
    slot: 'shoes',
    label: 'Blue sneakers',
    swatchClassName: 'bg-accent-blue',
    compatibleBaseVariants: ['male'],
    source: {
      kind: 'externalGltf',
      url: '/avatar/garments/shoes_blue_sneakers_v1.glb',
      animationReady: false,
    },
  },
];
```

Add helpers in the same file:

```ts
export function isAvatarTopItemId(value: unknown): value is AvatarTopItemId {
  return AVATAR_TOP_ITEMS.some((item) => item.id === value);
}

export function isAvatarShoesItemId(value: unknown): value is AvatarShoesItemId {
  return AVATAR_SHOES_ITEMS.some((item) => item.id === value);
}

export function getAvatarCatalogItem(id: AvatarCatalogItemId): AvatarCatalogItem | undefined {
  return [...AVATAR_TOP_ITEMS, ...AVATAR_SHOES_ITEMS].find((item) => item.id === id);
}
```

- [ ] **Step 3: Migrate persisted state**

Update `src/avatar/avatarStore.ts` to default and load the new shoes slot:

```ts
slotSelections: {
  top: DEFAULT_AVATAR_TOP,
  shoes: DEFAULT_AVATAR_SHOES,
},
```

In `loadAvatarState()`, coerce shoes independently:

```ts
slotSelections: {
  top: isAvatarTopItemId(slotSelections?.top) ? slotSelections.top : DEFAULT_AVATAR_TOP,
  shoes: isAvatarShoesItemId(slotSelections?.shoes)
    ? slotSelections.shoes
    : DEFAULT_AVATAR_SHOES,
},
```

- [ ] **Step 4: Run typecheck and fix direct compile errors**

Run: `npm run lint`

Expected: TypeScript fails only where callers still assume `slotSelections` contains `top` only. Fix only direct type errors needed to complete this task; later tasks handle UI behavior.

- [ ] **Step 5: Commit**

```bash
git add src/avatar/avatarTypes.ts src/avatar/avatarCatalog.ts src/avatar/avatarStore.ts
git commit -m "feat: add avatar shoe slot catalog"
```

### Task 2: Runtime Asset Resolver

**Files:**
- Add: `src/avatar/avatarAssetResolver.ts`
- Modify: `src/avatar/avatarConstants.ts`

- [ ] **Step 1: Keep only canonical base and animation constants**

In `src/avatar/avatarConstants.ts`, keep canonical base/animation constants and the source shoe constant:

```ts
export const AVATAR_MODULAR_MALE_MODEL_URL = '/avatar/modular/male-base-plain.glb';
export const AVATAR_MODULAR_MALE_WALKING_MODEL_URL =
  '/avatar/modular/male-base-plain-walking.glb';
export const AVATAR_MODULAR_MALE_RUNNING_MODEL_URL =
  '/avatar/modular/male-base-plain-running.glb';
export const AVATAR_BLUE_SNEAKERS_MODEL_URL = '/avatar/garments/shoes_blue_sneakers_v1.glb';
export const AVATAR_MODEL_URL = AVATAR_MODULAR_MALE_MODEL_URL;
```

Leave baked preview constants in place until Task 5 removes their final callers.

- [ ] **Step 2: Add resolved runtime asset types**

Create `src/avatar/avatarAssetResolver.ts`:

```ts
import {
  AVATAR_MODULAR_MALE_MODEL_URL,
  AVATAR_MODULAR_MALE_RUNNING_MODEL_URL,
  AVATAR_MODULAR_MALE_WALKING_MODEL_URL,
} from './avatarConstants';
import { getAvatarCatalogItem } from './avatarCatalog';
import { AvatarAnimationName, AvatarConfig, AvatarSlot } from './avatarTypes';

export interface AvatarExternalAsset {
  id: string;
  slot: AvatarSlot;
  url: string;
  animationReady: boolean;
  animationWarning?: string;
}

export interface ResolvedAvatarAssets {
  baseUrl: string;
  animationUrl?: string;
  animationName: string | null;
  preserveHipsPosition: boolean;
  embeddedMeshNames: string[];
  externalAssets: AvatarExternalAsset[];
  requiredUrls: string[];
  animationWarnings: string[];
}

function getAnimationSource(animation: AvatarAnimationName) {
  if (animation === 'walk') {
    return {
      animationUrl: AVATAR_MODULAR_MALE_WALKING_MODEL_URL,
      animationName: 'walk_test',
      preserveHipsPosition: true,
    };
  }

  if (animation === 'run') {
    return {
      animationUrl: AVATAR_MODULAR_MALE_RUNNING_MODEL_URL,
      animationName: 'run_test',
      preserveHipsPosition: true,
    };
  }

  return {
    animationUrl: undefined,
    animationName: animation,
    preserveHipsPosition: false,
  };
}

export function resolveAvatarAssets(config: AvatarConfig): ResolvedAvatarAssets {
  const selectedItems = [
    getAvatarCatalogItem(config.slotSelections.top),
    getAvatarCatalogItem(config.slotSelections.shoes),
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  const embeddedMeshNames = selectedItems.flatMap((item) =>
    item.source.kind === 'embeddedMesh' ? [item.source.meshName] : [],
  );

  const externalAssets = selectedItems.flatMap((item): AvatarExternalAsset[] =>
    item.source.kind === 'externalGltf'
      ? [
          {
            id: item.id,
            slot: item.slot,
            url: item.source.url,
            animationReady: item.source.animationReady,
            animationWarning: item.source.animationReady
              ? undefined
              : `${item.label} is enabled for animation debugging but is not production-ready.`,
          },
        ]
      : [],
  );

  const animation = getAnimationSource(config.animation);
  const animationWarnings =
    config.animation === 'idle'
      ? []
      : externalAssets.flatMap((asset) => asset.animationWarning ?? []);

  const requiredUrls = [
    AVATAR_MODULAR_MALE_MODEL_URL,
    ...(animation.animationUrl ? [animation.animationUrl] : []),
    ...externalAssets.map((asset) => asset.url),
  ];

  return {
    baseUrl: AVATAR_MODULAR_MALE_MODEL_URL,
    animationUrl: animation.animationUrl,
    animationName: animation.animationName,
    preserveHipsPosition: animation.preserveHipsPosition,
    embeddedMeshNames,
    externalAssets,
    requiredUrls,
    animationWarnings,
  };
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run lint`

Expected: TypeScript passes for the new resolver module or reports only existing caller issues from Task 1.

- [ ] **Step 4: Commit**

```bash
git add src/avatar/avatarConstants.ts src/avatar/avatarAssetResolver.ts
git commit -m "feat: resolve avatar runtime assets from slots"
```

### Task 3: Multi-Asset Avatar Renderer

**Files:**
- Modify: `src/avatar/AvatarModel.tsx`
- Modify: `src/avatar/AvatarScene.tsx`

- [ ] **Step 1: Replace top-specific visibility with embedded mesh visibility**

In `src/avatar/AvatarModel.tsx`, replace `applySlotVisibility` with a generic helper:

```ts
const EMBEDDED_SLOT_PREFIXES = ['top_'];

function applyEmbeddedMeshVisibility(scene: Object3D, selectedMeshNames: string[]) {
  const selected = new Set(selectedMeshNames);

  scene.traverse((object) => {
    if (!EMBEDDED_SLOT_PREFIXES.some((prefix) => object.name.startsWith(prefix))) return;
    object.visible = selected.has(object.name);
  });
}
```

- [ ] **Step 2: Add external asset props**

Update `AvatarModelProps`:

```ts
import { AvatarExternalAsset } from './avatarAssetResolver';

interface AvatarModelProps {
  url?: string;
  animationUrl?: string;
  animationName?: string | null;
  embeddedMeshNames?: string[];
  externalAssets?: AvatarExternalAsset[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
}
```

- [ ] **Step 3: Load external GLBs and normalize a single root group**

Inside `AvatarModel`, load external assets and return a single scaled root containing base and garments:

```ts
const externalGltfs = externalAssets?.map((asset) => useGLTF(asset.url)) ?? [];
```

Use the existing base bounds to calculate scale and position, then apply that transform to the outer `<group>` instead of baking it onto only the cloned base scene:

```ts
const { baseScene, garmentScenes, hipsAnchor, rootTransform } = useMemo(() => {
  const clonedBaseScene = clone(gltf.scene);
  const hips = clonedBaseScene.getObjectByName('Hips');

  clonedBaseScene.traverse((object) => {
    if ('isMesh' in object || 'isSkinnedMesh' in object) {
      object.frustumCulled = false;
    }
  });

  applyEmbeddedMeshVisibility(clonedBaseScene, embeddedMeshNames ?? []);
  clonedBaseScene.updateMatrixWorld(true);

  const bounds = new Box3().setFromObject(clonedBaseScene);
  const size = new Vector3();
  const center = new Vector3();

  bounds.getSize(size);
  bounds.getCenter(center);

  const scale = (size.y > 0 ? TARGET_MODEL_HEIGHT / size.y : 1) * getPreviewScale(bodyShape);
  const position = new Vector3(-center.x * scale, -bounds.min.y * scale, -center.z * scale);

  const garmentScenes = externalGltfs.map((externalGltf) => {
    const clonedGarmentScene = clone(externalGltf.scene);
    clonedGarmentScene.traverse((object) => {
      if ('isMesh' in object || 'isSkinnedMesh' in object) {
        object.frustumCulled = false;
      }
    });
    return clonedGarmentScene;
  });

  return {
    baseScene: clonedBaseScene,
    garmentScenes,
    hipsAnchor: hips?.position.clone() ?? new Vector3(),
    rootTransform: { scale, position },
  };
}, [bodyShape, embeddedMeshNames, externalGltfs, gltf.scene]);
```

Render:

```tsx
return (
  <group
    ref={groupRef}
    position={rootTransform.position}
    rotation={[0, 0, 0]}
    scale={rootTransform.scale}
  >
    <primitive object={baseScene} />
    {garmentScenes.map((garmentScene, index) => (
      <primitive key={externalAssets?.[index]?.id ?? index} object={garmentScene} />
    ))}
  </group>
);
```

- [ ] **Step 4: Keep animation bound to the base runtime**

Leave `useAnimations(animationClips, groupRef)` in place. The first implementation accepts that `shoes_blue_sneakers_v1` is `animationReady: false`, but `resolveAvatarAssets()` must still return the requested walk/run animation source for `/avatar-preview` so the shoe defects can be debugged in the real slot renderer. Do not use baked `male-base-plain-blue-sneakers-*.glb` assets as a fallback.

- [ ] **Step 5: Pass props through `AvatarScene`**

Update `src/avatar/AvatarScene.tsx` props:

```ts
import { AvatarExternalAsset } from './avatarAssetResolver';

interface AvatarSceneProps {
  className?: string;
  modelUrl?: string;
  animationUrl?: string;
  animationName?: string | null;
  embeddedMeshNames?: string[];
  externalAssets?: AvatarExternalAsset[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
}
```

Pass `embeddedMeshNames` and `externalAssets` to `AvatarModel`.

- [ ] **Step 6: Run typecheck**

Run: `npm run lint`

Expected: TypeScript passes for `AvatarModel.tsx` and `AvatarScene.tsx`; remaining errors, if any, are presenter/preview callers fixed in later tasks.

- [ ] **Step 7: Commit**

```bash
git add src/avatar/AvatarModel.tsx src/avatar/AvatarScene.tsx
git commit -m "feat: render avatar garments as runtime assets"
```

### Task 4: Presenter Availability for Multiple GLBs

**Files:**
- Modify: `src/avatar/useAvatarAssetAvailability.ts`
- Modify: `src/avatar/AvatarPresenter.tsx`

- [ ] **Step 1: Add multi-asset availability hook**

Update `src/avatar/useAvatarAssetAvailability.ts`:

```ts
export function useAvatarAssetsAvailability(urls: string[]): AssetStatus {
  const [status, setStatus] = useState<AssetStatus>('checking');

  useEffect(() => {
    if (urls.length === 0) {
      setStatus('missing');
      return;
    }

    let cancelled = false;
    setStatus('checking');

    Promise.all(
      urls.map((url) =>
        fetch(url, { method: 'HEAD' }).then((response) => response.ok).catch(() => false),
      ),
    ).then((results) => {
      if (!cancelled) {
        setStatus(results.every(Boolean) ? 'available' : 'missing');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [urls.join('|')]);

  return status;
}
```

Keep `useAvatarAssetAvailability(url)` as a single-URL wrapper for existing callers:

```ts
export function useAvatarAssetAvailability(url = AVATAR_MODEL_URL): AssetStatus {
  return useAvatarAssetsAvailability([url]);
}
```

- [ ] **Step 2: Update presenter props**

Update `src/avatar/AvatarPresenter.tsx` to accept resolved assets:

```ts
import { AvatarExternalAsset } from './avatarAssetResolver';

interface AvatarPresenterProps {
  className?: string;
  label?: string;
  modelUrl?: string;
  animationUrl?: string;
  animationName?: string | null;
  embeddedMeshNames?: string[];
  externalAssets?: AvatarExternalAsset[];
  requiredUrls?: string[];
  bodyShape?: AvatarBodyShapeConfig;
  preserveHipsPosition?: boolean;
  assetStatusOverride?: AssetStatus;
  onAnimationsChange?: (names: string[]) => void;
  onModelReady?: () => void;
}
```

In `CheckedAvatarPresenter`, check every required URL:

```ts
function CheckedAvatarPresenter(props: Omit<AvatarPresenterProps, 'assetStatusOverride'>) {
  const requiredUrls = props.requiredUrls ?? [props.modelUrl ?? AVATAR_MODEL_URL];
  const assetStatus = useAvatarAssetsAvailability(requiredUrls);

  return <AvatarPresenterContent {...props} assetStatus={assetStatus} />;
}
```

- [ ] **Step 3: Pass resolved asset props to `AvatarScene`**

In `AvatarPresenterContent`, pass:

```tsx
<AvatarScene
  className="h-full w-full"
  modelUrl={modelUrl}
  animationUrl={animationUrl}
  animationName={animationName}
  embeddedMeshNames={embeddedMeshNames}
  externalAssets={externalAssets}
  bodyShape={bodyShape}
  preserveHipsPosition={preserveHipsPosition}
  onAnimationsChange={onAnimationsChange}
  onModelReady={onModelReady}
/>
```

- [ ] **Step 4: Run typecheck**

Run: `npm run lint`

Expected: TypeScript passes for presenter and availability changes.

- [ ] **Step 5: Commit**

```bash
git add src/avatar/useAvatarAssetAvailability.ts src/avatar/AvatarPresenter.tsx
git commit -m "feat: check avatar runtime asset availability"
```

### Task 5: Preview Workbench Uses Runtime Slots

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`
- Modify: `src/avatar/avatarConstants.ts`

- [ ] **Step 1: Remove baked preview state**

In `src/avatar/AvatarPreviewScreen.tsx`, delete:

```ts
const [shoePreviewEnabled, setShoePreviewEnabled] = useState(true);
```

Remove imports for:

```ts
AVATAR_BLUE_SNEAKERS_RIGGED_PREVIEW_MODEL_URL
AVATAR_BLUE_SNEAKERS_RUNNING_PREVIEW_MODEL_URL
AVATAR_BLUE_SNEAKERS_WALKING_PREVIEW_MODEL_URL
```

- [ ] **Step 2: Resolve runtime assets from config**

Import and use:

```ts
import { resolveAvatarAssets } from './avatarAssetResolver';
import { AVATAR_SHOES_ITEMS } from './avatarCatalog';
```

Add:

```ts
const resolvedAssets = useMemo(
  () => resolveAvatarAssets(previewState.config),
  [previewState.config],
);
```

Replace `activeModelUrl`, `animationSourceUrl`, and `previewAssetStatus` logic with:

```ts
const previewAssetStatus = useAvatarAssetsAvailability(resolvedAssets.requiredUrls);
```

- [ ] **Step 3: Make shoes a persisted slot control**

Replace the shoe preview buttons with:

```tsx
{AVATAR_SHOES_ITEMS.map((item) => (
  <OptionButton
    key={item.id}
    label={item.label}
    detail={
      item.source.kind === 'externalGltf' && !item.source.animationReady
        ? 'runtime GLB, debug animation'
        : item.source.kind === 'none'
          ? 'plain base'
          : 'runtime GLB'
    }
    selected={previewState.config.slotSelections.shoes === item.id}
    swatchClassName={item.swatchClassName}
    onClick={() => {
      setConfig((config) => ({
        ...config,
        slotSelections: {
          ...config.slotSelections,
          shoes: item.id,
        },
      }));
    }}
  />
))}
```

- [ ] **Step 4: Render with resolved assets**

Update the presenter call:

```tsx
<AvatarPresenter
  className="h-full w-full"
  modelUrl={resolvedAssets.baseUrl}
  assetStatusOverride={previewAssetStatus}
  animationUrl={resolvedAssets.animationUrl}
  animationName={resolvedAssets.animationName}
  preserveHipsPosition={resolvedAssets.preserveHipsPosition}
  embeddedMeshNames={resolvedAssets.embeddedMeshNames}
  externalAssets={resolvedAssets.externalAssets}
  requiredUrls={resolvedAssets.requiredUrls}
  bodyShape={previewState.config.bodyShape}
  onAnimationsChange={setAnimationNames}
  onModelReady={() => setReadyModelKey(modelReadyKey)}
  label="Modular avatar preview"
/>
```

Build `modelReadyKey` from `resolvedAssets.requiredUrls`, `resolvedAssets.animationName`, and `previewState.config.bodyShape.scale`.

- [ ] **Step 5: Show diagnostics that prove baked previews are gone**

Diagnostics should show:

```tsx
<dd className="break-all text-text-main">{resolvedAssets.baseUrl}</dd>
<dd className="break-all text-text-main">
  {resolvedAssets.externalAssets.map((asset) => asset.url).join(', ') || 'none'}
</dd>
<dd className="text-text-main">
  {resolvedAssets.animationWarnings.length > 0
    ? resolvedAssets.animationWarnings.join(' ')
    : 'ready'}
</dd>
```

Visible mesh diagnostics should come from `resolvedAssets.embeddedMeshNames` plus `resolvedAssets.externalAssets.map((asset) => asset.id)`.

- [ ] **Step 6: Remove baked preview constants**

After `AvatarPreviewScreen.tsx` no longer imports baked preview assets, delete these constants from `src/avatar/avatarConstants.ts`:

```ts
export const AVATAR_BLUE_SNEAKERS_PREVIEW_MODEL_URL =
  '/avatar/modular/male-base-plain-blue-sneakers.glb';
export const AVATAR_BLUE_SNEAKERS_RIGGED_PREVIEW_MODEL_URL =
  '/avatar/modular/male-base-plain-blue-sneakers-rigged.glb';
export const AVATAR_BLUE_SNEAKERS_WALKING_PREVIEW_MODEL_URL =
  '/avatar/modular/male-base-plain-blue-sneakers-rigged-walking.glb';
export const AVATAR_BLUE_SNEAKERS_RUNNING_PREVIEW_MODEL_URL =
  '/avatar/modular/male-base-plain-blue-sneakers-rigged-running.glb';
```

- [ ] **Step 7: Run reference scan and typecheck**

Run:

```bash
rg -n "blue-sneakers-rigged|plain-blue-sneakers|SNEAKERS_.*PREVIEW|shoePreviewEnabled" src
npm run lint
```

Expected: `rg` finds no source references to baked preview GLBs or `shoePreviewEnabled`; TypeScript passes.

- [ ] **Step 8: Commit**

```bash
git add src/avatar/AvatarPreviewScreen.tsx src/avatar/avatarConstants.ts
git commit -m "feat: use runtime avatar slots in preview"
```

### Task 6: Parent Settings Shoes Slot

**Files:**
- Modify: `src/avatar/AvatarCustomizationSettings.tsx`

- [ ] **Step 1: Use catalog swatches instead of local map**

Delete the local `swatchClassName` object and use `item.swatchClassName` from catalog for top choices.

- [ ] **Step 2: Add a shoes section**

Import `AVATAR_SHOES_ITEMS` and render it below the top section:

```tsx
const selectedShoes = avatarState.config.slotSelections.shoes;
```

Add:

```tsx
<div className="mt-6">
  <p className="text-sm font-black uppercase tracking-[0.14em] text-text-main/45">Top</p>
  <div className="mt-3 grid grid-cols-2 gap-3">
    {AVATAR_TOP_ITEMS.map((item) => {
      const isSelected = item.id === selectedTop;
      return (
        <ChoiceTile
          key={item.id}
          shape="option"
          state={isSelected ? 'selected' : 'neutral'}
          unstyledState={!isSelected}
          className={isSelected ? 'bg-success text-white' : 'bg-bg-light text-text-main opacity-80 shadow-none'}
          onClick={() => {
            updateAvatarState((state) => ({
              ...state,
              config: {
                ...state.config,
                slotSelections: {
                  ...state.config.slotSelections,
                  top: item.id,
                },
              },
            }));
          }}
        >
          <span className="flex min-w-0 items-center gap-3">
            {item.swatchClassName && (
              <span
                aria-hidden="true"
                className={`h-5 w-5 shrink-0 rounded-full border-2 border-white/80 ${item.swatchClassName}`}
              />
            )}
            <span className="truncate">{item.label}</span>
          </span>
        </ChoiceTile>
      );
    })}
  </div>
</div>
```

Add a similar shoes section using `AVATAR_SHOES_ITEMS`, updating `slotSelections.shoes`.

- [ ] **Step 3: Keep parent copy simple**

Update the description to:

```tsx
<p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
  Vyberte oblečenie sprievodcu.
</p>
```

Do not mention GLBs, runtime slots, or animation limitations in parent settings.

- [ ] **Step 4: Run typecheck**

Run: `npm run lint`

Expected: TypeScript passes.

- [ ] **Step 5: Commit**

```bash
git add src/avatar/AvatarCustomizationSettings.tsx
git commit -m "feat: expose avatar shoes setting"
```

### Task 7: Documentation and Roadmap

**Files:**
- Modify: `docs/avatar-clothing-pipeline.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Document the runtime slot contract**

In `docs/avatar-clothing-pipeline.md`, replace the baked preview shortcut note with:

```md
## Runtime Slot Contract

The app runtime loads the base avatar and selected garment assets separately.
The canonical base is `public/avatar/modular/male-base-plain.glb`; garment
assets live under `public/avatar/garments/` and are selected by catalog metadata
in `src/avatar/avatarCatalog.ts`.

External garment GLBs must be exported in the same coordinate space as the base
avatar. The React runtime normalizes the base once, then mounts selected
garment scenes under the same scaled root group.

`shoes_blue_sneakers_v1.glb` is static-preview-ready but not production
animation-ready. The preview must still allow walk/run animation with this shoe
selected so foot poke-through and deformation can be debugged in the real slot
renderer. Its catalog metadata must keep `animationReady: false` until
walking/running QA passes without foot poke-through or unacceptable deformation.
```

- [ ] **Step 2: Update roadmap**

In `ROADMAP.md`, under Phase 5, change:

```md
- [ ] Move from "one modular GLB per base" toward separate clothing GLBs once the MVP is stable
```

to:

```md
- [x] Move from baked combined preview GLBs to runtime-loading separate garment GLBs for static slots
- [ ] Make footwear animation-ready without foot poke-through or unacceptable deformation
```

Keep broader future slot expansion items unchecked unless they are fully implemented.

- [ ] **Step 3: Run docs reference scan**

Run:

```bash
rg -n "workbench shortcut|combined preview|male-base-plain-blue-sneakers|rigged preview|baked" docs/avatar-clothing-pipeline.md ROADMAP.md src/avatar
```

Expected: docs may mention historical baked previews as deprecated artifacts; `src/avatar` should have no baked preview references.

- [ ] **Step 4: Commit**

```bash
git add docs/avatar-clothing-pipeline.md ROADMAP.md
git commit -m "docs: record avatar runtime slot contract"
```

### Task 8: Verification

**Files:**
- No source changes expected unless verification finds a bug.

- [ ] **Step 1: Validate current GLBs**

Run:

```bash
npm run avatar:gltf:validate -- public/avatar/modular/male-base-plain.glb
npm run avatar:gltf:validate -- public/avatar/garments/shoes_blue_sneakers_v1.glb
```

Expected: both commands return `0` validation errors.

- [ ] **Step 2: Run static checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass; Vite chunk-size warnings are acceptable.

- [ ] **Step 3: Run preview route locally**

Start the dev server:

```bash
npm run dev
```

Open `http://localhost:3000/avatar-preview`.

- [ ] **Step 4: Browser-check runtime slot behavior**

Use Playwright or the in-app browser to verify:

- `/avatar-preview` renders a nonblank canvas on desktop and mobile.
- Selecting `Blue sneakers` keeps `Model URL` on `/avatar/modular/male-base-plain.glb`.
- Diagnostics list `/avatar/garments/shoes_blue_sneakers_v1.glb` under external assets.
- `rg -n "male-base-plain-blue-sneakers|SNEAKERS_.*PREVIEW" src/avatar` still returns no matches.
- Selecting `Bare feet` removes the external shoe asset from diagnostics.
- Selecting `Walk` or `Run` while blue sneakers are selected uses the plain base walk/run animation source, keeps the separate shoe GLB mounted, and reports a debug animation warning rather than using baked shoe animation GLBs.
- Persist/reset still updates `hrave-ucenie-avatar-state` with both `top` and `shoes`.

- [ ] **Step 5: Final commit if verification required fixes**

If verification required code or docs fixes:

```bash
git add src/avatar docs/avatar-clothing-pipeline.md ROADMAP.md
git commit -m "fix: stabilize avatar runtime slot verification"
```

If no fixes were required, do not create an empty commit.

---

## Self-Review

- Spec coverage: The plan covers runtime asset metadata, persisted shoe slot state, multi-GLB loading, preview migration away from baked GLBs, parent settings, docs, roadmap, and verification.
- Placeholder scan: No `TBD`, `TODO`, or unspecified implementation steps remain.
- Type consistency: `AvatarShoesItemId`, `AvatarSlotSelections.shoes`, `AvatarExternalAsset`, and `ResolvedAvatarAssets` are introduced before use and referenced consistently.
- Scope boundary: This plan does not attempt to solve production-ready shoe animation. It explicitly keeps walk/run enabled in preview for debugging while preserving final shoe rigging/fit as future asset-authoring work because current pipeline notes show the existing shoe GLB fails walk/run QA.
