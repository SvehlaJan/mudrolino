# Avatar Preview Agent-Friendly Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `/avatar-preview` easier for Claude to use when verifying garment fit — URL-driven config, machine-readable 3D data, camera reset, sidebar cleanup, and agent clean mode.

**Architecture:** URL params set initial avatar state on page load; `AvatarModel` computes bone world positions and garment bounding boxes after the scene mounts and fires them via `onSceneData` callback; `AvatarPreviewScreen` renders these as a human-readable diagnostic strip plus a hidden JSON blob with `data-testid="avatar-debug-json"`; `?agent=1` hides the sidebar and makes the canvas full-width.

**Tech Stack:** React 18, React Router v6 (`useSearchParams`), React Three Fiber, Three.js (`Box3`, `Vector3`, `Object3D`), `@react-three/drei` (`OrbitControls`, `useThree`), TypeScript, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-05-27-avatar-preview-agent-friendly-design.md`

---

## File Map

| File | What changes |
|---|---|
| `src/avatar/avatarTypes.ts` | Add `AvatarGarmentFit`, `AvatarSceneData` |
| `src/avatar/AvatarModel.tsx` | Add `onSceneData` prop; compute and fire scene data |
| `src/avatar/AvatarScene.tsx` | Thread `onSceneData`; add camera reset via `CameraResetController` |
| `src/avatar/AvatarPresenter.tsx` | Thread `onSceneData` and `onRegisterCameraReset` |
| `src/avatar/AvatarPreviewScreen.tsx` | Sidebar cleanup, URL params, agent mode, 3D data panel, camera reset button, `data-testid` attrs |

No changes to catalog, store, or asset resolver.

---

## Task 1: Add AvatarSceneData types

**Files:**
- Modify: `src/avatar/avatarTypes.ts`

- [ ] **Step 1: Add the two new interfaces at the bottom of avatarTypes.ts**

  Open `src/avatar/avatarTypes.ts` and append after the last `}`:

  ```ts
  export interface AvatarGarmentFit {
    targetBone: string;
    boneWorld: { x: number; y: number; z: number };
    meshCenter: { x: number; y: number; z: number };
    meshBounds: { zMin: number; zMax: number };
  }

  export interface AvatarSceneData {
    bones: Record<string, { x: number; y: number; z: number }>;
    garments: Record<string, AvatarGarmentFit>;
  }
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  npm run lint
  ```

  Expected: no errors. If you get "Cannot find module" errors, run `npm install` first.

- [ ] **Step 3: Commit**

  ```bash
  git add src/avatar/avatarTypes.ts
  git commit -m "feat(avatar): add AvatarSceneData and AvatarGarmentFit types"
  ```

---

## Task 2: Sidebar cleanup + data-testid attributes

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`

Context: the preview screen currently has sections and diagnostic fields that either never had functional controls (Base, Face, Future slots) or are redundant for garment verification. Remove them and add `data-testid` attrs to all interactive controls.

- [ ] **Step 1: Remove unused state and imports**

  In `AvatarPreviewScreen.tsx`, remove the `animationNames` state and its `setAnimationNames` setter. They are only used in the diagnostic panel fields we're removing.

  Remove this line:
  ```tsx
  const [animationNames, setAnimationNames] = useState<string[]>([]);
  ```

  Also remove the `selectedMeshNames` useMemo (the "Visible meshes" field is being cut):
  ```tsx
  const selectedMeshNames = useMemo(
    () => [
      ...resolvedAssets.embeddedMeshNames,
      ...resolvedAssets.externalAssets.map((asset) => asset.id),
    ],
    [resolvedAssets.embeddedMeshNames, resolvedAssets.externalAssets],
  );
  ```

  Remove unused imports:
  - `BadgeInfo` (was Face section icon)
  - `UserRound` (was Base section icon)

  Remove unused types/constants:
  ```tsx
  type FutureSlot = 'bottom' | 'hair';

  const FUTURE_SLOTS: Array<{ id: FutureSlot; label: string }> = [
    { id: 'bottom', label: 'Bottom' },
    { id: 'hair', label: 'Hair' },
  ];
  ```

- [ ] **Step 2: Remove the Base WorkbenchSection**

  Delete the entire Base section from the JSX:
  ```tsx
  <WorkbenchSection title="Base" icon={<UserRound size={19} />}>
    <div className="grid grid-cols-2 gap-2">
      <OptionButton label="Male" detail="active" selected />
      <OptionButton label="Female" detail="planned" disabled />
    </div>
  </WorkbenchSection>
  ```

