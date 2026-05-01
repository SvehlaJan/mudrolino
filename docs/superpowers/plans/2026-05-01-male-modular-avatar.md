# Male Modular Avatar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first customizable avatar foundation: a scratch-generated male-coded parent/caregiver base, one modular GLB with two top-slot variants, slot-ready local state, runtime mesh toggling, and parent-facing top selection.

**Architecture:** Generate and rig the male underlayer base with Meshy, then use Blender to create one modular GLB containing the base body, head, face patch, and two named top meshes. Runtime code migrates from `outfitId` to a slot-selection catalog, toggles `top_*` mesh visibility in `AvatarModel`, and exposes top selection in the parent Settings flow.

**Tech Stack:** Meshy local helper (`tools/meshy/meshy_ops.py`), Blender CLI/Python, glTF Validator, glTF Transform CLI, React 19, React Three Fiber, Drei, Three.js, TypeScript, Vite.

---

## Current Context

Approved design:

- `docs/superpowers/specs/2026-05-01-male-modular-avatar-design.md`
- durable context in `docs/3d-avatar-knowledge-base.md`

Current Meshy balance checked on 2026-05-01:

```json
{
  "balance": 1559
}
```

Credit expectations from current Meshy API pricing:

- Text to 3D preview with Meshy-6/latest standard model: `20` credits
- Optional Text to 3D refine if we need Meshy texturing: `10` credits
- Auto-rigging: `5` credits
- Animation: `3` credits per clip, not planned for this first base pass

Do not run any command with `--confirm-spend` until the user approves the specific cost.

Current working tree note:

- `package.json`, `package-lock.json`, and `tools/avatar/validate_gltf.js` may already contain uncommitted glTF QA tooling from the prior step. Task 1 formalizes and commits that tooling before asset work continues.

## File Structure

Asset and tooling files:

- `tools/avatar/validate_gltf.js`: CLI wrapper around `gltf-validator`.
- `tools/blender/inspect_avatar_glb.py`: existing GLB inspection script.
- `tools/blender/export_male_modular_avatar.py`: create this script to validate the manually prepared Blender scene and export the modular GLB.
- `meshy_output/$PROJECT_DIR/`: Meshy-generated source outputs only.
- `public/avatar/modular/male-base-modular.glb`: final MVP runtime asset.

Avatar runtime files:

- `src/avatar/avatarConstants.ts`: add modular asset URL and bump storage version.
- `src/avatar/avatarTypes.ts`: replace `outfitId` with base/slot/face/body-shape config.
- `src/avatar/avatarCatalog.ts`: create centralized slot/item catalog.
- `src/avatar/avatarStore.ts`: migrate old versioned state to the new config shape.
- `src/avatar/AvatarModel.tsx`: accept selected slots and toggle `top_*` mesh visibility.
- `src/avatar/AvatarScene.tsx`: pass selected slots to `AvatarModel`.
- `src/avatar/AvatarPresenter.tsx`: pass selected slots to `AvatarScene`.
- `src/avatar/AvatarPreviewScreen.tsx`: add modular male preview asset and slot toggle controls for inspection.
- `src/avatar/HomeAvatarOverlay.tsx`: load stored avatar selection for home overlay.

Settings UI files:

- `src/avatar/useAvatarState.ts`: create hook for loading/saving avatar state in React.
- `src/avatar/AvatarCustomizationSettings.tsx`: create parent-facing top selector.
- `src/shared/components/SettingsContent.tsx`: add avatar customization card on home settings.
- `src/shared/components/settingsContentData.ts`: add `avatar` visibility flag for home only.

Docs:

- `docs/3d-avatar-knowledge-base.md`: append asset task outputs and validation findings as they happen.
- `ROADMAP.md`: mark completed avatar subtasks as they land.

---

### Task 1: Commit glTF QA Tooling

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `tools/avatar/validate_gltf.js`

- [ ] **Step 1: Confirm dependencies are present**

Run:

```bash
npm ls gltf-validator @gltf-transform/cli
```

Expected: both packages are listed under the project, with no missing dependency error.

- [ ] **Step 2: Ensure package scripts are present**

`package.json` must include:

```json
{
  "scripts": {
    "avatar:gltf:inspect": "gltf-transform inspect",
    "avatar:gltf:validate": "node tools/avatar/validate_gltf.js"
  },
  "devDependencies": {
    "@gltf-transform/cli": "^4.3.0",
    "gltf-validator": "^2.0.0-dev.3.10"
  }
}
```

Keep the existing scripts and dependencies; only add the keys above if they are missing.

- [ ] **Step 3: Ensure validator helper exists**

`tools/avatar/validate_gltf.js` must contain:

