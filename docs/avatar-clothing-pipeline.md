# Avatar Clothing Pipeline Notes

Date: 2026-05-02

This document captures the current modular clothing experiment workflow so later
sessions do not repeat avoidable mistakes.

## Current Direction

Use separate source and runtime files for clothing and accessories:

- source `.blend` under `assets/avatar/garments/<item-id>/`
- runtime `.glb` under `public/avatar/garments/`
- stable object names per catalog item
- canonical app base now points at the plain underlayer:
  `public/avatar/modular/male-base-plain.glb`
- the original modular base with prototype tops remains available at
  `public/avatar/modular/male-base-modular.glb`

Do not try to solve all clothing with one universal builder script. Shoes,
trousers, shirts, hoodies, hair, and accessories need different authoring
approaches. Automation should handle pipeline chores:

- loading the consistent base workbench
- enforcing scale, rest pose, names, and export paths
- binding or transferring weights
- exporting separate `.glb` files
- rendering QA views
- inspecting GLB structure

## Runtime Slot Contract

The app runtime loads the base avatar and selected garment assets separately.

Canonical base: `public/avatar/modular/male-base-plain.glb`.

Garments live under `public/avatar/garments/`.

Catalog metadata lives in `src/avatar/avatarCatalog.ts`.

External garment GLBs must be authored in the same coordinate space as the base.
React normalizes the base once and mounts garments under the same scaled root
group.

`shoes_blue_sneakers_v1.glb` is static-preview-ready but not production
animation-ready. Preview must allow walk/run with this shoe selected to debug
foot poke-through/deformation in the real slot renderer. Keep
`animationReady: false` until walking/running QA passes.

Current runtime debug behavior: the shoe GLB has no armature and no actions, so
the renderer attaches the left and right shoe roots to the cloned base
`LeftFoot` and `RightFoot` bones when the external asset slot is `shoes`. This
makes the separate GLB follow the animated feet in `/avatar-preview` without
returning to baked combined preview assets. Treat this as rigid debug binding,
not a final footwear rig.

## Blender MCP Access From Codex

The Blender add-on server is reachable at `localhost:9876`. Codex does not
currently expose the ad-hoc Blender MCP server as a native tool in this session,
so use:

```bash
python3 tools/blender/blender_mcp_client.py list-tools
python3 tools/blender/blender_mcp_client.py call-tool get_scene_info --arguments '{"user_prompt":"..."}'
python3 tools/blender/blender_mcp_client.py call-tool execute_blender_code --arguments-file tools/blender/<args>.json
```

The installed `blender-mcp` package uses newline-delimited JSON-RPC over stdio,
not `Content-Length` framing.

## Current Validated Shoe Pipeline

Status: validated once for `shoes_blue_sneakers_v1` on 2026-05-02.

Current files:

- Meshy source task output:
  `meshy_output/20260502_213708_blue-sneaker-multiview_019dea2e/model.glb`
- Multi-view reference images:
  `meshy_output/reference_images/blue_sneaker_multiview_20260502/`
- Runtime separate shoe pair:
  `public/avatar/garments/shoes_blue_sneakers_v1.glb`
- Runtime plain base:
  `public/avatar/modular/male-base-plain.glb`
- Historical combined preview artifact from the old `/avatar-preview` shortcut:
  `public/avatar/modular/male-base-plain-blue-sneakers.glb`
- Export/fitting helper:
  `tools/blender/export_plain_avatar_shoes.py`
- Foot-fit measurement helper:
  `tools/blender/inspect_avatar_foot_fit.py`

The working sequence:

1. Generate one clean multi-view reference sheet for a single shoe, not a pair.
   The successful sheet had four views of the same rounded blue velcro sneaker:
   three-quarter, side, top, and back.
2. Crop the reference sheet into four separate square PNGs before passing it to
   Meshy. Do not pass a 2x2 sheet as one image.
3. Run Meshy `multi-image-to-3d` with texture and PBR enabled, then download GLB.
   This run consumed 30 credits and produced a visually usable shoe.
4. Treat Meshy output as a source asset, not a fitted runtime asset.
5. In Blender, normalize the single shoe, bake transforms into mesh data,
   rotate it into avatar foot-forward orientation, duplicate/mirror it, and fit
   the pair against measured avatar foot bounds.
