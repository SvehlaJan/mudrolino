# Avatar Staged POC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an idle-only local 3D avatar POC with a preview path and a non-layout-changing home overlay.

**Architecture:** Runtime code only consumes one manually exported GLB at `/avatar/base-idle.glb`; FBX/OBJ/MTL files remain source assets outside the app. Avatar concerns live under `src/avatar/`, and screen code imports only `AvatarPresenter` or a home-specific overlay wrapper. Missing or broken avatar assets must degrade to no avatar without breaking the app.

**Tech Stack:** React 19, Vite 8, TypeScript 6, Tailwind CSS 4, Three.js, React Three Fiber, Drei, React Router. Context7 docs checked for React Three Fiber `/pmndrs/react-three-fiber`: `Canvas`, `Suspense`, GLB loading, asset caching, and render-loop guidance.

---

## File Structure

- Create `src/avatar/avatarConstants.ts`
  - Owns the runtime asset URL and localStorage key.
- Create `src/avatar/avatarTypes.ts`
  - Defines the idle-only POC animation type and versioned state shape.
- Create `src/avatar/avatarStore.ts`
  - Loads and saves avatar state in a namespace separate from app/game settings.
- Create `src/avatar/useAvatarAssetAvailability.ts`
  - Performs a browser-side `HEAD`/fallback `GET` check before rendering the GLB.
- Create `src/avatar/AvatarRuntimeBoundary.tsx`
  - Catches runtime renderer/model errors and hides the avatar instead of crashing screens.
- Create `src/avatar/AvatarModel.tsx`
  - Loads `/avatar/base-idle.glb`, plays the idle clip, and renders the loaded scene.
- Create `src/avatar/AvatarScene.tsx`
  - Owns `<Canvas>`, camera, lights, transparent background, and basic performance settings.
- Create `src/avatar/AvatarPresenter.tsx`
  - Screen-facing avatar wrapper with asset gating and silent fallback.
- Create `src/avatar/AvatarPreviewScreen.tsx`
  - Internal checkpoint screen for validating asset load, scale, orientation, and animation.
- Create `src/avatar/HomeAvatarOverlay.tsx`
  - Fixed-position home overlay that does not affect the home layout and uses `pointer-events: none`.
- Modify `src/App.tsx`
  - Add the preview route and home overlay.
- Modify `package.json` and `package-lock.json`
  - Add Three.js, React Three Fiber, and Drei.
- Use existing `public/avatar/`
  - Place manually exported `base-idle.glb` there when available.

---

### Task 1: Install 3D Runtime Dependencies

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install runtime packages**

Run:

```bash
npm install three @react-three/fiber @react-three/drei
```

Expected:

```text
npm completes successfully and writes dependency changes to package.json and package-lock.json
```

- [ ] **Step 2: Confirm dependencies were added**

Run:

```bash
node -e "const p=require('./package.json'); console.log(Boolean(p.dependencies.three), Boolean(p.dependencies['@react-three/fiber']), Boolean(p.dependencies['@react-three/drei']))"
```

Expected:

```text
true true true
```

- [ ] **Step 3: Run the current verification baseline**

Run:

```bash
npm run lint
```

Expected:

```text
no TypeScript or ESLint errors
```

- [ ] **Step 4: Commit dependency changes**

```bash
git add package.json package-lock.json
git commit -m "chore: add avatar rendering dependencies"
```

---

### Task 2: Add Avatar State Types And Store

**Files:**
- Create: `src/avatar/avatarConstants.ts`
- Create: `src/avatar/avatarTypes.ts`
- Create: `src/avatar/avatarStore.ts`

- [ ] **Step 1: Create avatar constants**

Create `src/avatar/avatarConstants.ts`:

```ts
export const AVATAR_MODEL_URL = '/avatar/base-idle.glb';
export const AVATAR_STORAGE_KEY = 'hrave-ucenie-avatar-state';
export const AVATAR_STATE_VERSION = 1;
```

- [ ] **Step 2: Create avatar types**

Create `src/avatar/avatarTypes.ts`:

```ts
import { AVATAR_STATE_VERSION } from './avatarConstants';

export type AvatarAnimationName = 'idle';

export interface AvatarConfig {
  modelId: 'base';
  outfitId: 'default';
  animation: AvatarAnimationName;
}

export interface AvatarProgressState {
  unlockedItemIds: string[];
}

export interface StoredAvatarState {
  version: typeof AVATAR_STATE_VERSION;
  config: AvatarConfig;
  progress: AvatarProgressState;
}
```

- [ ] **Step 3: Create avatar store**