```js
import { readFileSync } from 'node:fs';
import validator from 'gltf-validator';

const target = process.argv[2];

if (!target) {
  console.error('Usage: npm run avatar:gltf:validate -- <asset.glb>');
  process.exit(1);
}

const report = await validator.validateBytes(new Uint8Array(readFileSync(target)), {
  uri: target,
  format: target.endsWith('.glb') ? 'glb' : undefined,
  maxIssues: 50,
});

const { numErrors, numWarnings, numInfos, numHints, messages } = report.issues;

console.log(
  JSON.stringify(
    {
      asset: target,
      errors: numErrors,
      warnings: numWarnings,
      infos: numInfos,
      hints: numHints,
      messages: messages.slice(0, 10).map((message) => ({
        severity: message.severity,
        code: message.code,
        message: message.message,
        pointer: message.pointer,
      })),
    },
    null,
    2,
  ),
);

if (numErrors > 0) {
  process.exit(1);
}
```

- [ ] **Step 4: Verify the tools on an existing GLB**

Run:

```bash
npm run avatar:gltf:validate -- public/avatar/meshy/neutral-parent-success-cheer-clean.glb
npm run avatar:gltf:inspect -- public/avatar/meshy/neutral-parent-success-cheer-clean.glb
```

Expected:

- validator exits `0`
- validator reports `errors: 0`
- inspect prints overview, scene, mesh, material, texture, and animation tables

Known acceptable current warning:

```text
NODE_SKINNED_MESH_NON_ROOT
```

- [ ] **Step 5: Run regression checks**

Run:

```bash
npm run lint
npm run build
```

Expected:

- `npm run lint` exits `0`; current Fast Refresh warning in `ContentContext.tsx` may remain.
- `npm run build` exits `0`; current large chunk warning may remain.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tools/avatar/validate_gltf.js
git commit -m "chore: add gltf asset QA tooling"
```

---

### Task 2: Generate Male Underlayer Base With Meshy

**Files:**
- Create under: `meshy_output/`
- Modify: `docs/3d-avatar-knowledge-base.md`

- [ ] **Step 1: Check balance**

Run:

```bash
python3 tools/meshy/meshy_ops.py balance
```

Expected: JSON response with a numeric `balance.balance`. If DNS/network fails in the sandbox, rerun outside the sandbox with escalation.

- [ ] **Step 2: Present cost and wait for approval**

Show the user this cost summary before spending:

```text
Planned Meshy operation: Text to 3D preview for male-coded parent/caregiver underlayer base.
Expected cost: 20 credits using Meshy-6/latest standard text-to-3D preview.
Current checked balance: the numeric balance from Step 1.
No refine, rigging, remesh, or animation will be run in this step.
```

Wait for explicit approval. Do not proceed on ambiguous approval.

- [ ] **Step 3: Run text-to-3D preview after approval**

Prompt:

```text
Semi-stylized friendly male parent caregiver avatar for a preschool learning app. Warm calm adult, soft average proportions, smooth skin-toned modest mannequin underlayer with no anatomical detail, simple placeholder face, neutral front-facing A-pose, arms slightly away from body, matte clean 3D, no clothing, no accessories, no photorealism.
```

Run only after approval:

```bash
python3 tools/meshy/meshy_ops.py text-to-3d-preview \
  --project-name male-parent-underlayer-base-v1 \
  --prompt "Semi-stylized friendly male parent caregiver avatar for a preschool learning app. Warm calm adult, soft average proportions, smooth skin-toned modest mannequin underlayer with no anatomical detail, simple placeholder face, neutral front-facing A-pose, arms slightly away from body, matte clean 3D, no clothing, no accessories, no photorealism." \
  --ai-model latest \
  --model-type standard \
  --topology quad \
  --target-polycount 30000 \
  --should-remesh \
  --symmetry-mode on \
  --pose-mode a-pose \
  --wait \
  --download-glb \
  --confirm-spend
```

Expected:

- JSON contains `task_id`
- JSON contains `project_dir`
- `project_dir` is inside `meshy_output/`
- downloaded GLB path exists

- [ ] **Step 4: Record task metadata**

Add a short entry to `docs/3d-avatar-knowledge-base.md` under Asset Inventory or Current Roadmap:

```markdown
- Male modular base preview task:
  - task id: `$PREVIEW_TASK_ID`
  - project dir: `$PROJECT_DIR`
  - downloaded preview GLB: `$BASE_GLB`
  - cost: `20` credits
