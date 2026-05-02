# Avatar Clothing Pipeline

_Last updated: 2026-05-02 (v9 garments). Update this file every time you add a new clothing piece, discover a new technique, or hit a significant error. Treat it as a living recipe book._

---

## Overview

Clothing for the modular avatar is created procedurally via Blender MCP Python, projected onto the body surface using a BVH tree, and exported as separate skinned meshes in the same GLB as the body and armature. Each garment is a swap-in mesh controlled by the same armature via a KD-tree-transferred vertex weight map.

---

## Runtime Object Contract

The GLB at `public/avatar/modular/male-base-modular.glb` must contain exactly these named objects:

| Name | Type | Notes |
|------|------|-------|
| `Armature` | ARMATURE | 24 bones; drives all meshes |
| `body_underlayer_male` | MESH | Skin-tone body, cropped below head |
| `head` | MESH | Head only (z > 1.32 m world) |
| `face_anchor` | MESH | Small quad for future face decal |
| `top_blue_tshirt` | MESH | Toggle visibility at runtime |
| `top_green_hoodie` | MESH | Toggle visibility at runtime |

Adding a new slot (e.g. `bottom_jeans`) means adding one more MESH to this list and updating `AvatarModel.tsx`.

---

## Blender Scale Fact — Read This First

Meshy exports the character with `object.scale = (1,1,1)` but local vertex coordinates are in **centimetre-scale** (0–170 cm). The `matrix_world` diagonal is ~0.01, putting the character in metre-scale world space (0–1.7 m).

**Always work in world-space metres** when creating clothing geometry. Do not multiply by 100 or 0.01.

Key world-space z landmarks for this body (approximate):

| Body region | World z (m) |
|-------------|------------|
| Foot sole | 0.00 |
| Waist | 0.96 |
| Hem of shirt | 0.94–0.96 |
| Shoulder height | 1.27 |
| Collar / neckline | 1.44–1.45 |
| Top of head | ~1.75 |

---

## Body Arm Direction (Critical for Sleeves)

The Meshy A-pose arms go **diagonally down and outward**, not horizontal. Confirmed from vertex group analysis:

| Bone | x range | z range |
|------|---------|---------|
| LeftArm | 0.12–0.32 | 1.05–1.32 |
| LeftForeArm | 0.23–0.40 | 0.85–1.10 |
| LeftHand | 0.34–0.43 | 0.72–0.89 |

Sleeve tubes **must** be perpendicular to the arm direction vector `(sleeve_end - sleeve_root)`, not to the world X axis. Use `make_ring_verts()` which derives a perpendicular basis from the direction vector via cross product. Horizontal sleeves produce flat discs that look wrong.

---

## Clothing Creation Recipe

### Step 1 — Define torso + sleeve geometry

Use `create_shirt` (v9+) inline in a Blender MCP code block. The function lives in the MCP session — redefine it each session.

**v9 t-shirt (blue)**:
```python
create_shirt('top_blue_tshirt', tshirt_mat,
    waist_z=0.96, collar_z=1.41, shoulder_z=1.27,  # collar_z=1.41 → crew neck, not turtleneck
    torso_rx=0.215, torso_ry=0.145,
    collar_rx=0.098, collar_ry=0.082,               # wider neck opening
    n_segs=28, n_rings=20,
    sleeve_root_x=0.185, sleeve_root_z=1.27,
    sleeve_end_x=0.34, sleeve_end_z=0.98,           # longer sleeves (was 1.07)
    sleeve_ra=0.070, sleeve_rb=0.057,
    n_sleeve_segs=18, n_sleeve_rings=7)
```

**v9 hoodie (green)**:
```python
create_shirt('top_green_hoodie', hoodie_mat,
    waist_z=0.93, collar_z=1.42, shoulder_z=1.27,
    torso_rx=0.230, torso_ry=0.155,
    collar_rx=0.104, collar_ry=0.088,
    n_segs=28, n_rings=20,
    sleeve_root_x=0.200, sleeve_root_z=1.27,
    sleeve_end_x=0.43, sleeve_end_z=0.85,           # long sleeves to wrist
    sleeve_ra=0.082, sleeve_rb=0.066,
    n_sleeve_segs=18, n_sleeve_rings=8)
```

Taper logic: torso stays at `torso_rx/ry` from waist to `shoulder_z`, then linearly tapers to `collar_rx/ry` at `collar_z`. This prevents the collar from looking off-the-shoulder.

**Key lesson (v9):** `collar_z=1.45` (v8) creates a mock-turtleneck. Use `collar_z=1.41` for a crew neck. Wider `collar_rx/ry` (0.098/0.082 vs 0.082/0.068) gives a more open neckline.

### Step 2 — Finalize: subdivide + BVH project + weight transfer

Call `finalize_clothing(shirt_obj, body_obj, head_obj, armature_obj, offset_m)` — note `head_obj` is required for combined BVH:

1. **Smooth shading** — `poly.use_smooth = True` on all polygons
2. **Subdivision** — `SUBSURF` levels=2, then apply (expands ~500 base verts to ~8 k)
3. **BVH projection** — build `BVHTree.FromBMesh()` from **both body AND head** merged in world space (see `build_combined_bvh(body_obj, head_obj)`), then for every clothing vertex call `bvh.find_nearest(v.co)` and set `v.co = location + normal.normalized() * offset_m`. Using only the body mesh causes collar verts (z > 1.32) to snap to the body crop edge (off-shoulder effect). The combined body+head BVH covers the full neck surface.
4. **KD-tree weight transfer** — for every clothing vertex, find the nearest body vertex via `mathutils.kdtree.KDTree`, then copy all its vertex group weights with `'REPLACE'`.
5. **Armature modifier** — add `ARMATURE` modifier pointing to `Armature` object.