- [ ] **Step 3: Remove the Face WorkbenchSection**

  Delete the entire Face section:
  ```tsx
  <WorkbenchSection title="Face" icon={<BadgeInfo size={19} />}>
    <div className="grid grid-cols-2 gap-2">
      <OptionButton label="Placeholder" detail="active" selected />
      <OptionButton label="Generated decal" detail="planned" disabled />
    </div>
    <p className="mt-3 text-sm font-semibold leading-snug text-text-main/55">
      The GLB includes `face_anchor`; selfie processing and decal rendering stay behind the backend backlog.
    </p>
  </WorkbenchSection>
  ```

- [ ] **Step 4: Remove Future slots subsection from Clothing Slots**

  Inside the Clothing Slots `WorkbenchSection`, delete the Future slots subsection:
  ```tsx
  <p className="mb-3 mt-5 text-sm font-bold text-text-main/55">Future slots</p>
  <div className="grid grid-cols-2 gap-2">
    {FUTURE_SLOTS.map((slot) => (
      <OptionButton key={slot.id} label={slot.label} detail="planned" disabled />
    ))}
  </div>
  ```

- [ ] **Step 5: Remove slot button detail text**

  In the Top slot map, remove `detail="embedded mesh"` from the OptionButton:
  ```tsx
  // Before:
  <OptionButton
    key={item.id}
    label={item.label}
    detail="embedded mesh"
    selected={...}
  ```
  ```tsx
  // After:
  <OptionButton
    key={item.id}
    label={item.label}
    selected={...}
  ```

  In the Shoes slot map, remove the `detail` prop entirely (the ternary with "runtime GLB, debug animation" / "plain base"):
  ```tsx
  // Before:
  <OptionButton
    key={item.id}
    label={item.label}
    detail={
      item.source.kind === 'externalGltf' && !item.source.animationReady
        ? 'runtime GLB, debug animation'
        : item.source.kind === 'none'
          ? 'plain base'
          : undefined
    }
    selected={...}
  ```
  ```tsx
  // After:
  <OptionButton
    key={item.id}
    label={item.label}
    selected={...}
  ```

  Also remove the source shoe URL `<p>` below the shoes list:
  ```tsx
  <p className="break-all text-xs font-bold leading-snug text-text-main/45">
    Source shoe GLB: {AVATAR_BLUE_SNEAKERS_MODEL_URL}
  </p>
  ```

  And remove the `AVATAR_BLUE_SNEAKERS_MODEL_URL` import from `./avatarConstants` if it is now unused.

- [ ] **Step 6: Trim the diagnostic panel — remove 6 fields and the persisted storage column**

  The diagnostic panel lives in the bottom `<section>` after the canvas. It currently has a 3-column grid (`lg:grid-cols-3`). Change it to 2 columns (`lg:grid-cols-2`).

  Inside the Asset column (`<dl>`), keep only **Model URL**, **External assets**, and **Status**. Delete these `<div>` entries:
  - Animation source (`<dt>Animation source</dt>`)
  - Animation warning (`<dt>Animation warning</dt>`)
  - Model ready (`<dt>Model ready</dt>`)
  - Animation clips (`<dt>Animation clips</dt>`)
  - Visible meshes (`<dt>Visible meshes</dt>`)

  Delete the entire third column div (Persisted storage):
  ```tsx
  <div>
    <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">
      Persisted storage
    </p>
    <pre className="mt-3 max-h-56 overflow-auto rounded-2xl bg-bg-light p-3 text-xs font-bold leading-relaxed text-text-main/75">
      {storageSnapshot ?? 'null'}
    </pre>
  </div>
  ```

  Also remove `storageSnapshot` state and the `setStorageSnapshot` calls and `readStorageSnapshot` usage if no longer rendered — except `handlePersist` still calls `setStorageSnapshot`. Since we're removing the display, remove:
  ```tsx
  const [storageSnapshot, setStorageSnapshot] = useState<string | null>(() => readStorageSnapshot());
  ```
  And remove `setStorageSnapshot(readStorageSnapshot())` from `handlePersist` and `handleResetPersisted`.
  And remove the `readStorageSnapshot` function.

  Also remove unused `Database` import from lucide-react (was the State section icon — wait, State section stays). Actually check: `Database` icon is used in the State `WorkbenchSection`. Keep it.