Create `src/avatar/avatarStore.ts`:

```ts
import { AVATAR_STATE_VERSION, AVATAR_STORAGE_KEY } from './avatarConstants';
import { StoredAvatarState } from './avatarTypes';

export const DEFAULT_AVATAR_STATE: StoredAvatarState = {
  version: AVATAR_STATE_VERSION,
  config: {
    modelId: 'base',
    outfitId: 'default',
    animation: 'idle',
  },
  progress: {
    unlockedItemIds: [],
  },
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function loadAvatarState(): StoredAvatarState {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return DEFAULT_AVATAR_STATE;

    const stored = JSON.parse(raw) as Record<string, unknown>;
    const config = stored.config as Record<string, unknown> | undefined;
    const progress = stored.progress as Record<string, unknown> | undefined;

    if (stored.version !== AVATAR_STATE_VERSION || !config || !progress) {
      return DEFAULT_AVATAR_STATE;
    }

    return {
      version: AVATAR_STATE_VERSION,
      config: {
        modelId: config.modelId === 'base' ? 'base' : DEFAULT_AVATAR_STATE.config.modelId,
        outfitId: config.outfitId === 'default' ? 'default' : DEFAULT_AVATAR_STATE.config.outfitId,
        animation: config.animation === 'idle' ? 'idle' : DEFAULT_AVATAR_STATE.config.animation,
      },
      progress: {
        unlockedItemIds: isStringArray(progress.unlockedItemIds)
          ? progress.unlockedItemIds
          : DEFAULT_AVATAR_STATE.progress.unlockedItemIds,
      },
    };
  } catch {
    return DEFAULT_AVATAR_STATE;
  }
}

export function saveAvatarState(state: StoredAvatarState): void {
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silent fail: private/incognito mode or storage quota exceeded.
  }
}
```

- [ ] **Step 4: Verify TypeScript accepts the state layer**

Run:

```bash
npm run lint
```

Expected:

```text
no TypeScript or ESLint errors
```

- [ ] **Step 5: Commit avatar state files**

```bash
git add src/avatar/avatarConstants.ts src/avatar/avatarTypes.ts src/avatar/avatarStore.ts
git commit -m "feat: add avatar state contract"
```

---

### Task 3: Add Asset Availability And Runtime Boundary

**Files:**
- Create: `src/avatar/useAvatarAssetAvailability.ts`
- Create: `src/avatar/AvatarRuntimeBoundary.tsx`

- [ ] **Step 1: Create the asset availability hook**

Create `src/avatar/useAvatarAssetAvailability.ts`:

```ts
import { useEffect, useState } from 'react';
import { AVATAR_MODEL_URL } from './avatarConstants';

type AssetStatus = 'checking' | 'available' | 'missing';

async function checkAsset(url: string, signal: AbortSignal): Promise<boolean> {
  try {
    const head = await fetch(url, { method: 'HEAD', signal });
    if (head.ok) return true;
    if (head.status !== 405) return false;
  } catch {
    if (signal.aborted) return false;
  }

  try {
    const get = await fetch(url, {
      method: 'GET',
      headers: { Range: 'bytes=0-0' },
      signal,
    });
    return get.ok || get.status === 206;
  } catch {
    return false;
  }
}

export function useAvatarAssetAvailability(url = AVATAR_MODEL_URL): AssetStatus {
  const [status, setStatus] = useState<AssetStatus>('checking');

  useEffect(() => {
    const controller = new AbortController();
    setStatus('checking');

    checkAsset(url, controller.signal).then((available) => {
      if (!controller.signal.aborted) {
        setStatus(available ? 'available' : 'missing');
      }
    });

    return () => controller.abort();
  }, [url]);

  return status;
}
```

- [ ] **Step 2: Create the runtime error boundary**

Create `src/avatar/AvatarRuntimeBoundary.tsx`:

```tsx
import React from 'react';

interface AvatarRuntimeBoundaryProps {
  children: React.ReactNode;
}

interface AvatarRuntimeBoundaryState {
  hasError: boolean;
}

export class AvatarRuntimeBoundary extends React.Component<AvatarRuntimeBoundaryProps, AvatarRuntimeBoundaryState> {
  state: AvatarRuntimeBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): AvatarRuntimeBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.warn('Avatar renderer failed; hiding avatar.', error);
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
```

- [ ] **Step 3: Verify boundary and hook compile**

Run:

```bash
npm run lint
```

Expected:

```text
no TypeScript or ESLint errors
```

- [ ] **Step 4: Commit asset guard files**