```

- [ ] **Step 5: Commit metadata only**

Do not commit raw generated GLBs yet unless the user has visually accepted the base.

```bash
git add docs/3d-avatar-knowledge-base.md
git commit -m "docs: record male avatar base generation"
```

---

### Task 3: Inspect and Accept/Reject Generated Base

**Files:**
- Read: generated GLB under `meshy_output/`
- Modify: `docs/3d-avatar-knowledge-base.md`

- [ ] **Step 1: Validate GLB**

Replace `$BASE_GLB` with the downloaded preview GLB path from Task 2.

```bash
npm run avatar:gltf:validate -- $BASE_GLB
npm run avatar:gltf:inspect -- $BASE_GLB
```

Expected:

- validator has `errors: 0`
- inspect shows a humanoid mesh with reasonable vertex/texture stats

- [ ] **Step 2: Inspect in Blender**

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/inspect_avatar_glb.py \
  -- $BASE_GLB
```

If Blender crashes before Python output and crash log mentions Metal/GPU/backend startup, rerun outside the sandbox with escalation.

Expected for preview mesh:

- mesh imports successfully
- no armature is required yet
- object count and mesh names are reported

- [ ] **Step 3: Visual acceptance check**

Open the GLB in Blender UI or an existing local viewer and evaluate:

- Full-body adult-like parent/caregiver proportions.
- No fixed shirt, jacket, shoes, accessories, or busy surface detail.
- Skin-toned underlayer is modest and non-anatomical.
- Arms are separated enough from torso for rigging and top fitting.
- Head is usable for a future face patch.
- No severe mesh holes, doubled limbs, deformed hands, or unusable topology.

Decision:

- If accepted, continue to Task 4.
- If rejected, update the prompt and repeat Task 2 as `male-parent-underlayer-base-v2` after a new approval/cost summary.

- [ ] **Step 4: Record acceptance decision**

Append to `docs/3d-avatar-knowledge-base.md`:

```markdown
Decision: accepted/rejected male underlayer base preview `$PREVIEW_TASK_ID`.
Reason: the concrete acceptance or rejection reason.
```

- [ ] **Step 5: Commit decision**

```bash
git add docs/3d-avatar-knowledge-base.md
git commit -m "docs: record male avatar base review"
```

---

### Task 4: Rig Accepted Base With Meshy

**Files:**
- Create under: accepted Meshy `project_dir`
- Modify: `docs/3d-avatar-knowledge-base.md`

- [ ] **Step 1: Present cost and wait for approval**

Show the user:

```text
Planned Meshy operation: Auto-rig accepted male underlayer base.
Expected cost: 5 credits.
Input task id: $PREVIEW_TASK_ID.
Project directory: $PROJECT_DIR.
```

Wait for explicit approval before running.

- [ ] **Step 2: Run rig command after approval**

```bash
python3 tools/meshy/meshy_ops.py rig \
  --input-task-id $PREVIEW_TASK_ID \
  --project-dir $PROJECT_DIR \
  --height-meters 1.7 \
  --wait \
  --download-glb \
  --confirm-spend
```

Expected:

- JSON contains `rig_task_id`
- `rigged.glb` exists in the same project directory
- walking/running outputs may also be downloaded if provided by Meshy

- [ ] **Step 3: Validate rigged GLB**

```bash
npm run avatar:gltf:validate -- $PROJECT_DIR/rigged.glb
npm run avatar:gltf:inspect -- $PROJECT_DIR/rigged.glb
```

Expected:

- validator has `errors: 0`
- inspect shows one or more skins/armature data

- [ ] **Step 4: Inspect rig in Blender**

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/inspect_avatar_glb.py \
  -- $PROJECT_DIR/rigged.glb
```

Expected:

- one humanoid armature
- named bones include `Hips`, spine/head, arms, legs, and feet or close equivalents
- no catastrophic import errors

- [ ] **Step 5: Record rig metadata**

Append to `docs/3d-avatar-knowledge-base.md`:

```markdown
- Male underlayer rig task:
  - rig task id: `$RIG_TASK_ID`
  - rigged GLB: `$PROJECT_DIR/rigged.glb`
  - cost: `5` credits
  - armature summary: the inspected bone count and key bone names
```

- [ ] **Step 6: Commit metadata**

```bash
git add docs/3d-avatar-knowledge-base.md
git commit -m "docs: record male avatar rigging"
```

---

### Task 5: Export MVP Modular Male GLB From Blender

**Files:**
- Create: `tools/blender/export_male_modular_avatar.py`
- Create under Meshy project dir: `$PROJECT_DIR/male-base-modular-working.blend`
- Create: `public/avatar/modular/male-base-modular.glb`
- Modify: `docs/3d-avatar-knowledge-base.md`

- [ ] **Step 1: Create output directory**

```bash
mkdir -p public/avatar/modular
```

- [ ] **Step 2: Create Blender working scene**

Open the accepted rigged base in Blender UI:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' $PROJECT_DIR/rigged.glb
```

Create `$PROJECT_DIR/male-base-modular-working.blend` with this object contract:

```text
Armature
body_underlayer_male
face_anchor
top_blue_tshirt
top_green_hoodie
```