- [ ] **Step 7: Add data-testid attributes to all interactive controls**

  Skeleton toggle button — add `data-testid="skeleton-toggle"`:
  ```tsx
  <button
    type="button"
    onClick={() => setShowSkeleton((v) => !v)}
    aria-pressed={showSkeleton}
    aria-label="Toggle skeleton overlay"
    data-testid="skeleton-toggle"
    className={...}
  >
  ```

  Persist button — add `data-testid="avatar-persist"`:
  ```tsx
  <button
    type="button"
    onClick={handlePersist}
    data-testid="avatar-persist"
    className={...}
  >
  ```

  Top slot OptionButtons — add `data-testid={\`slot-top-${item.id}\`}` to the `OptionButton` component's button element. The cleanest place to add it is in the `OptionButton` component itself via a new optional `testId` prop:

  Add to `OptionButtonProps`:
  ```tsx
  testId?: string;
  ```

  Add to the `<button>` element inside `OptionButton`:
  ```tsx
  data-testid={testId}
  ```

  Then pass it from each slot map:
  ```tsx
  // Top items:
  <OptionButton
    key={item.id}
    testId={`slot-top-${item.id}`}
    label={item.label}
    ...
  />

  // Shoes items:
  <OptionButton
    key={item.id}
    testId={`slot-shoes-${item.id}`}
    label={item.label}
    ...
  />

  // Accessory items:
  <OptionButton
    key={item.id}
    testId={`slot-accessory-${item.id}`}
    label={item.label}
    ...
  />
  ```

  Animation buttons (in `ANIMATION_OPTIONS.map`):
  ```tsx
  <OptionButton
    key={animation}
    testId={`animation-${animation}`}
    label={animationLabels[animation]}
    ...
  />
  ```

  Also stop passing `onAnimationsChange` to `AvatarPresenter` since that state is gone:
  Remove `onAnimationsChange={setAnimationNames}` from the `<AvatarPresenter>` JSX.

- [ ] **Step 8: Verify TypeScript compiles**

  ```bash
  npm run lint
  ```

  Expected: no errors. Fix any "is declared but its value is never read" TypeScript errors by removing the corresponding variables/imports.

- [ ] **Step 9: Commit**

  ```bash
  git add src/avatar/AvatarPreviewScreen.tsx
  git commit -m "feat(avatar-preview): sidebar cleanup and data-testid attributes"
  ```

---

## Task 3: URL-driven config

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`

Context: On mount, read URL search params and merge valid values into the initial avatar state. URL wins over localStorage. Unknown or invalid values are silently ignored.

- [ ] **Step 1: Add useSearchParams import**

  Add to the existing React Router import at the top of `AvatarPreviewScreen.tsx`:
  ```tsx
  import { useNavigate, useSearchParams } from 'react-router-dom';
  ```

- [ ] **Step 2: Add catalog ID sets for validation**

  Import the catalog arrays needed for validation. Add to the existing catalog imports:
  ```tsx
  import { AVATAR_ACCESSORY_ITEMS, AVATAR_SHOES_ITEMS, AVATAR_TOP_ITEMS } from './avatarCatalog';
  ```
  (already imported — use these directly for the valid ID sets)

- [ ] **Step 3: Write a parseUrlParams helper**

  Add this function before `AvatarPreviewScreen` (after the existing helper functions):

  ```tsx
  const VALID_ANIMATIONS = new Set<AvatarAnimationName>(['idle', 'walk', 'run', 'success', 'failure']);

  function parseUrlParams(params: URLSearchParams): Partial<{
    top: AvatarTopItemId;
    shoes: AvatarShoesItemId;
    accessory: AvatarAccessoryItemId;
    animation: AvatarAnimationName;
    scale: number;
    agent: boolean;
  }> {
    const result: ReturnType<typeof parseUrlParams> = {};

    const top = params.get('top');
    if (top && AVATAR_TOP_ITEMS.some((i) => i.id === top)) result.top = top as AvatarTopItemId;

    const shoes = params.get('shoes');
    if (shoes && AVATAR_SHOES_ITEMS.some((i) => i.id === shoes)) result.shoes = shoes as AvatarShoesItemId;

    const accessory = params.get('accessory');
    if (accessory && AVATAR_ACCESSORY_ITEMS.some((i) => i.id === accessory))
      result.accessory = accessory as AvatarAccessoryItemId;

    const animation = params.get('animation');
    if (animation && VALID_ANIMATIONS.has(animation as AvatarAnimationName))
      result.animation = animation as AvatarAnimationName;

    const scaleStr = params.get('scale');
    if (scaleStr !== null) {
      const scale = Math.min(1.2, Math.max(0.8, Number(scaleStr)));
      if (!Number.isNaN(scale)) result.scale = scale;
    }

    if (params.get('agent') === '1') result.agent = true;

    return result;
  }
  ```

- [ ] **Step 4: Use useSearchParams in the component and merge into initial state**

  Inside `AvatarPreviewScreen`, add `useSearchParams` before the existing state:
  ```tsx
  const [searchParams] = useSearchParams();
  ```

  Change the initial state of `previewState` to merge URL params:
  ```tsx
  const [previewState, setPreviewState] = useState<StoredAvatarState>(() => {
    const base = loadAvatarState();
    const url = parseUrlParams(searchParams);
    if (Object.keys(url).length === 0) return base;
    return {
      ...base,
      config: {
        ...base.config,
        ...(url.animation !== undefined && { animation: url.animation }),
        ...(url.scale !== undefined && {
          bodyShape: { ...base.config.bodyShape, scale: url.scale },
        }),
        slotSelections: {
          ...base.config.slotSelections,
          ...(url.top !== undefined && { top: url.top }),
          ...(url.shoes !== undefined && { shoes: url.shoes }),
          ...(url.accessory !== undefined && { accessory: url.accessory }),
        },
      },
    };
  });
  ```

  Also derive `isAgentMode` from the URL:
  ```tsx
  const isAgentMode = searchParams.get('agent') === '1';
  ```

  (We'll use `isAgentMode` in Task 8 for the layout switch.)

- [ ] **Step 5: Verify TypeScript compiles**

  ```bash
  npm run lint
  ```

  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/avatar/AvatarPreviewScreen.tsx
  git commit -m "feat(avatar-preview): URL-driven config via search params"
  ```

