# Avatar Skinned Tops Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the blue t-shirt (`top_blue_tshirt_v1`) fit the torso and deform with the body's animated skeleton, as a vertical slice that proves the skinned-garment pipeline.

**Architecture:** In Blender, fit the t-shirt to the torso and copy the body's own skin weights onto it (Data Transfer), then export it skinned to bones named identically to the body. At runtime, rebind the garment's `SkinnedMesh` to the body's already-cloned, animated skeleton by matching bone names so one `AnimationMixer` deforms both.

**Tech Stack:** Blender 5.1 via the Blender MCP (`execute_blender_code`, `render_viewport_to_path`); `@gltf-transform/cli` + `meshoptimizer` (Node); three.js / `@react-three/drei` `useGLTF`; TypeScript (`npm run lint` = `tsc --noEmit` + eslint).

**Spec:** `docs/superpowers/specs/2026-06-02-avatar-skinned-tops-design.md`

**Environment notes:**
- No TS test runner exists (per `CLAUDE.md`). Runtime "tests" are `npm run lint` + Blender posed-render evidence + code review.
- Browser preview tools are disabled in this environment. Final in-app visual confirmation is a manual step the user runs (`npm run dev` → `/avatar-preview`); the plan's deformation evidence comes from Blender posed renders of the exported asset.
- Blender work is one-off via MCP (no committed script), per the approved spec scope.
- Run `git` commits only when the worker is authorized; commit after each task that changes the repo.

---

## File Structure

| File | Responsibility | Change |
|---|---|---|
| `/tmp/body_for_rig.glb` | Blender-importable body (meshopt decoded, skeleton intact) | Created (temp, not committed) |
| `public/avatar/garments/top_blue_tshirt_v1.glb` | Published t-shirt asset | Replaced with skinned, torso-fitted version |
| `src/avatar/skinnedGarment.ts` | Pure helper: rebind a garment's SkinnedMeshes to a base skeleton by bone name | Created |
| `src/avatar/AvatarModel.tsx` | Add skinned-garment branch in the garment clone loop | Modified |
| `src/avatar/avatarCatalog.ts` | Flip `top_blue_tshirt_v1.animationReady` → `true` | Modified |

---

## Task 1: Prepare a Blender-importable body with intact armature

**Files:**
- Create: `/tmp/body_for_rig.glb` (temp)

The published `male-base-plain.glb` uses `EXT_meshopt_compression`, which the installed Blender importer rejects. Decode **only** meshopt (keep `KHR_mesh_quantization`, which Blender supports) so the 24-bone skin survives.

- [ ] **Step 1: Decode the body to a plain GLB**

Run from the repo root:

```bash
cat > ./_decode_body.mjs <<'EOF'
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('public/avatar/modular/male-base-plain.glb'); // decodes meshopt
for (const ext of doc.getRoot().listExtensionsUsed())
  if (/meshopt/i.test(ext.extensionName)) ext.dispose(); // keep quantization
const skin = doc.getRoot().listSkins()[0];
console.log('joints in source skin:', skin.listJoints().length);
await io.write('/tmp/body_for_rig.glb', doc);
console.log('wrote /tmp/body_for_rig.glb');
EOF
node ./_decode_body.mjs; rm -f ./_decode_body.mjs
```

Expected: `joints in source skin: 24` and `wrote /tmp/body_for_rig.glb`.

- [ ] **Step 2: Verify the armature survives import (Blender MCP gate)**

Run via `execute_blender_code`:

```python
import bpy
for o in list(bpy.data.objects):
    bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.import_scene.gltf(filepath="/tmp/body_for_rig.glb")
arm = next((o for o in bpy.data.objects if o.type == 'ARMATURE'), None)
body = bpy.data.objects.get("body_underlayer_male")
result = {
    "armature": arm.name if arm else None,
    "bone_count": len(arm.data.bones) if arm else 0,
    "has_body": body is not None,
    "body_vgroups": len(body.vertex_groups) if body else 0,
}
```

Expected: `bone_count == 24`, `has_body == True`, `body_vgroups >= 24`.

- [ ] **Step 3: Fallback only if Step 2 fails (bone_count != 24)**

If the skeleton did not survive, re-export an uncompressed body from source instead:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' --background --factory-startup --enable-autoexec \
  --python tools/blender/export_male_modular_avatar.py