6. Export both a separate shoe GLB and a combined plain-base preview GLB.
7. Validate GLBs, render Blender QA, and verify `/avatar-preview` with a real
   browser canvas check.

The exact fit values that worked for the first blue sneaker:

```text
Meshy source long axis: X
Avatar foot forward axis: Y
Required mesh-space rotation: +90 degrees around Z
Initial normalized shoe length: 0.26 m
Final visual scale after rotation: X 1.40, Y 1.08, Z 1.45
Left/right foot center X: +/-0.158
Foot center Y: -0.002
Foot ground Z: 0.0
```

These values are not universal. Re-measure against the base avatar for each
shoe style. Chunky generated shoes need a small margin beyond the measured foot
bounds because the toe shape narrows; matching bounding boxes exactly still
left skin visible at the front/side edges.

The measured final bounds for this asset:

```text
left foot z<=0.18:
  min=(-0.22457, -0.12886, 0.00004)
  max=(-0.09124, 0.12403, 0.17996)
  size=(0.13333, 0.25289, 0.17992)

left shoe:
  min=(-0.23338, -0.14111, 0.00000)
  max=(-0.08033, 0.13969, 0.18561)
  size=(0.15305, 0.28080, 0.18561)

right foot z<=0.18:
  min=(0.09049, -0.12892, -0.00000)
  max=(0.22391, 0.12410, 0.17991)
  size=(0.13341, 0.25302, 0.17992)

right shoe:
  min=(0.08033, -0.14111, 0.00000)
  max=(0.23338, 0.13969, 0.18561)
  size=(0.15305, 0.28080, 0.18561)
```

## Meshy Reference Image Lessons

The successful prompt style was product-concept, not avatar/clothing-slot
language. Important constraints:

- exactly one shoe per image/reference, not a pair
- no foot, leg, character, logo, laces, text, or brand mark
- plain white background
- rounded stylized preschool-safe shape
- broad velcro straps and chunky sole
- simple blue panels with enough contrast for geometry
- four views of the same shoe, kept visually consistent

Meshy produced a good enough standalone shoe from the multi-view images. The
texture and overall form were much better than the local procedural shoe. The
remaining work was all coordinate, scale, duplication, and fit cleanup in
Blender.

Current repo helper limitation: `tools/meshy/meshy_ops.py multi-image-to-3d`
supports local image paths, texture toggles, PBR toggles, wait, and GLB
download, but it does not expose every newer Meshy option from the docs, such as
explicit topology, target polycount, target formats, image enhancement, or
remove-lighting flags. If those become necessary, update the helper rather than
calling Meshy ad hoc.

## Animation Findings

Status: body animation validated, animated shoe fit not solved yet.

Existing Meshy rig task for the accepted male base already produced walking and
running references:

- rig task: `019de50e-13bf-764b-8fbc-2bee7c4bc4e4`
- walking reference:
  `meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/walking.glb`
- running reference:
  `meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/running.glb`

Do not spend Meshy credits on another basic body walk/run test until these
references are exhausted. They already share the same 24-bone armature names as
the modular male base.

The usable body-only walking output is:

- `public/avatar/modular/male-base-plain-walking.glb`

It was exported with:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/export_clean_avatar_clip.py \
  -- \
  --base public/avatar/modular/male-base-plain.glb \
  --reference meshy_output/20260501_213818_male-parent-underlayer-image-base-v2-no-_019de50b/walking.glb \
  --output public/avatar/modular/male-base-plain-walking.glb \
  --action-name walk_test
