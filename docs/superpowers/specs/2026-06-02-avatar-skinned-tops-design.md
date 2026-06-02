# Avatar Skinned Tops Design

**Date:** 2026-06-02
**Status:** Approved

## Background

The `top` slot was populated with two Meshy-generated garments (`top_blue_tshirt_v1`,
`top_orange_hoodie_v1`) as separate external GLBs, matching the May-28 decision that the base is
always a bare body and every garment is its own external GLB. The meshes are good in isolation, but
on-body verification (Blender renders) showed they do **not** integrate:

- **Position:** the runtime ([`AvatarModel.tsx`](../../../src/avatar/AvatarModel.tsx)) only has
  attachment branches for `shoes` (foot bones) and `accessory` (head bone). A `top` falls through
  and renders unparented at the group root, sitting around the shins/feet.
- **Scale:** the garments are ~0.74 m wide vs a ~0.4 m torso (auto-sized to real-world garment
  dimensions, centered on origin).
- **Animation:** the tops have **0 skin joints**. The body deforms via a 24-bone skeleton during
  walk/run; a static top spanning torso + both arms cannot follow it. Single-bone attachment (the
  trick shoes/cap use) cannot deform sleeves.

The body skeleton is a standard humanoid chain (24 joints): `Hips → Spine → Spine01 → Spine02 →
neck`, with `LeftShoulder/LeftArm/LeftForeArm/LeftHand` and the `Right*` mirror. The body mesh is
named `body_underlayer_male` and the armature is `Armature`.

## Goal

Make the **t-shirt** (vertical slice) fit the torso and deform correctly during idle/walk/run by
skinning it to the body's shared skeleton, then prove the pipeline with on-body Blender renders.
Once validated, the same steps replicate to the hoodie (separate follow-up, out of scope here).

## Out of Scope

- The hoodie and any further garments (replicate after the t-shirt validates).
- A committed, reusable Blender CLI script — the user chose one-off MCP commands for this slice.
- Changes to the shoes/accessory attachment paths.
- Bottoms/hair slots, female base, body-shape morphs.
- Browser-based runtime verification (disabled in this environment; Blender posed renders are the
  deformation evidence).

## Chosen Approach: A — Data-transfer weights + runtime skeleton rebind

Fit the t-shirt to the torso in Blender, copy the body's own skin weights onto it (so it deforms
exactly like the body surface beneath it), export it skinned to bones named identically to the
body, and at runtime rebind the shirt's `SkinnedMesh` to the body's already-animated cloned
skeleton.

**Alternatives rejected:**
- **B — Automatic (bone-heat) weights.** Simpler Blender step, but bone-heat on a loose garment
  pinches at shoulders/armpits. Retained only as a fallback if A's transferred fit looks bad.
- **C — Bake the top into a combined body GLB and toggle visibility.** No runtime rebinding, but
  one GLB per outfit re-bloats assets and contradicts the May-28 "separate external GLBs"
  decision. Rejected.

---

## Design

### Layer 1 — Blender (one-off via MCP, t-shirt only)

1. **Obtain an importable body with the intact `Armature`.** The published
   `male-base-plain.glb` uses `EXT_meshopt_compression`, which this Blender version's importer
   rejects. Decode it to a plain GLB. **Prerequisite/risk:** an earlier `gltf-transform dequantize`
   pass produced a body whose armature reported 0 bones. The first implementation step must produce
   a plain body GLB that still carries all 24 named bones and skin weights. If gltf-transform cannot
   preserve the skeleton, re-export an uncompressed body from source via the existing
   `tools/blender/export_male_modular_avatar.py` pipeline.
2. **Fit the shirt to the torso.** Scale + translate (and rotate if needed) so the shirt wraps the
   `Spine`/`Spine01`/`Spine02` + shoulder region. Derive a starting transform from the body torso
   bounds vs the shirt bounds, with manual nudge parameters (mirroring the shoe script's tunable
   insets/lifts). Bake the world transform into the mesh.
3. **Transfer skin weights `body_underlayer_male → shirt`.** Use a Data Transfer modifier
   (`VGROUP_WEIGHTS`, nearest-face/polygon-interpolated), with "create matching vertex groups"
   enabled so the shirt gains vertex groups named for the bones. Apply the modifier. Add an Armature
   modifier targeting `Armature` and parent the shirt to it.