```

Then inspect the produced GLB path from that script's output and re-run Step 2 against it (substituting the path). Use the resulting file as `/tmp/body_for_rig.glb` for all later tasks. (No code change to the script — read its `--help`/source for output path.)

- [ ] **Step 4: No commit** (temp artifact only).

---

## Task 2: Import and fit the t-shirt to the torso (Blender MCP)

**Files:**
- Reads: `/tmp/body_for_rig.glb`, `public/avatar/garments/top_blue_tshirt_v1.glb`

The body + armature should already be in the scene from Task 1 Step 2. Now import the t-shirt mesh and scale/position it onto the torso using bone world positions.

- [ ] **Step 1: Import the t-shirt and record both bounds**

```python
import bpy
from mathutils import Vector
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath="/Users/svehla/playground/teo-learn/public/avatar/garments/top_blue_tshirt_v1.glb")
new = [o for o in bpy.data.objects if o not in before and o.type == 'MESH']
shirt = new[0]
shirt.name = "tshirt"
bpy.context.view_layer.update()

arm = bpy.data.objects['Armature']
def bw(name):
    pb = arm.pose.bones[name]
    return arm.matrix_world @ pb.head
result = {
    "shirt": shirt.name,
    "shoulder_span": round((bw('LeftShoulder') - bw('RightShoulder')).length, 4),
    "spine_z": round(bw('Spine').z, 4), "neck_z": round(bw('neck').z, 4),
    "spine01": [round(v,4) for v in bw('Spine01')],
}
```

Expected: non-zero `shoulder_span`; `neck_z > spine_z`.

- [ ] **Step 2: Scale + center the shirt onto the torso**

```python
import bpy
from mathutils import Vector
arm = bpy.data.objects['Armature']; shirt = bpy.data.objects['tshirt']
def bw(name):
    pb = arm.pose.bones[name]; return arm.matrix_world @ pb.head
def bounds(o):
    cs=[o.matrix_world @ Vector(c) for c in o.bound_box]
    mn=Vector((min(c.x for c in cs),min(c.y for c in cs),min(c.z for c in cs)))
    mx=Vector((max(c.x for c in cs),max(c.y for c in cs),max(c.z for c in cs)))
    return mn,mx
shoulder_span=(bw('LeftShoulder')-bw('RightShoulder')).length
mn,mx=bounds(shirt); shirt_w=mx.x-mn.x
scale=(shoulder_span*1.6)/shirt_w   # shirt slightly wider than shoulders; TUNE if needed
shirt.scale=(scale,scale,scale); bpy.context.view_layer.update()
mn,mx=bounds(shirt); center=(mn+mx)*0.5
chest=(bw('Spine01')+bw('Spine02'))*0.5
shirt.location += (chest-center); bpy.context.view_layer.update()
mn,mx=bounds(shirt)
result={"scale":round(scale,4),"shirt_z_after":[round(mn.z,3),round(mx.z,3)],"chest_z":round(chest.z,3)}
```

Expected: `shirt_z_after` straddles `chest_z` (shirt now around the chest, not the feet).

- [ ] **Step 3: Render a rest-pose fit check**

Set up camera/light/workbench if not present (reuse the scene-setup code from the spec session), then:

Run `render_viewport_to_path` with `output_path` `/tmp/fit_check_rest.png`, then read the returned image. Visually confirm the shirt wraps the torso (sleeves near the upper arms, hem near the waist). If misaligned, adjust the `*1.6` width multiplier and/or `chest` target in Step 2 and re-render. Do not proceed until the rest fit looks right.

- [ ] **Step 4: No commit** (Blender scene state only).

---

## Task 3: Transfer skin weights and bind the shirt to the armature

**Files:**
- Blender scene (in memory)

- [ ] **Step 1: Data-transfer the body's weights onto the shirt**

```python
import bpy
body=bpy.data.objects['body_underlayer_male']; shirt=bpy.data.objects['tshirt']; arm=bpy.data.objects['Armature']

# select shirt active, body as source
bpy.ops.object.select_all(action='DESELECT')
shirt.select_set(True); body.select_set(True)
bpy.context.view_layer.objects.active = shirt