```bash
git add src/avatar/useAvatarAssetAvailability.ts src/avatar/AvatarRuntimeBoundary.tsx
git commit -m "feat: guard avatar asset loading"
```

---

### Task 4: Add Avatar Renderer Components

**Files:**
- Create: `src/avatar/AvatarModel.tsx`
- Create: `src/avatar/AvatarScene.tsx`
- Create: `src/avatar/AvatarPresenter.tsx`

- [ ] **Step 1: Create the GLB model component**

Create `src/avatar/AvatarModel.tsx`:

```tsx
import { useEffect, useRef } from 'react';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Group } from 'three';
import { AVATAR_MODEL_URL } from './avatarConstants';

interface AvatarModelProps {
  url?: string;
}

export function AvatarModel({ url = AVATAR_MODEL_URL }: AvatarModelProps) {
  const groupRef = useRef<Group>(null);
  const gltf = useGLTF(url);
  const { actions, names } = useAnimations(gltf.animations, groupRef);

  useEffect(() => {
    const idleName = names.find((name) => name.toLowerCase().includes('idle')) ?? names[0];
    if (!idleName) return;

    const action = actions[idleName];
    action?.reset().fadeIn(0.2).play();

    return () => {
      action?.fadeOut(0.2);
    };
  }, [actions, names]);

  return (
    <group ref={groupRef} position={[0, -1.65, 0]} rotation={[0, 0, 0]} scale={1.45}>
      <primitive object={gltf.scene} />
    </group>
  );
}
```

- [ ] **Step 2: Create the scene component**

Create `src/avatar/AvatarScene.tsx`:

```tsx
import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { AvatarModel } from './AvatarModel';

interface AvatarSceneProps {
  className?: string;
}

export function AvatarScene({ className }: AvatarSceneProps) {
  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 1.2, 5.2], fov: 32 }}
        dpr={[1, 1.5]}
        gl={{ alpha: true, antialias: true }}
        style={{ width: '100%', height: '100%', background: 'transparent' }}
      >
        <ambientLight intensity={1.4} />
        <directionalLight position={[2.5, 4, 4]} intensity={2.4} />
        <directionalLight position={[-3, 2, 2]} intensity={0.7} />
        <Suspense fallback={null}>
          <AvatarModel />
        </Suspense>
      </Canvas>
    </div>
  );
}
```

- [ ] **Step 3: Create the screen-facing presenter**

Create `src/avatar/AvatarPresenter.tsx`:

```tsx
import { AvatarRuntimeBoundary } from './AvatarRuntimeBoundary';
import { AvatarScene } from './AvatarScene';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { useAvatarAssetAvailability } from './useAvatarAssetAvailability';

interface AvatarPresenterProps {
  className?: string;
  label?: string;
}

export function AvatarPresenter({
  className,
  label = 'Animovaný sprievodca',
}: AvatarPresenterProps) {
  const assetStatus = useAvatarAssetAvailability(AVATAR_MODEL_URL);

  if (assetStatus !== 'available') return null;

  return (
    <div className={className} role="img" aria-label={label}>
      <AvatarRuntimeBoundary>
        <AvatarScene className="h-full w-full" />
      </AvatarRuntimeBoundary>
    </div>
  );
}
```

- [ ] **Step 4: Verify renderer components compile**

Run:

```bash
npm run lint
```

Expected:

```text
no TypeScript or ESLint errors
```

- [ ] **Step 5: Commit renderer components**

```bash
git add src/avatar/AvatarModel.tsx src/avatar/AvatarScene.tsx src/avatar/AvatarPresenter.tsx
git commit -m "feat: add idle avatar renderer"
```

---

### Task 5: Add Avatar Preview Route

**Files:**
- Create: `src/avatar/AvatarPreviewScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the preview screen**

Create `src/avatar/AvatarPreviewScreen.tsx`:

```tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { AvatarPresenter } from './AvatarPresenter';
import { AVATAR_MODEL_URL } from './avatarConstants';
import { useAvatarAssetAvailability } from './useAvatarAssetAvailability';