4. **Export** the shirt **+ `Armature`** as a skinned GLB (`export_format='GLB'`,
   `export_animations=False`, selection = shirt + armature, orphans purged first). The exported
   garment then carries a skeleton whose bone names match the body exactly.
5. **Optimize + validate.** `gltf-transform optimize` with `--texture-compress webp
   --texture-size 1024`. Meshopt geometry compression is now allowed (the runtime decodes meshopt —
   the body itself is meshopt-compressed), matching the other published garments. Validate with
   `tools/avatar/validate_gltf.js` (a lone `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE` warning is
   benign). Publish to `public/avatar/garments/top_blue_tshirt_v1.glb` (overwrites the current
   static version).

### Layer 2 — Runtime (`src/avatar/AvatarModel.tsx`)

Add a **skinned-garment** branch alongside the existing shoe/accessory branches:

- **Path selection by slot + skin presence**, not by `animationReady`: a `top`-slot garment whose
  GLB contains a `SkinnedMesh` routes through the new rebind path. Static tops (no skin) fall back
  to the current static render, and `shoes`/`accessory` keep their existing rigid `attach` paths.
  This deliberately avoids keying off `animationReady`, because the red cap is `accessory` +
  `animationReady: true` + rigid head-bone attach and must not be misrouted.
- After cloning the body via `SkeletonUtils.clone` (which yields the animated skeleton), for each
  garment `SkinnedMesh`:
  - Read the garment skeleton's bones and `boneInverses`.
  - Build a remapped bones array: for each garment bone, look up the body's cloned bone with the
    same name (`baseScene.getObjectByName(name)`). Fail loudly if a name is missing.
  - `garmentMesh.bind(new THREE.Skeleton(remappedBones, boneInverses), garmentMesh.bindMatrix)`.
  - Add the garment mesh under the body root group so the body's `AnimationMixer` (driving the
    shared bones) deforms it; disable frustum culling (existing helper).
  - Drop the garment's now-unused armature/empty nodes from the cloned graph.

The existing rigid `attach`-to-bone path stays for shoes/accessory.

### Type / catalog changes

- The render path is chosen at runtime from `slot` + whether the cloned garment contains a
  `SkinnedMesh`. No new catalog field is required for this slice.
- `animationReady` keeps its existing meaning — a metadata/warning flag consumed by
  `avatarAssetResolver` to emit (or suppress) the "not production-ready for animation" warning. It
  does **not** switch the render path.
- Flip `top_blue_tshirt_v1.animationReady` to `true` once its skinned GLB is published, to clear
  the resolver's animation warning for the now animation-ready shirt.

### Data flow

`avatarCatalog` → `avatarAssetResolver` (passes `slot` + `animationReady` through
`AvatarExternalAsset`) → `AvatarModel` (selects skinned-rebind vs rigid-attach vs static by
`slot` + skin presence; uses `animationReady` only for the existing warning).

## Verification

- **Blender:** render the shirt-on-body in **(a) rest pose** and **(b) a posed frame** (e.g. arms
  raised or a walk-clip frame) to prove both fit and deformation. Use the MCP `render_*` tools.
- **Runtime:** `npm run lint` (tsc) must pass; manual code review of the rebind. Browser preview is
  out of scope in this environment, so the posed Blender render is the animation evidence.

## Risks

1. **Body skeleton survival on decode** (prerequisite #1). Mitigation: verify bone count after
   decode; fallback to re-export from source.
2. **Bind-pose consistency.** The shirt must be weighted against the body's rest pose so the runtime
   bind matrices align; handled by transferring against the same `Armature` in the same scene.
3. **Exact bone-name match** at runtime (24 known names). Mitigation: assert every garment bone
   resolves to a body bone; throw on mismatch.
4. **Texture display** in Workbench renders is unreliable for webp; cosmetic only — judge fit and
   deformation by silhouette, not color.

## Files Changed

| File | Change |
|---|---|
| `public/avatar/garments/top_blue_tshirt_v1.glb` | Replaced with the skinned, torso-fitted version |
| `src/avatar/AvatarModel.tsx` | New skinned-garment rebind branch for `animationReady` externals |
| `src/avatar/avatarCatalog.ts` | `top_blue_tshirt_v1.animationReady` → `true` |
| (Blender work) | One-off via MCP; no committed script per scope |