```

Validation result:

- `npm run avatar:gltf:validate -- public/avatar/modular/male-base-plain-walking.glb`
  returned `0` errors.
- Blender inspection found one action, frame `0-25`, with `96`
  `rotation_quaternion` f-curves and no copied location/scale curves.
- Rendered frames showed the base body walking correctly enough for a first
  animation baseline.

### Shoe Animation Tests

The current `shoes_blue_sneakers_v1` asset is good for static preview but not
yet production-ready for animated feet.

Tested approaches:

1. Static combined preview GLB:
   - Result: stable for `/avatar-preview`.
   - Limitation: shoes are independent static meshes and will not follow foot
     bones during animation.

2. Exported bone-parented shoes:
   - Attempted to parent each shoe mesh to `LeftFoot`/`RightFoot`.
   - Result: exported transforms were wrong; inspection showed shoe meshes far
     from the avatar, around `y=-9`, `z=-8`.
   - Lesson: avoid naive glTF bone parenting for these imported shoe meshes.

3. Rigid single-bone armature weights:
   - Bound the left shoe `100%` to `LeftFoot` and the right shoe `100%` to
     `RightFoot`.
   - Result: shoes moved with the feet, but the avatar foot poked through during
     the walk cycle because the foot/toe bends while the shoe remains rigid.
   - Lesson: rigid foot binding is not enough for this generated shoe shape.

4. Nearest body vertex weight transfer:
   - Copied nearby body/foot weights from `body_underlayer_male` onto the shoe
     mesh.
   - Result: the sneaker deformed badly during walking, especially around the
     toe and sidewalls.
   - Lesson: naive nearest-weight transfer is suitable for body-shell tops, but
     it is wrong for rigid/semi-rigid shoes.

5. Runtime rigid foot attachment:
   - Inspection confirmed `public/avatar/garments/shoes_blue_sneakers_v1.glb`
     contains two mesh roots and no armature or actions.
   - `AvatarModel` now attaches the separate shoe roots to the cloned base
     `LeftFoot` and `RightFoot` bones at runtime with Three.js
     `Object3D.attach`.
   - Result: the separate shoe GLB follows the animated base feet in
     `/avatar-preview` while preserving the real runtime slot system.
   - Limitation: this does not deform the shoe around the toe, so skin
     poke-through can still happen during walk/run.
   - Lesson: runtime attachment is useful for debugging rigid accessories and
     footwear motion, but production shoes still need an asset-side heel/toe
     strategy.

Failed animated shoe preview artifact:

- `public/avatar/modular/male-base-plain-blue-sneakers-walking.glb`

Keep it only as a diagnostic artifact unless replaced by a better export. Do not
ship it as-is.

### Animation-Ready Shoe Direction

For shoes, the next likely path is not full smooth skinning. Use a shoe-specific
rigging strategy:

- keep each shoe mostly rigid
- split each shoe into at least sole/heel and toe-cap sections if toe bending is
  needed
- weight the heel/ankle portion to `LeftFoot`/`RightFoot`
- weight the toe portion partly or fully to `LeftToeBase`/`RightToeBase`
- hide or crop the base foot mesh inside the shoe when a shoe slot is active,
  because even a well-bound shoe can reveal skin during extreme foot bends
- validate on the actual target action, not only bind pose

Do not assume an asset that fits the rest pose will survive animation. For every
future footwear asset, render at least frames `1`, `13`, and `25` of the current
walking test before calling it animation-ready.

## Failed Local Modeling Experiments

The first MCP-driven local modeling attempts were removed from the workspace on
2026-05-02. Keep the lessons below, but do not look for these assets or reuse
the one-off generator scripts.

Deleted files:

- `tools/blender/create_mcp_tshirt_experiment.py`
- `tools/blender/mcp_create_tshirt_args.json`
- `assets/avatar/garments/top_blue_tshirt_v1/top_blue_tshirt_v1.blend`
- `public/avatar/garments/top_blue_tshirt_v1.glb`
- `tools/blender/create_mcp_shoes_experiment.py`
- `tools/blender/mcp_create_shoes_args.json`
- `assets/avatar/garments/shoes_blue_v1/shoes_blue_v1.blend`
- `public/avatar/garments/shoes_blue_v1.glb`

Findings:

- Separate garment/accessory GLB export works mechanically.
- The T-shirt remained a body-shell derivative and did not solve real garment
  authoring.
- The hand-built shoes fit the feet, but looked too primitive to justify
  continuing local procedural modeling for wardrobe art.
- The retained value is the MCP bridge and verification workflow, not the
  generated assets.

## Verification Commands

Inspect a garment GLB:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/inspect_avatar_glb.py \
  -- public/avatar/garments/<item-id>.glb
```

Render standalone garment QA:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/render_garment_preview.py \
  -- \
  --input public/avatar/garments/<item-id>.glb \
  --output-dir /tmp/<item-id>-preview