---

## Task 4: Compute and thread 3D scene data (AvatarModel → AvatarScene → AvatarPresenter)

**Files:**
- Modify: `src/avatar/AvatarModel.tsx`
- Modify: `src/avatar/AvatarScene.tsx`
- Modify: `src/avatar/AvatarPresenter.tsx`

Context: `AvatarModel` already computes the scene graph (bones and garments are in their final positions after `useMemo`). We add a `computeAvatarSceneData` helper that walks the scene once after model ready and fires the result via a new `onSceneData` callback, threaded up through `AvatarScene` and `AvatarPresenter`.

- [ ] **Step 1: Add onSceneData to AvatarModel and implement the compute function**

  Open `src/avatar/AvatarModel.tsx`. Add the import for the new types:
  ```tsx
  import { AvatarBodyShapeConfig, AvatarGarmentFit, AvatarSceneData, AvatarSlotSelections } from './avatarTypes';
  ```

  Add `onSceneData` to the `AvatarModelProps` interface:
  ```tsx
  onSceneData?: (data: AvatarSceneData) => void;
  ```

  Add the helper function before `AvatarModel` (it uses Three.js types that are already imported):
  ```tsx
  const SNAPSHOT_BONES = ['Head', 'Hips', 'LeftFoot', 'RightFoot', 'LeftToeBase', 'RightToeBase'];

  function r3(n: number) {
    return Math.round(n * 1000) / 1000;
  }

  function vec3(v: Vector3) {
    return { x: r3(v.x), y: r3(v.y), z: r3(v.z) };
  }

  function computeAvatarSceneData(
    scene: Object3D,
    externalAssets: AvatarExternalAsset[],
  ): AvatarSceneData {
    scene.updateMatrixWorld(true);
    const worldPos = new Vector3();

    const bones: AvatarSceneData['bones'] = {};
    for (const name of SNAPSHOT_BONES) {
      const bone = scene.getObjectByName(name);
      if (bone) {
        bone.getWorldPosition(worldPos);
        bones[name] = vec3(worldPos);
      }
    }

    const garments: AvatarSceneData['garments'] = {};

    for (const asset of externalAssets) {
      if (asset.slot === 'accessory') {
        const headBone = scene.getObjectByName('Head');
        if (!headBone) continue;
        headBone.getWorldPosition(worldPos);
        const boneWorld = vec3(worldPos);
        const bounds = new Box3();
        headBone.traverse((obj) => {
          if ('isMesh' in obj && obj.isMesh) bounds.expandByObject(obj);
        });
        if (bounds.isEmpty()) continue;
        const center = new Vector3();
        bounds.getCenter(center);
        garments['accessory'] = {
          targetBone: 'Head',
          boneWorld,
          meshCenter: vec3(center),
          meshBounds: { zMin: r3(bounds.min.z), zMax: r3(bounds.max.z) },
        } satisfies AvatarGarmentFit;
      } else if (asset.slot === 'shoes') {
        for (const [key, boneName] of [
          ['shoes_L', 'LeftToeBase'],
          ['shoes_R', 'RightToeBase'],
        ] as const) {
          const footBone = scene.getObjectByName(boneName);
          if (!footBone) continue;
          footBone.getWorldPosition(worldPos);
          const boneWorld = vec3(worldPos);
          const bounds = new Box3();
          footBone.traverse((obj) => {
            if ('isMesh' in obj && obj.isMesh) bounds.expandByObject(obj);
          });
          if (bounds.isEmpty()) continue;
          const center = new Vector3();
          bounds.getCenter(center);
          garments[key] = {
            targetBone: boneName,
            boneWorld,
            meshCenter: vec3(center),
            meshBounds: { zMin: r3(bounds.min.z), zMax: r3(bounds.max.z) },
          } satisfies AvatarGarmentFit;
        }
      }
    }

    return { bones, garments };
  }
  ```

  Destructure `onSceneData` in the component signature and add it to the `useEffect` that fires `onModelReady`:
  ```tsx
  // Add to the destructured props:
  onSceneData,

  // Update the useEffect (lines ~188-191 in original):
  useEffect(() => {
    groupRef.current?.updateMatrixWorld(true);
    onModelReady?.();
    onSceneReady?.(scene);
    onSceneData?.(computeAvatarSceneData(scene, externalAssets));
  }, [externalAssets, garmentScenes, onModelReady, onSceneData, onSceneReady, scene]);
  ```