dt = shirt.modifiers.new("DataTransfer","DATA_TRANSFER")
dt.object = body
dt.use_vert_data = True
dt.data_types_verts = {'VGROUP_WEIGHTS'}
dt.vert_mapping = 'POLYINTERP_NEAREST'
# ensure destination vertex groups exist for every source (body) group
bpy.ops.object.datalayout_transfer(modifier=dt.name)
bpy.ops.object.modifier_apply(modifier=dt.name)
result={"shirt_vgroups": len(shirt.vertex_groups)}
```

Expected: `shirt_vgroups >= 24` (one per body bone group).

- [ ] **Step 2: Add the Armature modifier and parent the shirt**

```python
import bpy
shirt=bpy.data.objects['tshirt']; arm=bpy.data.objects['Armature']
mod=shirt.modifiers.new("Armature","ARMATURE"); mod.object=arm
world=shirt.matrix_world.copy()
shirt.parent=arm; shirt.matrix_world=world
result={"parent": shirt.parent.name, "modifiers":[m.type for m in shirt.modifiers]}
```

Expected: `parent == "Armature"`, modifiers include `"ARMATURE"`.

- [ ] **Step 3: Verify deformation by posing a bone, then reset**

```python
import bpy, math
from mathutils import Vector
arm=bpy.data.objects['Armature']; shirt=bpy.data.objects['tshirt']
bpy.context.view_layer.objects.active=arm
bpy.ops.object.mode_set(mode='POSE')
pb=arm.pose.bones['LeftArm']
orig=pb.rotation_quaternion.copy()
pb.rotation_mode='XYZ'; pb.rotation_euler=(0,0,math.radians(-50))  # raise/rotate arm
bpy.context.view_layer.update()
# measure that the shirt's left-sleeve verts moved with the arm (deformed bbox changes)
dg=bpy.context.evaluated_depsgraph_get()
ev=shirt.evaluated_get(dg); me=ev.to_mesh()
xs=[(shirt.matrix_world @ v.co).x for v in me.vertices]
result={"shirt_max_x_posed": round(max(xs),3)}
ev.to_mesh_clear()
```

Expected: `shirt_max_x_posed` differs noticeably from the rest max-x (sleeve followed the arm). Keep this pose for the render in Task 4; the export resets to rest.

---

## Task 4: Export, optimize, validate, and publish the skinned shirt

**Files:**
- Modify (replace): `public/avatar/garments/top_blue_tshirt_v1.glb`

- [ ] **Step 1: Render a posed deformation proof**

With the arm still posed (Task 3 Step 3), `render_viewport_to_path` → `/tmp/fit_check_posed.png`; read the image and confirm the sleeve deforms with the raised arm (no detachment/clipping). This is the deformation evidence for the asset.

- [ ] **Step 2: Reset pose and export shirt + armature**

```python
import bpy
arm=bpy.data.objects['Armature']
bpy.context.view_layer.objects.active=arm
if arm.mode!='OBJECT': bpy.ops.object.mode_set(mode='OBJECT')
# reset pose
bpy.context.view_layer.objects.active=arm; bpy.ops.object.mode_set(mode='POSE')
bpy.ops.pose.select_all(action='SELECT'); bpy.ops.pose.transforms_clear()
bpy.ops.object.mode_set(mode='OBJECT')

bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.object.select_all(action='DESELECT')
bpy.data.objects['tshirt'].select_set(True)
arm.select_set(True)
bpy.ops.export_scene.gltf(
    filepath="/tmp/top_blue_tshirt_skinned.glb",
    export_format='GLB', use_selection=True,
    export_animations=False, export_apply=False)
result={"exported":"/tmp/top_blue_tshirt_skinned.glb"}
```

Expected: file written; no exception.

- [ ] **Step 3: Confirm the exported GLB is skinned to 24 named bones**

```bash
cat > ./_check_skin.mjs <<'EOF'
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const doc = await io.read('/tmp/top_blue_tshirt_skinned.glb');
const skins = doc.getRoot().listSkins();
console.log('skins:', skins.length, 'joints:', skins[0]?.listJoints().length);
console.log('names:', skins[0]?.listJoints().map(j=>j.getName()).join(','));
EOF
node ./_check_skin.mjs; rm -f ./_check_skin.mjs
```

Expected: `skins: 1 joints: 24` and names include `Hips,Spine,Spine01,Spine02,...LeftArm,...`.

- [ ] **Step 4: Optimize, validate, publish**

```bash
npx --no-install gltf-transform optimize /tmp/top_blue_tshirt_skinned.glb /tmp/top_blue_tshirt_opt.glb \
  --texture-compress webp --texture-size 1024 --compress meshopt