```

Render a saved source workbench with the base avatar:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/render_workbench_blend_preview.py \
  -- \
  --input assets/avatar/garments/<item-id>/<item-id>.blend \
  --output-dir /tmp/<item-id>-workbench-preview \
  --focus-z 0.45
```

On this machine, Blender 5.1 can crash inside Codex's default sandbox during
startup. Rerun Blender commands outside the sandbox when the crash occurs before
Python script output.

Measure avatar foot and shoe bounds:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/inspect_avatar_foot_fit.py \
  -- \
  --input public/avatar/modular/male-base-plain-blue-sneakers.glb
```

Regenerate the current plain base, separate shoe pair, and combined preview:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/export_plain_avatar_shoes.py \
  -- \
  --base public/avatar/modular/male-base-modular.glb \
  --shoe meshy_output/20260502_213708_blue-sneaker-multiview_019dea2e/model.glb \
  --plain-output public/avatar/modular/male-base-plain.glb \
  --shoes-output public/avatar/garments/shoes_blue_sneakers_v1.glb \
  --combined-output public/avatar/modular/male-base-plain-blue-sneakers.glb
```

Inspect animated shoe/body bounds across frames:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/inspect_avatar_animation_fit.py \
  -- \
  --input public/avatar/modular/male-base-plain-blue-sneakers-walking.glb \
  --frames 1 13 25
```

Render selected animation frames:

```bash
'/Applications/Blender.app/Contents/MacOS/Blender' \
  --background \
  --factory-startup \
  --enable-autoexec \
  --python tools/blender/render_avatar_animation_frames.py \
  -- \
  --input public/avatar/modular/male-base-plain-walking.glb \
  --output-dir /tmp/avatar-plain-walking-frames \
  --frames 1 13 25