- [ ] **Step 2: Thread onSceneData through AvatarScene**

  Open `src/avatar/AvatarScene.tsx`. Add `onSceneData` to `AvatarSceneProps`:
  ```tsx
  import { AvatarSceneData } from './avatarTypes';

  // In AvatarSceneProps:
  onSceneData?: (data: AvatarSceneData) => void;
  ```

  Destructure it in `AvatarScene` and pass it down to `AvatarModel`:
  ```tsx
  // In the AvatarScene function signature, add:
  onSceneData,

  // In the <AvatarModel> JSX, add:
  onSceneData={onSceneData}
  ```

- [ ] **Step 3: Thread onSceneData through AvatarPresenter**

  Open `src/avatar/AvatarPresenter.tsx`. Add `onSceneData` to `AvatarPresenterProps`:
  ```tsx
  import { AvatarBodyShapeConfig, AvatarSceneData, AvatarSlotSelections } from './avatarTypes';

  // In AvatarPresenterProps:
  onSceneData?: (data: AvatarSceneData) => void;
  ```

  Pass it through in every place `AvatarScene` is rendered (both `AvatarPresenterContent` and the two wrapper components):
  - Add `onSceneData` to `AvatarPresenterContentProps`
  - Destructure it in `AvatarPresenterContent` and pass `onSceneData={onSceneData}` to `<AvatarScene>`
  - Pass `onSceneData={props.onSceneData}` in `CheckedAvatarPresenter`
  - Pass `onSceneData={onSceneData}` in the `assetStatusOverride` branch of `AvatarPresenter`

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npm run lint
  ```

  Expected: no errors. The `AvatarSceneData` import must be consistent — check that `AvatarGarmentFit` is imported in `AvatarModel.tsx` only for the `satisfies` expressions; if TypeScript infers correctly without it you may drop that import.

- [ ] **Step 5: Commit**

  ```bash
  git add src/avatar/AvatarModel.tsx src/avatar/AvatarScene.tsx src/avatar/AvatarPresenter.tsx
  git commit -m "feat(avatar): compute and thread 3D scene data via onSceneData callback"
  ```

---

## Task 5: Render 3D data panel in AvatarPreviewScreen

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`

Context: Wire `onSceneData` from `AvatarPresenter` into local state and render it as (a) a visible text strip in the diagnostic panel and (b) a hidden JSON blob with `data-testid="avatar-debug-json"`.