node tools/avatar/validate_gltf.js /tmp/top_blue_tshirt_opt.glb
cp /tmp/top_blue_tshirt_opt.glb public/avatar/garments/top_blue_tshirt_v1.glb
ls -la public/avatar/garments/top_blue_tshirt_v1.glb | awk '{print $5,$9}'
```

Expected: optimize reduces size; validator reports `errors: 0` (a lone `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE` warning is acceptable). `--compress meshopt` is allowed because drei `useGLTF` decodes meshopt (the body itself is meshopt-compressed).

- [ ] **Step 5: Commit**

```bash
git add public/avatar/garments/top_blue_tshirt_v1.glb
git commit -m "Replace t-shirt with torso-fitted skinned GLB"
```

---

## Task 5: Runtime helper — rebind a garment to the base skeleton

**Files:**
- Create: `src/avatar/skinnedGarment.ts`

- [ ] **Step 1: Write the helper**

```typescript
import { Bone, Object3D, Skeleton, SkinnedMesh } from 'three';

/**
 * Rebinds every SkinnedMesh in `garmentScene` to the same-named bones of
 * `baseScene`, so the garment deforms with the base body's animated skeleton.
 * Returns the rebound SkinnedMeshes (the caller reparents them under the base
 * root). Throws if any garment bone has no same-named bone in the base, which
 * indicates an asset/skeleton mismatch.
 */
export function rebindGarmentToBaseSkeleton(
  garmentScene: Object3D,
  baseScene: Object3D,
): SkinnedMesh[] {
  const baseBones = new Map<string, Bone>();
  baseScene.traverse((obj) => {
    if ((obj as Bone).isBone) baseBones.set(obj.name, obj as Bone);
  });

  const rebound: SkinnedMesh[] = [];
  garmentScene.traverse((obj) => {
    const mesh = obj as SkinnedMesh;
    if (!mesh.isSkinnedMesh || !mesh.skeleton) return;
    const remapped = mesh.skeleton.bones.map((bone) => {
      const match = baseBones.get(bone.name);
      if (!match) {
        throw new Error(
          `Skinned garment bone "${bone.name}" has no match in the base skeleton`,
        );
      }
      return match;
    });
    mesh.bind(new Skeleton(remapped, mesh.skeleton.boneInverses), mesh.bindMatrix);
    rebound.push(mesh);
  });
  return rebound;
}

