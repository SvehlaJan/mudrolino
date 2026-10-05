# H01 — original waves and beard retrospective

Status: **styled construction candidate; final reference/style acceptance pending**. This is authored 3D geometry, not an image or a selfie conversion.

Reference: `assets/avatar/concepts/2026-10-04/catalog-a/05-character-views.png` and H01 in `06-face-hair.png`. Source: `tools/blender/catalog/build_catalog_head.py`. Outputs: `H01.blend`, independent `H01.glb`, complete `body-H01.glb`, and the combined masked-body candidate under T01.

## Construction and corrections

The first render had excessively protruding eyes, a solid triangular beard shell, a detached neck and coarse overlapping hair masses. Eye depth and facial curves now follow the head surface. Stubble is vertex color on the head itself, avoiding a floating beard ridge. The body neck is extended from its actual cut-boundary vertices, preserving body weights and blending into Head/neck weights. All facial features and hair are joined into one independently replaceable mesh and weighted entirely to Head.

An open hair cap failed voxel remeshing, leaving missing scalp patches. Welding its seam and adding closed thickness before the union preserved the volume. Broad sculpted waves are unified and smoothed rather than left as separate intersecting spheres.

The first technically valid GLB rendered black eyes/hair in Three.js. Joining a vertex-painted face with unpainted parts gave those parts zero COLOR_0 values, which glTF multiplies into their materials. Filling unpainted parts with white vertex colors corrected this. The exported-material verifier now rejects non-white modulation on unpainted features and missing beard variation. Structural validation alone did not establish visual fidelity.

## Current evidence

- 37,560 vertices / 37,926 polygons, nine material primitives. This is still a prototype geometry budget; hair is the main optimization opportunity.
- Head attachment verified over every integer walk/run frame: 41 frames total, plus left/right turn and nod poses. Maximum error from the expected Head-bone transform: 0.0000002701 m. Every head feature retains one Head influence of weight 1.
- Independent GLB reimport: maximum nearest-vertex deviation 0.0000001852 m. Face/stubble vertex colors and Head weights survive.
- H01 and body-H01 passed Khronos validation with zero errors, warnings, infos or hints. Root-level skin export and omission of unused UVs removed earlier warnings.
- Direct exported-material checks pass for the independent head and the combined body/T01 export. White eyes and chestnut hair were visually confirmed in the actual Three.js renderer on desktop and phone; all GETs succeeded and no page/console errors occurred. Cleanup-aborted availability HEAD requests remain recorded separately.
- Front/side/back/three-quarter and moved-pose reviews are 320px wide under `artifacts/verification/avatar-catalog/H01/`. Combined runtime proof is under `artifacts/verification/avatar-catalog/T01/`.

## Remaining work

The face, smile, jaw/neck taper and hair wave detail still require closer comparison with the chosen reference. Facial expression controls, head variants H02–H06, hat/glasses clearances and final runtime catalog registration remain open. Shirt contacts remain open; the head's rigidity proof does not prove garment fit. No published avatar assets were replaced.

## Workflow changes to apply next

1. Build closed volumes before voxel unions; inspect the back as well as the front.
2. Paint subtle beard density on the skin surface instead of adding a thick shell.
3. Treat COLOR_0 as part of material export: use white for all unpainted components.
4. Pair structural validation with direct material inspection and actual Three.js rendering.
5. Reuse the analytic Head-bone check for later heads, hair and rigid face accessories; intentional overlaps between assembled facial parts are not garment-fit failures.
6. Preserve all independent head meshes when exporting a masked body; do not silently export only the torso mesh.