Required modeling steps:

- Rename the imported armature object to `Armature` if Blender imported a different armature object name.
- Rename the primary underlayer mesh to `body_underlayer_male`.
- Create `face_anchor` as a small face patch mesh in front of the placeholder face. It should be visible, flat or gently curved, and assigned a neutral placeholder material.
- Create `top_blue_tshirt` as a fitted upper-body shell over the torso/upper arms. Assign a matte blue material.
- Create `top_green_hoodie` as a fitted upper-body shell over the torso/upper arms. Assign a matte green material and a slightly bulkier hoodie-like silhouette.
- Parent/skinning: top meshes must follow `Armature` when the avatar animates. Use the same armature modifier / vertex groups as the base mesh, or duplicate the relevant upper-body shell from the skinned base so weights are preserved.
- Keep both top meshes visible in the `.blend`; runtime code will toggle visibility after GLB load.
- Save the Blender file to `$PROJECT_DIR/male-base-modular-working.blend`.

Acceptance criteria before export:

- Object names exactly match the contract.
- Top meshes do not cover the head, hands, or lower legs.
- Top meshes visibly differ in color and shape.
- The underlayer remains visible where no top covers it.
- The model remains modest and non-anatomical if a top is hidden.

- [ ] **Step 3: Create Blender export script**

Create `tools/blender/export_male_modular_avatar.py`:

```python
"""Validate and export the male modular avatar working scene as GLB.

Run Blender with the working .blend file already open, then pass --output.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import bpy

REQUIRED_OBJECTS = [
    "Armature",
    "body_underlayer_male",
    "face_anchor",
    "top_blue_tshirt",
    "top_green_hoodie",
]


def parse_args() -> argparse.Namespace:
    argv = sys.argv
    script_args = argv[argv.index("--") + 1 :] if "--" in argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args(script_args)


def require_object(name: str) -> bpy.types.Object:
    obj = bpy.data.objects.get(name)
    if obj is None:
        raise RuntimeError(f"Missing required object: {name}")
    return obj


def validate_scene() -> list[bpy.types.Object]:
    objects = [require_object(name) for name in REQUIRED_OBJECTS]
    armature = bpy.data.objects["Armature"]
    if armature.type != "ARMATURE":
        raise RuntimeError("Armature object must have type ARMATURE")

    for name in ["body_underlayer_male", "face_anchor", "top_blue_tshirt", "top_green_hoodie"]:
        obj = bpy.data.objects[name]
        if obj.type != "MESH":
            raise RuntimeError(f"{name} must have type MESH, found {obj.type}")

    for obj in objects:
        obj.select_set(False)
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.hide_render = False

    unexpected_tops = [
        obj.name
        for obj in bpy.context.scene.objects
        if obj.name.startswith("top_") and obj.name not in {"top_blue_tshirt", "top_green_hoodie"}
    ]
    if unexpected_tops:
        raise RuntimeError(f"Unexpected top meshes: {unexpected_tops}")

    return objects


def export_glb(output: Path, objects: list[bpy.types.Object]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["Armature"]
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_animation_mode="ACTIVE_ACTIONS",
        export_force_sampling=False,
        export_nla_strips=False,
        export_bake_animation=False,
    )


def main() -> None:
    args = parse_args()
    objects = validate_scene()
    export_glb(args.output, objects)
    print(f"Exported male modular avatar: {args.output}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run export script**

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  $PROJECT_DIR/male-base-modular-working.blend \
  --background \
  --enable-autoexec \
  --python tools/blender/export_male_modular_avatar.py \
  -- \
  --output public/avatar/modular/male-base-modular.glb
```

Expected:

- command exits `0`
- `public/avatar/modular/male-base-modular.glb` exists

- [ ] **Step 5: Validate exported modular GLB**

```bash
npm run avatar:gltf:validate -- public/avatar/modular/male-base-modular.glb
npm run avatar:gltf:inspect -- public/avatar/modular/male-base-modular.glb
```

Expected:

- validator has `errors: 0`
- inspect output includes multiple meshes or nodes matching:
  - `body_underlayer_male`
  - `face_anchor`
  - `top_blue_tshirt`
  - `top_green_hoodie`

- [ ] **Step 6: Commit asset and script**

```bash
git add tools/blender/export_male_modular_avatar.py public/avatar/modular/male-base-modular.glb docs/3d-avatar-knowledge-base.md
git commit -m "feat: add male modular avatar asset"
```

---

### Task 6: Add Avatar Catalog and State Migration

**Files:**
- Modify: `src/avatar/avatarConstants.ts`
- Modify: `src/avatar/avatarTypes.ts`
- Create: `src/avatar/avatarCatalog.ts`
- Modify: `src/avatar/avatarStore.ts`

