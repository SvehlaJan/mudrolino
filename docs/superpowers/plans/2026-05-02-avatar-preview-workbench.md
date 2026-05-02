# Avatar Preview Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `/avatar-preview` with a modular-avatar workbench for developing and testing planned avatar customization features.

**Architecture:** Keep the real React Three Fiber runtime path and remove the old Meshy comparison gallery. The preview page becomes a focused control surface around the modular male GLB, slot-ready avatar config, body-shape state, planned face controls, diagnostics, and persistence/reset actions.

**Tech Stack:** React, TypeScript, Tailwind CSS, React Three Fiber, drei GLTF loading, browser localStorage.

---

### Task 1: Runtime Defaults and Body Shape Propagation

**Files:**
- Modify: `src/avatar/avatarConstants.ts`
- Modify: `src/avatar/AvatarModel.tsx`
- Modify: `src/avatar/AvatarScene.tsx`
- Modify: `src/avatar/AvatarPresenter.tsx`

- [ ] **Step 1: Point the default avatar URL at the modular male GLB**

Change `src/avatar/avatarConstants.ts` so `AVATAR_MODEL_URL` is the modular male asset:

```ts
export const AVATAR_MODULAR_MALE_MODEL_URL = '/avatar/modular/male-base-modular.glb';
export const AVATAR_MODEL_URL = AVATAR_MODULAR_MALE_MODEL_URL;
```

- [ ] **Step 2: Add body shape props through the runtime**

Add `bodyShape?: AvatarBodyShapeConfig` to `AvatarModel`, `AvatarScene`, and `AvatarPresenter`. Pass it through each layer to `AvatarModel`.

- [ ] **Step 3: Apply safe uniform preview scaling**

In `AvatarModel`, multiply the normalized model scale by `bodyShape?.scale ?? 1`. Clamp the scale between `0.8` and `1.2` to avoid breaking framing.

- [ ] **Step 4: Run typecheck**

Run: `npm run lint`

Expected: TypeScript passes; the existing React Refresh warning may remain.

- [ ] **Step 5: Commit**

```bash
git add src/avatar/avatarConstants.ts src/avatar/AvatarModel.tsx src/avatar/AvatarScene.tsx src/avatar/AvatarPresenter.tsx
git commit -m "feat: use modular avatar runtime default"
```

### Task 2: Avatar Preview Workbench UI

**Files:**
- Rewrite: `src/avatar/AvatarPreviewScreen.tsx`

- [ ] **Step 1: Replace asset-gallery state with avatar config state**

Initialize preview state from `loadAvatarState()`. Keep local update helpers for `animation`, `slotSelections.top`, `face`, and `bodyShape`.

- [ ] **Step 2: Render workbench controls**

Render grouped controls:

- Base: `male` active, `female` disabled/planned.
- Animation: `idle`, `success`, `failure`.
- Top: `top_blue_tshirt`, `top_green_hoodie`.
- Future slots: `bottom`, `shoes`, `hair`, `accessory` disabled/planned.
- Face: placeholder active, generated decal disabled/planned.
- Body shape: scale range plus build/height choices.
- State: persist, reset preview, reset persisted.

- [ ] **Step 3: Render live preview and diagnostics**

Use `AvatarPresenter` with:

```tsx
modelUrl={AVATAR_MODULAR_MALE_MODEL_URL}
animationName={previewState.config.animation}
slotSelections={previewState.config.slotSelections}
bodyShape={previewState.config.bodyShape}
```

Diagnostics should show model URL, asset status, available animation clip names, selected mesh, local preview JSON, and persisted storage JSON.

- [ ] **Step 4: Run typecheck**

Run: `npm run lint`

Expected: TypeScript passes; the existing React Refresh warning may remain.

- [ ] **Step 5: Commit**

```bash
git add src/avatar/AvatarPreviewScreen.tsx
git commit -m "feat: rebuild avatar preview workbench"
```

### Task 3: Remove Old Public Meshy Assets and Update Docs

**Files:**
- Delete: `public/avatar/meshy/*.glb`
- Modify: `docs/3d-avatar-knowledge-base.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Delete app-facing old Meshy GLBs**

Remove old fixed-avatar POC files from `public/avatar/meshy/`. Keep source generation outputs under `meshy_output/`.

- [ ] **Step 2: Update durable documentation**

Update the knowledge base so current runtime/default assets refer to `/avatar/modular/male-base-modular.glb`, and old Meshy public assets are documented as removed from app-facing runtime.

- [ ] **Step 3: Update roadmap**

Mark the preview workbench as done and revise the old public Meshy asset entry so it does not imply the app still ships those files.

- [ ] **Step 4: Run reference scan**

Run: `rg -n "avatar/meshy|neutral-parent|clean-cheer|meshy-" src public ROADMAP.md docs/3d-avatar-knowledge-base.md`

Expected: no app/runtime references remain; docs may only mention historical source Meshy output and Blender command examples.

- [ ] **Step 5: Commit**

```bash
git add public/avatar/meshy docs/3d-avatar-knowledge-base.md ROADMAP.md
git commit -m "chore: remove old avatar poc assets"
```

### Task 4: Verification

**Files:**
- No source changes expected unless verification finds a bug.

- [ ] **Step 1: Run static checks**

Run:

```bash
npm run lint
npm run build
```

Expected: both pass; the existing chunk-size warning may remain in build output.

- [ ] **Step 2: Run browser verification**

Start `npm run dev`, then verify `/avatar-preview` on desktop and mobile with Playwright or headless Chrome.

Checks:

- modular male avatar renders nonblank
- old Meshy asset choices are not present
- `Modré tričko` and `Zelená mikina` toggle successfully
- future slots are visible and disabled/planned
- body scale changes the rendered canvas without blanking
- persist/reset actions update localStorage

- [ ] **Step 3: Update knowledge base with final verification**

Record verification date, checks, screenshots, and any residual limitations.

- [ ] **Step 4: Commit verification docs**

```bash
git add docs/3d-avatar-knowledge-base.md
git commit -m "docs: record avatar workbench verification"
```