### Offset values that work

| Garment type | `offset_m` |
|-------------|-----------|
| Thin t-shirt | 0.010–0.012 |
| Hoodie / thick top | 0.016–0.020 |
| Jacket / coat | 0.022–0.030 |

Too small → z-fighting with body. Too large → floaty puffed look.

---

## Known Limitations of the Tube Approach

### Shoulder seam gap
The torso tube and sleeve tubes are separate geometry. After BVH projection both sit on the body surface, but the area between them (deltoid/shoulder cap) is not covered by either tube, so skin shows through.

**Current mitigation**: inset `sleeve_root_x` by ~4 cm from the torso edge so the sleeve overlaps the torso region. This reduces but does not fully eliminate the gap.

**Proper fix**: model a single T-shaped mesh where the sleeve holes are cut into the torso body and the sleeve tubes are continuous extensions. This requires `bmesh.ops.holes_fill` on the torso opening and bridging it to the sleeve tube rim — significantly more complex to generate procedurally.

### Separate mesh collar seam
The torso collar cap is a flat poly fan at `collar_z`. It does not blend into the neck — there is a visible top edge. For cartoony/stylized avatars this is usually not noticeable.

---

## Exported GLB Parameters

```python
bpy.ops.export_scene.gltf(
    filepath=str(output),
    export_format='GLB',
    use_selection=True,
    export_apply=True,      # apply modifiers (armature applied as shape)
    export_animations=False,
)
```

Set armature to `pose_position = 'REST'` before export so the GLB contains the bind pose.

---

## Adding a New Clothing Piece

1. Decide slot name (e.g. `top_red_jacket`) and add to `REQUIRED_OBJECTS` in the export script.
2. Call `create_shirt_v6` (or a variant) with new parameters; adjust:
   - `waist_z` / `collar_z` for garment length
   - `torso_rx/ry` for fit tightness
   - `collar_rx/ry` for neckline width
   - `sleeve_end_x/z` and `sleeve_ra/rb` for sleeve length and girth
   - `offset_m` per the table above
3. Call `finalize_clothing` with the appropriate `offset_m`.
4. Add an Armature modifier pointing to `Armature`.
5. Export GLB and verify in the `/avatar-preview` route.
6. Update `AvatarModel.tsx` to expose the new mesh name for visibility toggling.
7. **Update this file** with parameters used and any new findings.

---

## Blender MCP Workflow Notes

- Run Blender headless for automated export, but use **Blender MCP** for iterative clothing fitting — it lets you inspect renders without restarting the session.
- Render with `BLENDER_EEVEE` (not `BLENDER_EEVEE_NEXT` — throws enum error in Blender 5.1).
- Set `arm.data.pose_position = 'REST'` before rendering to see the bind pose.
- Blender 5.1 can crash inside Codex sandbox during Metal backend init — run outside sandbox if that happens.
- `BVHTree.FromBMesh()` requires the bmesh to be in **world space** (`bm.transform(obj.matrix_world)`) before building the tree — otherwise projection will be in the wrong coordinate frame.

---

## Working .blend File

`meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/male-base-modular-working.blend`

Open this in Blender to inspect or iterate on the current scene. All 6 required objects are present with materials, vertex weights, and Armature modifiers.

---

## Errors Encountered and Fixed

| Error | Cause | Fix |
|-------|-------|-----|
| `BLENDER_EEVEE_NEXT` enum error | Wrong engine string in Blender 5.1 | Use `'BLENDER_EEVEE'` |
| Shrinkwrap offset not applied | `ABOVE_SURFACE` / `OUTSIDE` modes ignore offset | Use manual BVH projection instead |
| Leotard effect from vertex crop | Body geometry includes groin area | Switch to primitive tube garments, not body crops |
| Sleeve tubes at 96 m height | Multiplied world coords by scale factor 100 | Create geometry directly in metres, no scale |
| Horizontal sleeves look wrong | Used world-X axis for sleeve direction | Use arm direction vector; cross-product basis rings |
| `triangle_fan_fill` not found | Blender 5.1 op removed | Use `bmesh.ops.holes_fill` |
| `NEAREST_SURFACE_POINT` enum error | Missing underscore | Correct: `NEAREST_SURFACEPOINT` |
| Off-the-shoulder collar | Torso taper starts at waist | Delay taper: hold torso width to `shoulder_z`, taper only above |
| Collar projects to shoulder surface | `body_underlayer_male` is cropped at z=1.32; collar verts at z=1.44 snap to crop edge | Build combined BVH from body+head — neck surface covers full collar range |
| Mock-turtleneck look | `collar_z=1.45` is too high | Use `collar_z=1.41` for crew neck; `collar_rx/ry` of 0.098/0.082 for proper opening |
| Cloth sim collapses sleeves | Sleeve tubes are free to fall; only collar was pinned | Must pin BOTH collar AND sleeve cuffs when using cloth modifier. Even then, cloth sim produces bunchy results for A-pose sleeves; BVH projection is better for fitted shirts |
| Cloth sim drapes like cape | Starting mesh too far from body (5cm+) with low stiffness | Either start from near-body BVH mesh (1cm expand), or accept BVH projection as the approach for fitted garments |