- [ ] **Step 1: Update constants**

Set `AVATAR_STATE_VERSION` to `2` and add the modular asset URL:

```ts
export const AVATAR_MODEL_URL = '/avatar/meshy/neutral-parent-rigged.glb';
export const AVATAR_MODULAR_MALE_MODEL_URL = '/avatar/modular/male-base-modular.glb';
export const AVATAR_STORAGE_KEY = 'hrave-ucenie-avatar-state';
export const AVATAR_STATE_VERSION = 2;
export const AVATAR_POC_ENABLED = import.meta.env.VITE_AVATAR_POC_ENABLED === 'true';
```

- [ ] **Step 2: Replace avatar types**

Update `src/avatar/avatarTypes.ts`:

```ts
import { AVATAR_STATE_VERSION } from './avatarConstants';

export type AvatarBaseVariant = 'male';
export type AvatarSlot = 'top' | 'bottom' | 'shoes' | 'hair' | 'accessory';
export type AvatarAnimationName = 'idle' | 'success' | 'failure';
export type AvatarTopItemId = 'top_blue_tshirt' | 'top_green_hoodie';

export interface AvatarSlotSelections {
  top: AvatarTopItemId;
}

export interface AvatarFaceConfig {
  mode: 'placeholder' | 'generated_decal';
  assetUrl: string | null;
}

export interface AvatarBodyShapeConfig {
  scale: number;
  build: 'average' | 'slim' | 'sturdy';
  height: 'average' | 'short' | 'tall';
}

export interface AvatarConfig {
  baseVariant: AvatarBaseVariant;
  animation: AvatarAnimationName;
  slotSelections: AvatarSlotSelections;
  face: AvatarFaceConfig;
  bodyShape: AvatarBodyShapeConfig;
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

- [ ] **Step 3: Create catalog**

Create `src/avatar/avatarCatalog.ts`:

```ts
import { AvatarBaseVariant, AvatarSlot, AvatarTopItemId } from './avatarTypes';

export interface AvatarCatalogItem {
  id: AvatarTopItemId;
  slot: AvatarSlot;
  label: string;
  meshName: string;
  compatibleBaseVariants: AvatarBaseVariant[];
}

export const DEFAULT_AVATAR_TOP: AvatarTopItemId = 'top_blue_tshirt';

export const AVATAR_TOP_ITEMS: AvatarCatalogItem[] = [
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
];

export function isAvatarTopItemId(value: unknown): value is AvatarTopItemId {
  return AVATAR_TOP_ITEMS.some((item) => item.id === value);
}
```

- [ ] **Step 4: Update store with migration**

Update `src/avatar/avatarStore.ts`:

```ts
import { AVATAR_STATE_VERSION, AVATAR_STORAGE_KEY } from './avatarConstants';
import { DEFAULT_AVATAR_TOP, isAvatarTopItemId } from './avatarCatalog';
import { AvatarAnimationName, AvatarBodyShapeConfig, StoredAvatarState } from './avatarTypes';

const DEFAULT_BODY_SHAPE: AvatarBodyShapeConfig = {
  scale: 1,
  build: 'average',
  height: 'average',
};

export function createDefaultAvatarState(): StoredAvatarState {
  return {
    version: AVATAR_STATE_VERSION,
    config: {
      baseVariant: 'male',
      animation: 'idle',
      slotSelections: {
        top: DEFAULT_AVATAR_TOP,
      },
      face: {
        mode: 'placeholder',
        assetUrl: null,
      },
      bodyShape: DEFAULT_BODY_SHAPE,
    },
    progress: {
      unlockedItemIds: [],
    },
  };
}

export const DEFAULT_AVATAR_STATE: StoredAvatarState = createDefaultAvatarState();

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function coerceAnimation(value: unknown): AvatarAnimationName {
  return value === 'success' || value === 'failure' || value === 'idle' ? value : 'idle';
}

