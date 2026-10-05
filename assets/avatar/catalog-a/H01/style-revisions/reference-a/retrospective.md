# H01 reference-A face study

Status: isolated style candidate; final face/sculpting, expressions, budget and
headwear compatibility remain open. Sources: `H01.blend`, `H01.glb`, `outfit.glb`
in this directory. Builder: `tools/blender/catalog/build_catalog_head_style_study.py`.

The comparison found a tapered lower face, narrow bead-like eyes, thin smile,
disconnected moustache and round front hair volumes. This first study lifts the
lower face by up to 22 mm, widens its lower contours, gives eyes 1.22 horizontal
and 0.83 vertical scale, seats a thin curved white eye volume on the actual face
surface, and preserves closed iris/pupil depth. Nose proportions and the beard
mask are revised; a small center volume connects the moustache. Front waves are
elongated and the upper hair and scalp move together.

The initial hair-only compression exposed a scalp patch. It also created a
painted material named `A face and stubble.001`, which failed the pipeline's
material contract. The rejected master, GLB, front/side reviews and parameters
are retained in `rejected-initial/`. Adjusting the scalp with the cap fixes the
gap. Removing the retired head mesh and its unused materials before construction
keeps the painted material name stable. Unpainted features retain white COLOR_0.

Current `style-study-report.json` records unchanged body/garment mesh and skin
hashes, shared bind hashes and exact walk/run curve hashes. The old H01 and
canonical body have not been overwritten. The new head has 38,018 vertices /
38,414 polygons, nine material primitives and no expressions; it is not optimized.

`rigidity-and-reimport-report.json` binds proof to source/export hashes: all 41
walk/run frames and three head gestures pass; nearest-vertex reimport deviation
is 0.186 micrometres. All features have one Head influence. The head-to-T05 sweep
passes 163 quarter-frame poses with no contacts (`head-top-fit/`). Both GLBs
have zero Khronos errors/warnings/infos/hints and pass direct COLOR_0 checks.
The revised outfit passes fresh desktop/phone Walk/Run, pause/scrub, camera,
skeleton, zoom/reset inspection; the shared browser report remains under
`artifacts/verification/avatar-catalog/inspection-page/`.

This is visual and head-specific proof. It does not establish new cap/hood
compatibility, expression topology, real-selfie likeness, all body/layer/export
deformation gates, final style or app-facing slot registration.

Apply next: preserve an old/new comparison under identical cameras; form eyelids
before expressions; keep nose/lip and beard changes readable at runtime size;
sculpt broader swept hair before reducing density. Reuse the same neck boundary
and rig for head variants. Build A02 only after its target head silhouette is
stable, then verify head gestures and complete O05. Record renderer snapshots
from native pixels before resizing/cropping so review details remain clear.