- [ ] **Step 1: Add sceneData state**

  In `AvatarPreviewScreen`, add after the existing state declarations:
  ```tsx
  import { AvatarSceneData } from './avatarTypes';

  // Inside the component:
  const [sceneData, setSceneData] = useState<AvatarSceneData | null>(null);
  ```

  Pass `onSceneData` to `<AvatarPresenter>`:
  ```tsx
  onSceneData={setSceneData}
  ```

  Reset `sceneData` when the model reloads (so stale data doesn't linger while loading):
  ```tsx
  // Change the existing onModelReady handler:
  onModelReady={() => {
    setReadyModelKey(modelReadyKey);
    setSceneData(null);
  }}
  ```

  Actually `onModelReady` is currently an inline `() => setReadyModelKey(modelReadyKey)`. Replace it with a named callback:
  ```tsx
  const handleModelReady = useCallback(() => {
    setReadyModelKey(modelReadyKey);
    setSceneData(null);
  }, [modelReadyKey]);

  // In JSX:
  onModelReady={handleModelReady}
  ```

  Note: `onSceneData` fires slightly after `onModelReady` (same effect, called sequentially), so `setSceneData(null)` briefly clears old data before the new data arrives. This is intentional — avoids showing stale data for the wrong config.

- [ ] **Step 2: Render the visible 3D data strip**

  In the diagnostic panel (the bottom `<section>`), after the Asset `<div>` and Preview config `<div>`, add a new third column for 3D data. Change `lg:grid-cols-2` to `lg:grid-cols-3` and add:

  ```tsx
  <div>
    <p className="text-xs font-black uppercase tracking-[0.18em] text-text-main/45">
      3D fit
    </p>
    {sceneData ? (
      <dl className="mt-3 space-y-2 text-sm font-bold text-text-main/70">
        <div>
          <dt className="text-text-main/45">Bones</dt>
          <dd className="break-all font-mono text-xs text-text-main">
            {Object.entries(sceneData.bones)
              .map(([name, p]) => `${name}(${p.x},${p.y},${p.z})`)
              .join('  ')}
          </dd>
        </div>
        {Object.entries(sceneData.garments).map(([key, fit]) => (
          <div key={key}>
            <dt className="text-text-main/45">{key}</dt>
            <dd className="break-all font-mono text-xs text-text-main">
              bone {fit.targetBone} z={fit.boneWorld.z} | center z={fit.meshCenter.z} | Δz=
              {(fit.meshCenter.z - fit.boneWorld.z).toFixed(3)} | Z {fit.meshBounds.zMin}–
              {fit.meshBounds.zMax}
            </dd>
          </div>
        ))}
      </dl>
    ) : (
      <p className="mt-3 text-sm font-bold text-text-main/40">Loading…</p>
    )}
  </div>
  ```

- [ ] **Step 3: Render the hidden machine-readable JSON blob**

  Outside the diagnostic panel grid but inside the bottom `<section>`, add after the grid div:
  ```tsx
  <pre
    data-testid="avatar-debug-json"
    hidden
    aria-hidden="true"
  >
    {sceneData ? JSON.stringify(sceneData, null, 2) : ''}
  </pre>
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  ```bash
  npm run lint
  ```

  Expected: no errors.

- [ ] **Step 5: Start the dev server and verify the panel renders**

  ```bash
  npm run dev
  ```

  Navigate to `http://localhost:3000/avatar-preview?accessory=hat_red_cap_v1`. After the model loads, the "3D fit" column should show bone positions and an "accessory" row with real Z values. The `<pre data-testid="avatar-debug-json">` element should exist in the DOM (verify with browser devtools or `preview_snapshot`).

- [ ] **Step 6: Commit**

  ```bash
  git add src/avatar/AvatarPreviewScreen.tsx
  git commit -m "feat(avatar-preview): render 3D fit data panel and hidden debug JSON blob"
  ```

---

## Task 6: Camera reset — implement in AvatarScene, thread through AvatarPresenter

**Files:**
- Modify: `src/avatar/AvatarScene.tsx`
- Modify: `src/avatar/AvatarPresenter.tsx`

Context: Add a `CameraResetController` component inside the R3F canvas that registers a reset function via a prop. The reset function resets the camera to the default position and updates OrbitControls. This function is threaded up to `AvatarPreviewScreen` via a callback.

- [ ] **Step 1: Add CameraResetController and OrbitControls ref to AvatarScene**

  Open `src/avatar/AvatarScene.tsx`. Add imports:
  ```tsx
  import { useCallback, useEffect, useRef } from 'react';
  import { useThree } from '@react-three/fiber';
  ```
  (Note: `useEffect` is already imported from React; add `useCallback` and `useRef` to the React import.)

  Add the new props to `AvatarSceneProps`:
  ```tsx
  onRegisterCameraReset?: (reset: () => void) => void;
  ```

  Add the `CameraResetController` component (inside this file, before `AvatarScene`):
  ```tsx
  const CAMERA_POSITION = [0, 1.35, 7.2] as const;
  const CAMERA_TARGET = [0, 1.25, 0] as const;

  function CameraResetController({
    onRegister,
    controlsRef,
  }: {
    onRegister?: (reset: () => void) => void;
    controlsRef: React.RefObject<any>;
  }) {
    const { camera } = useThree();

    const reset = useCallback(() => {
      camera.position.set(...CAMERA_POSITION);
      camera.updateProjectionMatrix();
      const controls = controlsRef.current;
      if (controls) {
        controls.target.set(...CAMERA_TARGET);
        controls.update();
      }
    }, [camera, controlsRef]);

    useEffect(() => {
      onRegister?.(reset);
    }, [onRegister, reset]);

    return null;
  }
  ```

  In `AvatarScene`, add a `controlsRef`:
  ```tsx
  const controlsRef = useRef<any>(null);
  ```

  Attach the ref to `OrbitControls`:
  ```tsx
  <OrbitControls
    ref={controlsRef}
    target={[0, 1.25, 0]}
    ...
  />
  ```

  Add `CameraResetController` inside the Canvas (after `<AvatarCameraRig />`):
  ```tsx
  <CameraResetController
    onRegister={onRegisterCameraReset}
    controlsRef={controlsRef}
  />
  ```

  Destructure the new prop in the `AvatarScene` function signature:
  ```tsx
  onRegisterCameraReset,
  ```

  Also update `AvatarCameraRig` to use the same constants to avoid duplication:
  ```tsx
  function AvatarCameraRig() {
    const { camera } = useThree();
    useEffect(() => {
      camera.position.set(...CAMERA_POSITION);
      camera.lookAt(...CAMERA_TARGET);
      camera.updateProjectionMatrix();
    }, [camera]);
    return null;
  }
  ```

- [ ] **Step 2: Thread onRegisterCameraReset through AvatarPresenter**

  Open `src/avatar/AvatarPresenter.tsx`. Add `onRegisterCameraReset` to `AvatarPresenterProps`:
  ```tsx
  onRegisterCameraReset?: (reset: () => void) => void;
  ```

  Pass it through in every place `AvatarScene` is rendered inside `AvatarPresenterContent` (and thread through `CheckedAvatarPresenter` and the `assetStatusOverride` branch as you did for `onSceneData` in Task 4).

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run lint
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/avatar/AvatarScene.tsx src/avatar/AvatarPresenter.tsx
  git commit -m "feat(avatar): camera reset via CameraResetController, threaded to AvatarPresenter"
  ```

---

## Task 7: Camera reset button in AvatarPreviewScreen

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`

- [ ] **Step 1: Add cameraResetRef and wire onRegisterCameraReset**

  In `AvatarPreviewScreen`, add after the existing refs/state:
  ```tsx
  const cameraResetRef = useRef<(() => void) | null>(null);
  ```

  Pass to `<AvatarPresenter>`:
  ```tsx
  onRegisterCameraReset={(reset) => {
    cameraResetRef.current = reset;
  }}
  ```

- [ ] **Step 2: Add the camera reset button to the canvas overlay**

  The canvas currently has one overlay button (skeleton toggle) at `absolute right-3 top-3`. Move it to `left-3 top-3` and add the reset button at `right-3 top-3`.

  Import `RotateCw` from lucide-react (distinct from `RotateCcw` used for the reset state buttons):
  ```tsx
  import { ..., RotateCw } from 'lucide-react';
  ```

  Replace the skeleton toggle button placement and add the camera reset button:
  ```tsx
  {/* Camera reset — top right */}
  <button
    type="button"
    onClick={() => cameraResetRef.current?.()}
    aria-label="Reset camera view"
    data-testid="camera-reset"
    className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-text-main shadow-chip transition-colors hover:bg-white"
  >
    <RotateCw size={18} />
  </button>

  {/* Skeleton toggle — top left */}
  <button
    type="button"
    onClick={() => setShowSkeleton((v) => !v)}
    aria-pressed={showSkeleton}
    aria-label="Toggle skeleton overlay"
    data-testid="skeleton-toggle"
    className={`absolute left-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full shadow-chip transition-colors ${
      showSkeleton
        ? 'bg-accent-blue text-white'
        : 'bg-white/90 text-text-main hover:bg-white'
    }`}
  >
    <Bone size={18} />
  </button>
  ```

- [ ] **Step 3: Verify TypeScript compiles**

  ```bash
  npm run lint
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/avatar/AvatarPreviewScreen.tsx
  git commit -m "feat(avatar-preview): add camera reset button"
  ```

---

## Task 8: Agent clean mode (?agent=1)

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`

Context: When `?agent=1` is in the URL, hide the sidebar, show the canvas full-width, and display the compact debug strip below. `isAgentMode` was already derived in Task 3.

- [ ] **Step 1: Conditionally hide the sidebar**

  The outer layout uses `lg:grid-cols-[380px_minmax(0,1fr)]`. When `isAgentMode` is true, the aside should be hidden. Replace the static className with a conditional:

  ```tsx
  <main
    className={`mx-auto grid min-h-[calc(100svh-2rem)] max-w-7xl gap-5 pt-16 lg:pt-0 ${
      isAgentMode
        ? 'grid-cols-1'
        : 'lg:grid-cols-[380px_minmax(0,1fr)]'
    }`}
  >
    {!isAgentMode && (
      <aside className="rounded-[24px] bg-white p-5 shadow-chip lg:max-h-[calc(100svh-4rem)] lg:overflow-y-auto">
        {/* ... all sidebar sections ... */}
      </aside>
    )}
    <section ...>
      {/* canvas + diagnostic */}
    </section>
  </main>
  ```

- [ ] **Step 2: Change the page title in agent mode**

  The `<h1>` is inside the aside and hidden in agent mode, so no change needed there. Instead, update the document title dynamically so `preview_snapshot` can confirm the mode:

  Add a `useEffect` near the top of the component:
  ```tsx
  useEffect(() => {
    document.title = isAgentMode ? 'Avatar debug' : 'Avatar workbench';
    return () => {
      document.title = 'Hravé Učenie';
    };
  }, [isAgentMode]);
  ```

- [ ] **Step 3: Make the canvas taller in agent mode**

  The canvas container currently has `h-[min(72svh,760px)] min-h-[500px]`. In agent mode, let it fill more of the screen:

  ```tsx
  className={`overflow-hidden rounded-[20px] bg-[radial-gradient(...)] ${
    isAgentMode
      ? 'h-[min(85svh,900px)] min-h-[600px]'
      : 'h-[min(72svh,760px)] min-h-[500px]'
  }`}
  ```

- [ ] **Step 4: Verify TypeScript compiles and test both modes**

  ```bash
  npm run lint
  ```

  Start the dev server and verify:
  1. `http://localhost:3000/avatar-preview` — sidebar visible, normal layout
  2. `http://localhost:3000/avatar-preview?agent=1&accessory=hat_red_cap_v1` — sidebar hidden, full-width canvas, page title is "Avatar debug", 3D fit data visible below canvas

  ```bash
  npm run dev
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add src/avatar/AvatarPreviewScreen.tsx
  git commit -m "feat(avatar-preview): agent clean mode via ?agent=1 URL param"
  ```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|---|---|
| Remove Base, Face, Future slots sections | Task 2 |
| Remove extra diagnostic fields | Task 2 |
| Remove slot button detail text | Task 2 |
| Remove persisted storage JSON | Task 2 |
| URL params: top, shoes, accessory, animation, scale | Task 3 |
| URL params: agent=1 | Task 3 (derives isAgentMode) |
| AvatarGarmentFit, AvatarSceneData types | Task 1 |
| Compute bone positions in AvatarModel | Task 4 |
| Compute garment bounding boxes in AvatarModel | Task 4 |
| Thread onSceneData through AvatarScene → AvatarPresenter | Task 4 |
| Visible 3D fit strip in diagnostic panel | Task 5 |
| Hidden `data-testid="avatar-debug-json"` JSON blob | Task 5 |
| Camera reset button | Tasks 6 + 7 |
| CameraResetController inside R3F canvas | Task 6 |
| data-testid on slot/animation/skeleton buttons | Task 2 |
| data-testid="camera-reset" | Task 7 |
| Agent mode: hide sidebar | Task 8 |
| Agent mode: full-width canvas | Task 8 |
| Agent mode: page title "Avatar debug" | Task 8 |

All spec requirements covered. ✓

**Type consistency check:**

- `AvatarGarmentFit` defined in Task 1, used (with `satisfies`) in Task 4 — consistent.
- `AvatarSceneData` defined in Task 1, imported in Tasks 4 and 5 — consistent.
- `onSceneData: (data: AvatarSceneData) => void` threaded: `AvatarModel` → `AvatarScene` → `AvatarPresenter` → `AvatarPreviewScreen` — consistent across all tasks.
- `onRegisterCameraReset: (reset: () => void) => void` threaded: `AvatarScene` → `AvatarPresenter` → `AvatarPreviewScreen` — consistent.
- `cameraResetRef: RefObject<(() => void) | null>` — set via `onRegisterCameraReset` callback, called in button onClick — consistent.
- `isAgentMode: boolean` — derived from `searchParams.get('agent') === '1'` in Task 3, used in Task 8 — consistent.