```

## Known Traps

- MCP works, but in this Codex session it must be called through the local
  `blender_mcp_client.py` helper.
- Do not save a garment source `.blend` from a contaminated active scene.
  Remove unrelated experiment objects before saving. This happened once with
  T-shirt trim objects leaking into the shoe source workbench.
- Selecting an armature during GLB export can import back with an extra
  `Icosphere` mesh. It appears in inspection output even when no source object
  named `Icosphere` exists in the live scene. Treat this as a warning until the
  export path is tightened.
- Detail meshes parented directly to the armature exported at unexpected scale
  in the T-shirt experiment. Keeping them in world coordinates with an Armature
  modifier avoided that scale issue.
- The Blender exporter warns `Armature must be the parent of skinned mesh` for
  these prototype assets. The exported meshes still inspect and render, but the
  warning should be eliminated before runtime integration.
- Meshy shoe orientation is not avatar orientation. In the successful sneaker
  output, the shoe's long axis imported as X while avatar feet point along Y.
  If the shoe appears sideways or stretched across both feet, rotate mesh data
  around Z before duplicating/mirroring.
- Bake transforms into mesh data before duplicating. Parent/root transforms made
  earlier previews float around shin height even when object origins looked
  plausible.
- Exact bounding-box matching is not enough for shoes. Generated toe boxes taper,
  so give the shoe a small width/length/height margin beyond the measured foot
  bounds.
- Rendered QA matters more than Meshy thumbnail quality. Meshy thumbnail looked
  good immediately, but Blender revealed the first pair was sideways and later
  too narrow.
- `/avatar-preview` previously used a combined preview GLB for shoes as a
  deprecated workbench shortcut. The current runtime has a real multi-asset
  slot system and loads the base plus garment GLBs separately.
- Separate shoe GLBs do not automatically follow animation. If the garment file
  has no compatible armature/skinning, the runtime must either attach it to
  target bones for debugging or the asset must be exported with a proper rig.
- Static shoe fit does not prove animation readiness. The blue sneakers fit the
  rest pose, but the first walking tests showed foot poke-through or bad sneaker
  deformation depending on the binding strategy.
- Runtime `Object3D.attach` to `LeftFoot`/`RightFoot` is acceptable for preview
  debugging of the current rigid sneakers. Do not mistake it for production
  footwear support, because toe bend and hidden-foot masking remain unsolved.
- Naive nearest-weight transfer from the base foot deforms rigid shoes. Use it
  only as a diagnostic experiment unless the asset is intentionally soft.
- Meshy walking/running GLBs contain location, rotation, and scale tracks. Use
  them as references and export cleaned rotation-only clips with
  `export_clean_avatar_clip.py`.

## Suggested Next Steps

1. Add a shoe-specific animation export path that splits or weights heel and toe
   regions to `Foot` and `ToeBase`, then test against `walk_test`.
2. Hide or crop the avatar foot mesh when shoes are active so foot skin cannot
   poke through during animation.
3. Tighten the GLB export contract so separate garment files import without the
   extra `Icosphere` and without tangent-space/runtime warnings where possible.
4. Try one more rigid accessory, such as glasses or a hat, before spending
   credits on deforming garments like hoodies or trousers.
5. Do not spend credits on another T-shirt until the team decides whether tops
   should be authored manually, generated as isolated garments, or replaced by a
   better base/avatar generation pass.

## Meshy Clothing Asset Research

Research date: 2026-05-02

Meshy may be worth trying again, but not as "generate a fitted rigged clothing
slot directly." The strongest official guidance points to using Image to 3D or
Multi-Image to 3D for clearly defined single objects, then cleaning and fitting
the generated mesh in Blender.

Relevant findings:

- Meshy says Image to 3D is the strongest workflow when shape and visual detail
  control matter. Text to 3D is better for fast brainstorming.
- Recommended Image to 3D inputs are a single clear object, plain/simple
  background, high resolution, strong lighting, and clear contrast.
- Meshy warns against multiple objects, busy backgrounds, low resolution,
  blurry subjects, long hair/fine details, and obscured shapes.
- Multi-Image to 3D accepts 1-4 images of the same object from different angles.
  This is likely better than single-image generation for shoes, accessories,
  trousers, T-shirts, and hoodies because it gives Meshy front/side/back shape
  information.
- Meshy 6 supports `should_remesh`, `topology: "quad"`, target polycount,
  `target_formats: ["glb"]`, PBR texture maps, and `remove_lighting`.
- Meshy rigging is not the right tool for garment-only assets. Official rigging
  docs say programmatic rigging currently works well for standard humanoid
  biped assets with clearly defined limbs/body structure.

Recommended Meshy experiment:

1. Start with rigid or mostly rigid items first: shoes, hair cap, glasses,
   backpack, hat.
2. Generate 3 or 4 orthographic reference images for one item on a plain
   background: front, side, back, optional top/three-quarter.
3. Use Multi-Image to 3D with GLB output, low/controlled target polycount, and
   quad topology if available.
4. Import the result into Blender, scale/align to the base avatar, delete
   unwanted backing or fused artifacts, then bind/weight it locally.
5. Save a source `.blend`, export a runtime `.glb`, render QA, and only then
   decide whether the Meshy result is good enough.

Prompt/input guidance for clothing references:

- Focus on one item only, not a dressed character.
- Use product-view language: "single pair of stylized child-friendly sneakers,
  front view, white background, symmetrical, no feet, no legs, clean rounded
  shape, simple blue upper, dark sole, game asset style."
- For trousers/shirts/hoodies, use mannequin-compatible but isolated garment
  language: "empty garment, no body, no person, front view, clean silhouette."
- Avoid asking Meshy to solve exact fit, rigging, or animation. Treat generated
  clothing as a rough mesh asset to fit in Blender.

Current recommendation:

- Meshy Multi-Image to 3D is viable for rigid accessories when the reference
  images are clean and the result is treated as a Blender source asset.
- Shoes are the first validated case. Continue with rigid accessories before
  deforming clothes.
- Do not ask Meshy to generate fitted avatar clothing directly.

Sources:

- https://help.meshy.ai/en/articles/9996860-how-to-use-the-image-to-3d-feature
- https://help.meshy.ai/en/articles/9996858-how-to-use-the-text-to-3d-feature
- https://help.meshy.ai/en/articles/11972484-best-practices-for-creating-a-text-prompt
- https://docs.meshy.ai/en/api/image-to-3d
- https://docs.meshy.ai/en/api/multi-image-to-3d
- https://docs.meshy.ai/en/api/remesh
- https://docs.meshy.ai/en/api/rigging-and-animation