export function AvatarPreviewScreen() {
  const navigate = useNavigate();
  const assetStatus = useAvatarAssetAvailability(AVATAR_MODEL_URL);

  return (
    <div className="min-h-[100svh] bg-bg-light p-4 sm:p-6 lg:p-8">
      <button
        onClick={() => navigate('/')}
        className="safe-top safe-left fixed z-20 flex h-14 w-14 items-center justify-center rounded-full bg-white text-text-main shadow-chip transition-transform hover:scale-105 active:scale-95"
        aria-label="Späť"
      >
        <ArrowLeft size={30} />
      </button>

      <main className="mx-auto flex min-h-[calc(100svh-2rem)] max-w-5xl flex-col items-center justify-center gap-6 text-center">
        <div className="h-[min(72svh,680px)] w-[min(82vw,520px)]">
          <AvatarPresenter className="h-full w-full" />
        </div>
        <div>
          <h1 className="text-[clamp(2rem,5vw,4rem)] font-black leading-none text-text-main">
            Avatar Preview
          </h1>
          <p className="mt-3 text-lg font-semibold opacity-70 sm:text-2xl">
            Asset: {AVATAR_MODEL_URL}
          </p>
          <p className="mt-1 text-base font-semibold opacity-60 sm:text-xl">
            Status: {assetStatus}
          </p>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Import the preview screen in `src/App.tsx`**

Add this import near the other route imports:

```ts
import { AvatarPreviewScreen } from './avatar/AvatarPreviewScreen';
```

- [ ] **Step 3: Add the preview route in `src/App.tsx`**

Add this route before the wildcard route:

```tsx
          <Route
            path="/avatar-preview"
            element={
              <ErrorBoundary>
                <AvatarPreviewScreen />
              </ErrorBoundary>
            }
          />
```

- [ ] **Step 4: Verify the preview route compiles**

Run:

```bash
npm run lint
```

Expected:

```text
no TypeScript or ESLint errors
```

- [ ] **Step 5: Commit preview route**

```bash
git add src/avatar/AvatarPreviewScreen.tsx src/App.tsx
git commit -m "feat: add avatar preview route"
```

---

### Task 6: Add Home Overlay Without Layout Integration

**Files:**
- Create: `src/avatar/HomeAvatarOverlay.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create the home overlay component**

Create `src/avatar/HomeAvatarOverlay.tsx`:

```tsx
import { AvatarPresenter } from './AvatarPresenter';

export function HomeAvatarOverlay() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 right-0 z-10 h-[34svh] min-h-[210px] w-[min(34vw,340px)] min-w-[180px] translate-x-[8%] sm:h-[42svh] sm:min-h-[300px] sm:w-[min(30vw,420px)] lg:h-[50svh] lg:min-h-[380px] lg:w-[min(26vw,460px)]"
    >
      <AvatarPresenter className="h-full w-full" label="Animovaný sprievodca" />
    </div>
  );
}
```

- [ ] **Step 2: Import the overlay in `src/App.tsx`**

Add this import near the other avatar import:

```ts
import { HomeAvatarOverlay } from './avatar/HomeAvatarOverlay';
```

- [ ] **Step 3: Render the overlay inside `HomeLauncher`**

In `HomeLauncher`, add `<HomeAvatarOverlay />` near the end of the returned root `<div>`, after the background decorations:

```tsx
      <HomeAvatarOverlay />
```

The end of `HomeLauncher` should look like:

```tsx
      {/* Background Decorations */}
      <div aria-hidden="true" className="fixed top-1/3 -left-32 w-96 h-96 rounded-full bg-accent-blue opacity-[0.03] blur-[100px] pointer-events-none" />
      <div aria-hidden="true" className="fixed bottom-0 -right-32 w-[500px] h-[500px] rounded-full bg-primary opacity-[0.03] blur-[100px] pointer-events-none" />
      <HomeAvatarOverlay />
    </div>
  );
}
```

- [ ] **Step 4: Verify home overlay compiles**

Run:

```bash
npm run lint
```

Expected:

```text
no TypeScript or ESLint errors
```

- [ ] **Step 5: Commit home overlay**

```bash
git add src/avatar/HomeAvatarOverlay.tsx src/App.tsx
git commit -m "feat: add home avatar overlay"
```

---

### Task 7: Add Manual Asset Export Checkpoint

**Files:**
- Runtime asset: `public/avatar/base-idle.glb`

- [ ] **Step 1: Export the runtime GLB manually**

Use Blender or another visual 3D tool:

```text
1. Import /Users/svehla/Downloads/Basic/BaseModel.fbx.
2. Import /Users/svehla/Downloads/Basic/Animations/BaseModel@Idle.fbx.
3. Bind or retain the idle animation on the base character skeleton.
4. Set the model to face the camera direction used by the preview.
5. Normalize scale so the full body fits in the preview route.
6. Export as glTF 2.0 binary GLB to:
   /Users/svehla/playground/teo-learn/public/avatar/base-idle.glb