/** True if the cloned scene contains at least one SkinnedMesh. */
export function hasSkinnedMesh(scene: Object3D): boolean {
  let found = false;
  scene.traverse((obj) => {
    if ((obj as SkinnedMesh).isSkinnedMesh) found = true;
  });
  return found;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run lint`
Expected: 0 errors (the pre-existing `react-refresh` warning in `ContentContext.tsx` may remain).

- [ ] **Step 3: Commit**

```bash
git add src/avatar/skinnedGarment.ts
git commit -m "Add skinned-garment rebind helper"
```

---

## Task 6: Wire the skinned branch into AvatarModel

**Files:**
- Modify: `src/avatar/AvatarModel.tsx` (the `clonedGarmentScenes` map, ~lines 215-228, and the render `<primitive>` map, ~lines 272-277)

- [ ] **Step 1: Import the helpers**

Add to the existing imports near the top of `src/avatar/AvatarModel.tsx`:

```typescript
import { hasSkinnedMesh, rebindGarmentToBaseSkeleton } from './skinnedGarment';
```

- [ ] **Step 2: Branch on slot + skin presence in the garment clone loop**

Replace the body of the `externalGltfs.map(...)` callback (currently handling only `shoes` and `accessory`) so a `top` whose clone has a SkinnedMesh is rebound to the base skeleton:

```typescript
    const clonedGarmentScenes = externalGltfs.map((externalGltf, index) => {
      const clonedGarmentScene = clone(externalGltf.scene);
      clonedGarmentScene.updateMatrixWorld(true);
      disableMeshFrustumCulling(clonedGarmentScene);

      const slot = externalAssets[index]?.slot;
      if (slot === 'shoes') {
        attachShoeSceneToFootBones(clonedScene, clonedGarmentScene);
      } else if (slot === 'accessory') {
        attachAccessoryToHeadBone(clonedScene, clonedGarmentScene);
      } else if (slot === 'top' && hasSkinnedMesh(clonedGarmentScene)) {
        rebindGarmentToBaseSkeleton(clonedGarmentScene, clonedScene);
      }

      return clonedGarmentScene;
    });
```

Note: the rebound SkinnedMesh stays inside `clonedGarmentScene`, which is rendered as a `<primitive>` sibling of the base under the same `groupRef` group (existing render map). Because skinning is driven by the shared bones (now the base's animated bones), the garment deforms with the body without being reparented under a single bone. No change to the render `<primitive>` map is required.

- [ ] **Step 3: Type-check**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/avatar/AvatarModel.tsx
git commit -m "Route skinned tops through base-skeleton rebind"
```

---

## Task 7: Flip catalog flag and final verification

**Files:**
- Modify: `src/avatar/avatarCatalog.ts` (the `top_blue_tshirt_v1` item)

- [ ] **Step 1: Mark the t-shirt animation-ready**

In `src/avatar/avatarCatalog.ts`, in the `top_blue_tshirt_v1` entry's `source`, change:

```typescript
      animationReady: false,
```
to:
```typescript
      animationReady: true,
```

- [ ] **Step 2: Type-check / lint**

Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 3: Final asset deformation proof (Blender)**

Re-import the **published** `public/avatar/garments/top_blue_tshirt_v1.glb` onto `/tmp/body_for_rig.glb` (its bones share names), parent-free; pose `LeftArm` and `RightArm`; `render_viewport_to_path` → `/tmp/final_proof.png`; read and confirm sleeves deform with the arms and the torso fit holds. This confirms the published, optimized asset (not just the pre-optimize export) is correct.

- [ ] **Step 4: Manual runtime confirmation (user, optional, outside this environment)**

Browser preview is disabled here. Note for the user in the handoff: run `npm run dev`, open `/avatar-preview`, select the blue t-shirt, switch animation to `walk`/`run`, and confirm the shirt deforms with the body.

- [ ] **Step 5: Commit**

```bash
git add src/avatar/avatarCatalog.ts
git commit -m "Mark blue t-shirt animation-ready"
```

---

## Self-Review

**Spec coverage:**
- Layer 1 (Blender decode/fit/transfer/export/optimize) → Tasks 1-4. ✓
- Prerequisite #1 (skeleton survives decode) → Task 1 Steps 2-3 with fallback. ✓
- Layer 2 (runtime rebind, slot + skin-presence switch, not `animationReady`) → Tasks 5-6. ✓
- `animationReady` stays a warning flag, flipped true for the shirt → Task 7. ✓
- Verification via Blender posed renders + `tsc` → Tasks 3,4,7; browser noted as manual/out-of-scope. ✓
- Bone-name match assertion (risk #3) → Task 5 helper throws on mismatch. ✓
- Bind-pose consistency (risk #2) → weights transferred against the same `Armature`; export resets pose (Task 4 Step 2). ✓

**Placeholder scan:** No TBD/TODO; every code/command step has concrete content. The `*1.6` width multiplier and fit nudges are explicitly flagged as tunable with a render gate, not placeholders.

**Type consistency:** `rebindGarmentToBaseSkeleton(garmentScene, baseScene)` and `hasSkinnedMesh(scene)` are defined in Task 5 and called with the same signatures/names in Task 6. Object names (`Armature`, `body_underlayer_male`, `tshirt`) are consistent across Blender tasks. Catalog field `animationReady` matches the existing `AvatarShoesCatalogItem`/`externalGltf` shape.

**Known limitation (called out, not a gap):** runtime visual deformation cannot be auto-verified in this environment (browser disabled). Mitigation: the exported asset's deformation is proven in Blender (Tasks 4, 7), the rebind is type-checked and reviewed, and final in-app confirmation is handed to the user. If runtime deformation is wrong despite a correct asset, use superpowers:systematic-debugging on the bind matrices / bone remap before patching blindly.