export function loadAvatarState(): StoredAvatarState {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return createDefaultAvatarState();

    const stored = JSON.parse(raw) as Record<string, unknown>;
    const config = stored.config as Record<string, unknown> | undefined;
    const progress = stored.progress as Record<string, unknown> | undefined;

    if (!config || !progress) return createDefaultAvatarState();

    const slotSelections = config.slotSelections as Record<string, unknown> | undefined;
    const face = config.face as Record<string, unknown> | undefined;
    const bodyShape = config.bodyShape as Record<string, unknown> | undefined;

    return {
      version: AVATAR_STATE_VERSION,
      config: {
        baseVariant: 'male',
        animation: coerceAnimation(config.animation),
        slotSelections: {
          top: isAvatarTopItemId(slotSelections?.top) ? slotSelections.top : DEFAULT_AVATAR_TOP,
        },
        face: {
          mode: face?.mode === 'generated_decal' ? 'generated_decal' : 'placeholder',
          assetUrl: typeof face?.assetUrl === 'string' ? face.assetUrl : null,
        },
        bodyShape: {
          scale: typeof bodyShape?.scale === 'number' ? bodyShape.scale : DEFAULT_BODY_SHAPE.scale,
          build:
            bodyShape?.build === 'slim' || bodyShape?.build === 'sturdy'
              ? bodyShape.build
              : DEFAULT_BODY_SHAPE.build,
          height:
            bodyShape?.height === 'short' || bodyShape?.height === 'tall'
              ? bodyShape.height
              : DEFAULT_BODY_SHAPE.height,
        },
      },
      progress: {
        unlockedItemIds: isStringArray(progress.unlockedItemIds)
          ? [...progress.unlockedItemIds]
          : [],
      },
    };
  } catch {
    return createDefaultAvatarState();
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

- [ ] **Step 5: Run type check**

```bash
npm run lint
```

Expected: no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add src/avatar/avatarConstants.ts src/avatar/avatarTypes.ts src/avatar/avatarCatalog.ts src/avatar/avatarStore.ts
git commit -m "feat: add avatar slot state"
```

---

### Task 7: Add Runtime Top Mesh Visibility

**Files:**
- Modify: `src/avatar/AvatarModel.tsx`
- Modify: `src/avatar/AvatarScene.tsx`
- Modify: `src/avatar/AvatarPresenter.tsx`

- [ ] **Step 1: Extend props**

Import `AvatarSlotSelections` and add `slotSelections?: AvatarSlotSelections` to all three component prop interfaces.

In `AvatarModel.tsx`, import:

```ts
import { AvatarSlotSelections } from './avatarTypes';
```

Add to `AvatarModelProps`:

```ts
slotSelections?: AvatarSlotSelections;
```

Repeat the prop addition in `AvatarSceneProps` and `AvatarPresenterProps`.

- [ ] **Step 2: Add top visibility helper**

In `AvatarModel.tsx`, add:

```ts
function applySlotVisibility(scene: Group, slotSelections?: AvatarSlotSelections) {
  const selectedTop = slotSelections?.top;

  scene.traverse((object) => {
    if (!object.name.startsWith('top_')) return;
    object.visible = selectedTop ? object.name === selectedTop : true;
  });
}
```

- [ ] **Step 3: Apply visibility during clone setup**

Change the `useMemo` dependency and body:

```ts
  const { scene, hipsAnchor } = useMemo(() => {
    const clonedScene = clone(gltf.scene);
    const hips = clonedScene.getObjectByName('Hips');
    clonedScene.updateMatrixWorld(true);
    clonedScene.traverse((object) => {
      if ('isMesh' in object || 'isSkinnedMesh' in object) {
        object.frustumCulled = false;
      }
    });
    applySlotVisibility(clonedScene, slotSelections);
```

Update dependency array:

```ts
  }, [gltf.scene, slotSelections]);
```

- [ ] **Step 4: Pass props through presenter and scene**

In `AvatarPresenter`, pass:

```tsx
slotSelections={slotSelections}
```

to `AvatarScene`.

In `AvatarScene`, pass:

```tsx
slotSelections={slotSelections}
```

to `AvatarModel`.

- [ ] **Step 5: Run checks**

```bash
npm run lint
npm run build
```

Expected: both commands exit `0`.

- [ ] **Step 6: Commit**

```bash
git add src/avatar/AvatarModel.tsx src/avatar/AvatarScene.tsx src/avatar/AvatarPresenter.tsx
git commit -m "feat: toggle avatar clothing slots"
```

---

### Task 8: Add Preview Support for Modular Male Asset

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`

- [ ] **Step 1: Extend preview asset type**

Add optional slot selections:

```ts
import { AVATAR_TOP_ITEMS, DEFAULT_AVATAR_TOP } from './avatarCatalog';
import { AvatarTopItemId } from './avatarTypes';
```

Update `PreviewAsset`:

```ts
interface PreviewAsset {
  id: string;
  label: string;
  description: string;
  modelUrl: string;
  animationUrl?: string;
  supportsTopSelection?: boolean;
}
```

- [ ] **Step 2: Add modular preview asset**

Append to `PREVIEW_ASSETS`:

```ts
{
  id: 'male-modular',
  label: 'Male modular base',
  description: 'Scratch-built male parent/caregiver base with top-slot variants',
  modelUrl: '/avatar/modular/male-base-modular.glb',
  supportsTopSelection: true,
}
```

- [ ] **Step 3: Add preview state**

Inside `AvatarPreviewScreen`:

```ts
const [selectedTop, setSelectedTop] = useState<AvatarTopItemId>(DEFAULT_AVATAR_TOP);
```

- [ ] **Step 4: Add top selector UI**

Below the animation selector, render this when `selectedAsset.supportsTopSelection`:

```tsx
{selectedAsset.supportsTopSelection && (
  <div className="mt-6">
    <p className="text-sm font-black uppercase tracking-[0.2em] opacity-50">Top</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {AVATAR_TOP_ITEMS.map((item) => {
        const isSelected = item.id === selectedTop;

        return (
          <button
            key={item.id}
            onClick={() => setSelectedTop(item.id)}
            className={`rounded-full px-4 py-2 text-sm font-black transition-colors ${
              isSelected
                ? 'bg-accent-blue text-white'
                : 'bg-white text-text-main shadow-chip hover:bg-accent-blue/10'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  </div>
)}
```

- [ ] **Step 5: Pass slot selection to presenter**

Update `AvatarPresenter` usage:

```tsx
slotSelections={selectedAsset.supportsTopSelection ? { top: selectedTop } : undefined}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm run lint
npm run build
npm run avatar:gltf:validate -- public/avatar/modular/male-base-modular.glb
```

Expected:

- lint/build exit `0`
- validation has `errors: 0`

- [ ] **Step 7: Commit**

```bash
git add src/avatar/AvatarPreviewScreen.tsx
git commit -m "feat: preview modular avatar tops"
```

---

### Task 9: Add Parent Settings Top Selection

**Files:**
- Create: `src/avatar/useAvatarState.ts`
- Create: `src/avatar/AvatarCustomizationSettings.tsx`
- Modify: `src/shared/components/settingsContentData.ts`
- Modify: `src/shared/components/SettingsContent.tsx`
- Modify: `src/avatar/HomeAvatarOverlay.tsx`

- [ ] **Step 1: Create avatar state hook**

Create `src/avatar/useAvatarState.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { loadAvatarState, saveAvatarState } from './avatarStore';
import { StoredAvatarState } from './avatarTypes';