```

- [ ] **Step 2: Confirm the asset exists**

Run:

```bash
ls -lh public/avatar/base-idle.glb
```

Expected:

```text
public/avatar/base-idle.glb
```

- [ ] **Step 3: Commit the runtime asset**

The approved design records the selected base model as CC0, and the inspected source files are small enough for the repo. Commit the runtime GLB after export.

Run:

```bash
git add public/avatar/base-idle.glb
git commit -m "feat: add base idle avatar asset"
```

Expected:

```text
commit succeeds with message "feat: add base idle avatar asset"
```

---

### Task 8: Verify In Browser And Adjust Framing

**Files:**
- Modify if needed: `src/avatar/AvatarModel.tsx`
- Modify if needed: `src/avatar/AvatarScene.tsx`
- Modify if needed: `src/avatar/HomeAvatarOverlay.tsx`

- [ ] **Step 1: Start the dev server**

Run:

```bash
npm run dev
```

Expected:

```text
Local:   http://localhost:3000/
```

- [ ] **Step 2: Check the preview route**

Open:

```text
http://localhost:3000/avatar-preview
```

Expected visual result:

```text
The full avatar is visible, front-facing, and idling. Status reads: available.
```

- [ ] **Step 3: Check the home overlay**

Open:

```text
http://localhost:3000/
```

Expected visual result:

```text
The avatar appears as a fixed overlay and does not move the home header, game grid, or settings button.
```

- [ ] **Step 4: Adjust model framing if needed**

If the avatar is too high, too low, too large, or too small, modify only the transform in `src/avatar/AvatarModel.tsx`:

```tsx
  return (
    <group ref={groupRef} position={[0, -1.65, 0]} rotation={[0, 0, 0]} scale={1.45}>
      <primitive object={gltf.scene} />
    </group>
  );
```

Use these conservative adjustments:

```text
Too small: increase scale by 0.1
Too large: decrease scale by 0.1
Too high: decrease Y position by 0.1
Too low: increase Y position by 0.1
Facing sideways: adjust Y rotation by 1.5708 increments
```

- [ ] **Step 5: Adjust overlay placement if needed**

If the avatar overlaps the settings button or blocks meaningful game-card content, modify only the fixed positioning classes in `src/avatar/HomeAvatarOverlay.tsx`:

```tsx
      className="pointer-events-none fixed bottom-0 right-0 z-10 h-[34svh] min-h-[210px] w-[min(34vw,340px)] min-w-[180px] translate-x-[8%] sm:h-[42svh] sm:min-h-[300px] sm:w-[min(30vw,420px)] lg:h-[50svh] lg:min-h-[380px] lg:w-[min(26vw,460px)]"
```

Prefer decreasing width/height before moving it over important UI.

- [ ] **Step 6: Verify after visual adjustments**

Run:

```bash
npm run lint
npm run build
```

Expected:

```text
no TypeScript, ESLint, or production build errors
```

- [ ] **Step 7: Commit visual adjustments**

```bash
git add src/avatar/AvatarModel.tsx src/avatar/AvatarScene.tsx src/avatar/HomeAvatarOverlay.tsx
git commit -m "fix: tune avatar overlay framing"
```

If no files changed, skip this commit.

---

### Task 9: Final Verification

**Files:**
- No planned file changes

- [ ] **Step 1: Check worktree status**

Run:

```bash
git status --short
```

Expected:

```text
no output
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected:

```text
no TypeScript or ESLint errors
```

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected:

```text
built successfully
```

- [ ] **Step 4: Verify missing asset fallback**

Temporarily rename the runtime asset:

```bash
mv public/avatar/base-idle.glb public/avatar/base-idle.glb.disabled
```

Run:

```bash
npm run build
```

Expected:

```text
built successfully
```

Then restore the asset:

```bash
mv public/avatar/base-idle.glb.disabled public/avatar/base-idle.glb
```

- [ ] **Step 5: Record completion notes**

In the final implementation summary, include:

```text
Verified:
- npm run lint
- npm run build
- /avatar-preview renders when public/avatar/base-idle.glb exists
- / remains usable when public/avatar/base-idle.glb is missing
```

---

## Self-Review Notes

- Spec coverage:
  - Idle-only source decision is covered by Tasks 4 and 7.
  - Runtime GLB boundary is covered by Tasks 4 and 7.
  - Dedicated `src/avatar/` architecture is covered by Tasks 2 through 6.
  - Home overlay without layout integration is covered by Task 6.
  - Asset gate and graceful fallback are covered by Tasks 3, 5, 6, and 9.
  - Visual gate is covered by Task 8.
- The plan intentionally defers session-complete and success overlay integration until the home overlay passes visual validation.
- The plan avoids FBX/OBJ/MTL runtime loading.