export function useAvatarState() {
  const [avatarState, setAvatarState] = useState<StoredAvatarState>(() => loadAvatarState());

  useEffect(() => {
    saveAvatarState(avatarState);
  }, [avatarState]);

  const updateAvatarState = useCallback((nextState: StoredAvatarState) => {
    setAvatarState(nextState);
  }, []);

  return {
    avatarState,
    updateAvatarState,
  };
}
```

- [ ] **Step 2: Create customization settings component**

Create `src/avatar/AvatarCustomizationSettings.tsx`:

```tsx
import { Shirt } from 'lucide-react';
import { AVATAR_TOP_ITEMS } from './avatarCatalog';
import { StoredAvatarState } from './avatarTypes';
import { Button, Card } from '../shared/ui';

interface AvatarCustomizationSettingsProps {
  avatarState: StoredAvatarState;
  onUpdate: (state: StoredAvatarState) => void;
}

export function AvatarCustomizationSettings({
  avatarState,
  onUpdate,
}: AvatarCustomizationSettingsProps) {
  const selectedTop = avatarState.config.slotSelections.top;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-accent-blue/35 text-text-main sm:h-16 sm:w-16">
          <Shirt size={24} className="sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight sm:text-2xl">Avatar</h3>
          <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
            Vyberte oblečenie pre sprievodcu.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {AVATAR_TOP_ITEMS.map((item) => {
          const isSelected = item.id === selectedTop;

          return (
            <Button
              key={item.id}
              onClick={() =>
                onUpdate({
                  ...avatarState,
                  config: {
                    ...avatarState.config,
                    slotSelections: {
                      ...avatarState.config.slotSelections,
                      top: item.id,
                    },
                  },
                })
              }
              variant={isSelected ? 'primary' : 'secondary'}
              fullWidth
            >
              {item.label}
            </Button>
          );
        })}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Add settings visibility flag**

Update `SETTINGS_VISIBILITY` type in `src/shared/components/settingsContentData.ts`:

```ts
avatar: boolean;
```

Set `avatar: true` for `home`, and `avatar: false` for all game-specific targets.

- [ ] **Step 4: Render avatar settings on home**

In `SettingsContent.tsx`, import:

```ts
import { AvatarCustomizationSettings } from '../../avatar/AvatarCustomizationSettings';
import { useAvatarState } from '../../avatar/useAvatarState';
```

Inside `SettingsContent`:

```ts
const { avatarState, updateAvatarState } = useAvatarState();
```

Render after the recordings card:

```tsx
{visibility.avatar && (
  <AvatarCustomizationSettings
    avatarState={avatarState}
    onUpdate={updateAvatarState}
  />
)}
```

- [ ] **Step 5: Use stored top on home overlay**

Update `HomeAvatarOverlay.tsx`:

```tsx
import { useAvatarState } from './useAvatarState';
import { AvatarPresenter } from './AvatarPresenter';
import { AVATAR_MODULAR_MALE_MODEL_URL } from './avatarConstants';

export function HomeAvatarOverlay() {
  const { avatarState } = useAvatarState();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 m-auto h-[min(36svh,280px)] min-h-[170px] w-[min(36vw,280px)] min-w-[170px] translate-y-[7svh] sm:h-[min(42svh,340px)] sm:w-[min(30vw,340px)] lg:h-[min(46svh,380px)] lg:w-[min(26vw,380px)]"
    >
      <AvatarPresenter
        className="h-full w-full"
        modelUrl={AVATAR_MODULAR_MALE_MODEL_URL}
        slotSelections={avatarState.config.slotSelections}
      />
    </div>
  );
}
```

- [ ] **Step 6: Verify**

Run:

```bash
npm run lint
npm run build
```

Expected: both commands exit `0`.

- [ ] **Step 7: Commit**

```bash
git add src/avatar/useAvatarState.ts src/avatar/AvatarCustomizationSettings.tsx src/shared/components/settingsContentData.ts src/shared/components/SettingsContent.tsx src/avatar/HomeAvatarOverlay.tsx
git commit -m "feat: add avatar clothing settings"
```

---

### Task 10: Browser Verification

**Files:**
- Modify: `src/avatar/AvatarPreviewScreen.tsx`
- Modify: `src/avatar/AvatarModel.tsx`
- Modify: `docs/3d-avatar-knowledge-base.md`
- Modify: `ROADMAP.md`

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

Expected: Vite serves on port `3000`, or reports the alternate chosen port.

- [ ] **Step 2: Verify `/avatar-preview` with Playwright**

Use Playwright or the project browser verification skill to check:

- `/avatar-preview` loads
- `Male modular base` asset is available
- top selector displays `Modré tričko` and `Zelená mikina`
- selecting each top changes the canvas
- canvas dimensions are nonzero
- `canvas.toDataURL("image/png").length` is materially nonzero

If Playwright Chromium fails with a macOS `MachPortRendezvousServer` permission error, rerun browser verification outside the sandbox with escalation.

- [ ] **Step 3: Verify Settings flow manually or with Playwright**

Check:

- home settings opens behind the parent gate as before
- Avatar card appears only on home settings
- selecting `Zelená mikina` persists in localStorage
- closing/reopening settings preserves selection
- home avatar uses selected top when avatar POC flag is enabled

- [ ] **Step 4: Capture screenshots**

Save desktop and mobile screenshots to `/tmp`, for example:

```text
/tmp/male-modular-avatar-preview-desktop.png
/tmp/male-modular-avatar-preview-mobile.png
/tmp/male-modular-avatar-settings-desktop.png
/tmp/male-modular-avatar-settings-mobile.png
```

- [ ] **Step 5: Update docs and roadmap**

In `docs/3d-avatar-knowledge-base.md`, add:

```markdown
Verification:

- `npm run lint` passed on the verification date.
- `npm run build` passed on the verification date.
- `npm run avatar:gltf:validate -- public/avatar/modular/male-base-modular.glb` passed with the validator warning count warnings and `0` errors.
- `/avatar-preview` verified on desktop and mobile.
- Home Settings avatar top selection verified.
```

In `ROADMAP.md`, mark completed avatar tasks:

- generated male-coded base
- rigged/stable armature
- exported modular GLB
- slot-ready state/catalog
- top variants
- local persistence
- parent-facing customization section
- desktop/mobile verification

- [ ] **Step 6: Final commit**

```bash
git add docs/3d-avatar-knowledge-base.md ROADMAP.md
git commit -m "docs: record modular avatar verification"
```

---

## Self-Review Notes

Spec coverage:

- Male-coded parent/caregiver base: Tasks 2-4.
- Modular GLB per base: Task 5.
- Top slot only: Tasks 5, 6, 7, 8, 9.
- `top_blue_tshirt` and `top_green_hoodie`: Tasks 5, 6, 8, 9.
- Face anchor readiness: Task 5.
- Future face/body fields in state: Task 6.
- Meshy cost approval workflow: Tasks 2 and 4.
- Validation and browser verification: Tasks 1, 3, 4, 5, 8, 10.

Known implementation risk:

- The Blender top creation/fitting step is the riskiest part. If procedural shell creation is visually poor, stop and switch to Blender UI/manual modeling for the two top meshes while preserving the object names and export contract.

Execution order:

1. Finish and commit glTF QA tooling.
2. Generate/inspect/rig the base with explicit Meshy approval gates.
3. Create the modular GLB.
4. Implement state/catalog/runtime toggling.
5. Add Settings UI.
6. Verify and update docs.
